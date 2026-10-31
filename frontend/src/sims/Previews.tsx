/** Small illustrations for the library cards. Each one shows the look of the simulation it introduces. */
export function Preview({ id }: { id: "blackout" | "bhopal" | "covid" }) {
  if (id === "blackout") return (
    <svg viewBox="0 0 320 160" role="img" aria-label="Comic panel: dark monitors and a red SYSTEMS OFFLINE alert" className="pv">
      <rect width="320" height="160" fill="#0b1020" />
      <rect x="12" y="12" width="296" height="136" fill="#101a2e" stroke="#e8a33d" strokeWidth="3" />
      <rect x="28" y="28" width="150" height="86" fill="#7a1c22" stroke="#05080f" strokeWidth="4" />
      <text x="103" y="68" textAnchor="middle" fill="#ffe2da" fontSize="15" fontWeight="700" fontFamily="Bahnschrift, Arial">SYSTEMS OFFLINE</text>
      <text x="103" y="90" textAnchor="middle" fill="#ffbfb0" fontSize="11">Cause unknown</text>
      {[0, 1, 2].map((i) => <rect key={i} x={196 + i * 38} y={36} width="30" height="22" fill={i === 1 ? "#243349" : "#16233a"} stroke="#05080f" strokeWidth="2" />)}
      {[0, 1, 2].map((i) => <rect key={i} x={196 + i * 38} y={66} width="30" height="22" fill="#16233a" stroke="#05080f" strokeWidth="2" />)}
      <rect x="24" y="122" width="170" height="18" fill="#e9d6ae" stroke="#05080f" strokeWidth="2" />
      <text x="32" y="135" fill="#1a1408" fontSize="10" fontWeight="700">27 June 2017. The screens go dark.</text>
    </svg>);
  if (id === "bhopal") return (
    <svg viewBox="0 0 320 160" role="img" aria-label="Schematic of a storage tank with four protective layers and a timeline" className="pv">
      <rect width="320" height="160" fill="#141a22" />
      <rect x="20" y="52" width="64" height="70" rx="12" fill="#2a3644" stroke="#74879c" strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={112 + (i % 2) * 70} y={40 + Math.floor(i / 2) * 44} width="62" height="36" rx="5" fill="#1d2733" stroke="#3a4a5c" />)}
      {["#d9543f", "#d9543f", "#e0a43a", "#5fb08a"].map((c, i) => <circle key={i} cx={124 + (i % 2) * 70} cy={52 + Math.floor(i / 2) * 44} r="5" fill={c} />)}
      <path d="M84 87 H112 M98 87 V58 H112 M98 87 V102 H112" stroke="#74879c" strokeWidth="2" fill="none" />
      {[0, 1, 2].map((i) => <path key={i} d={`M${262 + (i % 2) * 28} ${96 + i * 8} v-12 l12 -9 l12 9 v12 z`} fill="#4a5b6e" />)}
      <line x1="20" y1="142" x2="300" y2="142" stroke="#3a4a5c" strokeWidth="2" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <circle key={i} cx={30 + i * 22} cy="142" r="5" fill="#c9a24a" />)}
      {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={184 + i * 22} cy="142" r="5" fill="#5fb08a" />)}
      <text x="20" y="30" fill="#e6ebf2" fontSize="12" fontWeight="700" fontFamily="Bahnschrift, Arial">1984 RECORD  +  FICTIONAL PLANT</text>
    </svg>);
  return (
    <svg viewBox="0 0 320 160" role="img" aria-label="Hospital command centre board: beds, oxygen and staff" className="pv">
      <rect width="320" height="160" fill="#eaf3f5" />
      <rect x="12" y="12" width="296" height="136" rx="8" fill="#ffffff" stroke="#b9d3d9" strokeWidth="2" />
      {Array.from({ length: 24 }, (_, i) => <rect key={i} x={26 + (i % 8) * 20} y={30 + Math.floor(i / 8) * 20} width="15" height="13" rx="3" fill={i < 14 ? "#e57f6e" : "#8fcab9"} />)}
      {Array.from({ length: 6 }, (_, i) => <rect key={i} x={26 + i * 14} y={100} width="9" height="26" rx="4" fill={i < 4 ? "#3e90a8" : "#cfe4ea"} />)}
      {Array.from({ length: 10 }, (_, i) => <circle key={i} cx={216 + (i % 5) * 18} cy={44 + Math.floor(i / 5) * 24} r="7" fill={i < 3 ? "#e7b04c" : "#4a8aa0"} />)}
      <path d="M200 110 h16 l6 -14 l8 28 l6 -20 h60" stroke="#2f7d94" strokeWidth="3" fill="none" />
      <text x="26" y="24" fill="#1d4f60" fontSize="10" fontWeight="700" fontFamily="Segoe UI, Arial">COMMAND CENTRE · RIVERSIDE DISTRICT (FICTIONAL)</text>
    </svg>);
}
