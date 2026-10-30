import type { ReactNode } from "react";
import { INK } from "./Cast";
import { P } from "./Env";

// Story shots: full-frame pictures of the thing a panel's narration is about (failing monitors, an idle crane, a paper manifest, a queue at a
// closed gate, two numbers that disagree...). Each fills 1600 x 900 with its subject near the middle so it survives being cropped to any panel
// shape. Same language as the cast: one dark outline, flat fills, no gradients.
const ln = { stroke: INK, strokeWidth: 4, strokeLinejoin: "round" as const };
const FONT = "Arial, sans-serif";
const Frame = ({ children, label, bg = "#2c3552" }: { children: ReactNode; label: string; bg?: string }) => (
  <svg className="vscene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}><rect width="1600" height="900" fill={bg} /><g transform="translate(800 490) scale(0.78) translate(-800 -450)">{children}</g></svg>
);
const Txt = ({ x, y, s = 36, c = "#fff", w = 800, anchor = "middle", children }: { x: number; y: number; s?: number; c?: string; w?: number; anchor?: "start" | "middle" | "end"; children: ReactNode }) => (
  <text x={x} y={y} fontSize={s} fontWeight={w} fill={c} textAnchor={anchor} fontFamily={FONT}>{children}</text>
);
const Chip = ({ x, y, w, text, c = P.yellow, s = 30 }: { x: number; y: number; w: number; text: string; c?: string; s?: number }) => (
  <g><rect x={x - w / 2} y={y - s} width={w} height={s * 1.7} rx="8" fill={c} {...ln} /><Txt x={x} y={y + s * 0.18} s={s * 0.8} c={INK}>{text}</Txt></g>
);
function Monitor({ x, y, s, state }: { x: number; y: number; s: number; state: "off" | "alert" | "ok" | "fading" }) {
  const bg = state === "alert" ? "#8a2c2c" : state === "ok" ? "#1f5a82" : state === "fading" ? "#16314a" : P.screenOff;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="0" y="0" width="190" height="120" rx="8" fill={bg} {...ln} />
      <rect x="82" y="120" width="26" height="24" fill={P.metalDark} {...ln} /><rect x="48" y="142" width="94" height="12" rx="4" fill={P.metal} {...ln} />
      {state === "alert" && <path d="M26 34 H134 M26 60 H164 M26 86 H112" stroke="#ffb0a0" strokeWidth="9" strokeLinecap="round" />}
      {state === "ok" && <path d="M26 34 H134 M26 60 H100 M26 86 H150" stroke="#9fd8f4" strokeWidth="9" strokeLinecap="round" />}
      {state === "fading" && <path d="M26 34 H134 M26 60 H80" stroke="#4a7ea4" strokeWidth="9" strokeLinecap="round" />}
    </g>
  );
}
const Desk = ({ x, y, w }: { x: number; y: number; w: number }) => <g><rect x={x} y={y} width={w} height="30" rx="6" fill={P.metal} {...ln} /><rect x={x + 30} y={y + 30} width="20" height="150" fill={P.metalDark} {...ln} /><rect x={x + w - 50} y={y + 30} width="20" height="150" fill={P.metalDark} {...ln} /></g>;
function Truck({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="0" y="-170" width="200" height="170" fill="#eef0f4" {...ln} /><rect x="0" y="-40" width="200" height="22" fill={P.blue} />
      <rect x="200" y="-120" width="90" height="120" fill={P.orange} {...ln} /><rect x="216" y="-104" width="50" height="46" fill="#9fd0e8" {...ln} />
      <rect x="-6" y="-12" width="302" height="22" fill={P.metalDark} {...ln} /><circle cx="60" cy="16" r="30" fill="#2a2a36" {...ln} /><circle cx="230" cy="16" r="30" fill="#2a2a36" {...ln} />
    </g>
  );
}

// ---------------------------------------------------------------------------------------------------------------------------- shots
function MonitorsFailing() {
  return (
    <Frame label="A row of office monitors going dark one after another: one still working, one fading, one black and one showing a red message.">
      <rect y="600" width="1600" height="300" fill={P.floor} /><path d="M0 600 H1600" stroke={INK} strokeWidth="4" />
      <Desk x={90} y={560} w={1420} />
      <Monitor x={120} y={300} s={1.9} state="ok" /><Monitor x={520} y={300} s={1.9} state="fading" /><Monitor x={920} y={300} s={1.9} state="off" /><Monitor x={1280} y={420} s={0.95} state="alert" />
      <g fill={P.red} opacity="0.9"><path d="M470 250 l60 0 l-30 -50 z" stroke={INK} strokeWidth="4" /></g>
      <Chip x={300} y={250} w={250} text="STILL WORKING" c="#9fd8f4" s={26} /><Chip x={1100} y={250} w={250} text="GONE DARK" c="#c9ced9" s={26} />
    </Frame>
  );
}

function RansomScreen() {
  return (
    <Frame label="A monitor filling the picture, showing a red message that demands payment. The text is a reconstruction, not the original.">
      <rect x="170" y="70" width="1260" height="690" rx="26" fill="#10131c" {...ln} /><rect x="215" y="115" width="1170" height="600" fill="#7d1f1f" {...ln} />
      <Txt x={800} y={250} s={58} c="#ffe0d8">YOUR FILES ARE LOCKED</Txt>
      <Txt x={800} y={340} s={36} c="#ffc2b4" w={600}>Pay to get them back.</Txt>
      <path d="M300 420 H1300 M300 480 H1180 M300 540 H1240" stroke="#ff9a8a" strokeWidth="14" strokeLinecap="round" />
      <rect x="720" y="780" width="160" height="40" fill={P.metalDark} {...ln} /><rect x="520" y="820" width="560" height="40" rx="10" fill={P.metal} {...ln} />
      <Chip x={800} y={690} w={620} text="RECONSTRUCTED MESSAGE (PLACEHOLDER TEXT)" c={P.yellow} s={26} />
    </Frame>
  );
}

function CraneIdle() {
  return (
    <Frame label="A container crane standing still with a container hanging from it, and a sign reading no signal.">
      <rect y="300" width="1600" height="140" fill="#263250" /><path d="M0 300 H1600" stroke={INK} strokeWidth="4" />
      <rect y="640" width="1600" height="260" fill="#3a4262" /><path d="M0 640 H1600" stroke={INK} strokeWidth="4" />
      <path d="M300 640 V150 H1300 V640" fill="none" stroke={INK} strokeWidth="34" strokeLinejoin="round" /><path d="M300 640 V150 H1300 V640" fill="none" stroke={P.orange} strokeWidth="22" strokeLinejoin="round" />
      <rect x="260" y="130" width="1080" height="40" fill={P.orange} {...ln} /><rect x="680" y="170" width="140" height="70" fill="#bf6d1c" {...ln} />
      <path d="M720 240 V330 M780 240 V330" stroke={INK} strokeWidth="8" /><rect x="650" y="330" width="200" height="40" fill={P.metalDark} {...ln} />
      <rect x="640" y="370" width="220" height="130" fill={P.teal} {...ln} />{[1, 2, 3, 4].map((i) => <path key={i} d={`M${640 + i * 44} 380 V490`} stroke={INK} strokeOpacity="0.35" strokeWidth="3" />)}
      <rect x="1000" y="560" width="300" height="80" fill={P.blue} {...ln} /><rect x="1060" y="480" width="300" height="80" fill={P.red} {...ln} />
      <g transform="translate(180 470)"><rect x="-8" y="0" width="16" height="170" fill={P.metalDark} {...ln} /><rect x="-120" y="-120" width="240" height="130" rx="10" fill="#10131c" {...ln} /><Txt x={0} y={-65} s={34} c="#ff9a8a">NO SIGNAL</Txt><path d="M-80 -30 H80" stroke="#7d2a2a" strokeWidth="10" strokeLinecap="round" /></g>
      <Chip x={750} y={560} w={300} text="NOT MOVING" c="#f2d46a" s={26} />
    </Frame>
  );
}

function PaperList() {
  const rows = [0, 1, 2, 3, 4, 5];
  return (
    <Frame label="A clipboard with a handwritten list and a handheld radio: work done by paper and radio.">
      <rect y="640" width="1600" height="260" fill={P.floor} /><path d="M0 640 H1600" stroke={INK} strokeWidth="4" />
      <g transform="rotate(-4 700 450)">
        <rect x="380" y="90" width="620" height="760" rx="20" fill="#7a5a3a" {...ln} /><rect x="420" y="150" width="540" height="660" fill="#eee8d8" {...ln} /><rect x="580" y="110" width="220" height="60" rx="12" fill={P.metal} {...ln} />
        <Txt x={690} y={215} s={34} c={INK}>CONTAINER LIST (BY HAND)</Txt>
        {rows.map((r) => <g key={r}><rect x="450" y={250 + r * 90} width="44" height="44" fill="none" stroke={INK} strokeWidth="4" />{r < 4 && <path d={`M458 ${272 + r * 90} l12 14 l20 -30`} stroke={P.green} strokeWidth="7" fill="none" strokeLinecap="round" />}<path d={`M520 ${280 + r * 90} H${900 - ((r * 53) % 160)}`} stroke={INK} strokeOpacity="0.55" strokeWidth="6" strokeLinecap="round" /></g>)}
      </g>
      <g transform="translate(1180 220)"><rect x="0" y="80" width="190" height="400" rx="26" fill="#2a2a36" {...ln} /><rect x="150" y="-40" width="18" height="130" rx="6" fill={P.metalDark} {...ln} /><rect x="26" y="130" width="138" height="90" rx="8" fill="#1f5a82" {...ln} /><circle cx="95" cy="320" r="46" fill={P.metal} {...ln} /><path d="M40 410 H150" stroke={P.metal} strokeWidth="8" strokeLinecap="round" /></g>
      <Chip x={1275} y={160} w={260} text="PAPER + RADIO" c="#f2d46a" s={26} />
    </Frame>
  );
}

function GateQueue() {
  return (
    <Frame label="Two trucks queued at a closed terminal gate. A sign says systems are down.">
      <rect y="320" width="1600" height="150" fill="#263250" /><path d="M0 320 H1600" stroke={INK} strokeWidth="4" />
      {[0, 1, 2, 3].map((i) => <g key={i}><rect x={180 + i * 150} y={250} width="140" height="70" fill={[P.red, P.teal, P.yellow, P.blue][i]} {...ln} /></g>)}
      <rect y="470" width="1600" height="430" fill="#3a4262" /><path d="M0 470 H1600" stroke={INK} strokeWidth="4" />
      <path d="M0 640 H1600" stroke="#5a648a" strokeWidth="8" strokeDasharray="40 30" />
      <Truck x={40} y={740} s={1.9} /><Truck x={700} y={740} s={1.9} />
      <g transform="translate(1380 0)"><rect x="-12" y="360" width="24" height="380" fill={P.metalDark} {...ln} /><rect x="-300" y="430" width="300" height="34" fill={P.red} {...ln} />{[0, 1, 2, 3].map((i) => <path key={i} d={`M${-280 + i * 70} 432 l30 0 l-24 30 l-30 0 z`} fill="#fff" />)}</g>
      <g transform="translate(1380 180)"><rect x="-190" y="0" width="380" height="120" rx="12" fill={P.yellow} {...ln} /><Txt x={0} y={52} s={40} c={INK}>GATE CLOSED</Txt><Txt x={0} y={96} s={30} c={INK} w={700}>SYSTEMS DOWN</Txt></g>
    </Frame>
  );
}

function SiteMap({ mode, v }: { mode: "routes" | "survivor"; v?: string }) {
  const hi = (k: string) => (!v || v === k ? 1 : 0.25);
  const nodes: [number, number, string][] = [[240, 450, "HQ"], [620, 220, "SITE"], [620, 700, "SITE"], [1000, 450, "TERMINAL"], [1360, 220, "SITE"], [1360, 700, "SITE"]];
  if (mode === "routes") {
    return (
      <Frame label="A map with three routes from the company to the terminal: a paid one, one through an alternate site nobody has confirmed, and one reserved for urgent cargo.">
        <rect x="90" y="100" width="1420" height="700" rx="20" fill="#1f3b5c" {...ln} />
        <path opacity={hi("paid")} d="M240 450 L620 220 L1000 450" fill="none" stroke={P.green} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
        <path opacity={hi("alt")} d="M240 450 H1000" fill="none" stroke={P.yellow} strokeWidth="14" strokeDasharray="30 22" strokeLinecap="round" />
        <path opacity={hi("urgent")} d="M240 450 L620 700 L1000 450" fill="none" stroke={P.orange} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
        {[[240, 450, "COMPANY"], [1000, 450, "TERMINAL"]].map(([x, y, t]) => <g key={String(t)}><circle cx={Number(x)} cy={Number(y)} r="64" fill={P.white} {...ln} /><Txt x={Number(x)} y={Number(y) + 10} s={22} c={INK}>{String(t)}</Txt></g>)}
        <Chip x={620} y={180} w={420} text="PAID TRANSPORT (KNOWN)" c="#9fd9b8" s={26} /><Chip x={620} y={410} w={470} text="ALTERNATE SITE (NOT CONFIRMED)" c={P.yellow} s={26} /><Chip x={620} y={770} w={470} text="VEHICLES RESERVED FOR URGENT CARGO" c="#f2b26e" s={24} />
      </Frame>
    );
  }
  return (
    <Frame label="A map of company sites with almost every site dark. One machine is lit because a power cut had left it offline when the attack hit. Reported, not verified.">
      <rect x="90" y="90" width="1420" height="720" rx="20" fill="#1f3b5c" {...ln} />
      <path d="M240 450 L620 220 L1000 450 L1360 220 M620 700 L1000 450 L1360 700 M240 450 L620 700" fill="none" stroke="#3a5a7e" strokeWidth="8" />
      {nodes.map(([x, y, t], i) => {
        const lit = i === 5;
        return <g key={i}><circle cx={x} cy={y} r="62" fill={lit ? P.green : "#12161f"} {...ln} />{!lit && <path d={`M${x - 24} ${y - 24} l48 48 M${x + 24} ${y - 24} l-48 48`} stroke="#ff9a8a" strokeWidth="9" strokeLinecap="round" />}{lit && <path d={`M${x - 26} ${y} l18 22 l36 -46`} stroke="#fff" strokeWidth="11" fill="none" strokeLinecap="round" />}<Txt x={x} y={y + 100} s={22} c="#c9d0ea" w={700}>{t}</Txt></g>;
      })}
      <Chip x={800} y={128} w={1000} text="REPORTED, NOT VERIFIED: ONE MACHINE WAS OFFLINE DURING A POWER CUT" c={P.yellow} s={20} />
    </Frame>
  );
}

function TwoNumbers({ v }: { v?: string }) {
  const filled = v === "pause" ? 42 : v === "release" ? 30 : 22;
  return (
    <Frame label="Two records that disagree: a system screen showing 480 cargo lots, and a hand tally.">
      <g transform="translate(120 160)"><rect x="0" y="0" width="560" height="420" rx="16" fill="#10131c" {...ln} /><rect x="30" y="30" width="500" height="360" fill="#1f4e6e" {...ln} /><Txt x={280} y={110} s={34} c="#cfe9f7">SYSTEM SAYS</Txt><Txt x={280} y={270} s={170} c="#fff">480</Txt><Txt x={280} y={340} s={30} c="#cfe9f7" w={600}>cargo lots</Txt>
        {v === "prov" && <Chip x={280} y={-24} w={420} text="TRUSTED FOR NOW" c={P.yellow} s={28} />}</g>
      <circle cx="800" cy="370" r="74" fill={v === "pause" ? P.green : P.yellow} {...ln} /><Txt x={800} y={402} s={96} c={INK}>{v === "pause" ? "=" : "≠"}</Txt>
      <g transform="translate(920 130)"><rect x="0" y="0" width="560" height="640" rx="18" fill="#7a5a3a" {...ln} /><rect x="30" y="50" width="500" height="560" fill="#eee8d8" {...ln} /><Txt x={280} y={105} s={30} c={INK}>{v === "pause" ? "YARD COUNT: DONE" : "YARD COUNT (NOT FINISHED)"}</Txt>
        {[0, 1, 2, 3, 4, 5, 6].map((r) => <g key={r}>{[0, 1, 2, 3, 4, 5].map((c) => { const n = r * 6 + c; const on = n < filled; return <rect key={c} x={70 + c * 72} y={150 + r * 62} width="48" height="40" fill={on ? (v === "release" && n >= 22 ? P.blue : P.green) : "none"} stroke={INK} strokeOpacity={on ? 1 : 0.4} strokeWidth="3.5" />; })}</g>)}</g>
      {v === "release" && <Chip x={1200} y={820} w={560} text="BATCHES RELEASED AS CONFIRMED" c="#9fd0f0" s={26} />}
      {v === "prov" && <Chip x={1200} y={820} w={560} text="CHECK THE YARD LATER" c={P.yellow} s={26} />}
    </Frame>
  );
}

const BOARD_MARKS: Record<string, { spent: number; later: number; marks: number[]; note: string }> = {
  min: { spent: 1, later: 0, marks: [], note: "ESSENTIALS ONLY" }, bal: { spent: 6, later: 0, marks: [0, 1, 2], note: "BALANCED PACKAGE" },
  heavy: { spent: 9, later: 0, marks: [1, 2, 4], note: "MOST EFFORT SPENT EARLY" }, log: { spent: 6, later: 0, marks: [0, 3], note: "LOGISTICS FIRST" },
  neg: { spent: 4, later: 2, marks: [0, 1], note: "2 POINTS PAID LATER" }, plus: { spent: 0, later: 0, marks: [], note: "+1.5 POINTS FROM INSURER" }, due: { spent: 0, later: 2, marks: [], note: "2 POINTS NOW DUE" },
};
function Whiteboard({ v }: { v?: string }) {
  const cards = ["TRANSPORT", "IT RECOVERY", "SITE REPAIRS", "TEMPORARY SITE", "OUTSIDE HELP"];
  const m = v ? BOARD_MARKS[v] : undefined;
  return (
    <Frame label="A whiteboard with five jobs that all need effort, and twelve tokens to share between them.">
      <rect x="120" y="70" width="1360" height="760" rx="20" fill={P.white} {...ln} /><rect x="120" y="830" width="1360" height="16" fill={P.metal} {...ln} />
      {cards.map((t, i) => <g key={t}><rect x={190 + (i % 3) * 430} y={130 + Math.floor(i / 3) * 190} width="380" height="140" rx="12" fill={["#9fd0f0", "#f2d46a", "#9fd9b8", "#f2a8a0", "#cdb9ec"][i]} stroke={m?.marks.includes(i) ? P.green : INK} strokeWidth={m?.marks.includes(i) ? 12 : 4} strokeLinejoin="round" /><Txt x={380 + (i % 3) * 430} y={215 + Math.floor(i / 3) * 190} s={36} c={INK}>{t}</Txt>{m?.marks.includes(i) && <circle cx={190 + (i % 3) * 430 + 360} cy={130 + Math.floor(i / 3) * 190 + 20} r="26" fill={P.green} {...ln} />}</g>)}
      <rect x="190" y="540" width="1220" height="230" rx="14" fill="#e2e6ee" {...ln} />
      {Array.from({ length: 12 }, (_, i) => { const spent = m ? i < m.spent : false; const later = m ? i >= m.spent && i < m.spent + m.later : false; const extra = v === "plus" && i >= 10; const cx = 260 + (i % 6) * 190, cy = 600 + Math.floor(i / 6) * 90; return <g key={i}><circle cx={cx} cy={cy} r="34" fill={spent ? "#9aa4c8" : later ? "none" : extra ? P.green : P.yellow} stroke={later ? P.red : INK} strokeWidth="4" strokeDasharray={later ? "10 8" : undefined} />{spent && <path d={`M${cx - 18} ${cy - 16} l36 32 M${cx + 18} ${cy - 16} l-36 32`} stroke={INK} strokeWidth="6" strokeLinecap="round" />}</g>; })}
      <Txt x={1340} y={622} s={80} c={INK}>12</Txt><Txt x={1340} y={662} s={22} c={INK} w={700}>POINTS</Txt><Txt x={1340} y={690} s={22} c={INK} w={700}>IN TOTAL</Txt>
      {m && <Chip x={800} y={800} w={760} text={m.note} c={P.yellow} s={30} />}
    </Frame>
  );
}

function UpdateDiagram({ v }: { v?: string }) {
  const clean = v === "restrict" ? 5 : v === "special" ? 3 : 2;
  return (
    <Frame label="A diagram: a trusted outside supplier sends a software update, and the computers it reaches turn red.">
      <g transform="translate(120 250)"><rect x="0" y="0" width="300" height="300" rx="14" fill={P.white} {...ln} /><path d="M40 240 V90 L150 30 L260 90 V240 Z" fill={P.blue} {...ln} /><rect x="120" y="150" width="60" height="90" fill="#fff" {...ln} /><Txt x={150} y={340} s={34}>OUTSIDE SUPPLIER</Txt><Txt x={150} y={380} s={26} c="#c9d0ea" w={600}>trusted by your systems</Txt></g>
      <g transform="translate(470 330)"><path d="M0 70 H330" stroke={INK} strokeWidth="26" strokeLinecap="round" /><path d="M0 70 H330" stroke={P.yellow} strokeWidth="14" strokeLinecap="round" /><path d="M300 20 L370 70 L300 120 Z" fill={P.yellow} {...ln} /><rect x="110" y="-30" width="120" height="90" rx="10" fill={P.paper} {...ln} /><Txt x={170} y={25} s={26} c={INK}>UPDATE</Txt>
        {v === "restrict" && <g><circle cx="230" cy="70" r="58" fill={P.red} {...ln} /><path d="M196 36 l68 68 M264 36 l-68 68" stroke="#fff" strokeWidth="14" strokeLinecap="round" /></g>}</g>
      {Array.from({ length: 6 }, (_, i) => <g key={i} transform={`translate(${900 + (i % 3) * 210} ${190 + Math.floor(i / 3) * 280})`}><rect x="0" y="0" width="170" height="110" rx="8" fill={i < 6 - clean ? "#8a2c2c" : "#1f5a82"} {...ln} /><rect x="64" y="110" width="42" height="22" fill={P.metalDark} {...ln} /><rect x="30" y="130" width="110" height="12" rx="4" fill={P.metal} {...ln} />{i < 6 - clean && <path d="M30 40 H120 M30 66 H100" stroke="#ffb0a0" strokeWidth="9" strokeLinecap="round" />}</g>)}
      <Txt x={1110} y={680} s={34}>YOUR NETWORK</Txt>
      {v === "special" && <Chip x={1110} y={150} w={520} text="OUTSIDE SPECIALISTS CALLED IN" c="#9fd0f0" s={28} />}
      {v === "parallel" && <Chip x={1110} y={150} w={560} text="RESTORING AND INVESTIGATING" c={P.yellow} s={28} />}
      <Chip x={800} y={800} w={880} text={v === "restrict" ? "UPDATE ROUTE BLOCKED" : "SUSPICIOUS, BUT NOT PROOF OF WHO IS BEHIND IT"} c={P.yellow} s={28} />
    </Frame>
  );
}

function WipedDisk() {
  return (
    <Frame label="Left: a red message that looks like ransomware. Right: a data disk that was in fact wiped, so paying could not bring the files back.">
      <g transform="translate(110 190)"><rect x="0" y="0" width="560" height="380" rx="16" fill="#10131c" {...ln} /><rect x="28" y="28" width="504" height="324" fill="#7d1f1f" {...ln} /><Txt x={280} y={150} s={40} c="#ffe0d8">PAY TO UNLOCK</Txt><path d="M80 210 H480 M80 260 H420" stroke="#ff9a8a" strokeWidth="14" strokeLinecap="round" /><Txt x={280} y={450} s={30}>LOOKED LIKE RANSOM</Txt></g>
      <path d="M730 380 H870" stroke={INK} strokeWidth="22" strokeLinecap="round" /><path d="M730 380 H870" stroke={P.yellow} strokeWidth="12" strokeLinecap="round" /><path d="M850 340 L910 380 L850 420 Z" fill={P.yellow} {...ln} />
      <g transform="translate(980 190)"><path d="M60 60 V300 Q60 360 280 360 Q500 360 500 300 V60" fill="#8f98ba" {...ln} /><ellipse cx="280" cy="60" rx="220" ry="60" fill="#c9d0ea" {...ln} /><path d="M120 240 H440" stroke="#5a648a" strokeWidth="10" /><path d="M200 130 l160 140 M360 130 l-160 140" stroke={P.red} strokeWidth="18" strokeLinecap="round" /><Txt x={280} y={450} s={30}>DATA WAS WIPED</Txt></g>
      <Chip x={800} y={715} w={900} text="WIDELY REPORTED: PAYING COULD NOT RESTORE THE FILES" c="#9fd9b8" s={28} />
    </Frame>
  );
}

function PriorityChoice({ v }: { v?: string }) {
  return (
    <Frame label="Two claims on one truck space: urgent cargo with a ticking clock, and a key account contract with a penalty stamp.">
      <g transform="translate(150 230)"><rect x="0" y="130" width="360" height="260" fill={P.teal} {...ln} />{[1, 2, 3, 4].map((i) => <path key={i} d={`M${i * 72} 140 V380`} stroke={INK} strokeOpacity="0.35" strokeWidth="3" />)}<circle cx="300" cy="120" r="90" fill={P.white} {...ln} /><path d="M300 120 V60 M300 120 L350 146" stroke={INK} strokeWidth="10" strokeLinecap="round" /><Chip x={180} y={470} w={360} text="URGENT CARGO" c="#f2a8a0" s={30} /></g>
      <g transform="translate(560 330)"><rect x="0" y="0" width="480" height="260" rx="12" fill="none" stroke={P.yellow} strokeWidth="8" strokeDasharray="30 20" />
        {(!v || v === "neg") && <><Txt x={240} y={130} s={40}>ONE SPACE</Txt><Txt x={240} y={180} s={30} c="#c9d0ea" w={600}>on the next truck</Txt></>}
        {v === "hosp" && <g><rect x="60" y="60" width="360" height="170" fill={P.teal} {...ln} /><Txt x={240} y={160} s={38}>URGENT CARGO GOES</Txt></g>}
        {v === "contract" && <g><rect x="130" y="30" width="220" height="200" fill={P.paper} {...ln} /><Txt x={240} y={140} s={34} c={INK}>CONTRACT GOES</Txt></g>}
        {v === "neg" && <g opacity="0.9"><rect x="20" y="150" width="200" height="90" fill={P.teal} {...ln} /><rect x="260" y="150" width="200" height="90" fill={P.paper} {...ln} /><Txt x={240} y={60} s={28}>SOME OF EACH</Txt></g>}
      </g>
      <g transform="translate(1090 200)"><rect x="0" y="0" width="360" height="440" fill={P.paper} {...ln} /><path d="M40 70 H300 M40 120 H260 M40 170 H300 M40 220 H220" stroke={INK} strokeOpacity="0.5" strokeWidth="8" strokeLinecap="round" /><Txt x={180} y={50} s={32} c={INK}>CONTRACT</Txt>{v !== "contract" && <g transform="rotate(-14 180 330)"><rect x="40" y="290" width="280" height="80" rx="8" fill="none" stroke={P.red} strokeWidth="9" /><Txt x={180} y={348} s={46} c={P.red}>PENALTY</Txt></g>}<Chip x={180} y={520} w={330} text="KEY ACCOUNT" c="#9fd0f0" s={30} /></g>
    </Frame>
  );
}

function NewsTv({ v }: { v?: string }) {
  const head = v === "hold" ? "WHAT WE KNOW. WHAT WE DO NOT." : v === "wait" ? "NO STATEMENT YET" : v === "brief" ? "JOINT BRIEFING" : "COMPANY SYSTEMS DOWN";
  const sub = v === "hold" ? "Next update at a stated time" : v === "wait" ? "Company declines to comment" : v === "brief" ? "IT, terminals and customers together" : "Cause under investigation";
  return (
    <Frame label="A television news screen about a company's systems being down, and two desk phones ringing.">
      <rect y="640" width="1600" height="260" fill={P.floor} /><path d="M0 640 H1600" stroke={INK} strokeWidth="4" />
      <rect x="300" y="70" width="1000" height="570" rx="22" fill="#10131c" {...ln} /><rect x="336" y="106" width="928" height="498" fill="#14283f" {...ln} />
      <rect x="336" y="440" width="928" height="110" fill={v === "wait" ? P.metalDark : P.red} {...ln} /><Txt x={800} y={498} s={v ? 44 : 50}>{head}</Txt><rect x="336" y="550" width="928" height="54" fill="#e9ecf2" {...ln} /><Txt x={800} y={590} s={30} c={INK} w={700}>{sub}</Txt>
      {v === "brief" ? [600, 800, 1000].map((x) => <g key={x}><circle cx={x} cy="240" r="56" fill="#2c3552" {...ln} /><rect x={x - 70} y="300" width="140" height="100" rx="30" fill="#2c3552" {...ln} /></g>) : v === "wait" ? <g><rect x="680" y="220" width="240" height="190" fill="#3a4262" {...ln} /><rect x="792" y="150" width="16" height="70" fill={P.metalDark} {...ln} /><rect x="772" y="130" width="56" height="34" rx="14" fill="#2a2a36" {...ln} /></g> : <g><circle cx="800" cy="260" r="80" fill="#2c3552" {...ln} /><rect x="720" y="330" width="160" height="90" rx="30" fill="#2c3552" {...ln} /></g>}
      {[200, 1260].map((x, i) => <g key={x} transform={`translate(${x} 700)`}><rect x="0" y="40" width="150" height="80" rx="14" fill="#2a2a36" {...ln} /><rect x="10" y="10" width="130" height="40" rx="20" fill={P.metalDark} {...ln} />{[1, 2].map((k) => <path key={k} d={`M${-20 * k} 20 q-14 30 0 60`} stroke={P.yellow} strokeWidth="6" fill="none" strokeLinecap="round" transform={i ? "translate(150 0) scale(-1 1) translate(-150 0)" : ""} />)}</g>)}
      <Chip x={800} y={705} w={640} text="PHONES DO NOT STOP RINGING" c={P.yellow} s={30} />
    </Frame>
  );
}

function GateOpen({ v }: { v?: string }) {
  const tag = v === "ver" ? { c: P.green, m: "✓" } : v === "prov" ? { c: P.yellow, m: "?" } : null;
  return (
    <Frame label="The terminal gate with its barrier raised, a green light on, and a truck moving through.">
      <rect y="320" width="1600" height="150" fill="#263250" /><path d="M0 320 H1600" stroke={INK} strokeWidth="4" />
      {[0, 1, 2].map((i) => <rect key={i} x={140 + i * 150} y={250} width="140" height="70" fill={[P.red, P.teal, P.yellow][i]} {...ln} />)}
      <rect y="470" width="1600" height="430" fill="#3a4262" /><path d="M0 470 H1600" stroke={INK} strokeWidth="4" />
      <path d="M0 650 H1600" stroke="#5a648a" strokeWidth="8" strokeDasharray="40 30" />
      <g transform="translate(980 0)"><rect x="-12" y="330" width="24" height="400" fill={P.metalDark} {...ln} /><g transform="rotate(-62 0 380)"><rect x="-300" y="364" width="300" height="34" fill={P.red} {...ln} />{[0, 1, 2, 3].map((i) => <path key={i} d={`M${-280 + i * 70} 366 l30 0 l-24 30 l-30 0 z`} fill="#fff" />)}</g><circle cx="0" cy="300" r="34" fill={P.green} {...ln} /></g>
      <Truck x={180} y={780} s={1.9} />
      {tag && [0, 1, 2].map((i) => <g key={i}><rect x={250 + i * 130} y={560} width="90" height="90" rx="10" fill={tag.c} {...ln} /><Txt x={295 + i * 130} y={625} s={56} c={INK}>{tag.m}</Txt></g>)}
      {v === "sweep" && <g transform="translate(700 560)"><circle cx="0" cy="0" r="70" fill="none" stroke={P.yellow} strokeWidth="16" /><path d="M50 50 L110 110" stroke={P.yellow} strokeWidth="20" strokeLinecap="round" /></g>}
      <g transform="translate(1260 130)"><rect x="-150" y="0" width="300" height="100" rx="12" fill={P.green} {...ln} /><Txt x={0} y={66} s={52} c={INK}>OPEN</Txt></g>
      {v && <Chip x={800} y={800} w={760} text={v === "ver" ? "ONLY VERIFIED CARGO MOVES" : v === "sweep" ? "ONE LAST CHECK FIRST" : "DOUBTFUL RECORDS MOVE TOO"} c={P.yellow} s={30} />}
    </Frame>
  );
}

export type ShotId = string;
export const SHOT_IDS = ["monitors_failing", "ransom_screen", "crane_idle", "paper_list", "gate_queue", "route_map", "survivor_map", "two_numbers", "whiteboard", "update_diagram", "wiped_disk", "priority_choice", "news_tv", "gate_open"];

/** "name" or "name:variant": the variant says which decision or event the picture is showing (for instance "whiteboard:bal"). */
export function Shot({ id }: { id: ShotId }) {
  const [name, v] = id.split(":");
  switch (name) {
    case "monitors_failing": return <MonitorsFailing />;
    case "ransom_screen": return <RansomScreen />;
    case "crane_idle": return <CraneIdle />;
    case "paper_list": return <PaperList />;
    case "gate_queue": return <GateQueue />;
    case "route_map": return <SiteMap mode="routes" v={v} />;
    case "survivor_map": return <SiteMap mode="survivor" />;
    case "two_numbers": return <TwoNumbers v={v} />;
    case "whiteboard": return <Whiteboard v={v} />;
    case "update_diagram": return <UpdateDiagram v={v} />;
    case "wiped_disk": return <WipedDisk />;
    case "priority_choice": return <PriorityChoice v={v} />;
    case "news_tv": return <NewsTv v={v} />;
    case "gate_open": return <GateOpen v={v} />;
    default: return null;
  }
}
