import { useEffect, useMemo, useRef } from "react";
import { useCallback, useState } from "react";
import type { GameApi } from "../api/client";
import type { Advice, SimulationView, StakeholderKey } from "../api/types";
import { AdvicePanel } from "../ui/AdvicePanel";
import type { Endorsement } from "../ui/DecisionCard";
import { ComicPage } from "../comic/ComicPage";
import { DecisionStage, IllustratedPage, type EvidenceUse } from "../comic/illustrated/IllustratedPage";
import { FIRST_PAGE_STYLE, activeScenes } from "../comic/illustrated/scenes";
import { ANALYST } from "../story/beats";
import { composeConsequence, composeEventsPage, composeRoundPage } from "../story/compose";
import { useTrail } from "../story/useTrail";
import { ENVIRONMENT_IDS, type EnvironmentId } from "../comic/types";
import type { Outcome } from "../game/useGame";
import { DecisionList } from "../ui/DecisionCard";
import { EventPanel } from "../ui/EventPanel";
import { SimulationHUD } from "../ui/SimulationHUD";
import { StakeholderCard } from "../ui/StakeholderCard";
import { Glossary, PlainBrief } from "../ui/PlainGuide";
import { plainPage } from "../story/plain";

const STAFF_NAMES = { kavya: "Terminal Supervisor", arjun: "IT Lead", nisha: "Operations Manager", raghav: "Network Administrator", isha: "Customer Representative" } as const;
const STAFF_ROLES = { kavya: "Site safety and terminal operations", arjun: "IT systems and incident analysis", nisha: "Operations and recovery planning", raghav: "Networks, connections and routes", isha: "Customers and communication" } as const;

const asEnvironment = (s: string | undefined): EnvironmentId =>
  (ENVIRONMENT_IDS as readonly string[]).includes(s ?? "") ? (s as EnvironmentId) : "ops_office";

/** Right-hand column: status, active risks, stakeholders. Everything is read from the server view. */
export function SidePanel({ view, onAsk, asking, asked }: {
  view: SimulationView; onAsk?: (id: StakeholderKey) => void; asking?: string | null; asked?: Set<string>;
}) {
  const { state, scene, risks } = view;
  return (
    <aside className="side" aria-label="Status and stakeholders">
      <SimulationHUD state={state} clock={scene.clock ?? "6:00 AM"} round={scene.round ?? 10} />
      {risks.length > 0 && (
        <section className="card risks" aria-labelledby="risks-h">
          <h2 id="risks-h">Active risks</h2>
          <ul>{risks.map((r) => <li key={r.id}>{r.text}</li>)}</ul>
        </section>
      )}
      <section aria-labelledby="stake-h" className="stakeholders">
        <h2 id="stake-h">Your team</h2>
        {(["kavya", "arjun", "nisha", "raghav", "isha"] as const).map((id) => (
          <StakeholderCard key={id} id={id} trust={state.trust[id] ?? 0} asked={asked?.has(id)}
            onAsk={onAsk ? () => onAsk(id) : undefined} disabled={Boolean(asking)} />
        ))}
      </section>
    </aside>
  );
}

export function SceneScreen({ api, view, busy, onDecide }: { api: GameApi; view: SimulationView; busy: boolean; onDecide: (id: string) => void }) {
  const { scene } = view;
  const trail = useTrail(api, view.simulation.id, view.run.id, scene.round ?? 1);
  const flatStory = FIRST_PAGE_STYLE === "flat" && scene.round !== undefined;
  const artScript = useMemo(() => (flatStory ? composeRoundPage(scene.round!, scene.page, scene.info ?? [], trail) : scene.round !== undefined ? activeScenes()[scene.round] : undefined), [flatStory, scene.round, scene.page, scene.info, trail]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [scene.round, view.run.id]);

  // Advice belongs to one decision of one run: it resets whenever either changes.
  const decisionKey = `${view.run.id}:${scene.round}:${view.checkpoints.length}`;
  const simId = view.simulation.id;
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [asking, setAsking] = useState<string | null>(null);
  const [adviceError, setAdviceError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setAdvice([]); setAdviceError(null);
    api.adviceSoFar(simId).then((a) => { if (live) setAdvice(a); }).catch(() => undefined);   // restoring is best effort
    return () => { live = false; };
  }, [api, simId, decisionKey]);
  const ask = useCallback((who: StakeholderKey) => {
    setAsking(who); setAdviceError(null);
    api.advice(simId, who)
      .then((a) => setAdvice((prev) => [...prev.filter((x) => x.stakeholder !== a.stakeholder), a]))
      .catch((e: Error) => setAdviceError(e.message))
      .finally(() => setAsking(null));
  }, [api, simId]);
  const endorsements: Record<string, Endorsement[]> = {};
  for (const a of advice) for (const s of a.stances) {
    if (s.verdict !== "neutral") (endorsements[s.choice_id] ??= []).push({ id: a.stakeholder, name: a.name, verdict: s.verdict });
  }
  const analystId = ANALYST[scene.round ?? 1] ?? "arjun";
  const analystCard = advice.find((a) => a.stakeholder === analystId);
  const evidence: EvidenceUse = { analyst: STAFF_NAMES[analystId], role: STAFF_ROLES[analystId], advice: analystCard, busy: asking === analystId, error: adviceError, choices: scene.choices ?? [], onAnalyse: () => ask(analystId) };
  return (
    <div className="shell">
      <main aria-busy={busy}>
        <div className="brief">
          <p className="kicker">{scene.clock} · Round {scene.round} of 10</p>
          <h1 ref={heading} tabIndex={-1}>{scene.title}</h1>
          </div>
        {flatStory ? <PlainBrief round={scene.round} trail={trail} original={scene.brief} /> : <p className="lede-sm">{scene.brief}</p>}
        {scene.events.length > 0 && (
          <section aria-label="What just happened" className="happened">
            <h2>Since your last decision</h2>
            {flatStory ? <IllustratedPage page={null} script={composeEventsPage(scene.events, scene.environment ?? "ops_office", scene.round!)} title="Since your last decision" /> : scene.events.map((e) => <EventPanel key={e.event_id} event={e} environment={asEnvironment(scene.environment)} />)}
          </section>
        )}
        {artScript ? <IllustratedPage page={flatStory ? plainPage(scene.page) : scene.page} script={artScript} title={scene.title} facts={scene.info ?? []} evidence={flatStory ? evidence : undefined} /> : <ComicPage page={scene.page} title={scene.title} />}
        {flatStory && !analystCard && <p className="evidence-hint">Inspect the evidence above and have the {STAFF_NAMES[analystId]} analyse it: their view of each option will be marked on the choices below.</p>}
        <section className="card known" aria-labelledby="known-h">
          <h2 id="known-h">What you know</h2>
          <ul className="scene-info">{scene.info?.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </section>
        {flatStory && <Glossary texts={[scene.brief ?? "", ...(scene.info ?? []), ...(scene.choices ?? []).flatMap((c) => [c.label, c.summary])]} />}
        <AdvicePanel advice={advice} />
        {asking && <p role="status" className="muted">Asking for advice…</p>}
        {adviceError && <p className="alert" role="alert">{adviceError}</p>}
        {(() => {
          const decisions = <DecisionList key={`${view.run.id}-${scene.round}`} choices={scene.choices ?? []} busy={busy} onCommit={onDecide} endorsements={endorsements} />;
          return artScript ? <DecisionStage asset={artScript.decisionBackdrop}>{decisions}</DecisionStage> : decisions;
        })()}
      </main>
      <SidePanel view={view} onAsk={ask} asking={asking} asked={new Set(advice.map((a) => a.stakeholder))} />
    </div>
  );
}

export function ResultScreen({ view, outcome, onContinue }: { view: SimulationView; outcome: Outcome; onContinue: () => void }) {
  const next = view.run.status === "dead_end" ? "See what happened" : outcome.completed ? "See the final reopening" : "Continue to the next event";
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => { btn.current?.focus(); }, []);
  const flat = FIRST_PAGE_STYLE === "flat";
  const script = useMemo(() => (flat ? composeConsequence(outcome.choice_id, outcome.label, outcome.consequence, outcome.events, outcome.environment) : null), [flat, outcome]);
  return (
    <div className="shell">
      <main>
        <div className="brief">
          <p className="kicker">{outcome.clock} · Round {outcome.round} · Result</p>
          <h1>You decided</h1>
          <p className="decided">{outcome.label}</p>
        </div>
        {script ? (
          <section aria-label="Consequences" className="happened">
            <IllustratedPage page={null} script={script} title="What happened next" />
          </section>
        ) : (
          <>
            <section className="card card--accent result" aria-labelledby="res-h">
              <h2 id="res-h">What it did</h2>
              <p>{outcome.consequence}</p>
            </section>
            {outcome.events.length > 0 && (
              <section aria-label="Consequences" className="happened">
                <h2>Then this happened</h2>
                {outcome.events.map((e) => <EventPanel key={e.event_id} event={e} environment={asEnvironment(outcome.environment)} />)}
              </section>
            )}
          </>
        )}
        {script && <p className="official-note"><b>Official note:</b> {outcome.consequence}</p>}
        {script && outcome.effects.length > 0 && <p className="chips" aria-label="Recorded changes">{outcome.effects.map((e) => <span key={e} className="chip">{e}</span>)}</p>}
        <button ref={btn} type="button" className="primary big" onClick={onContinue}>{next}</button>
      </main>
      <SidePanel view={view} />
    </div>
  );
}

export function RewindBriefing({ view, ctx, onContinue }: {
  view: SimulationView; ctx: NonNullable<SimulationView["rewind_context"]>; onContinue: () => void;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => { btn.current?.focus(); }, []);
  return (
    <div className="shell">
      <main>
        <div className="brief">
          <p className="kicker">Rewound · {ctx.clock} · Round {ctx.round}</p>
          <h1>Back at the decision</h1>
          {ctx.previous_choice && <p className="lede-sm">Last time you chose: <strong>{ctx.previous_choice}</strong>. Your earlier attempt is kept and can be reviewed any time.</p>}
        </div>
        <div className="two-col">
          <section className="card" aria-labelledby="bf-known">
            <h2 id="bf-known">What you knew then</h2>
            <ul>{ctx.known_at_decision.map((t, i) => <li key={i}>{t}</li>)}</ul>
            {ctx.risks_at_decision.length > 0 && (<><h3>Warnings in view</h3><ul>{ctx.risks_at_decision.map((r) => <li key={r.id}>{r.text}</li>)}</ul></>)}
          </section>
          <section className="card card--accent" aria-labelledby="bf-later">
            <h2 id="bf-later">Discovered later</h2>
            <p className="muted">{ctx.note} You could not have known these at the time.</p>
            {ctx.discovered_later.length === 0 ? <p>Nothing further had been revealed.</p> : (
              <ul>{ctx.discovered_later.map((e, i) => <li key={i}><strong>{e.clock} — {e.title}.</strong> {e.text}</li>)}</ul>
            )}
          </section>
        </div>
        <p className="muted">A rewind does not guarantee a better result: consequences are recalculated from here. {view.simulation.rewinds_left} rewind{view.simulation.rewinds_left === 1 ? "" : "s"} left.</p>
        <button ref={btn} type="button" className="primary big" onClick={onContinue}>Choose differently</button>
      </main>
      <SidePanel view={view} />
    </div>
  );
}
