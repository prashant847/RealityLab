/** Client for the library, profile, journey and the generic simulations (Bhopal, hospital). BLACKOUT keeps using api/client.ts. */
export type Rating = "strong" | "mixed" | "weak";
export interface LibraryItem {
  id: "blackout" | "bhopal" | "covid"; title: string; tagline: string; role: string; domain: string; minutes: number; description: string;
  objectives: string[]; style: string; status: "none" | "active" | "completed"; completed: number; progress?: string; percent?: number;
  ending?: string; run_id?: string; disclaimer?: string; workday?: Phase;
}
/** One half of a profession: the ordinary-day workday (the crisis is the library item itself). */
export interface Phase { id: string; title: string; tagline: string; minutes: number; rounds: number; status: "none" | "active" | "completed"; run_id?: string; progress?: string; percent?: number; ending?: string; prep_earned?: number; prep_total?: number }
export interface Profile { name: string; large_text: boolean; reduce_motion: boolean }
export interface Meter { id: string; label: string; value: number; good: "high" | "low"; hint: string }
export interface Choice { id: string; label: string; summary: string; available: boolean; reason: string }
export interface Step {
  id: string; title: string; clock: string; kind: "documented" | "hypothetical" | "simulation" | "workday"; brief: string; question: string;
  facts: string[]; choices: Choice[]; part: string; scene: string; sources: string[];
}
export interface SimEvent { event_id: string; title: string; text: string; kind: string; round: number; changes: Record<string, number[]> }
export interface Scene {
  meters: Meter[]; flags: string[]; prepared?: { flag: string; label: string; text: string; full: boolean; effects: Record<string, number> }[]; round: number; total_rounds: number; status: "active" | "completed";
  step?: Step; events?: SimEvent[]; ending?: { id: string; title: string; text: string; tone: "good" | "neutral" | "bad" };
}
export interface RunView {
  run: { id: string; sim_id: string; status: string; attempt: number };
  scenario: { id: string; title: string; role: string; disclaimer: string; kind?: "workday" | "crisis"; profession?: string };
  scene: Scene; decisions: { n: number; title: string; label: string; rating: Rating; consequence: string }[];
}
export interface Outcome { choice_id: string; label: string; rating: Rating; consequence: string; lesson: string; changes: Record<string, number[]>; completed: boolean; events: SimEvent[] }
export interface Intro extends Omit<LibraryItem, "status" | "completed" | "workday"> { intro: string[]; disclaimer: string; rounds: number; parts: string[]; kind?: "workday" | "crisis"; profession?: string; prep?: PrepSummary | null }
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
  recommended_next: { id?: string; title?: string; reason?: string; to?: string }; note: string;
  kind?: "workday" | "crisis"; profession?: string; prep?: PrepItem[]; prepared?: { flag: string; label: string; text: string; full: boolean }[];
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
  reflection(run: string): Promise<ReflectionView | null>;
  saveReflection(run: string, r: { enjoyment: number; stress: number; daily_interest: number; note: string }): Promise<ReflectionView>;
  careers(): Promise<CareersView>;
  saveChoice(career: string, reason: string): Promise<CareerChoice | null>;
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
  reflection: (r) => call("GET", `/runs/${r}/reflection`),
  saveReflection: (r, b) => call("POST", `/runs/${r}/reflection`, b),
  careers: () => call("GET", "/careers"),
  saveChoice: (career, reason) => call("PUT", "/career-choice", { career, reason }),
};

export interface PrepItem { flag: string; label: string; task: string; status: "full" | "part" | "missed"; text: string; effects: string[] }
export interface PrepSummary { workday_done: boolean; items: PrepItem[]; earned: number; total: number }
export interface ReflectionView { run_id: string; profession: string; phase: "workday" | "crisis"; enjoyment: number; stress: number; daily_interest: number; note: string }
export interface CareerPhase { run_id: string; outcome: string; decisions: number; strong: number; mixed: number; weak: number; quality: number | null; score?: number | null; reflection: ReflectionView | null }
export interface Career {
  id: "blackout" | "bhopal" | "covid"; title: string; field: string; setting: string; tagline: string;
  daily: { workday: string[]; crisis: string[] }; problems: { workday: string[]; crisis: string[] };
  decisions: { tempo: number[]; information: number[]; stakes: number[]; reversibility: number[]; text: { workday: string; crisis: string } };
  pressure: { workday: number; crisis: number; text: { workday: string; crisis: string } };
  communication: { with: string[]; text: { workday: string; crisis: string } };
  rewards: string[]; costs: string[]; skills_required: Record<string, number>;
  you: { phases: { workday: CareerPhase | null; crisis: CareerPhase | null }; skills: Record<string, number>; complete: boolean };
}
export interface CareerChoice { career: string; reason: string; updated_at: string }
export interface CareersView { careers: Career[]; skills: Record<string, string>; dimensions: { id: string; label: string }[]; choice: CareerChoice | null; note: string }
