import type { ReactNode } from "react";
import type { Scene } from "../api/sims";
import { MeterBar } from "./Meter";

const val = (s: Scene, id: string) => s.meters.find((m) => m.id === id)?.value ?? 0;
const tone = (v: number) => (v >= 65 ? "#2d7d62" : v >= 40 ? "#b8860b" : "#c0392b");

/** The container terminal of the BLACKOUT workday: gate, crane, yard stacks and the server room, each reacting to the day's meters. */
export function TerminalScene({ scene }: { scene: Scene }) {
  const ops = val(scene, "ops"), sys = val(scene, "systems"), team = val(scene, "team"), cust = val(scene, "customers"), prep = val(scene, "prepared");
  const stacks = Math.max(1, Math.round(ops / 20));
  const alt = `Container terminal: terminal flow ${ops} of 100, systems health ${sys}, team confidence ${team}, customer confidence ${cust}, preparedness ${prep}.`;
  return (
    <figure className="tm-fig">
      <svg viewBox="0 0 560 430" role="img" aria-label={alt} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="tm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6d9a8" /><stop offset="1" stopColor="#e8c694" /></linearGradient>
          <linearGradient id="tm-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6d8fb0" /><stop offset="1" stopColor="#3f5f82" /></linearGradient>
        </defs>
        <rect width="560" height="430" fill="url(#tm-sky)" />
        <circle cx="468" cy="70" r="30" fill="#fff3d6" opacity=".9" />
        <rect y="150" width="560" height="60" fill="url(#tm-sea)" />
        {/* vessel */}
        <g transform="translate(40 120)"><path d="M0 40 H300 L270 78 H30 Z" fill="#2b3a55" /><rect x="40" y="6" width="220" height="34" fill="#c4511a" /><rect x="60" y="-8" width="40" height="14" fill="#e8a33d" /><rect x="120" y="-8" width="40" height="14" fill="#2d7d62" /><rect x="180" y="-8" width="40" height="14" fill="#3e6fa8" /></g>
        {/* crane */}
        <g stroke="#14121a" strokeWidth="3"><path d="M350 250 V110 H520" fill="none" /><path d="M520 250 V110" fill="none" /><rect x="395" y="106" width="30" height="16" fill="#e8a33d" /><path d="M410 122 V160" /></g>
        <rect x="396" y="160" width="28" height="18" fill="#2d7d62" className={ops >= 50 ? "tm-swing" : ""} />
        {/* ground and yard */}
        <rect y="250" width="560" height="180" fill="#8a8272" />
        <rect y="250" width="560" height="6" fill="#6a6252" />
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i} transform={`translate(${30 + i * 62} ${i < stacks ? 262 : 292})`}>
            <rect width="52" height="22" fill={["#c4511a", "#3e6fa8", "#2d7d62", "#e8a33d", "#8a5a99", "#b5453a"][i]} stroke="#14121a" strokeWidth="2" />
            {i < stacks && <rect y="-22" width="52" height="22" fill={["#3e6fa8", "#e8a33d", "#c4511a", "#2d7d62", "#b5453a", "#8a5a99"][i]} stroke="#14121a" strokeWidth="2" />}
          </g>))}
        {/* gate */}
        <g transform="translate(40 330)">
          <rect width="120" height="70" fill="#f2ecdd" stroke="#14121a" strokeWidth="3" /><rect x="10" y="12" width="40" height="26" fill="#9fb8d0" stroke="#14121a" strokeWidth="2" />
          <rect x="130" y="40" width="110" height="8" fill="#c0392b" stroke="#14121a" strokeWidth="2" transform={`rotate(${ops >= 50 ? -50 : 0} 130 44)`} />
          <circle cx="94" cy="26" r="7" fill={tone(team)} />
        </g>
        {/* server room */}
        <g transform="translate(330 300)">
          <rect width="190" height="100" rx="6" fill="#1f2638" stroke="#14121a" strokeWidth="3" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}><rect x={14 + i * 42} y="12" width="34" height="76" rx="3" fill="#2d3550" />
              {[0, 1, 2, 3, 4].map((j) => <circle key={j} cx={24 + i * 42} cy={24 + j * 14} r="3" fill={j < Math.round(sys / 20) ? "#5fd4a0" : "#d9543f"} className={j >= Math.round(sys / 20) ? "pv-pulse" : ""} />)}</g>))}
          <text x="95" y="-8" textAnchor="middle" fill="#14121a" fontSize="12" fontWeight="700">SERVER ROOM</text>
        </g>
        <text x="100" y="322" textAnchor="middle" fill="#14121a" fontSize="12" fontWeight="700">GATE</text>
        {/* customers */}
        <g transform="translate(230 340)"><rect width="70" height="54" fill="#fbf8f0" stroke="#14121a" strokeWidth="2" /><text x="35" y="22" textAnchor="middle" fontSize="10" fill="#14121a" fontWeight="700">CUSTOMERS</text>
          <rect x="8" y="32" width="54" height="8" rx="4" fill="#e6dcc6" /><rect x="8" y="32" width={cust * 0.54} height="8" rx="4" fill={tone(cust)} /></g>
      </svg>
      <figcaption className="bh-cap">A composite, fictional terminal. The picture follows the day's meters.</figcaption>
    </figure>
  );
}

export function TerminalStage({ scene, decision }: { scene: Scene; decision: ReactNode }) {
  return (
    <div className="bh-layout tm-layout">
      <aside className="bh-aside" aria-label="Terminal board">
        <TerminalScene scene={scene} />
        <section className="sim-meters sm-grid" aria-label="Indicators">{scene.meters.map((m) => <MeterBar key={m.id} m={m} />)}</section>
      </aside>
      <div className="bh-main">{decision}</div>
    </div>
  );
}
