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
  const night = ["night", "response", "night_anomaly"].includes(step?.scene ?? "");
  const gas = (historical && ["night", "response", "aftermath"].includes(step?.scene ?? "")) || (!historical && hazard >= 85);
  const alt = historical
    ? `Schematic of the plant: a storage tank, four protective layers (${LAYERS.map((l, i) => `${l.label}: ${ls[i].note || LAMP_TEXT[ls[i].lamp]}`).join("; ")}) and the neighbourhood beside the plant.`
    : `Schematic of the fictional Kestrel Works: a storage tank at hazard level ${hazard} of 100, four protective layers and the neighbouring housing, community preparedness ${community} of 100.`;
  const sky = night ? ["#05080f", "#141c28"] : ["#1a2433", "#3a3f48"];
  return (
    <figure className="bh-fig">
      <svg viewBox="0 0 560 430" role="img" aria-label={alt} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} /></linearGradient>
          <radialGradient id="glow"><stop offset="0" stopColor="#e0a43a" stopOpacity=".55" /><stop offset="1" stopColor="#e0a43a" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="560" height="430" rx="10" fill="url(#sky)" /><g transform="translate(0 52)">
        {night && [[40, 30], [100, 60], [170, 22], [240, 48], [330, 24], [410, 58], [500, 32], [60, 90]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.5" fill="#d8e0ee" opacity=".75" />)}
        <circle cx="492" cy="48" r="14" fill={night ? "#e7dcb4" : "#c9b98a"} opacity={night ? 0.95 : 0.5} />
        <rect y="262" width="560" height="140" fill="#171e28" /><path d="M0 262 H560" stroke="#34424f" strokeWidth="2" />
        <ellipse cx="102" cy="268" rx="78" ry="9" fill="#0d1218" />
        <rect x="38" y="118" width="128" height="148" rx="22" fill="#2b3745" stroke="#7d91a7" strokeWidth="3" />
        {!historical && <ellipse cx="102" cy="200" rx="60" ry="60" fill="url(#glow)" opacity={Math.min(1, hazard / 70)} />}
        <text x="102" y="106" textAnchor="middle" fill="#d6dee9" fontSize="13" fontWeight="600">{historical ? "MIC storage (tank 610)" : "Storage tank"}</text>
        {!historical && <>
          <rect x="52" y="136" width="16" height="112" rx="5" fill="#0f141a" stroke="#7d91a7" />
          <rect x="52" y={248 - hazard * 1.12} width="16" height={hazard * 1.12} rx="5" fill={hazard >= 70 ? "#d9543f" : hazard >= 45 ? "#e0a43a" : "#5fb08a"} />
          <text x="60" y="276" textAnchor="middle" fill="#9fb0c3" fontSize="9">hazard</text>
        </>}
        <path d="M166 190 H204 M184 190 V120 H204 M184 190 V214 H204" fill="none" stroke="#7d91a7" strokeWidth="3" strokeDasharray="7 6" className="pv-flow" />
        {LAYERS.map((l, i) => (
          <g key={l.id} transform={`translate(${204 + (i % 2) * 124} ${80 + Math.floor(i / 2) * 96})`}>
            <rect width="114" height="80" rx="9" fill="#1d2733" stroke={ls[i].lamp === "off" ? "#7c3a31" : "#3a4a5c"} strokeWidth="1.5" />
            <circle cx="18" cy="20" r="8" fill={LAMP_COLOR[ls[i].lamp]} className={ls[i].lamp === "off" ? "pv-pulse" : ""} />
            <text x="34" y="25" fill="#eef2f7" fontSize="12" fontWeight="600">{l.label}</text>
            <text x="12" y="52" fill="#b4c0cd" fontSize="11">{ls[i].note || LAMP_TEXT[ls[i].lamp]}</text>
            <rect x="12" y="62" width="90" height="5" rx="2.5" fill="#33414f" /><rect x="12" y="62" width={ls[i].lamp === "ok" ? 90 : ls[i].lamp === "partial" ? 48 : 12} height="5" rx="2.5" fill={LAMP_COLOR[ls[i].lamp]} />
          </g>))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} transform={`translate(${462 + (i % 3) * 34} ${262 - Math.floor(i / 3) * 36 - 26})`} d="M0 26 V12 L17 0 L34 12 V26 Z"
            fill={historical ? "#475769" : community >= 55 ? "#4f9c7c" : community >= 30 ? "#7a8a52" : "#8a5a52"} stroke="#0d1218" />))}
        {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={473 + (i % 3) * 34} y={262 - Math.floor(i / 3) * 36 - 14} width="5" height="6" fill={night ? "#f2d27a" : "#2b3745"} />)}
        <text x="500" y="298" textAnchor="middle" fill="#cfd8e3" fontSize="11">{historical ? "Nearby neighbourhoods" : "Neighbouring housing"}</text>
        {!historical && community >= 50 && <g><circle cx="446" cy="200" r="7" fill="#5fb08a" className="pv-pulse" /><text x="410" y="184" fill="#9fd4b8" fontSize="10">community alarm</text></g>}
        {gas && <ellipse cx="420" cy="210" rx="170" ry="60" fill="#c9a24a" opacity=".2" className="pv-drift" />}
        {gas && <text x="350" y="160" fill="#ecd48f" fontSize="12">{historical ? "Gas drifted over nearby neighbourhoods" : "Simulated release"}</text>}
      </g></svg>
      <figcaption className="bh-cap">{historical ? "Schematic, not to scale. Each layer shows what sources report about December 1984." : "Fictional plant. The lamps follow your decisions and the safety-systems level."}</figcaption>
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
        <section className="sim-meters sm-grid" aria-label="Indicators">
          {meters.map((m) => <MeterBar key={m.id} m={m} />)}
        </section>
      </aside>
      <div className="bh-main">{decision}</div>
    </div>
  );
}
