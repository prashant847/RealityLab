import { INK } from "./Cast";

// STAGE 3 PREVIEW. Sample environments in the same outline-and-flat-fill language as the cast. Each fills a 1600 x 900 space.
const ln = { stroke: INK, strokeWidth: 5, strokeLinejoin: "round" as const };

/** An open-plan office at the moment the screens fail: dark monitors in rows, a few showing red. */
export function OfficeDark() {
  const rows = [0, 1, 2];
  return (
    <g>
      <rect width="1600" height="900" fill="#222a42" />
      <rect y="620" width="1600" height="280" fill="#171c2e" />
      <path d="M0 620 H1600" stroke={INK} strokeWidth="5" />
      {[100, 520, 940, 1360].map((x) => <rect key={x} x={x} y="40" width="220" height="40" rx="8" fill="#38425f" {...ln} strokeWidth={4} />)}
      <rect x="40" y="170" width="1520" height="300" fill="#2c3552" {...ln} />
      {[250, 650, 1050, 1450].map((x) => <path key={x} d={`M${x} 170 V470`} stroke={INK} strokeWidth="5" />)}
      {rows.map((r) => {
        const y = 560 + r * 100, sc = 0.8 + r * 0.22;
        return (
          <g key={r}>
            {[0, 1, 2, 3].map((i) => {
              const x = 120 + i * 400 + (r % 2) * 90;
              const red = (i + r) % 3 === 0;
              return (
                <g key={i} transform={`translate(${x} ${y}) scale(${sc})`}>
                  <rect x="-20" y="60" width="300" height="26" rx="6" fill="#4a5578" {...ln} />
                  <rect x="20" y="-60" width="200" height="120" rx="8" fill={red ? "#7d2a2a" : "#0d101a"} {...ln} />
                  <rect x="110" y="60" width="20" height="8" fill={INK} />
                  {red && <path d="M80 -30 H160 M80 -10 H140" stroke="#ff6a5a" strokeWidth="8" strokeLinecap="round" />}
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

/** A container terminal gate: cranes, stacked containers, a queue of trucks (bigger than any person) and an empty gate lane. */
export function TerminalGate() {
  const box = (x: number, y: number, c: string, w = 150, h = 70) => <rect key={`${x}${y}`} x={x} y={y} width={w} height={h} fill={c} {...ln} strokeWidth={4} />;
  return (
    <g>
      <rect width="1600" height="900" fill="#2d3a5c" />
      <rect y="470" width="1600" height="430" fill="#3a4262" />
      <path d="M0 470 H1600" stroke={INK} strokeWidth="5" />
      <g>
        <path d="M180 470 V120 H620 V470" fill="none" stroke={INK} strokeWidth="26" strokeLinejoin="round" />
        <path d="M180 470 V120 H620 V470" fill="none" stroke="#e2862a" strokeWidth="16" strokeLinejoin="round" />
        <rect x="150" y="110" width="520" height="34" fill="#e2862a" {...ln} />
        <rect x="360" y="144" width="70" height="60" fill="#bf6d1c" {...ln} />
      </g>
      {[0, 1, 2].map((i) => box(760 + i * 160, 400 - 0, ["#c4523e", "#3f8f86", "#d9a73a"][i]))}
      {[0, 1].map((i) => box(800 + i * 160, 330, ["#4b7fb4", "#c4523e"][i]))}
      {[0, 1, 2, 3].map((i) => box(1240 + (i % 2) * 150, 400 - Math.floor(i / 2) * 70, ["#d9a73a", "#4b7fb4", "#3f8f86", "#c4523e"][i]))}
      <rect x="640" y="560" width="320" height="26" fill="#2a3150" {...ln} strokeWidth={4} />
      <rect x="560" y="500" width="150" height="150" fill="#e9ecf2" {...ln} />
      <rect x="590" y="530" width="90" height="50" fill="#2a3150" {...ln} strokeWidth={4} />
      <path d="M540 500 H730 L710 470 H560 Z" fill="#b8bfce" {...ln} />
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(${i === 0 ? 40 : 1040} 650)`}>
          <rect x="0" y="0" width="360" height="130" fill="#eef0f4" {...ln} />
          <rect x="360" y="30" width="110" height="100" fill="#e2862a" {...ln} />
          <rect x="400" y="46" width="52" height="38" fill="#9fd0e8" {...ln} strokeWidth={4} />
          <circle cx="70" cy="140" r="32" fill="#2a2a36" {...ln} /><circle cx="400" cy="140" r="32" fill="#2a2a36" {...ln} />
        </g>
      ))}
    </g>
  );
}

/** A monitor close-up: the screen filling the panel with a generic ransom-style message (a reconstruction, not the original text). */
export function RansomScreen() {
  return (
    <g>
      <rect width="1600" height="900" fill="#171c2e" />
      <rect x="140" y="80" width="1320" height="660" rx="26" fill="#10131c" {...ln} strokeWidth={8} />
      <rect x="200" y="140" width="1200" height="540" fill="#7d1f1f" {...ln} />
      <g fill="none" stroke="#ffd1c9" strokeLinecap="round">
        <path d="M280 230 H900" strokeWidth="26" /><path d="M280 320 H1250" strokeWidth="14" /><path d="M280 380 H1180" strokeWidth="14" /><path d="M280 440 H1100" strokeWidth="14" />
        <path d="M280 540 H820" strokeWidth="18" stroke="#ffb3a6" />
      </g>
      <rect x="640" y="760" width="320" height="40" fill="#2f3858" {...ln} />
      <rect x="480" y="800" width="640" height="40" rx="10" fill="#38425f" {...ln} />
    </g>
  );
}
