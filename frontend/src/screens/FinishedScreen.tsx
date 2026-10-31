import { useCallback, useEffect, useState } from "react";
import type { GameApi } from "../api/client";
import type { FinalDispatch, Report, WorldView } from "../api/types";
import { OutcomeReport } from "../ui/OutcomeReport";
import { ScoreReport } from "../ui/ScoreReport";
import { simsApi } from "../api/sims";
import { ReflectionForm } from "../sims/Reflection";
import { Debrief } from "../debrief/Debrief";
import { newSeed, scriptForBlackout } from "../debrief/script";
import { scriptForBlackoutHi } from "../debrief/hi";

/** The ending plus the scored report (fetched from the server; scores are never computed here). */
export function FinishedScreen({ api, simId, runId, final, state, onTryDifferent, onRewind, onRestart, onCompare }: {
  api: GameApi; simId: string; runId: string; final: FinalDispatch; state: WorldView;
  onTryDifferent: () => void; onRewind: () => void; onRestart: () => void; onCompare: () => void;
}) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debrief, setDebrief] = useState(false);
  const [seed] = useState(newSeed);
  const scenesFor = useCallback((lang: "en" | "hi") => (report ? (lang === "hi" ? scriptForBlackoutHi(report, seed) : scriptForBlackout(report, seed)) : []), [report, seed]);
  useEffect(() => {
    if (!debrief) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setDebrief(false); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [debrief]);
  useEffect(() => {
    let live = true;
    setReport(null); setError(null);
    api.report(simId, runId).then((r) => { if (live) setReport(r); }).catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [api, simId, runId]);

  return (
    <OutcomeReport final={final} state={state} onReplay={onTryDifferent} onRewind={onRewind} onRestart={onRestart} onCompare={report && report.attempts.length > 1 ? onCompare : undefined} felt={<ReflectionForm api={simsApi} runId={runId} />}
      archivist={<>
        {report && (
          <aside className="deb-offer" aria-label="Your debrief">
            <div><p className="deb-offer-k">New</p><h2>Hear your debrief</h2>
              <p>The Archivist talks you through each choice, what it led to, where it went wrong and what to do better. The written report is in the tabs below.</p></div>
            <button type="button" className="sim-btn sim-btn--primary" onClick={() => setDebrief(true)}>Hear the Archivist</button>
          </aside>)}
        {report && debrief && (
          <div className="deb-modal" role="dialog" aria-modal="true" aria-label="Your debrief with the Archivist">
            <div className="deb-modal-in"><Debrief scenesFor={scenesFor} title="BLACKOUT" onWritten={() => setDebrief(false)} /></div>
          </div>)}
      </>}>
      {!report && !error && <p role="status" className="muted">Preparing your performance report…</p>}
      {error && <p className="alert" role="alert">The report could not be loaded: {error}</p>}
      {report && <ScoreReport report={report} />}
    </OutcomeReport>
  );
}
