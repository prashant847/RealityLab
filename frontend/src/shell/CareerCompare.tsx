import { useCallback, useEffect, useState } from "react";
import type { Career, CareerChoice, CareerPhase, CareersView, SimsApi } from "../api/sims";

const go = (h: string) => { window.location.hash = h; };
const COLORS: Record<string, string> = { blackout: "#c4511a", bhopal: "#a8481f", covid: "#1f8aa0" };
const SHORT: Record<string, string> = { blackout: "Operations & incident response", bhopal: "Process safety", covid: "Hospital doctor" };
const crisisRoute = (id: string) => (id === "blackout" ? "#/play/blackout" : `#/crisis/${id}`);
const JOB_TABS = [["overview", "At a glance"], ["daily", "Daily responsibilities"], ["problems", "Types of problems"], ["decisions", "Decision-making"], ["pressure", "Workplace pressure"], ["comms", "Communication and teamwork"], ["skills", "Skills required"]] as const;
type JobTab = (typeof JOB_TABS)[number][0];

function Dots({ n, color }: { n: number; color: string }) {
  return <span className="cc-dots" role="img" aria-label={`${n} out of 5`}>{[1, 2, 3, 4, 5].map((i) => <i key={i} style={{ background: i <= n ? color : undefined }} className={i <= n ? "on" : ""} />)}</span>;
}
function Bar({ pct, color, label }: { pct: number; color: string; label: string }) {
  return <span className="cc-bar" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><i style={{ width: `${pct}%`, background: color }} /></span>;
}
const avg = (xs: (number | null | undefined)[]) => { const v = xs.filter((x): x is number => typeof x === "number"); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
const quality = (c: Career) => avg([c.you.phases.workday?.quality, c.you.phases.crisis?.quality]);
const feel = (c: Career, k: "enjoyment" | "stress" | "daily_interest") => avg([c.you.phases.workday?.reflection?.[k], c.you.phases.crisis?.reflection?.[k]]);
const sortedSkills = (c: Career) => Object.entries(c.you.skills).sort((a, b) => b[1] - a[1]);

/** What you did and felt in one half of a job. */
function PhaseBlock({ title, ph, color, nameOf }: { title: string; ph: CareerPhase; color: string; nameOf: string }) {
  const r = ph.reflection;
  return (
    <div className="cc-phase">
      <h4>{title}</h4>
      <p className="cc-out">{ph.outcome}</p>
      <div className="cc-q"><span>Decision quality</span><Bar pct={ph.quality ?? 0} color={color} label={`${nameOf} ${title} decision quality`} /><b>{ph.quality ?? 0}%</b></div>
      <p className="cc-counts">{ph.strong} strong · {ph.mixed} mixed · {ph.weak} weak{ph.score != null ? ` · score ${Math.round(ph.score)}` : ""}</p>
      {r ? <dl className="cc-dl cc-dl--sm"><dt>Enjoyed</dt><dd><Dots n={r.enjoyment} color={color} /></dd><dt>Stressful</dt><dd><Dots n={r.stress} color={color} /></dd><dt>Could do daily</dt><dd><Dots n={r.daily_interest} color={color} /></dd></dl>
        : <p className="cc-norate">Not rated yet. <button type="button" className="cc-link" onClick={() => go(`#/report/${ph.run_id}`)}>Rate how it felt</button></p>}
    </div>
  );
}

function signals(cs: Career[]): string[] {
  const out: string[] = [];
  const best = (f: (c: Career) => number | null, dir: 1 | -1 = 1) => {
    const v = cs.map((c) => ({ c, v: f(c) })).filter((x): x is { c: Career; v: number } => x.v != null);
    if (v.length < 2) return null;
    const top = [...v].sort((a, b) => dir * (b.v - a.v))[0];
    return v.every((x) => x.v === top.v) ? null : top;
  };
  const q = best(quality); if (q) out.push(`You made your best decisions overall as: ${q.c.title} (${q.v}% decision quality).`);
  const cq = best((c) => c.you.phases.crisis?.quality ?? null); if (cq) out.push(`Under pressure, you did best as: ${cq.c.title} (${cq.v}%).`);
  const shift = cs.map((c) => ({ c, d: (c.you.phases.crisis?.quality ?? 0) - (c.you.phases.workday?.quality ?? 0) })).sort((a, b) => b.d - a.d)[0];
  if (shift && Math.abs(shift.d) >= 15) out.push(shift.d > 0 ? `You rose to the crisis in ${shift.c.title.toLowerCase()} (${shift.d} points better than on the ordinary day).` : `Your decisions slipped when ${shift.c.title.toLowerCase()} got hard (${Math.abs(shift.d)} points lower than on the ordinary day).`);
  const e = best((c) => feel(c, "enjoyment")); if (e) out.push(`You enjoyed ${e.c.title.toLowerCase()} most (${e.v}/5).`);
  const calm = best((c) => feel(c, "stress"), -1); if (calm) out.push(`${calm.c.title} felt the least stressful (${calm.v}/5).`);
  const d = best((c) => feel(c, "daily_interest")); if (d) out.push(`You could most see yourself doing ${d.c.title.toLowerCase()} day to day (${d.v}/5).`);
  if (q && e && q.c.id !== e.c.id) out.push(`Your results point in different directions: you did best as ${q.c.title.toLowerCase()}, and enjoyed ${e.c.title.toLowerCase()} most. Which matters more to you is your call.`);
  if (cs.some((c) => feel(c, "enjoyment") == null)) out.push("Some of your ratings are missing. Rate how each part felt, on its report, to complete this picture.");
  return out;
}

/** Career Comparison. The main view compares how YOU did and felt, once both parts (normal day and crisis) of a job are finished. */
export function CareerCompare({ api }: { api: SimsApi }) {
  const [data, setData] = useState<CareersView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<"perf" | "jobs">("perf");
  const [picked, setPicked] = useState<string[] | null>(null);
  const [jobPick, setJobPick] = useState<string[]>(["covid", "bhopal", "blackout"]);
  const [tab, setTab] = useState<JobTab>("overview");
  const load = useCallback(() => { setErr(null); api.careers().then(setData).catch((e: Error) => setErr(e.message)); }, [api]);
  useEffect(load, [load]);
  if (err) return <main className="hub-main"><div className="hub-panel hub-center"><h2>Could not load the comparison</h2><p>{err}</p><button type="button" className="hub-btn hub-btn--primary" onClick={load}>Try again</button></div></main>;
  if (!data) return <main className="hub-main"><p className="hub-loading" role="status"><span className="hub-spin" aria-hidden="true" /> Loading careers…</p></main>;
  const ready = data.careers.filter((c) => c.you.complete);
  const sel = (picked ?? ready.map((c) => c.id)).filter((id) => ready.some((c) => c.id === id));
  return (
    <main className="hub-main cc">
      <header className="hub-head"><div><p className="hub-eyebrow">Career Comparison</p><h1>{view === "perf" ? "How did you do in each job?" : "What is each job really like?"}</h1>
        <p className="hub-lede">{view === "perf" ? "Finish both parts of a job, a normal day and a crisis, then compare how you actually performed and felt. The choice is yours." : "A plain comparison of the jobs themselves: responsibilities, problems, pressure and skills."}</p></div>
        <div className="cc-views" role="tablist" aria-label="Comparison type">
          <button role="tab" type="button" aria-selected={view === "perf"} className={view === "perf" ? "on" : ""} onClick={() => setView("perf")}>How you did</button>
          <button role="tab" type="button" aria-selected={view === "jobs"} className={view === "jobs" ? "on" : ""} onClick={() => setView("jobs")}>About the jobs</button></div></header>

      {view === "perf" && (ready.length < 2
        ? <Progress careers={data.careers} />
        : <Performance data={data} ready={ready} sel={sel} setPicked={setPicked} api={api} reload={load} />)}
      {view === "jobs" && <Jobs data={data} pick={jobPick} setPick={setJobPick} tab={tab} setTab={setTab} />}
      <p className="cc-note" role="note">{data.note}</p>
    </main>
  );
}

/** Shown until at least two jobs have both parts finished: what is done and what to play next. */
function Progress({ careers }: { careers: Career[] }) {
  return (
    <section className="cc-gate" aria-label="Your progress toward a comparison">
      <p className="cc-gate-msg"><b>Finish both parts of at least two jobs to compare how you did.</b> You compare real results, so the comparison unlocks as you play.</p>
      <div className="cc-gate-grid">
        {careers.map((c) => {
          const w = c.you.phases.workday, k = c.you.phases.crisis;
          const next = !w ? { label: "Play the normal day", to: `#/workday/${c.id}` } : !k ? { label: "Play the crisis", to: crisisRoute(c.id) } : null;
          return (
            <div key={c.id} className="cc-card" style={{ borderTop: `5px solid ${COLORS[c.id]}` }}>
              <h3>{c.title}</h3><small>{c.field}</small>
              <ol className="cc-steps">
                <li className={w ? "done" : ""}><span>{w ? "✓" : "1"}</span>A normal day{w ? `: ${w.outcome}` : ""}</li>
                <li className={k ? "done" : ""}><span>{k ? "✓" : "2"}</span>The crisis{k ? `: ${k.outcome}` : ""}</li>
              </ol>
              {next ? <button type="button" className="hub-btn hub-btn--primary" onClick={() => go(next.to)}>{next.label}</button> : <p className="cc-ready">Both parts finished</p>}
            </div>);
        })}
      </div>
    </section>
  );
}

function Performance({ data, ready, sel, setPicked, api, reload }: { data: CareersView; ready: Career[]; sel: string[]; setPicked: (p: string[]) => void; api: SimsApi; reload: () => void }) {
  const shown = ready.filter((c) => sel.includes(c.id));
  const toggle = (id: string) => setPicked(sel.includes(id) ? (sel.length > 2 ? sel.filter((x) => x !== id) : sel) : [...sel, id]);
  const [pick, setPick] = useState<string>(data.choice?.career ?? "");
  const [why, setWhy] = useState(data.choice?.reason ?? "");
  const [saved, setSaved] = useState<CareerChoice | null>(data.choice);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const save = async (career: string) => {
    setBusy(true); setProblem(null);
    try { setSaved(await api.saveChoice(career, career ? why : "")); if (!career) { setPick(""); setWhy(""); } reload(); } catch (e) { setProblem((e as Error).message); } finally { setBusy(false); }
  };
  const notes = signals(shown);
  const titleOf = (id: string) => data.careers.find((c) => c.id === id)?.title ?? id;
  return (
    <div className="cc-perf">
      <div className="cc-main">
        <div className="cc-pick" role="group" aria-label="Careers to compare">
          {data.careers.map((c) => c.you.complete
            ? <button key={c.id} type="button" aria-pressed={sel.includes(c.id)} className={sel.includes(c.id) ? "on" : ""} style={{ ["--cc" as string]: COLORS[c.id] }} onClick={() => toggle(c.id)}><b>{c.title}</b></button>
            : <button key={c.id} type="button" className="locked" onClick={() => go(c.you.phases.workday ? crisisRoute(c.id) : `#/workday/${c.id}`)}><b>{c.title}</b><small>Finish both parts to compare</small></button>)}
        </div>
        <div className="cc-cols" style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}>
          {shown.map((c) => {
            const w = c.you.phases.workday!, k = c.you.phases.crisis!, col = COLORS[c.id];
            const sk = sortedSkills(c), delta = (k.quality ?? 0) - (w.quality ?? 0);
            return (
              <article key={c.id} className="cc-card cc-perfcard" aria-label={c.title} style={{ borderTop: `5px solid ${col}` }}>
                <h3>{c.title}</h3>
                <PhaseBlock title="Normal day" ph={w} color={col} nameOf={c.title} />
                <PhaseBlock title="Crisis" ph={k} color={col} nameOf={c.title} />
                <p className="cc-delta"><b>When it got hard:</b> {delta === 0 ? "your decision quality held steady" : delta > 0 ? `decisions improved by ${delta} points` : `decisions dropped by ${Math.abs(delta)} points`}.</p>
                {sk.length > 0 && <p className="cc-skl"><b>Strongest:</b> {sk.slice(0, 2).map(([id, v]) => `${data.skills[id]} ${v}%`).join(", ")}<br /><b>To grow:</b> {sk.slice(-1).map(([id, v]) => `${data.skills[id]} ${v}%`).join("")}</p>}
              </article>);
          })}
        </div>
      </div>
      <aside className="cc-side">
        <section className="cc-hl" aria-label="What your results show"><h4>What your results show</h4><ul>{notes.map((l) => <li key={l}>{l}</li>)}</ul></section>
        <section className="cc-choice" aria-label="Your choice">
          <h4>Which would you opt for?</h4>
          {saved && <p className="cc-saved" role="status">You said: <b>{titleOf(saved.career)}</b>{saved.reason ? ` — “${saved.reason}”` : ""}</p>}
          <div role="radiogroup" aria-label="Career you would opt for" className="cc-radios">
            {ready.map((c) => <label key={c.id} className={pick === c.id ? "on" : ""}><input type="radio" name="career" checked={pick === c.id} onChange={() => setPick(c.id)} /><span>{c.title}</span></label>)}
          </div>
          <label className="cc-why">Why? (optional)<input value={why} maxLength={600} onChange={(e) => setWhy(e.target.value)} placeholder="What decided it for you" /></label>
          <div className="cc-btns"><button type="button" className="hub-btn hub-btn--primary" disabled={!pick || busy} onClick={() => void save(pick)}>{saved ? "Update my choice" : "Save my choice"}</button>
            {saved && <button type="button" className="hub-btn" disabled={busy} onClick={() => void save("")}>Clear</button>}</div>
          {problem && <p role="alert" className="hub-err">{problem}</p>}
        </section>
      </aside>
    </div>
  );
}

/** The plain comparison of the jobs themselves. */
function Jobs({ data, pick, setPick, tab, setTab }: { data: CareersView; pick: string[]; setPick: (p: string[]) => void; tab: JobTab; setTab: (t: JobTab) => void }) {
  const shown = data.careers.filter((c) => pick.includes(c.id));
  const toggle = (id: string) => setPick(pick.includes(id) ? (pick.length > 2 ? pick.filter((x) => x !== id) : pick) : [...pick, id]);
  const cols = { gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` };
  const n = shown.length;
  return (<>
    <div className="cc-pick" role="group" aria-label="Jobs to compare">
      {data.careers.map((c) => <button key={c.id} type="button" aria-pressed={pick.includes(c.id)} className={pick.includes(c.id) ? "on" : ""} style={{ ["--cc" as string]: COLORS[c.id] }} onClick={() => toggle(c.id)}><b>{c.title}</b><small>{c.field}</small></button>)}
    </div>
    <nav className="cc-tabs" role="tablist" aria-label="What to compare">
      {JOB_TABS.map(([k, label]) => <button key={k} role="tab" type="button" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>)}
    </nav>
    <section className="cc-body" aria-live="polite">
      <div className="cc-cols" style={cols}>{shown.map((c) => <div key={c.id} className="cc-head" style={{ borderTopColor: COLORS[c.id] }}><b>{c.title}</b><small>{c.setting}</small></div>)}</div>
      {tab === "overview" && <div className="cc-cols" style={cols}>{shown.map((c) => (
        <div key={c.id} className="cc-card"><p className="cc-tag">{c.tagline}</p>
          <dl className="cc-dl"><dt>Pressure: ordinary day</dt><dd><Dots n={c.pressure.workday} color={COLORS[c.id]} /></dd><dt>Pressure: in a crisis</dt><dd><Dots n={c.pressure.crisis} color={COLORS[c.id]} /></dd></dl>
          <div className="cc-rc"><div><h4>Rewards</h4><ul>{c.rewards.map((x) => <li key={x}>{x}</li>)}</ul></div><div><h4>Costs</h4><ul>{c.costs.map((x) => <li key={x}>{x}</li>)}</ul></div></div></div>))}</div>}
      {tab === "daily" && <div className="cc-cols" style={cols}>{shown.map((c) => <div key={c.id} className="cc-card"><h4>On an ordinary day</h4><ul>{c.daily.workday.map((x) => <li key={x}>{x}</li>)}</ul><h4>In a crisis</h4><ul>{c.daily.crisis.map((x) => <li key={x}>{x}</li>)}</ul></div>)}</div>}
      {tab === "problems" && <div className="cc-cols" style={cols}>{shown.map((c) => <div key={c.id} className="cc-card"><h4>On an ordinary day</h4><ul>{c.problems.workday.map((x) => <li key={x}>{x}</li>)}</ul><h4>In a crisis</h4><ul>{c.problems.crisis.map((x) => <li key={x}>{x}</li>)}</ul></div>)}</div>}
      {tab === "decisions" && <div className="cc-cols" style={cols}>{shown.map((c) => (
        <div key={c.id} className="cc-card"><table className="cc-t"><thead><tr><th scope="col">Decisions are…</th><th scope="col">Day</th><th scope="col">Crisis</th></tr></thead><tbody>
          {([["tempo", "Fast"], ["information", "Well-informed"], ["stakes", "High-stakes"], ["reversibility", "Easy to undo"]] as const).map(([k, label]) => (
            <tr key={k}><th scope="row">{label}</th><td><Dots n={c.decisions[k][0]} color={COLORS[c.id]} /></td><td><Dots n={c.decisions[k][1]} color={COLORS[c.id]} /></td></tr>))}</tbody></table>
          <p><b>Ordinary day:</b> {c.decisions.text.workday}</p><p><b>Crisis:</b> {c.decisions.text.crisis}</p></div>))}</div>}
      {tab === "pressure" && <div className="cc-cols" style={cols}>{shown.map((c) => (
        <div key={c.id} className="cc-card"><div className="cc-gauges"><div><Dots n={c.pressure.workday} color={COLORS[c.id]} /><small>ordinary day</small></div><div><Dots n={c.pressure.crisis} color={COLORS[c.id]} /><small>in a crisis</small></div></div>
          <p>{c.pressure.text.workday}</p><p>{c.pressure.text.crisis}</p></div>))}</div>}
      {tab === "comms" && <div className="cc-cols" style={cols}>{shown.map((c) => (
        <div key={c.id} className="cc-card"><h4>You would work with</h4><ul>{c.communication.with.map((x) => <li key={x}>{x}</li>)}</ul><p>{c.communication.text.workday}</p><p>{c.communication.text.crisis}</p></div>))}</div>}
      {tab === "skills" && (
        <div className="cc-skills" role="table" aria-label="Skills required">
          <div className="cc-row cc-row--h" role="row" style={{ gridTemplateColumns: `150px repeat(${n}, minmax(0, 1fr))` }}><span role="columnheader">Skill</span>{shown.map((c) => <span key={c.id} role="columnheader">{SHORT[c.id]}<small> how much it is needed</small></span>)}</div>
          {Object.keys(data.skills).map((k) => (
            <div key={k} className="cc-row" role="row" style={{ gridTemplateColumns: `150px repeat(${n}, minmax(0, 1fr))` }}>
              <span role="rowheader">{data.skills[k]}</span>{shown.map((c) => <span key={c.id} role="cell" className="cc-cell"><Dots n={c.skills_required[k] ?? 0} color={COLORS[c.id]} /></span>)}
            </div>))}
        </div>)}
    </section>
  </>);
}
