import { C, Carton, Glow, INK, Poly, SceneSvg, at, persp, sub, type P, type Quad } from "./system";

/** The distribution hall at the moment the power fails: racks of medical cartons, dead ceiling lights, amber emergency lamps. */
function RackBank({ q, bays, seed }: { q: Quad; bays: number; seed: number }) {
  const out: JSX.Element[] = [];
  out.push(<Poly key="bk" q={q} fill={C.wallShade} />);
  const levels = 4;
  for (let b = 0; b < bays; b++) {
    const u0 = persp(b / bays), u1 = persp((b + 1) / bays);
    for (let l = 0; l < levels; l++) {
      const v0 = l / levels, v1 = (l + 1) / levels;
      const cell = sub(q, u0, u1, v0, v1);
      const hLeft = cell[3][1] - cell[0][1], hRight = cell[2][1] - cell[1][1];
      const n = (seed + b * 3 + l) % 3 + 1;
      for (let i = 0; i < n; i++) {
        if ((seed + b + l * 2 + i) % 7 === 0) continue;
        const fu = (i + 0.08) / n, fw = 0.82 / n;
        const a = at(cell, fu, 1), bb = at(cell, fu + fw, 1);
        const bw = Math.abs(bb[0] - a[0]), bh = Math.min(hLeft, hRight) * (0.62 + ((b + i + l) % 3) * 0.1);
        const x = Math.min(a[0], bb[0]);
        out.push(<Carton key={`c${b}${l}${i}`} x={x + 2} y={a[1] - bh - 5} w={Math.max(6, bw - 4)} h={bh} d={0.18} blue={(b + l + i + seed) % 4 === 0} label={bw > 26} />);
      }
      out.push(<polyline key={`s${b}${l}`} points={`${cell[3][0]},${cell[3][1]} ${cell[2][0]},${cell[2][1]}`} stroke={INK} strokeWidth="7" fill="none" />);
      out.push(<polyline key={`t${b}${l}`} points={`${cell[3][0]},${cell[3][1] - 2} ${cell[2][0]},${cell[2][1] - 2}`} stroke={C.rack} strokeWidth="4.5" fill="none" />);
    }
    const up = at(q, u0, 0), ud = at(q, u0, 1);
    out.push(<line key={`u${b}`} x1={up[0]} y1={up[1]} x2={ud[0]} y2={ud[1]} stroke={INK} strokeWidth="9" />);
    out.push(<line key={`uu${b}`} x1={up[0]} y1={up[1]} x2={ud[0]} y2={ud[1]} stroke={C.steel} strokeWidth="4" />);
  }
  return <g>{out}</g>;
}

export function Warehouse() {
  const L: Quad = [[-20, -60], [600, 285], [600, 530], [-20, 1000]];
  const R: Quad = [[1620, -60], [1000, 285], [1000, 530], [1620, 1000]];
  const ceiling: P[] = [[-20, -60], [1620, -60], [1000, 285], [600, 285]];
  const floor: P[] = [[-20, 1000], [600, 530], [1000, 530], [1620, 1000]];
  const lamps = [0, 1, 2, 3].map((i) => persp((i + 0.5) / 4, 1.6));
  return (
    <SceneSvg label="A distribution warehouse in a blackout: racks of medical cartons, dead ceiling lights, amber emergency lamps.">
      <rect width="1600" height="900" fill={C.wallShade} />
      <Poly q={ceiling} fill="#14223a" w={4} />
      {/* ceiling trusses and dead light bars */}
      {[0.12, 0.3, 0.5, 0.74].map((t, i) => { const p = persp(t, 1.6); const y = -60 + p * 345, xl = -20 + p * 620, xr = 1620 - p * 620; return <line key={i} x1={xl} y1={y} x2={xr} y2={y} stroke={INK} strokeWidth={10 - p * 6} />; })}
      {lamps.map((p, i) => { const y = -60 + p * 345 + 16, w = 360 - p * 280; return <g key={i}><rect x={800 - w / 2} y={y} width={w} height={14 - p * 8} rx="3" fill="#44546a" stroke={INK} strokeWidth="3" /></g>; })}
      <Poly q={[[600, 285], [1000, 285], [1000, 530], [600, 530]]} fill={C.wall} />
      {/* far roller door with an exit light */}
      <rect x="690" y="330" width="220" height="200" fill="#2d4466" stroke={INK} strokeWidth="4" />
      {Array.from({ length: 8 }, (_, i) => <line key={i} x1="690" x2="910" y1={346 + i * 24} y2={346 + i * 24} stroke={INK} strokeWidth="2" opacity="0.6" />)}
      <rect x="770" y="300" width="60" height="22" rx="3" fill="#1c6b4a" stroke={INK} strokeWidth="3" /><text x="800" y="317" textAnchor="middle" fontSize="15" fontWeight="800" fill="#9ff0c8" fontFamily="Arial, sans-serif">EXIT</text>
      <RackBank q={L} bays={6} seed={2} /><RackBank q={R} bays={6} seed={5} />
      <Poly q={floor} fill={C.floor} />
      {/* floor: aisle lines, conveyor, wet reflection */}
      <polygon points="760,530 840,530 1040,1000 560,1000" fill={C.floorShade} opacity="0.65" />
      <polyline points="715,530 330,1000" stroke="#d9a62e" strokeWidth="7" fill="none" /><polyline points="885,530 1270,1000" stroke="#d9a62e" strokeWidth="7" fill="none" />
      <g>
        <polygon points="770,560 830,560 900,640 700,640" fill="#394559" stroke={INK} strokeWidth="3" />
        {[0, 1, 2, 3].map((i) => <line key={i} x1={774 - i * 22} y1={572 + i * 20} x2={826 + i * 22} y2={572 + i * 20} stroke={INK} strokeWidth="3" opacity="0.55" />)}
        <Carton x={776} y={596} w={34} h={28} blue label={false} />
        <polygon points="700,640 900,640 928,672 672,672" fill="#2a3446" stroke={INK} strokeWidth="3" />
      </g>
      {/* two staff in the aisle, only silhouettes against the amber light, one with a torch: the hall has gone quiet */}
      {[[690, 650, 1, true], [905, 636, 0.78, false]].map(([x, y, s, torch], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          {torch && <polygon points="24,-118 300,-190 300,-30" fill="#ffe9b0" opacity="0.28" />}
          <path d="M-22 0 L-18 -64 L-30 -72 L-32 -128 Q-30 -146 -12 -146 L12 -146 Q30 -146 32 -128 L30 -72 L18 -64 L22 0 Z" fill="#0d1626" stroke={INK} strokeWidth="4" />
          <circle cx="0" cy="-172" r="22" fill="#0d1626" stroke={INK} strokeWidth="4" />
          {torch && <path d="M26 -108 L52 -128" stroke={INK} strokeWidth="10" strokeLinecap="round" />}
          {torch && <circle cx="54" cy="-130" r="8" fill="#fff3c7" />}
        </g>
      ))}
      {/* emergency lamps on the rack ends, throwing amber light */}
      {[[610, 330], [990, 330], [330, 205], [1270, 205]].map(([x, y], i) => (
        <g key={i}><Glow x={x} y={y} r={i < 2 ? 190 : 300} o={0.5} /><rect x={x - 11} y={y - 15} width="22" height="30" rx="5" fill={C.amberSoft} stroke={INK} strokeWidth="3" /></g>
      ))}
      <Glow x={800} y={560} r={260} o={0.2} />
      {/* foreground pallets */}
      <g>
        <polygon points="-20,1000 -20,760 330,740 420,780 420,1000" fill="#2f3b51" stroke={INK} strokeWidth="6" />
        <Carton x={10} y={650} w={170} h={120} label /><Carton x={200} y={668} w={140} h={102} blue /><Carton x={90} y={560} w={150} h={96} label />
        <rect x="-20" y="770" width="450" height="34" fill="#9a6a33" stroke={INK} strokeWidth="5" /><rect x="-20" y="810" width="450" height="30" fill="#7c5427" stroke={INK} strokeWidth="5" />
        <polygon points="1620,1000 1620,780 1290,760 1190,800 1190,1000" fill="#2f3b51" stroke={INK} strokeWidth="6" />
        <Carton x={1330} y={640} w={180} h={130} label blue /><Carton x={1170} y={690} w={140} h={100} /><Carton x={1400} y={540} w={150} h={100} label />
        <rect x="1190" y="790" width="440" height="34" fill="#9a6a33" stroke={INK} strokeWidth="5" />
      </g>
      {/* a dead scanner station: the barcode scanner light is red */}
      <g>
        <rect x="1075" y="610" width="12" height="150" fill={C.steel} stroke={INK} strokeWidth="3" />
        <rect x="1030" y="560" width="104" height="66" rx="6" fill={C.screenDark} stroke={INK} strokeWidth="4" />
        <rect x="1040" y="570" width="84" height="44" fill="#101b2e" /><path d="M1052 590 h60" stroke={C.red} strokeWidth="5" />
        <circle cx="1118" cy="576" r="5" fill={C.red} />
      </g>
      <rect width="1600" height="900" fill="#050a14" opacity="0.14" />
      <Glow x={330} y={205} r={380} o={0.18} /><Glow x={1270} y={205} r={380} o={0.18} />
    </SceneSvg>
  );
}
