import type { Advice, CheckpointView, Comparison, Report, SimulationView, StakeholderKey } from "./types";

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string, readonly network = false) {
    super(message);
    this.name = "ApiError";
  }
}

export interface HistoryResponse {
  run_id: string; status: string;
  decisions: { index: number; round: number; choice_id: string; label: string; clock: string; effects: string[]; inherited: boolean; known_info: string[] }[];
  events: { index: number; round: number; event_id: string; title: string; clock: string; text: string; effects: string[]; inherited: boolean }[];
}
export interface TimelineRun {
  run_id: string; kind: string; attempt: number; status: string; ending: string | null; parent_run_id: string | null;
  branch_checkpoint_index: number | null; active: boolean;
  decisions: { index: number; round: number; clock: string; choice_id: string; label: string; inherited: boolean }[];
  events: { index: number; round: number; clock: string; title: string; inherited: boolean }[];
  metrics: Record<string, number>;
}
export interface TimelineResponse {
  simulation_id: string; seed: number; active_run_id: string;
  branches: { from: string; to: string; checkpoint_index: number; kind: string }[]; runs: TimelineRun[];
}

/** Everything the UI can ask the server. Components receive this as a prop so tests can fake it. */
export interface GameApi {
  create(seed?: number): Promise<SimulationView>;
  get(id: string, runId?: string): Promise<SimulationView>;
  decide(id: string, choiceId: string): Promise<SimulationView>;
  rewind(id: string, checkpointIndex?: number): Promise<SimulationView>;
  continueAnyway(id: string): Promise<SimulationView>;
  restart(id: string): Promise<SimulationView>;
  history(id: string, runId?: string): Promise<HistoryResponse>;
  timeline(id: string): Promise<TimelineResponse>;
  advice(id: string, stakeholder: StakeholderKey): Promise<Advice>;
  adviceSoFar(id: string): Promise<Advice[]>;
  /** Id of the unfinished simulation, when the browser has no pointer to it (optional so test fakes need not provide it). */
  current?(): Promise<string | null>;
  report(id: string, runId?: string): Promise<Report>;
  compare(id: string, base?: string, other?: string): Promise<Comparison>;
  checkpoint(id: string, index: number, runId?: string): Promise<CheckpointView>;
  replay(id: string, checkpointIndex: number, choices: string[], followOriginal: boolean): Promise<SimulationView>;
}

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
const TIMEOUT_MS = 60_000;

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method, signal: ctrl.signal,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    const timedOut = e instanceof DOMException && e.name === "AbortError";
    throw new ApiError(
      timedOut ? "The server took too long to respond." : "Cannot reach the simulation server. Is the backend running on port 8000?",
      0, timedOut ? "timeout" : "network", true);
  } finally {
    clearTimeout(timer);
  }
  let data: unknown = null;
  try { data = await res.json(); } catch { /* non-JSON body */ }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(err?.message ?? `Request failed (${res.status}).`, res.status, err?.code ?? "http_error");
  }
  return data as T;
}

const q = (runId?: string) => (runId ? `?run_id=${encodeURIComponent(runId)}` : "");
const sim = (id: string) => `/simulations/${encodeURIComponent(id)}`;

export const api: GameApi = {
  create: (seed) => request("POST", "/simulations", seed === undefined ? {} : { seed }),
  get: (id, runId) => request("GET", `${sim(id)}${q(runId)}`),
  decide: (id, choiceId) => request("POST", `${sim(id)}/decisions`, { choice_id: choiceId }),
  rewind: (id, checkpointIndex) => request("POST", `${sim(id)}/rewind`, checkpointIndex === undefined ? {} : { checkpoint_index: checkpointIndex }),
  continueAnyway: (id) => request("POST", `${sim(id)}/continue`),
  restart: (id) => request("POST", `${sim(id)}/restart`),
  history: (id, runId) => request("GET", `${sim(id)}/history${q(runId)}`),
  timeline: (id) => request("GET", `${sim(id)}/timeline`),
  advice: (id, stakeholder) => request("POST", `${sim(id)}/stakeholder-advice`, { stakeholder }),
  adviceSoFar: (id) => request("GET", `${sim(id)}/stakeholder-advice`),
  current: async () => (await request<{ simulation_id: string | null }>("GET", "/blackout/current")).simulation_id,
  report: (id, runId) => request("GET", `${sim(id)}/report${q(runId)}`),
  compare: (id, base, other) => {
    const p = new URLSearchParams();
    if (base) p.set("base", base);
    if (other) p.set("other", other);
    return request("GET", `${sim(id)}/compare${p.size ? `?${p}` : ""}`);
  },
  checkpoint: (id, index, runId) => request("GET", `${sim(id)}/checkpoints/${index}${q(runId)}`),
  replay: (id, checkpointIndex, choices, followOriginal) =>
    request("POST", `${sim(id)}/replay`, { checkpoint_index: checkpointIndex, choices, follow_original: followOriginal }),
};
