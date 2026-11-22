import { useEffect, useState } from "react";
import type { LabItem, SimsApi } from "../api/sims";
import { setIntent } from "./intent";
import { GenArt, deleteGeneratedSim } from "./Generate";

const go = (h: string) => { window.location.hash = h; };
const ART: Record<string, string> = { circuit: "lc7", surgery: "ls4" };
const ALT: Record<string, string> = { circuit: "Comic panel: a breadboard circuit with a glowing red LED", surgery: "Comic panel: a surgeon at work in an operating theatre" };

/** The technical-work simulations: hands-on jobs where one correct option leads to success and the others fail for a technical reason. */
export function Labs({ api }: { api: SimsApi }) {
  const [labs, setLabs] = useState<LabItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => api.labs().then((x) => setLabs(x.filter((s) => !s.generated))).catch((e: Error) => setErr(e.message));
  useEffect(() => { void load(); }, [api]);   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <main id="main" tabIndex={-1} className="hub-main">
      <header className="hub-head">
        <div><p className="hub-eyebrow">Hands-on work</p><h1>Technical labs</h1>
          <p className="hub-lede">Do the job step by step. A narrator describes the situation and asks what you want to do. One option works at each step; the others fail for a technical reason.</p></div>
      </header>
      {err && <p className="hub-err" role="alert">{err}</p>}
      {!labs && !err && <p className="hub-loading" role="status">Loading the labs…</p>}
      <div className="hub-grid hub-grid--labs">
        {labs?.map((s, i) => {
          const running = s.status === "active";
          const label = running ? "Continue or start new" : s.status === "none" ? "Start" : "Try again";
          return (
            <article key={s.id} className={`hub-card hub-card--${s.id}${s.generated ? " hub-card--gen hub-card--gen-technical" : ""}`} aria-labelledby={`t-${s.id}`} style={{ ["--i" as string]: i }}>
              <div className="hub-art">{s.generated ? <GenArt title={s.title} kind="technical" /> : <img className="pv" src={`${import.meta.env.BASE_URL}assets/scene/lab/${ART[s.id]}.webp`} alt={ALT[s.id]} draggable={false} />}
                {s.generated && <span className="hub-badge">Generated</span>}{s.status !== "none" && <span className={`hub-badge hub-badge--${s.status} ${s.generated ? "hub-badge--second" : ""}`}>{s.status === "active" ? "In progress" : s.status === "completed" ? "Built" : "Failed"}</span>}</div>
              <div className="hub-card-body">
                <div className="hub-card-info">
                  <p className="hub-domain">{s.domain.split("·")[0]}</p>
                  <h2 id={`t-${s.id}`}>{s.title}</h2>
                  <p className="hub-tag">{s.tagline}</p>
                  <p className="hub-meta" title={s.role}><span>⏱ About {s.minutes} minutes · {s.steps} steps</span></p>
                  {s.progress && <div className="hub-progress"><div className="hub-bar" role="progressbar" aria-label={`${s.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.percent ?? 0}><span style={{ width: `${s.percent ?? 0}%` }} /></div>
                    <span>{s.progress}{s.attempts > 0 ? ` · ${s.completed} of ${s.attempts} attempts succeeded` : ""}</span></div>}
                </div>
                <div className="hub-actions">
                  <button type="button" className="hub-btn hub-btn--primary" onClick={() => { if (running) setIntent("continue"); go(s.generated ? `#/gen/${s.id}` : `#/lab/${s.id}`); }}>{label}</button>
                  {s.run_id && !running && <button type="button" className="hub-btn" onClick={() => go(`#/report/${s.run_id}`)}>View report</button>}
                  {s.generated && <button type="button" className="hub-btn hub-btn--danger" aria-label={`Delete ${s.title}`} onClick={() => { deleteGeneratedSim(api, s.id, s.title).then((d) => { if (d) void load(); }).catch((e: Error) => setErr(e.message)); }}>Delete</button>}
                </div>
              </div>
            </article>);
        })}
      </div>
    </main>
  );
}
