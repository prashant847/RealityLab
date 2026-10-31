import { useCallback, useEffect, useState } from "react";
import App from "../App";
import { simsApi, type Journey, type LibraryItem, type Profile, type SimsApi } from "../api/sims";
import { SimPlayer } from "../sims/Player";
import { Preview } from "../sims/Previews";
import { ReportView } from "../sims/Report";
import "./shell.css";

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

export function Shell({ api = simsApi }: { api?: SimsApi }) {
  const hash = useHash();
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => { api.profile().then((p) => { setProfile(p); applyProfile(p); }).catch(() => setProfile({ name: "", large_text: false, reduce_motion: false })); }, [api]);

  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  useEffect(() => {
    const names: Record<string, string> = { blackout: "BLACKOUT", bhopal: "Bhopal", covid: "COVID-era Hospital" };
    const page = parts[0] === "sim" ? names[parts[1] ?? ""] : parts[0] === "report" ? "Career experience report" : parts[0] === "journey" ? "My journey" : parts[0] === "settings" ? "Settings" : "";
    document.title = page ? `${page} — RealityLab AI` : "RealityLab AI";
  }, [hash]);   // eslint-disable-line react-hooks/exhaustive-deps
  const dev = ["gallery", "preview-notpetya", "char-export"].includes(parts[0] ?? "");
  if (dev) return <App />;
  if (parts[0] === "sim" && parts[1] === "blackout") return (
    <>
      <nav className="back-bar" aria-label="Application"><button type="button" onClick={() => go("#/")}>← All simulations</button><span>RealityLab AI</span></nav>
      <App />
    </>);
  if (parts[0] === "sim" && parts[1]) return <SimPlayer key={parts[1]} api={api} simId={parts[1]} onHome={() => go("#/")} onReport={(id) => go(`#/report/${id}`)} />;
  if (parts[0] === "report" && parts[1]) return <ReportView api={api} runId={parts[1]} onHome={() => go("#/")} onOpen={(s) => go(`#/sim/${s}`)} />;

  const tab = parts[0] === "journey" ? "journey" : parts[0] === "settings" ? "settings" : "home";
  return (
    <div className="hub">
      <header className="hub-top">
        <div className="hub-brand"><span className="hub-mark" aria-hidden="true">R</span><div><strong>RealityLab AI</strong><small>{TAGLINE}</small></div></div>
        <nav aria-label="Main" className="hub-nav">
          {([["home", "Simulations", "#/"], ["journey", "My journey", "#/journey"], ["settings", "Settings", "#/settings"]] as const).map(([k, label, h]) => (
            <a key={k} href={h} aria-current={tab === k ? "page" : undefined} className={tab === k ? "on" : ""}>{label}</a>))}
        </nav>
      </header>
      {tab === "home" && <Library api={api} name={profile?.name ?? ""} />}
      {tab === "journey" && <JourneyView api={api} />}
      {tab === "settings" && profile && <Settings api={api} profile={profile} onChange={(p) => { setProfile(p); applyProfile(p); }} />}
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

function Library({ api, name }: { api: SimsApi; name: string }) {
  const { data, err, reload } = useLoad(useCallback(() => api.library(), [api]));
  if (err) return <main className="hub-main"><div className="hub-card hub-center"><h2>Could not load your simulations</h2><p>{err}</p><button type="button" className="hub-btn" onClick={reload}>Try again</button></div></main>;
  if (!data) return <main className="hub-main"><p className="hub-loading" role="status">Loading your simulations…</p></main>;
  return (
    <main className="hub-main">
      <h1>{name ? `Welcome back, ${name}.` : "Choose a world to step into."}</h1>
      <p className="hub-lede">Each simulation puts you in a real profession’s hardest moments. Make decisions, see the consequences and review what they showed about your skills.</p>
      <div className="hub-grid">{data.map((s) => <SimCard key={s.id} s={s} />)}</div>
    </main>
  );
}

function SimCard({ s }: { s: LibraryItem }) {
  const verb = s.status === "active" ? "Continue" : s.status === "completed" ? "Play again" : "Start";
  return (
    <article className={`hub-card sim-card-${s.id}`} aria-labelledby={`t-${s.id}`}>
      <Preview id={s.id} />
      <div className="hub-card-body">
        <p className="hub-domain">{s.domain}</p>
        <h2 id={`t-${s.id}`}>{s.title}</h2>
        <p>{s.tagline}</p>
        <p className="hub-meta"><b>Role:</b> {s.role}<br /><b>About</b> {s.minutes} minutes</p>
        <details><summary>What you will practise</summary><p>{s.description}</p><ul>{s.objectives.map((o) => <li key={o}>{o}</li>)}</ul></details>
        {s.progress && <div className="hub-progress"><div className="hub-bar" role="progressbar" aria-label={`${s.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.percent ?? 0}><span style={{ width: `${s.percent ?? 0}%` }} /></div><span>{s.progress}{s.completed > 0 && s.status === "active" ? ` · completed ${s.completed}×` : ""}</span></div>}
        <div className="hub-actions">
          <button type="button" className="hub-btn hub-btn--primary" onClick={() => go(`#/sim/${s.id}`)}>{verb}</button>
          {s.status === "completed" && s.id !== "blackout" && s.run_id && <button type="button" className="hub-btn" onClick={() => go(`#/report/${s.run_id}`)}>View report</button>}
        </div>
      </div>
    </article>
  );
}

function JourneyView({ api }: { api: SimsApi }) {
  const { data, err, reload } = useLoad<Journey>(useCallback(() => api.journey(), [api]));
  if (err) return <main className="hub-main"><div className="hub-card hub-center"><p>{err}</p><button type="button" className="hub-btn" onClick={reload}>Try again</button></div></main>;
  if (!data) return <main className="hub-main"><p className="hub-loading" role="status">Loading your journey…</p></main>;
  return (
    <main className="hub-main">
      <h1>My journey</h1>
      {data.completed.length === 0 ? (
        <div className="hub-card hub-center"><h2>Nothing completed yet</h2><p>Finish a simulation and its career experience report will appear here.</p><button type="button" className="hub-btn hub-btn--primary" onClick={() => go("#/")}>Choose a simulation</button></div>
      ) : (<>
        {data.skills.length > 0 && <section className="hub-card" aria-labelledby="sk-h"><h2 id="sk-h">Skills across your reports</h2>
          <p className="hub-fine">Average of the skill results in your Bhopal and hospital reports. It describes your choices, not your suitability for a profession.</p>
          {data.skills.map((s) => <div key={s.label} className="hub-skill"><div><span>{s.label}</span><b>{s.percent}%</b></div><div className="hub-bar"><span style={{ width: `${s.percent}%` }} /></div></div>)}</section>}
        <section className="hub-card" aria-labelledby="done-h"><h2 id="done-h">Completed simulations</h2>
          <ul className="hub-list">{data.completed.map((c) => (
            <li key={`${c.kind}-${c.run_id}`}><div><b>{c.title}</b><span>Attempt {c.attempt} · {c.outcome} · {c.decisions} decisions{c.completed_at ? ` · ${new Date(c.completed_at).toLocaleDateString()}` : ""}</span></div>
              <button type="button" className="hub-btn" onClick={() => go(c.kind === "report" ? `#/report/${c.run_id}` : "#/sim/blackout")}>{c.kind === "report" ? "Open report" : "Open BLACKOUT"}</button></li>))}</ul></section>
      </>)}
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
    <main className="hub-main hub-narrow">
      <h1>Settings</h1>
      <section className="hub-card" aria-labelledby="pf-h"><h2 id="pf-h">Your profile</h2>
        <form onSubmit={(e) => { e.preventDefault(); void save({ name }); }}>
          <label>Your name (shown on the home screen)<input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>
          <button type="submit" className="hub-btn hub-btn--primary">Save name</button>
          {saved && <span role="status" className="hub-ok"> Saved</span>}
        </form></section>
      <section className="hub-card" aria-labelledby="ac-h"><h2 id="ac-h">Accessibility</h2>
        <label className="hub-check"><input type="checkbox" checked={profile.large_text} onChange={(e) => void save({ large_text: e.target.checked })} /> Larger text</label>
        <label className="hub-check"><input type="checkbox" checked={profile.reduce_motion} onChange={(e) => void save({ reduce_motion: e.target.checked })} /> Reduce motion and animation</label></section>
      <section className="hub-card" aria-labelledby="ab-h"><h2 id="ab-h">About RealityLab AI</h2>
        <p>{TAGLINE} Your progress, decisions and reports are saved on this computer only, and nothing is sent anywhere.</p>
        <p>BLACKOUT follows the documented 2017 NotPetya attack, with scenes labelled as documented, reconstructed or simulation. The Bhopal simulation treats a real tragedy with care and separates the record from a fictional exercise. The hospital simulation is fictional and educational, not medical training.</p></section>
      {err && <p role="alert" className="hub-err">{err}</p>}
    </main>
  );
}
