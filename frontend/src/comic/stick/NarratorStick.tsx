import { useEffect, useState } from "react";
import { useA11y } from "../../a11y/a11y";
import { getClip, playClip, readingMs, stopVoice } from "../../audio/voice";
import "./narrator.css";

/**
 * The comic's narrator: a tired stickman who slides in from the left only on a page that has narration, says it in his weary deadpan voice (with his mouth
 * moving to the real audio), sighs, and slides away again. The words are always on the page as well; if no voice is available he stands there for a
 * reading-length pause instead. Click him to send him away early.
 */
type Phase = "in" | "talk" | "sigh" | "out" | "gone";
const sprite = (name: string) => `${import.meta.env.BASE_URL}assets/narrator/narrator_${name}.webp`;
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const ENTER_MS = 750, SIGH_MS = 1100, EXIT_MS = 650;

export function NarratorStick({ text, delay = 350 }: { text: string; delay?: number }) {
  const wanted = useA11y().comicNarrator;
  const [phase, setPhase] = useState<Phase>("in");
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed || !wanted) return;
    let alive = true;
    let raf = 0;
    setPhase("in"); setOpen(false);
    const clipP = getClip(text, "narrator");                                  // starts loading while he walks in
    void (async () => {
      await sleep(delay + ENTER_MS);
      if (!alive) return;
      setPhase("talk");
      const clip = await Promise.race([clipP, sleep(5000).then(() => null)]);
      if (!alive) return;
      if (clip) {
        const p = playClip(clip);
        let last = false;
        const tick = () => { const o = p.mouth() > 0.16; if (o !== last) { last = o; setOpen(o); } raf = requestAnimationFrame(tick); };
        raf = requestAnimationFrame(tick);
        await Promise.race([p.done, sleep(clip.ms + 1200)]);
        cancelAnimationFrame(raf);
      } else {
        // no voice: his mouth flaps for as long as the words take to read
        const end = Date.now() + readingMs(text, 2600);
        while (alive && Date.now() < end) { setOpen((o) => !o); await sleep(170); }
      }
      if (!alive) return;
      setOpen(false); setPhase("sigh");
      await sleep(SIGH_MS);
      if (!alive) return;
      setPhase("out");
      await sleep(EXIT_MS);
      if (alive) setPhase("gone");
    })();
    return () => { alive = false; cancelAnimationFrame(raf); stopVoice(); };
  }, [text, delay, dismissed, wanted]);

  if (!wanted || phase === "gone") return null;
  const pose = phase === "sigh" ? "sigh" : phase === "talk" && open ? "talk" : "idle";
  return (
    <button type="button" className={`nar nar--${phase}`} onClick={() => { setDismissed(true); stopVoice(); setPhase("out"); window.setTimeout(() => setPhase("gone"), EXIT_MS); }}
      aria-label="The narrator. Click to send him away" title="Click to send the narrator away">
      <img className="nar__img" src={sprite(pose)} alt="" draggable={false} />
      <img className="nar__preload" src={sprite("talk")} alt="" aria-hidden="true" /><img className="nar__preload" src={sprite("sigh")} alt="" aria-hidden="true" />
      {phase === "sigh" && <i className="nar__puff" aria-hidden="true" />}
    </button>
  );
}
