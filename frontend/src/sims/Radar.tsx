/** Radar chart of skill percentages (0-100). Needs at least three axes. Decorative: the numbers are always listed beside it. */
export function Radar({ items, size = 220 }: { items: { label: string; percent: number }[]; size?: number }) {
  if (items.length < 3) return null;
  const c = size / 2, r = size / 2 - 50, n = items.length;
  const pt = (i: number, v: number): [number, number] => { const a = (Math.PI * 2 * i) / n - Math.PI / 2; return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v]; };
  const poly = (v: (i: number) => number) => items.map((_, i) => pt(i, v(i)).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="radar" role="img" aria-label={`Skills radar: ${items.map((s) => `${s.label} ${s.percent}%`).join(", ")}`}>
      {[0.25, 0.5, 0.75, 1].map((g) => <polygon key={g} points={poly(() => g)} fill="none" stroke="var(--s-line)" strokeWidth="1" />)}
      {items.map((_, i) => <line key={i} x1={c} y1={c} x2={pt(i, 1)[0]} y2={pt(i, 1)[1]} stroke="var(--s-line)" />)}
      <polygon points={poly((i) => Math.max(items[i].percent, 4) / 100)} fill="var(--s-accent)" fillOpacity="0.28" stroke="var(--s-accent)" strokeWidth="2" />
      {items.map((s, i) => { const [x, y] = pt(i, 1.2); return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="9.5" fill="var(--s-muted)">{s.label.split(/[\s-]/)[0]}</text>; })}
    </svg>
  );
}
