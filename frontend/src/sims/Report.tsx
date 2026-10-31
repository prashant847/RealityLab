import { useEffect, useState } from "react";
import type { SimReport, SimsApi } from "../api/sims";
import { Radar } from "./Radar";
import "./sims.css";

const RATING = { strong: "Strong", mixed: "Mixed", weak: "Weak" } as const;
const TABS = [["overview", "Overview"], ["decisions", "Decisions"], ["skills", "Skills"], ["improve", "Improve"], ["lessons", "Lessons & next"]] as const;
type Tab = (typeof TABS)[number][0];

export function ReportView({ api, runId, onHome, onOpen }: { api: SimsApi; runId: string; onHome: () => void; onOpen: (simId: string) => void }) {
  const [rep, setRep] = useState<SimReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [skill, setSkill] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => { api.report(runId).then(setRep).catch((e: Error) => setErr(e.message)); }, [api, runId]);

  if (err) return <main className="rep"><div className="sim-card sim-center"><h2>Report not available</h2><p>{err}</p><button type="button" className="sim-btn sim-btn--primary" onClick={onHome}>Back to all simulations</button></div></main>;
  if (!rep) return <main className="rep"><p className="sim-loading" role="status"><span className="sim-spin" aria-hidden="true" /> Preparing your report…</p></main>;
  const nx = rep.recommended_next;
  const s = rep.summary;
  const sk = rep.skills[Math.min(skill, rep.skills.length - 1)];
  return (
    <main className="rep">
      <section className={`rep-hero rep-hero--${rep.outcome.tone}`}>
        <div>
          <p className="sim-kicker">Career experience report</p>
          <h1>{rep.simulation}</h1>
          <p className="sim-meta"><b>Role experienced:</b> {rep.role}{rep.completed_at ? ` · Completed ${new Date(rep.completed_at).toLocaleDateString(undefined, { dateStyle: "long" })}` : ""}</p>
          <p className="sim-fine rep-note" role="note">{rep.note}</p>
        </div>
        <div className="rep-badge"><span>Outcome</span><strong>{rep.outcome.title}</strong>
          <div className="rep-split" role="img" aria-label={`${s.strong} strong, ${s.mixed} mixed, ${s.weak} weak decisions`}>
            <i className="s" style={{ flex: s.strong }} /><i className="m" style={{ flex: s.mixed }} /><i className="w" style={{ flex: s.weak }} /></div>
          <small>{s.decisions} decisions: {s.strong} strong · {s.mixed} mixed · {s.weak} weak</small></div>
      </section>
      <nav className="rep-tabs no-print" role="tablist" aria-label="Report sections">
        {TABS.map(([k, label]) => <button key={k} role="tab" type="button" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>)}
        <span className="sim-spacer" />
        <button type="button" className="rep-act" onClick={() => window.print()}>Print or save as PDF</button>
        <button type="button" className="rep-act" onClick={onHome}>← All simulations</button>
      </nav>

      <div className="rep-panels">
        <section className={`rep-panel${tab === "overview" ? " on" : ""}`} aria-labelledby="r-ov">
          <div className="rep-cols">
            <div><h2 id="r-ov">{rep.outcome.title}</h2><p className="rep-big">{rep.outcome.text}</p>
              {rep.challenges.length > 0 && <><h3>Key challenges you faced</h3><ul>{rep.challenges.map((c, i) => <li key={i}><b>{c.title}.</b> {c.text}</li>)}</ul></>}</div>
            <div className="rep-finals"><h3>Where things ended</h3>
              {rep.final_meters.filter((m) => m.label !== "Understanding of the record").map((m) => {
                const good = m.good === "high" ? m.value : 100 - m.value;
                return <div key={m.label} className="rep-final"><span>{m.label}</span><div className="sm-meter-track"><div className={`sm-meter-fill sm-meter-fill--${good >= 65 ? "ok" : good >= 40 ? "mid" : "low"}`} style={{ width: `${m.value}%` }} /></div><b>{m.value}</b></div>;
              })}</div>
          </div>
        </section>

        <section className={`rep-panel${tab === "decisions" ? " on" : ""}`} aria-labelledby="r-dec">
          <h2 id="r-dec">Major decisions</h2>
          <ol className="rep-decisions">{rep.major_decisions.map((d, i) => (
            <li key={i} className={open === i ? "open" : ""}>
              <button type="button" className="rep-dec-btn" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                <span className={`sim-rating sim-rating--${d.rating}`}>{RATING[d.rating]}</span><b>{d.step}</b><em>{d.chose}</em></button>
              <div className="rep-dec-more"><span className="sim-fine">{d.part}</span><p>{d.consequence}</p></div>
            </li>))}</ol>
        </section>

        <section className={`rep-panel${tab === "skills" ? " on" : ""}`} aria-labelledby="r-sk">
          <h2 id="r-sk">Skills shown by your decisions</h2>
          <div className="rep-cols rep-cols--skills">
            <div><Radar items={rep.skills.map((x) => ({ label: x.label, percent: x.percent }))} size={250} />
              <p className="sim-fine">Each score comes only from the decisions in this run that tested the skill, compared with the best and worst option available in each.</p></div>
            <div>
              <div className="rep-skills">{rep.skills.map((x, i) => (
                <button key={x.id} type="button" className={`rep-skill${i === skill ? " on" : ""}`} onClick={() => setSkill(i)} aria-pressed={i === skill}>
                  <span>{x.label}</span><div className="sm-meter-track" role="meter" aria-label={x.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={x.percent}><div className="sm-meter-fill sm-meter-fill--ok" style={{ width: `${x.percent}%` }} /></div><b>{x.level} · {x.percent}%</b></button>))}</div>
              {sk && <div className="rep-skill-detail"><b>{sk.label}</b><p>{sk.explanation} Based on {sk.decisions_counted} decision{sk.decisions_counted === 1 ? "" : "s"}.</p></div>}
            </div>
          </div>
        </section>

        <section className={`rep-panel${tab === "improve" ? " on" : ""}`} aria-labelledby="r-im">
          <h2 id="r-im">Areas for improvement</h2>
          {rep.improve.length === 0 ? <p className="rep-big">Every decision was rated strong. Replaying with different choices will show how the alternatives play out.</p> :
            <ul className="rep-improve">{rep.improve.map((m, i) => (
              <li key={i}><b>{m.step}:</b> you chose “{m.chose}”. {m.why}{m.stronger_option && <> A stronger option was: “{m.stronger_option}”.</>}</li>))}</ul>}
          {rep.focus_areas.length > 0 && <><h3>Skills to focus on next</h3><ul>{rep.focus_areas.map((f, i) => <li key={i}>{f}</li>)}</ul></>}
        </section>

        <section className={`rep-panel${tab === "lessons" ? " on" : ""}`} aria-labelledby="r-ls">
          <div className="rep-cols">
            <div><h2 id="r-ls">Important lessons</h2><ul>{rep.lessons.map((l, i) => <li key={i}>{l}</li>)}</ul>
              {rep.sources.length > 0 && <><h3>Sources</h3><ul className="rep-src">{rep.sources.map((x) => <li key={x.url}>{x.label} <span className="sim-fine">({x.url})</span></li>)}</ul>
                <p className="sim-fine">These are summaries consulted when writing this simulation. Check primary reports before quoting any detail.</p></>}</div>
            {nx.id && <div className="rep-next no-print"><h2>Recommended next</h2><p><b>{nx.title}</b></p><p>{nx.reason}</p>
              <button type="button" className="sim-btn sim-btn--primary" onClick={() => onOpen(nx.id!)}>{nx.id === rep.simulation_id ? "Replay this simulation" : "Open it"}</button></div>}
          </div>
        </section>
      </div>
    </main>
  );
}
