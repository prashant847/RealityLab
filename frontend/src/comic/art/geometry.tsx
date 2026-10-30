import type { ReactNode } from "react";
import { INK, rng } from "./ink";

export type P = [number, number];
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lp = (a: P, b: P, t: number): P => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const pts = (...p: P[]) => p.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");
export type Quad = [P, P, P, P];                       // tl, tr, br, bl
export const quadAt = (q: Quad, u: number, v: number): P => lp(lp(q[0], q[1], u), lp(q[3], q[2], u), v);
export const sub = (q: Quad, u0: number, u1: number, v0: number, v1: number): Quad => [quadAt(q, u0, v0), quadAt(q, u1, v0), quadAt(q, u1, v1), quadAt(q, u0, v1)];
export const poly = (q: P[]) => pts(...q);

/** Map an even world-space step to its foreshortened screen-space fraction (deeper = smaller). */
export const depth = (u: number, k = 2.6) => (1 - 1 / (1 + k * u)) / (1 - 1 / (1 + k));

export const INKS = { stroke: INK, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** A row of storage racking seen along its length from the aisle, filled with cartons and crates. */
export function RackRow({ plane, bays, seed, levels = 3, dark = 0.55, dim = false }: { plane: Quad; bays: number; seed: string; levels?: number; dark?: number; dim?: boolean }): ReactNode {
  const r = rng(seed);
  const boxCols = ["#6b5a43", "#5a4a37", "#3d5266", "#4a6075", "#7a6548", "#2f4256"];
  const out: ReactNode[] = [];
  out.push(<polygon key="bk" points={poly(plane)} fill="#0b121d" stroke={INK} strokeWidth="4" />);
  for (let i = 0; i < bays; i++) {
    const u0 = depth(i / bays), u1 = depth((i + 1) / bays);
    for (let j = 0; j < levels; j++) {
      const v1 = (j + 1) / levels, v0 = j / levels;
      const n = 1 + Math.floor(r() * 3);
      for (let b = 0; b < n; b++) {
        if (r() < 0.14) continue;
        const a = lerp(u0, u1, 0.06 + (b / n) * 0.9), bb = lerp(u0, u1, 0.06 + ((b + 0.86) / n) * 0.9);
        const hh = 0.5 + r() * 0.3;
        const q = sub(plane, a, bb, v1 - (v1 - v0) * hh, v1 - 0.012);
        const col = boxCols[Math.floor(r() * boxCols.length)];
        out.push(<polygon key={`b${i}${j}${b}`} points={poly(q)} fill={col} stroke={INK} strokeWidth="2.2" opacity={dim ? 0.8 : 1} />);
        out.push(<polyline key={`t${i}${j}${b}`} points={pts(quadAt(q, 0.5, 0), quadAt(q, 0.5, 0.35))} stroke={INK} strokeWidth="1.4" fill="none" opacity="0.5" />);
      }
      out.push(<polyline key={`s${i}${j}`} points={pts(quadAt(plane, u0, v1), quadAt(plane, u1, v1))} stroke="#c97a2e" strokeWidth="5" fill="none" opacity={dim ? 0.6 : 0.95} />);
      out.push(<polyline key={`sd${i}${j}`} points={pts(quadAt(plane, u0, v1 + 0.012), quadAt(plane, u1, v1 + 0.012))} stroke={INK} strokeWidth="2" fill="none" />);
    }
    out.push(<polyline key={`u${i}`} points={pts(quadAt(plane, u0, 0), quadAt(plane, u0, 1))} stroke="#2f4560" strokeWidth="6" fill="none" />);
  }
  out.push(<polyline key="ul" points={pts(quadAt(plane, 1, 0), quadAt(plane, 1, 1))} stroke="#2f4560" strokeWidth="4" fill="none" />);
  out.push(<polygon key="sh" points={poly(plane)} fill="#000" opacity={dark * 0.28} />);
  return <g>{out}</g>;
}

/** A glowing light fitting: soft halo plus a hard inked bar. `on` false draws it dead. */
export function Lamp({ x, y, w = 120, h = 10, on, color = "#f7e2b0", halo = 130 }: { x: number; y: number; w?: number; h?: number; on: boolean; color?: string; halo?: number }) {
  return (
    <g>
      {on && <ellipse cx={x} cy={y + 8} rx={halo} ry={halo * 0.45} fill={color} opacity="0.16" />}
      {on && <ellipse cx={x} cy={y + 6} rx={halo * 0.55} ry={halo * 0.22} fill={color} opacity="0.2" />}
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx="3" fill={on ? color : "#202833"} stroke={INK} strokeWidth="3" />
    </g>
  );
}

/** Faceless inked silhouette of a person in the middle distance, optionally carrying a torch. */
export function Extra({ x, y, s = 1, torch = false, facing = 1, tone = "#06090f" }: { x: number; y: number; s?: number; torch?: boolean; facing?: 1 | -1; tone?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s * facing} ${s})`}>
      {torch && <polygon points="26,-122 400,-190 400,-20" fill="#f2d79a" opacity="0.2" />}
      <path d="M-18 0 L-14 -58 L-24 -64 L-26 -112 Q-26 -128 -10 -130 L10 -130 Q26 -128 26 -112 L24 -64 L14 -58 L18 0 Z" fill={tone} stroke={INK} strokeWidth="3" />
      <circle cx="0" cy="-152" r="19" fill={tone} stroke={INK} strokeWidth="3" />
      {torch && <path d="M22 -100 L44 -118" stroke={INK} strokeWidth="9" strokeLinecap="round" />}
      {torch && <circle cx="46" cy="-120" r="7" fill="#fff3c7" />}
    </g>
  );
}
