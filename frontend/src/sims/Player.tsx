import { useCallback, useEffect, useMemo, useState } from "react";
import type { Intro, Outcome, RunView, SimsApi } from "../api/sims";
import { BhopalStage } from "./BhopalStage";
import { CovidStage } from "./CovidStage";
import { Preview } from "./Previews";
import { takeIntent } from "../shell/intent";
import { SoundToggle } from "../audio/useAudio";
import { audio } from "../audio/audio";
import { ReadAloud } from "../a11y/speak";
import { TerminalStage } from "./TerminalStage";
import { ComicReader } from "./comic/ComicReader";
import { FIRST_SURGE, FIRST_SURGE_DIR, type ComicPage } from "./comic/firstSurge";
import { toComicPages, useIllustrated } from "./comic/graphic";
import { ROUND1_PANELS } from "./comic/round1";
import "./sims.css";

const KIND_LABEL = { documented: "Documented record", hypothetical: "Fictional exercise", simulation: "Simulation", workday: "A normal day" } as const;

type Theme = "bhopal" | "covid" | "blackout";

/** Steps that open with a comic, by step id. Each is shown once per run (and can always be skipped). */
const COMICS: Record<string, ComicPage[]> = { c1: FIRST_SURGE };
const seenKey = (runId: string, stepId: string) => `rl.comic.${runId}.${stepId}`;
const comicSeen = (runId: string, stepId: string): boolean => { try { return localStorage.getItem(seenKey(runId, stepId)) === "1"; } catch { return false; } };
function Stage({ theme, scene, decision, log, deltas }: { theme: Theme; scene: import("../api/sims").Scene; decision: React.ReactNode; log?: { title: string; label: string; rating: string }[]; deltas?: Record<string, number> }) {
  if (theme === "covid") return <CovidStage scene={scene} decision={decision} log={log} deltas={deltas} />;
  if (theme === "blackout") return <TerminalStage scene={scene} decision={decision} deltas={deltas} />;
  return <BhopalStage scene={scene} decision={decision} deltas={deltas} />;
}

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
      const intent = takeIntent();                       // chosen on the path page: skip the intro for an explicit continue / start new
      if (current && intent === "continue") { setPhase({ k: "step", view: current, picked: null, busy: false }); return; }
      if (current && intent === "new") { setPhase({ k: "step", view: await api.start(simId), picked: null, busy: false }); return; }
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

  const theme = simId.split("_")[0] as Theme;           // covid | bhopal | blackout, for both the workday and the crisis
  const title = phase.k === "intro" ? phase.intro.title : phase.k === "step" || phase.k === "outcome" ? phase.view.scenario.title : "";
  const scene = phase.k === "step" || phase.k === "outcome" ? phase.view.scene : null;
  const pct = scene ? Math.round((100 * (scene.status === "completed" ? scene.total_rounds : scene.round - 1)) / scene.total_rounds) : 0;
  return (
    <div className={`sim sim--${theme}`}>
      <header className="sim-top">
        <button type="button" className="sim-btn sim-btn--ghost" onClick={onHome}>← All simulations</button>
        <strong className="sim-name">{title}</strong>
        <span className="sim-spacer" />
        {scene && <span className="sim-pill" aria-label="Progress">{scene.status === "completed" ? "Finished" : `Step ${scene.round} of ${scene.total_rounds}`}</span>}
        {scene && <span className="sim-pill sim-pill--soft">Saved automatically</span>}
        <SoundToggle />
        {scene && <div className="sim-topbar" role="progressbar" aria-label="Simulation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{ width: `${pct}%` }} /></div>}
      </header>
      {fail && <div className="sim-alert" role="alert">{fail}</div>}
      <div className="sr-only" role="status" aria-live="polite">{phase.k === "step" && phase.view.scene.step ? `Step ${phase.view.scene.round} of ${phase.view.scene.total_rounds}: ${phase.view.scene.step.title}.` : phase.k === "outcome" ? `${phase.outcome.rating === "strong" ? "Strong" : phase.outcome.rating === "mixed" ? "Mixed" : "Weak"} decision. ${phase.outcome.consequence}` : ""}</div>
      <main className="sim-main" id="main" tabIndex={-1}>
        {phase.k === "loading" && <p className="sim-loading" role="status"><span className="sim-spin" aria-hidden="true" /> Loading the simulation…</p>}
        {phase.k === "error" && (
          <div className="sim-card sim-center"><h2>Something went wrong</h2><p>{phase.message}</p>
            <button type="button" className="sim-btn sim-btn--primary" onClick={() => void load()}>Try again</button></div>)}
        {phase.k === "intro" && <IntroScreen simId={simId} intro={phase.intro} current={phase.current} onBegin={(fresh) => void begin(fresh, phase.current)} />}
        {phase.k === "step" && phase.view.scene.step && (
          <StepScreen key={phase.view.scene.round} theme={theme} view={phase.view} picked={phase.picked} busy={phase.busy}
            onPick={(id) => setPhase({ ...phase, picked: id })} onConfirm={() => phase.picked && void confirm(phase.view, phase.picked)} />)}
        {phase.k === "outcome" && (
          <OutcomeScreen theme={theme} outcome={phase.outcome} prev={phase.prev} view={phase.view}
            onNext={() => phase.outcome.completed ? onReport(phase.view.run.id) : setPhase({ k: "step", view: phase.view, picked: null, busy: false })} />)}
      </main>
    </div>
  );
}

function IntroScreen({ simId, intro, current, onBegin }: { simId: string; intro: Intro; current: RunView | null; onBegin: (fresh: boolean) => void }) {
  return (
    <section className="sim-intro" aria-labelledby="intro-h">
      <div className="sim-intro-art"><Preview id={(intro.profession ?? simId) as Theme} />
        <div className="sim-intro-meta"><span>{intro.minutes} min</span><span>{intro.rounds} steps</span><span>{intro.domain.split("·")[0].trim()}</span></div></div>
      <div className="sim-intro-body">
        <div className="sim-intro-scroll">
        {intro.kind === "workday" && <p className="sim-phase"><b>Part 1 of 2 · A normal day.</b> Nothing is on fire. What you set up today carries into the crisis that follows.</p>}
        {intro.kind === "crisis" && <p className="sim-phase sim-phase--crisis"><b>Part 2 of 2 · The crisis.</b> Whatever your workday set up is already in place.</p>}
        <p className="sim-kicker">{intro.domain}</p>
        <h1 id="intro-h">{intro.title}</h1>
        <p className="sim-lede">{intro.tagline}</p>
        <p className="sim-meta"><b>Your role:</b> {intro.role}</p>
        {intro.parts.length > 1 && <ol className="sim-parts">{intro.parts.map((p) => <li key={p}>{p}</li>)}</ol>}
        {intro.intro.map((t, i) => <p key={i} className="sim-intro-p">{t}</p>)}
        <div className="sim-intro-goals"><h2>What you will practise</h2><ul>{intro.objectives.map((o) => <li key={o}>{o}</li>)}</ul></div>
        {intro.prep && (
          <div className="sim-prep sim-prep--intro" role="note">
            {intro.prep.workday_done
              ? <><b>Your normal day set up {intro.prep.earned} of {intro.prep.total} things for this crisis.</b><ul>{intro.prep.items.filter((p) => p.status !== "missed").map((p) => <li key={p.flag}>{p.label}{p.status === "part" ? " (half)" : ""}</li>)}</ul></>
              : <><b>You have not played the normal day.</b> The crisis starts with no head start. <a href={`#/workday/${intro.profession}`}>Play it first (about 15 minutes)</a>.</>}
          </div>)}
        <p className="sim-disclaimer" role="note">{intro.disclaimer}</p>
        </div>
        <div className="sim-actions sim-intro-foot">
          {current ? (<>
            <button type="button" className="sim-btn sim-btn--primary sim-btn--lg" onClick={() => onBegin(false)}>Continue where you left off (step {current.scene.round} of {current.scene.total_rounds})</button>
            <button type="button" className="sim-btn" onClick={() => onBegin(true)}>Start again</button>
          </>) : <button type="button" className="sim-btn sim-btn--primary sim-btn--lg" onClick={() => onBegin(true)}>Begin</button>}
        </div>
      </div>
    </section>
  );
}

function StepScreen({ theme, view, picked, busy, onPick, onConfirm }: { theme: string; view: RunView; picked: string | null; busy: boolean; onPick: (id: string) => void; onConfirm: () => void }) {
  const step = view.scene.step!;
  const [pane, setPane] = useState<"situation" | "decide">("situation");
  const comic = COMICS[step.id];
  const [reading, setReading] = useState(() => !!comic && !comicSeen(view.run.id, step.id));
  // COVID Round 1 opens with an illustrated sequence when its pictures are shipped; otherwise the drawn comic below is used, exactly as before
  const illustrated = useIllustrated(reading && comic ? ROUND1_PANELS : null);
  const illustratedPages = useMemo(() => toComicPages(ROUND1_PANELS), []);
  const finishComic = () => { try { localStorage.setItem(seenKey(view.run.id, step.id), "1"); } catch { /* shown again next time */ } setReading(false); };
  const events = view.scene.events ?? [];
  useEffect(() => {
    if (reading) return;
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (t && (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && (t as HTMLInputElement).type === "text")))) return;
      const k = e.key.toLowerCase();
      if (pane === "situation") { if ((k === "enter" || k === "arrowright") && !(t && (t.tagName === "BUTTON" || t.tagName === "A"))) { e.preventDefault(); setPane("decide"); } return; }
      const i = "abcdefgh".indexOf(k) >= 0 && k.length === 1 ? "abcdefgh".indexOf(k) : "12345678".indexOf(k) >= 0 && k.length === 1 ? "12345678".indexOf(k) : -1;
      if (i >= 0 && step.choices[i]?.available && !busy) { e.preventDefault(); onPick(step.choices[i].id); }
      else if (k === "enter" && picked && !busy && !(t && (t.tagName === "BUTTON" || t.tagName === "A"))) { e.preventDefault(); onConfirm(); }
      else if (k === "arrowleft" || k === "escape") { setPane("situation"); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [reading, pane, picked, busy, step.choices, onPick, onConfirm]);
  const head = (
    <div className="sim-head">
      <p className={`sim-tag sim-tag--${step.kind}`}>{KIND_LABEL[step.kind]}</p>
      {step.part && <span className="sim-kicker">{step.part}</span>}
      <h1 id="step-h">{step.title}</h1>
      <p className="sim-clock">{step.clock}</p>
    </div>);
  const decisionPanel = (
    <section className="sim-card sim-decision" aria-labelledby="step-h">
      {head}
      <div className="sim-tabs" role="tablist" aria-label="Step sections">
        <button role="tab" type="button" aria-selected={pane === "situation"} className={pane === "situation" ? "on" : ""} onClick={() => setPane("situation")}>1 · The situation</button>
        <button role="tab" type="button" aria-selected={pane === "decide"} className={pane === "decide" ? "on" : ""} onClick={() => setPane("decide")}>2 · Your decision</button>
      </div>
      {pane === "situation" ? (<>
        <div className="sim-body" role="tabpanel">
          {step.voice && <figure className="sim-voice"><span className="sim-avatar" aria-hidden="true">{step.voice.name.replace(/^(Dr\.|Mr\.|Mrs\.|Sister|The)\s+/, "").slice(0, 1)}</span><blockquote>&ldquo;{step.voice.line}&rdquo;<figcaption><b>{step.voice.name}</b> · {step.voice.role}</figcaption></blockquote></figure>}
          <p className="sim-brief">{step.brief}</p>
          <ul className="sim-facts">{step.facts.map((f, i) => <li key={i}>{f}</li>)}</ul>
          {view.scene.round === 1 && (view.scene.prepared?.length ?? 0) > 0 && <div className="sim-prep" role="note"><b>From your normal day:</b><ul>{view.scene.prepared!.map((p) => <li key={p.flag}>{p.label}{p.full ? "" : " (half)"}</li>)}</ul></div>}
          {events.map((e) => <div key={e.event_id} className="sim-event" role="status"><b>{theme === "covid" ? "Situation update: " : "Development: "}{e.title}</b><p>{e.text}</p></div>)}
          {step.sources.length > 0 && <p className="sim-fine">Sources consulted: {step.sources.join("; ")}.</p>}
        </div>
        <div className="sim-foot"><ReadAloud text={() => [step.voice ? `${step.voice.name}: ${step.voice.line}` : "", step.brief, ...step.facts].filter(Boolean).join(". ")} /><span className="sim-fine">{step.kind === "documented" ? "This record cannot be changed. Your answer shows how well you read it." : "Press Enter to continue."}</span>
          <button type="button" className="sim-btn sim-btn--primary" onClick={() => setPane("decide")}>Make your decision →</button></div>
      </>) : (<>
        <div className="sim-body" role="tabpanel">
          <h2 className="sim-question">{step.question}</h2>
          <div role="radiogroup" aria-labelledby="step-h" className="sim-choices">
            {step.choices.map((c, i) => (
              <label key={c.id} className={`sim-choice${picked === c.id ? " is-picked" : ""}${c.available ? "" : " is-locked"}`}>
                <input type="radio" name="choice" value={c.id} checked={picked === c.id} disabled={!c.available || busy} onChange={() => onPick(c.id)} />
                <span className="sim-choice-key" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                <span className="sim-choice-text"><span className="sim-choice-label">{c.label}</span>
                  {c.summary && <span className="sim-choice-sum">{c.summary}</span>}
                  {!c.available && <span className="sim-choice-sum">{c.reason}</span>}</span>
              </label>))}
          </div>
        </div>
        <div className="sim-foot"><button type="button" className="sim-btn sim-btn--ghost" onClick={() => setPane("situation")}>← Back to the situation</button><ReadAloud text={() => `${step.question}. ${step.choices.map((c, i) => `Option ${String.fromCharCode(65 + i)}: ${c.label}.`).join(" ")}`} /><span className="sim-keys" aria-hidden="true">Press <kbd>A</kbd>–<kbd>{String.fromCharCode(64 + step.choices.length)}</kbd> to choose, <kbd>Enter</kbd> to confirm</span>
          <button type="button" className="sim-btn sim-btn--primary" disabled={!picked || busy} onClick={onConfirm}>{busy ? "Applying…" : "Confirm decision"}</button></div>
      </>)}
    </section>
  );
  if (reading && comic) {
    if (illustrated === "pending") return <p className="sim-loading" role="status"><span className="sim-spin" aria-hidden="true" /> Loading…</p>;
    return illustrated === "yes" ? <ComicReader pages={illustratedPages} title={step.title} onDone={finishComic} /> : <ComicReader pages={comic} dir={FIRST_SURGE_DIR} title={step.title} onDone={finishComic} />;
  }
  return <Stage theme={theme as Theme} scene={view.scene} decision={decisionPanel} log={view.decisions} />;
}

function OutcomeScreen({ theme, outcome, prev, view, onNext }: { theme: string; outcome: Outcome; prev: RunView; view: RunView; onNext: () => void }) {
  const labels = Object.fromEntries(view.scene.meters.map((m) => [m.id, m]));
  const historical = prev.scene.step?.kind === "documented";
  useEffect(() => { audio.sfx(outcome.rating === "strong" ? "good" : outcome.rating === "mixed" ? "neutral" : "bad"); }, [outcome]);   // a soft cue that matches the result
  const [settled, setSettled] = useState(false);                 // meters start at their old values, then move to the new ones
  useEffect(() => { const t = setTimeout(() => setSettled(true), 260); return () => clearTimeout(t); }, []);
  const deltas = Object.fromEntries(Object.entries(outcome.changes).map(([k, [a, b]]) => [k, b - a]));
  useEffect(() => {
    const on = (e: KeyboardEvent) => { const t = e.target as HTMLElement | null; if ((e.key === "Enter" || e.key === " " || e.key === "ArrowRight") && !(t && (t.tagName === "BUTTON" || t.tagName === "A" || t.tagName === "INPUT"))) { e.preventDefault(); onNext(); } };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [onNext]);
  const card = (
    <section className="sim-card sim-outcome" aria-labelledby="out-h">
      <div className="sim-head">
        <p className={`sim-rating sim-rating--${outcome.rating}`}>{historical ? { strong: "Strong reading of the record", mixed: "Partly right", weak: "Weak reading" }[outcome.rating] : { strong: "Strong decision", mixed: "Mixed decision", weak: "Weak decision" }[outcome.rating]}</p>
        <h1 id="out-h">{historical ? "What the record shows" : "What happened"}</h1>
        <p className="sim-chosen">You chose: <b>{outcome.label}</b></p>
      </div>
      <div className="sim-body">
        <p className="sim-brief">{outcome.consequence}</p>
        {Object.keys(outcome.changes).length > 0 && (
          <ul className="sim-changes" aria-label="What changed">
            {Object.entries(outcome.changes).map(([k, [a, b]]) => {
              const better = (labels[k]?.good === "low") ? b < a : b > a;
              return <li key={k} className={better ? "up" : "down"}>{better ? "▲" : "▼"} {labels[k]?.label ?? k}: {a} → {b}</li>;
            })}
          </ul>)}
        {outcome.lesson && <p className="sim-lesson"><b>Lesson:</b> {outcome.lesson}</p>}
      </div>
      <div className="sim-foot"><ReadAloud text={() => `${outcome.consequence} ${outcome.lesson ? `Lesson: ${outcome.lesson}` : ""}`} />
        <button type="button" className="sim-btn sim-btn--primary" onClick={onNext}>{outcome.completed ? "See your career experience report" : "Continue"}</button></div>
    </section>
  );
  const shown = { ...view.scene, step: prev.scene.step, meters: settled ? view.scene.meters : prev.scene.meters };   // the picture stays on the step you just decided
  return <Stage theme={theme as Theme} scene={shown} decision={card} log={view.decisions} deltas={settled ? deltas : undefined} />;
}
