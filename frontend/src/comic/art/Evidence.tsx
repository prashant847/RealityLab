/** Insert panel: a close-up of a screen with one flagged entry. Deliberately wordless, so it never states facts of its own. */
export function Evidence({ large }: { large?: boolean }) {
  return (
    <svg className={`evidence${large ? " evidence--large" : ""}`} viewBox="0 0 160 110" aria-hidden="true">
      <rect x="2" y="2" width="156" height="106" fill="#0a111c" stroke="#05080f" strokeWidth="4" />
      <rect x="7" y="7" width="146" height="96" fill="#10304e" />
      <rect x="7" y="7" width="146" height="12" fill="#1b4a74" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <g key={i} opacity={i === 3 ? 1 : 0.6}>
          <rect x="13" y={26 + i * 11} width="18" height="4" fill="#9fd0ff" />
          <rect x="36" y={26 + i * 11} width={50 + ((i * 37) % 50)} height="4" fill={i === 3 ? "#ffb089" : "#9fd0ff"} />
        </g>
      ))}
      <rect x="9" y="47" width="142" height="13" fill="#c9422f" opacity="0.28" stroke="#e8a33d" strokeWidth="1.6" />
      <circle cx="140" cy="53.5" r="4" fill="#e8a33d" />
    </svg>
  );
}
