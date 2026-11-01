import { useEffect, useRef, useState } from "react";
import "./stick.css";

/**
 * The cast as drawn stickmen (Henry Stickmin style), generated once and cut into transparent sprites by tools/slice_sprites.py.
 * Files: public/assets/stick/<who>_<pose>.webp (full body, feet at the bottom) and <who>_<pose>_bust.webp (head and shoulders).
 * Each sprite sits on a canvas wider than the figure, so it is sized by HEIGHT and centred; the sides overflow harmlessly.
 */
export const SPRITE_WHO = ["arjun", "kavya", "nisha", "raghav", "isha", "director", "worker", "worker_b", "worker_c", "worker_d"] as const;
export type SpriteWho = (typeof SPRITE_WHO)[number];
export const SPRITE_POSES = ["calm", "speaking", "pointing", "angry", "worried", "exhausted", "surprised", "determined"] as const;
export type SpritePose = (typeof SPRITE_POSES)[number];

export const hasSprite = (who: string): who is SpriteWho => (SPRITE_WHO as readonly string[]).includes(who);

/** The game's two expression vocabularies (and its body poses) all land on one of the eight drawn poses. */
const FROM_EXPR: Record<string, SpritePose> = {
  // flat/Person.tsx
  neutral: "calm", concerned: "worried", shocked: "surprised", focused: "determined", tired: "exhausted", determined: "determined",
  // notpetya/Cast.tsx
  concern: "worried", shock: "surprised", suspicion: "angry", frustration: "angry", concentration: "speaking", confusion: "worried",
  determination: "determined", relief: "calm",
  // comic/types.ts
  calm: "calm", worried: "worried", angry: "angry", surprised: "surprised", exhausted: "exhausted", speaking: "speaking", pointing: "pointing",
  // art/emotion.ts
  composure: "calm", fear: "surprised", fatigue: "exhausted", resolve: "determined", anger: "angry",
  suppressed_panic: "worried", exhaustion: "exhausted", regret: "worried", alarm: "surprised", urgency: "determined",
};

export function spritePose(expression?: string, bodyPose?: string, speaking?: boolean): SpritePose {
  if (bodyPose === "point" || bodyPose === "pointing") return "pointing";
  if (speaking) return "speaking";
  return (expression && FROM_EXPR[expression]) || "calm";
}

export const spriteUrl = (who: SpriteWho, pose: SpritePose, bust = false) =>
  `${import.meta.env.BASE_URL}assets/stick/${who}_${pose}${bust ? "_bust" : ""}.webp`;

const NAMES: Record<SpriteWho, string> = {
  arjun: "IT Lead", kavya: "Terminal Supervisor", nisha: "Operations Manager", raghav: "Network Administrator", isha: "Customer Representative", director: "Recovery Team Lead",
  worker: "Staff member", worker_b: "Staff member", worker_c: "Staff member", worker_d: "Staff member",
};

export interface StickSpriteProps {
  who: SpriteWho;
  pose?: SpritePose;
  bust?: boolean;
  /** Plays the talking bob. */
  speaking?: boolean;
  /** Mirror the figure, to face the other way. */
  flip?: boolean;
  label?: string;
  /** Switch the idle breathing off (e.g. in a printed page). */
  still?: boolean;
  /** The game's own pose and expression names, kept on data-* attributes so scenes and tests can still read them. */
  meta?: { pose?: string; expression?: string };
  /** Called when the picture cannot be loaded, so the caller can fall back to other art. */
  onError?: () => void;
}

export function StickSprite({ who, pose = "calm", bust = false, speaking = false, flip = false, label, still = false, meta, onError }: StickSpriteProps) {
  // Keep the previous pose on screen until the new one has loaded, then pop it in: no flash of an empty frame.
  const [shown, setShown] = useState<SpritePose>(pose);
  const [pop, setPop] = useState(0);
  const first = useRef(true);
  useEffect(() => {
    if (pose === shown) return;
    const img = new Image();
    img.onload = img.onerror = () => { setShown(pose); setPop((n) => n + 1); };
    img.src = spriteUrl(who, pose, bust);
  }, [pose, who, bust, shown]);
  useEffect(() => { first.current = false; }, []);
  const name = NAMES[who];
  return (
    <span className={`stick${bust ? " stick--bust" : ""}${speaking ? " is-speaking" : ""}${still ? " is-still" : ""}${flip ? " is-flipped" : ""}`}
      data-who={who} data-pose={meta?.pose ?? shown} data-expression={meta?.expression ?? pose} data-sprite={shown} role="img" aria-label={label ?? `${name}, ${pose}`}>
      <span className="stick__body" key={pop} data-pop={first.current ? "0" : "1"}>
        <img src={spriteUrl(who, shown, bust)} alt="" draggable={false} decoding="async" onError={onError} />
      </span>
    </span>
  );
}
