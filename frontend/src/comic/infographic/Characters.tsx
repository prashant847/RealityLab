import { useId } from "react";

// Flat 2D "infographic" characters (style reference: clean explainer-video people).
// Rules: no black outlines, solid fills, ONE darker shade block per surface, simple geometric silhouettes, a slightly large head,
// small readable faces (eyes with a coloured iris, tapered brows, a one-stroke nose, a simple mouth). Emotion comes from brow angle,
// eye openness and direction, mouth shape, head tilt and shoulder position. Used to export transparent PNGs; nothing here is placed in the game yet.

export interface Pal {
  skin: string; skinShade: string; hair: string; hairShade: string; brow: string; iris: string; lip: string;
  top: string; topShade: string; collar: string; accent: string; accentShade: string; under: string;
}
export type Expression = "neutral" | "concerned" | "shocked" | "focused" | "tired" | "determined";
export const EXPRESSIONS: Expression[] = ["neutral", "concerned", "shocked", "focused", "tired", "determined"];

interface Ex {
  browIn: number; browOut: number; browLift: number;   // px: negative raises the inner end / the whole brow
  lid: number; wide: number; gaze: [number, number];   // lid 0..1 closed, wide 0..1
  mouth: "line" | "down" | "open" | "tight" | "flat";
  tilt: number; shoulder: number; bags: boolean; chin: number;
}
const EX: Record<Expression, Ex> = {
  neutral: { browIn: 0, browOut: 0, browLift: 0, lid: 0.12, wide: 0, gaze: [0.25, 0], mouth: "line", tilt: 0, shoulder: 0, bags: false, chin: 0 },
  concerned: { browIn: -18, browOut: 5, browLift: -2, lid: 0.12, wide: 0, gaze: [-0.7, 0.4], mouth: "down", tilt: -4, shoulder: -6, bags: false, chin: 0 },
  shocked: { browIn: -10, browOut: -8, browLift: -20, lid: 0, wide: 1, gaze: [0, 0], mouth: "open", tilt: 0, shoulder: -22, bags: false, chin: 0 },
  focused: { browIn: 8, browOut: -2, browLift: 3, lid: 0.3, wide: 0, gaze: [-0.85, 0.5], mouth: "tight", tilt: -3, shoulder: 6, bags: false, chin: 0 },
  tired: { browIn: -9, browOut: 7, browLift: 2, lid: 0.5, wide: 0, gaze: [0.1, 0.7], mouth: "flat", tilt: 6, shoulder: 26, bags: true, chin: 0 },
  determined: { browIn: 12, browOut: -4, browLift: 2, lid: 0.18, wide: 0, gaze: [0.1, 0], mouth: "tight", tilt: 0, shoulder: -10, bags: false, chin: -8 },
};

function Eye({ cx, cy, rx, ry, e, p, cover }: { cx: number; cy: number; rx: number; ry: number; e: Ex; p: Pal; cover: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const h = ry + e.wide * 8, r = rx + e.wide * 3;
  const px = cx + e.gaze[0] * 9, py = cy + e.gaze[1] * 6;
  const lidH = 2 * h * e.lid;
  return (
    <g>
      <defs><clipPath id={id}><ellipse cx={cx} cy={cy} rx={r} ry={h} /></clipPath></defs>
      <ellipse cx={cx} cy={cy} rx={r} ry={h} fill="#fbf6ef" />
      <g clipPath={`url(#${id})`}>
        <circle cx={px} cy={py} r={e.wide ? 12 : 14} fill={p.iris} />
        <circle cx={px} cy={py} r={e.wide ? 5.5 : 7} fill="#1b1210" />
        <rect x={cx - r} y={cy - h} width={r * 2} height={lidH} fill={cover} />
        {e.lid > 0.05 && <rect x={cx - r} y={cy - h + lidH - 3} width={r * 2} height="4" fill="#3a2418" />}
      </g>
      <path d={`M${cx - r} ${cy} Q${cx} ${cy - h * 1.35} ${cx + r} ${cy}`} fill="none" stroke="#3a2418" strokeWidth="4.5" strokeLinecap="round" />
    </g>
  );
}

function Brow({ x, y, side, e, color, w, t }: { x: number; y: number; side: -1 | 1; e: Ex; color: string; w: number; t: number }) {
  const ix = x - side * w / 2, ox = x + side * w / 2;
  const iy = y + e.browLift + e.browIn, oy = y + e.browLift + e.browOut;
  const my = Math.min(iy, oy) - 5;
  return <path d={`M${ix} ${iy} Q${x} ${my} ${ox} ${oy}`} fill="none" stroke={color} strokeWidth={t} strokeLinecap="round" />;
}

function Mouth({ x, y, w, e, p }: { x: number; y: number; w: number; e: Ex; p: Pal }) {
  if (e.mouth === "open") return <ellipse cx={x} cy={y + 10} rx={w * 0.42} ry="17" fill="#6b2a24" />;
  const d = e.mouth === "down" ? `M${x - w} ${y + 8} Q${x} ${y - 6} ${x + w} ${y + 8}`
    : e.mouth === "tight" ? `M${x - w * 0.9} ${y + 3} Q${x} ${y - 1} ${x + w * 0.9} ${y + 3}`
    : e.mouth === "flat" ? `M${x - w * 0.8} ${y + 5} Q${x} ${y + 2} ${x + w * 0.8} ${y + 7}`
    : `M${x - w} ${y + 1} Q${x} ${y + 8} ${x + w} ${y + 1}`;
  return <path d={d} fill="none" stroke={p.lip} strokeWidth="7" strokeLinecap="round" />;
}

export interface CharSpec {
  who: "arjun" | "director";
  pal: Pal;
  head: string; shade: string; ear: [number, number, number, number];   // path, face shade path, ear rx/ry/cy/offset
  hair: string; hairBand: string; extra?: (p: Pal, e: Ex) => JSX.Element;
  eyes: { y: number; dx: number; rx: number; ry: number }; browY: number; browW: number; browT: number;
  nose: string; mouth: { y: number; w: number };
  torso: (s: number) => string; torsoShade: (s: number) => string; body: (p: Pal, s: number) => JSX.Element;
  glasses?: boolean; beard?: string;
}

/** One character at one expression, 800 x 1000, transparent background, chest-up. */
export function Character({ spec, expression }: { spec: CharSpec; expression: Expression }) {
  const e = EX[expression], p = spec.pal, s = e.shoulder;
  return (
    <svg viewBox="0 0 800 1000" role="img" aria-label={`${spec.who === "arjun" ? "Arjun Mehta" : "The director"}, ${expression}`} data-who={spec.who} data-expression={expression}>
      {/* shoulders and clothing */}
      <path d={spec.torso(s)} fill={p.top} />
      <path d={spec.torsoShade(s)} fill={p.topShade} />
      {spec.body(p, s)}
      {/* neck */}
      <path d={`M352 560 H448 V${732 + s} Q400 ${764 + s} 352 ${732 + s} Z`} fill={p.skin} />
      <path d={`M352 560 H448 V610 Q400 650 352 610 Z`} fill={p.skinShade} />
      {/* head, tilted about the base of the neck */}
      <g transform={`translate(0 ${e.chin + 64}) rotate(${e.tilt} 400 600) translate(400 568) scale(1.1) translate(-400 -568)`}>
        <ellipse cx={spec.ear[0]} cy={spec.ear[2]} rx={spec.ear[1]} ry={spec.ear[3]} fill={p.skin} />
        <ellipse cx={800 - spec.ear[0]} cy={spec.ear[2]} rx={spec.ear[1]} ry={spec.ear[3]} fill={p.skinShade} />
        <path d={spec.head} fill={p.skin} />
        <path d={spec.shade} fill={p.skinShade} />
        {spec.beard && <path d={spec.beard} fill={p.hair} />}
        <path d={spec.nose} fill="none" stroke={p.skinShade} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        {e.bags && <><path d={`M${400 - spec.eyes.dx - 26} ${spec.eyes.y + 28} q26 12 52 0`} fill="none" stroke={p.skinShade} strokeWidth="6" strokeLinecap="round" /><path d={`M${400 + spec.eyes.dx - 26} ${spec.eyes.y + 28} q26 12 52 0`} fill="none" stroke={p.skinShade} strokeWidth="6" strokeLinecap="round" /></>}
        <Eye cx={400 - spec.eyes.dx} cy={spec.eyes.y} rx={spec.eyes.rx} ry={spec.eyes.ry} e={e} p={p} cover={p.skin} />
        <Eye cx={400 + spec.eyes.dx} cy={spec.eyes.y} rx={spec.eyes.rx} ry={spec.eyes.ry} e={e} p={p} cover={p.skin} />
        <Brow x={400 - spec.eyes.dx} y={spec.browY} side={-1} e={e} color={p.brow} w={spec.browW} t={spec.browT} />
        <Brow x={400 + spec.eyes.dx} y={spec.browY} side={1} e={e} color={p.brow} w={spec.browW} t={spec.browT} />
        {spec.glasses && <g fill="none" stroke="#1d1d24" strokeWidth="6"><rect x={400 - spec.eyes.dx - 52} y={spec.eyes.y - 38} width="104" height="76" rx="30" /><rect x={400 + spec.eyes.dx - 52} y={spec.eyes.y - 38} width="104" height="76" rx="30" /><path d={`M${400 - spec.eyes.dx + 52} ${spec.eyes.y - 8} Q400 ${spec.eyes.y - 18} ${400 + spec.eyes.dx - 52} ${spec.eyes.y - 8}`} /><path d={`M${400 - spec.eyes.dx - 52} ${spec.eyes.y - 6} L268 ${spec.eyes.y - 4} M${400 + spec.eyes.dx + 52} ${spec.eyes.y - 6} L532 ${spec.eyes.y - 4}`} strokeLinecap="round" /></g>}
        <Mouth x={400} y={spec.mouth.y} w={spec.mouth.w} e={e} p={p} />
        <path d={spec.hair} fill={p.hair} />
        <path d={spec.hairBand} fill={p.hairShade} />
        {spec.extra?.(p, e)}
      </g>
    </svg>
  );
}

// ------------------------------------------------------------------------------------------------ Arjun
export const ARJUN: CharSpec = {
  who: "arjun", glasses: true,
  pal: { skin: "#cf955f", skinShade: "#b97d49", hair: "#1c1d26", hairShade: "#30344a", brow: "#1c1d26", iris: "#5b3a21", lip: "#8a3f35",
    top: "#3f7db0", topShade: "#336a97", collar: "#2f5f86", accent: "#f2a93b", accentShade: "#d68a1f", under: "#eef2f6" },
  head: "M268 340 C268 224 326 160 400 160 C474 160 532 224 532 340 C532 448 488 562 400 568 C312 562 268 448 268 340 Z",
  shade: "M506 262 C540 320 536 448 484 524 C466 548 440 562 420 566 C486 524 520 420 506 262 Z",
  ear: [266, 22, 352, 34],
  beard: "M270 410 C276 500 330 566 400 570 C470 566 524 500 530 410 C514 470 470 504 432 506 Q400 496 368 506 C330 504 286 470 270 410 Z",
  hair: "M258 336 C236 196 316 112 414 108 C512 106 566 186 546 330 C540 276 514 236 468 224 C424 214 356 216 316 244 C286 264 266 296 258 336 Z",
  hairBand: "M332 192 C394 148 476 150 526 198 C474 178 404 180 346 212 Z",
  eyes: { y: 352, dx: 56, rx: 29, ry: 22 }, browY: 300, browW: 76, browT: 12,
  nose: "M402 372 Q392 410 382 422 Q402 432 424 422",
  mouth: { y: 474, w: 28 },
  torso: (s) => `M110 1000 Q110 ${800 + s} 246 ${762 + s} L340 ${730 + s} H460 L554 ${762 + s} Q690 ${800 + s} 690 1000 Z`,
  torsoShade: (s) => `M554 ${762 + s} Q690 ${800 + s} 690 1000 H560 Q580 880 520 ${790 + s} Z`,
  body: (p, s) => (
    <g>
      <path d={`M352 ${732 + s} Q400 ${790 + s} 448 ${732 + s} L438 ${810 + s} Q400 ${850 + s} 362 ${810 + s} Z`} fill={p.under} />
      <path d={`M342 ${722 + s} L270 ${790 + s} L362 ${836 + s} L396 ${748 + s} Z`} fill={p.collar} /><path d={`M458 ${722 + s} L530 ${790 + s} L438 ${836 + s} L404 ${748 + s} Z`} fill={p.topShade} />
      <path d={`M356 ${736 + s} L384 ${900} L400 1000 M444 ${736 + s} L416 ${900} L400 1000`} fill="none" stroke={p.accent} strokeWidth="14" strokeLinecap="round" />
      <rect x="352" y="930" width="96" height="70" rx="10" fill="#f7f9fb" /><rect x="364" y="942" width="30" height="34" fill={p.top} />
    </g>
  ),
};

// ------------------------------------------------------------------------------------------------ Director
export const DIRECTOR: CharSpec = {
  who: "director",
  pal: { skin: "#e6b38d", skinShade: "#cf9a73", hair: "#b6bbc4", hairShade: "#9da3ae", brow: "#8d939f", iris: "#5d6f72", lip: "#9a4c42",
    top: "#3d4655", topShade: "#2f3744", collar: "#566176", accent: "#b93c3c", accentShade: "#8f2d2d", under: "#f5f7f9" },
  head: "M252 340 C252 220 318 160 400 160 C482 160 548 220 548 340 C552 452 508 562 400 568 C292 562 248 452 252 340 Z",
  shade: "M514 270 C550 330 548 452 496 524 C476 548 446 562 424 566 C494 520 524 420 514 270 Z",
  ear: [250, 24, 352, 36],
  hair: "M240 330 C222 204 316 126 414 124 C512 122 576 200 558 330 C552 272 526 232 478 218 C432 206 376 208 336 228 C288 250 252 288 240 330 Z",
  hairBand: "M300 220 C360 166 460 160 534 206 C470 190 396 196 330 238 Z",
  eyes: { y: 354, dx: 62, rx: 29, ry: 22 }, browY: 296, browW: 88, browT: 18,
  nose: "M404 374 Q392 414 378 426 Q404 438 430 426",
  mouth: { y: 484, w: 32 },
  torso: (s) => `M60 1000 Q60 ${790 + s} 220 ${754 + s} L336 ${724 + s} H464 L580 ${754 + s} Q740 ${790 + s} 740 1000 Z`,
  torsoShade: (s) => `M580 ${754 + s} Q740 ${790 + s} 740 1000 H600 Q620 870 548 ${776 + s} Z`,
  body: (p, s) => (
    <g>
      <path d={`M336 ${724 + s} Q400 ${800 + s} 464 ${724 + s} L502 ${784 + s} L430 1000 H370 L298 ${784 + s} Z`} fill={p.under} />
      <path d={`M330 ${716 + s} L262 ${790 + s} L360 ${836 + s} L396 ${750 + s} Z`} fill="#dfe4ea" /><path d={`M470 ${716 + s} L538 ${790 + s} L440 ${836 + s} L404 ${750 + s} Z`} fill="#c9d0d9" />
      <path d={`M300 ${786 + s} L222 ${850 + s} L262 ${900 + s} L236 1000 H340 L376 ${870 + s} Z`} fill={p.collar} /><path d={`M500 ${786 + s} L578 ${850 + s} L538 ${900 + s} L564 1000 H460 L424 ${870 + s} Z`} fill={p.topShade} />
      <path d={`M390 ${790 + s} H410 L420 ${836 + s} L400 ${850 + s} L380 ${836 + s} Z`} fill={p.accent} /><path d={`M382 ${850 + s} H418 L440 960 L400 1000 L360 960 Z`} fill={p.accent} /><path d={`M400 ${850 + s} H418 L440 960 L400 1000 Z`} fill={p.accentShade} />
    </g>
  ),
};
