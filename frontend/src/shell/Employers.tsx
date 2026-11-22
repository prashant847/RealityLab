import { useCallback, useEffect, useMemo, useState } from "react";
import type { Analytics, EmployerInfo, ShortlistItem, SimsApi } from "../api/sims";
import "../sims/proreport.css";

const KEY = "rl.employerToken";
const saved = (): string | null => { try { return localStorage.getItem(KEY); } catch { return null; } };
const keep = (t: string | null) => { try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch { /* not remembered */ } };
const SIM_NAMES: Record<string, string> = { bhopal: "Bhopal crisis", bhopal_workday: "Bhopal normal day", covid: "Hospital crisis", covid_workday: "Hospital normal day", circuit: "Circuit lab", surgery: "Surgery lab" };
const dateOf = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });

function SignIn({ api, onIn }: { api: SimsApi; onIn: (token: string, e: EmployerInfo) => void }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [org, setOrg] = useState("");
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setErr(null);
    try { const r = mode === "in" ? await api.employerLogin(email, pw) : await api.employerRegister(email, pw, org); onIn(r.token, r.employer); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <form className="emp-auth hub-panel" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="emp-tabs" role="tablist" aria-label="Account">
        <button type="button" role="tab" aria-selected={mode === "in"} className={mode === "in" ? "on" : ""} onClick={() => setMode("in")}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === "up"} className={mode === "up" ? "on" : ""} onClick={() => setMode("up")}>Create an account</button>
      </div>
      {mode === "up" && <><label htmlFor="emp-org">Organisation</label><input id="emp-org" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Acme Hiring" autoComplete="organization" /></>}
      <label htmlFor="emp-email">Work email</label><input id="emp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <label htmlFor="emp-pw">Password{mode === "up" ? " (at least 8 characters)" : ""}</label><input id="emp-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} />
      {err && <p className="hub-err" role="alert">{err}</p>}
      <button type="submit" className="hub-btn hub-btn--primary" disabled={busy || !email.trim() || !pw}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</button>
    </form>
  );
}

function Spread({ a }: { a: Analytics }) {
  const max = Math.max(1, ...a.distribution.map((d) => d.count));
  return (
    <div className="emp-spread">
      <p><b>{a.attempts}</b> finished attempt{a.attempts === 1 ? "" : "s"}{a.mean !== null && <> · average score <b>{a.mean}</b></>}</p>
      <div className="emp-bars" role="img" aria-label="How scores are spread">
        {a.distribution.map((d) => <div key={d.from} className="emp-bar"><i style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }} /><b>{d.count}</b><span>{d.from}–{d.to}</span></div>)}
      </div>
      {a.steps.length > 0 && <table className="pro-table"><thead><tr><th scope="col">Decision point</th><th scope="col">Strongest option chosen</th></tr></thead>
        <tbody>{a.steps.map((s) => <tr key={s.step}><th scope="row">{s.step}</th><td>{s.strong_rate}% of {s.total}</td></tr>)}</tbody></table>}
    </div>
  );
}

export function Employers({ api }: { api: SimsApi }) {
  const [token, setToken] = useState<string | null>(saved());
  const [who, setWho] = useState<EmployerInfo | null>(null);
  const [rows, setRows] = useState<ShortlistItem[] | null>(null);
  const [code, setCode] = useState(""); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [sim, setSim] = useState("all");
  const [stats, setStats] = useState<Analytics | null>(null);

  const out = useCallback(() => { keep(null); setToken(null); setWho(null); setRows(null); }, []);
  const load = useCallback(async (t: string) => {
    try { const [me, list] = await Promise.all([api.employerMe(t), api.shortlist(t)]); setWho(me); setRows(list); }
    catch (e) { if ((e as { status?: number }).status === 401) out(); else setErr((e as Error).message); }
  }, [api, out]);
  useEffect(() => { if (token) void load(token); }, [token, load]);

  const sims = useMemo(() => [...new Set((rows ?? []).map((r) => r.sim_id))], [rows]);
  const shown = useMemo(() => (rows ?? []).filter((r) => sim === "all" || r.sim_id === sim), [rows, sim]);
  const skills = useMemo(() => { const m = new Map<string, string>(); shown.forEach((r) => r.skills.forEach((s) => m.set(s.id, s.label))); return [...m]; }, [shown]);
  useEffect(() => { setStats(null); if (sim !== "all") api.analytics(sim).then(setStats).catch(() => undefined); }, [sim, api]);

  const add = async () => {
    if (!token) return; setBusy(true); setErr(null);
    try { await api.addCandidate(token, code.trim()); setCode(""); await load(token); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async (r: ShortlistItem) => { if (!token || !window.confirm(`Remove ${r.candidate} from your shortlist?`)) return; try { await api.removeCandidate(token, r.id); await load(token); } catch (e) { setErr((e as Error).message); } };
  const note = async (r: ShortlistItem, n: string) => { if (!token || n === r.note) return; try { await api.setCandidateNote(token, r.id, n); } catch (e) { setErr((e as Error).message); } };

  return (
    <main id="main" tabIndex={-1} className="hub-main emp">
      <header className="hub-head"><div><p className="hub-eyebrow">For employers and institutions</p><h1>Candidate shortlist</h1></div>
        {who && <div className="emp-who"><span>{who.org || who.email}</span><button type="button" className="hub-btn" onClick={() => { if (token) void api.employerLogout(token).catch(() => undefined); out(); }}>Sign out</button></div>}</header>

      {!token && <>
        <p className="hub-lede emp-lede">Candidates give you a report code. Add it here and RealityLab checks it is genuine, then ranks your candidates side by side on the same scenario.</p>
        <SignIn api={api} onIn={(t) => { keep(t); setToken(t); }} />
      </>}

      {token && <>
        <form className="ver-form hub-panel" onSubmit={(e) => { e.preventDefault(); void add(); }}>
          <label htmlFor="emp-code">Add a candidate by their report code</label>
          <div className="ver-row"><input id="emp-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="RL-0123abcd-4567ef89" autoComplete="off" spellCheck={false} />
            <button type="submit" className="hub-btn hub-btn--primary" disabled={busy || !code.trim()}>{busy ? "Checking…" : "Verify and add"}</button></div>
          {err && <p className="hub-err" role="alert">{err}</p>}
        </form>

        {rows && rows.length === 0 && <p className="hub-fine emp-empty">No candidates yet. A code only goes on the shortlist if it passes verification.</p>}
        {rows && rows.length > 0 && <section className="hub-panel emp-table" aria-label="Shortlist">
          <div className="emp-filter"><label htmlFor="emp-sim">Scenario</label>
            <select id="emp-sim" value={sim} onChange={(e) => setSim(e.target.value)}><option value="all">All scenarios</option>{sims.map((s) => <option key={s} value={s}>{SIM_NAMES[s] ?? s}</option>)}</select>
            {sim === "all" && sims.length > 1 && <span className="hub-fine">Scores are only comparable within one scenario.</span>}</div>
          <div className="emp-scroll"><table className="pro-table">
            <thead><tr><th scope="col">#</th><th scope="col">Candidate</th><th scope="col">Scenario</th><th scope="col">Score</th>{skills.map(([id, label]) => <th key={id} scope="col">{label}</th>)}<th scope="col">Note</th><th scope="col"><span className="sr-only">Remove</span></th></tr></thead>
            <tbody>{shown.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <th scope="row">{r.candidate}<small>{r.code} · {dateOf(r.added_at)}</small></th>
                <td>{SIM_NAMES[r.sim_id] ?? r.simulation}</td>
                <td><span className={`emp-score emp-score--${r.band}`}><b>{r.score}</b> {r.band_label}</span></td>
                {skills.map(([id]) => { const p = r.skills.find((x) => x.id === id)?.percent; return <td key={id}>{p === undefined ? "—" : <><div className="pro-bar" role="meter" aria-label={id} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p}><i className={p >= 65 ? "ok" : p >= 45 ? "mid" : "low"} style={{ width: `${p}%` }} /></div><small>{p}%</small></>}</td>; })}
                <td><input className="emp-note" defaultValue={r.note} aria-label={`Note about ${r.candidate}`} placeholder="Add a note" maxLength={400} onBlur={(e) => void note(r, e.target.value)} /></td>
                <td><button type="button" className="hub-btn hub-btn--danger" aria-label={`Remove ${r.candidate}`} onClick={() => void remove(r)}>Remove</button></td>
              </tr>))}</tbody>
          </table></div>
        </section>}

        {stats && <section className="hub-panel emp-stats" aria-label="Scenario benchmarks"><h2>How everyone scored on {SIM_NAMES[sim] ?? sim}</h2><Spread a={stats} /></section>}
      </>}
    </main>
  );
}
