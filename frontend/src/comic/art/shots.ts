import { hash } from "./ink";
import { deriveEmotion, faceFor, type Emotion, type FaceSpec, type Gaze } from "./emotion";
import type { Light } from "./Figure";
import type { PoseId } from "./poses";
import type { CharacterId, ComicPageData, EffectId, EnvironmentId, PanelData } from "../types";
import { ENV_FOCUS } from "./environments";

// Shot planning: turns a panel's existing data (who is in it, what they say and feel, where it happens, which effects
// are active) into a camera, staging and body language. Nothing here is sent to or read from the backend, and the
// scene data is never modified; this is purely how the frontend chooses to draw what it was given.

export type ShotKind = "wide" | "detail" | "medium" | "close" | "ots" | "group" | "reveal" | "quiet";

export interface Placement {
  id: CharacterId;
  face: FaceSpec;
  pose: PoseId;
  facing: "left" | "right" | "front";
  view: "front" | "back";
  light: Light;
  lightFrom: -1 | 1;
  full: boolean;
  /** Horizontal centre, vertical bottom and height, as percentages of the panel. */
  x: number; bottom: number; height: number;
  z: number;
  speaking: boolean;
  dim: number;       // 0..1 extra darkening for foreground silhouettes
}

export interface ShotPlan {
  kind: ShotKind;
  /** Camera window into the 1600x900 environment drawing. */
  camera: { x: number; y: number; w: number };
  blur: number;      // depth of field on the background, px at 1100px panel width
  dim: number;       // 0..1 darkening of the background
  tilt: number;      // degrees, for unease on reveals
  showExtras: boolean;
  evidence: boolean;
  placements: Placement[];
  emotions: Partial<Record<CharacterId, Emotion>>;
  lit: boolean;
  alert: boolean;
  ratio: number;
}

const EVIDENCE_TEXT = /logins?|account|authentication|logs?|isn'?t routine|can'?t tell|none of them|not ours|proof|suspicious/i;

const poseFor = (id: CharacterId, emotion: Emotion, kind: string | null, env: EnvironmentId, expression: string, effects: readonly EffectId[]): PoseId => {
  if (kind === "radio") return "radio";
  switch (id) {
    case "player":
      if (kind === "thought" || emotion === "regret" || emotion === "suppressed_panic") return emotion === "exhaustion" ? "hand_neck" : "hover_pen";
      if (emotion === "exhaustion") return "hand_neck";
      if (emotion === "determination") return "hands_desk";
      return "idle";
    case "arjun":
      return env === "control_room" || env === "warehouse_floor" ? "lean_terminal" : "hold_tablet";
    case "kavya":
      if (env === "electrical_area" && (emotion === "anger" || emotion === "frustration")) return "stop_palm";
      if (effects.includes("emergency_lighting")) return "radio";
      return emotion === "composure" ? "crossed" : "stop_palm";
    case "raghav":
      if (expression === "pointing" || env === "flooded_highway") return env === "flooded_highway" || env === "alt_depot" ? "point_map" : "point";
      if (emotion === "exhaustion") return "hand_neck";
      return emotion === "composure" ? "hips" : "hold_tablet";
    case "nisha":
      return "hold_paper";
    case "isha":
      return emotion === "urgency" || emotion === "anger" ? "open_palm" : "hold_tablet";
  }
};

const lightFor = (effects: readonly EffectId[], env: EnvironmentId): Light => {
  if (effects.includes("emergency_lighting") || effects.includes("sparks")) return "amber";
  if (effects.includes("warning_lights")) return "amber";
  if (effects.includes("system_alert") || env === "control_room" || env === "ops_office") return "screen";
  return "cool";
};

/** Plans the camera and staging for one panel. `index` is the panel's position on its page. */
export function planShot(panel: PanelData, _index = 0, layout = "single"): ShotPlan {
  const chars = panel.characters;
  const lit = !panel.effects.includes("power_failure");
  const alert = panel.effects.includes("system_alert");
  const text = [panel.narration ?? "", ...panel.dialogue.map((d) => d.text)].join(" ");
  const kindOf = (id: CharacterId) => panel.dialogue.find((d) => d.speaker === id)?.kind ?? null;
  const emotions: Partial<Record<CharacterId, Emotion>> = {};
  for (const c of chars) {
    emotions[c.id] = deriveEmotion({ id: c.id, expression: c.expression, kind: kindOf(c.id), text, effects: panel.effects, environment: panel.environment, emphasis: panel.emphasis, panelId: panel.id });
  }
  const light = lightFor(panel.effects, panel.environment);
  const evidenceText = EVIDENCE_TEXT.test(text) && (panel.environment === "control_room" || panel.environment === "warehouse_floor");
  const speakerIds = new Set(panel.dialogue.map((d) => d.speaker));
  const hasThought = panel.dialogue.some((d) => d.kind === "thought");
  const base = { emotions, lit, alert, showExtras: false, evidence: false, tilt: 0, dim: 0, blur: 0 };

  const mk = (id: CharacterId, side: "left" | "right" | "center", o: Partial<Placement> & { x: number; bottom: number; height: number; kind?: ShotKind }): Placement => {
    const c = chars.find((q) => q.id === id)!;
    const emotion = emotions[id] ?? "composure";
    const k = kindOf(id);
    const face = faceFor(emotion, `${panel.id}${id}`);
    const pose = o.pose ?? poseFor(id, emotion, k, panel.environment, c.expression, panel.effects);
    // Gaze follows the situation: thought -> down; evidence panels -> the evidence; listeners look at the speaker.
    let gaze: Gaze = face.gaze;
    if (k === "thought") gaze = "down";
    else if (id === "arjun" && (evidenceText || panel.emphasis === "revelation")) gaze = "evidence";
    else if (emotion === "suspicion") gaze = "evidence";
    else if (speakerIds.size > 0 && !speakerIds.has(id) && emotion !== "fear" && emotion !== "exhaustion") gaze = "other";
    return {
      id, face: { ...face, gaze }, pose, facing: side === "left" ? "right" : side === "right" ? "left" : "front", view: "front",
      light, lightFrom: side === "left" ? 1 : -1, full: false, z: 2, speaking: speakerIds.has(id), dim: 0, ...o,
    };
  };

  const hazardous = panel.effects.some((e) => e === "smoke" || e === "sparks");

  // 1. Establishing and detail shots (no people)
  if (chars.length === 0) {
    const focus = ENV_FOCUS[panel.environment];
    return { ...base, kind: hazardous ? "detail" : "wide", camera: hazardous ? { x: focus.x, y: focus.y, w: focus.w } : { x: 0, y: 0, w: 1600 },
      showExtras: !hazardous, placements: [], ratio: 2.4 };
  }

  // 2. Dramatic reveal: the person who found it leans into the evidence, others watch from behind.
  if (panel.emphasis === "revelation") {
    const lead = chars.find((c) => c.id !== "player") ?? chars[0];
    const others = chars.filter((c) => c !== lead);
    const placements = [mk(lead.id, "left", { x: 38, bottom: -80, height: 175, z: 3 })];
    for (const o of others) placements.push(mk(o.id, "right", { x: 84, bottom: -10, height: 92, z: 1, pose: "crossed", dim: 0.25 }));
    return { ...base, kind: "reveal", camera: { x: 260, y: 40, w: 1000 }, blur: 2.2, dim: 0.1, tilt: -2.4, evidence: true, placements, ratio: 1.78 };
  }

  // 3. One person
  if (chars.length === 1) {
    const c = chars[0];
    if (hasThought) {
      const side = c.side === "right" ? "right" : "left";
      return { ...base, kind: "quiet", camera: { x: 300, y: 80, w: 1000 }, blur: 3.2, dim: 0.28, placements: [mk(c.id, side, { x: side === "left" ? 32 : 68, bottom: -8, height: 100 })], ratio: 1.78 };
    }
    const emo = emotions[c.id]!;
    const intense = emo === "fear" || emo === "anger" || emo === "suspicion" || emo === "urgency" || emo === "alarm" || emo === "suppressed_panic";
    const pointing = c.expression === "pointing";
    if (intense && !pointing) {
      const side = c.side === "right" ? "right" : "left";
      return { ...base, kind: "close", camera: { x: 380, y: 100, w: 820 }, blur: 3, dim: 0.12, evidence: evidenceText, placements: [mk(c.id, side, { x: side === "left" ? 34 : 66, bottom: -92, height: 186 })], ratio: layout === "single" ? 2.1 : 1.5 };
    }
    const side = c.side;
    return { ...base, kind: "medium", camera: { x: 160, y: 40, w: 1280 }, blur: 1.4, evidence: evidenceText, showExtras: false,
      placements: [mk(c.id, side, { x: side === "left" ? 30 : side === "right" ? 70 : 38, bottom: -24, height: 104 })], ratio: layout === "single" ? 2.1 : 1.5 };
  }

  // 4. Three or more people: staged wide group with depth
  if (chars.length >= 3) {
    const spots: [number, number, number, number][] = [[19, -26, 88, 2], [50, -36, 100, 3], [81, -26, 88, 2]];
    const order = [...chars].sort((a, b) => ({ left: 0, center: 1, right: 2 })[a.side] - ({ left: 0, center: 1, right: 2 })[b.side]);
    const placements = order.slice(0, 3).map((c, i) => mk(c.id, c.side, { x: spots[i][0], bottom: spots[i][1], height: spots[i][2], z: spots[i][3] }));
    return { ...base, kind: "group", camera: { x: 0, y: 0, w: 1600 }, blur: 0, placements, ratio: layout === "single" ? 2.1 : 1.78 };
  }

  // 5. Two people
  const player = chars.find((c) => c.id === "player");
  const other = chars.find((c) => c.id !== "player");
  if (player && other) {
    const subjectSide = player.side === "left" ? "right" : "left";
    const p = mk("player", player.side, { x: subjectSide === "right" ? 15 : 85, bottom: -52, height: 150, z: 3, view: "back", dim: 0.35, pose: emotions.player === "exhaustion" ? "hand_neck" : "idle", facing: subjectSide === "right" ? "right" : "left" });
    const o = mk(other.id, subjectSide, { x: subjectSide === "right" ? 66 : 34, bottom: -34, height: 116, z: 2 });
    return { ...base, kind: "ots", camera: { x: 220, y: 60, w: 1160 }, blur: 1.8, dim: 0.06, evidence: evidenceText, placements: [p, o], ratio: layout === "single" ? 2.1 : 1.5 };
  }
  const [a, b] = chars;
  const gap = emotions[a.id] === "anger" || emotions[b.id] === "anger" ? 58 : 44;
  return { ...base, kind: "medium", camera: { x: 160, y: 40, w: 1280 }, blur: 1.4, evidence: evidenceText,
    placements: [mk(a.id, "left", { x: 50 - gap / 2, bottom: -24, height: 104 }), mk(b.id, "right", { x: 50 + gap / 2, bottom: -24, height: 104 })], ratio: layout === "single" ? 2.1 : 1.5 };
}

export interface PagePlan { plans: ShotPlan[]; columns: string; ratios: number[]; spans: number[] }

/** Lays a page out as a graphic-novel spread: unequal columns, a wide establishing strip when the page opens on one. */
export function planPage(page: ComicPageData): PagePlan {
  const n = page.panels.length;
  const plans = page.panels.map((p, i) => planShot(p, i, page.layout));
  const flip = hash(page.panels[0]?.id ?? "") % 2 === 1;
  const k = 0.62;
  const spans = plans.map(() => 1);
  const ratios = plans.map((p) => p.ratio);
  let columns = "1fr";
  if (n === 1) {
    ratios[0] = page.layout === "revelation" ? 1.78 : 2.1;
  } else if (n === 2) {
    if (plans[0].kind === "wide" || plans[0].kind === "detail") {
      ratios[0] = 2.5; ratios[1] = 2.1;
    } else {
      const a = flip ? 2 : 3, b = flip ? 3 : 2;
      columns = `${a}fr ${b}fr`; ratios[0] = a * k; ratios[1] = b * k;
    }
  } else if (n >= 3) {
    columns = flip ? "2fr 3fr" : "3fr 2fr";
    spans[0] = 2; ratios[0] = plans[0].kind === "group" ? 2.1 : 2.5;
    const a = flip ? 2 : 3, b = flip ? 3 : 2;
    ratios[1] = a * k; ratios[2] = b * k;
  }
  return { plans: plans.map((p, i) => ({ ...p, ratio: ratios[i] })), columns, ratios, spans };
}
