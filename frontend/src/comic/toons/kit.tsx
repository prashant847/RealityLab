import { useId, type ReactNode } from "react";

// Flat 2D cartoon kit. Every character in this folder follows the same rules:
//  - solid colour fills only (no gradients, no shine, no hatching), one dark outline weight;
//  - round, simple shapes; the face is the clearest thing in the picture (big eyes, thick brows, a clearly shaped mouth);
//  - bodies are simple torsos with arms that start at the shoulder and end in a hand drawn on top of the sleeve, so they are always connected.
export const OUT = "#14110f";
export const OW = 5;

export interface Look { skin: string; hair: string; brow: string }

export interface Expr {
  browInner: number;       // px: negative lifts the inner end (worry), positive lowers it (anger / pressure)
  browOuter: number;       // px: positive lowers the outer end
  browAsym: number;        // px: extra lift on the far brow (suspicion)
  lid: number;             // 0 open .. 1 almost closed
  wide: number;            // 0..1 eyes opened wide
  gaze: [number, number];  // -1..1
  corner: number;          // mouth corners: positive = down (frown), negative = up (smile)
  tilt: number;            // lifts the right mouth corner (lopsided mouth)
  open: number;            // mouth opening in px
  sweat: boolean;
}

export const EXPR: Record<string, Expr> = {
  neutral: { browInner: 0, browOuter: 0, browAsym: 0, lid: 0.08, wide: 0, gaze: [0, 0], corner: 0, tilt: 0, open: 0, sweat: false },
  concern: { browInner: -34, browOuter: 10, browAsym: 0, lid: 0.1, wide: 0, gaze: [-0.9, 0.5], corner: 16, tilt: 0, open: 0, sweat: false },
  alarm: { browInner: -34, browOuter: -16, browAsym: 0, lid: 0, wide: 1, gaze: [-0.8, 0.2], corner: 6, tilt: 0, open: 30, sweat: true },
  suspicion: { browInner: 18, browOuter: -6, browAsym: -22, lid: 0.5, wide: 0, gaze: [-1, 0.3], corner: 4, tilt: 14, open: 0, sweat: false },
  pressure: { browInner: 24, browOuter: -6, browAsym: 0, lid: 0.38, wide: 0, gaze: [0.2, 0.6], corner: 20, tilt: 0, open: 0, sweat: false },
  uncertain: { browInner: -28, browOuter: 10, browAsym: 0, lid: 0.18, wide: 0, gaze: [1, 0.3], corner: 12, tilt: 12, open: 0, sweat: true },
};

export function Eye({ cx, cy, rx = 44, ry = 38, ex, skin }: { cx: number; cy: number; rx?: number; ry?: number; ex: Expr; skin: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const h = ry + ex.wide * 8;
  const px = cx + ex.gaze[0] * 16, py = cy + ex.gaze[1] * 11;
  const lidH = 2 * h * ex.lid;
  return (
    <g>
      <defs><clipPath id={id}><ellipse cx={cx} cy={cy} rx={rx} ry={h} /></clipPath></defs>
      <ellipse cx={cx} cy={cy} rx={rx} ry={h} fill="#ffffff" />
      <circle cx={px} cy={py} r={17 + ex.wide * 3} fill={OUT} />
      <rect x={cx - rx} y={cy - h} width={rx * 2} height={lidH} fill={skin} clipPath={`url(#${id})`} />
      {ex.lid > 0.05 && <line x1={cx - rx} x2={cx + rx} y1={cy - h + lidH} y2={cy - h + lidH} stroke={OUT} strokeWidth="6" clipPath={`url(#${id})`} />}
      <ellipse cx={cx} cy={cy} rx={rx} ry={h} fill="none" stroke={OUT} strokeWidth={OW} />
    </g>
  );
}

/** side = -1 for the brow on the viewer's left. The inner end is the one nearest the nose. A dark outline sits under the coloured stroke. */
export function BrowFill({ cx, cy, side, ex, color, w = 90, t = 18 }: { cx: number; cy: number; side: -1 | 1; ex: Expr; color: string; w?: number; t?: number }) {
  const inner = [cx - side * w * 0.5, cy + ex.browInner * 0.75 + (side === 1 ? ex.browAsym : 0)] as const;
  const outer = [cx + side * w * 0.5, cy + ex.browOuter * 0.75 + (side === 1 ? ex.browAsym * 0.4 : 0)] as const;
  const mid = [(inner[0] + outer[0]) / 2, Math.min(inner[1], outer[1]) - 5] as const;
  const d = `M${inner[0]} ${inner[1]} Q${mid[0]} ${mid[1]} ${outer[0]} ${outer[1]}`;
  return <g fill="none" strokeLinecap="round"><path d={d} stroke={OUT} strokeWidth={t + 8} /><path d={d} stroke={color} strokeWidth={t} /></g>;
}

export function Mouth({ cx, cy, w = 46, ex }: { cx: number; cy: number; w?: number; ex: Expr }) {
  const c = ex.corner;
  if (ex.open > 2) {
    return (
      <g>
        <path d={`M${cx - w} ${cy} Q${cx} ${cy - 8} ${cx + w} ${cy} Q${cx + w * 0.85} ${cy + ex.open * 1.7} ${cx} ${cy + ex.open * 1.8} Q${cx - w * 0.85} ${cy + ex.open * 1.7} ${cx - w} ${cy} Z`} fill="#5a1f1a" stroke={OUT} strokeWidth={OW} strokeLinejoin="round" />
        <path d={`M${cx - w * 0.8} ${cy + 4} Q${cx} ${cy - 2} ${cx + w * 0.8} ${cy + 4} L${cx + w * 0.72} ${cy + 18} Q${cx} ${cy + 12} ${cx - w * 0.72} ${cy + 18} Z`} fill="#ffffff" />
        <ellipse cx={cx} cy={cy + ex.open * 1.5} rx={w * 0.42} ry={ex.open * 0.32} fill="#e0685a" />
      </g>
    );
  }
  return <path d={`M${cx - w} ${cy + c} Q${cx} ${cy - c * 0.9} ${cx + w} ${cy + c - ex.tilt}`} fill="none" stroke={OUT} strokeWidth="8" strokeLinecap="round" />;
}

export function Sweat({ x, y }: { x: number; y: number }) {
  return <path d={`M${x} ${y} C${x - 24} ${y + 38} ${x - 20} ${y + 62} ${x} ${y + 62} C${x + 20} ${y + 62} ${x + 24} ${y + 38} ${x} ${y} Z`} fill="#8fd3f4" stroke={OUT} strokeWidth="5" strokeLinejoin="round" />;
}

/** A sleeve that starts inside the shoulder and runs along `d`; the hand is drawn on top at the other end, so the arm is one connected piece. */
export function Arm({ d, color, start }: { d: string; color: string; start: [number, number] }) {
  return (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d={d} stroke={OUT} strokeWidth="112" /><path d={d} stroke={color} strokeWidth="100" />
      <circle cx={start[0]} cy={start[1]} r="50" fill={color} stroke="none" />
    </g>
  );
}

/** Cartoon hand. "fist" for resting at the chin or hanging; "point" has the index finger out (pointing up). `rot` turns it around its centre. */
export function Hand({ x, y, rot = 0, pose, skin }: { x: number; y: number; rot?: number; pose: "fist" | "point"; skin: string }) {
  const st = { fill: skin, stroke: OUT, strokeWidth: OW, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {pose === "point" && <rect x="-14" y="-112" width="30" height="86" rx="15" {...st} />}
      <rect x="-50" y="-44" width="100" height="88" rx="34" {...st} />
      {pose === "fist" && [-22, 2, 26].map((fx) => <path key={fx} d={`M${fx} -40 v24`} stroke={OUT} strokeWidth="4" strokeLinecap="round" />)}
      {pose === "point" && [-6, 18].map((fx) => <path key={fx} d={`M${fx} -40 v22`} stroke={OUT} strokeWidth="4" strokeLinecap="round" />)}
      <rect x="-70" y="-14" width="40" height="54" rx="20" {...st} />
    </g>
  );
}

export function ToonSvg({ children, label, expression }: { children: ReactNode; label: string; expression: string }) {
  return <svg className="portrait toon" viewBox="0 0 800 1000" role="img" aria-label={`${label}, ${expression}`} data-expression={expression}>{children}</svg>;
}
