import { useEffect, useState } from "react";
import type { ReflectionView, SimsApi } from "../api/sims";

const QUESTIONS = [
  { key: "enjoyment", label: "How much did you enjoy this?", low: "Not at all", high: "A lot" },
  { key: "stress", label: "How stressful did it feel?", low: "Calm", high: "Very tense" },
  { key: "daily_interest", label: "Could you see yourself doing this kind of work, day to day?", low: "No", high: "Yes" },
] as const;
type Key = (typeof QUESTIONS)[number]["key"];

/** Three quick 1–5 ratings (and an optional note) after a workday or crisis. They are what Career Comparison shows next to the facts of each job. */
export function ReflectionForm({ api, runId }: { api: SimsApi; runId: string }) {
  const [vals, setVals] = useState<Record<Key, number>>({ enjoyment: 0, stress: 0, daily_interest: 0 });
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<ReflectionView | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    api.reflection(runId).then((r) => { if (live && r) { setSaved(r); setVals({ enjoyment: r.enjoyment, stress: r.stress, daily_interest: r.daily_interest }); setNote(r.note); } }).catch(() => undefined);
    return () => { live = false; };
  }, [api, runId]);
  const ready = QUESTIONS.every((q) => vals[q.key] > 0);
  const save = async () => {
    setBusy(true); setErr(null);
    try { setSaved(await api.saveReflection(runId, { enjoyment: vals.enjoyment, stress: vals.stress, daily_interest: vals.daily_interest, note })); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <section className="refl" aria-labelledby="refl-h">
      <h2 id="refl-h">How did this feel?</h2>
      <p className="refl-lede">There are no right answers. Your ratings are kept on this computer and shown in Career Comparison, next to what you actually did.</p>
      {QUESTIONS.map((q) => (
        <div key={q.key} className="refl-q" role="radiogroup" aria-label={q.label}>
          <span className="refl-label">{q.label}</span>
          <span className="refl-scale"><small>{q.low}</small>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={vals[q.key] === n} className={vals[q.key] === n ? "on" : ""} onClick={() => setVals((v) => ({ ...v, [q.key]: n }))}>{n}</button>))}
            <small>{q.high}</small></span>
        </div>))}
      <label className="refl-note">Anything that stood out? (optional)<input value={note} maxLength={400} onChange={(e) => setNote(e.target.value)} placeholder="e.g. I liked talking to families more than the paperwork" /></label>
      <div className="refl-actions">
        <button type="button" className="sim-btn sim-btn--primary" disabled={!ready || busy} onClick={() => void save()}>{busy ? "Saving…" : saved ? "Update my answers" : "Save my answers"}</button>
        {saved && <span role="status" className="refl-ok">Saved. You can compare careers any time.</span>}
        {err && <span role="alert" className="refl-err">{err}</span>}
      </div>
    </section>
  );
}
