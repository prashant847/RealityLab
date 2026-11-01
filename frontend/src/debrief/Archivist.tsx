import { memo, useEffect, useRef, useState } from "react";
import type { Mood } from "./script";
import type { Mouth } from "./narrator";

/**
 * The Archivist: an old librarian and storyteller in a candle-lit library, who has just closed the book you were playing.
 * The pictures are made with ElevenLabs (the library as an animated loop, the librarian as hand-inked poses, one for each mood with the mouth shut and
 * open); the mouth opens and closes to `getMouth()`, measured from the real audio, and a page turns (he settles and glances at the book) with each scene.
 */
const base = `${import.meta.env.BASE_URL}assets/archivist/`;
const MOODS: Mood[] = ["calm", "warm", "pointed", "grave"];
const man = (mood: Mood, open: boolean) => `${base}archivist_${mood}_${open ? "open" : "closed"}.webp`;

export const Archivist = memo(function Archivist({ mood, getMouth, turn, active }: { mood: Mood; getMouth: () => Mouth; turn: number; active: boolean }) {
  const [open, setOpen] = useState(false);
  const video = useRef<HTMLVideoElement | null>(null);
  const [noVideo, setNoVideo] = useState(false);

  useEffect(() => {                                                // the mouth follows the audio; React only re-renders when it actually opens or shuts
    let raf = 0, last = false;
    const tick = () => { const o = getMouth().open > 0.26; if (o !== last) { last = o; setOpen(o); } raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getMouth]);

  useEffect(() => {                                                // with reduce-motion on, the library holds still on its first frame
    const v = video.current;
    if (!v) return;
    const calm = (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) || document.documentElement.dataset.reduceMotion === "true";
    if (calm) { try { v.pause(); } catch { /* not supported here */ } return; }
    try { const p = v.play?.() as Promise<void> | undefined; p?.catch?.(() => undefined); } catch { /* autoplay refused: the poster stays */ }
  }, []);

  return (
    <div className={`arch arch--${mood}${active ? " arch--speaking" : ""}`} role="img" aria-label="The Archivist, an old librarian, in a candle-lit library">
      {noVideo
        ? <img className="arch__bg" src={`${base}library.webp`} alt="" draggable={false} />
        : <video ref={video} className="arch__bg" src={`${base}library_loop.mp4`} poster={`${base}library.webp`} autoPlay loop muted playsInline preload="auto" aria-hidden="true" onError={() => setNoVideo(true)} />}
      <div className="arch__glow" aria-hidden="true" />
      <img key={turn} className="arch__man" src={man(mood, open)} alt="" draggable={false} />
      {MOODS.flatMap((m) => [false, true].map((o) => <img key={`${m}${o}`} className="arch__preload" src={man(m, o)} alt="" aria-hidden="true" />))}
      <div className="arch__vignette" aria-hidden="true" />
    </div>
  );
});
