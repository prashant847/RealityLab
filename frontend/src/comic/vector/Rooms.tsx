import { C, Glow, INK, SceneSvg } from "./system";

const Monitor = ({ x, y, w, h, state = "dead" }: { x: number; y: number; w: number; h: number; state?: "dead" | "alert" | "text" }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="6" fill="#16233a" stroke={INK} strokeWidth="4" />
    <rect x={x + 8} y={y + 8} width={w - 16} height={h - 16} fill={state === "alert" ? "#3b1514" : state === "text" ? "#0f2b45" : C.screenDark} />
    {state === "alert" && <><path d={`M${x + w / 2} ${y + h * 0.28} l${w * 0.12} ${h * 0.34} h${-w * 0.24} z`} fill={C.amber} stroke={INK} strokeWidth="3" strokeLinejoin="round" /><rect x={x + w / 2 - 3} y={y + h * 0.4} width="6" height={h * 0.12} fill={INK} /></>}
    {state === "text" && [0, 1, 2, 3].map((i) => <rect key={i} x={x + 18} y={y + 20 + i * (h / 6)} width={(w - 36) * (0.9 - i * 0.18)} height="5" fill={C.cyan} opacity="0.7" />)}
    <path d={`M${x + 12} ${y + h - 14} L${x + w * 0.5} ${y + 12}`} stroke="#fff" strokeWidth="3" opacity="0.07" />
  </g>
);

/** IT control room: wall of monitors (dead except one alert), server rack, workstations, an emergency strip light. */
export function ControlRoom() {
  return (
    <SceneSvg label="The IT control room in the blackout: a wall of dark monitors with one warning screen, a server rack and empty workstations.">
      <rect width="1600" height="900" fill={C.wall} />
      <rect y="0" width="1600" height="90" fill="#14223a" stroke={INK} strokeWidth="4" />
      <rect x="180" y="34" width="520" height="16" rx="8" fill={C.amberSoft} stroke={INK} strokeWidth="3" /><rect x="900" y="34" width="520" height="16" rx="8" fill="#44546a" stroke={INK} strokeWidth="3" />
      <rect y="560" width="1600" height="340" fill={C.floor} stroke={INK} strokeWidth="4" /><rect y="540" width="1600" height="26" fill="#14223a" stroke={INK} strokeWidth="4" />
      {/* server rack, left */}
      <g>
        <rect x="60" y="130" width="250" height="420" fill="#1a2740" stroke={INK} strokeWidth="6" />
        {Array.from({ length: 9 }, (_, i) => <g key={i}><rect x="76" y={146 + i * 44} width="218" height="34" fill="#25374f" stroke={INK} strokeWidth="3" /><circle cx="96" cy={163 + i * 44} r="5" fill={i % 3 === 1 ? C.red : "#3d5169"} /><circle cx="114" cy={163 + i * 44} r="5" fill={i % 4 === 0 ? C.amber : "#3d5169"} /><path d={`M136 ${163 + i * 44} h140`} stroke={INK} strokeWidth="3" opacity="0.5" /></g>)}
      </g>
      {/* monitor wall */}
      <rect x="380" y="130" width="1040" height="360" fill="#1a2740" stroke={INK} strokeWidth="6" />
      {[0, 1, 2, 3].map((i) => <Monitor key={`a${i}`} x={400 + i * 252} y={146} w={236} h={158} state={i === 2 ? "alert" : i === 0 ? "text" : "dead"} />)}
      {[0, 1, 2, 3].map((i) => <Monitor key={`b${i}`} x={400 + i * 252} y={316} w={236} h={160} state="dead" />)}
      <Glow x={1000} y={225} r={220} kind="red" o={0.25} />
      {/* workstations */}
      {[[330, 640, 1], [820, 640, 1], [1300, 640, 1]].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <rect x="-230" y="40" width="460" height="30" fill="#4a5b75" stroke={INK} strokeWidth="5" /><rect x="-210" y="70" width="420" height="190" fill="#2a3446" stroke={INK} strokeWidth="5" />
          <rect x="-100" y="-90" width="200" height="124" rx="6" fill="#16233a" stroke={INK} strokeWidth="5" /><rect x="-90" y="-80" width="180" height="104" fill={i === 1 ? "#102f4a" : C.screenDark} />
          {i === 1 && [0, 1, 2].map((k) => <rect key={k} x="-74" y={-64 + k * 22} width={140 - k * 30} height="6" fill={C.cyan} opacity="0.7" />)}
          <rect x="-12" y="34" width="24" height="10" fill="#3d5169" stroke={INK} strokeWidth="3" /><rect x="-90" y="20" width="180" height="16" rx="3" fill="#33445d" stroke={INK} strokeWidth="3" />
        </g>
      ))}
      <Glow x={820} y={560} r={260} kind="cyan" o={0.16} /><Glow x={440} y={44} r={420} o={0.3} />
      {/* an office chair silhouette, pushed back in a hurry */}
      <g transform="translate(560 700)"><path d="M-60 -120 Q0 -150 60 -120 L50 -10 L-50 -10 Z" fill="#1c2a42" stroke={INK} strokeWidth="5" /><path d="M0 -10 V70 M-60 78 H60" stroke={INK} strokeWidth="9" /></g>
      <rect width="1600" height="900" fill="#050a14" opacity="0.2" />
    </SceneSvg>
  );
}

/** The Operations Director's office: window onto the dark warehouse floor, desk, lamp, wall clock, whiteboard timeline. */
export function Office() {
  return (
    <SceneSvg label="The Operations Director's office on the site: a window onto the dark warehouse floor, a desk with a lamp, a wall clock and a whiteboard.">
      <rect width="1600" height="900" fill={C.wall} />
      <rect x="0" y="640" width="1600" height="260" fill={C.floor} stroke={INK} strokeWidth="4" />
      {/* window to the warehouse floor */}
      <rect x="880" y="90" width="620" height="420" fill="#0d1828" stroke={INK} strokeWidth="8" />
      <rect x="896" y="106" width="588" height="388" fill="#101d33" />
      <g opacity="0.95">
        {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={920 + i * 112} y={300 - (i % 2) * 40} width="84" height={190 + (i % 2) * 40} fill="#1b2d49" stroke={INK} strokeWidth="3" />)}
        {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={930 + i * 112} y={316 - (i % 2) * 40} width="64" height="12" fill="#c8782f" />)}
        <Glow x={1100} y={250} r={160} o={0.4} />
      </g>
      <path d="M1190 90 V510 M880 300 H1500" stroke={INK} strokeWidth="8" /><path d="M896 106 L1010 106 L896 230 Z" fill="#fff" opacity="0.05" />
      {/* whiteboard timeline */}
      <rect x="110" y="120" width="600" height="340" fill="#d8e2ee" stroke={INK} strokeWidth="7" />
      <rect x="110" y="120" width="600" height="340" fill="#223652" opacity="0.3" />
      <path d="M150 260 H670" stroke={INK} strokeWidth="6" />
      {[0, 1, 2, 3, 4, 5].map((i) => <g key={i}><circle cx={170 + i * 100} cy="260" r="12" fill={i === 0 ? C.red : "#3d5169"} stroke={INK} strokeWidth="3" /><rect x={150 + i * 100} y="290" width="62" height="10" fill={INK} opacity="0.45" /><rect x={150 + i * 100} y="310" width="44" height="10" fill={INK} opacity="0.3" /></g>)}
      <rect x="150" y="160" width="200" height="16" fill={INK} opacity="0.55" />
      {/* wall clock showing 8:40 */}
      <g transform="translate(790 330)"><circle r="58" fill="#e7eef6" stroke={INK} strokeWidth="6" />
        {Array.from({ length: 12 }, (_, i) => <line key={i} x1="0" y1="-48" x2="0" y2="-40" stroke={INK} strokeWidth="3" transform={`rotate(${i * 30})`} />)}
        <line x1="0" y1="0" x2="0" y2="-40" stroke={INK} strokeWidth="5" strokeLinecap="round" transform="rotate(240)" /><line x1="0" y1="0" x2="0" y2="-26" stroke={INK} strokeWidth="7" strokeLinecap="round" transform="rotate(260)" /></g>
      {/* desk, laptop, lamp, papers */}
      <polygon points="0,700 1600,700 1600,900 0,900" fill="#32425c" stroke={INK} strokeWidth="6" /><path d="M0 716 H1600" stroke={C.steelHi} strokeWidth="4" opacity="0.5" />
      <g transform="translate(240 700)"><path d="M0 0 V-140 L90 -190" stroke={INK} strokeWidth="11" fill="none" strokeLinecap="round" /><path d="M74 -206 L140 -166 L100 -140 Z" fill={C.amber} stroke={INK} strokeWidth="5" strokeLinejoin="round" /><Glow x={118} y={-100} r={250} o={0.4} /></g>
      <g transform="translate(650 700)"><polygon points="-180,0 180,0 200,40 -200,40" fill="#3d5169" stroke={INK} strokeWidth="5" /><polygon points="-160,0 -140,-190 140,-190 160,0" fill="#16233a" stroke={INK} strokeWidth="5" /><polygon points="-146,-6 -128,-176 128,-176 146,-6" fill={C.screenDark} /><path d="M-90 -120 H20 M-96 -90 H60" stroke={C.red} strokeWidth="5" opacity="0.8" /></g>
      <g transform="translate(1000 770) rotate(-3)"><rect x="-150" y="-46" width="300" height="84" fill="#e2e8ef" stroke={INK} strokeWidth="5" /><path d="M-128 -22 H90 M-128 0 H60 M-128 22 H100" stroke={INK} strokeWidth="4" opacity="0.5" /></g>
      <rect x="1210" y="730" width="54" height="64" rx="6" fill="#e7eef6" stroke={INK} strokeWidth="4" /><path d="M1264 746 q24 4 0 30" stroke={INK} strokeWidth="6" fill="none" />
      <Glow x={150} y={60} r={360} o={0.22} />
      <rect width="1600" height="900" fill="#050a14" opacity="0.18" />
    </SceneSvg>
  );
}

/** Foreground desk drawn over the seated character, so he is IN the room: keyboard, notebook, a dead hand scanner. Transparent above the desk. */
export function ControlDesk() {
  return (
    <SceneSvg label="">
      <polygon points="0,790 1600,770 1600,900 0,900" fill="#32425c" stroke={INK} strokeWidth="7" />
      <polygon points="0,790 1600,770 1600,796 0,816" fill="#4a5f7e" stroke={INK} strokeWidth="5" />
      <g transform="translate(980 776) rotate(-1)"><rect x="-190" y="-4" width="380" height="46" rx="8" fill="#1d2a40" stroke={INK} strokeWidth="5" />{Array.from({ length: 10 }, (_, i) => <rect key={i} x={-170 + i * 34} y="6" width="26" height="12" rx="3" fill="#44587a" />)}{Array.from({ length: 9 }, (_, i) => <rect key={i} x={-160 + i * 34} y="22" width="26" height="12" rx="3" fill="#44587a" />)}</g>
      <g transform="translate(1330 796)"><rect x="-26" y="-12" width="52" height="30" rx="14" fill="#1d2a40" stroke={INK} strokeWidth="5" /></g>
      <g transform="translate(380 814) rotate(-5)"><rect x="-90" y="-26" width="180" height="62" fill="#e2e8ef" stroke={INK} strokeWidth="5" /><path d="M-70 -6 H60 M-70 12 H40" stroke={INK} strokeWidth="4" opacity="0.5" /><path d="M20 -34 l70 20" stroke={C.red} strokeWidth="9" strokeLinecap="round" /></g>
      <g transform="translate(160 812) rotate(-12)"><rect x="-70" y="-20" width="140" height="56" rx="16" fill="#2a3446" stroke={INK} strokeWidth="5" /><rect x="-24" y="-8" width="48" height="12" rx="6" fill={C.red} stroke={INK} strokeWidth="2.5" /></g>
    </SceneSvg>
  );
}

/** Foreground edge of the director's desk with papers and a mug, so he sits behind it. */
export function OfficeDesk() {
  return (
    <SceneSvg label="">
      <polygon points="0,810 1600,792 1600,900 0,900" fill="#3a4a66" stroke={INK} strokeWidth="7" />
      <polygon points="0,810 1600,792 1600,818 0,836" fill="#52688a" stroke={INK} strokeWidth="5" />
      <g transform="translate(1000 830) rotate(-3)"><rect x="-160" y="-30" width="320" height="64" fill="#e2e8ef" stroke={INK} strokeWidth="5" /><path d="M-136 -8 H100 M-136 10 H70" stroke={INK} strokeWidth="4" opacity="0.5" /></g>
      <g transform="translate(1250 812)"><rect x="-27" y="-44" width="54" height="64" rx="6" fill="#e7eef6" stroke={INK} strokeWidth="4" /><path d="M27 -30 q26 4 0 30" stroke={INK} strokeWidth="6" fill="none" /></g>
      <g transform="translate(560 828) rotate(2)"><rect x="-130" y="-22" width="260" height="56" fill="#f1e4b8" stroke={INK} strokeWidth="5" /><path d="M-110 -2 H90" stroke={INK} strokeWidth="4" opacity="0.5" /></g>
    </SceneSvg>
  );
}
