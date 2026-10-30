import type { ArtLayer, ArtPanelScript, ArtSceneScript } from "../comic/illustrated/scenes";
import type { Expr, StagePose as Pose, Who } from "../comic/notpetya/Cast";
import { DESK_ENVS, FLOOR_Y, PERSON_UNITS, type EnvId } from "../comic/notpetya/Env";
import type { ComicPageData, PanelData } from "../comic/types";
import type { GameEvent } from "../api/types";
import { eventTitle, choiceResult, plainPage } from "./plain";
import { BEATS, EVENT_BEATS, carriedEffects, carriedProps, directorMood, type Beat, type Cast } from "./beats";

// Turns story data into flat comic panels. Nothing here invents facts: text comes from the backend page, outcome and events; this file only
// chooses pictures (rooms, people, props) and lays them out.

const ENV_IDS: EnvId[] = ["warehouse_floor", "control_room", "electrical_area", "loading_dock", "ops_office", "hospital_corridor", "flooded_highway", "alt_depot", "press_scene"];
const asEnv = (s: string | undefined): EnvId => ((ENV_IDS as string[]).includes(s ?? "") ? (s as EnvId) : "ops_office");

const EXPR_MAP: Record<string, Expr> = { calm: "neutral", worried: "concern", angry: "frustration", surprised: "shock", determined: "determination", exhausted: "tired", speaking: "neutral", pointing: "neutral" };
const WHO_MAP: Record<string, Who> = { player: "director", arjun: "arjun", kavya: "kavya", nisha: "nisha", raghav: "raghav", isha: "isha" };
const AT: Record<string, Cast["at"]> = { left: "l", center: "c", right: "r" };

/** Panel shapes by how many panels the page has. Wide strips and unequal columns, like a comic page. */
export function layoutFor(n: number): { columns: string; shapes: { span: 1 | 2; ratio: number }[] } {
  const w = { span: 2 as const, ratio: 2.4 }, a = { span: 1 as const, ratio: 1.86 }, b = { span: 1 as const, ratio: 1.24 };
  if (n <= 1) return { columns: "1fr", shapes: [{ span: 2, ratio: 2.1 }] };
  if (n === 2) return { columns: "1fr", shapes: [w, w] };
  if (n === 3) return { columns: "3fr 2fr", shapes: [w, a, b] };
  if (n === 4) return { columns: "3fr 2fr", shapes: [w, a, b, w] };
  if (n === 5) return { columns: "3fr 2fr", shapes: [w, a, b, a, b] };
  return { columns: "3fr 2fr", shapes: [w, a, b, a, b, w] };
}

/** Where the floor (or desk top) of a room sits inside a panel of a given shape, as a percentage of panel height. */
function groundPct(env: EnvId, ratio: number): number {
  const y = DESK_ENVS.includes(env) ? 640 : FLOOR_Y[env];
  if (ratio >= 16 / 9) { const vh = 1600 / ratio, y0 = (900 - vh) / 2; return ((y - y0) / vh) * 100; }
  return (y / 900) * 100;
}

const X_AT: Record<Cast["at"], number> = { l: 24, c: 50, r: 76 };

type Reserve = (xCenter: number) => number;
const NO_RESERVE: Reserve = () => 0;

/** The narration box and speech bubbles stack down from the top of a panel. This estimates, from the text and the panel's shape, how far down
 *  (percent of panel height) the stack reaches above a given horizontal position, so people under a bubble are drawn lower and people beside it stay tall. */
export function textReserve(lines: { text: string; at: Cast["at"] }[], narration: string | undefined, ratio: number, span: 1 | 2): Reserve {
  if (lines.length === 0 && !narration) return NO_RESERVE;
  const W = span === 2 ? 900 : 520, H = W / ratio;
  const f = Math.min(16, Math.max(11, 0.023 * W));
  const perLine = Math.max(14, (0.58 * W - 26) / (f * 0.5));
  const items: { x0: number; x1: number; end: number }[] = [];
  let px = 0.025 * W;
  if (narration) {
    const w = Math.min(80, ((Math.min(narration.length, 0.8 * W / (f * 0.5))) * f * 0.5 + 30) / W * 100);
    px += (Math.ceil(narration.length / ((0.8 * W) / (f * 0.5))) * 1.32 + 1.4) * f + 8;
    items.push({ x0: 2.5, x1: 2.5 + w, end: px });
  }
  for (const l of lines) {
    const w = Math.min(58, ((Math.min(l.text.length, perLine)) * f * 0.5 + 26) / W * 100);
    const [x0, x1] = l.at === "l" ? [2.5, 2.5 + w] : l.at === "r" ? [97.5 - w, 97.5] : [50 - w / 2, 50 + w / 2];
    px += (Math.ceil(l.text.length / perLine) * 1.32 + 2.2) * f + 8 + 0.016 * W;
    items.push({ x0, x1, end: px });
  }
  return (xc) => {
    const ends = items.filter((it) => xc + 9 > it.x0 && xc - 9 < it.x1).map((it) => it.end);
    return ends.length ? Math.min(54, Math.round((Math.max(...ends) / H) * 100 * 1.1)) : 0;
  };
}

const STAFF: Who[] = ["worker", "worker_b", "worker_c", "worker_d"];

function personLayer(c: Cast, env: EnvId, ratio: number, reserve: number, index: number, seed: number): ArtLayer {
  const desk = DESK_ENVS.includes(env);
  const ground = groundPct(env, ratio);
  let h: number, top: number;
  if (desk) { h = 118; top = ground - 0.5 * h; if (reserve > 0 && top < reserve + 3) { top = reserve + 3; h = Math.max(60, 2 * (ground - top)); } }
  else { const headAt = reserve > 0 ? Math.max(24, reserve + 4) : 22; h = (ground + 10 - headAt) / 0.966; top = headAt - 0.008 * h; h = Math.min(h, 96); }
  const w = (0.4 * h) / ratio * 100 * 1.04;
  const pose: Pose | undefined = c.pose ?? (desk && c.who === "arjun" ? "at_desk" : undefined);
  return { asset: `person.${c.who}.${index}`, role: "person", person: { who: c.who === "worker" ? STAFF[(seed + index * 3) % STAFF.length] : c.who, expression: c.expr, pose }, box: { x: X_AT[c.at] - w / 2, y: top, w, h } };
}

/** Zoom the room so the tallest person in the panel is PERSON_UNITS tall in the room's own scale: doors, racks and vehicles then stay in proportion to people. */
const ZOOM_MAX = 1.6;
function zoomRoom(layers: ArtLayer[], env: EnvId, ratio: number) {
  if (DESK_ENVS.includes(env)) return;
  const fe = layers[0].flatEnv; if (!fe) return;
  const visible = ratio >= 16 / 9 ? 1600 / ratio : 900;
  const tallest = Math.max(0, ...layers.filter((l) => l.role === "person" && l.box).map((l) => (l.box!.h / 100) * visible * 0.966));
  if (tallest === 0) return;
  const want = Math.max(1, tallest / PERSON_UNITS);
  fe.zoom = Math.round(Math.min(ZOOM_MAX, want) * 100) / 100;
  if (want > ZOOM_MAX) {
    // Zoom is capped so the room stays readable; people are scaled down (feet fixed) to stay in proportion with it.
    const k = ZOOM_MAX / want;
    for (const l of layers) if (l.role === "person" && l.box) {
      const b = l.box, h = b.h * k, w = b.w * k;
      l.box = { x: b.x + (b.w - w) / 2, y: b.y + 0.966 * (b.h - h), w, h };
    }
  }
  fe.anchorY = Math.round(groundPct(env, ratio));
}

/** Vehicles take up a whole scene, so a room shows at most one: the one the latest decision put there. */
const VEHICLES = ["loaded_truck", "priority_truck", "extra_trucks"];
export function oneVehicle(props: string[]): string[] {
  const keep = VEHICLES.find((v) => props.includes(v));
  return props.filter((p) => !VEHICLES.includes(p) || p === keep);
}

function envLayers(env: EnvId, props: string[], effects: string[], facts: string[], seed?: number, round?: number): ArtLayer[] {
  const layers: ArtLayer[] = [{ asset: `flat.${env}`, role: "flatenv", flatEnv: { env, props, effects, facts, seed, round } }];
  return layers;
}

function deskLayer(_env: EnvId): ArtLayer | null {
  return null;
}

function panelFromCast(id: string, env: EnvId, props: string[], effects: string[], cast: Cast[], ratio: number, span: 1 | 2, opts: Partial<ArtPanelScript>, reserve: Reserve = NO_RESERVE, look?: { seed: number; round: number }): ArtPanelScript {
  const layers = envLayers(env, oneVehicle(props), effects, [], look?.seed, look?.round);
  // Everyone in a panel is drawn at one size (a person next to a bubble must not make the others look huge): the one the tallest text stack allows.
  const room = Math.max(0, ...cast.map((p) => reserve(X_AT[p.at])));
  cast.forEach((p, i) => layers.push(personLayer(p, env, ratio, room, i, look?.seed ?? 0)));
  zoomRoom(layers, env, ratio);
  const desk = deskLayer(env);
  if (desk) layers.push(desk);
  return { id, ratio, span, layers, ...opts };
}

function castFromPanel(p: PanelData, env: EnvId): Cast[] {
  const speakers = new Set(p.dialogue.filter((d) => d.kind !== "thought").map((d) => d.speaker));
  const thinks = new Set(p.dialogue.filter((d) => d.kind === "thought").map((d) => d.speaker));
  return p.characters.map((c) => {
    const who = WHO_MAP[c.id] ?? "worker";
    const expr = EXPR_MAP[c.expression] ?? "neutral";
    let pose: Pose | undefined;
    if (c.expression === "pointing") pose = "point";
    else if (thinks.has(c.id)) pose = "hand_chin";
    else if (who === "arjun" && DESK_ENVS.includes(env)) pose = "at_desk";
    else if (who === "kavya" && p.dialogue.some((d) => d.speaker === c.id && d.kind === "shout")) pose = "point";
    else if (who === "nisha") pose = "clipboard";
    else if (who === "isha") pose = "arms_crossed";
    else if (who === "director" && expr === "concern") pose = "hand_chin";
    else if (who === "director" && expr === "determination") pose = "arms_crossed";
    else if (speakers.size === 0 && who === "raghav") pose = "arms_crossed";
    return { who, expr, at: AT[c.side] ?? "c", pose };
  });
}

/** The evidence panel every round has: the terminal if the facts describe system failures, otherwise a board of what is known. */
function evidencePanel(round: number, facts: string[]): ArtPanelScript {
  return {
    id: "evidence", ratio: 1.24, span: 1, inspect: true, bubbleBottom: true,
    layers: [{ asset: `flat.board.${round}`, role: "flatenv", flatEnv: { env: "ops_office", props: [], effects: [], facts, board: true } }],
  };
}

/** One round's page: the backend's story panels drawn flat, carrying forward what the player's earlier choices changed, plus the evidence panel. */
export function composeRoundPage(round: number, page: ComicPageData | unknown, facts: string[], trail: string[]): ArtSceneScript {
  const safe = plainPage(page);
  const story = safe.panels;
  const n = story.length + 1;
  const { columns, shapes } = layoutFor(n);
  const panels: ArtPanelScript[] = [];
  story.forEach((p, i) => {
    const env = asEnv(p.environment);
    const props = carriedProps(env, trail, round);
    const effects = [...new Set([...p.effects, ...carriedEffects(env, trail, round)])];
    const mood = directorMood(trail);
    const cast = castFromPanel(p, env).map((c) => (c.who === "director" && mood && c.expr === "neutral" ? { ...c, expr: mood } : c));
    // The opening wide shot of a working floor shows staff, so a blackout reads as people reacting to it.
    const extras: Cast[] = cast.length === 0 && env === "warehouse_floor" ? [{ who: "worker", expr: "concern", at: "l" }, { who: "worker", expr: "neutral", at: "r", pose: "arms_crossed" }] : [];
    const s = shapes[Math.min(i, shapes.length - 1)];
    panels.push(panelFromCast(p.id, env, props, effects, [...cast, ...extras], s.ratio, s.span, { source: p.id }, textReserve(p.dialogue.map((d) => ({ text: d.text, at: cast.find((c) => c.who === (WHO_MAP[d.speaker] ?? "worker"))?.at ?? "c" })), p.narration ?? undefined, s.ratio, s.span), { seed: round * 17 + i * 5 + 1, round }));
  });
  const ev = evidencePanel(round, facts);
  const last = shapes[Math.min(story.length, shapes.length - 1)];
  panels.push({ ...ev, ratio: Math.min(last.ratio, 1.78), span: last.span });
  return { columns, panels, decisionBackdrop: "np.ops_office", grade: "flat" };
}

/** The consequence of a decision: the choice being carried out, then each event it set off, as flat comic panels with the backend's own text. */
export function composeConsequence(choiceId: string, label: string, consequence: string, events: GameEvent[], fallbackEnv: string): ArtSceneScript {
  const round = Number(/^r(\d+)_/.exec(choiceId)?.[1] ?? 0);
  const beat: Beat = BEATS[choiceId] ?? { env: asEnv(fallbackEnv), cast: [{ who: "director", expr: "determination", at: "c" }] };
  const eventPanels = events.slice(0, 4);
  const n = 1 + eventPanels.length;
  const { columns, shapes } = layoutFor(n);
  const panels: ArtPanelScript[] = [
    panelFromCast("decision", beat.env, beat.props ?? [], beat.effects ?? [], beat.cast, shapes[0].ratio, shapes[0].span, { caption: choiceResult(choiceId, consequence), label }, NO_RESERVE, { seed: round * 17 + 99, round }),
  ];
  eventPanels.forEach((e, i) => {
    const eb = EVENT_BEATS[e.event_id] ?? { env: asEnv(fallbackEnv), effects: e.assets, cast: [] as Cast[] };
    const s = shapes[Math.min(i + 1, shapes.length - 1)];
    panels.push(panelFromCast(`ev-${e.event_id}`, eb.env, eb.props ?? [], eb.effects ?? e.assets, eb.cast, s.ratio, s.span, { narration: `${e.clock} — ${e.title}`, caption: e.text }, textReserve([], `${e.clock} — ${e.title}`, s.ratio, s.span), { seed: round * 17 + 40 + i * 5, round }));
  });
  return { columns, panels, decisionBackdrop: "np.ops_office", grade: "flat" };
}

/** The events that fired when a round began, as one flat comic page (used above each round's scene). */
export function composeEventsPage(events: GameEvent[], fallbackEnv: string, round: number): ArtSceneScript {
  const list = events.slice(0, 4);
  const { columns, shapes } = layoutFor(list.length);
  const panels = list.map((e, i) => {
    const eb = EVENT_BEATS[e.event_id] ?? { env: asEnv(fallbackEnv), effects: e.assets, cast: [] as Cast[] };
    const s = shapes[Math.min(i, shapes.length - 1)];
    const title = `${e.clock} — ${eventTitle(e.event_id, e.title)}`;
    return panelFromCast(`ev-${e.event_id}`, eb.env, eb.props ?? [], eb.effects ?? e.assets, eb.cast, s.ratio, s.span, { narration: title, caption: e.text }, textReserve([], title, s.ratio, s.span), { seed: round * 17 + 60 + i * 5, round });
  });
  return { columns, panels, decisionBackdrop: "np.ops_office", grade: "flat" };
}
