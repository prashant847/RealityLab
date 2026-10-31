import { useCallback, useEffect, useState, type ReactNode } from "react";
import App from "../App";
import { simsApi, type Journey, type LibraryItem, type Profile, type SimsApi } from "../api/sims";
import { PathPage } from "../sims/Phases";
import { SimPlayer } from "../sims/Player";
import { CareerCompare } from "./CareerCompare";
import { Preview } from "../sims/Previews";
import { Radar } from "../sims/Radar";
import { ReportView } from "../sims/Report";
import "./shell.css";
import "./bo.css";

export const TAGLINE = "Experience your future before you choose it.";
const go = (h: string) => { window.location.hash = h; };

const useHash = () => {
  const [h, setH] = useState(window.location.hash);
  useEffect(() => { const on = () => setH(window.location.hash); window.addEventListener("hashchange", on); return () => window.removeEventListener("hashchange", on); }, []);
  return h;
};

/** Applies the saved accessibility settings to the whole window. */
export function applyProfile(p: Profile) {
  document.documentElement.dataset.largeText = String(p.large_text);
  document.documentElement.dataset.reduceMotion = String(p.reduce_motion);
}

const ICONS: Record<string, ReactNode> = {
  home: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z" />,
  journey: <path d="M5 19V9m7 10V5m7 14v-7" strokeLinecap="round" />,
  compare: <path d="M4 6h7M4 12h7M4 18h7M15 6l5 6-5 6" strokeLinecap="round" strokeLinejoin="round" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1M7.7 16.3l-2.1 2.1" strokeLinecap="round" /></>,
};
const Icon = ({ name }: { name: string }) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">{ICONS[name]}</svg>;

export function Shell({ api = simsApi }: { api?: SimsApi }) {
  const hash = useHash();
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => { api.profile().then((p) => { setProfile(p); applyProfile(p); }).catch(() => setProfile({ name: "", large_text: false, reduce_motion: false })); }, [api]);

  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const dev = ["gallery", "preview-notpetya", "char-export"].includes(parts[0] ?? "");
  const blackout = parts[0] === "play" && parts[1] === "blackout";            // the comic crisis; everything else is a themed screen
  // Every screen of the app except the developer galleries fits the window without page scrolling (long lists scroll inside their own panel).
  useEffect(() => { document.body.classList.toggle("fit", !dev); }, [dev]);
  useEffect(() => {
    const names: Record<string, string> = { blackout: "BLACKOUT", bhopal: "Bhopal", covid: "COVID-era Hospital" };
    const name = names[parts[1] ?? ""];
    const page = ["sim", "play", "crisis"].includes(parts[0] ?? "") ? name : parts[0] === "workday" ? name && `${name}: a normal day`
      : parts[0] === "report" ? "Career experience report" : parts[0] === "journey" ? "My journey" : parts[0] === "compare" ? "Compare careers" : parts[0] === "settings" ? "Settings" : "";
    document.title = page ? `${page} — RealityLab AI` : "RealityLab AI";
  }, [hash]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (dev) return <App />;
  if (blackout) return (
    <div className="bo-root">
      <nav className="back-bar" aria-label="Application"><button type="button" onClick={() => go("#/")}>← All simulations</button><span>RealityLab AI</span></nav>
      <App />
    </div>);
  const prof = (["blackout", "bhopal", "covid"] as const).find((x) => x === parts[1]);
  if (parts[0] === "sim" && prof) return <PathPage key={prof} api={api} profession={prof} onHome={() => go("#/")} />;
  if (parts[0] === "workday" && prof) return <SimPlayer key={`${prof}_workday`} api={api} simId={`${prof}_workday`} onHome={() => go("#/")} onReport={(id) => go(`#/report/${id}`)} />;
  if (parts[0] === "crisis" && (prof === "bhopal" || prof === "covid")) return <SimPlayer key={prof} api={api} simId={prof} onHome={() => go("#/")} onReport={(id) => go(`#/report/${id}`)} />;
  if (parts[0] === "report" && parts[1]) return <ReportView api={api} runId={parts[1]} onHome={() => go("#/")} onOpen={(sim, to) => go(to === "crisis" ? (sim === "blackout" ? "#/play/blackout" : `#/crisis/${sim}`) : `#/sim/${sim}`)} />;

  const tab = parts[0] === "journey" ? "journey" : parts[0] === "compare" ? "compare" : parts[0] === "settings" ? "settings" : "home";
  return (
    <div className="hub">
      <aside className="hub-side">
        <div className="hub-brand"><span className="hub-mark" aria-hidden="true">R</span><div><strong>RealityLab AI</strong><small>Career simulations</small></div></div>
        <nav aria-label="Main" className="hub-nav">
          {([["home", "Simulations", "#/"], ["compare", "Compare careers", "#/compare"], ["journey", "My journey", "#/journey"], ["settings", "Settings", "#/settings"]] as const).map(([k, label, h]) => (
            <a key={k} href={h} aria-current={tab === k ? "page" : undefined} className={tab === k ? "on" : ""}><Icon name={k} />{label}</a>))}
        </nav>
        <div className="hub-foot"><span className="hub-avatar" aria-hidden="true">{(profile?.name || "You").slice(0, 1).toUpperCase()}</span>
          <div><strong>{profile?.name || "Student"}</strong><small>Saved on this computer</small></div></div>
      </aside>
      <div className="hub-body">
        {tab === "home" && <Library api={api} name={profile?.name ?? ""} />}
        {tab === "compare" && <CareerCompare api={api} />}
        {tab === "journey" && <JourneyView api={api} />}
        {tab === "settings" && profile && <Settings api={api} profile={profile} onChange={(p) => { setProfile(p); applyProfile(p); }} />}
      </div>
    </div>
  );
}

function useLoad<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => { setErr(null); fn().then(setData).catch((e: Error) => setErr(e.message)); }, [fn]);
  useEffect(load, [load]);
  return { data, err, reload: load };
}

const Loading = ({ what }: { what: string }) => <main className="hub-main"><p className="hub-loading" role="status"><span className="hub-spin" aria-hidden="true" /> {what}</p></main>;

function Library({ api, name }: { api: SimsApi; name: string }) {
  const { data, err, reload } = useLoad(useCallback(() => api.library(), [api]));
  if (err) return <main className="hub-main"><div className="hub-panel hub-center"><h2>Could not load your simulations</h2><p>{err}</p><button type="button" className="hub-btn hub-btn--primary" onClick={reload}>Try again</button></div></main>;
  if (!data) return <Loading what="Loading your simulations…" />;
  const done = data.filter((s) => s.status === "completed").length;
  return (
    <main className="hub-main">
      <header className="hub-head">
        <div><p className="hub-eyebrow">{TAGLINE}</p><h1>{name ? `Welcome back, ${name}.` : "Choose a world to step into."}</h1>
          <p className="hub-lede">Real moments from demanding professions. Decide, see the consequences, and review what your choices showed.</p></div>
        <div className="hub-stats" aria-label="Your progress"><div><strong>{done}/3</strong><span>completed</span></div><div><strong>{data.filter((s) => s.status === "active").length}</strong><span>in progress</span></div></div>
      </header>
      <div className="hub-grid">{data.map((s) => <SimCard key={s.id} s={s} />)}</div>
    </main>
  );
}

/** The next sensible step for a profession: workday first, then the interval, then the crisis. */
function nextStep(s: LibraryItem): { label: string; to: string } {
  const wd = s.workday?.status ?? "none";
  if (s.status === "active") return { label: "Continue the crisis", to: s.id === "blackout" ? "#/play/blackout" : `#/crisis/${s.id}` };
  if (wd === "active") return { label: "Continue the day", to: `#/workday/${s.id}` };
  if (wd === "none" && s.status === "none") return { label: "Start with a normal day", to: `#/workday/${s.id}` };
  if (wd === "completed" && s.status === "none") return { label: "Begin the crisis", to: s.id === "blackout" ? "#/play/blackout" : `#/crisis/${s.id}` };
  return { label: "Play again", to: `#/sim/${s.id}` };
}

function SimCard({ s }: { s: LibraryItem }) {
  const [info, setInfo] = useState(false);
  const next = nextStep(s);
  const wd = s.workday;
  return (
    <article className={`hub-card hub-card--${s.id}`} aria-labelledby={`t-${s.id}`}>
      <div className="hub-art"><Preview id={s.id} />
        {s.status !== "none" && <span className={`hub-badge hub-badge--${s.status}`}>{s.status === "active" ? "In progress" : "Completed"}</span>}
        <button type="button" className="hub-info" aria-expanded={info} aria-label={`What you will practise in ${s.title}`} onClick={() => setInfo(!info)}>{info ? "×" : "i"}</button>
        {info && <div className="hub-overlay" onClick={() => setInfo(false)}><h3>What you will practise</h3><ul>{s.objectives.map((o) => <li key={o}>{o}</li>)}</ul></div>}
      </div>
      <div className="hub-card-body">
        <p className="hub-domain">{s.domain.split("·")[0]}</p>
        <h2 id={`t-${s.id}`}>{s.title}</h2>
        <p className="hub-tag">{s.tagline}</p>
        <p className="hub-meta" title={s.role}><span>⏱ {(wd?.minutes ?? 0) + s.minutes} min in two parts</span><span className="hub-role">{s.role}</span></p>
        <ul className="hub-goals" aria-label="What you will practise">{s.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
        <a className="hub-phases" href={`#/sim/${s.id}`} aria-label={`Your path through ${s.title}`}>
          <span className={`hp hp--${wd?.status ?? "none"}`}><i>1</i>A normal day</span><b aria-hidden="true">→</b>
          <span className={`hp hp--${s.status}`}><i>2</i>The crisis</span></a>
        {s.progress && <div className="hub-progress"><div className="hub-bar" role="progressbar" aria-label={`${s.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.percent ?? 0}><span style={{ width: `${s.percent ?? 0}%` }} /></div><span>{s.progress}{s.completed > 0 && s.status === "active" ? ` · completed ${s.completed}×` : ""}</span></div>}
        <div className="hub-actions">
          <button type="button" className="hub-btn hub-btn--primary" onClick={() => { if (s.id === "blackout" && s.status === "completed") { try { localStorage.removeItem("realitylab.simulationId"); } catch { /* ignore */ } } go(next.to); }}>{next.label}</button>
          {s.status === "completed" && s.id !== "blackout" && s.run_id && <button type="button" className="hub-btn" onClick={() => go(`#/report/${s.run_id}`)}>View report</button>}
        </div>
      </div>
    </article>
  );
}

function JourneyView({ api }: { api: SimsApi }) {
  const { data, err, reload } = useLoad<Journey>(useCallback(() => api.journey(), [api]));
  if (err) return <main className="hub-main"><div className="hub-panel hub-center"><p>{err}</p><button type="button" className="hub-btn hub-btn--primary" onClick={reload}>Try again</button></div></main>;
  if (!data) return <Loading what="Loading your journey…" />;
  return (
    <main className="hub-main">
      <header className="hub-head"><div><p className="hub-eyebrow">Your progress</p><h1>My journey</h1></div><button type="button" className="hub-btn hub-btn--primary" onClick={() => go("#/compare")}>Compare careers</button></header>
      {data.completed.length === 0 ? (
        <div className="hub-panel hub-center"><h2>Nothing completed yet</h2><p>Finish a simulation and its career experience report will appear here.</p><button type="button" className="hub-btn hub-btn--primary" onClick={() => go("#/")}>Choose a simulation</button></div>
      ) : (
        <div className="hub-journey">
          {data.skills.length > 0 && <section className="hub-panel" aria-labelledby="sk-h"><h2 id="sk-h">Skills across your reports</h2>
            <div className="hub-skills"><Radar items={data.skills} size={230} />
              <div>{data.skills.map((s) => <div key={s.label} className="hub-skill"><div><span>{s.label}</span><b>{s.percent}%</b></div><div className="hub-bar"><span style={{ width: `${s.percent}%` }} /></div></div>)}</div></div>
            <p className="hub-fine">Average of the skill results in your Bhopal and hospital reports. It describes your choices, not your suitability for a profession.</p></section>}
          <section className="hub-panel hub-listpanel" aria-labelledby="done-h"><h2 id="done-h">Completed simulations</h2>
            <ul className="hub-list">{data.completed.map((c) => (
              <li key={`${c.kind}-${c.run_id}`}><div><b>{c.title}</b><span>Attempt {c.attempt} · {c.outcome} · {c.decisions} decisions{c.completed_at ? ` · ${new Date(c.completed_at).toLocaleDateString()}` : ""}</span></div>
                <button type="button" className="hub-btn" onClick={() => go(c.kind === "report" ? `#/report/${c.run_id}` : "#/play/blackout")}>{c.kind === "report" ? "Open report" : "Open BLACKOUT"}</button></li>))}</ul></section>
        </div>)}
    </main>
  );
}

function Settings({ api, profile, onChange }: { api: SimsApi; profile: Profile; onChange: (p: Profile) => void }) {
  const [name, setName] = useState(profile.name);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async (patch: Partial<Profile>) => {
    setErr(null);
    try { onChange(await api.saveProfile(patch)); setSaved(true); setTimeout(() => setSaved(false), 1800); } catch (e) { setErr((e as Error).message); }
  };
  return (
    <main className="hub-main">
      <header className="hub-head"><div><p className="hub-eyebrow">Make it yours</p><h1>Settings</h1></div></header>
      <div className="hub-settings">
        <section className="hub-panel" aria-labelledby="pf-h"><h2 id="pf-h">Your profile</h2>
          <form onSubmit={(e) => { e.preventDefault(); void save({ name }); }}>
            <label>Your name (shown on the home screen)<input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>
            <button type="submit" className="hub-btn hub-btn--primary">Save name</button>
            {saved && <span role="status" className="hub-ok"> Saved</span>}
          </form></section>
        <section className="hub-panel" aria-labelledby="ac-h"><h2 id="ac-h">Accessibility</h2>
          <label className="hub-check"><input type="checkbox" checked={profile.large_text} onChange={(e) => void save({ large_text: e.target.checked })} /> Larger text</label>
          <label className="hub-check"><input type="checkbox" checked={profile.reduce_motion} onChange={(e) => void save({ reduce_motion: e.target.checked })} /> Reduce motion and animation</label></section>
        <section className="hub-panel hub-about" aria-labelledby="ab-h"><h2 id="ab-h">About RealityLab AI</h2>
          <p>{TAGLINE} Your progress, decisions and reports are saved on this computer only, and nothing is sent anywhere.</p>
          <p>BLACKOUT follows the documented 2017 NotPetya attack, with scenes labelled as documented, reconstructed or simulation. The Bhopal simulation treats a real tragedy with care and separates the record from a fictional exercise. The hospital simulation is fictional and educational, not medical training.</p></section>
      </div>
      {err && <p role="alert" className="hub-err">{err}</p>}
    </main>
  );
}
