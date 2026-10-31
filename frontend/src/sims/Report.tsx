import { useEffect, useState } from "react";
import type { SimReport, SimsApi } from "../api/sims";
import "./sims.css";

const RATING = { strong: "Strong", mixed: "Mixed", weak: "Weak" } as const;

export function ReportView({ api, runId, onHome, onOpen }: { api: SimsApi; runId: string; onHome: () => void; onOpen: (simId: string) => void }) {
  const [rep, setRep] = useState<SimReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api.report(runId).then(setRep).catch((e: Error) => setErr(e.message)); }, [api, runId]);

  if (err) return <main className="rep"><div className="sim-card sim-center"><h2>Report not available</h2><p>{err}</p><button type="button" className="sim-btn" onClick={onHome}>Back to all simulations</button></div></main>;
  if (!rep) return <main className="rep"><p className="sim-loading" role="status">Preparing your report…</p></main>;
  const nx = rep.recommended_next;
  return (
    <main className="rep">
      <div className="rep-actions no-print">
        <button type="button" className="sim-btn sim-btn--ghost" onClick={onHome}>← All simulations</button>
        <span className="sim-spacer" />
        <button type="button" className="sim-btn" onClick={() => window.print()}>Print or save as PDF</button>
      </div>
      <header className="rep-hero">
        <p className="sim-kicker">Career experience report</p>
        <h1>{rep.simulation}</h1>
        <p className="sim-meta"><b>Role experienced:</b> {rep.role}{rep.completed_at ? ` · Completed ${new Date(rep.completed_at).toLocaleDateString(undefined, { dateStyle: "long" })}` : ""}</p>
        <div className={`rep-outcome rep-outcome--${rep.outcome.tone}`}>
          <h2>{rep.outcome.title}</h2><p>{rep.outcome.text}</p>
          <p className="sim-fine">{rep.summary.decisions} decisions: {rep.summary.strong} strong, {rep.summary.mixed} mixed, {rep.summary.weak} weak.</p>
        </div>
      </header>

      <section className="sim-card" aria-labelledby="r-dec"><h2 id="r-dec">Major decisions</h2>
        <ol className="rep-decisions">{rep.major_decisions.map((d, i) => (
          <li key={i}><span className={`sim-rating sim-rating--${d.rating}`}>{RATING[d.rating]}</span>
            <b>{d.step}</b>{d.part ? <span className="sim-fine"> · {d.part}</span> : null}
            <div>You chose: {d.chose}</div><div className="sim-fine">{d.consequence}</div></li>))}</ol>
      </section>

      {rep.challenges.length > 0 && <section className="sim-card" aria-labelledby="r-ch"><h2 id="r-ch">Key challenges you faced</h2>
        <ul>{rep.challenges.map((c, i) => <li key={i}><b>{c.title}.</b> {c.text}</li>)}</ul></section>}

      <section className="sim-card" aria-labelledby="r-sk"><h2 id="r-sk">Skills shown by your decisions</h2>
        <p className="sim-fine">Each score comes only from the decisions in this run that tested the skill, compared with the best and worst available option in each of them.</p>
        <div className="rep-skills">{rep.skills.map((s) => (
          <div key={s.id} className="rep-skill">
            <div className="sm-meter-row"><span>{s.label}</span><b>{s.level} · {s.percent}%</b></div>
            <div className="sm-meter-track" role="meter" aria-label={s.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.percent}><div className="sm-meter-fill sm-meter-fill--ok" style={{ width: `${s.percent}%` }} /></div>
            <p className="sim-fine">{s.explanation} Based on {s.decisions_counted} decision{s.decisions_counted === 1 ? "" : "s"}.</p>
          </div>))}</div>
      </section>

      <section className="sim-card" aria-labelledby="r-im"><h2 id="r-im">Areas for improvement</h2>
        {rep.improve.length === 0 ? <p>Every decision was rated strong. Replaying with different choices will show how the alternatives play out.</p> :
          <ul>{rep.improve.map((m, i) => (
            <li key={i}><b>{m.step}:</b> you chose “{m.chose}”. {m.why}{m.stronger_option && <> A stronger option was: “{m.stronger_option}”.</>}</li>))}</ul>}
        {rep.focus_areas.length > 0 && <><h3>Skills to focus on next</h3><ul>{rep.focus_areas.map((f, i) => <li key={i}>{f}</li>)}</ul></>}
      </section>

      <section className="sim-card" aria-labelledby="r-ls"><h2 id="r-ls">Important lessons</h2>
        <ul>{rep.lessons.map((l, i) => <li key={i}>{l}</li>)}</ul></section>

      {nx.id && <section className="sim-card rep-next no-print" aria-labelledby="r-nx"><h2 id="r-nx">Recommended next</h2>
        <p><b>{nx.title}</b>. {nx.reason}</p>
        <button type="button" className="sim-btn sim-btn--primary" onClick={() => onOpen(nx.id!)}>{nx.id === rep.simulation_id ? "Replay this simulation" : "Open it"}</button></section>}

      {rep.sources.length > 0 && <section className="sim-card" aria-labelledby="r-src"><h2 id="r-src">Sources</h2>
        <ul>{rep.sources.map((s) => <li key={s.url}>{s.label} <span className="sim-fine">({s.url})</span></li>)}</ul>
        <p className="sim-fine">These are summaries consulted when writing this simulation. Check primary reports before quoting any detail.</p></section>}
      <p className="sim-disclaimer" role="note">{rep.note}</p>
    </main>
  );
}
