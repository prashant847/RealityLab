import type { WorldView } from "../api/types";

type Tone = "good" | "warn" | "bad";

function Meter({ label, value, max, text, tone, marker }: {
  label: string; value: number; max: number; text: string; tone: Tone; marker?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="meter" data-tone={tone}>
      <div className="meter-head"><span>{label}</span><b>{text}</b></div>
      <div className="meter-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max}
        aria-valuenow={Math.round(value)} aria-valuetext={text}>
        <div className="meter-fill" style={{ width: `${pct}%` }} />
        {marker !== undefined && <div className="meter-marker" style={{ left: `${Math.min(100, (marker / max) * 100)}%` }} title="Required" />}
      </div>
    </div>
  );
}
const hi = (v: number, ok = 60, warn = 35): Tone => (v >= ok ? "good" : v >= warn ? "warn" : "bad");

export function SimulationHUD({ state, clock, round }: { state: WorldView; clock?: string; round?: number }) {
  const hospitalMet = state.transport_capacity >= state.hospital_need;
  return (
    <aside className="hud" aria-label="Operational status">
      <div className="hud-clock">
        <span className="hud-time">{clock ?? "—"}</span>
        <span className="hud-round">Round {round ?? state.round} of 10</span>
      </div>
      <Meter label="Time left" value={state.window_min} max={300} text={`${state.window_min} min`}
        tone={state.window_min >= 90 ? "good" : state.window_min >= 30 ? "warn" : "bad"} />
      <Meter label="Recovery effort" value={state.budget} max={12} text={`${state.budget.toFixed(1)} points`}
        tone={state.budget >= 4 ? "good" : state.budget >= 1.5 ? "warn" : "bad"} />
      <Meter label="Verified cargo" value={state.verified_units} max={state.recorded_units}
        text={`${state.verified_units} / ${state.recorded_units} recorded`} tone={hi((state.verified_units / state.recorded_units) * 100, 55, 30)} marker={state.hospital_need} />
      <Meter label="Transport capacity" value={state.transport_capacity} max={450}
        text={`${state.transport_capacity} cargo lots`} tone={hospitalMet ? "good" : "warn"} marker={state.hospital_need} />
      <Meter label="System integrity" value={state.system_integrity} max={100} text={`${state.system_integrity}%`} tone={hi(state.system_integrity)} />
      <Meter label="Recovery" value={state.recovery_progress} max={100} text={`${state.recovery_progress}%`} tone={hi(state.recovery_progress, 50, 20)} />
      <Meter label="Evidence quality" value={state.evidence_quality} max={100} text={`${state.evidence_quality}%`} tone={hi(state.evidence_quality)} />
      <Meter label="Staff safety" value={state.staff_safety} max={100} text={`${state.staff_safety}%`} tone={hi(state.staff_safety, 80, 55)} />
      <Meter label="Public trust" value={state.public_trust} max={100} text={`${state.public_trust}%`} tone={hi(state.public_trust)} />
    </aside>
  );
}
