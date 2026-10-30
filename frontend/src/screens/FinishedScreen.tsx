import { useEffect, useState } from "react";
import type { GameApi } from "../api/client";
import type { FinalDispatch, Report, WorldView } from "../api/types";
import { OutcomeReport } from "../ui/OutcomeReport";
import { ScoreReport } from "../ui/ScoreReport";

/** The ending plus the scored report (fetched from the server; scores are never computed here). */
export function FinishedScreen({ api, simId, runId, final, state, onTryDifferent, onRewind, onRestart, onCompare }: {
  api: GameApi; simId: string; runId: string; final: FinalDispatch; state: WorldView;
  onTryDifferent: () => void; onRewind: () => void; onRestart: () => void; onCompare: () => void;
}) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setReport(null); setError(null);
    api.report(simId, runId).then((r) => { if (live) setReport(r); }).catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [api, simId, runId]);

  return (
    <OutcomeReport final={final} state={state} onReplay={onTryDifferent} onRewind={onRewind} onRestart={onRestart}>
      {report && report.attempts.length > 1 && <p className="actions"><button type="button" className="ghost" onClick={onCompare}>Compare attempts side by side</button></p>}
      {!report && !error && <p role="status" className="muted">Preparing your performance report…</p>}
      {error && <p className="alert" role="alert">The report could not be loaded: {error}</p>}
      {report && <ScoreReport report={report} />}
    </OutcomeReport>
  );
}
