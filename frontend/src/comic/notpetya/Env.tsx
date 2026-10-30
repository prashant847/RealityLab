import type { ReactNode } from "react";
import { INK } from "./Cast";
import { Shot, type ShotId } from "./Shots";

// Environments for the NotPetya story, in the same language as the cast: one dark outline, solid fills, no gradients.
// Every room fills a 1600 x 900 frame. A standing person is PERSON_UNITS tall in this frame with the feet on FLOOR_Y, so doors, desks and trucks are drawn to that scale.

export const PERSON_UNITS = 340;
export type EnvId = "warehouse_floor" | "control_room" | "electrical_area" | "loading_dock" | "ops_office" | "hospital_corridor" | "flooded_highway" | "alt_depot" | "press_scene";
export const ENV_IDS: EnvId[] = ["warehouse_floor", "control_room", "electrical_area", "loading_dock", "ops_office", "hospital_corridor", "flooded_highway", "alt_depot", "press_scene"];
/** What each (unchanged) backend environment id shows in this story. */
export const ENV_NAMES: Record<EnvId, string> = {
  warehouse_floor: "The open-plan office", control_room: "The server room", electrical_area: "The terminal quay", loading_dock: "The terminal gate",
  ops_office: "The operations centre", hospital_corridor: "The customer service floor", flooded_highway: "The road to the terminal", alt_depot: "The recovery room", press_scene: "The communications room",
};
export const FLOOR_Y: Record<EnvId, number> = { warehouse_floor: 800, control_room: 800, electrical_area: 800, loading_dock: 800, ops_office: 800, hospital_corridor: 800, flooded_highway: 800, alt_depot: 800, press_scene: 800 };
export const DESK_ENVS: EnvId[] = [];

export const P = {
  wall: "#2c3552", wall2: "#38425f", floor: "#1b2136", floor2: "#232a44", metal: "#4a5578", metalDark: "#353d5c", white: "#e9ecf2", glass: "#6f8fb4",
  red: "#c4423a", green: "#3f9a78", blue: "#4b7fb4", orange: "#e2862a", yellow: "#f2c230", teal: "#3f8f86", paper: "#e8e4d4", screenOff: "#0d101a",
};
const ln = { stroke: INK, strokeWidth: 4, strokeLinejoin: "round" as const };
const Frame = ({ children, label }: { children: ReactNode; label: string }) => <svg className="vscene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>{children}</svg>;
const Floor = ({ y = 600, c = P.floor }: { y?: number; c?: string }) => <g><rect y={y} width="1600" height={900 - y} fill={c} /><path d={`M0 ${y} H1600`} stroke={INK} strokeWidth="4" /></g>;
const Wall = ({ h = 600, c = P.wall }: { h?: number; c?: string }) => <rect width="1600" height={h} fill={c} />;
const Light = ({ x, w = 220 }: { x: number; w?: number }) => <rect x={x} y="36" width={w} height="34" rx="8" fill="#4a5578" {...ln} />;

/** A monitor seen from the front. state: off | alert | ok. */
function Monitor({ x, y, s = 1, state = "off" }: { x: number; y: number; s?: number; state?: "off" | "alert" | "ok" }) {
  const bg = state === "alert" ? "#7d2a2a" : state === "ok" ? "#1f4e6e" : P.screenOff;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="0" y="0" width="190" height="120" rx="8" fill={bg} {...ln} />
      <rect x="82" y="120" width="26" height="22" fill={P.metalDark} {...ln} /><rect x="50" y="140" width="90" height="12" rx="4" fill={P.metal} {...ln} />
      {state === "alert" && <path d="M30 36 H130 M30 62 H160 M30 88 H110" stroke="#ff9a8a" strokeWidth="9" strokeLinecap="round" />}
      {state === "ok" && <path d="M30 36 H130 M30 62 H100" stroke="#8fd0f0" strokeWidth="9" strokeLinecap="round" />}
    </g>
  );
}
const Desk = ({ x, y, w = 330 }: { x: number; y: number; w?: number }) => <g><rect x={x} y={y} width={w} height="26" rx="5" fill={P.metal} {...ln} /><rect x={x + 14} y={y + 26} width="16" height="90" fill={P.metalDark} {...ln} /><rect x={x + w - 30} y={y + 26} width="16" height="90" fill={P.metalDark} {...ln} /></g>;

function Truck({ x, y, s = 1, priority = false }: { x: number; y: number; s?: number; priority?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="0" y="-170" width="200" height="170" fill="#eef0f4" {...ln} /><rect x="0" y="-40" width="200" height="22" fill={priority ? P.red : P.blue} />
      <rect x="200" y="-120" width="90" height="120" fill={P.orange} {...ln} /><rect x="216" y="-104" width="50" height="46" fill="#9fd0e8" {...ln} />
      <rect x="-6" y="-12" width="302" height="22" fill={P.metalDark} {...ln} /><circle cx="60" cy="16" r="30" fill="#2a2a36" {...ln} /><circle cx="230" cy="16" r="30" fill="#2a2a36" {...ln} />
      {priority && <path d="M70 -130 h60 v60 h-60 z M100 -118 v36 M82 -100 h36" fill="#fff" stroke={INK} strokeWidth="5" />}
    </g>
  );
}
function Crate({ x, y, w = 150, h = 70, c = P.blue }: { x: number; y: number; w?: number; h?: number; c?: string }) {
  return <g><rect x={x} y={y} width={w} height={h} fill={c} {...ln} />{[1, 2, 3, 4].map((i) => <path key={i} d={`M${x + (w / 5) * i} ${y + 6} V${y + h - 6}`} stroke={INK} strokeOpacity="0.35" strokeWidth="3" />)}</g>;
}
const BOX = [P.red, P.teal, P.yellow, P.blue, P.orange];

// ------------------------------------------------------------------------------------------------------------ rooms
function OpenOffice({ alert }: { alert: number }) {
  return (
    <Frame label="An open-plan office. Monitors are dark or showing a red message.">
      <Wall h={560} /><Floor y={560} />
      {[100, 520, 940, 1360].map((x) => <Light key={x} x={x} />)}
      <rect x="60" y="120" width="1480" height="270" fill={P.wall2} {...ln} />{[320, 660, 1000, 1340].map((x) => <path key={x} d={`M${x} 120 V390`} stroke={INK} strokeWidth="4" />)}
      {[0, 1, 2, 3, 4].map((i) => <g key={i}><Desk x={90 + i * 300} y={440} w={260} /><Monitor x={110 + i * 300} y={352} s={0.62} state={(i * 7 + alert) % 3 === 0 ? "alert" : "off"} /></g>)}
      {[0, 1, 2].map((i) => <g key={i}><Desk x={190 + i * 520} y={640} w={380} /><Monitor x={230 + i * 520} y={530} s={0.85} state={(i * 5 + alert) % 3 === 0 ? "alert" : "off"} /></g>)}
    </Frame>
  );
}

function ServerRoom({ alert }: { alert: boolean }) {
  return (
    <Frame label="A server room: tall racks with status lights.">
      <Wall h={640} c="#262d48" /><Floor y={640} c="#161b2c" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const x = 60 + i * 250;
        return (
          <g key={i}>
            <rect x={x} y="110" width="220" height="540" fill={P.metalDark} {...ln} />
            {[0, 1, 2, 3, 4, 5, 6].map((k) => (
              <g key={k}><rect x={x + 14} y={130 + k * 70} width="192" height="52" fill="#171b2c" {...ln} /><circle cx={x + 38} cy={156 + k * 70} r="8" fill={alert && (i + k) % 3 === 0 ? P.red : (i + k) % 4 === 0 ? P.yellow : "#2c4f43"} stroke={INK} strokeWidth="2.5" /><path d={`M${x + 70} ${156 + k * 70} H${x + 180}`} stroke="#3a4468" strokeWidth="6" /></g>
            ))}
          </g>
        );
      })}
      <Light x={380} w={300} /><Light x={900} w={300} />
    </Frame>
  );
}

function Quay() {
  return (
    <Frame label="A container terminal quay: idle cranes, stacked containers, a clipboard table.">
      <rect width="1600" height="900" fill="#2d3a5c" />
      <rect y="360" width="1600" height="110" fill="#263250" /><path d="M0 360 H1600" stroke={INK} strokeWidth="4" />
      <Floor y={470} c="#3a4262" />
      {[220, 1000].map((x) => (
        <g key={x}>
          <path d={`M${x} 470 V100 H${x + 440} V470`} fill="none" stroke={INK} strokeWidth="26" strokeLinejoin="round" /><path d={`M${x} 470 V100 H${x + 440} V470`} fill="none" stroke={P.orange} strokeWidth="16" strokeLinejoin="round" />
          <rect x={x - 30} y="90" width="500" height="30" fill={P.orange} {...ln} /><rect x={x + 180} y="120" width="70" height="56" fill="#bf6d1c" {...ln} />
        </g>
      ))}
      {[0, 1, 2, 3].map((i) => <Crate key={`a${i}`} x={620 + i * 150} y={400} c={BOX[i]} />)}{[0, 1, 2].map((i) => <Crate key={`b${i}`} x={680 + i * 150} y={330} c={BOX[(i + 2) % 5]} />)}
      <g transform="translate(120 560)"><rect x="0" y="0" width="300" height="20" rx="4" fill={P.metal} {...ln} /><rect x="20" y="20" width="14" height="150" fill={P.metalDark} {...ln} /><rect x="266" y="20" width="14" height="150" fill={P.metalDark} {...ln} />
        <rect x="40" y="-34" width="90" height="34" fill={P.paper} {...ln} /><rect x="150" y="-26" width="70" height="26" fill={P.paper} {...ln} /></g>
    </Frame>
  );
}

function Gate() {
  return (
    <Frame label="The terminal gate: a barrier, a gatehouse and trucks waiting.">
      <rect width="1600" height="900" fill="#2d3a5c" /><rect y="300" width="1600" height="170" fill="#263250" /><path d="M0 300 H1600" stroke={INK} strokeWidth="4" />
      {[0, 1, 2].map((i) => <Crate key={i} x={80 + i * 160} y={250} c={BOX[i]} />)}{[0, 1].map((i) => <Crate key={i} x={120 + i * 160} y={180} c={BOX[i + 2]} />)}
      {[0, 1, 2, 3].map((i) => <Crate key={`r${i}`} x={1060 + (i % 2) * 160} y={250 - Math.floor(i / 2) * 70} c={BOX[(i + 1) % 5]} />)}
      <Floor y={470} c="#3a4262" />
      <path d="M0 470 L1600 470" stroke="#2f3756" strokeWidth="3" /><path d="M620 470 L560 900 M980 470 L1040 900" stroke="#5a648a" strokeWidth="8" strokeDasharray="30 24" />
      <rect x="640" y="372" width="320" height="22" fill={P.metalDark} {...ln} />
      <rect x="520" y="330" width="130" height="150" fill={P.white} {...ln} /><rect x="548" y="360" width="76" height="46" fill="#2a3150" {...ln} /><path d="M502 332 H668 L650 306 H520 Z" fill="#b8bfce" {...ln} />
      <rect x="960" y="380" width="14" height="90" fill={P.metalDark} {...ln} /><rect x="640" y="380" width="14" height="90" fill={P.metalDark} {...ln} />
    </Frame>
  );
}

function Road() {
  return (
    <Frame label="The road to the terminal: a line of trucks waiting at a closed barrier.">
      <rect width="1600" height="900" fill="#2d3a5c" /><rect y="360" width="1600" height="120" fill="#263250" /><path d="M0 360 H1600" stroke={INK} strokeWidth="4" />
      {[0, 1, 2, 3, 4].map((i) => <Crate key={i} x={940 + i * 130} y={300} w={120} h={60} c={BOX[i]} />)}
      <polygon points="0,900 1600,900 1060,470 540,470" fill="#222a44" {...ln} />
      <path d="M800 470 L800 900" stroke="#9aa4c8" strokeWidth="10" strokeDasharray="40 36" />
      <rect x="560" y="440" width="480" height="20" fill={P.red} {...ln} /><rect x="540" y="430" width="22" height="60" fill={P.metalDark} {...ln} /><rect x="1040" y="430" width="22" height="60" fill={P.metalDark} {...ln} />
    </Frame>
  );
}

function OpsCentre() {
  return (
    <Frame label="An operations centre: wall screens, a long table and a whiteboard.">
      <Wall h={600} /><Floor y={600} />
      {[0, 1, 2].map((i) => <g key={i}><rect x={120 + i * 330} y="110" width="300" height="190" rx="8" fill={i === 1 ? "#7d2a2a" : "#1f3b5c"} {...ln} /><path d={`M${150 + i * 330} 160 H${380 + i * 330} M${150 + i * 330} 200 H${340 + i * 330} M${150 + i * 330} 240 H${300 + i * 330}`} stroke={i === 1 ? "#ff9a8a" : "#8fd0f0"} strokeWidth="9" strokeLinecap="round" /></g>)}
      <rect x="1140" y="110" width="360" height="300" fill={P.white} {...ln} /><rect x="1140" y="410" width="360" height="12" fill={P.metal} {...ln} />
      <rect x="130" y="620" width="860" height="34" rx="6" fill="#6a4f33" {...ln} /><rect x="170" y="654" width="20" height="100" fill={P.metalDark} {...ln} /><rect x="930" y="654" width="20" height="100" fill={P.metalDark} {...ln} />
      <Light x={300} w={300} /><Light x={900} w={300} />
    </Frame>
  );
}

function CustomerFloor() {
  return (
    <Frame label="A customer service floor: rows of desks with phones, partition panels and a wall clock.">
      <Wall h={580} /><Floor y={580} />
      <circle cx="800" cy="170" r="84" fill={P.white} {...ln} /><path d="M800 170 V116 M800 170 L840 190" stroke={INK} strokeWidth="8" strokeLinecap="round" />
      {[0, 1, 2, 3].map((i) => <g key={i}><rect x={80 + i * 400} y="260" width="300" height="190" rx="6" fill={P.wall2} {...ln} /><Desk x={100 + i * 400} y={450} w={260} /><rect x={150 + i * 400} y={400} width="60" height="50" rx="8" fill="#2a2a36" {...ln} /><circle cx={290 + i * 400} cy="420" r="14" fill={i % 2 ? P.red : P.yellow} {...ln} /></g>)}
      {[0, 1].map((i) => <g key={i}><Desk x={200 + i * 700} y={650} w={380} /><rect x={260 + i * 700} y={596} width="64" height="54" rx="8" fill="#2a2a36" {...ln} /></g>)}
      <Light x={300} w={300} /><Light x={1000} w={300} />
    </Frame>
  );
}

function RecoveryRoom() {
  return (
    <Frame label="A recovery room: a long table of laptops being rebuilt and a wall map with offline sites.">
      <Wall h={600} c="#262d48" /><Floor y={600} c="#161b2c" />
      <rect x="120" y="100" width="560" height="320" rx="8" fill="#1f3b5c" {...ln} />
      {[[220, 220], [360, 170], [470, 300], [580, 220], [300, 330]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="16" fill={i === 2 ? "#2a2a36" : P.green} {...ln} />)}
      <path d="M220 220 L360 170 L580 220 L470 300 L300 330 Z" fill="none" stroke="#8fd0f0" strokeWidth="4" strokeDasharray="14 10" />
      <rect x="760" y="110" width="400" height="260" fill={P.white} {...ln} />
      {[0, 1, 2, 3, 4, 5].map((i) => <g key={i}><rect x={100 + i * 240} y="700" width="200" height="24" rx="5" fill={P.metal} {...ln} /><path d={`M${130 + i * 240} 700 L${150 + i * 240} 640 H${270 + i * 240} L${290 + i * 240} 700 Z`} fill="#171b2c" {...ln} /><rect x={160 + i * 240} y="654" width="100" height="40" fill={i % 3 === 0 ? "#1f4e6e" : P.screenOff} /></g>)}
      <rect x="60" y="720" width="1480" height="26" rx="6" fill="#6a4f33" {...ln} />
      <Light x={620} w={300} />
    </Frame>
  );
}

function CommsRoom() {
  return (
    <Frame label="A communications room: a podium with a microphone, a desk phone and a screen with a headline.">
      <Wall h={600} /><Floor y={600} />
      <rect x="520" y="90" width="560" height="300" rx="8" fill="#14283f" {...ln} /><rect x="560" y="140" width="400" height="26" fill={P.red} /><path d="M560 210 H1010 M560 250 H940 M560 290 H880" stroke="#8fd0f0" strokeWidth="10" strokeLinecap="round" />
      <rect x="120" y="150" width="260" height="190" fill={P.wall2} {...ln} /><rect x="1230" y="150" width="260" height="190" fill={P.wall2} {...ln} />
      <g transform="translate(800 790)"><rect x="-130" y="-200" width="260" height="200" fill="#3a4262" {...ln} /><rect x="-118" y="-190" width="236" height="16" fill={P.metal} {...ln} /><rect x="-6" y="-300" width="12" height="100" fill={P.metalDark} {...ln} /><rect x="-26" y="-326" width="52" height="34" rx="14" fill="#2a2a36" {...ln} /></g>
      <Light x={340} w={300} /><Light x={960} w={300} />
    </Frame>
  );
}

// ------------------------------------------------------------------------------------------------------------ effects and props
export function NpFx({ ids }: { ids: string[] }) {
  const has = (k: string) => ids.includes(k);
  return (
    <svg className="vscene vscene--fx" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {has("power_failure") && <rect width="1600" height="900" fill="#0d101a" opacity="0.32" />}
      {has("emergency_lighting") && <g><rect width="1600" height="900" fill="#c24f1c" opacity="0.08" />{[120, 1480].map((x) => <g key={x}><circle cx={x} cy="90" r="40" fill="#f08a2c" {...ln} /><circle cx={x} cy="90" r="16" fill={P.yellow} /></g>)}</g>}
      {has("warning_lights") && [60, 1540].map((x) => <g key={x}><circle cx={x} cy="70" r="34" fill={P.red} opacity="0.55" /><circle cx={x} cy="70" r="16" fill={P.yellow} {...ln} /></g>)}
      {has("damaged_inventory") && <g><g transform="translate(220 780) rotate(-14)"><Crate x={0} y={0} w={130} h={80} c={P.orange} /></g><g transform="translate(420 810) rotate(12)"><Crate x={0} y={0} w={110} h={70} c={P.red} /></g></g>}
      {has("system_alert") && <g transform="translate(1470 60)"><path d="M40 0 L80 70 H0 Z" fill={P.yellow} {...ln} /><rect x="36" y="22" width="8" height="26" fill={INK} /><rect x="36" y="54" width="8" height="8" fill={INK} /></g>}
    </svg>
  );
}

const Tag = ({ x, y, c, mark }: { x: number; y: number; c: string; mark: "x" | "tick" | "q" }) => (
  <g><rect x={x} y={y} width="40" height="50" rx="5" fill={c} {...ln} />
    {mark === "x" && <path d={`M${x + 10} ${y + 12} l20 26 M${x + 30} ${y + 12} l-20 26`} stroke="#fff" strokeWidth="6" strokeLinecap="round" />}
    {mark === "tick" && <path d={`M${x + 8} ${y + 26} l10 12 l16 -22`} stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" />}
    {mark === "q" && <text x={x + 20} y={y + 37} textAnchor="middle" fontSize="30" fontWeight="800" fill={INK} fontFamily="Arial, sans-serif">?</text>}</g>
);
const TAGS: [number, number][] = [[100, 262], [260, 262], [420, 262], [140, 192], [300, 192], [1080, 262], [1240, 262], [1080, 192], [1240, 192]];
const Note = ({ x, y, c }: { x: number; y: number; c: string }) => <g transform={`rotate(${(x % 7) - 3} ${x} ${y})`}><rect x={x} y={y} width="62" height="52" fill={c} {...ln} /><path d={`M${x + 10} ${y + 18} H${x + 50} M${x + 10} ${y + 32} H${x + 40}`} stroke={INK} strokeOpacity="0.5" strokeWidth="4" /></g>;
const NOTE_AT: [number, number][] = [[1170, 140], [1250, 150], [1340, 140], [1420, 160], [1180, 230], [1270, 240], [1360, 230], [1430, 260], [1200, 320]];

export const PROPS: Record<string, () => ReactNode> = {
  cables_cut: () => <g>{[[300, 700, 540, 760], [620, 730, 900, 700], [980, 740, 1240, 780]].map(([a, b, c, d], i) => <g key={i}><path d={`M${a} ${b} Q${(a + c) / 2} ${b + 36} ${c} ${d}`} stroke={INK} strokeWidth="14" fill="none" strokeLinecap="round" /><path d={`M${a} ${b} Q${(a + c) / 2} ${b + 36} ${c} ${d}`} stroke={P.metal} strokeWidth="8" fill="none" strokeLinecap="round" /><circle cx={c} cy={d} r="12" fill={P.yellow} {...ln} /></g>)}</g>,
  staged_recovery: () => <g>{[[300, 150], [640, 150], [980, 150]].map(([x, y], i) => <g key={i}><rect x={x} y={y + 150} width="226" height="22" rx="6" fill={INK} /><rect x={x + 3} y={y + 153} width={50 + i * 55} height="16" rx="4" fill={P.green} /></g>)}</g>,
  rush_restore: () => <g>{[[300, 150], [640, 150], [980, 150]].map(([x, y], i) => <g key={i}><rect x={x} y={y + 124} width="226" height="46" fill={P.red} {...ln} /><path d={`M${x + 113} ${y + 130} l22 34 h-44 z`} fill={P.yellow} stroke={INK} strokeWidth="3" /></g>)}</g>,
  account_locked: () => <g transform="translate(1040 150)"><rect x="-60" y="30" width="120" height="96" rx="12" fill={P.yellow} {...ln} /><path d="M-34 30 v-34 a34 34 0 0 1 68 0 v34" fill="none" stroke={INK} strokeWidth="14" /><path d="M-34 30 v-34 a34 34 0 0 1 68 0 v34" fill="none" stroke={P.yellow} strokeWidth="7" /><circle cx="0" cy="74" r="12" fill={INK} /></g>,
  tape_barrier: () => <g>{[460, 1140].map((x) => <g key={x}><rect x={x - 8} y="610" width="16" height="190" fill={P.metalDark} {...ln} /><circle cx={x} cy="606" r="16" fill={P.orange} {...ln} /></g>)}<path d="M452 660 L1148 690 V726 L452 696 Z" fill={P.yellow} {...ln} />{Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${470 + i * 58} ${664 + i * 2.2} l22 1 l-14 34 l-22 -1 z`} fill={INK} />)}</g>,
  cones: () => <g>{[[430, 790, 1], [1170, 790, 0.9], [830, 820, 0.8]].map(([x, y, s], i) => <g key={i} transform={`translate(${x} ${y}) scale(${s})`}><rect x="-34" y="-8" width="68" height="14" fill="#c24f1c" {...ln} /><path d="M-26 -8 L-8 -112 H8 L26 -8 Z" fill={P.orange} {...ln} /><rect x="-16" y="-66" width="32" height="14" fill="#fff" /></g>)}</g>,
  hold_tags: () => <g>{TAGS.map(([x, y], i) => <Tag key={i} x={x} y={y} c={P.red} mark="x" />)}</g>,
  verified_tags: () => <g>{TAGS.map(([x, y], i) => <Tag key={i} x={x} y={y} c={P.green} mark="tick" />)}</g>,
  provisional_tags: () => <g>{TAGS.map(([x, y], i) => <Tag key={i} x={x} y={y} c={P.yellow} mark="q" />)}</g>,
  effort_small: () => <g>{NOTE_AT.slice(0, 2).map(([x, y], i) => <Note key={i} x={x} y={y} c="#f2d46a" />)}</g>,
  effort_medium: () => <g>{NOTE_AT.slice(0, 5).map(([x, y], i) => <Note key={i} x={x} y={y} c={i % 2 ? "#9fd0a8" : "#f2d46a"} />)}</g>,
  effort_large: () => <g>{NOTE_AT.map(([x, y], i) => <Note key={i} x={x} y={y} c={["#f2d46a", "#9fd0a8", "#f2a8a0"][i % 3]} />)}</g>,
  extra_trucks: () => <g><Truck x={-420} y={800} s={2.2} /></g>,
  detour_sign: () => <g transform="translate(260 540)"><rect x="-8" y="0" width="16" height="260" fill={P.metalDark} {...ln} /><rect x="-90" y="-110" width="180" height="120" rx="10" fill={P.yellow} {...ln} /><path d="M-50 -60 H30 M10 -86 l36 26 l-36 26" stroke={INK} strokeWidth="14" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>,
  priority_truck: () => <Truck x={-420} y={800} s={2.2} priority />,
  order_sheets: () => <g transform="translate(800 790)">{[0, 1, 2].map((i) => <g key={i} transform={`rotate(${-6 + i * 6} ${i * 30} 0)`}><rect x={-100 + i * 70} y="-110" width="100" height="130" fill={P.paper} {...ln} /><path d={`M${-84 + i * 70} -84 h64 M${-84 + i * 70} -64 h50`} stroke={INK} strokeOpacity="0.5" strokeWidth="5" /></g>)}</g>,
  split_pallets: () => <g><rect x="450" y="760" width="260" height="22" fill="#8a6a3a" {...ln} /><Crate x={470} y={690} w={110} h={70} c={P.red} /><Crate x={600} y={700} w={100} h={60} c={P.blue} /><rect x="900" y="760" width="260" height="22" fill="#8a6a3a" {...ln} /><Crate x={920} y={690} w={110} h={70} c={P.teal} /><Crate x={1050} y={700} w={100} h={60} c={P.yellow} /></g>,
  stop_sign: () => <g transform="translate(1260 540)"><rect x="-8" y="40" width="16" height="230" fill={P.metalDark} {...ln} /><polygon points="-44,-18 44,-18 82,18 82,100 44,136 -44,136 -82,100 -82,18" fill={P.red} {...ln} transform="scale(0.9)" /><rect x="-56" y="52" width="112" height="14" fill="#fff" /></g>,
  podium: () => <g transform="translate(800 790)"><rect x="-120" y="-130" width="240" height="130" fill="#3a4262" {...ln} /></g>,
  empty_podium: () => <g transform="translate(800 790)"><rect x="-120" y="-130" width="240" height="130" fill="#3a4262" {...ln} /><rect x="-90" y="-100" width="180" height="60" fill={INK} opacity="0.35" /></g>,
  statement_card: () => <g transform="translate(800 790)"><rect x="-120" y="-130" width="240" height="130" fill="#3a4262" {...ln} /><rect x="-70" y="-168" width="140" height="64" fill={P.paper} {...ln} /><path d="M-52 -148 h96 M-52 -128 h70" stroke={INK} strokeOpacity="0.5" strokeWidth="5" /></g>,
  loaded_truck: () => <g><Truck x={470} y={800} s={2.2} /></g>,
};

export function NpProps({ ids }: { ids: string[] }) {
  return <svg className="vscene vscene--fx" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">{ids.map((id) => <g key={id}>{PROPS[id]?.()}</g>)}</svg>;
}

/** The evidence board: one row per known fact, in the same outline style. */
export function EvidenceBoard({ facts }: { facts: string[] }) {
  const rows = facts.filter((f) => !/budget|effort points|₹|lakh/i.test(f)).slice(0, 4);
  const sev = (t: string) => (/offline|not responding|down|failed|blocked|stuck|damage|reinfect|shortage|overstated|penalty|dark/i.test(t) ? P.red : /unknown|unusual|suspicious|unverified|uncertain|may|risk|not confirmed/i.test(t) ? P.yellow : P.green);
  return (
    <Frame label={`Evidence board. ${rows.join(" ")}`}>
      <rect width="1600" height="900" fill="#4a5578" /><rect y="740" width="1600" height="160" fill="#262d48" /><path d="M0 740 H1600" stroke={INK} strokeWidth="4" />
      <rect x="220" y="60" width="1160" height="650" rx="26" fill="#10131c" {...ln} /><rect x="252" y="92" width="1096" height="586" rx="8" fill="#1d2748" {...ln} /><rect x="252" y="92" width="1096" height="72" fill="#2a3668" {...ln} />
      <text x="290" y="141" fontSize="34" fontWeight="800" fill="#fff" fontFamily="Bahnschrift, 'Arial Narrow', Arial, sans-serif" letterSpacing="3">WHAT WE KNOW</text>
      {rows.map((t, i) => {
        const y = 184 + i * 122, c = sev(t), lines = t.match(/.{1,58}(\s|$)/g)?.slice(0, 3) ?? [t];
        return <g key={i}><rect x="290" y={y} width="1020" height="110" rx="12" fill="#2a3270" {...ln} /><rect x="290" y={y} width="20" height="110" fill={c} {...ln} /><circle cx="364" cy={y + 55} r="26" fill={c} {...ln} />{lines.map((l, k) => <text key={k} x="420" y={y + 36 + k * 30 + (lines.length < 3 ? 8 : 0)} fontSize="25" fontWeight={k ? 400 : 700} fill="#fff" fontFamily="Arial, sans-serif">{l.trim()}</text>)}</g>;
      })}
      <rect x="740" y="710" width="120" height="30" fill="#4a5578" {...ln} />
    </Frame>
  );
}

/** Draws one environment with story props and page effects on top. `seed` and `round` vary small details (which monitors show red) so a room does not look identical twice. */
export function NpEnv({ env, props = [], effects = [], facts = [], board = false, shot, seed = 0, round = 0 }: { env: EnvId; props?: string[]; effects?: string[]; facts?: string[]; board?: boolean; shot?: ShotId; seed?: number; round?: number }) {
  if (shot) return <>{<Shot id={shot} />}{effects.length > 0 && <NpFx ids={effects} />}</>;
  const a = (seed + round) % 3;
  const base = board ? <EvidenceBoard facts={facts} /> : env === "warehouse_floor" ? <OpenOffice alert={a} /> : env === "control_room" ? <ServerRoom alert={effects.includes("system_alert") || props.includes("rush_restore")} /> :
    env === "electrical_area" ? <Quay /> : env === "loading_dock" ? <Gate /> : env === "ops_office" ? <OpsCentre /> : env === "hospital_corridor" ? <CustomerFloor /> :
    env === "flooded_highway" ? <Road /> : env === "alt_depot" ? <RecoveryRoom /> : <CommsRoom />;
  return <>{base}{!board && props.length > 0 && <NpProps ids={props} />}{!board && effects.length > 0 && <NpFx ids={effects} />}</>;
}
