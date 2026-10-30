import { useEffect, useState } from "react";
import type { GameApi, HistoryResponse } from "../api/client";
import type { CheckpointView, Comparison } from "../api/types";

/** Counterfactual flow: pick a past decision → pick a different option → run the alternate timeline → compare. */
export function WhatIfScreen({ api, simId, onCompared, onClose }: {
  api: GameApi; simId: string; onCompared: (c: Comparison) => void; onClose: () => void;
}) {
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [cp, setCp] = useState<CheckpointView | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.history(simId).then(setHistory).catch((e: Error) => setError(e.message)); }, [api, simId]);
  useEffect(() => {
    if (index === null) { setCp(null); return; }
    setBusy("Loading that decision…"); setError(null);
    api.checkpoint(simId, index).then(setCp).catch((e: Error) => setError(e.message)).finally(() => setBusy(null));
  }, [api, simId, index]);

  const run = async (choiceId: string) => {
    if (index === null) return;
    setBusy("Running the alternate timeline…"); setError(null);
    try {
      await api.replay(simId, index, [choiceId], true);
      onCompared(await api.compare(simId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="whatif" aria-labelledby="wi-h">
      <div className="history-head">
        <h1 id="wi-h">Try a different decision</h1>
        <button type="button" className="primary" onClick={onClose}>Back</button>
      </div>
      <p className="muted">Pick a decision you made, choose another option, and see how the same night would have gone. It runs as a separate timeline with the same seed; your finished run stays exactly as it is.</p>
      {error && <p className="alert" role="alert">{error}</p>}
      {busy && <p role="status" className="muted">{busy}</p>}

      {index === null && (
        <ol className="whatif-list" aria-label="Your decisions">
          {history?.decisions.map((d) => (
            <li key={d.index}>
              <span className="log-time">{d.clock}</span>
              <span>{d.label}</span>
              <button type="button" className="ghost small" onClick={() => setIndex(d.index)} aria-label={`Change decision ${d.index + 1}: ${d.label}`}>Change this</button>
            </li>
          ))}
        </ol>
      )}

      {index !== null && cp && (
        <div>
          <button type="button" className="ghost small" onClick={() => setIndex(null)}>← Choose another decision</button>
          <h2>{cp.clock} — {cp.title}</h2>
          <div className="card">
            <h3>What you knew then</h3>
            <ul>{cp.known_info.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
          <h3>Options</h3>
          <ul className="whatif-options">
            {cp.choices.map((c) => (
              <li key={c.id} className={c.chosen ? "is-chosen" : ""}>
                <strong>{c.label}</strong> {c.chosen && <span className="chip chip--warn">What you chose</span>}
                <p className="muted">{c.summary}</p>
                {c.chosen ? null : c.available
                  ? <button type="button" className="primary small" disabled={Boolean(busy)} onClick={() => void run(c.id)} aria-label={`Run the timeline where you chose: ${c.label}`}>Run this timeline</button>
                  : <span className="decision-why">{c.reason}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
