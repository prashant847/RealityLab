import type { FinalDispatch, WorldView } from "../api/types";

function Bar({ label, value, need }: { label: string; value: number; need: number }) {
  const pct = Math.min(100, (value / need) * 100);
  const met = value >= need;
  return (
    <div className="ship" data-met={met}>
      <div className="ship-head"><span>{label}</span><b>{value} / {need} units</b></div>
      <div className="meter-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={need} aria-valuenow={value}>
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="ship-flag">{met ? "Need met" : `${need - value} units short`}</span>
    </div>
  );
}

export function OutcomeReport({ final, state, children, onRewind, onReplay, onRestart }: {
  final: FinalDispatch; state: WorldView; children?: React.ReactNode;
  onRewind?: () => void; onReplay?: () => void; onRestart?: () => void;
}) {
  const good = final.ending === "full_recovery" || final.ending === "hospitals_served";
  return (
    <section className={`outcome outcome--${good ? "good" : "poor"}`} aria-labelledby="outcome-title">
      <header>
        <p className="kicker">6:00 AM — Final dispatch</p>
        <h1 id="outcome-title">{final.ending_title}</h1>
        <p className="lede">{final.ending_text}</p>
      </header>
      <div className="outcome-grid">
        <section className="card" aria-labelledby="oc-ship">
          <h2 id="oc-ship">What left the gate</h2>
          <Bar label="Hospitals" value={final.shipped_hospital} need={final.hospital_need} />
          <Bar label="Contract customer" value={final.shipped_contract} need={final.contract_need} />
          {!final.deadline_met && <p className="alert" role="alert">The dispatch window closed before the trucks could leave.</p>}
          {final.provisional_shortfall > 0 && <p className="alert" role="alert">{final.provisional_shortfall} units on provisional records did not exist; customers saw a shortfall.</p>}
        </section>
        <section className="card" aria-labelledby="oc-state">
          <h2 id="oc-state">Where things stand</h2>
          <dl className="facts">
            <div><dt>Budget left</dt><dd>₹{state.budget.toFixed(1)} lakh</dd></div>
            <div><dt>Time slack left</dt><dd>{state.window_min} min</dd></div>
            <div><dt>Staff safety</dt><dd>{state.staff_safety}%</dd></div>
            <div><dt>Public trust</dt><dd>{state.public_trust}%</dd></div>
            <div><dt>Evidence quality</dt><dd>{state.evidence_quality}%</dd></div>
            <div><dt>System integrity</dt><dd>{state.system_integrity}%</dd></div>
            <div><dt>Verified stock</dt><dd>{state.verified_units} units</dd></div>
            <div><dt>Recovery</dt><dd>{state.recovery_progress}%</dd></div>
          </dl>
        </section>
      </div>
      {children}
      <div className="actions">
        {onReplay && <button type="button" className="primary" onClick={onReplay}>Try a different decision</button>}
        {onRewind && <button type="button" className="ghost" onClick={onRewind}>Rewind to an earlier decision</button>}
        {onRestart && <button type="button" className="ghost" onClick={onRestart}>Restart entire simulation</button>}
      </div>
    </section>
  );
}
