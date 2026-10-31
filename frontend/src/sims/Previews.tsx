/** Illustrations for the library cards and intro screens. They fill their frame (slice), and animate gently unless reduce-motion is on. */
export function Preview({ id }: { id: "blackout" | "bhopal" | "covid" }) {
  if (id === "blackout") return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Comic panel: dark monitors and a red SYSTEMS OFFLINE alert" className="pv">
      <defs>
        <linearGradient id="bo-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a1124" /><stop offset="1" stopColor="#05080f" /></linearGradient>
        <radialGradient id="bo-glow" cx=".35" cy=".4" r=".6"><stop offset="0" stopColor="#d9423a" stopOpacity=".55" /><stop offset="1" stopColor="#d9423a" stopOpacity="0" /></radialGradient>
        <pattern id="bo-dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="#1d2a44" /></pattern>
      </defs>
      <rect width="400" height="240" fill="url(#bo-bg)" /><rect width="400" height="240" fill="url(#bo-dots)" opacity=".7" />
      <rect width="400" height="240" fill="url(#bo-glow)" />
      <rect x="14" y="14" width="372" height="212" fill="none" stroke="#e8a33d" strokeWidth="4" />
      <g className="pv-flicker"><rect x="40" y="38" width="190" height="112" fill="#7a1c22" stroke="#05080f" strokeWidth="6" />
        <text x="135" y="88" textAnchor="middle" fill="#ffe2da" fontSize="21" fontWeight="800" fontFamily="Bahnschrift, Arial">SYSTEMS OFFLINE</text>
        <text x="135" y="112" textAnchor="middle" fill="#ffbfb0" fontSize="13">Cause unknown</text><rect x="70" y="124" width="130" height="8" fill="#d2463f" /></g>
      {[0, 1, 2].flatMap((c) => [0, 1].map((r) => <rect key={`${c}${r}`} x={256 + c * 40} y={44 + r * 34} width="32" height="26" fill={c === 1 && r === 0 ? "#2a3c5e" : "#14213a"} stroke="#05080f" strokeWidth="3" />))}
      <rect x="40" y="174" width="250" height="34" fill="#e9d6ae" stroke="#05080f" strokeWidth="3" />
      <text x="52" y="196" fill="#1a1408" fontSize="13" fontWeight="700">Tuesday 27 June 2017. The screens go dark.</text>
      <g fill="#1b2840">{[0, 1, 2, 3, 4].map((i) => <rect key={i} x={20 + i * 76} y="215" width="60" height="8" rx="2" />)}</g>
    </svg>);
  if (id === "bhopal") return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Night schematic of a storage tank with four protective layers beside a neighbourhood" className="pv">
      <defs>
        <linearGradient id="bh-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b1018" /><stop offset="1" stopColor="#222d3a" /></linearGradient>
        <radialGradient id="bh-moon"><stop offset="0" stopColor="#e7dcb4" /><stop offset="1" stopColor="#e7dcb4" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="400" height="240" fill="url(#bh-sky)" />
      {[[40, 30], [90, 55], [150, 24], [210, 46], [250, 22], [300, 60], [350, 34]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.4" fill="#cdd7e6" opacity=".7" />)}
      <circle cx="338" cy="44" r="26" fill="url(#bh-moon)" opacity=".5" /><circle cx="338" cy="44" r="11" fill="#e7dcb4" />
      <rect y="178" width="400" height="62" fill="#161d27" /><path d="M0 178 H400" stroke="#33414f" strokeWidth="2" />
      <rect x="28" y="96" width="82" height="82" rx="16" fill="#2c3946" stroke="#7c90a6" strokeWidth="3" /><rect x="38" y="140" width="62" height="30" rx="8" fill="#e0a43a" opacity=".35" />
      <text x="69" y="86" textAnchor="middle" fill="#cfd8e3" fontSize="11">Storage tank</text>
      <path d="M110 120 H138 M124 120 V84 H138 M124 120 V150 H138" stroke="#7c90a6" strokeWidth="3" fill="none" className="pv-flow" strokeDasharray="6 5" />
      {[["Refrigeration", "#d9543f"], ["Scrubber", "#d9543f"], ["Flare tower", "#e0a43a"], ["Water spray", "#5fb08a"]].map(([t, c], i) => (
        <g key={t} transform={`translate(${140 + (i % 2) * 86} ${62 + Math.floor(i / 2) * 66})`}>
          <rect width="78" height="54" rx="7" fill="#1d2733" stroke="#3a4a5c" /><circle cx="14" cy="16" r="6" fill={c} className={c === "#d9543f" ? "pv-pulse" : ""} />
          <text x="26" y="20" fill="#e6ebf2" fontSize="9.5" fontWeight="600">{t}</text><rect x="10" y="34" width="58" height="5" rx="2.5" fill="#33414f" /></g>))}
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${318 + (i % 3) * 26} ${178 - Math.floor(i / 3) * 28 - 4} v-18 l14 -12 l14 12 v18 z`} fill={i % 2 ? "#3f4f62" : "#4a5b6e"} stroke="#0d1218" />)}
      <line x1="24" y1="212" x2="376" y2="212" stroke="#33414f" strokeWidth="2" />
      {Array.from({ length: 13 }, (_, i) => <circle key={i} cx={30 + i * 28} cy="212" r="5" fill={i < 7 ? "#c9a24a" : "#3a8f84"} />)}
    </svg>);
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Hospital command centre: beds, oxygen, staff and a heart monitor" className="pv">
      <defs><linearGradient id="cv-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e6f3f6" /><stop offset="1" stopColor="#cfe6ec" /></linearGradient></defs>
      <rect width="400" height="240" fill="url(#cv-bg)" />
      <rect x="16" y="16" width="368" height="208" rx="14" fill="#ffffff" stroke="#b6d3da" strokeWidth="2" />
      <rect x="16" y="16" width="368" height="30" rx="14" fill="#1f7a8c" /><rect x="16" y="32" width="368" height="14" fill="#1f7a8c" />
      <rect x="34" y="25" width="12" height="12" rx="2" fill="#fff" /><rect x="38" y="22" width="4" height="18" fill="#fff" /><rect x="31" y="28" width="18" height="4" fill="#fff" />
      <text x="58" y="36" fill="#fff" fontSize="11" fontWeight="700">COMMAND CENTRE · RIVERSIDE (FICTIONAL)</text>
      {Array.from({ length: 24 }, (_, i) => <rect key={i} x={34 + (i % 8) * 24} y={62 + Math.floor(i / 8) * 24} width="18" height="16" rx="4" fill={i < 13 ? "#e57f6e" : "#8fcab9"} />)}
      {Array.from({ length: 6 }, (_, i) => <rect key={i} x={34 + i * 17} y="142" width="11" height="30" rx="5" fill={i < 4 ? "#3e90a8" : "#cfe4ea"} />)}
      {Array.from({ length: 10 }, (_, i) => <circle key={i} cx={248 + (i % 5) * 22} cy={72 + Math.floor(i / 5) * 28} r="8" fill={i < 3 ? "#e7b04c" : "#4a8aa0"} />)}
      <rect x="230" y="136" width="136" height="70" rx="8" fill="#0f2a33" />
      <path d="M238 172 h22 l7 -22 l10 40 l8 -28 l6 10 h72" stroke="#5fe0c0" strokeWidth="2.5" fill="none" className="pv-ecg" strokeDasharray="300" />
      <rect x="34" y="184" width="170" height="8" rx="4" fill="#dbe8ec" /><rect x="34" y="184" width="95" height="8" rx="4" fill="#3e90a8" />
    </svg>);
}
