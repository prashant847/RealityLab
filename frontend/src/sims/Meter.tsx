import type { Meter } from "../api/sims";

export function MeterBar({ m, delta }: { m: Meter; delta?: number }) {
  const goodness = m.good === "high" ? m.value : 100 - m.value;
  const tone = goodness >= 65 ? "ok" : goodness >= 40 ? "mid" : "low";
  return (
    <div className="sm-meter" title={m.hint}>
      <div className="sm-meter-row"><span>{m.label}</span><b>{m.value}{delta ? <em className={`sm-delta ${(m.good === "low" ? delta < 0 : delta > 0) ? "up" : "down"}`} aria-label={`changed by ${delta}`}>{delta > 0 ? "+" : "\u2212"}{Math.abs(delta)}</em> : null}</b></div>
      <div className="sm-meter-track" role="meter" aria-label={m.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={m.value}>
        <div className={`sm-meter-fill sm-meter-fill--${tone}`} style={{ width: `${m.value}%` }} />
      </div>
      {m.good === "low" && <span className="sm-meter-note">lower is safer</span>}
    </div>
  );
}
