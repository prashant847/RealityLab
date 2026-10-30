import type { ReactNode } from "react";
import { evidenceRows } from "../vector/Terminal";

// Flat environments for the first page: solid colour blocks only (no outlines, glows, gradients or perspective), like the reference frames.
// One palette per page: deep indigo walls, slate floors, orange racking, pale-yellow lit windows, and red used only for failures.
export const F = {
  wall: "#4a5885", wallDark: "#3b4672", ceiling: "#343a66", floor: "#2b2f55", floorLight: "#383d6a", rack: "#c77d34", box: "#d8b97c", boxDark: "#b88f52", boxBlue: "#6b83b8",
  metal: "#7e87b4", lamp: "#f6b13c", lampHalo: "#59557f", lit: "#f4e4a0", sky: "#1b1f45", city: "#2f3562", red: "#d6453a", redDark: "#6a2c3c", white: "#eef1f7", ink: "#1c2048", teal: "#3f8fb8",
};

function Frame({ children, label }: { children: ReactNode; label: string }) {
  return <svg className="vscene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>{children}</svg>;
}

const BOXES: [number, number, string][] = [[70, 54, F.box], [86, 66, F.boxDark], [60, 48, F.boxBlue], [96, 60, F.box], [74, 70, F.boxDark], [64, 52, F.box], [90, 58, F.boxBlue], [78, 64, F.box]];

function Rack({ x, w, y0 = 240, seed = 0 }: { x: number; w: number; y0?: number; seed?: number }) {
  const rows = [0, 1, 2, 3];
  return (
    <g>
      <rect x={x} y={y0} width="14" height="430" fill={F.ink} /><rect x={x + w - 14} y={y0} width="14" height="430" fill={F.ink} />
      {rows.map((r) => {
        const y = y0 + 100 + r * 110;
        let cx = x + 22;
        const items: ReactNode[] = [];
        for (let i = 0; cx < x + w - 90; i++) {
          const [bw, bh, col] = BOXES[(seed + r * 3 + i) % BOXES.length];
          if ((seed + r + i) % 7 === 3) { cx += 60; continue; }
          items.push(<g key={i}><rect x={cx} y={y - bh} width={bw} height={bh} fill={col} />
            {(i + r + seed) % 3 === 0 && <g><rect x={cx + bw / 2 - 11} y={y - bh / 2 - 11} width="22" height="22" fill={F.white} /><path d={`M${cx + bw / 2} ${y - bh / 2 - 7} v14 M${cx + bw / 2 - 7} ${y - bh / 2} h14`} stroke={F.red} strokeWidth="5" /></g>}</g>);
          cx += bw + 8;
        }
        return <g key={r}>{items}<rect x={x} y={y} width={w} height="14" fill={F.rack} /></g>;
      })}
    </g>
  );
}

/** Warehouse in a blackout: dead strip lights, two amber emergency lamps, roller door, racks of medical cartons. */
export function FlatWarehouse() {
  return (
    <Frame label="A distribution warehouse in a blackout: racks of medical cartons, dead ceiling lights and two amber emergency lamps.">
      <rect width="1600" height="900" fill={F.wall} />
      <rect width="1600" height="200" fill={F.ceiling} />
      {[220, 560, 900, 1240].map((x) => <rect key={x} x={x} y="110" width="190" height="20" rx="4" fill={F.metal} />)}
      <rect x="610" y="236" width="380" height="410" fill={F.wallDark} />
      {Array.from({ length: 9 }, (_, i) => <rect key={i} x="610" y={248 + i * 44} width="380" height="6" fill={F.ceiling} />)}
      <rect x="760" y="196" width="80" height="30" rx="5" fill="#2f9a6a" /><rect x="772" y="206" width="56" height="10" fill="#bff1d6" />
      <Rack x={40} w={540} seed={0} /><Rack x={1020} w={540} seed={4} />
      <rect x="598" y="276" width="24" height="48" rx="8" fill={F.lamp} /><rect x="978" y="276" width="24" height="48" rx="8" fill={F.lamp} />
      <rect y="640" width="1600" height="260" fill={F.floor} /><rect y="640" width="1600" height="14" fill={F.floorLight} />
      <rect y="760" width="1600" height="18" fill="#d9a62e" />
      <g><rect x="30" y="700" width="230" height="170" fill={F.boxDark} /><rect x="30" y="700" width="230" height="22" fill={F.box} /><rect x="116" y="740" width="58" height="58" fill={F.white} /><path d="M145 750 v38 M126 769 h38" stroke={F.red} strokeWidth="9" /></g>
      <g><rect x="1340" y="690" width="230" height="180" fill={F.box} /><rect x="1340" y="690" width="230" height="22" fill="#efe0b6" /><rect x="1426" y="738" width="58" height="58" fill={F.white} /><path d="M1455 748 v38 M1436 767 h38" stroke={F.red} strokeWidth="9" /></g>
      <g><rect x="1090" y="620" width="14" height="150" fill={F.metal} /><rect x="1046" y="578" width="104" height="60" rx="8" fill={F.ink} /><rect x="1058" y="590" width="80" height="36" fill="#0f1230" /><rect x="1070" y="604" width="52" height="8" fill={F.red} /></g>
    </Frame>
  );
}

/** IT control room: server rack, a wall of monitors (dark, one warning), floor strip. The desk is a separate foreground layer. */
export function FlatControlRoom() {
  return (
    <Frame label="The IT control room in the blackout: a wall of dark monitors with one warning screen, and a server rack.">
      <rect width="1600" height="900" fill="#4c5a8a" />
      <rect width="1600" height="130" fill={F.ceiling} /><rect x="260" y="50" width="420" height="22" rx="6" fill={F.lamp} /><rect x="920" y="50" width="420" height="22" rx="6" fill={F.metal} />
      <rect x="60" y="170" width="250" height="470" fill={F.ink} />
      {Array.from({ length: 9 }, (_, i) => <g key={i}><rect x="78" y={188 + i * 48} width="214" height="36" fill="#2b3068" /><circle cx="100" cy={206 + i * 48} r="6" fill={i % 3 === 1 ? F.red : "#5a62a0"} /><circle cx="122" cy={206 + i * 48} r="6" fill={i % 4 === 0 ? F.lamp : "#5a62a0"} /><rect x="148" y={202 + i * 48} width="120" height="7" fill="#454c8a" /></g>)}
      <rect x="370" y="150" width="1090" height="410" fill={F.ink} />
      {[0, 1, 2, 3].flatMap((c) => [0, 1].map((r) => {
        const x = 392 + c * 266, y = 170 + r * 190, bad = c === 2 && r === 0, txt = c === 0 && r === 0;
        return <g key={`${c}${r}`}><rect x={x} y={y} width="246" height="170" fill={bad ? F.redDark : txt ? "#1e5a8a" : "#242a5c"} />
          {bad && <g><path d={`M${x + 123} ${y + 40} l40 78 h-80 z`} fill={F.lamp} /><rect x={x + 119} y={y + 66} width="8" height="28" fill={F.ink} /><rect x={x + 119} y={y + 100} width="8" height="8" fill={F.ink} /></g>}
          {txt && [0, 1, 2, 3].map((k) => <rect key={k} x={x + 20} y={y + 28 + k * 30} width={200 - k * 40} height="8" fill="#7fd3ff" />)}</g>;
      }))}
      <rect y="640" width="1600" height="260" fill={F.floor} /><rect y="640" width="1600" height="14" fill={F.floorLight} />
      <g transform="translate(560 676)"><path d="M-62 -110 Q0 -140 62 -110 L52 -14 L-52 -14 Z" fill="#2b3068" /><rect x="-6" y="-14" width="12" height="76" fill="#2b3068" /><rect x="-64" y="60" width="128" height="12" fill="#2b3068" /></g>
    </Frame>
  );
}

/** The Operations Director's office: window onto the dark site, whiteboard timeline, a clock showing 8:40, desk lamp. */
export function FlatOffice({ time = [8, 40] }: { time?: [number, number] }) {
  return (
    <Frame label="The Operations Director's office on the site: a window onto the dark warehouse floor, a whiteboard timeline and a wall clock.">
      <rect width="1600" height="900" fill="#56638f" />
      <rect x="860" y="80" width="660" height="470" fill="#3b4672" /><rect x="884" y="104" width="612" height="422" fill={F.sky} />
      {[[900, 330, 96, 196], [1012, 270, 110, 256], [1138, 350, 90, 176], [1242, 300, 120, 226], [1378, 360, 100, 166]].map(([x, y, w, h], i) => <g key={i}><rect x={x} y={y} width={w} height={h} fill={F.city} />{[0, 1, 2].map((k) => <rect key={k} x={x + 14 + (k % 2) * 40} y={y + 20 + k * 46} width="22" height="22" fill={i % 2 ? F.lit : "#3b4177"} />)}</g>)}
      <rect x="1180" y="80" width="14" height="470" fill="#3b4672" /><rect x="860" y="300" width="660" height="14" fill="#3b4672" />
      <rect x="100" y="110" width="620" height="360" fill="#d6dcec" /><rect x="100" y="110" width="620" height="22" fill="#9aa4c8" />
      <rect x="140" y="180" width="220" height="16" fill="#6b74a8" />
      <path d="M150 300 H680" stroke="#454c8a" strokeWidth="8" />
      {[0, 1, 2, 3, 4, 5].map((i) => <g key={i}><circle cx={170 + i * 100} cy="300" r="14" fill={i === 0 ? F.red : "#6b74a8"} /><rect x={150 + i * 100} y="332" width="62" height="10" fill="#9aa4c8" /><rect x={150 + i * 100} y="352" width="44" height="10" fill="#b8c0dc" /></g>)}
      <g transform="translate(800 330)"><circle r="62" fill={F.white} /><circle r="62" fill="none" stroke="#9aa4c8" strokeWidth="8" /><path d="M0 0 V-30" transform={`rotate(${(time[0] % 12) * 30 + time[1] / 2})`} stroke={F.ink} strokeWidth="9" strokeLinecap="round" /><path d="M0 0 V-46" transform={`rotate(${time[1] * 6})`} stroke={F.ink} strokeWidth="6" strokeLinecap="round" /><circle r="6" fill={F.ink} /></g>
      <rect y="640" width="1600" height="260" fill={F.floor} /><rect y="640" width="1600" height="14" fill={F.floorLight} />
      <g transform="translate(110 650)"><rect x="-8" y="-190" width="16" height="190" fill={F.metal} /><path d="M0 -190 L80 -230" stroke={F.metal} strokeWidth="14" strokeLinecap="round" /><path d="M62 -250 L130 -214 L96 -186 Z" fill={F.lamp} /></g>
    </Frame>
  );
}

/** Foreground desk for the control room: keyboard, notebook, a dead hand scanner. Drawn over the person's lower body. */
export function FlatControlDesk() {
  return (
    <Frame label="">
      <rect y="640" width="1600" height="260" fill="#2a2f66" /><rect y="640" width="1600" height="24" fill="#3d4580" />
      <rect x="800" y="652" width="380" height="50" rx="10" fill={F.ink} />{Array.from({ length: 11 }, (_, i) => <rect key={i} x={816 + i * 33} y="662" width="24" height="12" rx="3" fill="#59639c" />)}{Array.from({ length: 10 }, (_, i) => <rect key={i} x={826 + i * 33} y="680" width="24" height="12" rx="3" fill="#59639c" />)}
      <rect x="260" y="668" width="190" height="64" fill="#e8ecf5" /><rect x="280" y="688" width="130" height="7" fill="#9aa4c8" /><rect x="280" y="706" width="100" height="7" fill="#9aa4c8" /><rect x="410" y="652" width="76" height="9" rx="4" fill={F.red} />
      <rect x="90" y="664" width="140" height="58" rx="16" fill={F.ink} /><rect x="124" y="680" width="48" height="12" rx="6" fill={F.red} />
    </Frame>
  );
}

export function FlatOfficeDesk() {
  return (
    <Frame label="">
      <rect y="660" width="1600" height="240" fill="#2a2f66" /><rect y="660" width="1600" height="24" fill="#3d4580" />
      <rect x="760" y="672" width="300" height="60" fill="#e8ecf5" /><rect x="784" y="692" width="200" height="7" fill="#9aa4c8" /><rect x="784" y="710" width="150" height="7" fill="#9aa4c8" />
      <rect x="1180" y="620" width="56" height="70" rx="8" fill={F.white} /><rect x="1236" y="636" width="22" height="36" rx="11" fill="none" stroke={F.white} strokeWidth="8" />
      <g transform="translate(380 664)"><rect x="-150" y="-8" width="300" height="12" fill="#59639c" /><path d="M-130 -8 L-110 -150 H110 L130 -8 Z" fill={F.ink} /><rect x="-96" y="-132" width="192" height="110" fill="#242a5c" /><rect x="-70" y="-108" width="110" height="8" fill={F.red} /><rect x="-70" y="-88" width="80" height="8" fill="#7fd3ff" /></g>
    </Frame>
  );
}

/** The inventory terminal as flat blocks; every row is one of the scene's own known facts. */
export function FlatTerminal({ facts }: { facts: string[] }) {
  const rows = evidenceRows(facts);
  const col = (s: string) => (s === "failed" ? F.red : s === "warning" ? F.lamp : F.teal);
  return (
    <Frame label={`The inventory terminal. ${rows.map((r) => `${r.title}: ${r.status}`).join(". ")}`}>
      <rect width="1600" height="900" fill="#4c5a8a" />
      <rect y="720" width="1600" height="180" fill="#2a2f66" /><rect y="720" width="1600" height="22" fill="#3d4580" />
      <rect x="240" y="70" width="1120" height="640" rx="26" fill={F.ink} /><rect x="268" y="98" width="1064" height="584" rx="8" fill="#232a5c" />
      <rect x="268" y="98" width="1064" height="70" fill="#2f3a78" />
      <text x="304" y="146" fontSize="34" fontWeight="800" fill={F.white} fontFamily="Bahnschrift, 'Arial Narrow', Arial, sans-serif" letterSpacing="3">MERIDIAN INVENTORY SYSTEM</text>
      <circle cx="1282" cy="133" r="13" fill={F.red} /><text x="1254" y="143" textAnchor="end" fontSize="24" fontWeight="800" fill="#ffb7a8" fontFamily="Arial, sans-serif">NO SIGNAL</text>
      {rows.map((r, i) => {
        const y = 194 + i * 150, c = col(r.severity);
        const lines = (r.detail || "").match(/.{1,40}(\s|$)/g)?.slice(0, 2) ?? [];
        return (
          <g key={i}>
            <rect x="304" y={y} width="992" height="130" rx="12" fill="#2a3270" /><rect x="304" y={y} width="18" height="130" fill={c} />
            <circle cx="384" cy={y + 65} r="34" fill={c} />
            {r.severity === "failed" ? <path d={`M368 ${y + 49} l32 32 M400 ${y + 49} l-32 32`} stroke={F.ink} strokeWidth="8" strokeLinecap="round" /> : <><rect x="380" y={y + 44} width="8" height="24" fill={F.ink} /><rect x="380" y={y + 74} width="8" height="8" fill={F.ink} /></>}
            <text x="446" y={y + (lines.length ? 58 : 80)} fontSize="40" fontWeight="800" fill={F.white} fontFamily="Arial, sans-serif">{r.title}</text>
            {lines.map((l, k) => <text key={k} x="446" y={y + 92 + k * 28} fontSize="25" fill="#c9d0ea" fontFamily="Arial, sans-serif">{l.trim()}</text>)}
            <rect x="960" y={y + 30} width="310" height="50" rx="25" fill={c} /><text x="1115" y={y + 65} textAnchor="middle" fontSize="25" fontWeight="800" fill={F.ink} fontFamily="Arial, sans-serif" letterSpacing="1.5">{r.status}</text>
          </g>
        );
      })}
      <rect x="740" y="712" width="120" height="40" fill="#59639c" /><rect x="620" y="744" width="360" height="26" rx="8" fill="#59639c" />
      <g transform="translate(1180 800) rotate(-6)"><rect x="-70" y="-30" width="140" height="60" rx="16" fill={F.ink} /><rect x="-24" y="-12" width="48" height="12" rx="6" fill={F.red} /></g>
    </Frame>
  );
}
