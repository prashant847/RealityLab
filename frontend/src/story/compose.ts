import type { ArtLayer, ArtPanelScript, ArtSceneScript } from "../comic/illustrated/scenes";
import type { Expr, StagePose as Pose, Who } from "../comic/notpetya/Cast";
import { DESK_ENVS, type EnvId } from "../comic/notpetya/Env";
import type { ComicPageData, PanelData } from "../comic/types";
import type { GameEvent } from "../api/types";
import { eventTitle, choiceResult, plainPage } from "./plain";
import { PANEL_SHOTS, type PanelShot } from "./panels";
import type { ShotId } from "../comic/notpetya/Shots";
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

/** Every person is drawn at one scale with their feet on the floor line of the comic background (16:9 pictures whose floor starts well above this line),
 *  so people and rooms are always in proportion. The sprite's own feet sit 2.2% above the bottom of its box. */
export const PERSON_H = 60, FLOOR_LINE = 89, PANEL_RATIO = 16 / 9;
/** `room` is how far down (percent of panel height) the text stack reaches above this person: everyone is drawn smaller (feet fixed) just enough
 *  to keep their head clear of it, so text never sits on a face. */
const personBox = (xCenter: number, room = 0) => {
  const h = room > 0 ? Math.min(PERSON_H, Math.max(30, (FLOOR_LINE - room - 2) / 0.978)) : PERSON_H, w = ((0.4 * h) / PANEL_RATIO) * 100 * 1.04;
  return { x: xCenter - w / 2, y: FLOOR_LINE + 0.022 * h - h, w, h };
};

function personLayer(c: Cast, _env: EnvId, _ratio: number, reserve: number, index: number, seed: number): ArtLayer {
  const pose: Pose | undefined = c.pose;
  return { asset: `person.${c.who}.${index}`, role: "person", person: { who: c.who === "worker" ? STAFF[(seed + index * 3) % STAFF.length] : c.who, expression: c.expr, pose }, box: personBox(X_AT[c.at], reserve) };
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

/** A story panel drawn so the picture shows what its words say: an object shot (the thing itself, nobody in front of it) or a speaker shot (the
 *  person talking, full length at the same scale as everyone else, standing in their room). */
function shotPanel(id: string, spec: PanelShot, env: EnvId, props: string[], effects: string[], ratio: number, span: 1 | 2, reserve: Reserve, seed: number, round: number, opts: Partial<ArtPanelScript> = {}): ArtPanelScript {
  const layers: ArtLayer[] = [{ asset: `flat.${spec.shot ?? env}.${id}`, role: "flatenv", flatEnv: { env, props: spec.shot ? [] : oneVehicle(props), effects, facts: [], shot: spec.shot, seed, round } }];
  const people = spec.people ?? [];
  const room = Math.max(0, ...people.map((c) => reserve(c.x)));   // one size for everyone in the panel
  for (const [i, c] of people.entries()) layers.push({ asset: `person.${c.who}.${i}`, role: "person", person: { who: c.who, expression: c.expr, pose: c.pose }, box: personBox(c.x, room) });
  return { id, ratio, span, layers, ...opts };
}

const AT_X: Record<Cast["at"], number> = { l: 28, c: 50, r: 72 };
/** Pictures for decisions and events: the object the words are about where there is one, otherwise the people involved, close, in their room. */
const DECISION_SHOT: Record<string, ShotId> = {
  r3_alt_transport: "gate_queue", r3_divert_depot: "route_map:alt", r3_reserve_hospital: "route_map:urgent",
  r4_pause: "two_numbers:pause", r4_release_verified: "two_numbers:release", r4_provisional: "two_numbers:prov",
  r5_minimal: "whiteboard:min", r5_balanced: "whiteboard:bal", r5_restoration: "whiteboard:heavy", r5_logistics: "whiteboard:log", r5_negotiated: "whiteboard:neg",
  r6_restrict: "update_diagram:restrict", r6_specialist: "update_diagram:special", r6_parallel: "update_diagram:parallel",
  r7_hospital_first: "priority_choice:hosp", r7_commitments: "priority_choice:contract", r7_negotiate: "priority_choice:neg",
  r8_transfer: "survivor_map", r9_holding: "news_tv:hold", r9_wait: "news_tv:wait", r9_briefing: "news_tv:brief",
  r10_verified: "gate_open:ver", r10_sweep: "gate_open:sweep", r10_provisional: "gate_open:prov",
};
const EVENT_SHOT: Record<string, ShotId> = {
  secondary_interruption: "monitors_failing", secondary_interruption_partial: "monitors_failing", reinfection_alert: "update_diagram",
  flare_up: "crane_idle", panel_failure_evacuated: "crane_idle", panel_failure_assessed: "crane_idle", dock_flooding: "gate_queue",
  depot_scout_report: "route_map:alt", verified_route_pays_off: "route_map:alt", provisional_shortage: "two_numbers:prov", hospital_escalation: "priority_choice",
  contract_penalty_notice: "priority_choice:contract", insurer_advance: "whiteboard:plus", credit_due: "whiteboard:due", power_dip: "survivor_map",
};
function beatPanel(id: string, beat: Beat, shot: ShotId | undefined, ratio: number, span: 1 | 2, reserve: Reserve, seed: number, round: number, opts: Partial<ArtPanelScript>, props: string[] = beat.props ?? []): ArtPanelScript {
  const people = shot ? [] : beat.cast.map((c) => ({ who: c.who, expr: c.expr, pose: c.pose, x: AT_X[c.at] }));
  return shotPanel(id, { shot, env: beat.env, people }, beat.env, props, beat.effects ?? [], ratio, span, reserve, seed, round, opts);
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
    const spec = PANEL_SHOTS[p.id];
    if (spec) {
      const at = (x: number): Cast["at"] => (x < 37 ? "l" : x > 63 ? "r" : "c");
      const lines = p.dialogue.map((d) => { const who = WHO_MAP[d.speaker] ?? "worker"; const sp = spec.people?.find((q) => q.who === who) ?? spec.people?.[0]; return { text: d.text, at: sp ? at(sp.x) : "c" }; });
      panels.push(shotPanel(p.id, spec, spec.env ?? env, props, effects, s.ratio, s.span, textReserve(lines, p.narration ?? undefined, s.ratio, s.span), round * 17 + i * 5 + 1, round, { source: p.id }));
      return;
    }
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
    beatPanel("decision", beat, DECISION_SHOT[choiceId], shapes[0].ratio, shapes[0].span, NO_RESERVE, round * 17 + 99, round, { caption: choiceResult(choiceId, consequence), label }),
  ];
  eventPanels.forEach((e, i) => {
    const eb = EVENT_BEATS[e.event_id] ?? { env: asEnv(fallbackEnv), effects: e.assets, cast: [] as Cast[] };
    const s = shapes[Math.min(i + 1, shapes.length - 1)];
    panels.push(beatPanel(`ev-${e.event_id}`, { ...eb, effects: eb.effects ?? e.assets }, EVENT_SHOT[e.event_id], s.ratio, s.span, textReserve([], `${e.clock} — ${e.title}`, s.ratio, s.span), round * 17 + 40 + i * 5, round, { narration: `${e.clock} — ${e.title}`, caption: e.text }));
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
    return beatPanel(`ev-${e.event_id}`, { ...eb, effects: eb.effects ?? e.assets }, EVENT_SHOT[e.event_id], s.ratio, s.span, textReserve([], title, s.ratio, s.span), round * 17 + 60 + i * 5, round, { narration: title, caption: e.text });
  });
  return { columns, panels, decisionBackdrop: "np.ops_office", grade: "flat" };
}
