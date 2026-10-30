import type { Who } from "../notpetya/Cast";
// Layered scene scripts for illustrated chapters. A script only decides WHICH art goes in which panel and how it is
// framed; narration, dialogue, speakers and effects are read from the page the backend already sent (via `source`),
// so no story text or outcome is defined here.
export interface ArtLayer {
  asset: string;
  role: "background" | "character" | "foreground" | "portrait" | "vector" | "person" | "flatenv";
  /** For role "flatenv": a flat environment with story props and effect overlays (src/comic/flat/World). */
  flatEnv?: { env: string; props: string[]; effects: string[]; facts: string[]; board?: boolean; seed?: number; round?: number; zoom?: number; anchorY?: number };
  /** For role "person": a flat full-body character (src/comic/flat). */
  person?: { who: Who; expression: string; pose?: string };
  /** For role "vector": which illustrated environment to draw (src/comic/vector). */
  vector?: "warehouse" | "control_room" | "office" | "terminal" | "control_desk" | "office_desk" | "flat_warehouse" | "flat_control" | "flat_office" | "flat_terminal" | "flat_control_desk" | "flat_office_desk";
  /** For role "portrait": which hand-built SVG portrait to draw (see src/comic/portraits) and its expression. `asset` is then only a label. */
  portrait?: { who: "arjun" | "director"; expression: string; pose?: string };
  /** Placement as percentages of the panel (omitted = fill the panel). */
  box?: { x: number; y: number; w: number; h: number };
}
export interface ArtPanelScript {
  id: string;
  /** Id of the backend page panel that supplies narration, dialogue and effects. */
  source?: string;
  ratio: number;
  span?: 1 | 2;
  /** Offers an 'Inspect' view of this panel's foreground image, captioned with the scene's own known facts. */
  inspect?: boolean;
  /** Where speech bubbles sit, when the speaker's own side would cover something important (here: the failed screen). */
  bubbleSide?: "left" | "center" | "right";
  /** Put bubbles along the bottom edge instead of the top, when the top of the picture holds something that must stay readable. */
  bubbleBottom?: boolean;
  /** "night" deepens a daylight photograph so it reads as the story's night hours. */
  tone?: "night";
  /** A screen built in HTML/CSS and mapped onto a screen in the background photograph. `space` is the photo's pixel size, `quad` the screen's corners in it (TL, TR, BR, BL). */
  overlay?: { kind: "failed-system"; space: [number, number]; quad: [[number, number], [number, number], [number, number], [number, number]] };
  /** Text shown under the panel (consequence and event text from the backend). */
  caption?: string;
  /** Short title for the panel, used for its accessible name. */
  label?: string;
  /** Narration for panels that have no backend page source (consequence and event panels). */
  narration?: string;
  layers: ArtLayer[];
}
export interface ArtSceneScript { columns: string; panels: ArtPanelScript[]; decisionBackdrop: string; /** Colour treatment shared by every photograph on the page. */ grade?: "cinematic" | "graphic" | "flat" }

/** Round -> illustrated script. Rounds not listed keep the existing drawn comic. */
export const ART_SCENES: Record<number, ArtSceneScript> = {
  1: {
    columns: "3fr 2fr",
    grade: "cinematic",
    decisionBackdrop: "env.ops_office.decision",
    panels: [
      { id: "wide", source: "r1a", ratio: 2.4, span: 2, layers: [{ asset: "env.warehouse.wide_dark", role: "background" }] },
      { id: "arjun", source: "r1b", ratio: 1.86, bubbleSide: "right", overlay: { kind: "failed-system", space: [1600, 860], quad: [[10, 0], [515, 0], [560, 427], [173, 667]] }, layers: [
        { asset: "env.arjun.hands_keyboard", role: "background" } ] },
      { id: "evidence", source: "r1c", ratio: 1.24, inspect: true, layers: [
        { asset: "env.control_room.terminals", role: "background" },
        { asset: "fg.terminal.failed_evidence", role: "foreground", box: { x: 6, y: 10, w: 88, h: 84 } } ] },
      { id: "director", ratio: 2.4, span: 2, tone: "night", layers: [
        { asset: "env.director.skyline_silhouette", role: "background" } ] },
    ],
  },
};

/** First page in the reference style: flat backgrounds and flat full-body people standing in them, equal weight, story first. */
export const ART_SCENES_FLAT: Record<number, ArtSceneScript> = {
  1: {
    columns: "3fr 2fr",
    grade: "flat",
    decisionBackdrop: "vector.flat_office",
    panels: [
      { id: "wide", source: "r1a", ratio: 2.4, span: 2, layers: [
        { asset: "vector.flat_warehouse", role: "vector", vector: "flat_warehouse" },
        { asset: "person.worker1", role: "person", person: { who: "worker", expression: "concerned", pose: "idle" }, box: { x: 28, y: 16, w: 12, h: 72 } },
        { asset: "person.worker2", role: "person", person: { who: "worker", expression: "neutral", pose: "idle" }, box: { x: 56, y: 26, w: 10, h: 62 } } ] },
      { id: "arjun", source: "r1b", ratio: 1.86, bubbleSide: "left", layers: [
        { asset: "vector.flat_control", role: "vector", vector: "flat_control" },
        { asset: "person.arjun", role: "person", person: { who: "arjun", expression: "concerned", pose: "at_desk" }, box: { x: 52, y: 0, w: 30, h: 140 } },
        { asset: "vector.flat_control_desk", role: "vector", vector: "flat_control_desk" } ] },
      { id: "evidence", source: "r1c", ratio: 1.24, inspect: true, bubbleSide: "right", bubbleBottom: true, layers: [
        { asset: "vector.flat_terminal", role: "vector", vector: "flat_terminal" } ] },
      { id: "director", ratio: 2.4, span: 2, layers: [
        { asset: "vector.flat_office", role: "vector", vector: "flat_office" },
        { asset: "person.director", role: "person", person: { who: "director", expression: "concerned", pose: "hand_chin" }, box: { x: 58, y: 0, w: 24, h: 140 } },
        { asset: "vector.flat_office_desk", role: "vector", vector: "flat_office_desk" } ] },
    ],
  },
};

/** First page drawn entirely as one vector illustration: vector environments plus the SVG portraits. */
export const ART_SCENES_VECTOR: Record<number, ArtSceneScript> = {
  1: {
    columns: "3fr 2fr",
    grade: "cinematic",
    decisionBackdrop: "vector.office",
    panels: [
      { id: "wide", source: "r1a", ratio: 2.4, span: 2, layers: [{ asset: "vector.warehouse", role: "vector", vector: "warehouse" }] },
      { id: "arjun", source: "r1b", ratio: 1.86, bubbleSide: "left", layers: [
        { asset: "vector.control_room", role: "vector", vector: "control_room" },
        { asset: "portrait.arjun", role: "portrait", portrait: { who: "arjun", expression: "concern" }, box: { x: 47, y: 12, w: 42, h: 102 } },
        { asset: "vector.control_desk", role: "vector", vector: "control_desk" } ] },
      { id: "evidence", source: "r1c", ratio: 1.24, inspect: true, bubbleSide: "right", bubbleBottom: true, layers: [
        { asset: "vector.terminal", role: "vector", vector: "terminal" } ] },
      { id: "director", ratio: 2.4, span: 2, layers: [
        { asset: "vector.office", role: "vector", vector: "office" },
        { asset: "portrait.director", role: "portrait", portrait: { who: "director", expression: "uncertain", pose: "hand_chin" }, box: { x: 54, y: 14, w: 30, h: 98 } },
        { asset: "vector.office_desk", role: "vector", vector: "office_desk" } ] },
    ],
  },
};

/** First page drawn with the SVG portraits (Arjun and the Operations Director). The photograph-only version above is kept for comparison and rollback. */
export const ART_SCENES_PORTRAITS: Record<number, ArtSceneScript> = {
  1: {
    columns: "3fr 2fr",
    grade: "cinematic",
    decisionBackdrop: "env.ops_office.decision",
    panels: [
      { id: "wide", source: "r1a", ratio: 2.4, span: 2, layers: [{ asset: "env.warehouse.wide_dark", role: "background" }] },
      { id: "arjun", source: "r1b", ratio: 1.86, bubbleSide: "left", layers: [
        { asset: "env.warehouse.aisle_depth", role: "background" },
        { asset: "portrait.arjun", role: "portrait", portrait: { who: "arjun", expression: "concern" }, box: { x: 40, y: 6, w: 62, h: 150 } } ] },
      { id: "evidence", source: "r1c", ratio: 1.24, inspect: true, layers: [
        { asset: "env.control_room.terminals", role: "background" },
        { asset: "fg.terminal.failed_evidence", role: "foreground", box: { x: 6, y: 10, w: 88, h: 84 } } ] },
      { id: "director", ratio: 2.4, span: 2, layers: [
        { asset: "env.ops_office.night", role: "background" },
        { asset: "portrait.director", role: "portrait", portrait: { who: "director", expression: "uncertain" }, box: { x: 52, y: -4, w: 30, h: 150 } } ] },
    ],
  },
};

/** "vector" is the fully illustrated first page; "portraits" is the SVG characters on photographs; "faceless" is the photograph-only fallback. */
export const FIRST_PAGE_STYLE: "flat" | "vector" | "portraits" | "faceless" = "flat";
export const activeScenes = (): Record<number, ArtSceneScript> => (FIRST_PAGE_STYLE === "flat" ? ART_SCENES_FLAT : FIRST_PAGE_STYLE === "vector" ? ART_SCENES_VECTOR : FIRST_PAGE_STYLE === "portraits" ? ART_SCENES_PORTRAITS : ART_SCENES);

/** Which character art the portrait layers use. "toon" is the flat 2D cartoon set; "shaded" is the earlier shaded set, kept for rollback. */
export const PORTRAIT_STYLE: "toon" | "shaded" = "shaded";
