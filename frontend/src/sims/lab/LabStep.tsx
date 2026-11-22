import { useEffect, useMemo, useState } from "react";
import type { Outcome, RunView, Step } from "../../api/sims";
import { NarratorStick } from "../../comic/stick/NarratorStick";
import { ReadAloud } from "../../a11y/speak";
import { MeterBar } from "../Meter";
import "./lab.css";

/**
 * The technical-work simulations (the circuit and the operation) in the crisis layout: one detailed comic picture of the work in the stage, the narrator
 * (bottom left) describing the situation and asking what you want to do, and the options in the rail. One option works; the others fail for a technical reason.
 * All the words come from the step; nothing here decides an outcome.
 */
export const isLabStep = (id: string): boolean => /^l[cs]\d$/.test(id);
/** A run that uses this layout: the drawn labs, and every simulation the player had written (which has no picture, so the step is shown on a plain card). */
export const isLabView = (v: RunView): boolean => { const id = v.scene.step?.id ?? ""; return isLabStep(id) || (id.startsWith("gen_") && !v.scene.step?.comic); };
export type LabMode = "lab" | "normal";
const picture = (id: string) => `${import.meta.env.BASE_URL}assets/scene/lab/${id}.webp`;

interface Pg { id: string; zoom: number; fx: number; fy: number; head?: string; lines: string[]; narrate: string }

function pagesFor(step: Step): Pg[] {
  const out: Pg[] = [{ id: "scene", zoom: 1, fx: 50, fy: 50, head: `${step.clock} · ${step.title}`, lines: [step.brief], narrate: step.brief }];
  step.facts.slice(0, 2).forEach((f, i) => out.push({ id: `fact${i}`, zoom: 1.5, fx: i === 0 ? 30 : 70, fy: i === 0 ? 40 : 55, head: i === 0 ? "What you know" : "Also", lines: [f], narrate: f }));
  out.push({ id: "question", zoom: 1.2, fx: 50, fy: 50, head: "Your decision", lines: [], narrate: step.question });
  return out;
}

/** The picture, with the camera drifting to a detail on each page. Children (the narrator, the stamp) stay put on top. */
function LabFrame({ id, zoom, fx, fy, mood, card, children }: { id: string; zoom: number; fx: number; fy: number; mood?: "ok" | "fail"; card?: { title: string; clock: string }; children?: React.ReactNode }) {
  const drawn = isLabStep(id);
  return (
    <div className={`lab-frame${mood ? ` lab-frame--${mood}` : ""}`} data-lab={id}>
      {drawn ? (
        <div className="lab-world" style={{ transform: `scale(${zoom})`, transformOrigin: `${fx}% ${fy}%` }}>
          <img className="lab-bg" src={picture(id)} alt="" draggable={false} decoding="async" />
        </div>
      ) : (
        <div className="lab-plain" aria-hidden="true"><i>{card?.clock}</i><b>{card?.title}</b></div>
      )}
      {mood === "fail" && <div className="lab-fx" aria-hidden="true"><i className="lab-smoke lab-smoke--a" /><i className="lab-smoke lab-smoke--b" /><i className="lab-smoke lab-smoke--c" /></div>}
      {mood && <div className={`lab-stamp lab-stamp--${mood}`} aria-hidden="true">{mood === "ok" ? "Works" : "Failed"}</div>}
      {children}
    </div>
  );
}

function Stage({ id, pages, mood, card }: { id: string; pages: Pg[]; mood?: "ok" | "fail"; card?: { title: string; clock: string } }) {
  const [i, setI] = useState(0);
  const at = Math.min(i, pages.length - 1);
  const p = pages[at];
  const go = (d: number) => setI((n) => Math.max(0, Math.min(pages.length - 1, n + d)));
  useEffect(() => { setI(0); }, [id]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT"))) return;
      if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });
  return (
    <section className="comic-page comic-page--art comic-page--paged" aria-label="The comic" data-layout="lab">
      <div className="paged-stage">
        <div className="wd-box" role="group" aria-roledescription="comic page" aria-label={`Page ${at + 1} of ${pages.length}. ${p.narrate}`}>
          {(p.head || p.lines.length > 0) && (
            <div className="wd-band"><div key={`c${p.id}`} className={`wd-cap${p.lines.length > 1 ? " wd-cap--facts" : ""}`} style={{ maxWidth: "100%" }}>
              {p.head && <b>{p.head}</b>}{p.lines.map((l, k) => <span key={k}>{l}</span>)}</div></div>)}
          <LabFrame id={id} zoom={p.zoom} fx={p.fx} fy={p.fy} mood={mood} card={card}>
            <NarratorStick key={`n${p.id}`} text={p.narrate} delay={900} />
          </LabFrame>
        </div>
      </div>
      <nav className="pager" aria-label="Comic panels">
        <button type="button" onClick={() => go(-1)} disabled={at === 0} aria-label="Previous panel">‹ Back</button>
        <span className="pager-dots" role="group" aria-label={`Panel ${at + 1} of ${pages.length}`}>
          {pages.map((q, k) => <button key={q.id} type="button" className={k === at ? "on" : ""} aria-label={`Panel ${k + 1}`} aria-current={k === at ? "true" : undefined} onClick={() => setI(k)} />)}
        </span>
        <button type="button" className={at < pages.length - 1 ? "next" : ""} onClick={() => go(1)} disabled={at === pages.length - 1} aria-label="Next panel">Next ›</button>
      </nav>
    </section>
  );
}

type Tab = "decide" | "story" | "status";
const TABS: [Tab, string][] = [["decide", "Decide"], ["story", "Situation"], ["status", "Status"]];

export function LabStep({ view, picked, busy, onPick, onConfirm, mode = "lab" }: { view: RunView; picked: string | null; busy: boolean; onPick: (id: string) => void; onConfirm: () => void; mode?: LabMode }) {
  const scene = view.scene;
  const step = scene.step!;
  const pages = useMemo(() => pagesFor(step), [step]);
  const [tab, setTab] = useState<Tab>("decide");
  useEffect(() => { setTab("decide"); }, [step.id, view.run.id]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT"))) return;
      const i = "12345678".indexOf(e.key);
      if (e.key.length === 1 && i >= 0 && step.choices[i]?.available && !busy) { setTab("decide"); onPick(step.choices[i].id); }
      else if (e.key === "Enter" && picked && !busy && !(t && (t.tagName === "BUTTON" || t.tagName === "A"))) { e.preventDefault(); onConfirm(); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });
  return (
    <div className="bo-scene wd-scene lab-scene">
      <main className="bo-stage">
        <div className="bo-title"><p className="kicker">{step.clock}</p><h1>{step.title}</h1></div>
        <Stage id={step.id} pages={pages} card={{ title: step.title, clock: step.clock }} />
      </main>
      <aside className="bo-rail" aria-label="Decision, situation and status">
        <div className="bo-tabs" role="tablist" aria-label="Panels">
          {TABS.map(([k, label]) => <button key={k} role="tab" type="button" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>)}
        </div>
        <div className="bo-tabpanel" role="tabpanel">
          {tab === "decide" && (<>
            <p className="bo-job"><b>Your job:</b> {step.question}</p>
            {mode === "lab" && <p className="lab-warn">One option works. The others fail for a technical reason, and a failure stops the job.</p>}
            <div className="decisions">
              <div role="radiogroup" aria-label="Available decisions" className="decision-list">
                {step.choices.map((c, i) => (
                  <button key={c.id} type="button" role="radio" aria-checked={picked === c.id} className={`decision${picked === c.id ? " is-selected" : ""}`} disabled={busy} onClick={() => onPick(c.id)}>
                    <span className="decision-key" aria-hidden="true">{i + 1}</span>
                    <span className="decision-body"><strong>{c.label}</strong></span>
                  </button>))}
              </div>
              <button type="button" className="commit" disabled={!picked || busy} onClick={onConfirm}>{busy ? "Applying…" : picked ? "Commit decision" : "Select an option"}</button>
            </div>
          </>)}
          {tab === "story" && (<>
            <p className="lede-sm">{step.brief}</p>
            <ul className="scene-info">{step.facts.map((f, i) => <li key={i}>{f}</li>)}</ul>
            <ReadAloud text={() => [step.brief, ...step.facts, step.question].join(". ")} />
          </>)}
          {tab === "status" && <section className="sim-meters sm-grid" aria-label="Indicators">{scene.meters.map((m) => <MeterBar key={m.id} m={m} />)}</section>}
        </div>
      </aside>
    </div>
  );
}

/** After the decision. The picture stays on the work: a green stamp if it worked, a red one with smoke if it failed, and what would have worked. */
export function LabOutcome({ outcome, prev, view, onNext, onRetry, mode = "lab" }: { outcome: Outcome; prev: RunView; view: RunView; onNext: () => void; onRetry: () => void; mode?: LabMode }) {
  const step = prev.scene.step!;
  const lab = mode === "lab";
  const failed = lab && outcome.rating !== "strong";
  const right = step.choices.find((c) => c.id.endsWith("_strong"));
  const labels = Object.fromEntries(view.scene.meters.map((m) => [m.id, m]));
  const pages: Pg[] = useMemo(() => [
    { id: "result", zoom: failed ? 1.35 : 1.15, fx: 50, fy: 55, head: failed ? "What went wrong" : "What happened", lines: [outcome.consequence], narrate: outcome.consequence },
    ...(outcome.lesson ? [{ id: "lesson", zoom: 1.5, fx: 35, fy: 45, head: "The lesson", lines: [outcome.lesson], narrate: outcome.lesson } as Pg] : []),
  ], [outcome, failed]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => { const t = e.target as HTMLElement | null; if (e.key === "Enter" && !(t && (t.tagName === "BUTTON" || t.tagName === "A" || t.tagName === "INPUT"))) { e.preventDefault(); onNext(); } };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [onNext]);
  return (
    <div className="bo-scene wd-scene lab-scene">
      <main className="bo-stage">
        <div className="bo-title"><p className="kicker">{step.clock} · Result</p><h1>{lab ? (failed ? "It failed" : "It works") : "What happened next"}</h1></div>
        <Stage id={step.id} pages={pages} mood={lab ? (failed ? "fail" : "ok") : undefined} card={{ title: step.title, clock: step.clock }} />
      </main>
      <aside className="bo-rail" aria-label="Result">
        <div className="bo-tabpanel" role="region">
          <p className={`wd-rate wd-rate--${lab ? (failed ? "weak" : "strong") : outcome.rating}`}>{lab ? (failed ? "Technical failure" : "Correct step") : { strong: "Strong decision", mixed: "Mixed decision", weak: "Weak decision" }[outcome.rating]}</p>
          <p className="bo-job"><b>You chose:</b> {outcome.label}</p>
          <p className="lede-sm">{outcome.consequence}</p>
          {failed && right && lab && <p className="lab-right"><b>What would have worked:</b> {right.label}</p>}
          {Object.keys(outcome.changes).length > 0 && (
            <ul className="wd-changes" aria-label="What changed">
              {Object.entries(outcome.changes).map(([k, [a, b]]) => { const better = labels[k]?.good === "low" ? b < a : b > a; return <li key={k} className={better ? "up" : "down"}>{better ? "▲" : "▼"} {labels[k]?.label ?? k}: {a} → {b}</li>; })}
            </ul>)}
          {outcome.lesson && <p className="wd-lesson"><b>Lesson:</b> {outcome.lesson}</p>}
          <ReadAloud text={() => `${outcome.consequence} ${outcome.lesson ? `Lesson: ${outcome.lesson}` : ""}`} />
          <button type="button" className="commit" onClick={onNext}>{outcome.completed ? (failed ? "See what went wrong" : lab ? "See your report" : "See your report") : "Next step"}</button>
          {failed && <button type="button" className="ghost lab-retry" onClick={onRetry}>Try again from step 1</button>}
        </div>
      </aside>
    </div>
  );
}
