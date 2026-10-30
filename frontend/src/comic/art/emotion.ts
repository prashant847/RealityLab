import { hash } from "./ink";
import type { BubbleKind, CharacterId, EffectId, EnvironmentId, Expression } from "../types";

/** What a character is actually feeling, finer-grained than the eight backend expression ids. */
export type Emotion =
  | "composure" | "fear" | "suppressed_panic" | "suspicion" | "frustration" | "exhaustion"
  | "determination" | "regret" | "alarm" | "anger" | "concern" | "urgency";
export type MouthKind = "neutral" | "press" | "small_open" | "open" | "shout" | "grimace";
export type Gaze = "other" | "evidence" | "down" | "forward" | "threat" | "away";

/** Numeric description of one face + the posture that goes with it. Ranges are noted per field. */
export interface FaceSpec {
  emotion: Emotion;
  browLift: number;      // -1 low .. 1 raised
  browAngle: number;     // -1 inner ends raised (worry/fear) .. 1 inner ends pulled down (anger/resolve)
  browAsym: number;      // 0..1, one brow lowered and the other lifted (suspicion)
  lid: number;           // -0.6 (stretched wide) .. 1 (heavy, drooping)
  squint: number;        // 0..1 lower lids tight
  mouth: MouthKind;
  corner: number;        // -1 corners pulled down .. 1 up
  open: number;          // 0..1 mouth opening
  clench: number;        // 0..1 jaw muscle and neck tendons
  nasolabial: number;    // 0..1 tension lines from nose to mouth
  bags: number;          // 0..1 under-eye weight
  sweat: number;         // 0..1
  tilt: number;          // head roll in degrees
  drop: number;          // px the head sags towards the chest
  shoulders: number;     // -1 slumped .. 1 raised and tight
  gaze: Gaze;
}

const BASE: Omit<FaceSpec, "emotion"> = {
  browLift: 0, browAngle: 0, browAsym: 0, lid: 0.1, squint: 0, mouth: "neutral", corner: 0, open: 0, clench: 0.15,
  nasolabial: 0.1, bags: 0.1, sweat: 0, tilt: 0, drop: 0, shoulders: 0, gaze: "other",
};
const E = (emotion: Emotion, o: Partial<Omit<FaceSpec, "emotion">>): FaceSpec => ({ emotion, ...BASE, ...o });

export const FACES: Record<Emotion, FaceSpec> = {
  composure: E("composure", { browLift: 0.05, browAngle: 0.1, lid: 0.12, mouth: "press", clench: 0.4, nasolabial: 0.2, shoulders: 0.15 }),
  fear: E("fear", { browLift: 0.6, browAngle: -0.6, lid: -0.5, mouth: "small_open", open: 0.4, corner: -0.25, clench: 0.1, nasolabial: 0.3, sweat: 1, shoulders: 0.7, gaze: "threat" }),
  suppressed_panic: E("suppressed_panic", { browLift: 0.15, browAngle: -0.2, lid: -0.15, mouth: "press", corner: -0.15, clench: 0.9, nasolabial: 0.5, sweat: 0.6, shoulders: 0.75, gaze: "threat" }),
  suspicion: E("suspicion", { browAngle: 0.35, browAsym: 0.9, lid: 0.45, squint: 0.65, mouth: "press", corner: -0.2, clench: 0.45, nasolabial: 0.4, tilt: 6, gaze: "evidence" }),
  frustration: E("frustration", { browLift: -0.2, browAngle: 0.65, lid: 0.3, squint: 0.25, mouth: "press", corner: -0.4, clench: 0.7, nasolabial: 0.65, shoulders: 0.35 }),
  exhaustion: E("exhaustion", { browLift: -0.15, browAngle: -0.2, lid: 0.78, mouth: "neutral", corner: -0.25, open: 0.06, bags: 1, clench: 0, nasolabial: 0.3, drop: 34, shoulders: -0.8, gaze: "down" }),
  determination: E("determination", { browLift: -0.05, browAngle: 0.5, lid: 0.18, squint: 0.1, mouth: "press", clench: 0.75, nasolabial: 0.35, shoulders: 0.2, gaze: "other" }),
  regret: E("regret", { browLift: -0.1, browAngle: -0.5, lid: 0.5, mouth: "neutral", corner: -0.4, open: 0.04, bags: 0.45, clench: 0.1, nasolabial: 0.3, tilt: -5, drop: 22, shoulders: -0.45, gaze: "down" }),
  alarm: E("alarm", { browLift: 0.85, browAngle: -0.3, lid: -0.6, mouth: "open", open: 0.5, clench: 0, nasolabial: 0.2, sweat: 0.4, shoulders: 0.6, gaze: "threat" }),
  anger: E("anger", { browLift: -0.3, browAngle: 0.85, lid: 0.15, squint: 0.35, mouth: "shout", open: 0.75, clench: 0.6, nasolabial: 0.9, shoulders: 0.5 }),
  concern: E("concern", { browLift: 0.15, browAngle: -0.4, lid: 0.15, mouth: "press", corner: -0.2, clench: 0.3, nasolabial: 0.3, gaze: "other" }),
  urgency: E("urgency", { browLift: 0.25, browAngle: 0.25, lid: -0.1, mouth: "open", open: 0.45, corner: -0.05, clench: 0.3, nasolabial: 0.4, shoulders: 0.3, gaze: "other" }),
};

export interface EmotionContext {
  id: CharacterId;
  expression: Expression;
  /** Kind of the line this character speaks in the panel, if any. */
  kind: BubbleKind | null;
  /** All text in the panel (dialogue + narration), used only to read the situation. */
  text: string;
  effects: readonly EffectId[];
  environment: EnvironmentId;
  emphasis: "warning" | "revelation" | null;
  panelId: string;
}

const HAZARD: EffectId[] = ["smoke", "sparks", "power_failure", "emergency_lighting", "warning_lights"];
const EVIDENCE = /logins?|account|authentication|logs?|suspicious|isn'?t routine|can'?t tell|none of them|not ours|proof|dashboard|count/i;

/** Reads the backend's coarse expression plus the situation and chooses what the character really feels. */
export function deriveEmotion(c: EmotionContext): Emotion {
  const hazard = c.effects.some((e) => HAZARD.includes(e));
  const speaking = c.kind !== null;
  const evidence = EVIDENCE.test(c.text);
  switch (c.expression) {
    case "calm":
      return "composure";
    case "worried":
      if (c.kind === "thought") return "regret";
      if (c.id === "arjun" && evidence) return "suspicion";
      if (c.id === "kavya") return hazard ? "suppressed_panic" : "concern";
      if (hazard) return c.id === "player" ? "suppressed_panic" : "fear";
      if (c.id === "player") return "suppressed_panic";
      if (c.id === "nisha") return "frustration";
      return "concern";
    case "angry":
      if (c.id === "isha") return "urgency";
      return c.kind === "shout" ? "anger" : "frustration";
    case "surprised":
      return hazard ? "fear" : "alarm";
    case "determined":
      if (c.id === "arjun" && (evidence || c.emphasis === "revelation")) return "suspicion";
      return "determination";
    case "exhausted":
      return "exhaustion";
    case "pointing":
      return /guess|think|maybe|probably/i.test(c.text) ? "composure" : "determination";
    case "speaking":
    default:
      return speaking && c.environment === "hospital_corridor" ? "urgency" : "composure";
  }
}

/** A face for this character in this panel. Small per-panel variation keeps repeated emotions from looking stamped. */
export function faceFor(emotion: Emotion, seed: string): FaceSpec {
  const f = FACES[emotion];
  const h = hash(seed);
  const jit = (n: number, range: number) => (((h >>> (n * 4)) & 15) / 15 - 0.5) * 2 * range;
  return { ...f, tilt: f.tilt + jit(0, 2.2), browAsym: Math.min(1, Math.max(0, f.browAsym + jit(1, 0.08))), browLift: f.browLift + jit(2, 0.06), corner: f.corner + jit(3, 0.06) };
}
