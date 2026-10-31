import { useState } from "react";
import type { FinalDispatch, WorldView } from "../api/types";

function Bar({ label, value, need }: { label: string; value: number; need: number }) {
  const pct = Math.min(100, (value / need) * 100);
  const met = value >= need;
  return (
    <div className="ship" data-met={met}>
      <div className="ship-head"><span>{label}</span><b>{value} / {need} cargo lots</b></div>
      <div className="meter-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={need} aria-valuenow={value}>
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="ship-flag">{met ? "Need met" : `${need - value} lots short`}</span>
    </div>
  );
}

export function OutcomeReport({ final, state, children, onRewind, onReplay, onRestart, onCompare, felt }: {
  final: FinalDispatch; state: WorldView; children?: React.ReactNode; felt?: React.ReactNode;
  onRewind?: () => void; onReplay?: () => void; onRestart?: () => void; onCompare?: () => void;
}) {
  const good = final.ending === "full_recovery" || final.ending === "hospitals_served";
  const [tab, setTab] = useState<"ending" | "score" | "full" | "felt">("ending");
  return (
    <section className={`outcome outcome--${good ? "good" : "poor"}`} aria-labelledby="outcome-title" data-tab={tab}>
      <header>
        <p className="kicker">About Day 10 — Reopening</p>
        <h1 id="outcome-title">{final.ending_title}</h1>
        <p className="lede">{final.ending_text}</p>
      </header>
      <div className="out-tabs no-print" role="tablist" aria-label="Report sections">
        {([["ending", "The ending"], ["score", "Score and lessons"], ["full", "Full report"], ...(felt ? [["felt", "How it felt"]] : [])] as const).map(([k, label]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k as typeof tab)}>{label}</button>))}
        {onCompare && <button type="button" className="out-compare" onClick={onCompare}>Compare attempts side by side</button>}
      </div>
      <div className="outcome-grid">
        <section className="card" aria-labelledby="oc-ship">
          <h2 id="oc-ship">What moved when the gates reopened</h2>
          <Bar label="Urgent customers" value={final.shipped_hospital} need={final.hospital_need} />
          <Bar label="Key account" value={final.shipped_contract} need={final.contract_need} />
          {!final.deadline_met && <p className="alert" role="alert">The reopening deadline passed before the cargo could move.</p>}
          {final.provisional_shortfall > 0 && <p className="alert" role="alert">{final.provisional_shortfall} cargo lots on provisional records did not exist; customers saw a shortfall.</p>}
        </section>
        <details className="card" aria-labelledby="oc-state">
          <summary id="oc-state">Where things stand (details)</summary>
          <dl className="facts">
            <div><dt>Recovery effort left</dt><dd>{state.budget.toFixed(1)} points</dd></div>
            <div><dt>Time left</dt><dd>{state.window_min} min</dd></div>
            <div><dt>Staff safety</dt><dd>{state.staff_safety}%</dd></div>
            <div><dt>Customer trust</dt><dd>{state.public_trust}%</dd></div>
            <div><dt>Evidence quality</dt><dd>{state.evidence_quality}%</dd></div>
            <div><dt>System integrity</dt><dd>{state.system_integrity}%</dd></div>
            <div><dt>Verified cargo</dt><dd>{state.verified_units} cargo lots</dd></div>
            <div><dt>Recovery</dt><dd>{state.recovery_progress}%</dd></div>
          </dl>
        </details>
      </div>
      <div className="out-children">{children}</div>
      {felt && <div className="out-felt">{felt}</div>}
      <div className="actions out-actions">
        {onReplay && <button type="button" className="primary" onClick={onReplay}>Try a different decision</button>}
        {onRewind && <button type="button" className="ghost" onClick={onRewind}>Rewind to an earlier decision</button>}
        {onRestart && <button type="button" className="ghost" onClick={onRestart}>Restart entire simulation</button>}
      </div>
    </section>
  );
}
