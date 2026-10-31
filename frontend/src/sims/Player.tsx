import { useCallback, useEffect, useState } from "react";
import type { Intro, Outcome, RunView, SimsApi } from "../api/sims";
import { BhopalStage } from "./BhopalStage";
import { CovidStage } from "./CovidStage";
import "./sims.css";

const KIND_LABEL = { documented: "Documented record", hypothetical: "Fictional exercise", simulation: "Simulation" } as const;

type Phase =
  | { k: "loading" } | { k: "error"; message: string }
  | { k: "intro"; intro: Intro; current: RunView | null }
  | { k: "step"; view: RunView; picked: string | null; busy: boolean }
  | { k: "outcome"; view: RunView; outcome: Outcome; prev: RunView };

export function SimPlayer({ api, simId, onHome, onReport }: { api: SimsApi; simId: string; onHome: () => void; onReport: (runId: string) => void }) {
  const [phase, setPhase] = useState<Phase>({ k: "loading" });
  const [fail, setFail] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPhase({ k: "loading" });
    try {
      const [intro, current] = await Promise.all([api.intro(simId), api.current(simId)]);
      setPhase({ k: "intro", intro, current });
    } catch (e) { setPhase({ k: "error", message: (e as Error).message }); }
  }, [api, simId]);
  useEffect(() => { void load(); }, [load]);

  const act = async (fn: () => Promise<void>) => { setFail(null); try { await fn(); } catch (e) { setFail((e as Error).message); setPhase((p) => p.k === "step" ? { ...p, busy: false } : p); } };
  const begin = (fresh: boolean, cur: RunView | null) => act(async () => {
    const view = fresh || !cur ? await api.start(simId) : cur;
    setPhase({ k: "step", view, picked: null, busy: false });
  });
  const confirm = (view: RunView, choice: string) => act(async () => {
    setPhase({ k: "step", view, picked: choice, busy: true });
    const { outcome, view: next } = await api.decide(view.run.id, choice);
    setPhase({ k: "outcome", view: next, outcome, prev: view });
  });

  const theme = simId === "covid" ? "covid" : "bhopal";
  const title = phase.k === "intro" ? phase.intro.title : phase.k === "step" || phase.k === "outcome" ? phase.view.scenario.title : "";
  const scene = phase.k === "step" || phase.k === "outcome" ? phase.view.scene : null;
  return (
    <div className={`sim sim--${theme}`}>
      <header className="sim-top">
        <button type="button" className="sim-btn sim-btn--ghost" onClick={onHome}>← All simulations</button>
        <strong className="sim-name">{title}</strong>
        <span className="sim-spacer" />
        {scene && phase.k !== "loading" && <span className="sim-pill" aria-label="Progress">{scene.status === "completed" ? "Finished" : `Step ${scene.round} of ${scene.total_rounds}`}</span>}
        {scene && <span className="sim-pill sim-pill--soft">Progress saved automatically</span>}
      </header>
      {fail && <div className="sim-alert" role="alert">{fail}</div>}
      <main className="sim-main">
        {phase.k === "loading" && <p className="sim-loading" role="status">Loading the simulation…</p>}
        {phase.k === "error" && (
          <div className="sim-card sim-center"><h2>Something went wrong</h2><p>{phase.message}</p>
            <button type="button" className="sim-btn" onClick={() => void load()}>Try again</button></div>)}
        {phase.k === "intro" && <IntroScreen intro={phase.intro} current={phase.current} onBegin={(fresh) => void begin(fresh, phase.current)} />}
        {phase.k === "step" && phase.view.scene.step && (
          <StepScreen theme={theme} view={phase.view} picked={phase.picked} busy={phase.busy}
            onPick={(id) => setPhase({ ...phase, picked: id })} onConfirm={() => phase.picked && void confirm(phase.view, phase.picked)} />)}
        {phase.k === "outcome" && (
          <OutcomeScreen theme={theme} outcome={phase.outcome} prev={phase.prev} view={phase.view}
            onNext={() => phase.outcome.completed ? onReport(phase.view.run.id) : setPhase({ k: "step", view: phase.view, picked: null, busy: false })} />)}
      </main>
    </div>
  );
}

function IntroScreen({ intro, current, onBegin }: { intro: Intro; current: RunView | null; onBegin: (fresh: boolean) => void }) {
  return (
    <section className="sim-card sim-intro" aria-labelledby="intro-h">
      <p className="sim-kicker">{intro.domain}</p>
      <h1 id="intro-h">{intro.title}</h1>
      <p className="sim-lede">{intro.tagline}</p>
      <p className="sim-meta"><b>Your role:</b> {intro.role} · <b>About</b> {intro.minutes} minutes · {intro.rounds} steps</p>
      {intro.parts.length > 1 && <ol className="sim-parts">{intro.parts.map((p) => <li key={p}>{p}</li>)}</ol>}
      {intro.intro.map((t, i) => <p key={i}>{t}</p>)}
      <h2>What you will practise</h2>
      <ul>{intro.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
      <p className="sim-disclaimer" role="note">{intro.disclaimer}</p>
      <div className="sim-actions">
        {current ? (<>
          <button type="button" className="sim-btn sim-btn--primary" onClick={() => onBegin(false)}>Continue where you left off (step {current.scene.round} of {current.scene.total_rounds})</button>
          <button type="button" className="sim-btn" onClick={() => onBegin(true)}>Start again</button>
        </>) : <button type="button" className="sim-btn sim-btn--primary" onClick={() => onBegin(true)}>Begin</button>}
      </div>
    </section>
  );
}

function StepScreen({ theme, view, picked, busy, onPick, onConfirm }: { theme: string; view: RunView; picked: string | null; busy: boolean; onPick: (id: string) => void; onConfirm: () => void }) {
  const step = view.scene.step!;
  const decisionPanel = (
    <section className="sim-card sim-decision" aria-labelledby="step-h">
      <p className={`sim-tag sim-tag--${step.kind}`}>{KIND_LABEL[step.kind]}</p>
      {step.part && <p className="sim-kicker">{step.part}</p>}
      <h1 id="step-h">{step.title}</h1>
      <p className="sim-clock">{step.clock}</p>
      <p className="sim-brief">{step.brief}</p>
      <ul className="sim-facts">{step.facts.map((f, i) => <li key={i}>{f}</li>)}</ul>
      {view.scene.events && view.scene.events.length > 0 && view.scene.events.map((e) => (
        <div key={e.event_id} className="sim-event" role="status"><b>{theme === "covid" ? "Situation update: " : "Development: "}{e.title}</b><p>{e.text}</p></div>))}
      <h2 className="sim-question">{step.question}</h2>
      <div role="radiogroup" aria-labelledby="step-h" className="sim-choices">
        {step.choices.map((c) => (
          <label key={c.id} className={`sim-choice${picked === c.id ? " is-picked" : ""}${c.available ? "" : " is-locked"}`}>
            <input type="radio" name="choice" value={c.id} checked={picked === c.id} disabled={!c.available || busy} onChange={() => onPick(c.id)} />
            <span className="sim-choice-label">{c.label}</span>
            {c.summary && <span className="sim-choice-sum">{c.summary}</span>}
            {!c.available && <span className="sim-choice-sum">{c.reason}</span>}
          </label>))}
      </div>
      <div className="sim-actions">
        <button type="button" className="sim-btn sim-btn--primary" disabled={!picked || busy} onClick={onConfirm}>{busy ? "Applying…" : "Confirm decision"}</button>
        {step.kind === "documented" && <span className="sim-fine">This record cannot be changed. Your answer shows how well you read it.</span>}
      </div>
      {step.sources.length > 0 && <p className="sim-fine">Sources consulted for this step: {step.sources.join("; ")}.</p>}
    </section>
  );
  return theme === "covid" ? <CovidStage scene={view.scene} decision={decisionPanel} /> : <BhopalStage scene={view.scene} decision={decisionPanel} />;
}

function OutcomeScreen({ theme, outcome, prev, view, onNext }: { theme: string; outcome: Outcome; prev: RunView; view: RunView; onNext: () => void }) {
  const labels = Object.fromEntries(view.scene.meters.map((m) => [m.id, m]));
  const historical = prev.scene.step?.kind === "documented";
  const card = (
    <section className="sim-card sim-outcome" aria-labelledby="out-h">
      <p className={`sim-rating sim-rating--${outcome.rating}`}>{historical ? { strong: "Strong reading of the record", mixed: "Partly right", weak: "Weak reading" }[outcome.rating] : { strong: "Strong decision", mixed: "Mixed decision", weak: "Weak decision" }[outcome.rating]}</p>
      <h1 id="out-h">{historical ? "What the record shows" : "What happened"}</h1>
      <p className="sim-chosen">You chose: <b>{outcome.label}</b></p>
      <p>{outcome.consequence}</p>
      {Object.keys(outcome.changes).length > 0 && (
        <ul className="sim-changes" aria-label="What changed">
          {Object.entries(outcome.changes).map(([k, [a, b]]) => {
            const better = (labels[k]?.good === "low") ? b < a : b > a;
            return <li key={k} className={better ? "up" : "down"}>{labels[k]?.label ?? k}: {a} → {b}</li>;
          })}
        </ul>)}
      {outcome.lesson && <p className="sim-lesson"><b>Lesson:</b> {outcome.lesson}</p>}
      <div className="sim-actions">
        <button type="button" className="sim-btn sim-btn--primary" onClick={onNext}>{outcome.completed ? "See your career experience report" : "Continue"}</button>
      </div>
    </section>
  );
  const shown = { ...view.scene, step: prev.scene.step };   // the picture stays on the step you just decided
  return theme === "covid" ? <CovidStage scene={shown} decision={card} /> : <BhopalStage scene={shown} decision={card} />;
}
