import { useCallback, useEffect, useRef, useState } from "react";
import type { GenJob, GeneratedItem, SimsApi } from "../api/sims";
import { setIntent } from "./intent";

const go = (h: string) => { window.location.hash = h; };
export const GEN_KEY = "rl.genJob";
const remember = (id: string | null) => { try { if (id) localStorage.setItem(GEN_KEY, id); else localStorage.removeItem(GEN_KEY); } catch { /* not remembered */ } };
const remembered = (): string | null => { try { return localStorage.getItem(GEN_KEY); } catch { return null; } };

const EXAMPLES: { kind: "technical" | "normal"; text: string }[] = [
  { kind: "technical", text: "A pilot's pre-flight checks on a small passenger plane, step by step." },
  { kind: "technical", text: "Setting up a home Wi-Fi network securely: router, passwords and updates." },
  { kind: "normal", text: "A new teacher's first week: a noisy class, a worried parent and a tight lesson plan." },
  { kind: "normal", text: "A paramedic on a busy Saturday night: who to treat first and how to talk to families." },
];

/** The picture on a generated simulation's card: a typographic block, since nothing was drawn for it. */
export function GenArt({ title, kind }: { title: string; kind: "technical" | "normal" }) {
  return <div className={`gen-art gen-art--${kind}`} aria-hidden="true"><span>{title.trim().charAt(0).toUpperCase()}</span><b>{kind === "technical" ? "Technical lab" : "Simulation"}</b></div>;
}

/** A card for a generated simulation on the home screen (normal ones) or the labs page (technical ones). */
/** Asks first, then deletes a generated simulation together with the progress and reports made in it. Resolves true when it was deleted. */
export async function deleteGeneratedSim(api: SimsApi, id: string, title: string): Promise<boolean> {
  if (!window.confirm(`Delete “${title}” and your progress in it? This cannot be undone.`)) return false;
  await api.deleteGenerated(id);
  return true;
}

export function GeneratedCard({ s, i = 0, onDelete }: { s: GeneratedItem; i?: number; onDelete?: () => void }) {
  const running = s.status === "active";
  const label = running ? "Continue or start new" : s.status === "none" ? "Start" : "Play again";
  return (
    <article className={`hub-card hub-card--gen hub-card--gen-${s.kind}`} aria-labelledby={`t-${s.id}`} style={{ ["--i" as string]: i }}>
      <div className="hub-art"><GenArt title={s.title} kind={s.kind} />
        <span className="hub-badge">Generated</span>{s.status !== "none" && <span className={`hub-badge hub-badge--${s.status} hub-badge--second`}>{s.status === "active" ? "In progress" : s.status === "completed" ? "Done" : "Stopped"}</span>}</div>
      <div className="hub-card-body">
        <div className="hub-card-info">
          <p className="hub-domain">{s.domain.split("·")[0]}</p>
          <h2 id={`t-${s.id}`}>{s.title}</h2>
          <p className="hub-tag">{s.tagline}</p>
          <p className="hub-meta" title={s.role}><span>⏱ About {s.minutes} minutes · {s.steps} steps</span></p>
          {s.progress && <div className="hub-progress"><div className="hub-bar" role="progressbar" aria-label={`${s.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.percent ?? 0}><span style={{ width: `${s.percent ?? 0}%` }} /></div><span>{s.progress}</span></div>}
        </div>
        <div className="hub-actions">
          <button type="button" className="hub-btn hub-btn--primary" onClick={() => { if (running) setIntent("continue"); go(`#/gen/${s.id}`); }}>{label}</button>
          {s.run_id && !running && <button type="button" className="hub-btn" onClick={() => go(`#/report/${s.run_id}`)}>View report</button>}
          {onDelete && <button type="button" className="hub-btn hub-btn--danger" aria-label={`Delete ${s.title}`} onClick={onDelete}>Delete</button>}
        </div>
      </div>
    </article>
  );
}

/** Wherever the player is, say so when a simulation they asked for has been written (or could not be). */
export function useGenerationWatcher(api: SimsApi): void {
  useEffect(() => {
    const id = window.setInterval(async () => {
      const key = remembered();
      if (!key) return;
      try {
        const { jobs } = await api.generationJobs();
        const j = jobs.find((x) => x.id === key);
        if (!j || j.status === "running") return;
        remember(null);
        const where = j.status === "done" ? ` Find it under ${j.kind === "technical" ? "Technical labs" : "Simulations"}, or open Generate.` : "";
        window.dispatchEvent(new CustomEvent("rl:toast", { detail: `${j.message}${where}` }));
      } catch { /* try again next time */ }
    }, 4000);
    return () => window.clearInterval(id);
  }, [api]);
}

export function Generate({ api }: { api: SimsApi }) {
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<"technical" | "normal">("technical");
  const [job, setJob] = useState<GenJob | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [list, setList] = useState<GeneratedItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const stop = useRef(false);

  const loadList = useCallback(() => { api.generated().then(setList).catch(() => setList([])); }, [api]);
  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => {
    stop.current = false;
    const tick = async () => {
      try {
        const { enabled: ok, jobs } = await api.generationJobs();
        if (stop.current) return;
        setEnabled(ok);
        const mine = remembered();
        const j = jobs.find((x) => x.id === mine) ?? jobs.find((x) => x.status === "running") ?? null;
        setJob((prev) => (j ?? prev));
        if (j && j.status !== "running") { loadList(); }
      } catch { /* the service may be starting */ }
    };
    void tick();
    const id = window.setInterval(() => { if (job === null || job.status === "running") void tick(); }, 3000);
    return () => { stop.current = true; window.clearInterval(id); };
  }, [api, job?.status, loadList]);                       // eslint-disable-line react-hooks/exhaustive-deps

  const running = job?.status === "running";
  const valid = prompt.trim().length >= 12 && prompt.trim().length <= 1500;
  const submit = async () => {
    setErr(null); setBusy(true);
    try { const j = await api.generate(prompt.trim(), kind); remember(j.id); setJob(j); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  const del = async (s: GeneratedItem) => {
    try { if (await deleteGeneratedSim(api, s.id, s.title)) loadList(); } catch (e) { setErr((e as Error).message); }
  };

  return (
    <main id="main" tabIndex={-1} className="hub-main gen">
      <header className="hub-head">
        <div><p className="hub-eyebrow">Make your own</p><h1>Generate a simulation</h1></div>
      </header>
      {!enabled && <p className="hub-err" role="alert">The Claude CLI is not available on this computer, so simulations cannot be written. Install it and sign in, then reopen the app.</p>}
      <section className="gen-form hub-panel" aria-label="New simulation">
        <label htmlFor="gen-prompt">What should the simulation be about?</label>
        <textarea id="gen-prompt" rows={4} maxLength={1500} value={prompt} disabled={running} placeholder="For example: A nurse's first night shift on a children's ward, handling a worried parent and a medication mix-up."
          onChange={(e) => setPrompt(e.target.value)} />
        <p className="gen-count">{prompt.trim().length}/1500 · at least 12 characters</p>
        <fieldset className="gen-kind" disabled={running}>
          <legend>What kind of simulation?</legend>
          <label className={kind === "technical" ? "on" : ""}><input type="radio" name="gk" checked={kind === "technical"} onChange={() => setKind("technical")} /><span><b>Technical lab</b><small>A hands-on job. One option works at each step; the others fail for a technical reason. It appears in Technical labs.</small></span></label>
          <label className={kind === "normal" ? "on" : ""}><input type="radio" name="gk" checked={kind === "normal"} onChange={() => setKind("normal")} /><span><b>Normal simulation</b><small>Judgement calls with trade-offs and indicators that move. It appears in Simulations.</small></span></label>
        </fieldset>
        <div className="gen-examples"><span>Try one:</span>{EXAMPLES.map((x) => <button key={x.text} type="button" className="ghost small" disabled={running} onClick={() => { setPrompt(x.text); setKind(x.kind); }}>{x.text.slice(0, 46)}…</button>)}</div>
        <div className="gen-actions"><button type="button" className="hub-btn hub-btn--primary" disabled={!valid || running || busy || !enabled} onClick={() => void submit()}>{running ? "Writing…" : busy ? "Sending…" : "Generate it"}</button></div>
        {err && <p className="hub-err" role="alert">{err}</p>}
      </section>

      {job && (
        <section className={`gen-job gen-job--${job.status}`} role="status" aria-live="polite">
          {running && <><div className="gen-bar" aria-hidden="true"><i /></div><p><b>Writing your simulation…</b> {job.message} You can leave this page: you will be told here, and anywhere else in the app, when it is ready.</p></>}
          {job.status === "done" && <><p><b>Done.</b> {job.message}</p><div className="gen-actions"><button type="button" className="hub-btn hub-btn--primary" onClick={() => go(`#/gen/${job.sim_id}`)}>Play it now</button>
            <button type="button" className="hub-btn" onClick={() => go(job.kind === "technical" ? "#/labs" : "#/")}>{job.kind === "technical" ? "See it in Technical labs" : "See it in Simulations"}</button></div></>}
          {job.status === "failed" && <p><b>It was not made.</b> {job.message}</p>}
        </section>)}

      <section className="gen-list" aria-label="Your generated simulations">
        <h2>Your generated simulations</h2>
        {list && list.length === 0 && <p className="hub-fine">None yet. Describe one above.</p>}
        <ul>
          {list?.map((s) => (
            <li key={s.id}><div><b>{s.title}</b><small>{s.kind === "technical" ? "Technical lab" : "Normal simulation"} · {s.steps} steps · {s.status === "none" ? "not played" : s.progress}</small></div>
              <div className="gen-row-acts"><button type="button" className="hub-btn hub-btn--primary" onClick={() => go(`#/gen/${s.id}`)}>Play</button><button type="button" className="hub-btn" onClick={() => void del(s)}>Delete</button></div></li>))}
        </ul>
      </section>
    </main>
  );
}
