import type { ReactNode } from "react";
import type { Scene } from "../api/sims";
import { MeterBar } from "./Meter";

/** The first 7 steps of the Bhopal simulation are the documented record; the remaining steps are the fictional plant. */
const HISTORICAL_STEPS = 7;

type Lamp = "ok" | "partial" | "off" | "unknown";
const LAYERS = [
  { id: "refrigeration", label: "Refrigeration", need: 50 },
  { id: "scrubber", label: "Vent gas scrubber", need: 70 },
  { id: "flare", label: "Flare tower", need: 75 },
  { id: "spray", label: "Water spray", need: 60 },
] as const;
const LAMP_COLOR: Record<Lamp, string> = { ok: "#5fb08a", partial: "#e0a43a", off: "#d9543f", unknown: "#6a7686" };
const LAMP_TEXT: Record<Lamp, string> = { ok: "working", partial: "unproven", off: "unavailable", unknown: "designed layer" };

function lamps(scene: Scene): { lamp: Lamp; note: string }[] {
  const step = scene.step;
  const meter = (id: string) => scene.meters.find((m) => m.id === id)?.value ?? 0;
  if (!step || step.kind === "documented") {
    const n = scene.round;                                   // 1-based position in the record
    return LAYERS.map((l) => (n < 2 ? { lamp: "unknown" as Lamp, note: "" }
      : n < 5 ? { lamp: "unknown" as Lamp, note: "designed layer" }
      : l.id === "spray" ? { lamp: "partial" as Lamp, note: "reported not to reach the release" }
      : { lamp: "off" as Lamp, note: "reported out of service" }));
  }
  const s = meter("safeguards");
  return LAYERS.map((l) => {
    const lamp: Lamp = s >= l.need ? "ok" : s >= l.need - 18 ? "partial" : "off";
    return { lamp, note: LAMP_TEXT[lamp] };
  });
}

export function PlantSchematic({ scene }: { scene: Scene }) {
  const step = scene.step;
  const historical = !step || step.kind === "documented";
  const meter = (id: string) => scene.meters.find((m) => m.id === id)?.value ?? 0;
  const ls = lamps(scene);
  const hazard = meter("hazard"), community = meter("community");
  const gas = historical && ["night", "response", "aftermath"].includes(step?.scene ?? "") || (!historical && hazard >= 85);
  const alt = historical
    ? `Schematic of the plant: a storage tank, four protective layers (${LAYERS.map((l, i) => `${l.label}: ${ls[i].note || LAMP_TEXT[ls[i].lamp]}`).join("; ")}) and the neighbourhood beside the plant.`
    : `Schematic of the fictional Kestrel Works: a storage tank at hazard level ${hazard} of 100, four protective layers and the neighbouring housing, community preparedness ${community} of 100.`;
  return (
    <figure className="bh-fig">
      <svg viewBox="0 0 560 300" role="img" aria-label={alt}>
        <rect width="560" height="300" rx="6" fill="#141a22" />
        <rect y="238" width="560" height="62" fill="#1b232d" />
        <g stroke="#2d3946" strokeWidth="1">{[60, 120, 180, 240, 300, 360, 420, 480].map((x) => <line key={x} x1={x} y1="238" x2={x - 24} y2="300" />)}</g>
        {/* tank */}
        <rect x="40" y="108" width="120" height="130" rx="18" fill="#2a3644" stroke="#74879c" strokeWidth="2" />
        <text x="100" y="98" textAnchor="middle" fill="#cfd8e3" fontSize="12">{historical ? "MIC storage (tank 610)" : "Storage tank"}</text>
        {!historical && <>
          <rect x="52" y="124" width="14" height="100" rx="4" fill="#0f141a" stroke="#74879c" />
          <rect x="52" y={224 - hazard} width="14" height={hazard} rx="4" fill={hazard >= 70 ? "#d9543f" : hazard >= 45 ? "#e0a43a" : "#5fb08a"} />
        </>}
        {/* protective layers */}
        {LAYERS.map((l, i) => (
          <g key={l.id} transform={`translate(${196 + (i % 2) * 118} ${62 + Math.floor(i / 2) * 82})`}>
            <rect width="108" height="68" rx="6" fill="#1d2733" stroke="#3a4a5c" />
            <circle cx="16" cy="18" r="7" fill={LAMP_COLOR[ls[i].lamp]} />
            <text x="30" y="22" fill="#e6ebf2" fontSize="11" fontWeight="600">{l.label}</text>
            <text x="10" y="46" fill="#aab6c4" fontSize="10">{ls[i].note || LAMP_TEXT[ls[i].lamp]}</text>
          </g>))}
        <path d="M160 160 H196 M160 160 V96 H196 M160 160 V178 H196" fill="none" stroke="#74879c" strokeWidth="2" />
        {/* neighbourhood */}
        <g>{[0, 1, 2, 3, 4].map((i) => (
          <g key={i} transform={`translate(${440 + (i % 2) * 54} ${150 + Math.floor(i / 2) * 30 - (i % 2) * 10})`}>
            <path d="M0 24 V10 L16 0 L32 10 V24 Z" fill={historical ? "#4a5b6e" : community >= 55 ? "#5fb08a" : community >= 30 ? "#7a8a52" : "#8a5a52"} stroke="#0e1319" />
          </g>))}
        </g>
        <text x="492" y="236" textAnchor="middle" fill="#cfd8e3" fontSize="12">{historical ? "Nearby neighbourhoods" : "Neighbouring housing"}</text>
        {!historical && community >= 50 && <g><circle cx="430" cy="166" r="6" fill="#5fb08a" /><text x="418" y="150" fill="#9fd4b8" fontSize="10">community alarm</text></g>}
        {gas && <ellipse cx="400" cy="150" rx="150" ry="52" fill="#c9a24a" opacity="0.18" />}
        {gas && <text x="330" y="120" fill="#e8cf8a" fontSize="11">{historical ? "Gas drifted over nearby neighbourhoods" : "Simulated release"}</text>}
      </svg>
      <figcaption className="bh-cap">{historical ? "Schematic, not to scale. Status of each layer follows what sources report about December 1984." : "Fictional plant. The lamps follow your decisions and the “Safety systems working” level."}</figcaption>
    </figure>
  );
}

export function BhopalStage({ scene, decision }: { scene: Scene; decision: ReactNode }) {
  const historical = !scene.step || scene.step.kind === "documented";
  const meters = scene.meters.filter((m) => (historical ? m.id === "insight" : m.id !== "insight"));
  const n = scene.status === "completed" ? scene.total_rounds : scene.round;
  return (
    <div className="bh-layout">
      <aside className="bh-aside" aria-label="Situation board">
        <ol className="bh-rail" aria-label="Where you are in the simulation">
          {Array.from({ length: scene.total_rounds }, (_, i) => (
            <li key={i} className={`${i < HISTORICAL_STEPS ? "hist" : "fict"}${i + 1 === n ? " now" : i + 1 < n ? " done" : ""}`} aria-current={i + 1 === n ? "step" : undefined}>
              <span className="sr-only">Step {i + 1} {i < HISTORICAL_STEPS ? "historical" : "fictional"}</span>
            </li>))}
        </ol>
        <p className="bh-legend"><span className="hist" /> Historical record <span className="fict" /> Fictional exercise</p>
        <PlantSchematic scene={scene} />
        <section className="sim-card sim-meters" aria-label="Indicators">
          <h2>{historical ? "Your reading of the record" : "Plant indicators"}</h2>
          {meters.map((m) => <MeterBar key={m.id} m={m} />)}
        </section>
      </aside>
      <div className="bh-main">{decision}</div>
    </div>
  );
}
