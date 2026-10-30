import {
  BUBBLE_KINDS, CHARACTER_IDS, EFFECT_IDS, EMPHASES, ENVIRONMENT_IDS, EXPRESSIONS, LAYOUTS, SIDES,
  type ComicPageData, type DialogueLine, type Emphasis, type Layout, type PanelData,
} from "./types";

export const MAX_TEXT = 160;
const MAX_PANELS: Record<Layout, number> = { single: 2, two: 3, three: 4, revelation: 3, dialogue: 4 };

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown): T | null =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null;
const clean = (v: unknown, problems: string[], where: string): string | null => {
  if (typeof v !== "string" || !v.trim()) return null;
  const t = v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (t.length > MAX_TEXT) {
    problems.push(`${where}: text truncated`);
    return t.slice(0, MAX_TEXT - 1) + "…";
  }
  return t;
};

export const FALLBACK_PAGE: ComicPageData = {
  layout: "single",
  panels: [{
    id: "fallback", environment: "ops_office", characters: [], effects: [],
    narration: "The scene could not be displayed.", dialogue: [], emphasis: null,
  }],
};

/** Validate untrusted page data (from the API, or later an LLM). Never throws; unknown ids are
 *  dropped and reported, text is length-limited and rendered only as plain text nodes. */
export function sanitizePage(raw: unknown): { page: ComicPageData; problems: string[] } {
  const problems: string[] = [];
  if (!isRec(raw)) return { page: FALLBACK_PAGE, problems: ["page is not an object"] };
  let layout = oneOf(LAYOUTS, raw.layout);
  if (!layout) { problems.push(`unknown layout ${String(raw.layout)}`); layout = "single"; }

  const panels: PanelData[] = [];
  const rawPanels = Array.isArray(raw.panels) ? raw.panels : [];
  for (const [i, rp] of rawPanels.entries()) {
    if (!isRec(rp)) { problems.push(`panel ${i}: not an object`); continue; }
    const id = typeof rp.id === "string" && /^[\w-]{1,24}$/.test(rp.id) ? rp.id : `panel-${i}`;
    const environment = oneOf(ENVIRONMENT_IDS, rp.environment);
    if (!environment) { problems.push(`${id}: unknown environment ${String(rp.environment)}`); continue; }
    const characters = (Array.isArray(rp.characters) ? rp.characters : []).flatMap((c) => {
      if (!isRec(c)) return [];
      const cid = oneOf(CHARACTER_IDS, c.id), ex = oneOf(EXPRESSIONS, c.expression), side = oneOf(SIDES, c.side);
      if (!cid || !ex || !side) { problems.push(`${id}: bad character`); return []; }
      return [{ id: cid, expression: ex, side }];
    }).slice(0, 3);
    const effects = (Array.isArray(rp.effects) ? rp.effects : []).flatMap((e) => {
      const eff = oneOf(EFFECT_IDS, e);
      if (!eff) problems.push(`${id}: unknown effect ${String(e)}`);
      return eff ? [eff] : [];
    }).slice(0, 4);
    const dialogue = (Array.isArray(rp.dialogue) ? rp.dialogue : []).flatMap((d): DialogueLine[] => {
      if (!isRec(d)) return [];
      const speaker = oneOf(CHARACTER_IDS, d.speaker), kind = oneOf(BUBBLE_KINDS, d.kind) ?? "speech";
      const text = clean(d.text, problems, id);
      return speaker && text ? [{ speaker, text, kind }] : [];
    }).slice(0, 3);
    const emphasis: Emphasis | null = oneOf(EMPHASES, rp.emphasis);
    panels.push({ id, environment, characters, effects, narration: clean(rp.narration, problems, id), dialogue, emphasis });
  }
  if (panels.length === 0) { problems.push("no valid panels"); return { page: FALLBACK_PAGE, problems }; }
  if (panels.length > MAX_PANELS[layout]) {
    problems.push(`layout ${layout} shows at most ${MAX_PANELS[layout]} panels`);
    panels.length = MAX_PANELS[layout];
  }
  return { page: { layout, panels }, problems };
}
