import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type GameApi } from "../api/client";
import type { SimulationView } from "../api/types";

const KEY = "realitylab.simulationId";
const store = {
  get(): string | null { try { return localStorage.getItem(KEY); } catch { return null; } },
  set(id: string) { try { localStorage.setItem(KEY, id); } catch { /* storage unavailable: refresh-resume is best effort */ } },
  clear() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } },
};

export type Outcome = NonNullable<SimulationView["outcome"]> & { environment: string; round: number; clock: string };

export interface Problem { message: string; network: boolean; retry?: () => void }

/** Single source of truth for the UI. Every number shown comes from `view`, which is always a
 *  server response; this hook never computes game outcomes. */
export function useGame(api: GameApi) {
  const [view, setView] = useState<SimulationView | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [briefing, setBriefing] = useState<SimulationView["rewind_context"] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [booting, setBooting] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const viewRef = useRef<SimulationView | null>(null);
  viewRef.current = view;

  const guard = useCallback(async <T,>(label: string, fn: () => Promise<T>, retry?: () => void): Promise<T | undefined> => {
    setBusy(label); setProblem(null);
    try {
      return await fn();
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(String(e), 0, "unknown");
      if (err.status === 404 && viewRef.current === null) { store.clear(); setNotice("Your previous simulation could not be found, so you can start a new one."); }
      else setProblem({ message: err.message, network: err.network, retry });
      return undefined;
    } finally {
      setBusy(null);
    }
  }, []);

  const adopt = useCallback((v: SimulationView) => { store.set(v.simulation.id); setView(v); }, []);

  const boot = useCallback(async () => {
    let id = store.get();
    if (!id && api.current) { try { id = await api.current(); } catch { id = null; } }   // browser storage is per-origin; the backend knows what is unfinished
    if (!id) { setBooting(false); return; }
    const v = await guard("Resuming your simulation…", () => api.get(id), () => void boot());
    if (v) adopt(v);
    setBooting(false);
  }, [api, guard, adopt]);

  useEffect(() => { void boot(); }, [boot]);

  const start = useCallback(async (seed?: number) => {
    const v = await guard("Creating simulation…", () => api.create(seed));
    if (v) { setOutcome(null); setBriefing(null); setNotice(null); adopt(v); }
  }, [api, guard, adopt]);

  const decide = useCallback(async (choiceId: string) => {
    const cur = viewRef.current;
    if (!cur) return;
    const v = await guard("Applying decision…", () => api.decide(cur.simulation.id, choiceId), () => void decide(choiceId));
    if (v && v.outcome) {
      setOutcome({ ...v.outcome, environment: cur.scene.environment ?? "ops_office", round: cur.scene.round ?? 0, clock: cur.scene.clock ?? "" });
      setBriefing(null);
      adopt(v);
    }
  }, [api, guard, adopt]);

  const rewind = useCallback(async (checkpointIndex?: number) => {
    const cur = viewRef.current;
    if (!cur) return;
    const v = await guard("Rewinding…", () => api.rewind(cur.simulation.id, checkpointIndex), () => void rewind(checkpointIndex));
    if (v) { setOutcome(null); setBriefing(v.rewind_context ?? null); adopt(v); }
  }, [api, guard, adopt]);

  const continueAnyway = useCallback(async () => {
    const cur = viewRef.current;
    if (!cur) return;
    const v = await guard("Continuing…", () => api.continueAnyway(cur.simulation.id), () => void continueAnyway());
    if (v) { setOutcome(null); adopt(v); }
  }, [api, guard, adopt]);

  const restart = useCallback(async () => {
    const cur = viewRef.current;
    if (!cur) return;
    const v = await guard("Restarting…", () => api.restart(cur.simulation.id), () => void restart());
    if (v) { setOutcome(null); setBriefing(null); adopt(v); }
  }, [api, guard, adopt]);

  /** Forget the stored simulation (the data stays on the server) and return to the start screen. */
  const leave = useCallback(() => { store.clear(); setView(null); setOutcome(null); setBriefing(null); setProblem(null); }, []);

  return {
    view, outcome, briefing, busy, problem, booting, notice,
    start, decide, rewind, continueAnyway, restart, leave,
    dismissOutcome: () => setOutcome(null),
    dismissBriefing: () => setBriefing(null),
    dismissProblem: () => setProblem(null),
  };
}
