import { useCallback, useEffect, useState } from "react";
import type { CareersView, Career } from "../api/sims";
import type { SimsApi } from "../api/sims";

const go = (h: string) => { window.location.hash = h; };
const TABS = [["overview", "At a glance"], ["stood", "What stood out"], ["daily", "Daily responsibilities"], ["problems", "Types of problems"], ["decisions", "Decision-making"], ["pressure", "Workplace pressure"], ["comms", "Communication and teamwork"], ["skills", "Skills required"]] as const;
type Tab = (typeof TABS)[number][0];
const COLORS: Record<string, string> = { blackout: "#c4511a", bhopal: "#a8481f", covid: "#1f8aa0" };
const SHORT: Record<string, string> = { blackout: "Operations & incident response", bhopal: "Process safety", covid: "Hospital doctor" };

function Dots({ n, color }: { n: number; color: string }) {
  return <span className="cc-dots" role="img" aria-label={`${n} out of 5`}>{[1, 2, 3, 4, 5].map((i) => <i key={i} style={{ background: i <= n ? color : undefined }} className={i <= n ? "on" : ""} />)}</span>;
}
function Bar({ pct, color, label }: { pct: number; color: string; label: string }) {
  return <span className="cc-bar" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><i style={{ width: `${pct}%`, background: color }} /></span>;
}
const ref = (c: Career, phase: "workday" | "crisis") => c.you.phases[phase]?.reflection ?? null;
const tried = (c: Career) => Boolean(c.you.phases.workday || c.you.phases.crisis);

function YouStrip({ c }: { c: Career }) {
  const w = c.you.phases.workday, k = c.you.phases.crisis;
  if (!w && !k) return <p className="cc-you cc-you--none">You have not tried this yet. <button type="button" className="cc-link" onClick={() => go(`#/workday/${c.id}`)}>Try the ordinary day (about 15 minutes)</button></p>;
  return (
    <p className="cc-you"><b>What you experienced:</b>{" "}
      {w ? `an ordinary day with ${w.decisions} decisions (${w.strong} strong, ${w.mixed} mixed, ${w.weak} weak)` : "no ordinary day yet"}
      {k ? `; the crisis: ${k.outcome}, ${k.strong} strong, ${k.mixed} mixed, ${k.weak} weak` : "; no crisis yet"}.</p>
  );
}

/** Career Comparison: what each job is like, on an ordinary day and in a crisis, set beside what the student actually did and felt. */
export function CareerCompare({ api }: { api: SimsApi }) {
  const [data, setData] = useState<CareersView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>(["covid", "bhopal", "blackout"]);
  const [tab, setTab] = useState<Tab>("overview");
  const load = useCallback(() => { setErr(null); api.careers().then(setData).catch((e: Error) => setErr(e.message)); }, [api]);
  useEffect(load, [load]);
  if (err) return <main className="hub-main"><div className="hub-panel hub-center"><h2>Could not load the comparison</h2><p>{err}</p><button type="button" className="hub-btn hub-btn--primary" onClick={load}>Try again</button></div></main>;
  if (!data) return <main className="hub-main"><p className="hub-loading" role="status"><span className="hub-spin" aria-hidden="true" /> Loading careers…</p></main>;
  const shown = data.careers.filter((c) => picked.includes(c.id));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? (p.length > 2 ? p.filter((x) => x !== id) : p) : [...p, id]));
  const cols = { gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` };
  const n = shown.length;
  return (
    <main className="hub-main cc">
      <header className="hub-head"><div><p className="hub-eyebrow">Career Comparison</p><h1>What is each job really like?</h1>
        <p className="hub-lede">Compare ordinary days, crises and the skills each job asks for, beside what you experienced and how it felt.</p></div></header>
      <div className="cc-pick" role="group" aria-label="Careers to compare">
        {data.careers.map((c) => (
          <button key={c.id} type="button" aria-pressed={picked.includes(c.id)} className={picked.includes(c.id) ? "on" : ""} style={{ ["--cc" as string]: COLORS[c.id] }} onClick={() => toggle(c.id)}>
            <b>{c.title}</b><small>{c.field}{tried(c) ? " · you tried it" : ""}</small></button>))}
      </div>
      <nav className="cc-tabs" role="tablist" aria-label="What to compare">
        {TABS.map(([k, label]) => <button key={k} role="tab" type="button" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>)}
      </nav>
      <section className="cc-body" aria-live="polite">
        <div className="cc-cols" style={cols}>
          {shown.map((c) => <div key={c.id} className="cc-head" style={{ borderTopColor: COLORS[c.id] }}><b>{c.title}</b><small>{c.setting}</small></div>)}
        </div>

        {tab === "overview" && (<>
          <div className="cc-cols" style={cols}>{shown.map((c) => (
            <div key={c.id} className="cc-card">
              <p className="cc-tag">{c.tagline}</p>
              <dl className="cc-dl">
                <dt>Pressure: ordinary day</dt><dd><Dots n={c.pressure.workday} color={COLORS[c.id]} /></dd>
                <dt>Pressure: in a crisis</dt><dd><Dots n={c.pressure.crisis} color={COLORS[c.id]} /></dd>
                <dt>You enjoyed it</dt><dd>{ref(c, "workday") ? <Dots n={ref(c, "workday")!.enjoyment} color={COLORS[c.id]} /> : <small>not rated</small>}</dd>
                <dt>It felt stressful</dt><dd>{ref(c, "workday") ? <Dots n={ref(c, "workday")!.stress} color={COLORS[c.id]} /> : <small>not rated</small>}</dd>
                <dt>Could do it day to day</dt><dd>{ref(c, "workday") ? <Dots n={ref(c, "workday")!.daily_interest} color={COLORS[c.id]} /> : <small>not rated</small>}</dd>
              </dl>
              <YouStrip c={c} />
              <div className="cc-rc"><div><h4>Rewards</h4><ul>{c.rewards.map((x) => <li key={x}>{x}</li>)}</ul></div><div><h4>Costs</h4><ul>{c.costs.map((x) => <li key={x}>{x}</li>)}</ul></div></div>
            </div>))}</div>
        </>)}

        {tab === "stood" && <Highlights careers={shown} />}

        {tab === "daily" && <div className="cc-cols" style={cols}>{shown.map((c) => (
          <div key={c.id} className="cc-card"><h4>On an ordinary day</h4><ul>{c.daily.workday.map((x) => <li key={x}>{x}</li>)}</ul><h4>In a crisis</h4><ul>{c.daily.crisis.map((x) => <li key={x}>{x}</li>)}</ul><YouStrip c={c} /></div>))}</div>}

        {tab === "problems" && <div className="cc-cols" style={cols}>{shown.map((c) => (
          <div key={c.id} className="cc-card"><h4>On an ordinary day</h4><ul>{c.problems.workday.map((x) => <li key={x}>{x}</li>)}</ul><h4>In a crisis</h4><ul>{c.problems.crisis.map((x) => <li key={x}>{x}</li>)}</ul></div>))}</div>}

        {tab === "decisions" && <div className="cc-cols" style={cols}>{shown.map((c) => (
          <div key={c.id} className="cc-card">
            <table className="cc-t"><thead><tr><th scope="col">Decisions are…</th><th scope="col">Day</th><th scope="col">Crisis</th></tr></thead><tbody>
              {([["tempo", "Fast"], ["information", "Well-informed"], ["stakes", "High-stakes"], ["reversibility", "Easy to undo"]] as const).map(([k, label]) => (
                <tr key={k}><th scope="row">{label}</th><td><Dots n={c.decisions[k][0]} color={COLORS[c.id]} /></td><td><Dots n={c.decisions[k][1]} color={COLORS[c.id]} /></td></tr>))}</tbody></table>
            <p><b>Ordinary day:</b> {c.decisions.text.workday}</p><p><b>Crisis:</b> {c.decisions.text.crisis}</p><YouStrip c={c} />
          </div>))}</div>}

        {tab === "pressure" && <div className="cc-cols" style={cols}>{shown.map((c) => (
          <div key={c.id} className="cc-card">
            <div className="cc-gauges"><div><Dots n={c.pressure.workday} color={COLORS[c.id]} /><small>ordinary day</small></div><div><Dots n={c.pressure.crisis} color={COLORS[c.id]} /><small>in a crisis</small></div></div>
            <p>{c.pressure.text.workday}</p><p>{c.pressure.text.crisis}</p>
            {ref(c, "workday") || ref(c, "crisis") ? <p className="cc-you"><b>How it felt to you:</b> stress {ref(c, "workday") ? `${ref(c, "workday")!.stress}/5 on the day` : "not rated for the day"}{ref(c, "crisis") ? `, ${ref(c, "crisis")!.stress}/5 in the crisis` : ""}.</p> : <p className="cc-you cc-you--none">Rate how it felt on the report page to see it here.</p>}
          </div>))}</div>}

        {tab === "comms" && <div className="cc-cols" style={cols}>{shown.map((c) => (
          <div key={c.id} className="cc-card"><h4>You would work with</h4><ul>{c.communication.with.map((x) => <li key={x}>{x}</li>)}</ul>
            <p>{c.communication.text.workday}</p><p>{c.communication.text.crisis}</p>
            <p className="cc-you"><b>Your results:</b> {["communication", "teamwork"].map((k) => `${data.skills[k]} ${c.you.skills[k] != null ? c.you.skills[k] + "%" : "not yet tested"}`).join(" · ")}</p></div>))}</div>}

        {tab === "skills" && (
          <div className="cc-skills" role="table" aria-label="Skills required and shown">
            <div className="cc-row cc-row--h" role="row" style={{ gridTemplateColumns: `150px repeat(${n}, minmax(0, 1fr))` }}><span role="columnheader">Skill</span>{shown.map((c) => <span key={c.id} role="columnheader">{SHORT[c.id]}<small> needs · you showed</small></span>)}</div>
            {Object.keys(data.skills).map((k) => (
              <div key={k} className="cc-row" role="row" style={{ gridTemplateColumns: `150px repeat(${n}, minmax(0, 1fr))` }}>
                <span role="rowheader">{data.skills[k]}</span>
                {shown.map((c) => <span key={c.id} role="cell" className="cc-cell"><Dots n={c.skills_required[k] ?? 0} color={COLORS[c.id]} />{c.you.skills[k] != null ? <><Bar pct={c.you.skills[k]} color={COLORS[c.id]} label={`${data.skills[k]} shown in ${c.title}`} /><b>{c.you.skills[k]}%</b></> : <small>not tested</small>}</span>)}
              </div>))}
          </div>)}
      </section>
      <p className="cc-note" role="note">{data.note}</p>
    </main>
  );
}

function Highlights({ careers }: { careers: Career[] }) {
  const lines: string[] = [];
  const by = (f: (c: Career) => number) => [...careers].sort((a, b) => f(b) - f(a));
  const crisis = by((c) => c.pressure.crisis);
  if (crisis[0].pressure.crisis > crisis[crisis.length - 1].pressure.crisis) lines.push(`Highest pressure in a crisis: ${crisis[0].title} (${crisis[0].pressure.crisis}/5).`);
  const gap = by((c) => c.pressure.crisis - c.pressure.workday)[0];
  lines.push(`Biggest jump from an ordinary day to a crisis: ${gap.title} (${gap.pressure.workday}/5 → ${gap.pressure.crisis}/5).`);
  const rated = careers.filter((c) => ref(c, "workday"));
  if (rated.length >= 2) {
    const e = [...rated].sort((a, b) => ref(b, "workday")!.enjoyment - ref(a, "workday")!.enjoyment)[0];
    const d = [...rated].sort((a, b) => ref(b, "workday")!.daily_interest - ref(a, "workday")!.daily_interest)[0];
    lines.push(`You enjoyed the ordinary day most as: ${e.title} (${ref(e, "workday")!.enjoyment}/5). You could most see yourself doing it day to day as: ${d.title} (${ref(d, "workday")!.daily_interest}/5).`);
  } else lines.push("Rate how the ordinary days felt (on each report) to see which you enjoyed most.");
  for (const c of careers) {
    const best = Object.entries(c.you.skills).sort((a, b) => b[1] - a[1])[0];
    if (best) lines.push(`In ${c.title.toLowerCase()}, your strongest skill was ${best[0].replace(/_/g, " ")} (${best[1]}%).`);
  }
  const untried = careers.filter((c) => !tried(c)).map((c) => c.title);
  if (untried.length) lines.push(`Not tried yet: ${untried.join(", ")}. Comparing is most useful when you have felt each one.`);
  return <section className="cc-hl" aria-label="What stood out"><h4>What stood out</h4><ul>{lines.map((l) => <li key={l}>{l}</li>)}</ul></section>;
}
