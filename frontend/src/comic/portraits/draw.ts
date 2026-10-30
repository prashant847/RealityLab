// Drawing helpers for the portrait kit. Everything is pure maths: smooth curves through anatomical landmarks.
export type Pt = [number, number];

const f = (n: number) => (Math.round(n * 10) / 10).toString();

/** Smooth (Catmull-Rom) curve through the points as an SVG path. `closed` joins the last point back to the first. */
export function spline(p: Pt[], closed = false, t = 0.5): string {
  if (p.length < 2) return "";
  const n = p.length;
  const get = (i: number): Pt => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1: Pt = [p1[0] + ((p2[0] - p0[0]) * t) / 3 * 2 * 0.5 * 1, p1[1] + ((p2[1] - p0[1]) * t) / 3 * 2 * 0.5 * 1];
    const c2: Pt = [p2[0] - ((p3[0] - p1[0]) * t) / 3 * 2 * 0.5 * 1, p2[1] - ((p3[1] - p1[1]) * t) / 3 * 2 * 0.5 * 1];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return closed ? d + " Z" : d;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const pt = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const add = (a: Pt, dx: number, dy: number): Pt => [a[0] + dx, a[1] + dy];

/** Offsets a polyline sideways by `w[i]` along its local normal (positive = to the right of travel). */
export function offset(p: Pt[], w: number[]): Pt[] {
  return p.map((q, i) => {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    return [q[0] - (dy / len) * w[i], q[1] + (dx / len) * w[i]] as Pt;
  });
}

/** A tapered stroke: a filled ribbon of varying thickness along the curve. */
export function ribbon(p: Pt[], thick: number[]): string {
  const top = offset(p, thick.map((t) => -t / 2));
  const bot = offset(p, thick.map((t) => t / 2)).reverse();
  return spline([...top, ...bot], true, 0.5);
}

/** Seeded random numbers so scattered details (stubble, strands) never change between renders. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
