import { useEffect, useMemo, useState } from "react";
import type { GameApi, HistoryResponse, TimelineResponse, TimelineRun } from "../api/client";

type Tab = "log" | "attempts";
const runName = (r: TimelineRun) => `Attempt ${r.attempt}${r.kind === "rewind" ? " (rewound)" : r.kind === "restart" ? " (restart)" : r.kind === "replay" ? " (what-if)" : ""}`;
const STATUS: Record<string, string> = { active: "In progress", dead_end: "Dead end", completed: "Finished", superseded: "Replaced" };

/** Chronological log: events fire on entering a round, i.e. before that round's decision. */
function mergeLog(h: HistoryResponse) {
  const items = [
    ...h.decisions.map((d) => ({ key: `d${d.index}`, order: d.round * 2 + 1, kind: "decision" as const, d })),
    ...h.events.map((e) => ({ key: `e${e.index}`, order: e.round * 2, kind: "event" as const, e })),
  ];
  return items.sort((a, b) => a.order - b.order);
}

export function HistoryScreen({ api, simId, activeRunId, rewindsLeft, onClose, onRewind }: {
  api: GameApi; simId: string; activeRunId: string; rewindsLeft: number; onClose: () => void; onRewind: (index: number) => void;
}) {
  const [tab, setTab] = useState<Tab>("log");
  const [runId, setRunId] = useState(activeRunId);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    setError(null);
    Promise.all([api.history(simId, runId), api.timeline(simId)])
      .then(([h, t]) => { if (live) { setHistory(h); setTimeline(t); } })
      .catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [api, simId, runId]);

  const log = useMemo(() => (history ? mergeLog(history) : []), [history]);
  const isActive = runId === activeRunId;

  return (
    <div className="history">
      <div className="history-head">
        <h1>Event log &amp; history</h1>
        <button type="button" className="primary" onClick={onClose}>Back to the simulation</button>
      </div>
      <div role="tablist" aria-label="History views" className="tabs">
        {(["log", "attempts"] as const).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} className={tab === t ? "is-on" : ""} onClick={() => setTab(t)}>
            {t === "log" ? "Event log" : "Attempts & timeline"}
          </button>
        ))}
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      {!history && !error && <p role="status">Loading…</p>}

      {history && timeline && tab === "log" && (
        <section aria-label="Event log">
          <label className="run-select">Showing{" "}
            <select value={runId} onChange={(e) => setRunId(e.target.value)}>
              {timeline.runs.map((r) => <option key={r.run_id} value={r.run_id}>{runName(r)} — {STATUS[r.status] ?? r.status}{r.active ? " (current)" : ""}</option>)}
            </select>
          </label>
          {log.length === 0 && <p className="muted">Nothing has happened yet in this attempt.</p>}
          <ol className="log">
            {log.map((it) => it.kind === "decision" ? (
              <li key={it.key} className="log-decision">
                <span className="log-time">{it.d.clock}</span>
                <div>
                  <strong>Decision:</strong> {it.d.label}
                  {it.d.effects.length > 0 && <p className="chips">{it.d.effects.map((x) => <span key={x} className="chip">{x}</span>)}</p>}
                  <details><summary>What you knew at the time</summary><ul>{it.d.known_info.map((k, i) => <li key={i}>{k}</li>)}</ul></details>
                </div>
              </li>
            ) : (
              <li key={it.key} className="log-event">
                <span className="log-time">{it.e.clock}</span>
                <div><strong>{it.e.title}.</strong> {it.e.text}
                  {it.e.effects.length > 0 && <p className="chips">{it.e.effects.map((x) => <span key={x} className="chip">{x}</span>)}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {timeline && tab === "attempts" && (
        <section aria-label="Attempts and timeline">
          <p className="muted">Every attempt is kept. Rewinding never erases an earlier run.{rewindsLeft > 0 ? ` ${rewindsLeft} rewind${rewindsLeft === 1 ? "" : "s"} left.` : " No rewinds remain."}</p>
          <div className="attempts">
            {timeline.runs.map((r) => (
              <article key={r.run_id} className={`attempt${r.active ? " is-active" : ""}`} aria-label={runName(r)}>
                <h2>{runName(r)}</h2>
                <p className="muted">{STATUS[r.status] ?? r.status}{r.ending ? ` — ${r.ending.replace(/_/g, " ")}` : ""}{r.active ? " · current" : ""}</p>
                {r.parent_run_id && r.branch_checkpoint_index !== null && (
                  <p className="muted">Branched from decision {r.branch_checkpoint_index + 1} of an earlier attempt.</p>
                )}
                <ol className="decision-strip">
                  {r.decisions.map((d) => (
                    <li key={d.index} className={d.inherited ? "inherited" : ""}>
                      <span className="log-time">R{d.round}</span> {d.label}
                      {r.active && rewindsLeft > 0 && r.status !== "superseded" && (
                        confirm === d.index ? (
                          <span className="inline-confirm">
                            Branch from here? <button type="button" className="primary small" onClick={() => onRewind(d.index)}>Yes, rewind</button>
                            <button type="button" className="ghost small" onClick={() => setConfirm(null)}>Cancel</button>
                          </span>
                        ) : (
                          <button type="button" className="ghost small" onClick={() => setConfirm(d.index)} aria-label={`Rewind to decision ${d.index + 1}: ${d.label}`}>Rewind here</button>
                        )
                      )}
                    </li>
                  ))}
                </ol>
                <p className="metrics">
                  Budget ₹{r.metrics.budget?.toFixed(1)} lakh · Safety {r.metrics.staff_safety}% · Trust {r.metrics.public_trust}% · Evidence {r.metrics.evidence_quality}%
                </p>
                <button type="button" className="ghost small" onClick={() => { setRunId(r.run_id); setTab("log"); }}>
                  Review this attempt
                </button>
              </article>
            ))}
          </div>
          {!isActive && <p className="muted">You are reviewing an earlier attempt (read only).</p>}
        </section>
      )}
    </div>
  );
}
