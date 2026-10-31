/** Client for the library, profile, journey and the generic simulations (Bhopal, hospital). BLACKOUT keeps using api/client.ts. */
export type Rating = "strong" | "mixed" | "weak";
export interface LibraryItem {
  id: "blackout" | "bhopal" | "covid"; title: string; tagline: string; role: string; domain: string; minutes: number; description: string;
  objectives: string[]; style: string; status: "none" | "active" | "completed"; completed: number; progress?: string; percent?: number;
  ending?: string; run_id?: string; disclaimer?: string;
}
export interface Profile { name: string; large_text: boolean; reduce_motion: boolean }
export interface Meter { id: string; label: string; value: number; good: "high" | "low"; hint: string }
export interface Choice { id: string; label: string; summary: string; available: boolean; reason: string }
export interface Step {
  id: string; title: string; clock: string; kind: "documented" | "hypothetical" | "simulation"; brief: string; question: string;
  facts: string[]; choices: Choice[]; part: string; scene: string; sources: string[];
}
export interface SimEvent { event_id: string; title: string; text: string; kind: string; round: number; changes: Record<string, number[]> }
export interface Scene {
  meters: Meter[]; flags: string[]; round: number; total_rounds: number; status: "active" | "completed";
  step?: Step; events?: SimEvent[]; ending?: { id: string; title: string; text: string; tone: "good" | "neutral" | "bad" };
}
export interface RunView {
  run: { id: string; sim_id: string; status: string; attempt: number };
  scenario: { id: string; title: string; role: string; disclaimer: string };
  scene: Scene; decisions: { n: number; title: string; label: string; rating: Rating; consequence: string }[];
}
export interface Outcome { choice_id: string; label: string; rating: Rating; consequence: string; lesson: string; changes: Record<string, number[]>; completed: boolean; events: SimEvent[] }
export interface Intro extends Omit<LibraryItem, "status" | "completed"> { intro: string[]; disclaimer: string; rounds: number; parts: string[] }
export interface SkillResult { id: string; label: string; percent: number; level: string; decisions_counted: number; explanation: string; evidence: { step: string; choice: string; points: number }[] }
export interface SimReport {
  simulation: string; simulation_id: string; role: string; run_id: string; completed_at?: string;
  outcome: { id: string; title: string; text: string; tone: "good" | "neutral" | "bad" };
  final_meters: { label: string; value: number; good: string }[];
  summary: { decisions: number; strong: number; mixed: number; weak: number };
  major_decisions: { step: string; part: string; chose: string; rating: Rating; consequence: string }[];
  challenges: { title: string; text: string; round: number }[];
  skills: SkillResult[]; improve: { step: string; chose: string; why: string; stronger_option: string | null; rating: Rating }[];
  focus_areas: string[]; lessons: string[]; sources: { label: string; url: string }[];
  recommended_next: { id?: string; title?: string; reason?: string }; note: string;
}
export interface Journey {
  completed: { kind: "report" | "blackout"; run_id: string; sim_id: string; title: string; attempt: number; outcome: string; tone: string; completed_at: string | null; decisions: number }[];
  skills: { label: string; percent: number; runs: number }[];
}

export class SimsApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method, headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new SimsApiError("Cannot reach the local simulation service. Close and reopen RealityLab AI.", 0);
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status}).`;
    try { msg = (await res.json()).error?.message ?? msg; } catch { /* keep default */ }
    throw new SimsApiError(msg, res.status);
  }
  return res.json() as Promise<T>;
}

export interface SimsApi {
  library(): Promise<LibraryItem[]>;
  journey(): Promise<Journey>;
  profile(): Promise<Profile>;
  saveProfile(p: Partial<Profile>): Promise<Profile>;
  intro(sim: string): Promise<Intro>;
  current(sim: string): Promise<RunView | null>;
  start(sim: string): Promise<RunView>;
  decide(run: string, choice: string): Promise<{ outcome: Outcome; view: RunView }>;
  report(run: string): Promise<SimReport>;
}

export const simsApi: SimsApi = {
  library: () => call("GET", "/library"),
  journey: () => call("GET", "/journey"),
  profile: () => call("GET", "/profile"),
  saveProfile: (p) => call("PUT", "/profile", p),
  intro: (s) => call("GET", `/sims/${s}/intro`),
  current: (s) => call("GET", `/sims/${s}/runs/current`),
  start: (s) => call("POST", `/sims/${s}/runs`),
  decide: (r, c) => call("POST", `/runs/${r}/decisions`, { choice_id: c }),
  report: (r) => call("GET", `/runs/${r}/report`),
};
