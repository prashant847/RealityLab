import { useEffect, useState } from "react";
import { api as liveApi, type GameApi } from "./api/client";
import { CharacterExport } from "./gallery/CharacterExport";
import { Gallery } from "./gallery/Gallery";
import { NotPetyaPreview } from "./comic/notpetya/Preview";
import { useGame } from "./game/useGame";
import { BusyToast, ErrorBanner, PauseOverlay, Topbar } from "./screens/Chrome";
import { HistoryScreen } from "./screens/HistoryScreen";
import { RewindBriefing, ResultScreen, SceneScreen } from "./screens/PlayScreens";
import { StartScreen } from "./screens/StartScreen";
import { DeadEndScreen } from "./ui/DeadEndScreen";
import { FinishedScreen } from "./screens/FinishedScreen";
import { WhatIfScreen } from "./screens/WhatIfScreen";
import { ComparisonView } from "./ui/ComparisonView";
import type { Comparison } from "./api/types";

const useHash = () => {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
};

export default function App({ api = liveApi }: { api?: GameApi }) {
  const hash = useHash();
  if (hash === "#/gallery") return <Gallery />;
  if (hash === "#/preview-notpetya") return <NotPetyaPreview />;
  if (hash === "#/char-export") return <CharacterExport />;
  return <Game api={api} />;
}

function Game({ api }: { api: GameApi }) {
  const g = useGame(api);
  const [paused, setPaused] = useState(false);
  const [screen, setScreen] = useState<"history" | "whatif" | "compare" | null>(null);
  const [cmp, setCmp] = useState<Comparison | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const { view } = g;
  const setShowHistory = (on: boolean) => setScreen(on ? "history" : null);

  const rewindFromHistory = (index: number) => { setScreen(null); void g.rewind(index); };
  const leave = () => { setPaused(false); setScreen(null); setCmp(null); g.leave(); };
  const openCompare = async () => {
    if (!view) return;
    try { setCmp(await api.compare(view.simulation.id)); setScreen("compare"); }
    catch (e) { setUiError((e as Error).message); }
  };

  if (g.booting) return <div className="splash" role="status">Resuming your simulation…</div>;
  if (!view) {
    return (
      <>
        {g.problem && <ErrorBanner problem={g.problem} onDismiss={g.dismissProblem} />}
        <StartScreen onStart={(seed) => void g.start(seed)} busy={g.busy !== null} notice={g.notice} />
        <BusyToast label={g.busy} />
      </>
    );
  }

  const status = view.run.status;
  let body: React.ReactNode;
  if (screen === "whatif") {
    body = <WhatIfScreen api={api} simId={view.simulation.id} onClose={() => setScreen(null)} onCompared={(c) => { setCmp(c); setScreen("compare"); }} />;
  } else if (screen === "compare" && cmp) {
    body = <ComparisonView c={cmp} onClose={() => setScreen(null)} />;
  } else if (screen === "history") {
    body = (
      <HistoryScreen api={api} simId={view.simulation.id} activeRunId={view.run.id} rewindsLeft={view.simulation.rewinds_left}
        onClose={() => setShowHistory(false)} onRewind={rewindFromHistory} />
    );
  } else if (g.outcome) {
    body = <ResultScreen view={view} outcome={g.outcome} onContinue={g.dismissOutcome} />;
  } else if (g.briefing && status === "active") {
    body = <RewindBriefing view={view} ctx={g.briefing} onContinue={g.dismissBriefing} />;
  } else if (status === "dead_end" && view.analysis) {
    body = (
      <DeadEndScreen analysis={view.analysis} rewindsLeft={view.simulation.rewinds_left} busy={g.busy !== null}
        actions={{ onRewind: () => void g.rewind(), onTimeline: () => setShowHistory(true), onRestart: () => void g.restart(),
          onContinue: view.analysis.continue_allowed ? () => void g.continueAnyway() : undefined }} />
    );
  } else if (status === "completed" && view.scene.final) {
    body = (
      <FinishedScreen api={api} simId={view.simulation.id} runId={view.run.id} final={view.scene.final} state={view.state}
        onTryDifferent={() => setScreen("whatif")} onRewind={() => setShowHistory(true)} onRestart={() => void g.restart()}
        onCompare={() => void openCompare()} />
    );
  } else {
    body = <SceneScreen api={api} view={view} busy={g.busy !== null} onDecide={(id) => void g.decide(id)} />;
  }

  return (
    <div className={paused ? "is-paused" : undefined}>
      <Topbar clock={view.scene.clock} round={view.scene.round} attempt={view.run.attempt} kind={view.run.kind}
        rewindsLeft={view.simulation.rewinds_left} paused={paused} onPause={() => setPaused(true)}
        onHistory={() => setShowHistory(true)} onLeave={leave} />
      {g.problem && <ErrorBanner problem={g.problem} onDismiss={g.dismissProblem} />}
      {uiError && <ErrorBanner problem={{ message: uiError, network: false }} onDismiss={() => setUiError(null)} />}
      <div className="sr-only" role="status" aria-live="polite">
        {view.scene.title ? `Round ${view.scene.round}: ${view.scene.title}` : ""}
      </div>
      {paused ? <div aria-hidden="true" className="paused-veil" /> : body}
      {paused && <PauseOverlay onResume={() => setPaused(false)} onHistory={() => { setPaused(false); setShowHistory(true); }} onLeave={leave} />}
      <BusyToast label={g.busy} />
    </div>
  );
}
