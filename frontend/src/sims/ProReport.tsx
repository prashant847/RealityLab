import { useState } from "react";
import type { PrepItem, ReportSeal, SimReport, SimsApi } from "../api/sims";
import { ReflectionForm } from "./Reflection";
import { Radar } from "./Radar";
import { assess, indicatorFor, summaryText } from "./assessment";
import "./proreport.css";

const RATING = { strong: "Strongest option", mixed: "Acceptable", weak: "Weak" } as const;
const STATUS = { full: "In place", part: "Partly in place", missed: "Not in place" } as const;
const KIND = { workday: "Workplace judgement assessment", crisis: "Crisis decision-making assessment", technical: "Technical competence assessment", generated: "Scenario performance assessment" } as const;
const dateOf = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "long" }) : "");
const sentence = (t: string) => (/[.?!”"]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);

/**
 * The written report: a professional assessment of how the person performed, written so a hiring manager can read it in place of a first interview.
 * It reports evidence (what was decided, in what situation, with what result) and a rating for each competency, and says plainly what it can and cannot show.
 */
export function ProReport({ api, rep, name, onOpen }: { api: SimsApi; rep: SimReport; name: string; onOpen: (simId: string, to?: string) => void }) {
  const a = assess(rep);
  const [seal, setSeal] = useState<ReportSeal | undefined>(rep.seal);
  const [sealing, setSealing] = useState(false);
  const [sealErr, setSealErr] = useState<string | null>(null);
  const doSeal = async () => { setSealing(true); setSealErr(null); try { setSeal(await api.sealReport(rep.run_id, name)); } catch (e) { setSealErr((e as Error).message); } finally { setSealing(false); } };
  const s = rep.summary;
  const nx = rep.recommended_next;
  const ref = `RL-${rep.run_id.slice(0, 8).toUpperCase()}`;
  const decisions = rep.major_decisions;
  const best = decisions.filter((d) => d.rating === "strong").slice(0, 3);
  const risks = decisions.filter((d) => d.rating !== "strong").sort((x, y) => (x.rating === "weak" ? 0 : 1) - (y.rating === "weak" ? 0 : 1)).slice(0, 3);
  const meters = rep.final_meters.filter((m) => m.label !== "Understanding of the record");
  const prep = rep.kind === "workday" && rep.prep && rep.prep.length > 0 ? rep.prep : null;
  return (
    <article className="pro" aria-label="Performance assessment report">
      <header className="pro-head">
        <div className="pro-brand"><span className="pro-logo" aria-hidden="true">R</span><div><b>RealityLab AI</b><small>{KIND[rep.kind ?? "workday"] ?? KIND.workday}</small></div></div>
        <h1>Performance assessment report</h1>
        <dl className="pro-id">
          <div><dt>Candidate</dt><dd>{name}</dd></div>
          <div><dt>Role simulated</dt><dd>{rep.role}</dd></div>
          <div><dt>Simulation</dt><dd>{rep.simulation}</dd></div>
          <div><dt>Date completed</dt><dd>{dateOf(rep.completed_at) || "—"}</dd></div>
          <div><dt>Report reference</dt><dd>{ref}</dd></div>
          {seal && <div><dt>Verification code</dt><dd>{seal.code}</dd></div>}
        </dl>
      </header>

      <section className="pro-sec" aria-labelledby="pr-sum">
        <h2 id="pr-sum">Executive summary</h2>
        <div className="pro-summary">
          <div className={`pro-score pro-score--${a.band}`} role="img" aria-label={`Overall score ${a.score} out of 100, ${a.bandLabel}`}>
            <strong>{a.score}</strong><span>out of 100</span><em>{a.bandLabel}</em>
          </div>
          <div className="pro-summary-text">
            <p>{summaryText(rep, a, name)}</p>
            <p className="pro-indication"><b>What this indicates.</b> {a.indication}</p>
          </div>
        </div>
        <ul className="pro-stats" aria-label="Key figures">
          <li><strong>{s.decisions}</strong><span>decisions made</span></li>
          <li><strong>{a.strongShare}%</strong><span>strongest available option</span></li>
          <li><strong>{a.soundShare}%</strong><span>strong or acceptable</span></li>
          <li className={a.criticalErrors ? "is-bad" : ""}><strong>{a.criticalErrors}</strong><span>weak decision{a.criticalErrors === 1 ? "" : "s"}</span></li>
        </ul>
      </section>

      {rep.skills.length > 0 && (
        <section className="pro-sec" aria-labelledby="pr-comp">
          <h2 id="pr-comp">Competency assessment</h2>
          <p className="pro-lead">Each competency is scored only from the decisions in this simulation that tested it, against the best and worst option available at each step.</p>
          <div className="pro-comp">
            <div className="pro-radar"><Radar items={rep.skills.map((x) => ({ label: x.label, percent: x.percent }))} size={250} /></div>
            <table className="pro-table">
              <thead><tr><th scope="col">Competency</th><th scope="col">Rating</th><th scope="col">Evidence</th></tr></thead>
              <tbody>{rep.skills.map((x) => (
                <tr key={x.id}>
                  <th scope="row">{x.label}</th>
                  <td><div className="pro-bar" role="meter" aria-label={x.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={x.percent}><i style={{ width: `${x.percent}%` }} /></div><b>{x.level} · {x.percent}%</b></td>
                  <td>{indicatorFor(x.percent)} <span className="pro-fine">Based on {x.decisions_counted} decision{x.decisions_counted === 1 ? "" : "s"}.</span></td>
                </tr>))}</tbody>
            </table>
          </div>
        </section>
      )}

      <section className="pro-sec" aria-labelledby="pr-ev">
        <h2 id="pr-ev">Behavioural evidence</h2>
        <p className="pro-lead">The situation each decision answered, what the candidate did, and what followed. This is the same kind of evidence an interviewer asks for.</p>
        {best.length > 0 && <><h3>Where the candidate showed good judgement</h3>
          <ol className="pro-evidence">{best.map((d, i) => (
            <li key={i}><h4>{d.step}</h4>
              <dl><div><dt>Context</dt><dd>{d.part || d.step}</dd></div><div><dt>Action</dt><dd>{d.chose}</dd></div><div><dt>Result</dt><dd>{d.consequence}</dd></div></dl></li>))}</ol></>}
        {risks.length > 0 && <><h3>Where judgement carried risk</h3>
          <ol className="pro-evidence pro-evidence--risk">{risks.map((d, i) => (
            <li key={i}><h4>{d.step}</h4>
              <dl><div><dt>Context</dt><dd>{d.part || d.step}</dd></div><div><dt>Action</dt><dd>{d.chose}</dd></div><div><dt>Result</dt><dd>{d.consequence}</dd></div>
                {d.stronger_option && <div><dt>A stronger option</dt><dd>{d.stronger_option}</dd></div>}</dl></li>))}</ol></>}
        {best.length === 0 && risks.length === 0 && <p>No individual decisions were recorded for this run.</p>}
      </section>

      <section className="pro-sec" aria-labelledby="pr-rec">
        <h2 id="pr-rec">Complete decision record</h2>
        <table className="pro-table pro-table--log">
          <thead><tr><th scope="col">#</th><th scope="col">Decision point</th><th scope="col">Choice made</th><th scope="col">Assessment</th></tr></thead>
          <tbody>{decisions.map((d, i) => (
            <tr key={i}><td>{i + 1}</td><th scope="row">{d.step}</th><td>{d.chose}</td><td><span className={`pro-tag pro-tag--${d.rating}`}>{RATING[d.rating]}</span></td></tr>))}</tbody>
        </table>
      </section>

      <section className="pro-sec pro-two" aria-labelledby="pr-sd">
        <div>
          <h2 id="pr-sd">Strengths</h2>
          {a.strengths.length > 0 ? <ul className="pro-list">{a.strengths.map((x) => <li key={x.label}><b>{x.label} ({x.percent}%).</b> {x.detail}</li>)}</ul>
            : <p>No competency reached a clearly strong level in this run.</p>}
        </div>
        <div>
          <h2>Development areas</h2>
          {a.development.length > 0 || rep.improve.length > 0 ? <ul className="pro-list">
            {a.development.map((x) => <li key={x.label}><b>{x.label} ({x.percent}%).</b> {x.detail}</li>)}
            {rep.improve.slice(0, 3).map((m, i) => <li key={`i${i}`}><b>{m.step}.</b> {sentence(m.why)}{m.stronger_option ? <> A stronger option was: “{m.stronger_option}”.</> : null}</li>)}
          </ul> : <p>Every decision was the strongest available option; no development area was identified.</p>}
        </div>
      </section>

      {(meters.length > 0 || rep.outcome.text) && (
        <section className="pro-sec" aria-labelledby="pr-out">
          <h2 id="pr-out">Outcome and impact</h2>
          <p className="pro-outcome"><b>{rep.outcome.title}.</b> {rep.outcome.text}</p>
          {rep.challenges.length > 0 && <><h3>Challenges the candidate faced</h3><ul className="pro-list">{rep.challenges.map((c, i) => <li key={i}><b>{sentence(c.title)}</b> {c.text}</li>)}</ul></>}
          {meters.length > 0 && <div className="pro-meters" aria-label="Where things ended">{meters.map((m) => {
            const good = m.good === "high" ? m.value : 100 - m.value;
            return <div key={m.label} className="pro-meter"><span>{m.label}</span><div className="pro-bar"><i className={good >= 65 ? "ok" : good >= 40 ? "mid" : "low"} style={{ width: `${m.value}%` }} /></div><b>{m.value}</b></div>;
          })}</div>}
        </section>
      )}

      {prep && (
        <section className="pro-sec" aria-labelledby="pr-prep">
          <h2 id="pr-prep">What this day set up for the crisis</h2>
          <ul className="pro-list">{prep.map((p: PrepItem) => <li key={p.flag}><b>{p.label} ({STATUS[p.status]}).</b> {p.text}</li>)}</ul>
        </section>
      )}

      {rep.lessons.length > 0 && (
        <section className="pro-sec" aria-labelledby="pr-less">
          <h2 id="pr-less">Key lessons for the candidate</h2>
          <ul className="pro-list">{rep.lessons.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </section>
      )}

      <section className="pro-sec pro-method" aria-labelledby="pr-meth">
        <h2 id="pr-meth">How to read this report</h2>
        <p>Every decision in the simulation has several options of different quality. A choice is scored against the best and worst option available at that step, and competencies are averaged from the decisions that tested them. The overall score weights decision quality at 70% and competency ratings at 30%, and a scenario that ended in serious failure cannot score above 59.</p>
        <p>{rep.note} The simulation is fictional or based on public records, it is not an accredited qualification, and one scenario is one piece of evidence. It supports, and does not replace, a conversation, references and checks of qualifications.</p>
        <p className="pro-fine">Report reference {ref}. Generated by RealityLab AI on this computer from the candidate’s own run.</p>
      </section>

      <section className="pro-sec pro-seal" aria-labelledby="pr-seal">
        <h2 id="pr-seal">Verification</h2>
        {seal ? <>
          <p className="pro-seal-code"><span aria-hidden="true">✓</span> <b>{seal.code}</b></p>
          <p>Sealed for {seal.candidate} on {new Date(seal.issued_at).toLocaleDateString(undefined, { dateStyle: "long" })}. An employer can check this code on the Verify page of RealityLab AI (<span className="pro-fine">{`${window.location.origin}/#/verify/${seal.code}`}</span>). The check fails if any decision, score or name in this report has been edited.</p>
        </> : <>
          <p>Seal this report to give it a code that an employer can check, so they know it is genuine and has not been edited. A report is sealed once, with the name below, and cannot be changed afterwards.</p>
          {name === "Candidate" ? <p className="pro-fine no-print">Add your name in Settings first.</p>
            : <p className="no-print"><button type="button" className="sim-btn sim-btn--primary" disabled={sealing} onClick={() => void doSeal()}>{sealing ? "Sealing…" : `Seal this report as ${name}`}</button></p>}
          {sealErr && <p className="hub-err no-print" role="alert">{sealErr}</p>}
        </>}
      </section>

      {rep.kind === "workday" || rep.kind === "crisis" ? <section className="pro-sec no-print" aria-labelledby="pr-felt"><h2 id="pr-felt">How it felt (optional, for you)</h2><ReflectionForm api={api} runId={rep.run_id} /></section> : null}
      {nx.id && <section className="pro-next no-print"><div><h2>Recommended next</h2><p><b>{nx.title}</b> {nx.reason}</p></div>
        <button type="button" className="sim-btn sim-btn--primary" onClick={() => onOpen(nx.id!, nx.to)}>{nx.to === "crisis" ? "Begin the crisis" : nx.id === rep.simulation_id ? "Replay this simulation" : "Open it"}</button></section>}
    </article>
  );
}
