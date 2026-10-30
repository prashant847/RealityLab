// Closed vocabularies for comic pages. They mirror backend/app/scenario/pages.py and
// public/assets/manifest.json; a backend test checks the three stay in sync. Anything outside
// these lists is dropped by sanitizePage(), so nothing arbitrary can reach the DOM.
export const LAYOUTS = ["single", "two", "three", "revelation", "dialogue"] as const;
export const ENVIRONMENT_IDS = [
  "warehouse_floor", "control_room", "electrical_area", "loading_dock", "ops_office",
  "hospital_corridor", "flooded_highway", "alt_depot", "press_scene",
] as const;
export const CHARACTER_IDS = ["player", "kavya", "arjun", "nisha", "raghav", "isha"] as const;
export const EXPRESSIONS = [
  "calm", "worried", "angry", "surprised", "determined", "exhausted", "speaking", "pointing",
] as const;
export const EFFECT_IDS = [
  "smoke", "sparks", "warning_lights", "rain", "power_failure", "damaged_inventory",
  "system_alert", "emergency_lighting",
] as const;
export const BUBBLE_KINDS = ["speech", "thought", "shout", "radio"] as const;
export const SIDES = ["left", "center", "right"] as const;
export const EMPHASES = ["warning", "revelation"] as const;

export type Layout = (typeof LAYOUTS)[number];
export type EnvironmentId = (typeof ENVIRONMENT_IDS)[number];
export type CharacterId = (typeof CHARACTER_IDS)[number];
export type Expression = (typeof EXPRESSIONS)[number];
export type EffectId = (typeof EFFECT_IDS)[number];
export type BubbleKind = (typeof BUBBLE_KINDS)[number];
export type Side = (typeof SIDES)[number];
export type Emphasis = (typeof EMPHASES)[number];

export interface CharacterPlacement {
  id: CharacterId;
  expression: Expression;
  side: Side;
}
export interface DialogueLine {
  speaker: CharacterId;
  text: string;
  kind: BubbleKind;
}
export interface PanelData {
  id: string;
  environment: EnvironmentId;
  characters: CharacterPlacement[];
  effects: EffectId[];
  narration: string | null;
  dialogue: DialogueLine[];
  emphasis: Emphasis | null;
}
export interface ComicPageData {
  layout: Layout;
  panels: PanelData[];
}
