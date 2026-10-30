import type { ReactNode } from "react";
import { F, FlatControlRoom, FlatOffice, FlatTerminal, FlatWarehouse } from "./Scenes";

/** World scale: a standing person is about this many scene units tall. Doors, racks, crates and vehicles are drawn to match; the camera zooms the room so people and rooms stay in proportion. */
export const PERSON_UNITS = 340;

// The rest of the flat world: every environment the story uses, the effect overlays, and the story props that make the world change with
// the player's choices. Everything is solid colour blocks in the same palette, drawn in a 1600 x 900 frame (no outlines, glows or perspective).

export type EnvId = "warehouse_floor" | "control_room" | "electrical_area" | "loading_dock" | "ops_office" | "hospital_corridor" | "flooded_highway" | "alt_depot" | "press_scene";
export const FLOOR_Y: Record<EnvId, number> = { warehouse_floor: 790, control_room: 0, electrical_area: 790, loading_dock: 790, ops_office: 0, hospital_corridor: 790, flooded_highway: 700, alt_depot: 790, press_scene: 790 };
/** Rooms where people stand behind a desk drawn in front of them. */
export const DESK_ENVS: EnvId[] = ["control_room", "ops_office"];

const Frame = ({ children, label }: { children: ReactNode; label: string }) => <svg className="vscene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>{children}</svg>;
const Floor = ({ y = 700, c = F.floor }: { y?: number; c?: string }) => <g><rect y={y} width="1600" height={900 - y} fill={c} /><rect y={y} width="1600" height="14" fill={F.floorLight} /></g>;
const Cone = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => <g transform={`translate(${x} ${y}) scale(${s})`}><rect x="-34" y="-8" width="68" height="14" fill="#c24f1c" /><path d="M-26 -8 L-8 -112 H8 L26 -8 Z" fill="#f08a2c" /><rect x="-18" y="-66" width="36" height="14" fill={F.white} /></g>;
const Crate = ({ x, y, w = 110, h = 80, c = F.box, cross = false }: { x: number; y: number; w?: number; h?: number; c?: string; cross?: boolean }) => (
  <g><rect x={x} y={y} width={w} height={h} fill={c} /><rect x={x} y={y} width={w} height="12" fill="#ffffff" opacity="0.25" />
    {cross && <g><rect x={x + w / 2 - 15} y={y + h / 2 - 15} width="30" height="30" fill={F.white} /><path d={`M${x + w / 2} ${y + h / 2 - 10} v20 M${x + w / 2 - 10} ${y + h / 2} h20`} stroke={F.red} strokeWidth="7" /></g>}</g>
);
const Truck = ({ x, y, s = 1, cross = false, beacon = false }: { x: number; y: number; s?: number; cross?: boolean; beacon?: boolean }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="0" y="-150" width="250" height="150" fill="#f4f6fb" /><rect x="0" y="-40" width="250" height="24" fill="#5b6ab8" /><rect x="250" y="-110" width="90" height="110" fill="#e0a92e" /><rect x="266" y="-96" width="52" height="44" fill="#2b3068" />
    <rect x="-6" y="-12" width="352" height="24" fill="#3b4672" /><circle cx="70" cy="14" r="30" fill="#14183a" /><circle cx="70" cy="14" r="12" fill="#8890b5" /><circle cx="280" cy="14" r="30" fill="#14183a" /><circle cx="280" cy="14" r="12" fill="#8890b5" />
    {cross && <g><rect x="95" y="-112" width="60" height="60" fill={F.white} /><path d="M125 -102 v40 M105 -82 h40" stroke={F.red} strokeWidth="12" /></g>}
    {beacon && <rect x="290" y="-124" width="30" height="14" rx="5" fill={F.lamp} />}
  </g>
);

// ---------------------------------------------------------------------------------------------------------------- environments
function Electrical() {
  return (
    <Frame label="The electrical room: six switchgear cabinets, panel 4 marked with a hazard sign, hazard stripes on the floor.">
      <rect width="1600" height="900" fill={F.wall} /><rect width="1600" height="150" fill={F.ceiling} /><rect y="60" width="1600" height="26" fill="#2c3170" /><rect y="104" width="1600" height="14" fill="#2c3170" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const x = 90 + i * 240, hot = i === 3;
        return (
          <g key={i}>
            <rect x={x} y="190" width="210" height="500" fill={hot ? "#3a2b4f" : "#2b3068"} /><rect x={x + 16} y="212" width="178" height="150" fill={F.ink} />
            {[0, 1, 2, 3].map((k) => <rect key={k} x={x + 34 + k * 40} y="240" width="22" height="22" fill={hot && k === 1 ? F.red : k % 2 ? F.lamp : "#4aa37a"} />)}
            <rect x={x + 34} y="300" width="140" height="10" fill="#3c4496" /><rect x={x + 34} y="324" width="100" height="10" fill="#3c4496" />
            <rect x={x + 16} y="390" width="178" height="230" fill="#242a5c" />{[0, 1, 2, 3, 4].map((k) => <rect key={k} x={x + 16} y={410 + k * 42} width="178" height="8" fill={F.ink} />)}
            <rect x={x + 72} y="636" width="66" height="40" fill={F.lamp} /><text x={x + 105} y="668" textAnchor="middle" fontSize="30" fontWeight="800" fill={F.ink} fontFamily="Arial, sans-serif">{i + 1}</text>
            {hot && <g><path d={`M${x + 105} 40 l60 100 h-120 z`} fill={F.lamp} transform="translate(0 146)" /><rect x={x + 100} y="226" width="10" height="42" fill={F.ink} /><rect x={x + 100} y="276" width="10" height="10" fill={F.ink} /></g>}
          </g>
        );
      })}
      <Floor y={700} />
      {Array.from({ length: 36 }, (_, i) => <polygon key={i} points={`${i * 46},724 ${i * 46 + 26},724 ${i * 46 + 6},758 ${i * 46 - 20},758`} fill={i % 2 ? "#14183a" : "#d9a62e"} />)}
      <ellipse cx="860" cy="836" rx="340" ry="40" fill="#303a82" />
    </Frame>
  );
}

function Dock() {
  return (
    <Frame label="The loading dock: three bays with trucks backed up to the doors, pallets on the apron.">
      <rect width="1600" height="900" fill={F.wall} /><rect width="1600" height="150" fill={F.ceiling} />
      {[0, 1, 2].map((i) => {
        const x = 90 + i * 500;
        return (
          <g key={i}>
            <rect x={x} y="170" width="420" height="500" fill="#2b3068" /><rect x={x + 24} y="194" width="372" height="452" fill={i === 1 ? "#5a63a6" : "#343a7a"} />
            <rect x={x + 44} y="214" width="332" height="420" fill="#8f9acb" />{Array.from({ length: 8 }, (_, k) => <rect key={k} x={x + 44} y={232 + k * 50} width="332" height="6" fill="#7580b8" />)}
            <rect x={x + 30} y="150" width="360" height="30" fill="#3c4496" />
            <circle cx={x + 52} cy="620" r="16" fill={i === 1 ? "#4aa37a" : F.red} /><circle cx={x + 368} cy="620" r="16" fill={i === 1 ? "#4aa37a" : F.red} />
          </g>
        );
      })}
      <Floor y={690} />
      <rect y="690" width="1600" height="26" fill="#d9a62e" />{Array.from({ length: 50 }, (_, i) => <polygon key={i} points={`${i * 36},690 ${i * 36 + 16},690 ${i * 36 - 4},716 ${i * 36 - 20},716`} fill="#14183a" />)}
      <Crate x={160} y={770} w={150} h={110} cross /><Crate x={700} y={790} w={120} h={90} c={F.boxBlue} /><Crate x={1240} y={770} w={150} h={110} cross />
      {[90, 640, 1020, 1500].map((x) => <rect key={x} x={x} y="740" width="28" height="140" rx="8" fill="#d9a62e" />)}
    </Frame>
  );
}

function Hospital() {
  return (
    <Frame label="A hospital corridor, lit and busy: doors, a gurney and a cross sign. The hospital still has power.">
      <rect width="1600" height="900" fill="#5a679a" /><rect width="1600" height="130" fill="#3b4672" />
      {[200, 600, 1000, 1400].map((x) => <rect key={x} x={x} y="56" width="200" height="22" rx="6" fill={F.lit} />)}
      {[80, 480, 880, 1280].map((x, i) => <g key={x}><rect x={x} y="190" width="240" height="460" fill="#3f9aa6" /><rect x={x + 60} y="236" width="120" height="150" fill="#b9e6ea" /><rect x={x + 100} y="460" width="40" height="14" fill="#2b6a74" />{i === 1 && <g><rect x={x + 70} y="140" width="100" height="40" fill={F.white} /><path d={`M${x + 120} 146 v28 M${x + 106} 160 h28`} stroke={F.red} strokeWidth="9" /></g>}</g>)}
      <rect y="640" width="1600" height="260" fill="#6c78ab" /><rect y="640" width="1600" height="14" fill="#8993c4" /><rect y="760" width="1600" height="16" fill="#b9bfe0" />
      <g transform="translate(1180 760)"><rect x="-170" y="-60" width="340" height="30" rx="6" fill="#dfe4f2" /><rect x="-170" y="-30" width="340" height="18" fill="#8993c4" /><rect x="-150" y="-12" width="12" height="70" fill="#3b4672" /><rect x="138" y="-12" width="12" height="70" fill="#3b4672" /><circle cx="-144" cy="64" r="16" fill="#14183a" /><circle cx="144" cy="64" r="16" fill="#14183a" /></g>
      <g transform="translate(260 700)"><rect x="-8" y="-210" width="14" height="210" fill="#3b4672" /><rect x="-40" y="-230" width="80" height="14" fill="#3b4672" /><rect x="-18" y="-200" width="36" height="64" rx="10" fill="#cfe9f2" /></g>
    </Frame>
  );
}

function Highway({ bare = false }: { bare?: boolean }) {
  return (
    <Frame label="The primary road under water: a flooded highway with guard rails, a gantry sign and a stalled lorry.">
      <rect width="1600" height="900" fill="#2c3270" /><rect y="360" width="1600" height="60" fill="#3b4672" />
      {[100, 360, 1180, 1440].map((x, i) => <g key={i}><rect x={x} y={200 + (i % 2) * 60} width="90" height={160 - (i % 2) * 60} fill="#3b4478" /></g>)}
      <rect x="130" y="110" width="1340" height="120" fill="#1f6b4c" /><rect x="170" y="144" width="480" height="14" fill="#cfeedd" /><rect x="170" y="176" width="340" height="14" fill="#cfeedd" /><rect x="120" y="230" width="22" height="130" fill="#14183a" /><rect x="1458" y="230" width="22" height="130" fill="#14183a" />
      <rect y="420" width="1600" height="480" fill="#3a417f" />
      <rect y="560" width="1600" height="340" fill="#5b6ab8" />
      {Array.from({ length: 16 }, (_, i) => <rect key={i} x={30 + i * 100} y={600 + (i % 3) * 70} width="64" height="8" rx="4" fill="#8d9bde" />)}
      <rect y="470" width="1600" height="16" fill="#8890b5" />{Array.from({ length: 22 }, (_, i) => <rect key={i} x={i * 76} y="470" width="12" height="110" fill="#6b73a3" />)}
      {!bare && <Truck x={680} y={700} s={2.2} beacon />}
      <rect x="0" y="690" width="1600" height="210" fill="#2b2f55" opacity="0" />
    </Frame>
  );
}

function Depot() {
  return (
    <Frame label="The alternate depot: two shelving bays, a backup generator, high windows, painted bay lines and a DEPOT B sign.">
      <rect width="1600" height="900" fill="#5a6a9e" /><rect width="1600" height="170" fill="#3d4878" />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={i * 400} y="0" width="10" height="170" fill="#2c3170" />)}<rect y="150" width="1600" height="20" fill="#2c3170" />
      {[120, 520, 920, 1320].map((x) => <g key={x}><rect x={x} y="190" width="190" height="90" fill="#33397a" /><rect x={x + 10} y="200" width="170" height="70" fill="#1b1f45" /><rect x={x + 94} y="200" width="6" height="70" fill="#33397a" /></g>)}
      <rect x="796" y="0" width="8" height="120" fill="#14183a" /><circle cx="800" cy="140" r="24" fill={F.lamp} />
      {[60, 360].map((x, k) => (
        <g key={x}><rect x={x} y="300" width="14" height="360" fill={F.ink} /><rect x={x + 266} y="300" width="14" height="360" fill={F.ink} />
          {[0, 1, 2].map((r) => <g key={r}><rect x={x} y={380 + r * 100} width="280" height="14" fill={F.rack} /><Crate x={x + 24} y={380 + r * 100 - 62} w={84} h={62} c={(k + r) % 2 ? F.boxDark : F.box} /><Crate x={x + 124} y={380 + r * 100 - 52} w={70} h={52} c={F.boxBlue} cross={r === 1} /></g>)}</g>
      ))}
      <g transform="translate(700 330)"><rect width="200" height="110" rx="8" fill="#e9edf5" /><rect x="12" y="12" width="176" height="86" rx="4" fill="#3c4496" /><text x="100" y="52" textAnchor="middle" fontSize="30" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">DEPOT</text><text x="100" y="86" textAnchor="middle" fontSize="34" fontWeight="800" fill="#f6b13c" fontFamily="Arial, sans-serif">B</text></g>
      <g transform="translate(1160 700)"><rect x="-230" y="-270" width="470" height="270" fill="#3d4a8e" /><rect x="-210" y="-250" width="260" height="230" fill="#2b3068" />{Array.from({ length: 7 }, (_, i) => <rect key={i} x="-210" y={-234 + i * 32} width="260" height="7" fill="#1c2048" />)}<rect x="84" y="-250" width="130" height="86" fill={F.ink} /><rect x="98" y="-236" width="102" height="58" fill="#3a1b30" /><rect x="110" y="-218" width="70" height="10" fill={F.red} />{[0, 1, 2].map((i) => <circle key={i} cx={106 + i * 36} cy="-122" r="12" fill={i === 1 ? F.red : F.lamp} />)}</g>
      <Floor y={700} c="#4d5a8c" />
      {[300, 700, 1100].map((x) => <rect key={x} x={x} y="740" width="10" height="160" fill="#e8b33d" opacity="0.8" />)}<rect y="722" width="1600" height="8" fill="#e8b33d" opacity="0.8" />
    </Frame>
  );
}

function Press() {
  return (
    <Frame label="A newsroom wall of screens carrying the story: a red headline bar and a microphone podium.">
      <rect width="1600" height="900" fill="#3b4672" />
      {[[60, 70], [440, 70], [820, 70], [1200, 70], [60, 330], [1200, 330]].map(([x, y], i) => <g key={i}><rect x={x} y={y} width="340" height="220" fill={F.ink} /><rect x={x + 14} y={y + 14} width="312" height="192" fill="#232a5c" /><rect x={x + 30} y={y + 150} width="280" height="34" fill={F.red} /><rect x={x + 30} y={y + 40} width="130" height="90" fill="#3c4496" /><rect x={x + 180} y={y + 44} width="120" height="10" fill="#7d86c4" /><rect x={x + 180} y={y + 66} width="100" height="10" fill="#7d86c4" /></g>)}
      <rect x="480" y="330" width="640" height="320" fill={F.ink} /><rect x="500" y="350" width="600" height="280" fill="#2a3270" /><rect x="520" y="540" width="560" height="64" fill={F.red} /><rect x="540" y="560" width="400" height="14" fill={F.white} /><rect x="540" y="580" width="280" height="10" fill="#ffd3cc" />
      <circle cx="800" cy="440" r="46" fill="#1c2048" /><path d="M700 540 Q800 450 900 540 V540 H700 Z" fill="#1c2048" />
      <Floor y={700} />
    </Frame>
  );
}

function EvidenceBoard({ facts }: { facts: string[] }) {
  const rows = facts.filter((f) => !/budget|₹|lakh/i.test(f)).slice(0, 4);
  const sev = (t: string) => (/offline|not responding|failed|blocked|flood|smoke|damage|reinfect|shortage|overstated|penalty/i.test(t) ? F.red : /unknown|unusual|suspicious|unverified|uncertain|may|risk/i.test(t) ? F.lamp : F.teal);
  return (
    <Frame label={`Evidence board. ${rows.join(" ")}`}>
      <rect width="1600" height="900" fill="#4c5a8a" /><rect y="720" width="1600" height="180" fill="#2a2f66" />
      <rect x="240" y="70" width="1120" height="640" rx="26" fill={F.ink} /><rect x="268" y="98" width="1064" height="584" rx="8" fill="#232a5c" /><rect x="268" y="98" width="1064" height="70" fill="#2f3a78" />
      <text x="304" y="146" fontSize="34" fontWeight="800" fill={F.white} fontFamily="Bahnschrift, 'Arial Narrow', Arial, sans-serif" letterSpacing="3">WHAT WE KNOW</text>
      {rows.map((t, i) => {
        const y = 194 + i * 120, c = sev(t), lines = t.match(/.{1,52}(\s|$)/g)?.slice(0, 2) ?? [t];
        return <g key={i}><rect x="304" y={y} width="992" height="100" rx="12" fill="#2a3270" /><rect x="304" y={y} width="18" height="100" fill={c} /><circle cx="368" cy={y + 50} r="26" fill={c} />{lines.map((l, k) => <text key={k} x="422" y={y + 42 + k * 32} fontSize="28" fontWeight={k ? 400 : 700} fill={F.white} fontFamily="Arial, sans-serif">{l.trim()}</text>)}</g>;
      })}
      <rect x="740" y="712" width="120" height="40" fill="#59639c" /><rect x="620" y="744" width="360" height="26" rx="8" fill="#59639c" />
    </Frame>
  );
}

// ---------------------------------------------------------------------------------------------------------------- effects from the page data
export function FlatFx({ ids }: { ids: string[] }) {
  const has = (k: string) => ids.includes(k);
  return (
    <svg className="vscene vscene--fx" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {has("power_failure") && <rect width="1600" height="900" fill="#14183a" opacity="0.28" />}
      {has("emergency_lighting") && <g><rect width="1600" height="900" fill="#c24f1c" opacity="0.08" />{[120, 1480].map((x) => <g key={x}><circle cx={x} cy="90" r="46" fill="#f08a2c" /><circle cx={x} cy="90" r="22" fill={F.lamp} /></g>)}</g>}
      {has("warning_lights") && [60, 1540].map((x) => <g key={x}><circle cx={x} cy="70" r="40" fill="#f08a2c" opacity="0.5" /><circle cx={x} cy="70" r="18" fill={F.lamp} /></g>)}
      {has("smoke") && [[840, 300, 70], [900, 230, 88], [820, 150, 100], [920, 70, 110]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? "#aab0cf" : "#8e95bd"} />)}
      {has("sparks") && [[780, 380], [832, 350], [880, 400], [930, 360], [850, 320]].map(([x, y], i) => <polygon key={i} points={`${x},${y - 14} ${x + 8},${y} ${x},${y + 14} ${x - 8},${y}`} fill={i % 2 ? F.lamp : "#fff3c7"} />)}
      {has("rain") && Array.from({ length: 70 }, (_, i) => <line key={i} x1={(i * 53) % 1700} y1={(i * 97) % 900} x2={((i * 53) % 1700) - 26} y2={((i * 97) % 900) + 70} stroke="#b9c3ee" strokeWidth="4" opacity="0.55" />)}
      {has("damaged_inventory") && <g><g transform="translate(220 760) rotate(-18)"><Crate x={0} y={0} w={130} h={90} c={F.boxDark} /></g><g transform="translate(420 800) rotate(14)"><Crate x={0} y={0} w={110} h={80} cross /></g><g transform="translate(1180 790) rotate(-9)"><Crate x={0} y={0} w={120} h={86} c={F.boxBlue} /></g></g>}
      {has("system_alert") && <g transform="translate(1460 60)"><path d="M40 0 L80 70 H0 Z" fill={F.lamp} /><rect x="36" y="22" width="8" height="26" fill={F.ink} /><rect x="36" y="54" width="8" height="8" fill={F.ink} /></g>}
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------------------------- story props
const Tag = ({ x, y, c, mark }: { x: number; y: number; c: string; mark: "x" | "tick" | "q" }) => (
  <g><path d={`M${x + 15} ${y - 30} v30`} stroke="#14183a" strokeWidth="4" /><rect x={x} y={y} width="32" height="42" rx="4" fill={c} />
    {mark === "x" && <path d={`M${x + 8} ${y + 10} l16 22 M${x + 24} ${y + 10} l-16 22`} stroke={F.white} strokeWidth="5" strokeLinecap="round" />}
    {mark === "tick" && <path d={`M${x + 7} ${y + 22} l8 10 l12 -18`} stroke={F.white} strokeWidth="5" fill="none" strokeLinecap="round" />}
    {mark === "q" && <text x={x + 16} y={y + 31} textAnchor="middle" fontSize="26" fontWeight="800" fill={F.ink} fontFamily="Arial, sans-serif">?</text>}</g>
);
const TAG_SPOTS: [number, number][] = [[160, 360], [330, 360], [250, 470], [440, 470], [120, 580], [1090, 360], [1260, 470], [1440, 360], [1180, 580]];
const Banknotes = ({ n }: { n: number }) => <g>{Array.from({ length: n }, (_, i) => <g key={i} transform={`translate(${1200 + (i % 3) * 86} ${690 - Math.floor(i / 3) * 24})`}><rect width="76" height="26" fill="#4aa37a" /><rect y="26" width="76" height="12" fill="#2f7a58" /><circle cx="38" cy="13" r="8" fill="#9fe0bd" /></g>)}</g>;

export const PROPS: Record<string, () => ReactNode> = {
  cables_cut: () => <g>{[[300, 770, 560, 830], [620, 790, 900, 760], [980, 800, 1240, 840]].map(([a, b, c, d], i) => <g key={i}><path d={`M${a} ${b} Q${(a + c) / 2} ${b + 40} ${c} ${d}`} stroke="#14183a" strokeWidth="12" fill="none" strokeLinecap="round" /><rect x={c - 14} y={d - 14} width="28" height="28" fill={F.lamp} /></g>)}{[[512, 250], [770, 250], [1030, 250]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="34" fill={F.red} /><path d={`M${x - 16} ${y + 16} L${x + 16} ${y - 16}`} stroke={F.white} strokeWidth="9" strokeLinecap="round" /></g>)}</g>,
  staged_recovery: () => <g>{[[400, 170], [660, 170], [1180, 170]].map(([x, y], i) => <g key={i}><rect x={x} y={y + 112} width="226" height="16" fill="#14183a" /><rect x={x} y={y + 112} width={80 + i * 50} height="16" fill="#4aa37a" /><rect x={x + 20} y={y + 30} width="120" height="8" fill="#7fd3ff" /><rect x={x + 20} y={y + 56} width="90" height="8" fill="#7fd3ff" /></g>)}</g>,
  rush_restore: () => <g>{[[400, 170], [660, 170], [920, 170], [1180, 360]].map(([x, y], i) => <g key={i}><rect x={x} y={y} width="246" height="170" fill="#2a6fb0" /><rect x={x} y={y + 112} width="246" height="58" fill={F.red} /><path d={`M${x + 123} ${y + 24} l30 60 h-60 z`} fill={F.lamp} /></g>)}</g>,
  account_locked: () => <g transform="translate(930 190)"><rect x="-70" y="30" width="140" height="110" rx="14" fill={F.lamp} /><path d="M-40 30 v-40 a40 40 0 0 1 80 0 v40" fill="none" stroke={F.lamp} strokeWidth="18" /><circle cx="0" cy="78" r="14" fill={F.ink} /><rect x="-5" y="84" width="10" height="34" fill={F.ink} /></g>,
  tape_barrier: () => <g>{[560, 1060].map((x) => <g key={x}><rect x={x - 8} y="560" width="16" height="180" fill="#14183a" /><circle cx={x} cy="556" r="16" fill="#f08a2c" /></g>)}<polygon points="552,610 1068,640 1068,676 552,646" fill="#d9a62e" />{Array.from({ length: 16 }, (_, i) => <polygon key={i} points={`${560 + i * 32},${612 + i * 1.9} ${576 + i * 32},${613 + i * 1.9} ${560 + i * 32},${648 + i * 1.9} ${544 + i * 32},${647 + i * 1.9}`} fill="#14183a" />)}<Cone x={470} y={790} /><Cone x={1150} y={790} /></g>,
  cones: () => <g><Cone x={420} y={800} /><Cone x={1180} y={800} s={0.9} /><Cone x={860} y={830} s={0.8} /></g>,
  hold_tags: () => <g>{TAG_SPOTS.map(([x, y], i) => <Tag key={i} x={x} y={y} c={F.red} mark="x" />)}</g>,
  verified_tags: () => <g>{TAG_SPOTS.map(([x, y], i) => <Tag key={i} x={x} y={y} c="#2f9a6a" mark="tick" />)}</g>,
  provisional_tags: () => <g>{TAG_SPOTS.map(([x, y], i) => <Tag key={i} x={x} y={y} c={F.lamp} mark="q" />)}</g>,
  cash_small: () => <Banknotes n={2} />, cash_medium: () => <Banknotes n={5} />, cash_large: () => <Banknotes n={9} />,
  trucks_hired: () => <g><Truck x={-90} y={700} s={2} beacon /><Truck x={680} y={700} s={2} beacon /></g>,
  detour_sign: () => <g transform="translate(260 560)"><rect x="-8" y="0" width="16" height="200" fill="#14183a" /><rect x="-90" y="-110" width="180" height="120" rx="10" fill="#f2c230" /><path d="M-50 -60 H30 M10 -86 l36 26 l-36 26" stroke={F.ink} strokeWidth="14" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>,
  hospital_truck: () => <Truck x={300} y={700} s={2.2} cross beacon />,
  delivery_cart: () => <g transform="translate(560 770)"><rect x="-120" y="-90" width="240" height="14" fill="#8993c4" /><rect x="-110" y="-76" width="10" height="90" fill="#3b4672" /><rect x="100" y="-76" width="10" height="90" fill="#3b4672" /><circle cx="-100" cy="26" r="14" fill="#14183a" /><circle cx="100" cy="26" r="14" fill="#14183a" /><Crate x={-100} y={-170} w={96} h={80} cross /><Crate x={0} y={-160} w={90} h={70} c={F.boxBlue} /></g>,
  order_sheets: () => <g transform="translate(560 770)">{[0, 1, 2].map((i) => <g key={i} transform={`rotate(${-6 + i * 6} ${i * 30} 0)`}><rect x={-100 + i * 70} y="-110" width="100" height="130" fill="#e8ecf5" /><rect x={-84 + i * 70} y="-86" width="64" height="7" fill="#9aa4c8" /><rect x={-84 + i * 70} y="-66" width="50" height="7" fill="#9aa4c8" /></g>)}</g>,
  split_pallets: () => <g><rect x="470" y="770" width="260" height="22" fill="#9a6a33" /><Crate x={480} y={690} w={110} h={80} cross /><Crate x={610} y={700} w={100} h={70} /><rect x="900" y="770" width="260" height="22" fill="#9a6a33" /><Crate x={920} y={690} w={110} h={80} c={F.boxBlue} /><Crate x={1050} y={700} w={100} h={70} cross /></g>,
  boxes_in_transit: () => <g transform="translate(900 770)"><rect x="-120" y="-60" width="240" height="14" fill="#8993c4" /><rect x="-110" y="-46" width="10" height="70" fill="#3b4672" /><rect x="100" y="-46" width="10" height="70" fill="#3b4672" /><circle cx="-100" cy="36" r="14" fill="#14183a" /><circle cx="100" cy="36" r="14" fill="#14183a" /><Crate x={-100} y={-140} w={92} h={80} cross /><Crate x={0} y={-130} w={90} h={70} c={F.boxBlue} cross /><path d="M150 -40 h70 m-24 -26 l26 26 l-26 26" stroke={F.lamp} strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>,
  stop_sign: () => <g transform="translate(1260 520)"><rect x="-8" y="40" width="16" height="240" fill="#14183a" /><polygon points="-44,-18 44,-18 82,18 82,100 44,136 -44,136 -82,100 -82,18" fill={F.red} transform="translate(0 0) scale(0.9)" /><rect x="-56" y="52" width="112" height="14" fill={F.white} /></g>,
  podium: () => <g transform="translate(800 720)"><rect x="-100" y="-120" width="200" height="140" fill="#2a3270" /><rect x="-90" y="-110" width="180" height="14" fill="#59639c" /><rect x="-6" y="-190" width="12" height="70" fill="#14183a" /><rect x="-20" y="-210" width="40" height="30" rx="10" fill="#14183a" /></g>,
  empty_podium: () => <g transform="translate(800 720)"><rect x="-100" y="-120" width="200" height="140" fill="#2a3270" /><rect x="-90" y="-110" width="180" height="14" fill="#59639c" /><rect x="-6" y="-190" width="12" height="70" fill="#14183a" /><rect x="-20" y="-210" width="40" height="30" rx="10" fill="#14183a" /><rect x="-70" y="-90" width="140" height="70" fill="#14183a" opacity="0.35" /></g>,
  statement_card: () => <g transform="translate(800 720)"><rect x="-100" y="-120" width="200" height="140" fill="#2a3270" /><rect x="-70" y="-150" width="140" height="64" fill="#e8ecf5" /><rect x="-54" y="-134" width="100" height="8" fill="#9aa4c8" /><rect x="-54" y="-114" width="76" height="8" fill="#9aa4c8" /><rect x="-6" y="-210" width="12" height="60" fill="#14183a" /><rect x="-20" y="-230" width="40" height="30" rx="10" fill="#14183a" /></g>,
  sweep_torch: () => <g><polygon points="560,620 1100,760 1100,420" fill="#f4e4a0" opacity="0.28" /><circle cx="560" cy="620" r="14" fill={F.lit} /></g>,
  loaded_truck: () => <g><Truck x={560} y={712} s={2.2} beacon /><Crate x={330} y={780} w={110} h={90} cross /><Crate x={1380} y={800} w={100} h={80} c={F.boxBlue} /></g>,
  empty_bays: () => <g><rect x="1000" y="180" width="400" height="500" fill="#14183a" opacity="0.4" /></g>,
};

export function FlatProps({ ids }: { ids: string[] }) {
  return <svg className="vscene vscene--fx" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">{ids.map((id) => <g key={id}>{PROPS[id]?.()}</g>)}</svg>;
}

// Set dressing and lighting that change from panel to panel and round to round, so the same room never looks identical twice.
const hash = (n: number, k: number) => { let h = Math.imul(n + 1, 2654435761) ^ Math.imul(k + 7, 40503); h = Math.imul(h ^ (h >>> 15), 2246822519); return (h ^ (h >>> 13)) >>> 0; };
const SLOTS = [110, 590, 1010, 1490];
type DecorFn = (x: number, floor: number, v: number) => ReactNode;
const POSTER_C = ["#d6574a", "#4aa3c7", "#e8b33d", "#5fae83"];
const DECOR: Record<string, DecorFn> = {
  poster: (x, f, v) => <g transform={`translate(${x - 44} ${f - 470})`}><rect width="88" height="118" fill="#e9edf5" /><rect width="88" height="26" fill={POSTER_C[v % 4]} /><rect x="12" y="42" width="64" height="8" fill="#9aa4c8" /><rect x="12" y="60" width="48" height="8" fill="#b8c0dc" /><circle cx="44" cy="92" r="13" fill={POSTER_C[(v + 1) % 4]} /></g>,
  notice: (x, f, v) => <g transform={`translate(${x - 70} ${f - 440})`}><rect width="140" height="96" fill="#8a6a4a" /><rect x="8" y="8" width="124" height="80" fill="#b78f62" />{[0, 1, 2].map((i) => <rect key={i} x={16 + i * 38} y={16 + ((i + v) % 2) * 24} width="30" height="38" fill={i % 2 ? "#f0e6a8" : "#e9edf5"} />)}</g>,
  hazard: (x, f) => <g transform={`translate(${x} ${f - 400})`}><path d="M0 -54 L52 36 H-52 Z" fill="#f2b838" /><rect x="-5" y="-22" width="10" height="34" fill="#1b1f3f" /><circle cy="22" r="5" fill="#1b1f3f" /></g>,
  extinguisher: (x, f) => <g transform={`translate(${x} ${f})`}><rect x="-20" y="-120" width="40" height="120" rx="14" fill="#d3463a" /><rect x="-8" y="-138" width="16" height="22" fill="#2b2f4a" /><rect x="-20" y="-80" width="40" height="14" fill="#f0e6e0" /></g>,
  plant: (x, f, v) => <g transform={`translate(${x} ${f})`}><path d="M-26 0 L-20 -60 H20 L26 0 Z" fill="#b8654a" />{[-30, -10, 12, 32].map((dx, i) => <path key={i} d={`M0 -58 C${dx * 2} -${120 + ((i + v) % 3) * 24} ${dx * 3} -70 ${dx * 1.4} -${150 + ((i + v) % 2) * 20} C${dx} -100 4 -80 0 -58`} fill={i % 2 ? "#3f8a63" : "#52a577"} />)}</g>,
  pallets: (x, f, v) => <g transform={`translate(${x} ${f})`}><rect x="-70" y="-16" width="140" height="16" fill="#7a5a3a" /><rect x="-60" y="-86" width="120" height="70" fill="#d8b878" /><rect x="-60" y="-86" width="120" height="14" fill="#c4a064" />{v % 2 === 0 && <rect x="-44" y="-140" width="88" height="54" fill="#c4a064" />}</g>,
  bin: (x, f) => <g transform={`translate(${x} ${f})`}><path d="M-34 -96 H34 L28 0 H-28 Z" fill="#59639c" /><rect x="-40" y="-108" width="80" height="14" fill="#7580b8" /></g>,
  lamp: (x) => <g transform={`translate(${x} 0)`}><rect x="-3" width="6" height="150" fill="#2b2f4a" /><path d="M-40 190 L-14 140 H14 L40 190 Z" fill="#f2c84a" /></g>,
};
const DECOR_BY_ENV: Partial<Record<EnvId, string[]>> = {
  warehouse_floor: ["poster", "extinguisher", "hazard", "pallets", "bin", "lamp"], electrical_area: ["hazard", "extinguisher", "notice", "bin", "lamp"],
  loading_dock: ["pallets", "hazard", "poster", "bin", "lamp"], alt_depot: ["pallets", "poster", "extinguisher", "notice", "bin"],
  hospital_corridor: ["plant", "poster", "notice", "bin", "extinguisher"], press_scene: ["plant", "poster", "lamp"],
};
function Dressing({ env, seed }: { env: EnvId; seed: number }) {
  const pool = DECOR_BY_ENV[env]; if (!pool) return null;
  const floor = DESK_ENVS.includes(env) ? 640 : FLOOR_Y[env];
  const slots = [...SLOTS].sort((a, b) => hash(seed, a) - hash(seed, b)).slice(0, 2);
  return <svg className="vscene vscene--fx" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">{slots.map((x, i) => <g key={x}>{DECOR[pool[hash(seed, 7 + i) % pool.length]](x, floor, hash(seed, 3 + i) % 8)}</g>)}</svg>;
}

/** Lighting mood by round: the night deepens, then dawn comes up at the end. */
const MOOD: Record<number, [string, number]> = { 3: ["#2a3a8a", 0.1], 4: ["#2a3a8a", 0.14], 5: ["#241c6a", 0.16], 6: ["#241c6a", 0.18], 7: ["#1f5a7a", 0.12], 8: ["#1f5a7a", 0.1], 9: ["#f2a65a", 0.1], 10: ["#f6b97a", 0.16] };
function Mood({ round }: { round: number }) {
  const m = MOOD[round]; if (!m) return null;
  return <svg className="vscene vscene--fx" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true"><rect width="1600" height="900" fill={m[0]} opacity={m[1]} /></svg>;
}

/** What the wall clock shows in each round (the backend's round clocks). */
const CLOCKS: Record<number, [number, number]> = { 1: [8, 40], 2: [9, 5], 3: [9, 35], 4: [10, 15], 5: [11, 0], 6: [11, 45], 7: [1, 0], 8: [2, 20], 9: [4, 10], 10: [6, 0] };

/** Draws one environment with story props and page effects on top, all in the same flat style. */
export function FlatEnv({ env, props = [], effects = [], facts = [], board = false, seed = 0, round = 0 }: { env: EnvId; props?: string[]; effects?: string[]; facts?: string[]; board?: boolean; seed?: number; round?: number }) {
  const base = board ? <EvidenceBoard facts={facts} /> : env === "warehouse_floor" ? <FlatWarehouse /> : env === "control_room" ? <FlatControlRoom /> : env === "ops_office" ? <FlatOffice time={CLOCKS[round] ?? [8, 40]} /> :
    env === "electrical_area" ? <Electrical /> : env === "loading_dock" ? <Dock /> : env === "hospital_corridor" ? <Hospital /> : env === "flooded_highway" ? <Highway bare={props.includes("trucks_hired") || props.includes("hospital_truck")} /> : env === "alt_depot" ? <Depot /> : <Press />;
  return <>{base}{!board && seed > 0 && <Dressing env={env} seed={seed} />}{!board && props.length > 0 && <FlatProps ids={props} />}{!board && effects.length > 0 && <FlatFx ids={effects} />}{!board && round > 0 && <Mood round={round} />}</>;
}

export { FlatTerminal };
