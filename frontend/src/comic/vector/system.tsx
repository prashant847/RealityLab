import type { ReactNode } from "react";

// BLACKOUT vector design system: every environment on the first page is drawn with these rules.
//  - Outline: one ink colour (INK), 4 px on objects, 6 px on silhouettes in the foreground, 2.5 px on small details.
//  - Fills: one flat base tone per material, one shade (left/away from light) and one highlight (toward the light). No gradients on
//    objects; gradients are used only for light glow (emergency lamps, screens).
//  - Light: warm amber emergency lamps (the blackout), cool cyan screen glow, red only for failures.
//  - Perspective: one-point, vanishing point near the middle of a 1600 x 900 frame, horizon at y = 400.
export const INK = "#0b1220";
export const C = {
  wall: "#223652", wallShade: "#17263d", wallHi: "#31496b",
  floor: "#2a3446", floorShade: "#1d2634", floorHi: "#3a4760",
  steel: "#5b7391", steelShade: "#3d5169", steelHi: "#8aa3bf",
  rack: "#c8782f", rackShade: "#8f5420",
  carton: "#d9c9a3", cartonShade: "#b3a37c", cartonBlue: "#4b7aa8", cartonBlueShade: "#355878",
  amber: "#ffb03a", amberSoft: "#ffd58a", red: "#e5483a", redDark: "#8f2a22", cyan: "#7fd3ff", screenDark: "#0d1828", white: "#eaf1f8",
};

export type P = [number, number];
export type Quad = [P, P, P, P];                                   // TL, TR, BR, BL
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const at = (q: Quad, u: number, v: number): P => {
  const top: P = [lerp(q[0][0], q[1][0], u), lerp(q[0][1], q[1][1], u)];
  const bot: P = [lerp(q[3][0], q[2][0], u), lerp(q[3][1], q[2][1], u)];
  return [lerp(top[0], bot[0], v), lerp(top[1], bot[1], v)];
};
export const sub = (q: Quad, u0: number, u1: number, v0: number, v1: number): Quad => [at(q, u0, v0), at(q, u1, v0), at(q, u1, v1), at(q, u0, v1)];
export const pts = (q: P[]) => q.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
/** Perspective spacing: equal steps in the world become shorter and shorter towards the vanishing point. */
export const persp = (t: number, k = 1.8) => (1 - 1 / (1 + k * t)) / (1 - 1 / (1 + k));

export const Poly = ({ q, fill, w = 4 }: { q: P[]; fill: string; w?: number }) => <polygon points={pts(q)} fill={fill} stroke={INK} strokeWidth={w} strokeLinejoin="round" />;

/** Soft pool of light. kind: amber (emergency lamp), cyan (screen). */
export function Glow({ x, y, r, kind = "amber", o = 0.55 }: { x: number; y: number; r: number; kind?: "amber" | "cyan" | "red"; o?: number }) {
  const col = kind === "amber" ? C.amber : kind === "cyan" ? C.cyan : C.red;
  const id = `g${kind}${Math.round(x)}${Math.round(y)}${Math.round(r)}`;
  return (
    <g pointerEvents="none">
      <defs><radialGradient id={id}><stop offset="0" stopColor={col} stopOpacity={o} /><stop offset="1" stopColor={col} stopOpacity="0" /></radialGradient></defs>
      <circle cx={x} cy={y} r={r} fill={`url(#${id})`} />
    </g>
  );
}

/** A medical-equipment carton drawn as a box with a top face, front, side and a cross label. */
export function Carton({ x, y, w, h, d = 0.28, blue = false, label = true }: { x: number; y: number; w: number; h: number; d?: number; blue?: boolean; label?: boolean }) {
  const front = blue ? C.cartonBlue : C.carton, side = blue ? C.cartonBlueShade : C.cartonShade, top = blue ? "#6c9bc9" : "#efe3c4";
  const dx = w * d, dy = h * d * 0.6;
  return (
    <g>
      <polygon points={`${x},${y} ${x + dx},${y - dy} ${x + w + dx},${y - dy} ${x + w},${y}`} fill={top} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <polygon points={`${x + w},${y} ${x + w + dx},${y - dy} ${x + w + dx},${y + h - dy} ${x + w},${y + h}`} fill={side} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x={x} y={y} width={w} height={h} fill={front} stroke={INK} strokeWidth="2.5" />
      <path d={`M${x + w * 0.5} ${y} v${h}`} stroke={INK} strokeWidth="1.5" opacity="0.35" />
      {label && <g><rect x={x + w * 0.16} y={y + h * 0.2} width={w * 0.34} height={h * 0.4} fill="#f4f6f9" stroke={INK} strokeWidth="1.5" />
        <path d={`M${x + w * 0.33} ${y + h * 0.26} v${h * 0.28} M${x + w * 0.22} ${y + h * 0.4} h${w * 0.22}`} stroke={C.red} strokeWidth={Math.max(2, w * 0.06)} /></g>}
    </g>
  );
}

export function SceneSvg({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg className="vscene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
      {children}
    </svg>
  );
}
