import type { ReactNode } from "react";
import { Bubble, Clock, Cough, Defs, FONT, INK, Sfx, Stick } from "./ink";
import type { ComicPage } from "./types";

/**
 * COVID Hospital, Round 1 ("The first surge") told as a comic: three pages of panels, each page a sheet with gutters, in the manner of a printed comic. The story is told
 * through what happens (ambulances arriving, the number of people waiting, a queue that is longer than the team can assess, guidance that changes, a new nurse
 * holding on, a senior consultant asking the question), not through people posing. Only what the round states is shown; nothing medical is added.
 * Everything is vector art drawn in code: no AI-generated pictures, and the words are live text.
 */
const PAPER = "#f1e8cf";

function Sheet({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 1280 720" className="ck-page" role="img" preserveAspectRatio="xMidYMid meet">
      <Defs />
      <defs>
        <linearGradient id="st-dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fc4ec" /><stop offset="0.65" stopColor="#ffd3a1" /><stop offset="1" stopColor="#ffb085" /></linearGradient>
        <linearGradient id="st-morn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5fa8dc" /><stop offset="1" stopColor="#bfe0f2" /></linearGradient>
        <radialGradient id="st-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#fff6c9" stopOpacity="1" /><stop offset="1" stopColor="#fff6c9" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="1280" height="720" fill={PAPER} />
      {children}
    </svg>
  );
}

/** A comic panel: clipped picture with a heavy black frame. Contents are drawn in the panel's own coordinates (0,0 at its top-left). */
function Panel({ id, x, y, w, h, children }: { id: string; x: number; y: number; w: number; h: number; children: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <clipPath id={`clip-${id}`}><rect width={w} height={h} /></clipPath>
      <g clipPath={`url(#clip-${id})`}>{children}</g>
      <rect width={w} height={h} fill="none" stroke={INK} strokeWidth="6" />
    </g>
  );
}

/** The yellow narration box. */
function Cap({ x = 12, y = 12, lines, w }: { x?: number; y?: number; lines: string[]; w: number }) {
  const h = 20 + lines.length * 30;
  return (
    <g fontFamily={FONT} fontWeight="700">
      <rect x={x + 5} y={y + 5} width={w} height={h} fill={INK} /><rect x={x} y={y} width={w} height={h} fill="#fbe04d" stroke={INK} strokeWidth="3.4" />
      {lines.map((t, i) => <text key={i} x={x + 12} y={y + 29 + i * 30} fontSize="22" fill={INK}>{t}</text>)}
    </g>
  );
}

const Dots = ({ w, h, o = 0.1 }: { w: number; h: number; o?: number }) => <rect width={w} height={h} fill="url(#ck-dots)" opacity={o} />;
const Hatch = ({ w, h, o = 0.07 }: { w: number; h: number; o?: number }) => <rect width={w} height={h} fill="url(#ck-hatch)" opacity={o} />;
const Speed = ({ x, y, n = 4, len = 120, gap = 16 }: { x: number; y: number; n?: number; len?: number; gap?: number }) => (
  <g stroke={INK} strokeWidth="4" strokeLinecap="round">{Array.from({ length: n }).map((_, i) => <path key={i} d={`M${x} ${y + i * gap}H${x + len - (i % 2) * 28}`} />)}</g>
);

// ---------------------------------------------------------------- things in the world
function Ambulance({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <rect x="0" y="0" width="210" height="92" rx="14" fill="#fff" stroke={INK} strokeWidth="5.5" />
      <rect x="0" y="52" width="210" height="20" fill="#e53935" stroke={INK} strokeWidth="4" />
      <path d="M150 8h42q14 0 18 26v14h-60z" fill="#a9d6ec" stroke={INK} strokeWidth="4.4" strokeLinejoin="round" />
      <path d="M46 14v36M28 32h36" stroke="#e53935" strokeWidth="13" strokeLinecap="round" />
      <rect x="84" y="-16" width="46" height="18" rx="6" fill="#3fa9f5" stroke={INK} strokeWidth="4" /><rect x="84" y="-16" width="23" height="18" rx="6" fill="#ff4a4a" stroke={INK} strokeWidth="4" />
      <g stroke={INK} strokeWidth="3.4" strokeLinecap="round"><path d="M76 -14l-16 -10M72 -4l-20 0M138 -14l16 -10M142 -4l20 0M107 -20v-16" /></g>
      <circle cx="46" cy="94" r="21" fill={INK} /><circle cx="46" cy="94" r="8" fill="#ccc" /><circle cx="162" cy="94" r="21" fill={INK} /><circle cx="162" cy="94" r="8" fill="#ccc" />
    </g>
  );
}

const Rows = ({ x, y, n, step, s }: { x: number; y: number; n: number; step: number; s: number }) => (
  <g>{Array.from({ length: n }).map((_, i) => <Stick key={i} x={x - i * step} y={y} s={s} pose="stand" mouth={i % 3 === 0 ? "worried" : "flat"} mask={i % 2 === 0} flip look={i % 2 ? 2 : -2} />)}</g>
);

// ================================================================================ PAGE 1
function PageOne() {
  return (
    <Sheet>
      {/* A: the morning, wide */}
      <Panel id="a1" x={16} y={16} w={1248} h={334}>
        <rect width="1248" height="334" fill="url(#st-dawn)" />
        <circle cx="140" cy="130" r="90" fill="url(#st-glow)" /><circle cx="140" cy="130" r="46" fill="#ffe36b" stroke={INK} strokeWidth="5" /><circle cx="140" cy="130" r="46" fill="url(#ck-dots-s)" opacity="0.14" />
        {[[250, 160, 70, 100], [330, 130, 60, 130], [420, 170, 90, 90], [520, 150, 70, 110]].map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} fill="#8a8fa6" stroke={INK} strokeWidth="4" opacity="0.85" />)}
        <rect x="660" y="70" width="520" height="196" fill="#e9d3ab" stroke={INK} strokeWidth="6" /><Hatch w={1248} h={334} o={0.04} />
        <rect x="810" y="34" width="220" height="52" fill="#fff" stroke={INK} strokeWidth="5" /><path d="M920 42v36M902 60h36" stroke="#e53935" strokeWidth="13" strokeLinecap="round" />
        {[0, 1, 2].flatMap((r) => [0, 1, 2, 3, 4, 5].map((c) => <g key={`${r}${c}`}><rect x={690 + c * 78} y={100 + r * 54} width="44" height="34" fill={(r + c) % 3 === 0 ? "#ffe9a3" : "#a9d6ec"} stroke={INK} strokeWidth="4" /><path d={`M${712 + c * 78} ${100 + r * 54}v34`} stroke={INK} strokeWidth="2.6" /></g>))}
        <rect x="860" y="176" width="110" height="92" fill="#6aa4c8" stroke={INK} strokeWidth="5" /><path d="M915 176v92" stroke={INK} strokeWidth="4" /><rect x="840" y="154" width="150" height="24" fill="#fff" stroke={INK} strokeWidth="4.4" /><text x="915" y="173" textAnchor="middle" fontFamily={FONT} fontWeight="700" fontSize="17" fill="#d32f2f">EMERGENCY</text>
        <rect y="262" width="1248" height="72" fill="#b7b2a6" stroke={INK} strokeWidth="5" /><Dots w={1248} h={334} o={0.04} /><path d="M0 306H1248" stroke="#fff" strokeWidth="4" strokeDasharray="30 22" opacity="0.8" />
        <Speed x={150} y={206} n={4} len={90} /><Ambulance x={250} y={170} s={0.9} />
        <Speed x={60} y={248} n={3} len={70} /><Ambulance x={470} y={206} s={0.62} />
        <Rows x={1210} y={312} n={12} step={47} s={0.31} />
        <Stick x={742} y={314} s={0.52} pose="point" mouth="open" outfit="scrubs" hat="scrub-cap" look={5} />
        <Cap lines={["Day three, 07:30.", "Overnight, admissions doubled."]} w={372} />
      </Panel>

      {/* B: an ambulance backs in, a stretcher comes out */}
      <Panel id="b1" x={16} y={364} w={610} h={340}>
        <rect width="610" height="340" fill="url(#st-morn)" /><Dots w={610} h={340} o={0.05} />
        <rect y="270" width="610" height="70" fill="#9e9a8e" stroke={INK} strokeWidth="5" />
        <rect x="330" y="40" width="270" height="236" rx="10" fill="#fff" stroke={INK} strokeWidth="6" /><rect x="330" y="150" width="270" height="22" fill="#e53935" stroke={INK} strokeWidth="4" />
        <rect x="350" y="62" width="100" height="196" fill="#2a2f3a" stroke={INK} strokeWidth="5" /><rect x="470" y="62" width="100" height="196" fill="#2a2f3a" stroke={INK} strokeWidth="5" />
        <path d="M330 40L296 70V270L330 276Z" fill="#f2f2f2" stroke={INK} strokeWidth="5" strokeLinejoin="round" /><path d="M600 40L632 70V270L600 276Z" fill="#f2f2f2" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M416 100v40M396 120h40" stroke="#e53935" strokeWidth="12" strokeLinecap="round" />
        <rect x="560" y="268" width="26" height="14" fill="#ff4a4a" stroke={INK} strokeWidth="3" />
        {/* the stretcher with a patient */}
        <rect x="40" y="206" width="250" height="20" rx="6" fill="#fff" stroke={INK} strokeWidth="5" /><path d="M70 226v44M260 226v44" stroke={INK} strokeWidth="7" strokeLinecap="round" /><circle cx="70" cy="278" r="14" fill={INK} /><circle cx="260" cy="278" r="14" fill={INK} />
        <g transform="translate(166 190) rotate(90)"><Stick x={0} y={0} s={0.5} pose="stand" mouth="o" mask sweat /></g>
        <Stick x={20} y={290} s={0.62} pose="lean" mouth="grit" outfit="vest" hat="cap" />
        <Stick x={300} y={296} s={0.62} pose="lean" mouth="grit" outfit="vest" hat="cap" flip />
        <Speed x={10} y={120} n={3} len={80} /><Sfx x={36} y={84} text="WEE-OO!" size={58} rotate={-7} />
      </Panel>

      {/* C: the doors, and the number */}
      <Panel id="c1" x={640} y={364} w={624} h={340}>
        <rect width="624" height="340" fill="#d6e6e2" /><Hatch w={624} h={340} o={0.06} />
        <rect y="262" width="624" height="78" fill="#e0cc9f" stroke={INK} strokeWidth="5" /><Dots w={624} h={340} o={0.05} />
        <rect x="150" y="24" width="320" height="112" rx="10" fill={INK} /><text x="310" y="64" textAnchor="middle" fontFamily={FONT} fontWeight="700" fontSize="24" fill="#ffdd57">EMERGENCY · WAITING</text><text x="310" y="122" textAnchor="middle" fontFamily="Impact, 'Arial Black', sans-serif" fontSize="62" fill="#ff5252" letterSpacing="8">31</text>
        <rect x="210" y="152" width="200" height="122" fill="#6aa4c8" stroke={INK} strokeWidth="6" /><path d="M310 152v122" stroke={INK} strokeWidth="5" /><rect x="224" y="168" width="72" height="58" fill="#d9f0fa" stroke={INK} strokeWidth="3" /><rect x="324" y="168" width="72" height="58" fill="#d9f0fa" stroke={INK} strokeWidth="3" />
        <Clock x={64} y={76} r={42} h={7} m={30} />
        <Stick x={110} y={316} s={0.78} pose="stand" mouth="worried" mask look={6} /><Stick x={30} y={326} s={0.8} pose="hands-up" mouth="o" sweat look={6} />
        <Stick x={520} y={316} s={0.78} pose="stand" mouth="grit" flip look={-6} /><Stick x={590} y={326} s={0.8} pose="shrug" mouth="worried" mask flip look={-6} />
        <Cough x={150} y={190} />
        <Cap x={12} y={246} lines={["Thirty-one people are waiting in the", "emergency department."]} w={420} />
      </Panel>
    </Sheet>
  );
}

// ================================================================================ PAGE 2
const TopDown = ({ x, y, c = "#d96a5a", mask = false, bad = false }: { x: number; y: number; c?: string; mask?: boolean; bad?: boolean }) => (
  <g>
    <ellipse cx={x} cy={y + 28} rx="28" ry="22" fill={c} stroke={INK} strokeWidth="4" />
    <path d={`M${x - 26} ${y + 26}L${x - 40} ${y + (bad ? 8 : 40)}M${x + 26} ${y + 26}L${x + 40} ${y + (bad ? 8 : 40)}`} stroke={INK} strokeWidth="6" strokeLinecap="round" />
    <circle cx={x} cy={y} r="19" fill="#fff" stroke={INK} strokeWidth="4.4" />
    {mask && <path d={`M${x - 15} ${y + 3}H${x + 15}V${y + 13}Q${x} ${y + 17} ${x - 15} ${y + 13}Z`} fill="#cfe9f5" stroke={INK} strokeWidth="2.6" />}
    <circle cx={x - 6} cy={y - 5} r="2.6" fill={INK} /><circle cx={x + 6} cy={y - 5} r="2.6" fill={INK} />
    {bad && <path d={`M${x + 24} ${y - 14}l12 -8M${x + 26} ${y - 4}l14 -2`} stroke={INK} strokeWidth="3.4" strokeLinecap="round" />}
  </g>
);

function PageTwo() {
  return (
    <Sheet>
      {/* A: the room from above */}
      <Panel id="a2" x={16} y={16} w={420} h={688}>
        <rect width="420" height="688" fill="#e0cc9f" /><Hatch w={420} h={688} o={0.05} /><Dots w={420} h={688} o={0.06} />
        <g stroke={INK} strokeWidth="2.6" opacity="0.4">{Array.from({ length: 9 }).map((_, i) => <path key={i} d={`M${i * 52} 0V688`} />)}{Array.from({ length: 14 }).map((_, i) => <path key={i} d={`M0 ${i * 52}H420`} />)}</g>
                {[0, 1, 2, 3, 4].map((r) => [0, 1, 2].map((c) => {
          const bad = (r * 3 + c) % 5 === 1;
          return <g key={`${r}${c}`}><rect x={56 + c * 120} y={140 + r * 112} width="84" height="26" rx="6" fill="#3d7fc4" stroke={INK} strokeWidth="4" /><TopDown x={98 + c * 120} y={110 + r * 112} c={["#d96a5a", "#8a5a3c", "#6aa56a", "#d8a82f", "#7b4fc4"][(r + c * 2) % 5]} mask={(r + c) % 2 === 0} bad={bad} /></g>;
        }))}
        <Cap x={12} y={600} lines={["A mix of mild and severe", "breathing difficulty."]} w={330} />
      </Panel>

      {/* B: two patients, side by side */}
      <Panel id="b2" x={450} y={16} w={814} h={334}>
        <rect width="407" height="334" fill="#d3ecd9" /><rect x="407" width="407" height="334" fill="#f6d8c4" /><Hatch w={814} h={334} o={0.05} /><Dots w={814} h={334} o={0.05} />
        <rect y="262" width="814" height="72" fill="#c9b78d" stroke={INK} strokeWidth="5" />
        <path d="M407 0V334" stroke={INK} strokeWidth="7" />
        {/* calm */}
        <rect x="70" y="208" width="270" height="22" rx="6" fill="#3d7fc4" stroke={INK} strokeWidth="5" /><path d="M96 230v38M314 230v38" stroke={INK} strokeWidth="7" strokeLinecap="round" />
        <Stick x={210} y={206} s={0.7} pose="sit" mouth="smile" mask tilt={0} shirtColor="#6aa56a" outfit="tee" look={-2} />
        <rect x="262" y="124" width="52" height="80" rx="8" fill={INK} /><rect x="267" y="131" width="42" height="66" rx="4" fill="#9fd6ff" />
        {/* struggling */}
        <rect x="478" y="208" width="270" height="22" rx="6" fill="#3d7fc4" stroke={INK} strokeWidth="5" /><path d="M504 230v38M722 230v38" stroke={INK} strokeWidth="7" strokeLinecap="round" />
        <Stick x={620} y={206} s={0.7} pose="sit" mouth="o" mask sweat tilt={14} shirtColor="#d96a5a" outfit="tee" look={4} />
        <Cough x={700} y={130} /><Cough x={540} y={140} flip />
        <Sfx x={540} y={60} text="COUGH!" size={58} rotate={-6} />
      </Panel>

      {/* C: the line is longer than the desk */}
      <Panel id="c2" x={450} y={364} w={400} h={340}>
        <rect width="400" height="340" fill="#cde0e8" /><Hatch w={400} h={340} o={0.06} />
        <path d="M0 150L400 150" stroke={INK} strokeWidth="4" opacity="0.5" /><rect y="150" width="400" height="190" fill="#e0cc9f" /><Dots w={400} h={340} o={0.06} />
        <path d="M60 340L200 150M340 340L210 150" stroke={INK} strokeWidth="4" opacity="0.35" />
        {Array.from({ length: 9 }).map((_, i) => { const t = i / 8; return <Stick key={i} x={300 - t * 120 + (i % 2) * 14} y={330 - t * 150} s={0.62 - t * 0.42} pose="stand" mouth={i % 3 === 0 ? "worried" : "flat"} mask={i % 2 === 0} look={-3} />; })}
        <rect x="14" y="196" width="150" height="62" rx="6" fill="#fff" stroke={INK} strokeWidth="5" />
        <Stick x={90} y={196} s={0.44} pose="clipboard" mouth="worried" outfit="nurse" hat="nurse-cap" sweat />
        <Cap y={250} x={12} lines={["Patients are arriving faster", "than your team can assess them."]} w={376} />
      </Panel>

      {/* D: and still they come */}
      <Panel id="d2" x={864} y={364} w={400} h={340}>
        <rect width="400" height="340" fill="#1f2a3a" /><rect x="110" y="30" width="180" height="270" fill="#fff6c9" stroke={INK} strokeWidth="6" /><rect x="110" y="30" width="180" height="270" fill="url(#st-glow)" opacity="0.6" />
        <rect y="290" width="400" height="50" fill="#e0cc9f" stroke={INK} strokeWidth="5" /><Dots w={400} h={340} o={0.06} />
        <path d="M120 250H70M70 250l16 -14M70 250l16 14" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
        <Stick x={200} y={296} s={0.74} pose="stand" mouth="worried" mask look={0} color="#fff" />
        <Stick x={120} y={304} s={0.5} pose="stand" mouth="flat" mask hat="beanie" outfit="jacket" />
        <Stick x={296} y={304} s={0.5} pose="stand" mouth="o" outfit="hoodie" flip />
        <Stick x={354} y={310} s={0.4} pose="stand" mouth="flat" mask flip />
        <Clock x={52} y={60} r={34} h={7} m={30} />
      </Panel>
    </Sheet>
  );
}

// ================================================================================ PAGE 3
function PageThree() {
  return (
    <Sheet>
      {/* A: the guidance changes */}
      <Panel id="a3" x={16} y={16} w={620} h={340}>
        <rect width="620" height="340" fill="#d9e1ec" /><Hatch w={620} h={340} o={0.06} /><rect y="268" width="620" height="72" fill="#cdbfa0" stroke={INK} strokeWidth="5" /><Dots w={620} h={340} o={0.05} />
        <rect x="40" y="170" width="540" height="40" rx="8" fill="#b9783c" stroke={INK} strokeWidth="5" />
        <g transform="rotate(-6 160 150)"><rect x="90" y="106" width="110" height="82" fill="#fff" stroke={INK} strokeWidth="4" /><path d="M104 128h82M104 144h70M104 160h78" stroke="#9aa" strokeWidth="5" strokeLinecap="round" /><path d="M96 112L194 182M194 112L96 182" stroke="#e53935" strokeWidth="7" strokeLinecap="round" /></g>
        <g transform="rotate(5 280 150)"><rect x="230" y="96" width="120" height="92" fill="#fff" stroke={INK} strokeWidth="4" /><path d="M244 120h92M244 138h78M244 156h86" stroke="#9aa" strokeWidth="5" strokeLinecap="round" /><rect x="296" y="102" width="46" height="20" fill="#e53935" stroke={INK} strokeWidth="3" /></g>
        <g transform="rotate(8 470 150)"><rect x="440" y="140" width="70" height="40" rx="8" fill={INK} /><rect x="446" y="146" width="58" height="28" fill="#9fd6ff" /></g>
        <Sfx x={400} y={118} text="BZZT!" size={64} rotate={7} />
        <Stick x={70} y={330} s={0.8} pose="clipboard" mouth="worried" outfit="scrubs" hat="scrub-cap" look={8} />
        <Stick x={560} y={330} s={0.8} pose="hold" mouth="o" outfit="scrubs" hat="cap" flip look={-8} />
        <Cap y={12} lines={["Guidance from health authorities", "is still changing."]} w={380} />
      </Panel>

      {/* B: a new nurse, holding on */}
      <Panel id="b3" x={650} y={16} w={614} h={340}>
        <rect width="614" height="340" fill="#e8dcf5" /><Hatch w={614} h={340} o={0.06} /><Dots w={614} h={340} o={0.06} />
        <g stroke={INK} strokeWidth="4" strokeLinecap="round" opacity="0.7"><path d="M120 140l-26 -10M116 176l-30 0M122 210l-26 12M520 140l26 -10M524 176l30 0M518 210l26 12" /></g>
        <Stick x={310} y={520} s={1.7} pose="clipboard" mouth="worried" outfit="nurse" hat="nurse-cap" sweat look={-3} />
        <Bubble x={380} y={14} w={170} lines={["…"]} tail={[330, 124]} />
        <Cap x={12} y={262} lines={["Your team is anxious and some", "are new to this."]} w={400} />
      </Panel>

      {/* C: the one who has to decide */}
      <Panel id="c3" x={16} y={370} w={780} h={334}>
        <rect width="780" height="334" fill="#cfe0ea" /><Hatch w={780} h={334} o={0.06} /><rect y="236" width="780" height="98" fill="#e0cc9f" stroke={INK} strokeWidth="5" /><Dots w={780} h={334} o={0.06} />
        <path d="M0 334L390 236M780 334L390 236" stroke={INK} strokeWidth="4" opacity="0.35" />
        <Rows x={90} y={300} n={4} step={-40} s={0.36} />
        <Rows x={700} y={300} n={4} step={40} s={0.36} />
        {[[40, 214], [740, 214]].map(([x, y], i) => <Stick key={i} x={x} y={y + 66} s={0.62} pose="clipboard" mouth="worried" outfit={i ? "nurse" : "scrubs"} hat={i ? "nurse-cap" : "scrub-cap"} flip={!!i} look={i ? -6 : 6} />)}
        <circle cx="390" cy="150" r="170" fill="url(#st-glow)" opacity="0.55" />
        <Stick x={390} y={318} s={0.84} pose="shrug" mouth="worried" outfit="scrubs" hat="scrub-cap" sweat look={0} />
        <text x="470" y="108" fontFamily={FONT} fontWeight="700" fontSize="120" fill="#ff5252" stroke={INK} strokeWidth="7" paintOrder="stroke" transform="rotate(-8 470 108)">?</text>
        <Clock x={64} y={64} r={40} h={7} m={30} />
      </Panel>

      {/* D: the question */}
      <Panel id="d3" x={810} y={370} w={454} h={334}>
        <rect width="454" height="334" fill="#ffe08a" /><Hatch w={454} h={334} o={0.06} />
        <rect x="120" y="150" width="214" height="184" fill="#2a2f3a" stroke={INK} strokeWidth="6" /><rect x="132" y="162" width="190" height="172" fill="#fff6c9" /><rect x="132" y="162" width="190" height="172" fill="url(#st-glow)" opacity="0.7" />
        <Stick x={227} y={330} s={0.72} pose="point" mouth="open" outfit="coat" hat="grey-hair" look={0} />
        <Bubble x={14} y={4} w={426} lines={["Thirty-one in the department.", "Tell me how you want", "to decide who is", "seen first."]} tail={[227, 168]} />
        <Cap x={12} y={266} lines={["How do you organise who is seen first?"]} w={430} />
      </Panel>
    </Sheet>
  );
}

export const ROUND1_STORY: ComicPage[] = [
  { id: "page1", render: () => <PageOne />, alt: "Page one. Day three, 07:30: overnight, admissions doubled. Ambulances arrive at the hospital and a long queue waits outside; a stretcher is pulled from an ambulance; a sign over the emergency doors shows 31 waiting.", spoken: "Day three, 07:30. Overnight, admissions doubled. Thirty-one people are waiting in the emergency department." },
  { id: "page2", render: () => <PageTwo />, alt: "Page two. The waiting room seen from above, full of patients, some calm and some struggling to breathe; a calm patient beside a gasping one; a single nurse at a desk with a queue stretching far longer than she can assess; more people keep coming through the doors.", spoken: "A mix of mild and severe breathing difficulty. Patients are arriving faster than your team can assess them." },
  { id: "page3", render: () => <PageThree />, alt: "Page three. Staff at the nurses' station watch a new sheet of guidance replace the old one as a pager buzzes; a newly qualified nurse sweats, clutching her clipboard; the Duty Medical Lead stands small in the middle of the hall with a question mark overhead; the senior consultant, Dr. Farid Hakim, asks how you want to decide who is seen first.", spoken: "Guidance from health authorities is still changing. Your team is anxious and some are new to this. Dr. Farid Hakim: Thirty-one in the department. Tell me how you want to decide who is seen first. How do you organise who is seen first?" },
];
