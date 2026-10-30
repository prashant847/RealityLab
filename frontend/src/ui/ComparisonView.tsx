import type { Comparison, RunSummary } from "../api/types";

const LABELS: Record<string, [string, string]> = {
  delivery_completion: ["Delivery completion", "%"], hospital_shipped: ["Urgent cargo lots moved", ""], contract_shipped: ["Key account cargo lots moved", ""],
  budget_left: ["Recovery effort left", " points"], staff_safety: ["Staff safety", "%"], system_integrity: ["System integrity", "%"],
  recovery_progress: ["System recovery", "%"], verified_share: ["Cargo confidence (verified share)", "%"], evidence_quality: ["Evidence quality", "%"],
  public_trust: ["Public trust", "%"], time_left: ["Time remaining", " min"], overall_score: ["Overall score", ""],
};
const fmt = (v: number | null, unit: string) => (v === null ? "—" : `${v}${unit}`);

function Sparkline({ c }: { c: Comparison }) {
  const pts = (key: "base" | "other") => c.timeline.map((t) => (t[key] ? [t.index, t[key]!.readiness_after] : null)).filter(Boolean) as number[][];
  const all = [...pts("base"), ...pts("other")];
  if (all.length === 0) return null;
  const lo = Math.min(...all.map((p) => p[1])) - 3, hi = Math.max(...all.map((p) => p[1])) + 3, n = Math.max(1, c.timeline.length - 1);
  const xy = (p: number[]) => `${20 + (p[0] / n) * 260},${90 - ((p[1] - lo) / (hi - lo || 1)) * 70}`;
  const last = (k: "base" | "other") => pts(k).at(-1)?.[1];
  return (
    <svg className="spark" viewBox="0 0 300 110" role="img"
      aria-label={`Readiness after each decision. ${c.base.label} ends at ${last("base")}; ${c.other.label} ends at ${last("other")}.`}>
      <polyline className="spark-base" points={pts("base").map(xy).join(" ")} fill="none" />
      <polyline className="spark-other" points={pts("other").map(xy).join(" ")} fill="none" />
      {c.first_difference !== null && <line className="spark-split" x1={20 + (c.first_difference / n) * 260} x2={20 + (c.first_difference / n) * 260} y1="10" y2="95" />}
    </svg>
  );
}

function Head({ r, side }: { r: RunSummary; side: string }) {
  return (
    <div className={`cmp-head cmp-head--${side}`}>
      <p className="kicker">{r.label}</p>
      <h3>{r.ending}</h3>
      <p className="muted">{r.decisions} decisions · {r.status === "completed" ? "finished" : r.status === "dead_end" ? "ended in a dead end" : "in progress"}</p>
    </div>
  );
}

export function ComparisonView({ c, onClose }: { c: Comparison; onClose?: () => void }) {
  const rows = c.metrics.filter((m) => LABELS[m.metric]);
  return (
    <section className="compare" aria-labelledby="cmp-h">
      <div className="history-head">
        <h1 id="cmp-h">Compare timelines</h1>
        {onClose && <button type="button" className="primary" onClick={onClose}>Back</button>}
      </div>
      <p className="muted">{c.same_seed ? "Same seed and same starting conditions. " : ""}{c.first_difference === null
        ? "These two attempts made identical decisions." : `The attempts first differ at decision ${c.first_difference + 1}.`} {c.note}</p>
      <div className="cmp-heads"><Head r={c.base} side="base" /><Head r={c.other} side="other" /></div>

      <table className="cmp-table">
        <caption className="sr-only">Outcome measures for both attempts</caption>
        <thead><tr><th scope="col">Measure</th><th scope="col">{c.base.label}</th><th scope="col">{c.other.label}</th><th scope="col">Change</th></tr></thead>
        <tbody>
          {rows.map((m) => {
            const [name, unit] = LABELS[m.metric];
            return (
              <tr key={m.metric} data-favours={m.favours ?? "none"}>
                <th scope="row">{name}</th>
                <td className={m.favours === "base" ? "fav" : ""}>{fmt(m.base, unit)}{m.favours === "base" && <span className="sr-only"> (better)</span>}</td>
                <td className={m.favours === "other" ? "fav" : ""}>{fmt(m.other, unit)}{m.favours === "other" && <span className="sr-only"> (better)</span>}</td>
                <td>{m.delta === null ? "—" : m.delta === 0 ? "same" : `${m.delta > 0 ? "+" : "−"}${Math.abs(m.delta)}${unit}`}</td>
              </tr>
            );
          })}
          <tr>
            <th scope="row">Critical events triggered</th>
            <td>{c.base.critical_events.length ? c.base.critical_events.join("; ") : "None"}</td>
            <td>{c.other.critical_events.length ? c.other.critical_events.join("; ") : "None"}</td>
            <td />
          </tr>
          <tr><th scope="row">Ending achieved</th><td>{c.base.ending}</td><td>{c.other.ending}</td><td /></tr>
        </tbody>
      </table>

      <div className="card">
        <h3>Readiness after each decision</h3>
        <Sparkline c={c} />
        <p className="legend"><span className="lg lg--base" /> {c.base.label} <span className="lg lg--other" /> {c.other.label} <span className="muted">— vertical line: where they diverge</span></p>
      </div>

      <h3>Side-by-side timeline</h3>
      <ol className="cmp-timeline">
        {c.timeline.map((t) => (
          <li key={t.index} className={t.diverged ? "is-diverged" : "is-shared"}>
            <span className="cmp-time">{(t.base ?? t.other)?.clock}</span>
            {[["base", t.base], ["other", t.other]].map(([k, s]) => {
              const step = s as typeof t.base;
              return (
                <div key={k as string} className="cmp-cell">
                  {step ? (<>
                    <strong>{step.label}</strong>
                    {step.events_before.length > 0 && <p className="cmp-events">Beforehand: {step.events_before.join("; ")}</p>}
                  </>) : <span className="muted">Run ended</span>}
                </div>
              );
            })}
            {!t.diverged && <span className="muted cmp-same">Same decision</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
