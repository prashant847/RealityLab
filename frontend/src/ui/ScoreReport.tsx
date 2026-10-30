import { characterInfo } from "../comic/assets";
import type { CharacterId } from "../comic/types";
import type { Loss, Report, ReportDecision } from "../api/types";

const RATING: Record<string, string> = { sound: "Sound", questionable: "Questionable", poor: "Poor" };
const STATUS: Record<string, string> = { completed: "Finished", dead_end: "Dead end", active: "In progress", superseded: "Replaced" };
const tone = (s: number) => (s >= 75 ? "good" : s >= 50 ? "warn" : "bad");
const sign = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}`;

function Chips({ d }: { d: ReportDecision }) {
  return (
    <p className="chips">
      <span className={`rating rating--${d.rating}`}>{RATING[d.rating]}</span>
      {d.outcome === "unlucky" && <span className="rating rating--unlucky">Unlucky</span>}
      {d.outcome === "lucky" && <span className="rating rating--lucky">Got away with it</span>}
      {d.warned_by.length > 0 && <span className="chip chip--warn">Warned by {d.warned_by.map((w) => characterInfo(w.stakeholder as CharacterId).name).join(", ")}</span>}
      <span className="chip" aria-label={`Effect on readiness ${sign(d.impact.score_delta)} points`}>Impact {sign(d.impact.score_delta)}</span>
    </p>
  );
}

function LossItem({ l }: { l: Loss }) {
  return (
    <li>
      <strong>−{l.amount} {l.unit}</strong> — {l.event} ({l.clock}){l.probability < 1 ? `, a ${Math.round(l.probability * 100)}% chance` : ""}.
      {l.caused_by && <> Traced to decision {l.caused_by.index + 1}: “{l.caused_by.label}”.</>}
      {l.avoidable && l.alternative && <> <span className="muted">Avoidable by choosing “{l.alternative}”.</span></>}
      {l.earlier_chances.length > 0 && <span className="muted"> Earlier chance to prevent it: {l.earlier_chances.map((e) => `“${e.alternative}” at decision ${e.index + 1}`).join("; ")}.</span>}
      {l.chance && <span className="muted"> Chance only: nothing you decided made it likelier.</span>}
    </li>
  );
}

export function ScoreReport({ report }: { report: Report }) {
  const { overall } = report;
  const pick = (idx: number[]) => idx.map((i) => report.decisions[i]).filter(Boolean);
  return (
    <section className="score" aria-labelledby="score-h">
      <h2 id="score-h">Performance report</h2>
      <div className="score-hero">
        <div className="score-dial" role="img" aria-label={`Overall score ${overall.score} out of 100, ${overall.band}`}>
          <b>{Math.round(overall.score)}</b><span>/ 100</span>
        </div>
        <div>
          <p className={`band band--${overall.band.toLowerCase()}`}>{overall.band}</p>
          {overall.cap && <p className="alert" role="note">{overall.cap}. Uncapped it would have been {overall.raw}.</p>}
          <p className="muted">Every score below is calculated from recorded results with the formulas shown. No AI is involved in scoring.</p>
          <p className="chips">
            <span className="chip">{report.quality.sound} sound</span><span className="chip">{report.quality.questionable} questionable</span>
            <span className="chip">{report.quality.poor} poor</span>{report.quality.unlucky > 0 && <span className="chip">{report.quality.unlucky} unlucky</span>}
          </p>
        </div>
      </div>

      <div className="card" role="region" aria-labelledby="cat-h">
        <h3 id="cat-h">Scores by category</h3>
        {report.categories.map((c) => (
          <div key={c.id} className="cat">
            <div className="meter" data-tone={tone(c.score)}>
              <div className="meter-head"><span>{c.name} <span className="chip">{Math.round(c.weight * 100)}% of total</span></span><b>{Math.round(c.score)}</b></div>
              <div className="meter-track" role="meter" aria-label={c.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(c.score)}>
                <div className="meter-fill" style={{ width: `${c.score}%` }} />
              </div>
            </div>
            <details>
              <summary>How this is calculated</summary>
              <p className="muted">{c.measures}</p>
              <p><code>{c.formula}</code></p>
              <ul className="inputs">{Object.entries(c.inputs).map(([k, v]) => <li key={k}><span>{k.replace(/_/g, " ")}</span> <b>{String(v)}</b></li>)}</ul>
            </details>
          </div>
        ))}
      </div>

      <div className="two-col">
        <section className="card" aria-labelledby="best-h">
          <h3 id="best-h">Strongest decisions</h3>
          {pick(report.strongest_decisions).length === 0 ? <p className="muted">No single decision stood out as improving things.</p> :
            <ul>{pick(report.strongest_decisions).map((d) => <li key={d.index}><strong>{d.clock}</strong> {d.label} <span className="muted">({sign(d.impact.score_delta)})</span></li>)}</ul>}
          {pick(report.recovery_improvers).length > 0 && (<><h4>Decisions that improved recovery</h4>
            <ul>{pick(report.recovery_improvers).map((d) => <li key={d.index}>{d.clock} {d.label} <span className="muted">(systems {sign(d.impact.recovery_gain)})</span></li>)}</ul></>)}
        </section>
        <section className="card card--accent" aria-labelledby="worst-h">
          <h3 id="worst-h">Most damaging decisions</h3>
          {pick(report.most_damaging_decisions).length === 0 ? <p className="muted">None: no decision cost you points.</p> :
            <ul>{pick(report.most_damaging_decisions).map((d) => <li key={d.index}><strong>{d.clock}</strong> {d.label} <span className="muted">({sign(d.impact.score_delta)}, {RATING[d.rating].toLowerCase()})</span></li>)}</ul>}
        </section>
      </div>

      <section className="card" aria-labelledby="dec-h">
        <h3 id="dec-h">Every decision, judged by what you knew then</h3>
        <p className="muted">Each decision is tested in several plausible worlds that differ only in what you could not know: chance events and the true stock level. A sound decision can still turn out badly; a poor one can get away with it. These are outcomes the simulation explores under its own assumptions, not facts about a real event.</p>
        <ol className="decision-review">
          {report.decisions.map((d) => (
            <li key={d.index} data-rating={d.rating}>
              <h4>{d.clock} · {d.label}</h4>
              <Chips d={d} />
              <p>{d.verdict}</p>
              {d.warned_by.map((w) => <p key={w.stakeholder} className="muted">{characterInfo(w.stakeholder as CharacterId).name} warned: {w.why}.</p>)}
              {d.alternative && (
                <p className="alt"><b>Consider instead:</b> “{d.alternative.label}”{d.alternative.recommended_by.length > 0 && <> (recommended by {d.alternative.recommended_by.join(", ")} at the time)</>}.
                  {d.alternative.differences.length > 0 && <span className="muted"> Immediate differences: {d.alternative.differences.join("; ")}.</span>}</p>
              )}
              <details><summary>What you knew at the time</summary><ul>{d.known_info.map((k, i) => <li key={i}>{k}</li>)}</ul></details>
            </li>
          ))}
        </ol>
      </section>

      <div className="two-col">
        <section className="card" aria-labelledby="av-h">
          <h3 id="av-h">Avoidable losses</h3>
          {report.avoidable_losses.length === 0 ? <p className="muted">No losses could have been avoided by a comparably sound alternative.</p> :
            <ul>{report.avoidable_losses.map((l, i) => <LossItem key={i} l={l} />)}</ul>}
          {report.unavoidable_losses.length > 0 && (<><h4>Bad luck and unavoidable costs</h4><ul>{report.unavoidable_losses.map((l, i) => <LossItem key={i} l={l} />)}</ul></>)}
        </section>
        <section className="card" aria-labelledby="miss-h">
          <h3 id="miss-h">Missed opportunities</h3>
          {report.missed_opportunities.length === 0 ? <p className="muted">Nothing left on the table.</p> :
            <ul>{report.missed_opportunities.map((m, i) => <li key={i}>{m.text}</li>)}</ul>}
        </section>
      </div>

      {report.recommended_alternatives.length > 0 && (
        <section className="card" aria-labelledby="rec-h">
          <h3 id="rec-h">Alternative strategies worth trying</h3>
          <ul>{report.recommended_alternatives.map((a) => (
            <li key={a.index}><strong>{a.clock}</strong> — instead of “{a.chosen}”, try “{a.label}”.
              {a.recommended_by.length > 0 && <span className="muted"> {a.recommended_by.join(" and ")} recommended it.</span>}</li>))}</ul>
        </section>
      )}
      {report.focus_next.length > 0 && (
        <section className="card" aria-labelledby="focus-h">
          <h3 id="focus-h">Where to focus next</h3>
          <ul>{report.focus_next.map((f) => <li key={f.category}><strong>{f.category} ({Math.round(f.score)}).</strong> {f.advice}</li>)}</ul>
        </section>
      )}

      {report.attempts.length > 1 && (
        <section className="card" aria-labelledby="att-h">
          <h3 id="att-h">Progress across attempts</h3>
          <table className="attempt-table">
            <thead><tr><th scope="col">Attempt</th><th scope="col">Result</th><th scope="col">Score</th><th scope="col">Sound</th><th scope="col">Questionable</th><th scope="col">Poor</th></tr></thead>
            <tbody>{report.attempts.map((a) => (
              <tr key={a.run_id} className={a.active ? "is-active" : ""}>
                <th scope="row">{a.label}{a.active ? " (current)" : ""}</th>
                <td>{a.ending ? a.ending.replace(/_/g, " ") : STATUS[a.status] ?? a.status}</td>
                <td>{a.score === null ? "—" : Math.round(a.score)}</td>
                <td>{a.quality.sound}</td><td>{a.quality.questionable}</td><td>{a.quality.poor}</td>
              </tr>))}</tbody>
          </table>
        </section>
      )}

      <section className="card reveal" aria-labelledby="rev-h">
        <h3 id="rev-h">What was really in the yard</h3>
        <p>Your records said {report.reveal.recorded_units} cargo lots. There were {report.reveal.true_units}: the records overstated stock by {report.reveal.records_overstated_by}.
          You verified {report.reveal.verified_units}, so {report.reveal.existing_but_unverified} lots that did exist were never confirmed and could not ship safely.</p>
        <p className="muted">{report.reveal.note}</p>
      </section>
    </section>
  );
}
