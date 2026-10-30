import { useId, type ReactNode } from "react";
import { INK, hatch, rng } from "./ink";
import { Extra, INKS, Lamp, RackRow, depth, lerp, poly, pts, sub, type P, type Quad } from "./geometry";
import type { EnvironmentId } from "../types";

// Each environment is a 1600x900 inked drawing built from perspective planes, props and light sources.
// `lit` says whether building power is on (power_failure effect turns lamps and screens off);
// `alert` adds a red system-alert state to screens. Nothing here depends on game data beyond those two flags.
export interface EnvProps { lit: boolean; alert: boolean; uid: string }

function Floor({ y, h = 900, c1 = "#1a212b", c2 = "#10151d" }: { y: number; h?: number; c1?: string; c2?: string }) {
  const id = `fl${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <g>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient></defs>
      <rect x="0" y={y} width="1600" height={h - y} fill={`url(#${id})`} />
    </g>
  );
}
const Hatch = ({ x, y, w, h, gap = 12, angle = 50, op = 0.35, seed = "hx" }: { x: number; y: number; w: number; h: number; gap?: number; angle?: number; op?: number; seed?: string }) => (
  <path d={hatch(x, y, w, h, gap, angle, seed)} stroke={INK} strokeWidth="1.8" opacity={op} fill="none" />
);

/** Back wall + ceiling gradient shared by the interiors. */
const Shell = ({ id, top = "#0e1727", bottom = "#1a2639", wallY = 560 }: { id: string; top?: string; bottom?: string; wallY?: number }) => (
  <g>
    <defs><linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset="1" stopColor={bottom} /></linearGradient></defs>
    <rect width="1600" height={wallY} fill={`url(#${id}w)`} />
  </g>
);

// ------------------------------------------------------------------------------------------- warehouse
function Warehouse({ lit, uid }: EnvProps) {
  const L: Quad = [[0, 60], [700, 330], [700, 560], [0, 860]];
  const R: Quad = [[1600, 60], [900, 330], [900, 560], [1600, 860]];
  return (
    <g>
      <Shell id={`${uid}wh`} top="#0a1220" bottom="#17243a" wallY={560} />
      {/* roof trusses */}
      <g stroke={INK} fill="none" strokeWidth="5">
        {[0, 1, 2, 3, 4].map((i) => { const t = i / 4, y = lerp(40, 300, depth(t)); return <path key={i} d={`M${lerp(0, 700, depth(t))} ${y + 70} L800 ${y} L${lerp(1600, 900, depth(t))} ${y + 70}`} stroke="#243549" />; })}
        <path d="M0 40 L700 300 M1600 40 L900 300 M800 330 L800 300" stroke="#1c2b3f" strokeWidth="7" />
      </g>
      {[0, 1, 2, 3].map((i) => <Lamp key={i} x={800} y={lerp(70, 290, depth(i / 3))} w={lerp(300, 70, depth(i / 3))} h={lerp(14, 5, depth(i / 3))} on={lit} halo={lerp(240, 60, depth(i / 3))} />)}
      {/* far wall with roller door */}
      <rect x="700" y="330" width="200" height="230" fill="#141f30" stroke={INK} strokeWidth="4" />
      <rect x="730" y="360" width="140" height="200" fill="#223149" stroke={INK} strokeWidth="3" />
      {Array.from({ length: 9 }, (_, i) => <line key={i} x1="730" x2="870" y1={376 + i * 21} y2={376 + i * 21} stroke={INK} strokeWidth="2.4" opacity="0.7" />)}
      <rect x="772" y="316" width="56" height="26" fill={lit ? "#3fae6a" : "#1c2530"} stroke={INK} strokeWidth="3" />
      <Floor y={560} c1="#1d2531" c2="#0d1219" />
      {/* aisle lines and floor reflections */}
      <polygon points="760,560 840,560 1010,900 590,900" fill="#242d39" opacity="0.7" />
      <polyline points="718,560 330,900" stroke="#b48a2e" strokeWidth="6" opacity="0.7" fill="none" />
      <polyline points="882,560 1270,900" stroke="#b48a2e" strokeWidth="6" opacity="0.7" fill="none" />
      {lit && <polygon points="760,560 840,560 960,900 640,900" fill="#f7e2b0" opacity="0.05" />}
      <RackRow plane={L} bays={5} seed="whL" dim={!lit} />
      <RackRow plane={R} bays={5} seed="whR" dim={!lit} />
      {/* hatching shadow under the racks */}
      <Hatch x={0} y={700} w={560} h={200} seed="whs" op={0.3} />
      <Hatch x={1040} y={700} w={560} h={200} seed="whs2" op={0.3} />
      {/* foreground: pallet stack and a scanner post with a dead screen */}
      <g>
        <polygon points="1180,900 1180,770 1400,740 1470,770 1470,900" fill="#3c4a5c" stroke={INK} strokeWidth="5" />
        <polygon points="1180,770 1400,740 1470,770 1250,800" fill="#566a80" stroke={INK} strokeWidth="4" />
        <path d="M1180 836 L1470 836" stroke={INK} strokeWidth="3" opacity="0.6" />
        <rect x="70" y="640" width="14" height="260" fill="#202733" stroke={INK} strokeWidth="4" />
        <rect x="30" y="600" width="170" height="106" rx="8" fill="#0b121d" stroke={INK} strokeWidth="5" />
        <rect x="44" y="614" width="142" height="78" fill={lit ? "#1d3a58" : "#05080d"} />
        {lit && <path d="M56 634 L150 634 M56 652 L120 652 M56 670 L140 670" stroke="#9fd0ff" strokeWidth="4" opacity="0.7" />}
      </g>
    </g>
  );
}

// ------------------------------------------------------------------------------------------- control room
function ControlRoom({ lit, alert, uid }: EnvProps) {
  const r = rng("cr");
  const screens: ReactNode[] = [];
  const cols = 4, rows = 2, mw = 270, mh = 150, gx = 24, x0 = 800 - (cols * mw + (cols - 1) * gx) / 2, y0 = 130;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = x0 + i * (mw + gx), y = y0 + j * (mh + 28), bad = alert && ((i + j) % 3 === 1);
    screens.push(
      <g key={`${i}${j}`}>
        <rect x={x - 8} y={y - 8} width={mw + 16} height={mh + 16} fill="#0a0f18" stroke={INK} strokeWidth="5" />
        <rect x={x} y={y} width={mw} height={mh} fill={lit ? (bad ? "#2b1316" : "#12304d") : "#05080d"} />
        {lit && Array.from({ length: 8 }, (_, k) => <line key={k} x1={x + 14} x2={x + 14 + 40 + r() * (mw - 80)} y1={y + 18 + k * 16} y2={y + 18 + k * 16} stroke={bad && k === 3 ? "#ff6a4d" : "#9fd0ff"} strokeWidth={bad && k === 3 ? 6 : 3.2} opacity={bad && k === 3 ? 1 : 0.55} />)}
        {lit && (i + j) % 2 === 0 && <polyline points={`${x + 14},${y + mh - 20} ${x + 70},${y + mh - 50} ${x + 120},${y + mh - 30} ${x + 190},${y + mh - 80} ${x + mw - 14},${y + mh - 60}`} stroke="#e8a33d" strokeWidth="3.4" fill="none" opacity="0.8" />}
        {lit && <rect x={x} y={y} width={mw} height={mh} fill="#9fd0ff" opacity="0.06" />}
      </g>,
    );
  }
  return (
    <g>
      <Shell id={`${uid}cr`} top="#080e18" bottom="#152138" wallY={620} />
      <rect x="0" y="560" width="1600" height="40" fill="#0f1826" />
      {/* ceiling light strips */}
      <Lamp x={300} y={40} w={360} h={14} on={lit} halo={220} />
      <Lamp x={1300} y={40} w={360} h={14} on={lit} halo={220} />
      <rect x={x0 - 40} y={y0 - 40} width={cols * mw + (cols - 1) * gx + 80} height={2 * mh + 28 + 80} fill="#0d1420" stroke={INK} strokeWidth="6" />
      {screens}
      {lit && <rect x={x0 - 40} y={y0 - 40} width={cols * mw + (cols - 1) * gx + 80} height="360" fill="#9fd0ff" opacity="0.04" />}
      <Floor y={620} c1="#161d29" c2="#0a0e15" />
      {/* two rows of workstations receding */}
      {[[220, 700, 1], [1380, 700, 1], [520, 650, 0.7], [1080, 650, 0.7]].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <rect x="-190" y="40" width="380" height="26" fill="#2a3340" stroke={INK} strokeWidth="4" />
          <rect x="-170" y="66" width="340" height="140" fill="#161c26" stroke={INK} strokeWidth="4" />
          <rect x="-90" y="-60" width="180" height="104" fill="#0b1018" stroke={INK} strokeWidth="5" />
          <rect x="-78" y="-48" width="156" height="80" fill={lit ? (alert && i % 2 ? "#3a1a1c" : "#16406a") : "#05080d"} />
          {lit && <path d="M-62 -30 L40 -30 M-62 -14 L20 -14 M-62 2 L50 2" stroke="#9fd0ff" strokeWidth="3" opacity="0.7" />}
          <rect x="-110" y="20" width="220" height="18" fill="#10151d" stroke={INK} strokeWidth="3" />
        </g>
      ))}
      <Hatch x={0} y={720} w={420} h={180} seed="crh" op={0.3} />
      {/* chairs */}
      {[[380, 770], [1220, 770]].map(([x, y], i) => <g key={i} transform={`translate(${x} ${y})`}><path d="M-52 -80 Q0 -110 52 -80 L44 0 L-44 0 Z" fill="#10151d" stroke={INK} strokeWidth="4" /><path d="M0 0 L0 60 M-50 70 L50 70" stroke={INK} strokeWidth="7" /></g>)}
    </g>
  );
}

// ------------------------------------------------------------------------------------------- electrical area
function Electrical({ lit, alert, uid }: EnvProps) {
  const cab = (i: number) => {
    const x = 130 + i * 240, y = 120, w = 215, h = 520, hot = i === 3;
    return (
      <g key={i}>
        <rect x={x} y={y} width={w} height={h} fill={hot ? "#1c1514" : "#263447"} stroke={INK} strokeWidth="6" />
        <rect x={x + 14} y={y + 14} width={w - 28} height={h - 28} fill="none" stroke={INK} strokeWidth="2.6" opacity="0.7" />
        <rect x={x + 22} y={y + 30} width="170" height="74" fill="#0d1520" stroke={INK} strokeWidth="3" />
        <rect x={x + 30} y={y + 38} width="154" height="58" fill={lit ? (hot ? "#4a1c18" : "#1f4a3a") : "#060a10"} />
        {lit && <path d={`M${x + 40} ${y + 66} L${x + 100} ${y + 66}`} stroke={hot ? "#ff7a59" : "#8fe3b5"} strokeWidth="5" />}
        {[0, 1, 2, 3, 4].map((k) => <circle key={k} cx={x + 46 + k * 30} cy={y + 150} r="10" fill={lit ? (hot ? "#c9422f" : k % 2 ? "#e8a33d" : "#3fae6a") : "#10151c"} stroke={INK} strokeWidth="3" />)}
        <rect x={x + 30} y={y + 200} width="150" height="230" fill="#1a2433" stroke={INK} strokeWidth="3" />
        {[0, 1, 2, 3, 4, 5].map((k) => <line key={k} x1={x + 30} x2={x + 180} y1={y + 226 + k * 34} y2={y + 226 + k * 34} stroke={INK} strokeWidth="2.4" opacity="0.7" />)}
        <rect x={x + 76} y={y + 450} width="62" height="40" fill="#e8a33d" stroke={INK} strokeWidth="3.4" />
        <text x={x + 107} y={y + 482} textAnchor="middle" fontSize="30" fontWeight="800" fontFamily="Bahnschrift, Arial Narrow, sans-serif" fill={INK}>{i + 1}</text>
        {hot && <g><path d={`M${x + 20} ${y + 200} L${x + 80} ${y + 330} L${x + 40} ${y + 410}`} stroke="#05080d" strokeWidth="16" opacity="0.8" fill="none" /><path d={`M${x + 160} ${y + 20} q30 70 -10 160 q40 -60 20 -160`} fill="#05080d" opacity="0.7" /></g>}
      </g>
    );
  };
  return (
    <g>
      <Shell id={`${uid}el`} top="#0a111c" bottom="#18222f" wallY={650} />
      {/* conduits and cable tray */}
      <g stroke={INK} strokeWidth="5"><rect x="0" y="40" width="1600" height="34" fill="#2b3544" /><rect x="0" y="86" width="1600" height="22" fill="#3a4658" />
        {[130, 370, 610, 850, 1090, 1330].map((x) => <rect key={x} x={x + 90} y="40" width="26" height="130" fill="#2b3544" />)}</g>
      <Lamp x={800} y={30} w={500} h={12} on={lit} halo={300} color="#d6e4f2" />
      {[0, 1, 2, 3, 4, 5].map(cab)}
      <Floor y={640} c1="#232c38" c2="#0d1219" />
      <path d="M0 640 L1600 640" stroke={INK} strokeWidth="6" />
      {/* hazard strip along the floor */}
      <g transform="translate(0 650)">
        {Array.from({ length: 40 }, (_, i) => <polygon key={i} points={`${i * 42},0 ${i * 42 + 24},0 ${i * 42 + 12},26 ${i * 42 - 12},26`} fill={i % 2 ? INK : "#c99a2c"} opacity="0.9" />)}
      </g>
      {/* puddle with reflection */}
      <ellipse cx="840" cy="780" rx="340" ry="46" fill="#0b1626" stroke={INK} strokeWidth="3" />
      <rect x="610" y="768" width="100" height="6" fill="#e8a33d" opacity={lit ? 0.4 : 0.15} />
      <path d="M520 785 Q700 770 900 790 M640 800 Q820 790 1000 802" stroke="#4a6a8a" strokeWidth="2" opacity="0.5" fill="none" />
      {/* hazard sign + cone barrier tape */}
      <g transform="translate(1480 250)"><polygon points="0,-60 70,60 -70,60" fill="#e8a33d" stroke={INK} strokeWidth="6" /><path d="M0 -22 L0 22" stroke={INK} strokeWidth="11" strokeLinecap="round" /><circle cx="0" cy="40" r="6.5" fill={INK} /></g>
      <g>
        <path d="M-10 720 L1610 690" stroke={INK} strokeWidth="14" />
        <path d="M-10 720 L1610 690" stroke="#e8c13a" strokeWidth="9" strokeDasharray="38 22" />
        <rect x="40" y="690" width="16" height="200" fill="#4a5666" stroke={INK} strokeWidth="4" /><rect x="1500" y="660" width="16" height="230" fill="#4a5666" stroke={INK} strokeWidth="4" />
      </g>
      {alert && <rect width="1600" height="900" fill="#c9422f" opacity="0.05" />}
    </g>
  );
}

// ------------------------------------------------------------------------------------------- loading dock
function Dock({ lit, uid }: EnvProps) {
  const door = (i: number) => {
    const x = 90 + i * 500, w = 420;
    return (
      <g key={i}>
        <rect x={x} y="150" width={w} height="400" fill="#0c1424" stroke={INK} strokeWidth="6" />
        <defs><linearGradient id={`${uid}sk${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0f1a33" /><stop offset="0.8" stopColor="#8a5a3a" /><stop offset="1" stopColor="#d69a4c" /></linearGradient></defs>
        <rect x={x + 8} y="158" width={w - 16} height="384" fill={`url(#${uid}sk${i})`} />
        {/* truck rear */}
        <rect x={x + 30} y="190" width={w - 60} height="360" fill="#2d3948" stroke={INK} strokeWidth="6" />
        <rect x={x + 44} y="204" width={w - 88} height="336" fill="#364457" stroke={INK} strokeWidth="3" />
        <line x1={x + w / 2} x2={x + w / 2} y1="204" y2="540" stroke={INK} strokeWidth="4" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => <line key={k} x1={x + 44} x2={x + w - 44} y1={226 + k * 41} y2={226 + k * 41} stroke={INK} strokeWidth="1.8" opacity="0.5" />)}
        <rect x={x + 36} y="498" width="26" height="40" fill={i === 1 ? "#d9482f" : "#6b2a22"} stroke={INK} strokeWidth="3" />
        <rect x={x + w - 62} y="498" width="26" height="40" fill={i === 1 ? "#d9482f" : "#6b2a22"} stroke={INK} strokeWidth="3" />
        {/* shutter above */}
        <rect x={x - 10} y="120" width={w + 20} height="44" fill="#243247" stroke={INK} strokeWidth="5" />
        {i === 2 && <rect x={x + 30} y="190" width={w - 60} height="360" fill="#05080d" opacity="0.45" />}
      </g>
    );
  };
  return (
    <g>
      <Shell id={`${uid}dk`} top="#0a1220" bottom="#162238" wallY={600} />
      <Lamp x={300} y={50} w={300} h={12} on={lit} halo={200} /><Lamp x={1300} y={50} w={300} h={12} on={lit} halo={200} />
      {[0, 1, 2].map(door)}
      <Floor y={550} c1="#252e3a" c2="#0f141c" />
      <polygon points="0,550 1600,550 1600,586 0,586" fill="#c99a2c" opacity="0.85" /><polygon points="0,586 1600,586 1600,596 0,596" fill={INK} />
      {Array.from({ length: 50 }, (_, i) => <polygon key={i} points={`${i * 34},550 ${i * 34 + 14},550 ${i * 34 - 6},586 ${i * 34 - 20},586`} fill={INK} opacity="0.9" />)}
      {/* pallets and bollards */}
      {[[230, 760, 1], [820, 800, 1.15], [1340, 760, 1]].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <polygon points="-110,0 110,0 110,-120 -110,-120" fill="#5a4a37" stroke={INK} strokeWidth="5" /><polygon points="-110,-120 110,-120 140,-146 -80,-146" fill="#7a6548" stroke={INK} strokeWidth="4" />
          <polygon points="110,0 140,-26 140,-146 110,-120" fill="#3f3426" stroke={INK} strokeWidth="4" />
          <path d="M-110 -60 L110 -60 M0 -120 L0 0" stroke={INK} strokeWidth="2.4" opacity="0.55" />
          <rect x="-120" y="0" width="240" height="22" fill="#2a2f38" stroke={INK} strokeWidth="4" />
        </g>
      ))}
      {[90, 640, 1010, 1500].map((x) => <g key={x}><rect x={x} y="690" width="26" height="150" rx="6" fill="#c99a2c" stroke={INK} strokeWidth="4" /><rect x={x} y="730" width="26" height="22" fill={INK} /></g>)}
      <Hatch x={0} y={780} w={500} h={120} seed="dkh" op={0.3} />
    </g>
  );
}

// ------------------------------------------------------------------------------------------- ops office
function Office({ lit, alert, uid }: EnvProps) {
  const r = rng("off");
  const city: ReactNode[] = [];
  for (let i = 0; i < 28; i++) { const x = 90 + i * 28 + r() * 8, h = 60 + r() * 200; city.push(<rect key={i} x={x} y={470 - h} width={22 + r() * 14} height={h} fill="#0b1424" stroke={INK} strokeWidth="2.4" />); }
  return (
    <g>
      <Shell id={`${uid}of`} top="#0a1220" bottom="#162137" wallY={700} />
      {/* window onto the night site */}
      <rect x="860" y="70" width="650" height="420" fill="#0d1a30" stroke={INK} strokeWidth="8" />
      <defs><linearGradient id={`${uid}ns`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a1328" /><stop offset="1" stopColor="#233a5c" /></linearGradient></defs>
      <rect x="870" y="80" width="630" height="400" fill={`url(#${uid}ns)`} />
      <g transform="translate(790 0)">{city.slice(0, 22)}</g>
      {Array.from({ length: 40 }, (_, i) => <rect key={i} x={890 + r() * 580} y={300 + r() * 160} width="5" height="7" fill={lit && r() > 0.4 ? "#f2d79a" : "#1a2740"} />)}
      <path d="M1185 70 L1185 490 M860 280 L1510 280" stroke={INK} strokeWidth="8" />
      <path d="M880 100 L1020 100 L900 260 Z" fill="#fff" opacity="0.04" />
      {/* whiteboard with timeline + budget chart */}
      <rect x="120" y="120" width="560" height="330" fill="#cfd6df" stroke={INK} strokeWidth="8" opacity="0.92" />
      <rect x="120" y="120" width="560" height="330" fill="#101a2a" opacity="0.35" />
      <path d="M160 200 L640 200" stroke={INK} strokeWidth="5" opacity="0.7" />
      {[0, 1, 2, 3, 4, 5].map((i) => <g key={i}><circle cx={180 + i * 90} cy="200" r="9" fill={i === 3 ? "#c9422f" : "#2f4560"} stroke={INK} strokeWidth="3" /><path d={`M${160 + i * 90} ${232} L${210 + i * 90} ${232} M${160 + i * 90} ${248} L${196 + i * 90} ${248}`} stroke={INK} strokeWidth="3" opacity="0.5" /></g>)}
      {[[170, 70], [230, 110], [290, 54], [350, 150], [410, 90]].map(([x, h], i) => <rect key={i} x={x + 40} y={420 - h} width="38" height={h} fill={i === 3 ? "#c9422f" : "#e8a33d"} stroke={INK} strokeWidth="3" />)}
      <path d="M150 420 L660 420 M150 420 L150 300" stroke={INK} strokeWidth="4" />
      {/* clock */}
      <g transform="translate(760 130)"><circle r="46" fill="#10151d" stroke={INK} strokeWidth="6" /><path d="M0 0 L0 -32 M0 0 L22 10" stroke="#e8a33d" strokeWidth="5" strokeLinecap="round" /></g>
      <Floor y={690} c1="#161d29" c2="#0a0e15" />
      {/* desk */}
      <polygon points="0,700 1600,700 1600,900 0,900" fill="#1b232f" stroke={INK} strokeWidth="6" />
      <path d="M0 716 L1600 716" stroke="#4d5c70" strokeWidth="5" opacity="0.7" />
      {/* laptop, papers, mug, lamp */}
      <g transform="translate(1030 700)">
        <polygon points="-170,0 170,0 190,40 -190,40" fill="#2a3340" stroke={INK} strokeWidth="5" /><polygon points="-150,0 -130,-190 130,-190 150,0" fill="#0b1018" stroke={INK} strokeWidth="5" />
        <polygon points="-136,-6 -118,-176 118,-176 136,-6" fill={lit ? (alert ? "#4a1c1c" : "#16406a") : "#05080d"} />
        {lit && <path d="M-90 -140 L60 -144 M-96 -110 L40 -114 M-100 -80 L80 -84" stroke="#9fd0ff" strokeWidth="4" opacity="0.7" />}
      </g>
      <g transform="translate(300 770) rotate(-4)"><rect x="-150" y="-40" width="300" height="76" fill="#d9d3c2" stroke={INK} strokeWidth="5" /><path d="M-130 -18 L90 -18 M-130 2 L60 2 M-130 22 L100 22" stroke={INK} strokeWidth="3" opacity="0.55" /></g>
      <g transform="translate(560 740)"><path d="M-30 0 L-26 -50 L26 -50 L30 0 Z" fill="#d6dbe2" stroke={INK} strokeWidth="4" /><path d="M30 -38 q26 4 0 28" stroke={INK} strokeWidth="6" fill="none" /></g>
      <g transform="translate(150 700)"><path d="M0 0 L0 -150 L70 -190" stroke={INK} strokeWidth="9" fill="none" strokeLinecap="round" /><path d="M54 -202 L110 -166 L74 -150 Z" fill="#e8a33d" stroke={INK} strokeWidth="5" />{lit && <ellipse cx="96" cy="-100" rx="210" ry="86" fill="#f2c97a" opacity="0.13" />}</g>
    </g>
  );
}

// ------------------------------------------------------------------------------------------- hospital corridor
function Hospital({ lit, uid }: EnvProps) {
  const VP: P = [800, 430];
  const L: Quad = [[0, 0], [VP[0] - 150, VP[1] - 90], [VP[0] - 150, VP[1] + 80], [0, 900]];
  const R: Quad = [[1600, 0], [VP[0] + 150, VP[1] - 90], [VP[0] + 150, VP[1] + 80], [1600, 900]];
  const doors: ReactNode[] = [];
  for (let i = 0; i < 5; i++) {
    const u0 = depth(i / 5 + 0.04, 1.8), u1 = depth(i / 5 + 0.14, 1.8);
    for (const [side, plane] of [["l", L], ["r", R]] as const) {
      const d = sub(plane, u0, u1, 0.22, 0.92);
      doors.push(<polygon key={`${side}${i}`} points={poly(d)} fill="#27506a" stroke={INK} strokeWidth="4" />);
      doors.push(<polygon key={`w${side}${i}`} points={poly(sub(plane, lerp(u0, u1, 0.3), lerp(u0, u1, 0.7), 0.3, 0.52))} fill={lit ? "#bfe6e2" : "#0c1620"} stroke={INK} strokeWidth="3" opacity={lit ? 0.85 : 1} />);
    }
  }
  return (
    <g>
      <Shell id={`${uid}hc`} top="#0b1a24" bottom="#13303a" wallY={900} />
      <polygon points={poly(L)} fill="#1a3b46" stroke={INK} strokeWidth="5" /><polygon points={poly(R)} fill="#16333d" stroke={INK} strokeWidth="5" />
      <polygon points={pts([0, 0], [1600, 0], [VP[0] + 150, VP[1] - 90], [VP[0] - 150, VP[1] - 90])} fill="#10202c" stroke={INK} strokeWidth="5" />
      <polygon points={pts([0, 900], [1600, 900], [VP[0] + 150, VP[1] + 80], [VP[0] - 150, VP[1] + 80])} fill="#22343c" stroke={INK} strokeWidth="5" />
      <rect x={VP[0] - 150} y={VP[1] - 90} width="300" height="170" fill="#0c1a22" stroke={INK} strokeWidth="5" />
      {/* nurse station glow at the far end */}
      <rect x={VP[0] - 100} y={VP[1] - 10} width="200" height="70" fill="#1a2c38" stroke={INK} strokeWidth="4" />
      <rect x={VP[0] - 60} y={VP[1] - 44} width="50" height="34" fill={lit ? "#7fd3c6" : "#071016"} stroke={INK} strokeWidth="3" /><rect x={VP[0] + 14} y={VP[1] - 44} width="50" height="34" fill={lit ? "#7fd3c6" : "#071016"} stroke={INK} strokeWidth="3" />
      {doors}
      {[0, 1, 2, 3].map((i) => { const t = depth(i / 4 + 0.05, 1.8); const w = lerp(520, 90, t), y = lerp(24, VP[1] - 100, t); return <Lamp key={i} x={800} y={y} w={w} h={lerp(18, 6, t)} on={lit} color="#d9f2ee" halo={lerp(340, 70, t)} />; })}
      {/* floor stripe + gurney + IV stand */}
      <polygon points={pts([760, 900], [840, 900], [VP[0] + 14, VP[1] + 80], [VP[0] - 14, VP[1] + 80])} fill="#e8a33d" opacity="0.5" />
      <g transform="translate(1180 790)"><rect x="-190" y="-80" width="380" height="36" rx="6" fill="#aab6c4" stroke={INK} strokeWidth="5" /><rect x="-190" y="-44" width="380" height="20" fill="#566272" stroke={INK} strokeWidth="4" /><path d="M-160 -24 L-160 80 M160 -24 L160 80" stroke={INK} strokeWidth="8" /><circle cx="-160" cy="86" r="16" fill="#10151d" stroke={INK} strokeWidth="4" /><circle cx="160" cy="86" r="16" fill="#10151d" stroke={INK} strokeWidth="4" /></g>
      <g transform="translate(400 700)"><path d="M0 0 L0 -300 M-40 0 L40 0" stroke={INK} strokeWidth="10" /><path d="M0 -300 L-40 -280 M0 -300 L40 -280" stroke={INK} strokeWidth="8" /><rect x="-18" y="-270" width="36" height="64" rx="8" fill="#cfe6f0" stroke={INK} strokeWidth="4" /></g>
      <Hatch x={0} y={560} w={380} h={340} seed="hch" op={0.25} />
    </g>
  );
}

// ------------------------------------------------------------------------------------------- flooded highway
function Highway({ lit, uid }: EnvProps) {
  const VP: P = [760, 400];
  const r = rng("hw");
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}hs`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b1322" /><stop offset="1" stopColor="#3a4a63" /></linearGradient>
        <linearGradient id={`${uid}hw`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#53483a" /><stop offset="1" stopColor="#2b241d" /></linearGradient>
      </defs>
      <rect width="1600" height="440" fill={`url(#${uid}hs)`} />
      {/* storm cloud masses */}
      {[[200, 80, 340], [700, 40, 420], [1200, 100, 380], [1500, 40, 300]].map(([x, y, w], i) => <ellipse key={i} cx={x} cy={y} rx={w} ry={70} fill="#0a0f1a" opacity="0.7" />)}
      {/* distant pylons and hills */}
      <path d="M0 400 Q300 340 560 392 Q900 350 1200 396 Q1450 370 1600 400 L1600 440 L0 440 Z" fill="#0c1320" stroke={INK} strokeWidth="3" />
      {[300, 1180].map((x) => <path key={x} d={`M${x} 410 L${x + 16} 280 L${x + 32} 410 M${x + 2} 340 L${x + 30} 340 M${x - 40} 296 L${x + 72} 296`} stroke="#1b2740" strokeWidth="5" fill="none" />)}
      {/* road surface = brown flood water */}
      <polygon points={pts([0, 900], [1600, 900], [VP[0] + 40, VP[1]], [VP[0] - 40, VP[1]])} fill={`url(#${uid}hw)`} stroke={INK} strokeWidth="5" />
      <polygon points={pts([0, 900], [700, 900], [VP[0], VP[1] + 10], [VP[0] - 40, VP[1]])} fill="#2f4455" opacity="0.5" />
      {/* lane markings drowning in the water */}
      {[0, 1, 2, 3, 4, 5].map((i) => { const t = depth(i / 6, 2.2), t2 = depth((i + 0.45) / 6, 2.2); return <polygon key={i} points={pts([lerp(800, VP[0], t) - lerp(14, 3, t), lerp(900, VP[1], t)], [lerp(800, VP[0], t) + lerp(14, 3, t), lerp(900, VP[1], t)], [lerp(800, VP[0], t2) + lerp(14, 3, t2), lerp(900, VP[1], t2)], [lerp(800, VP[0], t2) - lerp(14, 3, t2), lerp(900, VP[1], t2)])} fill="#cfd6df" opacity="0.5" />; })}
      {/* ripple lines */}
      {Array.from({ length: 22 }, (_, i) => { const y = 470 + r() * 420, w = 40 + (y - 440) * 0.5, x = 100 + r() * 1400; return <path key={i} d={`M${x} ${y} q${w / 2} -8 ${w} 0`} stroke="#8aa3bd" strokeWidth="2.4" fill="none" opacity="0.4" />; })}
      {/* guard rails */}
      {[-1, 1].map((s) => <g key={s}><polyline points={pts([800 + s * 800, 610], [VP[0] + s * 46, VP[1] + 10])} stroke="#6b7a8c" strokeWidth="14" fill="none" /><polyline points={pts([800 + s * 800, 610], [VP[0] + s * 46, VP[1] + 10])} stroke={INK} strokeWidth="3" fill="none" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => { const t = depth(i / 7, 2.2); const x = lerp(800 + s * 800, VP[0] + s * 46, t), y = lerp(610, VP[1] + 10, t); return <line key={i} x1={x} x2={x} y1={y} y2={y + lerp(160, 14, t)} stroke={INK} strokeWidth={lerp(9, 2, t)} />; })}</g>)}
      {/* gantry sign */}
      <g><path d="M120 340 L120 180 M1480 340 L1480 180" stroke={INK} strokeWidth="16" /><rect x="320" y="120" width="860" height="110" fill="#1b5e44" stroke={INK} strokeWidth="7" /><path d="M360 160 L760 160 M360 196 L640 196" stroke="#e6ebf2" strokeWidth="7" opacity="0.85" /><path d="M1100 160 l30 18 -30 18" fill="none" stroke="#e6ebf2" strokeWidth="9" /></g>
      {/* stalled truck with hazards */}
      <g transform="translate(1040 560)">
        <rect x="-160" y="-170" width="250" height="170" fill="#2d3948" stroke={INK} strokeWidth="6" />
        <rect x="90" y="-120" width="90" height="120" fill="#3a4a5e" stroke={INK} strokeWidth="6" /><rect x="110" y="-104" width="52" height="40" fill="#0c1620" stroke={INK} strokeWidth="4" />
        <rect x="-170" y="-8" width="360" height="26" fill="#0a1018" opacity="0.7" /><path d="M-170 14 L190 14" stroke="#4a6a8a" strokeWidth="3" opacity="0.6" />
        <circle cx="170" cy="-86" r="11" className="fx-pulse" fill={lit ? "#e8a33d" : "#6b5020"} stroke={INK} strokeWidth="3" />
        <ellipse cx="170" cy="-86" rx="52" ry="30" fill="#e8a33d" opacity="0.22" />
      </g>
    </g>
  );
}

// ------------------------------------------------------------------------------------------- alternate depot
function Depot({ lit, alert, uid }: EnvProps) {
  const L: Quad = [[0, 140], [620, 320], [620, 600], [0, 880]];
  const R: Quad = [[1600, 140], [980, 320], [980, 600], [1600, 880]];
  return (
    <g>
      <Shell id={`${uid}dp`} top="#0a111d" bottom="#17202d" wallY={600} />
      {/* corrugated roof */}
      <polygon points={pts([0, 0], [1600, 0], [980, 320], [620, 320])} fill="#121b29" stroke={INK} strokeWidth="5" />
      {Array.from({ length: 16 }, (_, i) => <line key={i} x1={i * 100} y1="0" x2={lerp(620, 980, i / 15)} y2="320" stroke={INK} strokeWidth="3" opacity="0.55" />)}
      <rect x="620" y="320" width="360" height="280" fill="#152033" stroke={INK} strokeWidth="5" />
      {Array.from({ length: 10 }, (_, i) => <line key={i} x1={620 + i * 40} x2={620 + i * 40} y1="320" y2="600" stroke={INK} strokeWidth="2.6" opacity="0.5" />)}
      <Floor y={600} c1="#1a212c" c2="#0c1017" />
      <RackRow plane={L} bays={3} seed="dpL" levels={3} dim />
      <RackRow plane={R} bays={3} seed="dpR" levels={2} dim />
      {/* hanging bulb */}
      <g><path d="M800 0 L800 170" stroke={INK} strokeWidth="5" /><ellipse cx="800" cy="200" rx={lit ? 170 : 40} ry={lit ? 90 : 20} fill="#f2c97a" opacity={lit ? 0.14 : 0.04} /><circle cx="800" cy="186" r="18" fill={lit ? "#ffe9b0" : "#2a2f38"} stroke={INK} strokeWidth="4" /></g>
      {/* backup generator */}
      <g transform="translate(1180 760)">
        <rect x="-230" y="-250" width="460" height="250" fill="#2b3a4c" stroke={INK} strokeWidth="7" />
        <rect x="-210" y="-230" width="260" height="210" fill="#1d2937" stroke={INK} strokeWidth="4" />
        {Array.from({ length: 8 }, (_, i) => <line key={i} x1="-210" x2="50" y1={-210 + i * 26} y2={-210 + i * 26} stroke={INK} strokeWidth="3" opacity="0.7" />)}
        <rect x="80" y="-230" width="130" height="86" fill="#0c1620" stroke={INK} strokeWidth="5" />
        <rect x="92" y="-218" width="106" height="62" fill={lit ? "#3a1c1a" : "#060a10"} />
        {lit && <path d="M104 -190 L180 -190 M104 -172 L150 -172" stroke="#ff7a59" strokeWidth="5" />}
        {[0, 1, 2].map((i) => <circle key={i} cx={104 + i * 36} cy={-110} r="11" fill={lit ? (i === 1 || alert ? "#c9422f" : "#e8a33d") : "#10151c"} stroke={INK} strokeWidth="3" />)}
        <path d="M-230 0 L230 0" stroke={INK} strokeWidth="9" /><path d="M-60 -250 L-60 -330 L0 -330" stroke={INK} strokeWidth="14" fill="none" />
      </g>
      {/* forklift silhouette */}
      <g transform="translate(300 800)"><rect x="-70" y="-120" width="150" height="100" fill="#3a2f20" stroke={INK} strokeWidth="5" /><path d="M-70 -120 L-70 -230 L10 -230 L10 -120" fill="none" stroke={INK} strokeWidth="7" /><path d="M-130 -10 L-130 -210 M-110 -10 L-110 -210" stroke={INK} strokeWidth="8" /><circle cx="-30" cy="-6" r="28" fill="#10151d" stroke={INK} strokeWidth="5" /><circle cx="64" cy="-6" r="28" fill="#10151d" stroke={INK} strokeWidth="5" /></g>
      <Hatch x={0} y={720} w={600} h={180} seed="dph" op={0.3} />
    </g>
  );
}

// ------------------------------------------------------------------------------------------- press / media
function Press({ lit, uid }: EnvProps) {
  return (
    <g>
      <Shell id={`${uid}pr`} top="#070b14" bottom="#111a2b" wallY={900} />
      {/* wall of screens */}
      {[[60, 70, 340, 200], [420, 70, 340, 200], [1180, 70, 340, 200], [60, 300, 340, 200], [1180, 300, 340, 200]].map(([x, y, w, h], i) => (
        <g key={i}><rect x={x - 8} y={y - 8} width={w + 16} height={h + 16} fill="#0a0f18" stroke={INK} strokeWidth="5" /><rect x={x} y={y} width={w} height={h} fill={lit ? "#12263f" : "#05080d"} />
          {lit && <><rect x={x + 14} y={y + 14} width={w * 0.5} height={h * 0.5} fill="#27425f" /><path d={`M${x + w * 0.58} ${y + 28} L${x + w - 16} ${y + 28} M${x + w * 0.58} ${y + 52} L${x + w - 30} ${y + 52} M${x + 14} ${y + h - 36} L${x + w - 14} ${y + h - 36}`} stroke="#9fd0ff" strokeWidth="4" opacity="0.6" /></>}</g>
      ))}
      {/* main broadcast */}
      <rect x="790" y="40" width="360" height="460" fill="#0a0f18" stroke={INK} strokeWidth="8" />
      <rect x="800" y="50" width="340" height="440" fill={lit ? "#17263b" : "#05080d"} />
      {lit && (
        <g>
          <circle cx="970" cy="190" r="48" fill="#0a111c" stroke={INK} strokeWidth="5" /><path d="M880 350 Q970 250 1060 350 L1060 420 L880 420 Z" fill="#0f1928" stroke={INK} strokeWidth="5" />
          <rect x="800" y="420" width="340" height="70" fill="#c9422f" stroke={INK} strokeWidth="4" /><rect x="800" y="414" width="110" height="26" fill="#e6ebf2" stroke={INK} strokeWidth="3" />
          <path d="M826 462 L1112 462 M826 476 L1000 476" stroke="#fff" strokeWidth="6" opacity="0.9" />
        </g>
      )}
      <Floor y={600} c1="#141c29" c2="#090d14" />
      {/* foreground: phone with a notification, newspaper */}
      <g transform="translate(330 780) rotate(-8)"><rect x="-96" y="-150" width="192" height="330" rx="26" fill="#0a0f18" stroke={INK} strokeWidth="7" /><rect x="-84" y="-134" width="168" height="298" rx="14" fill={lit ? "#17314e" : "#06090e"} />
        {lit && <><rect x="-70" y="-110" width="140" height="64" rx="8" fill="#e8a33d" opacity="0.9" /><path d="M-56 -90 L50 -90 M-56 -72 L24 -72" stroke={INK} strokeWidth="5" /><rect x="-70" y="-30" width="140" height="48" rx="8" fill="#27425f" /><rect x="-70" y="34" width="140" height="48" rx="8" fill="#27425f" /></>}</g>
      <g transform="translate(1160 800) rotate(5)"><rect x="-230" y="-120" width="460" height="260" fill="#d9d3c2" stroke={INK} strokeWidth="6" /><rect x="-210" y="-100" width="420" height="52" fill={INK} opacity="0.85" /><rect x="-210" y="-30" width="190" height="130" fill="#8b8f95" opacity="0.7" /><path d="M-4 -26 L200 -26 M-4 -6 L200 -6 M-4 14 L180 14 M-4 34 L200 34 M-4 54 L170 54" stroke={INK} strokeWidth="4" opacity="0.5" /></g>
    </g>
  );
}

export const ENVIRONMENTS: Record<EnvironmentId, (p: EnvProps) => ReactNode> = {
  warehouse_floor: Warehouse, control_room: ControlRoom, electrical_area: Electrical, loading_dock: Dock, ops_office: Office,
  hospital_corridor: Hospital, flooded_highway: Highway, alt_depot: Depot, press_scene: Press,
};

/** Region (in the 1600x900 drawing) a "detail" shot pushes in on, and where silhouettes of extras may stand. */
export const ENV_FOCUS: Record<EnvironmentId, { x: number; y: number; w: number; extras: [number, number, number, boolean][] }> = {
  warehouse_floor: { x: 0, y: 440, w: 560, extras: [[620, 590, 0.85, true], [980, 580, 0.7, false], [820, 566, 0.5, true]] },
  control_room: { x: 380, y: 60, w: 840, extras: [[560, 760, 1.0, false], [1010, 700, 0.8, false]] },
  electrical_area: { x: 620, y: 100, w: 560, extras: [[300, 760, 1.1, true], [1330, 770, 0.95, false]] },
  loading_dock: { x: 500, y: 130, w: 640, extras: [[420, 760, 1.2, true], [1260, 740, 1.0, false]] },
  ops_office: { x: 820, y: 330, w: 640, extras: [] },
  hospital_corridor: { x: 500, y: 200, w: 600, extras: [[640, 600, 0.9, false], [980, 590, 0.8, false]] },
  flooded_highway: { x: 780, y: 280, w: 640, extras: [[620, 640, 0.7, true], [320, 700, 1.0, false]] },
  alt_depot: { x: 860, y: 340, w: 560, extras: [[560, 700, 1.0, true]] },
  press_scene: { x: 700, y: 20, w: 560, extras: [] },
};

export { Extra, INKS };
