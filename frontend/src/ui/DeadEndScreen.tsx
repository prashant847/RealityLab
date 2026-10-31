import { useRef, useState } from "react";
import type { Analysis } from "../api/types";
import { NpEnv } from "../comic/notpetya/Env";
import { RecoveryTimeline } from "./RecoveryTimeline";

export interface DeadEndActions {
  onRewind: () => void; onTimeline: () => void; onRestart: () => void; onContinue?: () => void;
}

export function DeadEndScreen({ analysis, rewindsLeft, busy, actions }: {
  analysis: Analysis; rewindsLeft: number; busy?: boolean; actions: DeadEndActions;
}) {
  const review = useRef<HTMLDetailsElement>(null);
  const [tab, setTab] = useState<"overview" | "critical" | "timeline" | "mistakes">("overview");
  const canRewind = rewindsLeft > 0 && analysis.last_recoverable_checkpoint !== null;
  const cp = analysis.critical_point;
  const reviewMistakes = () => setTab("mistakes");
  return (
    <section className="deadend" aria-labelledby="deadend-title" data-tab={tab}>
      <header className="deadend-hero">
        <div className="deadend-bg" aria-hidden="true"><NpEnv env="warehouse_floor" effects={["power_failure", "warning_lights"]} /></div>
        <p className="kicker">{analysis.severity === "soft" ? "Objective out of reach — a reduced outcome remains" : "No acceptable outcome remains"}</p>
        <h1 id="deadend-title">{analysis.title}</h1>
      </header>

      <div className="out-tabs de-tabs" role="tablist" aria-label="Dead end sections">
        {([["overview", "What happened"], ["critical", "The critical point"], ["timeline", "Timeline"], ["mistakes", "Review my mistakes"]] as const).map(([k, label]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>))}
      </div>
      <div className="de-panels">
      <div className="deadend-grid">
        <section className="card" aria-labelledby="de-what">
          <h2 id="de-what">What happened</h2>
          <ul>{analysis.what_happened.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </section>
        <section className="card card--accent" aria-labelledby="de-why">
          <h2 id="de-why">Why it is unrecoverable</h2>
          <ul>{analysis.why_unrecoverable.map((d) => <li key={d.id}>{d.text}</li>)}</ul>
        </section>
      </div>

      {cp && (
        <section className="card" aria-labelledby="de-critical">
          <h2 id="de-critical">The critical point — {cp.clock}, round {cp.round}</h2>
          <p>You chose: <strong>{cp.decision_taken}</strong></p>
          <div className="two-col">
            <div>
              <h3>What you knew then</h3>
              <ul>{cp.known_at_time.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
            <div>
              <h3>Options that still kept recovery possible</h3>
              <ul>{cp.better_options.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          </div>
        </section>
      )}

      <RecoveryTimeline analysis={analysis} rewindFrom={analysis.last_recoverable_checkpoint} />

      <details ref={review} className="card review" open={tab === "mistakes"} onToggle={(e) => { if (!(e.currentTarget as HTMLDetailsElement).open && tab === "mistakes") setTab("overview"); }}>
        <summary>Review my mistakes — decision by decision</summary>
        {analysis.contributing_decisions.map((d) => (
          <article key={d.index} className="mistake">
            <h3>
              {d.clock} · Round {d.round} — {d.label}
              <span className={`tag tag--${d.kind === "closed_recovery_window" ? "critical" : "warn"}`}>
                {d.kind === "closed_recovery_window" ? "Closed the recovery window" : "Narrowed your options"}
              </span>
            </h3>
            <p className="muted">Recorded effects: {d.effects.join("; ") || "none"}</p>
            <p>
              Before this decision, {d.options_keeping_recovery_before.viable} of {d.options_keeping_recovery_before.total} options kept
              recovery possible; afterwards, {d.options_keeping_recovery_after.viable} of {d.options_keeping_recovery_after.total}.
            </p>
            {d.risks_visible_then.length > 0 && (<><h4>Warnings visible at the time</h4><ul>{d.risks_visible_then.map((r, i) => <li key={i}>{r}</li>)}</ul></>)}
            {d.risks_created.length > 0 && (<><h4>Risks this decision created</h4><ul>{d.risks_created.map((r, i) => <li key={i}>{r}</li>)}</ul></>)}
            {d.consequences.length > 0 && (<><h4>Discovered later</h4><ul>{d.consequences.map((c, i) => <li key={i}><strong>{c.title}</strong> — {c.text}</li>)}</ul></>)}
            {d.chance_events_after.length > 0 && (<p className="muted">Chance also played a part: {d.chance_events_after.map((c) => `${c.title} (${Math.round(c.probability * 100)}% likely)`).join("; ")}.</p>)}
          </article>
        ))}
        {analysis.risks_not_addressed.length > 0 && (<><h3>Warnings that stayed unaddressed</h3><ul>{analysis.risks_not_addressed.map((r, i) => <li key={i}>{r}</li>)}</ul></>)}
      </details>
      </div>
      <div className="actions">
        <button type="button" className="primary" disabled={!canRewind || busy} onClick={actions.onRewind}>
          REWIND TO LAST RECOVERABLE DECISION
        </button>
        <button type="button" className="ghost" onClick={reviewMistakes}>Review my mistakes</button>
        <button type="button" className="ghost" onClick={actions.onTimeline}>View decision timeline</button>
        {analysis.continue_allowed && actions.onContinue && (
          <button type="button" className="ghost ghost--warn" disabled={busy} onClick={actions.onContinue}>Continue despite the risk</button>
        )}
        <button type="button" className="ghost" disabled={busy} onClick={actions.onRestart}>Restart entire simulation</button>
      </div>
      {!canRewind && <p className="muted" role="status">{rewindsLeft <= 0 ? "No rewinds remain in this simulation." : "There is no recoverable checkpoint."}</p>}
      <p className="muted">{rewindsLeft} rewind{rewindsLeft === 1 ? "" : "s"} remaining. A rewind is not a guarantee: consequences are recalculated from that point.</p>
    </section>
  );
}
