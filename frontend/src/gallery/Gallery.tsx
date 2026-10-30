import { useState } from "react";
import { ComicPage } from "../comic/ComicPage";
import { ComicPanel } from "../comic/ComicPanel";
import { CHARACTER_IDS, EFFECT_IDS, EXPRESSIONS, type ComicPageData, type PanelData } from "../comic/types";
import { adviceSamples, adviceUnverified, completedGood, completedPartial, deadEndHard, deadEndSoft, roundViews } from "../fixtures";
import { AdvicePanel } from "../ui/AdvicePanel";
import { DeadEndScreen } from "../ui/DeadEndScreen";
import { DecisionList } from "../ui/DecisionCard";
import { EventPanel } from "../ui/EventPanel";
import { OutcomeReport } from "../ui/OutcomeReport";
import { SimulationHUD } from "../ui/SimulationHUD";
import { StakeholderCard } from "../ui/StakeholderCard";
import { uiUrl } from "../comic/assets";
import { CharacterSheets } from "./CharacterSheets";
import { PortraitLab } from "./PortraitLab";

const noop = () => undefined;
const effectsDemo: PanelData[] = EFFECT_IDS.map((e) => ({
  id: `fx-${e}`, environment: e === "rain" ? "flooded_highway" : e === "smoke" || e === "sparks" ? "electrical_area" : "warehouse_floor",
  characters: [], effects: [e], narration: e.replace(/_/g, " "), dialogue: [], emphasis: null,
}));
const expressionDemo: PanelData[] = EXPRESSIONS.map((x) => ({
  id: `ex-${x}`, environment: "ops_office", characters: [{ id: "kavya", expression: x, side: "center" }],
  effects: [], narration: x, dialogue: [], emphasis: null,
}));
const bubbleDemo: ComicPageData = {
  layout: "two",
  panels: [
    { id: "b1", environment: "control_room", characters: [{ id: "arjun", expression: "speaking", side: "left" }, { id: "player", expression: "calm", side: "right" }], effects: [], narration: null,
      dialogue: [{ speaker: "arjun", text: "Speech bubble.", kind: "speech" }, { speaker: "player", text: "A thought bubble.", kind: "thought" }], emphasis: null },
    { id: "b2", environment: "loading_dock", characters: [{ id: "raghav", expression: "angry", side: "left" }, { id: "isha", expression: "worried", side: "right" }], effects: [], narration: "Narration box.",
      dialogue: [{ speaker: "raghav", text: "A shout bubble!", kind: "shout" }, { speaker: "isha", text: "Radio chatter.", kind: "radio" }], emphasis: null },
  ],
};
const missingAssets: ComicPageData = {
  layout: "single",
  panels: [{ id: "m1", environment: "alt_depot", characters: [{ id: "nisha", expression: "worried", side: "left" }], effects: ["smoke"], narration: "Missing-art fallback demo", dialogue: [{ speaker: "nisha", text: "The art failed to load but the scene still works.", kind: "speech" }], emphasis: null }],
};

export function Gallery() {
  const [round, setRound] = useState(0);
  const view = roundViews[round] ?? roundViews[0];
  const scene = view.scene;
  return (
    <div className="gallery">
      <header className="topbar" style={{ margin: "-1rem -1rem 1.5rem" }}>
        <img src={uiUrl("logo_mark")} alt="" /><strong>BLACKOUT — renderer gallery</strong>
      </header>

      <PortraitLab />

      <CharacterSheets />

      <section aria-labelledby="g-rounds">
        <h2 id="g-rounds">Story pages (real API data)</h2>
        <label>Round{" "}
          <select value={round} onChange={(e) => setRound(Number(e.target.value))}>
            {roundViews.slice(0, 10).map((v, i) => <option key={i} value={i}>{v.scene.round} — {v.scene.title}</option>)}
          </select>
        </label>
        <div className="shell" style={{ padding: "1rem 0" }}>
          <div>
            <div className="brief">
              <p className="kicker">{scene.clock} · Round {scene.round}</p>
              <h1>{scene.title}</h1>
              <ul className="scene-info">{scene.info?.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
            <ComicPage page={scene.page} title={scene.title} />
            {view.scene.events.map((e) => <EventPanel key={e.event_id} event={e} environment="warehouse_floor" />)}
            <DecisionList choices={scene.choices ?? []} onCommit={noop} />
          </div>
          <SimulationHUD state={view.state} clock={scene.clock} round={scene.round} />
        </div>
      </section>

      <section aria-labelledby="g-bub"><h2 id="g-bub">Bubble kinds</h2><ComicPage page={bubbleDemo} /></section>
      <section aria-labelledby="g-fx"><h2 id="g-fx">Effects</h2><div className="row">{effectsDemo.map((p) => <ComicPanel key={p.id} panel={p} />)}</div></section>
      <section aria-labelledby="g-ex"><h2 id="g-ex">Expressions</h2><div className="row">{expressionDemo.map((p) => <ComicPanel key={p.id} panel={p} />)}</div></section>
      <section aria-labelledby="g-st">
        <h2 id="g-st">Stakeholders</h2>
        <div className="row">
          {CHARACTER_IDS.filter((c) => c !== "player").map((c) => (
            <StakeholderCard key={c} id={c} trust={roundViews[6].state.trust[c]} quote="“Advice appears here once stakeholders are connected.”" onAsk={noop} />
          ))}
        </div>
      </section>
      <section aria-labelledby="g-adv"><h2 id="g-adv">Stakeholder advice (real backend answers)</h2><AdvicePanel advice={[...adviceSamples, adviceUnverified]} /></section>
      <section aria-labelledby="g-miss"><h2 id="g-miss">Missing-asset fallback</h2><ComicPage page={missingAssets} /></section>
      <section aria-labelledby="g-de"><h2 id="g-de">Dead end (hard — unsafe operations)</h2><DeadEndScreen analysis={deadEndHard.analysis!} rewindsLeft={5} actions={{ onRewind: noop, onTimeline: noop, onRestart: noop }} /></section>
      <section aria-labelledby="g-de2"><h2 id="g-de2">Dead end (soft — a reduced outcome remains)</h2><DeadEndScreen analysis={deadEndSoft.analysis!} rewindsLeft={5} actions={{ onRewind: noop, onTimeline: noop, onRestart: noop, onContinue: noop }} /></section>
      <section aria-labelledby="g-out"><h2 id="g-out">Outcome — full recovery</h2><OutcomeReport final={completedGood.scene.final!} state={completedGood.state} onReplay={noop} onRewind={noop} onRestart={noop} /></section>
      <section aria-labelledby="g-out2"><h2 id="g-out2">Outcome — partial dispatch</h2><OutcomeReport final={completedPartial.scene.final!} state={completedPartial.state} onRestart={noop} /></section>
    </div>
  );
}
