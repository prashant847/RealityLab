import { useEffect, useRef, useState } from "react";
import { ComicBackdrop, ENV_NAMES, type EnvId } from "../notpetya/Env";
import { StickSprite, type SpritePose, type SpriteWho } from "./StickSprite";
import { GAP_MS, HOLD_MS, linesOf, type Beat, type Fx, type Reaction, type Who } from "./reaction";
import { getClip, playClip, readingMs, stopVoice, type VoiceRole } from "../../audio/voice";
import "./cutscene.css";

/** The voices: the Lead has his own, and each advisor speaks as themselves. */
export const roleOf = (who: Who, ids: { adv: SpriteWho; third: SpriteWho }): VoiceRole => `char_${who === "lead" ? "director" : who === "adv" ? ids.adv : ids.third}`;

/** Fetches the voices for a reaction ahead of time (when the option is selected), so they are ready the moment it is committed. */
export function prefetchReaction(r: Reaction, ids: { adv: SpriteWho; third: SpriteWho }): void {
  for (const l of linesOf(r)) void getClip(l.text, roleOf(l.who, ids));
}

type Look = { pose: SpritePose; fx: Fx; n: number };
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** An actor stands on the floor line; the scene tells it which pose to take and which small move to play. */
function Actor({ who, look, x, from, flip = false, floor, fs = 1 }: { who: SpriteWho; look: Look; x: number; from: "left" | "right" | "up"; flip?: boolean; floor?: number; fs?: number }) {
  // With a room picture of its own the people stand on that room's floor line (percent of the width above the bottom edge), a little smaller so the speech bubbles clear their heads.
  const own = floor === undefined ? {} : { bottom: `${floor}cqw`, height: `${56 * fs}cqh`, width: `${22.4 * fs}cqh`, left: `calc(${x}% - ${11.2 * fs}cqh)` };
  return (
    <div className={`cut__fig cut__fig--${from}`} style={{ ["--x" as string]: `${x}%`, ...own }} aria-hidden="true">
      <i className="cut__shadow" />
      <div key={look.n} className={`cut__act cut__act--${look.fx}`}><StickSprite who={who} pose={look.pose} flip={flip} still /></div>
    </div>
  );
}

/**
 * Plays when the player commits to a choice, in the room where the decision is made. The Recovery Team Lead announces the call, then the round's advisor and a
 * bystander react to it: a new expression, a hop, a shake, a pointing arm, each with a spoken line. Each line is voiced (when voices are on) and the next
 * starts only when it ends; a character's speech bubble stays up until that same character speaks again. The scene closes a couple of seconds after the last
 * line, with an ink wipe, then `onDone` fires. The script comes from reaction.ts, so it is different for every choice.
 */
export function ChoiceCutscene({ env, bg, fl, fs, spots, label, who, names, reaction, onDone }: {
  env: EnvId; /** A picture to use instead of the named room, with where the feet stand on it and safe places for the lead, the bystander and the colleague. */ bg?: string; fl?: number; fs?: number; spots?: [number, number, number]; label: string; who: { adv: SpriteWho; third: SpriteWho };
  names: { lead: string; adv: string; third: string }; reaction: Reaction; onDone: () => void;
}) {
  const done = useRef(onDone);
  done.current = onDone;
  const [looks, setLooks] = useState<Record<Who, Look>>({ lead: { pose: "calm", fx: "none", n: 0 }, adv: { pose: "calm", fx: "none", n: 0 }, third: { pose: "calm", fx: "none", n: 0 } });
  const [bubbles, setBubbles] = useState<Partial<Record<Who, string>>>({});
  const [sfx, setSfx] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [wipe, setWipe] = useState(false);
  const stop = useRef<() => void>(() => undefined);
  const skip = () => stop.current();                                  // the scene can always be skipped: the choice is submitted straight away

  useEffect(() => {
    let alive = true;
    stop.current = () => { if (!alive) return; alive = false; stopVoice(); done.current(); };
    const apply = (beats: Beat[]) => setLooks((cur) => {
      const next = { ...cur };
      for (const b of beats) next[b.who] = { pose: b.pose, fx: b.fx ?? "none", n: cur[b.who].n + 1 };
      return next;
    });
    void (async () => {
      for (const step of reaction.steps) {
        if (!alive) return;
        apply(step.during);
        if (step.sfx) { setSfx(step.sfx); window.setTimeout(() => setSfx(null), 1300); }
        if (step.shake) { setShake(true); window.setTimeout(() => setShake(false), 600); }
        if (step.line) {
          const line = step.line;
          setBubbles((b) => ({ ...b, [line.who]: line.text }));                       // it stays until this character speaks again
          // wait for the voice (up to a few seconds if it is slow to arrive); with no voice the words stay up for a reading-length pause
          const clip = await Promise.race([getClip(line.text, roleOf(line.who, who)), sleep(4500).then(() => null)]);
          if (!alive) return;
          if (clip) { const p = playClip(clip); await Promise.race([p.done, sleep(Math.max(clip.ms + 800, 1500))]); }
          else await sleep(readingMs(line.text));
          if (!alive) return;
          if (step.after) apply(step.after);
          await sleep(GAP_MS);
        } else await sleep(step.pauseMs ?? 600);
      }
      if (!alive) return;
      await sleep(HOLD_MS);
      if (!alive) return;
      setWipe(true);
      await sleep(450);
      if (alive) done.current();
    })();
    return () => { alive = false; stopVoice(); };
    // the script is fixed for the life of the scene
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); skip(); } };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const sp = spots ?? [20, 50, 80];
  const X = { lead: sp[0] + 2, third: sp[1], adv: sp[2] - 2 } as const;
  return (
    <div className="cut" role="status" aria-live="polite" aria-label={`You chose: ${label}. ${linesOf(reaction).map((l) => l.text).join(" ")}`} data-cutscene={env} data-mood={reaction.mood}>
      <div className={`cut__world${shake ? " cut__world--shake" : ""}`}>
        <div className={`cut__bg${bg ? " cut__bg--still" : ""}`}>{bg ? <img className="cut__bgimg" src={bg} alt="" draggable={false} /> : <ComicBackdrop kind="env" name={env} label={ENV_NAMES[env]} />}</div>
        <Actor who="director" look={looks.lead} x={sp[0]} from="left" floor={bg ? fl ?? 5.5 : undefined} fs={fs} />
        <Actor who={who.third} look={looks.third} x={sp[1]} from="up" floor={bg ? fl ?? 5.5 : undefined} fs={fs} />
        <Actor who={who.adv} look={looks.adv} x={sp[2]} from="right" flip floor={bg ? fl ?? 5.5 : undefined} fs={fs} />
        {(["lead", "third", "adv"] as const).map((k) => bubbles[k] && (
          <div key={`${k}`} className={`cut__bubble cut__bubble--${k}`} style={{ ["--x" as string]: `${X[k]}%` }}><b>{names[k]}</b><span key={bubbles[k]}>{bubbles[k]}</span></div>
        ))}
        {sfx && <div className="cut__sfx" aria-hidden="true"><span>{sfx}</span></div>}
      </div>
      <div className="cut__wipe cut__wipe--in" aria-hidden="true" />
      {wipe && <div className="cut__wipe cut__wipe--out" aria-hidden="true" />}
      <button type="button" className="cut__skip" onClick={skip} autoFocus>Skip ›</button>
    </div>
  );
}
