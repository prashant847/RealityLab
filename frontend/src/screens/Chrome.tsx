import { useEffect, useRef } from "react";
import { uiUrl } from "../comic/assets";
import type { Problem } from "../game/useGame";

export function Topbar({ clock, round, attempt, kind, rewindsLeft, paused, onPause, onHistory, onLeave }: {
  clock?: string; round?: number; attempt: number; kind: string; rewindsLeft: number; paused: boolean;
  onPause: () => void; onHistory: () => void; onLeave: () => void;
}) {
  return (
    <header className="topbar">
      <img src={uiUrl("logo_mark")} alt="" />
      <strong>BLACKOUT</strong>
      <span className="pill" aria-label="Current time and round">{clock ?? "About Day 10"}{round ? ` · Round ${round}/10` : ""}</span>
      {attempt > 1 && <span className="pill pill--branch">Attempt {attempt}{kind === "rewind" ? " (rewound)" : ""}</span>}
      <span className="pill" title="Rewinds left in this simulation">{rewindsLeft} rewind{rewindsLeft === 1 ? "" : "s"} left</span>
      <span className="spacer" />
      <button type="button" className="ghost small" onClick={onHistory}>Event log &amp; history</button>
      <button type="button" className="ghost small" onClick={onPause} aria-pressed={paused}>Pause</button>
      <button type="button" className="ghost small" onClick={onLeave}>Exit</button>
    </header>
  );
}

export function PauseOverlay({ onResume, onHistory, onLeave }: { onResume: () => void; onHistory: () => void; onLeave: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onResume(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onResume]);
  return (
    <div className="overlay-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <h2 id="pause-title">Simulation paused</h2>
        <p>The clock does not advance while you decide, but the scene is hidden while paused. Nothing is lost.</p>
        <div className="actions">
          <button ref={ref} type="button" className="primary" onClick={onResume}>Resume</button>
          <button type="button" className="ghost" onClick={onHistory}>Event log &amp; history</button>
          <button type="button" className="ghost" onClick={onLeave}>Exit to start screen</button>
        </div>
      </div>
    </div>
  );
}

export function ErrorBanner({ problem, onDismiss }: { problem: Problem; onDismiss: () => void }) {
  return (
    <div className="error-banner" role="alert">
      <span>{problem.message}</span>
      {problem.retry && <button type="button" className="ghost small" onClick={() => { onDismiss(); problem.retry?.(); }}>Try again</button>}
      <button type="button" className="ghost small" onClick={onDismiss}>Dismiss</button>
    </div>
  );
}

export function BusyToast({ label }: { label: string | null }) {
  return (
    <div className={`busy${label ? " is-on" : ""}`} role="status" aria-live="polite">
      {label && <><span className="spinner" aria-hidden="true" />{label}</>}
    </div>
  );
}
