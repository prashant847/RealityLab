// Shared drawing vocabulary for the hand-inked art: palette, deterministic jitter and small path helpers.
// Everything here is pure and deterministic so the same scene data always draws the same picture.

export const INK = "#070a12";
export const PAPER = "#d9cfba";

export const PAL = {
  navy: "#101a2c", navy2: "#16233a", charcoal: "#1b2029", charcoal2: "#262c37", steel: "#2f4560", steelL: "#4a6a8a", steelXL: "#8aa3bd",
  amber: "#e8a33d", amberD: "#a8661f", orange: "#d9742b", red: "#c9422f", concrete: "#3a424e", concreteL: "#5a6573",
};

/** Small seeded generator (mulberry32) so jitter is stable between renders. */
export function rng(seed: number | string): () => number {
  let h = 1779033703 ^ String(seed).length;
  for (const ch of String(seed)) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hash = (s: string): number => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/** A rectangle outline drawn like a hand-ruled border: slightly uneven, never perfectly straight. */
export function inkRect(x: number, y: number, w: number, h: number, seed: string, wobble = 1.4): string {
  const r = rng(seed);
  const j = () => (r() - 0.5) * 2 * wobble;
  const pts: [number, number][] = [];
  const edge = (x1: number, y1: number, x2: number, y2: number) => {
    const n = 4;
    for (let i = 0; i < n; i++) pts.push([x1 + ((x2 - x1) * i) / n + j(), y1 + ((y2 - y1) * i) / n + j()]);
  };
  edge(x, y, x + w, y); edge(x + w, y, x + w, y + h); edge(x + w, y + h, x, y + h); edge(x, y + h, x, y);
  return `M${pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" L")} Z`;
}

/** Parallel hatch strokes filling the box (x,y,w,h) at an angle; used for ink shadows. */
export function hatch(x: number, y: number, w: number, h: number, gap: number, angle = 45, seed = "h"): string {
  const r = rng(seed);
  const out: string[] = [];
  const t = Math.tan((angle * Math.PI) / 180);
  for (let i = -Math.ceil(h / gap); i < Math.ceil((w + h) / gap); i++) {
    const x0 = x + i * gap + (r() - 0.5) * gap * 0.25;
    out.push(`M${x0.toFixed(1)} ${y + h} L${(x0 + h / t).toFixed(1)} ${y}`);
  }
  return out.join(" ");
}
