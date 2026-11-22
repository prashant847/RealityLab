import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { StickSprite, type SpritePose, type SpriteWho } from "../../comic/stick/StickSprite";
import { FLOOR_DEFAULT, WORKDAY, poseFor } from "./workdayData";
import "../../comic/stick/cutscene.css";
import "./comic.css";

/** A tall figure is this wide-based height (percent of the picture's width), so people keep their size against the room whatever shape the picture is. */
const FIG = 33.75;

/**
 * One room of the workday with the people in it. The picture sits bottom-aligned and is sized by its width, and each person's feet stand on the floor line
 * chosen for that room (`fl`, in percent of the width above the bottom edge), so nobody is ever left standing on a desk. `speaker` stands tall and talks;
 * the others listen (or take their `moods`). `zoom` and `focus` move the camera, which closes in on whoever is speaking but never so far that a head leaves the picture.
 */
export function WorkdayFrame({ id, speaker = null, moods = {}, zoom = 1, focus = 50, children, className = "" }: {
  id: string; speaker?: SpriteWho | null; moods?: Partial<Record<SpriteWho, SpritePose>>; zoom?: number; focus?: number; children?: ReactNode; className?: string;
}) {
  const w = WORKDAY[id];
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 1000, h: 562 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => { if (el.clientWidth > 0 && el.clientHeight > 0) setSize({ w: el.clientWidth, h: el.clientHeight }); };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (!w) return null;
  const u = size.w / 100;
  const floor = (w.fl ?? FLOOR_DEFAULT) * u;
  const figH = Math.max(16 * (w.fs ?? 1) * u, Math.min(FIG * (w.fs ?? 1) * u, size.h - floor - 1.5 * u));         // shrinks only when the text strip above leaves little room
  const z = Math.max(1, Math.min(zoom, (size.h - 0.5 * u) / (floor + figH)));
  return (
    <div className={`wd ${className}`} data-workday={id} ref={ref}>
      <div className="wd__world" style={{ transform: `scale(${z})`, transformOrigin: `${focus}% 100%` }}>
        <img className="wd__bg" src={w.bg} alt="" draggable={false} decoding="async" />
        {w.cast.map((c, i) => (
          <div key={c.who} className={`cut__fig cut__fig--${c.flip ? "right" : "left"}`} data-who={c.who}
            style={{ ["--x" as string]: `${c.x}%`, left: `calc(${c.x}% - ${figH * 0.2}px)`, bottom: floor, height: figH, width: figH * 0.4, animationDelay: `${i * 90}ms` }} aria-hidden="true">
            <i className="cut__shadow" />
            <div className="cut__act cut__act--none"><StickSprite who={c.who} pose={poseFor(c.who, speaker, moods[c.who] ?? "calm")} flip={c.flip} still /></div>
          </div>))}
      </div>
      {children}
    </div>
  );
}
