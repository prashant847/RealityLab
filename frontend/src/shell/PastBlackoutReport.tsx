import { useEffect, useState } from "react";
import { api as gameApi } from "../api/client";
import type { SimulationView } from "../api/types";
import { FinishedScreen } from "../screens/FinishedScreen";
import { SoundToggle } from "../audio/useAudio";

const go = (h: string) => { window.location.hash = h; };

/** One finished BLACKOUT game, opened by its own run: its ending, score and the Archivist's debrief, whatever has been played since. */
export function PastBlackoutReport({ simId, runId }: { simId: string; runId: string }) {
  const [view, setView] = useState<SimulationView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setView(null); setErr(null);
    gameApi.get(simId, runId).then((v) => { if (live) setView(v); }).catch((e: Error) => { if (live) setErr(e.message); });
    return () => { live = false; };
  }, [simId, runId]);
  return (
    <div className="bo-root">
      <nav className="back-bar" aria-label="Application"><button type="button" onClick={() => go("#/journey")}>← My journey</button><span className="back-right"><SoundToggle className="snd-toggle--dark" />RealityLab AI</span></nav>
      <div className="bo-body">
        {err && <p className="alert" role="alert">This game could not be opened: {err}</p>}
        {!view && !err && <p className="hub-loading" role="status"><span className="hub-spin" aria-hidden="true" /> Opening your report…</p>}
        {view && view.scene.final && <FinishedScreen api={gameApi} simId={simId} runId={runId} final={view.scene.final} state={view.state} />}
        {view && !view.scene.final && <p role="status">This game was not finished, so it has no report yet.</p>}
      </div>
    </div>
  );
}
