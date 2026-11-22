import { useEffect, useState } from "react";
import type { SimsApi, VerifyResult } from "../api/sims";
import { assess } from "../sims/assessment";
import "../sims/proreport.css";

const dateOf = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: "long" });

/** Anyone holding a report code can check here that the report is genuine and has not been changed. */
export function Verify({ api, initial }: { api: SimsApi; initial: string }) {
  const [code, setCode] = useState(initial);
  const [res, setRes] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const check = async (c: string) => {
    const t = c.trim();
    if (!t) return;
    setBusy(true); setErr(null);
    try { setRes(await api.verifyReport(t)); } catch (e) { setErr((e as Error).message); setRes(null); } finally { setBusy(false); }
  };
  useEffect(() => { if (initial) void check(initial); }, []);        // eslint-disable-line react-hooks/exhaustive-deps

  const a = res && res.valid ? assess(res.report) : null;
  return (
    <main id="main" tabIndex={-1} className="hub-main ver">
      <header className="hub-head"><div><p className="hub-eyebrow">For employers and institutions</p><h1>Verify a report</h1></div></header>
      <form className="ver-form hub-panel" onSubmit={(e) => { e.preventDefault(); void check(code); }}>
        <label htmlFor="ver-code">Report code</label>
        <div className="ver-row">
          <input id="ver-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="RL-0123abcd-4567ef89" autoComplete="off" spellCheck={false} />
          <button type="submit" className="hub-btn hub-btn--primary" disabled={busy || !code.trim()}>{busy ? "Checking…" : "Check"}</button>
        </div>
        <p className="hub-fine">The code is printed in the Verification box at the end of every sealed report. Each report was signed when its owner sealed it, so any edit to it is detected.</p>
      </form>
      {err && <p className="hub-err" role="alert">{err}</p>}
      {res && !res.valid && <section className="ver-result ver-result--bad hub-panel" role="status"><h2>Not verified</h2><p>{res.reason}</p></section>}
      {res && res.valid && a && (
        <section className="ver-result ver-result--ok hub-panel" role="status">
          <div className="ver-badge"><span aria-hidden="true">✓</span><div><h2>Genuine report</h2><p>Signed by this RealityLab server on {dateOf(res.issued_at)} and unchanged since.</p></div></div>
          <dl className="pro-id">
            <div><dt>Candidate</dt><dd>{res.candidate}</dd></div>
            <div><dt>Simulation</dt><dd>{res.report.simulation}</dd></div>
            <div><dt>Role simulated</dt><dd>{res.report.role}</dd></div>
            <div><dt>Date completed</dt><dd>{res.report.completed_at ? dateOf(res.report.completed_at) : "—"}</dd></div>
            <div><dt>Report code</dt><dd>{res.code}</dd></div>
          </dl>
          <div className="ver-score">
            <div className={`pro-score pro-score--${a.band}`}><strong>{a.score}</strong><span>out of 100</span><em>{a.bandLabel}</em></div>
            <div><p>{a.indication}</p><p className="pro-fine">{res.report.summary.decisions} decision{res.report.summary.decisions === 1 ? "" : "s"}: {res.report.summary.strong} strongest option, {res.report.summary.mixed} acceptable, {res.report.summary.weak} weak.</p></div>
          </div>
          {res.report.skills.length > 0 && <table className="pro-table"><thead><tr><th scope="col">Competency</th><th scope="col">Rating</th></tr></thead>
            <tbody>{res.report.skills.map((x) => <tr key={x.id}><th scope="row">{x.label}</th><td>{x.level} · {x.percent}%</td></tr>)}</tbody></table>}
          <p className="pro-fine">A valid code proves the report is the one the candidate's copy of RealityLab produced and that nothing in it was edited. It does not prove who played, and a simulation is one piece of evidence, not a qualification.</p>
        </section>)}
    </main>
  );
}
