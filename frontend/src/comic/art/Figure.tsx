import { memo, useId, type ReactNode } from "react";
import type { CharacterId } from "../types";
import type { FaceSpec, Gaze } from "./emotion";
import { INK, rng } from "./ink";
import { LOOKS, type Look } from "./looks";
import { buildPose, type PoseId } from "./poses";

export type Light = "cool" | "amber" | "red" | "screen";
const RIM: Record<Light, string> = { cool: "#8fb0d4", amber: "#f0b457", red: "#e2573e", screen: "#a9d8ff" };

export interface FigureProps {
  id: CharacterId;
  face: FaceSpec;
  pose?: PoseId;
  /** Direction the character looks on screen. "front" faces the reader. */
  facing?: "left" | "right" | "front";
  /** "back" draws the head and shoulders from behind, for over-the-shoulder shots. */
  view?: "front" | "back";
  light?: Light;
  /** Side the main light comes from on screen (-1 left, 1 right). */
  lightFrom?: -1 | 1;
  /** Draw legs, for wide shots. */
  full?: boolean;
  /** "head" crops the drawing to head and shoulders, for portraits. */
  crop?: "head";
  label?: string;
}

// Gaze direction in figure space (x towards where the figure faces, y down).
const GAZE: Record<Gaze, [number, number]> = {
  other: [0.85, 0.05], evidence: [0.55, 0.85], down: [0.25, 1], forward: [0.05, 0], threat: [0.9, -0.2], away: [-0.7, 0.1],
};

function Eye({ cx, cy, side, f, look, gx, gy, k, uid }: { cx: number; cy: number; side: -1 | 1; f: FaceSpec; look: Look; gx: number; gy: number; k: number; uid: string }) {
  const half = 25 * k;
  const wide = Math.max(0, -f.lid);
  const open = Math.max(1.5, 14 * (1 - Math.max(0, f.lid) * 0.9) + wide * 10);
  const up = open * 1.75, lo = open * 1.0 * (1 - f.squint * 0.55);
  const shape = `M${cx - half} ${cy} Q${cx} ${cy - up} ${cx + half} ${cy} Q${cx} ${cy + lo} ${cx - half} ${cy} Z`;
  const clip = `${uid}e${side}`;
  const ir = 12 - wide * 1.8;
  const ix = cx + gx * 8 * k, iy = cy + gy * (4 + wide * 2) - (f.lid > 0.5 ? 0 : 0);
  const lidTop = `M${cx - half} ${cy} Q${cx} ${cy - up} ${cx + half} ${cy}`;
  return (
    <g>
      <defs><clipPath id={clip}><path d={shape} /></clipPath></defs>
      {/* socket shadow */}
      <ellipse cx={cx} cy={cy - 4} rx={half + 10} ry={open + 16} fill={look.skinD} opacity={0.22 + f.bags * 0.1} />
      <path d={shape} fill="#e7e2d8" />
      <g clipPath={`url(#${clip})`}>
        <circle cx={ix} cy={iy} r={ir} fill="#2a1d14" />
        <circle cx={ix} cy={iy} r={ir - 3.5} fill="#4a3322" opacity="0.9" />
        <circle cx={ix} cy={iy} r={5.4} fill="#06070a" />
        <circle cx={ix + 4} cy={iy - 4} r={2.4} fill="#fff" opacity="0.7" />
        {/* shadow cast by the upper lid */}
        <path d={`M${cx - half} ${cy - 2} Q${cx} ${cy - up - 2} ${cx + half} ${cy - 2} L${cx + half} ${cy - up * 0.2 - 6} Q${cx} ${cy - up * 0.9 - 8} ${cx - half} ${cy - up * 0.2 - 6} Z`} fill="#07080c" opacity="0.38" />
        {f.lid > 0.4 && <rect x={cx - half} y={cy - up} width={half * 2} height={up * 0.62 * f.lid} fill={look.skinD} opacity="0.9" />}
      </g>
      {/* ink: heavy upper lid with a flick at the outer corner, lighter lower lid, crease */}
      <path d={lidTop} stroke={INK} strokeWidth="5.6" fill="none" strokeLinecap="round" />
      <path d={`M${cx + side * half} ${cy} l${side * 8} ${-3.5}`} stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d={`M${cx - half} ${cy} Q${cx} ${cy + lo} ${cx + half} ${cy}`} stroke={INK} strokeWidth="2.4" fill="none" opacity="0.65" />
      <path d={`M${cx - half - 2} ${cy - up * 0.5 - 8 + f.lid * 4} Q${cx} ${cy - up - 10 + f.lid * 6} ${cx + half + 2} ${cy - up * 0.45 - 7}`} stroke={INK} strokeWidth="2.2" fill="none" opacity={f.lid > 0.45 ? 0.9 : 0.55} />
      {f.bags > 0.05 && (
        <g stroke={INK} fill="none" strokeLinecap="round" opacity={0.25 + f.bags * 0.45}>
          <path d={`M${cx - half + 4} ${cy + lo + 7} Q${cx} ${cy + lo + 18 + f.bags * 5} ${cx + half - 4} ${cy + lo + 8}`} strokeWidth="2.2" />
          <path d={`M${cx - half + 12} ${cy + lo + 15 + f.bags * 4} Q${cx} ${cy + lo + 24 + f.bags * 6} ${cx + half - 10} ${cy + lo + 15}`} strokeWidth="1.6" />
        </g>
      )}
    </g>
  );
}

function Brow({ side, f, look, shift, k }: { side: -1 | 1; f: FaceSpec; look: Look; shift: number; k: number }) {
  const asym = side === 1 ? f.browAsym : -f.browAsym * 0.5;       // right brow lifts, left drops (suspicion)
  const base = 246 - f.browLift * 15 - asym * 12;
  const ang = f.browAngle + (side === -1 ? f.browAsym * 0.5 : 0);
  const inY = base + (ang >= 0 ? ang * 12 : ang * 16);
  const outY = base - (ang >= 0 ? ang * 7 : ang * -4);
  const inX = 300 + shift + side * (16 - Math.max(0, ang) * 6) * k;
  const outX = 300 + shift + side * 104 * k;
  const t = look.browThick;
  const mx = (inX + outX) / 2 + side * 6, my = Math.min(inY, outY) - 7 - (side === 1 ? Math.max(0, asym) * 5 : 0);
  const tail = Math.max(1.6, t * 0.28);
  const d = `M${inX} ${inY + t * 0.5} Q${mx} ${my + t * 0.55} ${outX} ${outY + tail * 0.5} L${outX} ${outY - tail * 0.5} Q${mx} ${my - t * 0.5} ${inX + side * 1} ${inY - t * 0.55} Z`;
  return (
    <g>
      <path d={d} fill={look.brow} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d={`M${inX + side * 8} ${inY} Q${mx} ${my - 3} ${outX - side * 14} ${outY - 3}`} stroke={look.hairL} strokeWidth="1.4" opacity="0.35" fill="none" />
    </g>
  );
}

function Mouth({ f, look, shift, k }: { f: FaceSpec; look: Look; shift: number; k: number }) {
  const x = 300 + shift, y = 398, w = (look.female ? 28 : 32) * k;
  const c = f.corner;
  const ly = y - c * 7;
  const lip = look.lip;
  const parts: JSX.Element[] = [];
  if (f.mouth === "neutral" || f.mouth === "press") {
    const press = f.mouth === "press";
    parts.push(<path key="u" d={`M${x - w} ${ly} Q${x - w / 2} ${y - 4} ${x} ${y - 2} Q${x + w / 2} ${y - 4} ${x + w} ${ly}`} fill={lip} opacity="0.5" stroke="none" />);
    parts.push(<path key="l" d={`M${x - w + 4} ${ly + 1} Q${x} ${y + (press ? 14 : 20 + f.open * 40)} ${x + w - 4} ${ly + 1} Q${x} ${y + 2 + f.open * 22} ${x - w + 4} ${ly + 1}`} fill={lip} opacity="0.42" />);
    if (f.open > 0.02) parts.push(<path key="g" d={`M${x - w + 6} ${ly} Q${x} ${y + 3 + f.open * 40} ${x + w - 6} ${ly}`} fill="#1d0c0d" opacity="0.8" />);
    parts.push(<path key="c" d={`M${x - w} ${ly} Q${x - w / 2} ${y + (press ? 1 : 3)} ${x} ${y + 1} Q${x + w / 2} ${y + (press ? 1 : 3)} ${x + w} ${ly}`} stroke={INK} strokeWidth={press ? 4.4 : 3.6} fill="none" strokeLinecap="round" />);
    if (press) {
      parts.push(<path key="d1" d={`M${x - w - 2} ${ly - 2} l-3 5 M${x + w + 2} ${ly - 2} l3 5`} stroke={INK} strokeWidth="2.4" opacity="0.7" strokeLinecap="round" />);
      parts.push(<path key="ch" d={`M${x - 15} ${y + 26} Q${x} ${y + 19} ${x + 15} ${y + 26}`} stroke={INK} strokeWidth="2.2" opacity={0.25 + f.clench * 0.35} fill="none" />);
    } else {
      parts.push(<path key="sh" d={`M${x - 16} ${y + 15} Q${x} ${y + 22} ${x + 16} ${y + 15}`} stroke={look.skinD} strokeWidth="3" opacity="0.55" fill="none" />);
    }
  } else {
    const shout = f.mouth === "shout";
    const oh = (shout ? 24 : f.mouth === "open" ? 14 : 7) + f.open * (shout ? 24 : 16);
    const ow = w * (shout ? 1.12 : f.mouth === "open" ? 0.82 : 0.7);
    const top = `M${x - ow} ${ly} Q${x - ow / 2} ${y - 6} ${x} ${y - 4} Q${x + ow / 2} ${y - 6} ${x + ow} ${ly}`;
    const bottom = `Q${x + ow * 0.7} ${y + oh + 4} ${x} ${y + oh + 6} Q${x - ow * 0.7} ${y + oh + 4} ${x - ow} ${ly}`;
    parts.push(<path key="m" d={`${top} ${bottom} Z`} fill="#1d0b0c" stroke={INK} strokeWidth="3.4" strokeLinejoin="round" />);
    parts.push(<path key="t" d={`M${x - ow * 0.78} ${ly + 1} Q${x} ${y - 2} ${x + ow * 0.78} ${ly + 1} L${x + ow * 0.7} ${ly + 8} Q${x} ${y + 4} ${x - ow * 0.7} ${ly + 8} Z`} fill="#e3ddd0" />);
    if (oh > 18) parts.push(<ellipse key="to" cx={x} cy={y + oh * 0.75} rx={ow * 0.5} ry={oh * 0.22} fill="#8b3a38" />);
    parts.push(<path key="lu" d={top} stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" />);
    parts.push(<path key="ll" d={`M${x - ow + 6} ${y + oh + 12} Q${x} ${y + oh + 22} ${x + ow - 6} ${y + oh + 12}`} stroke={look.skinD} strokeWidth="3" opacity="0.5" fill="none" />);
  }
  return <g>{parts}</g>;
}

function Hair({ look, back }: { look: Look; back: boolean }) {
  const r = rng(`${look.hairStyle}${look.hair}`);
  const strands = (n: number, base: string, color: string) => Array.from({ length: n }, (_, i) => {
    const a = -Math.PI * (0.08 + 0.84 * (i / n)), rr = 112 + r() * 12;
    const x1 = 300 + Math.cos(a) * rr * 0.45, y1 = 268 + Math.sin(a) * 118 * 0.45;
    const x2 = 300 + Math.cos(a) * rr, y2 = 268 + Math.sin(a) * 124;
    return <path key={`${base}${i}`} d={`M${x1} ${y1} Q${(x1 + x2) / 2 + (r() - 0.5) * 12} ${(y1 + y2) / 2} ${x2} ${y2}`} stroke={color} strokeWidth="1.6" opacity="0.28" fill="none" />;
  });
  const dark = look.hair, lite = look.hairL;
  const S = { stroke: INK, strokeWidth: 5, strokeLinejoin: "round" as const };
  if (back) {
    switch (look.hairStyle) {
      case "ponytail": return <g><path d="M214 190 C170 260 150 420 168 560 C190 570 214 540 224 470 C220 380 232 300 252 214 Z" fill={dark} {...S} /><path d="M196 300 C186 380 180 460 186 540" stroke={lite} strokeWidth="2" opacity="0.5" fill="none" /></g>;
      case "wavy": return <g><path d="M186 250 C130 330 118 470 150 590 C190 620 240 590 252 520 L348 520 C360 590 410 620 450 590 C482 470 470 330 414 250 Z" fill={dark} {...S} /><path d="M150 330 C140 420 150 520 170 580 M450 330 C460 420 450 520 430 580" stroke={lite} strokeWidth="2.4" opacity="0.4" fill="none" /></g>;
      case "bun": return <g><circle cx="300" cy="104" r="50" fill={dark} {...S} /><path d="M262 92 C290 76 320 78 340 98" stroke={lite} strokeWidth="2.4" opacity="0.5" fill="none" /></g>;
      default: return null;
    }
  }
  switch (look.hairStyle) {
    case "crop":
      return (
        <g>
          <path d="M186 280 C176 176 232 124 300 122 C372 124 426 176 414 280 C404 226 388 202 350 192 C314 214 262 196 236 202 C208 216 194 244 186 280 Z" fill={dark} {...S} />
          <path d="M187 282 C181 240 192 212 216 196 C208 222 206 252 212 284 Z" fill={look.hairL} opacity="0.8" />
          <path d="M413 282 C419 240 408 212 384 196 C392 222 394 252 388 284 Z" fill={look.hairL} opacity="0.8" />
          {strands(18, "c", lite)}
        </g>
      );
    case "ponytail":
      return (
        <g>
          <path d="M190 262 C184 170 236 130 300 128 C364 130 416 170 410 262 C396 214 372 196 340 190 C318 202 290 202 262 190 C230 196 202 220 190 262 Z" fill={dark} {...S} />
          <path d="M262 190 C282 204 318 204 340 190" stroke={lite} strokeWidth="2.2" opacity="0.55" fill="none" />
          <path d="M300 128 L300 186" stroke={INK} strokeWidth="2.4" opacity="0.6" />
          {strands(14, "p", lite)}
        </g>
      );
    case "messy":
      return (
        <g>
          <path d="M184 276 C168 190 206 128 262 118 L254 96 L286 112 L296 84 L316 112 L346 90 L350 120 L388 112 L376 146 C420 168 424 230 414 276 C404 232 388 210 358 200 L330 184 C300 214 258 188 234 206 C206 216 192 244 184 276 Z" fill={dark} {...S} />
          <path d="M214 160 L240 120 M260 176 L290 128 M330 168 L352 120 M384 190 L402 150" stroke={lite} strokeWidth="2.4" opacity="0.55" fill="none" />
        </g>
      );
    case "wavy":
      return (
        <g>
          <path d="M184 290 C170 180 226 124 300 122 C374 124 430 180 416 290 C418 240 400 208 372 192 C338 196 290 188 262 168 C240 196 204 228 184 290 Z" fill={dark} {...S} />
          <path d="M262 168 C290 196 340 200 372 192" stroke={lite} strokeWidth="2.6" opacity="0.5" fill="none" />
          <path d="M190 280 C186 230 206 200 240 184 M410 280 C414 230 394 202 372 192" stroke={lite} strokeWidth="2.2" opacity="0.4" fill="none" />
          <path d="M188 280 C176 340 186 420 214 480 L232 470 C214 410 214 330 226 270 Z M412 280 C424 340 414 420 386 480 L368 470 C386 410 386 330 374 270 Z" fill={dark} {...S} />
        </g>
      );
    case "gray_crop":
      return (
        <g>
          <path d="M184 276 C176 184 236 138 300 136 C366 138 426 184 416 276 C412 244 404 226 392 214 C376 218 364 232 350 214 C332 204 306 206 290 210 C270 208 252 214 240 232 C228 222 214 222 204 236 C194 246 188 258 184 276 Z" fill={dark} {...S} />
          <path d="M208 206 C250 170 350 170 392 208" stroke={lite} strokeWidth="3" opacity="0.5" fill="none" />
          <path d="M190 262 C190 238 200 226 210 220 L214 262 Z M410 262 C410 238 400 226 390 220 L386 262 Z" fill={dark} />
          {strands(10, "g", lite)}
        </g>
      );
    case "bun":
      return (
        <g>
          <path d="M188 270 C182 176 234 134 300 132 C366 134 418 176 412 270 C398 218 374 196 344 188 C318 200 282 200 256 188 C226 196 202 218 188 270 Z" fill={dark} {...S} />
          <path d="M256 188 C282 200 318 200 344 188" stroke={lite} strokeWidth="2.4" opacity="0.55" fill="none" />
          <path d="M300 134 L300 190" stroke={INK} strokeWidth="2.2" opacity="0.5" />
        </g>
      );
  }
}

function Torso({ look, sy, neck }: { look: Look; sy: number; neck: ReactNode }) {
  const bottom = 1190;
  const body = `M20 ${bottom} L28 ${sy + 46} C34 ${sy + 6} 86 ${sy - 8} 156 ${sy - 30} L246 516 L354 516 L444 ${sy - 30} C514 ${sy - 8} 566 ${sy + 6} 572 ${sy + 46} L580 ${bottom} Z`;
  const L = look;
  const lines: JSX.Element[] = [];
  switch (L.outfit) {
    case "blazer_lanyard":
      lines.push(
        <path key="sh" d={`M258 522 L300 ${sy + 120} L342 522 L318 560 L300 600 L282 560 Z`} fill={L.under} stroke={INK} strokeWidth="4" />,
        <path key="l1" d={`M258 522 L214 ${sy + 120} L270 ${sy + 340} L300 ${sy + 120}`} fill={L.clothD} stroke={INK} strokeWidth="5" strokeLinejoin="round" />,
        <path key="l2" d={`M342 522 L386 ${sy + 120} L330 ${sy + 340} L300 ${sy + 120}`} fill={L.clothD} stroke={INK} strokeWidth="5" strokeLinejoin="round" />,
        <path key="ly" d={`M268 524 L292 ${sy + 250} M332 524 L308 ${sy + 250}`} stroke={L.accent} strokeWidth="9" strokeLinecap="round" />,
        <path key="ly2" d={`M268 524 L292 ${sy + 250} M332 524 L308 ${sy + 250}`} stroke={INK} strokeWidth="2" opacity="0.5" />,
        <rect key="bd" x="276" y={sy + 244} width="48" height="62" rx="5" fill="#d8dde4" stroke={INK} strokeWidth="4" />,
        <rect key="bp" x="284" y={sy + 252} width="14" height="16" fill="#4a6a8a" />,
        <path key="bl" d={`M284 ${sy + 278} L316 ${sy + 278} M284 ${sy + 288} L308 ${sy + 288}`} stroke={INK} strokeWidth="2.4" opacity="0.6" />,
      );
      break;
    case "hivis_vest":
      lines.push(
        <path key="sh" d={`M258 522 L300 ${sy + 70} L342 522 L318 548 L300 580 L282 548 Z`} fill={L.under} stroke={INK} strokeWidth="4" />,
        <path key="vl" d={`M150 ${sy - 24} L226 ${sy + 20} L262 ${bottom} L96 ${bottom} L84 ${sy + 70} Z`} fill={L.cloth} stroke={INK} strokeWidth="5" strokeLinejoin="round" />,
        <path key="vr" d={`M450 ${sy - 24} L374 ${sy + 20} L338 ${bottom} L504 ${bottom} L516 ${sy + 70} Z`} fill={L.cloth} stroke={INK} strokeWidth="5" strokeLinejoin="round" />,
        <path key="rf1" d={`M162 ${sy + 44} L238 ${sy + 120} L242 ${sy + 160} L148 ${sy + 100} Z M438 ${sy + 44} L362 ${sy + 120} L358 ${sy + 160} L452 ${sy + 100} Z`} fill={L.accent} stroke={INK} strokeWidth="3" opacity="0.92" />,
        <path key="rf2" d={`M120 ${sy + 330} L252 ${sy + 330} M480 ${sy + 330} L348 ${sy + 330}`} stroke={L.accent} strokeWidth="26" opacity="0.9" />,
        <path key="rf3" d={`M120 ${sy + 330} L252 ${sy + 330} M480 ${sy + 330} L348 ${sy + 330}`} stroke={INK} strokeWidth="3" opacity="0.5" strokeDasharray="14 10" />,
        <rect key="rd" x="396" y={sy + 150} width="38" height="66" rx="6" fill="#171c24" stroke={INK} strokeWidth="4" />,
      );
      break;
    case "hoodie":
      lines.push(
        <path key="hd" d={`M214 ${sy - 40} C230 470 290 520 300 ${sy + 70} C310 520 370 470 386 ${sy - 40} C430 ${sy - 70} 440 ${sy + 20} 410 ${sy + 60} L300 ${sy + 150} L190 ${sy + 60} C160 ${sy + 20} 170 ${sy - 70} 214 ${sy - 40} Z`} fill={L.clothD} stroke={INK} strokeWidth="5" strokeLinejoin="round" />,
        <path key="op" d={`M262 524 C270 ${sy + 20} 290 ${sy + 70} 300 ${sy + 90} C310 ${sy + 70} 330 ${sy + 20} 338 524`} fill={L.under} stroke={INK} strokeWidth="4" />,
        <path key="ds" d={`M280 ${sy + 20} L272 ${sy + 230} M320 ${sy + 20} L328 ${sy + 230}`} stroke={L.accent} strokeWidth="5" strokeLinecap="round" />,
        <path key="pk" d={`M170 ${sy + 330} L430 ${sy + 330} L450 ${sy + 520} L150 ${sy + 520} Z`} fill="none" stroke={INK} strokeWidth="3.4" opacity="0.5" />,
      );
      break;
    case "blazer_blouse":
      lines.push(
        <path key="bl" d={`M258 522 L300 ${sy + 170} L342 522 L318 548 L300 580 L282 548 Z`} fill={L.under} stroke={INK} strokeWidth="4" />,
        <path key="l1" d={`M258 522 L196 ${sy + 70} L252 ${sy + 330} L300 ${sy + 170}`} fill={L.clothD} stroke={INK} strokeWidth="5" strokeLinejoin="round" />,
        <path key="l2" d={`M342 522 L404 ${sy + 70} L348 ${sy + 330} L300 ${sy + 170}`} fill={L.clothD} stroke={INK} strokeWidth="5" strokeLinejoin="round" />,
        <circle key="pn" cx="300" cy={sy + 110} r="9" fill={L.accent} stroke={INK} strokeWidth="2.4" />,
        <path key="pc" d={`M300 566 L300 ${sy + 100}`} stroke={L.accent} strokeWidth="2.2" opacity="0.8" />,
      );
      break;
    case "work_jacket":
      lines.push(
        <path key="cl" d={`M248 516 L196 ${sy - 24} L258 ${sy + 36} L300 ${sy - 4} L342 ${sy + 36} L404 ${sy - 24} L352 516 Z`} fill={L.clothL} stroke={INK} strokeWidth="5" strokeLinejoin="round" />,
        <path key="sh" d={`M262 530 L300 ${sy + 60} L338 530 L322 560 L300 580 L278 560 Z`} fill={L.under} stroke={INK} strokeWidth="4" />,
        <path key="zp" d={`M300 ${sy + 36} L300 ${bottom}`} stroke={INK} strokeWidth="4" />,
        <path key="st" d={`M40 ${sy + 280} L560 ${sy + 280}`} stroke={L.accent} strokeWidth="24" opacity="0.92" />,
        <path key="st2" d={`M40 ${sy + 280} L560 ${sy + 280}`} stroke={INK} strokeWidth="2.6" strokeDasharray="12 9" opacity="0.5" />,
        <rect key="bd" x="396" y={sy + 110} width="52" height="70" rx="6" fill="#d8dde4" stroke={INK} strokeWidth="4" />,
        <path key="bz" d={`M404 ${sy + 130} L440 ${sy + 130} M404 ${sy + 144} L430 ${sy + 144}`} stroke={INK} strokeWidth="3" opacity="0.6" />,
      );
      break;
    case "lab_coat":
      lines.push(
        <path key="sc" d={`M244 516 C246 ${sy + 70} 300 ${sy + 170} 356 516 L344 536 C300 ${sy + 100} 290 ${sy + 100} 256 536 Z`} fill={L.under} stroke={INK} strokeWidth="4" />,
        <path key="l1" d={`M246 514 L180 ${sy + 20} L214 ${sy + 330} L286 ${sy + 120} Z`} fill={L.clothL} stroke={INK} strokeWidth="5" strokeLinejoin="round" />,
        <path key="l2" d={`M354 514 L420 ${sy + 20} L386 ${sy + 330} L314 ${sy + 120} Z`} fill={L.clothL} stroke={INK} strokeWidth="5" strokeLinejoin="round" />,
        <path key="stt" d={`M240 520 C190 ${sy + 120} 210 ${sy + 330} 290 ${sy + 340} M360 520 C410 ${sy + 120} 390 ${sy + 330} 310 ${sy + 340}`} stroke="#23272e" strokeWidth="9" fill="none" strokeLinecap="round" />,
        <circle key="stc" cx="300" cy={sy + 344} r="17" fill="#8a93a0" stroke={INK} strokeWidth="4" />,
        <path key="ln" d={`M268 522 L286 ${sy + 220} M332 522 L314 ${sy + 220}`} stroke={L.under} strokeWidth="7" strokeLinecap="round" />,
        <rect key="bd" x="288" y={sy + 220} width="40" height="52" rx="4" fill="#fff" stroke={INK} strokeWidth="3.4" opacity="0.95" />,
      );
      break;
  }
  return (
    <g>
      <path d={body} fill={look.outfit === "hivis_vest" ? look.under : look.cloth} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      {neck}
      {/* ink shadows on the side away from the light, drawn as hatching */}
      <path d={`M20 ${bottom} L28 ${sy + 46} C34 ${sy + 6} 60 ${sy - 4} 96 ${sy - 14} L120 ${sy + 120} L96 ${bottom} Z`} fill={look.clothD} opacity="0.5" />
      <path d={`M40 ${sy + 120} l72 -84 M40 ${sy + 180} l110 -130 M44 ${sy + 250} l140 -160 M46 ${sy + 330} l170 -190 M50 ${sy + 410} l180 -200`} stroke={INK} strokeWidth="2" opacity="0.35" fill="none" />
      {lines}
      <path d={`M${60} ${sy + 20} C${140} ${sy - 12} ${210} ${sy - 26} ${258} 524`} stroke={INK} strokeWidth="3" opacity="0.4" fill="none" />
    </g>
  );
}

function Neck({ look, clench }: { look: Look; clench: number }) {
  return (
    <g>
      <path d="M250 400 L250 540 Q300 560 350 540 L350 400 Z" fill={look.skin} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M250 476 Q300 522 350 482 L350 540 Q300 556 250 540 Z" fill={look.skinD} opacity="0.55" />
      <path d="M252 478 Q300 506 348 480 L348 498 Q300 528 252 500 Z" fill={INK} opacity="0.28" />
      {clench > 0.35 && <path d="M268 470 L282 540 M332 470 L318 540" stroke={INK} strokeWidth="2.6" opacity={clench * 0.6} fill="none" />}
    </g>
  );
}

function Legs({ look }: { look: Look }) {
  const leg = (x1: number, x2: number) => `M${x1} 1160 C${x1 - 6} 1400 ${x2 - 6} 1600 ${x2} 1820`;
  return (
    <g strokeLinecap="round" fill="none">
      {[[190, 176], [410, 424]].map(([a, b], i) => (
        <g key={i}>
          <path d={leg(a, b)} stroke={INK} strokeWidth="190" />
          <path d={leg(a, b)} stroke={look.trousers} strokeWidth="178" />
          <path d={`M${a + (i ? 20 : -20)} 1250 L${b + (i ? 14 : -14)} 1800`} stroke={INK} strokeWidth="3" opacity="0.5" />
          <path d={`M${b - 60} 1850 C${b - 70} 1816 ${b + 60} 1816 ${b + 74} 1850 L${b + 84} 1884 L${b - 74} 1884 Z`} fill="#0d1017" stroke={INK} strokeWidth="6" />
        </g>
      ))}
    </g>
  );
}

/**
 * One character, drawn from structured parameters. Identity (hair, face shape, clothes) comes from LOOKS and never
 * changes; everything the reader reads as mood (brows, lids, gaze, mouth, jaw, posture, hands) comes from FaceSpec/pose.
 */
export const Figure = memo(function Figure({ id, face: f, pose = "idle", facing = "front", view = "front", light = "cool", lightFrom = 1, full = false, crop, label }: FigureProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const look = LOOKS[id];
  const flip = facing === "left";
  const turn = facing === "front" ? 0 : 1;
  const lightX = flip ? -lightFrom : lightFrom;           // light direction in figure space
  const sy = 590 - f.shoulders * 22 + (f.shoulders < 0 ? -f.shoulders * 18 : 0);
  const p = buildPose(pose, look, sy);
  const lean = p.lean ?? { x: 0, y: 0, rot: 0 };
  const hd = p.head ?? { x: 0, y: 0, rot: 0 };
  const shift = turn * 20;
  const kNear = turn ? 1.06 : 1, kFar = turn ? 0.86 : 1;
  const [gxRaw, gyRaw] = GAZE[f.gaze];
  const gx = view === "front" ? (turn ? gxRaw : gxRaw * 0.4) : 0;
  const vb = crop === "head" ? "90 100 420 470" : full ? "-250 0 1100 1900" : "-250 0 1100 1100";
  const head = view === "back" ? <BackHead look={look} /> : (
    <g>
      <Hair look={look} back />
      <Face f={f} look={look} uid={uid} lightX={lightX} rim={RIM[light]} gx={gx} gy={gyRaw} shift={shift} kNear={kNear} kFar={kFar} turn={turn} />
      <Hair look={look} back={false} />
    </g>
  );
  return (
    <svg className="figure" viewBox={vb} role="img" aria-label={label ?? `${id}, ${f.emotion.replace(/_/g, " ")}`} data-emotion={f.emotion} data-pose={pose} data-character={id}>
      <g transform={flip ? "translate(600 0) scale(-1 1)" : undefined}>
        {full && <Legs look={look} />}
        <g transform={`translate(${lean.x} ${lean.y}) rotate(${lean.rot} 300 1150)`}>
          <g transform="translate(300 520) scale(0.9 0.97) translate(-300 -520)">
          {p.behind}
          <Torso look={look} sy={sy} neck={<Neck look={look} clench={f.clench} />} />
          {pose !== "hands_desk" && p.front}
          </g>
          <g transform={`translate(${hd.x} ${hd.y + f.drop + 30}) rotate(${hd.rot + f.tilt} 300 470)`}>{head}</g>
          <g transform="translate(300 520) scale(0.9 0.97) translate(-300 -520)">{p.over}<RimLight light={light} lightX={lightX} sy={sy} /></g>
        </g>
        {pose === "hands_desk" && p.front}
      </g>
    </svg>
  );
});

function RimLight({ light, lightX, sy }: { light: Light; lightX: number; sy: number }) {
  const c = RIM[light];
  const sgn = lightX >= 0 ? 1 : -1;
  const X = (x: number) => 300 + sgn * (x - 300);
  return (
    <g fill="none" stroke={c} strokeLinecap="round" opacity="0.6" transform="">
      <path d={`M${X(566)} ${sy + 44} C${X(560)} ${sy + 20} ${X(520)} ${sy - 6} ${X(450)} ${sy - 28}`} strokeWidth="6" />
    </g>
  );
}

function BackHead({ look }: { look: Look }) {
  return (
    <g>
      <ellipse cx="190" cy="318" rx="15" ry="36" fill={look.skinD} stroke={INK} strokeWidth="4" />
      <ellipse cx="410" cy="318" rx="15" ry="36" fill={look.skin} stroke={INK} strokeWidth="4" />
      <path d="M300 138 C376 138 416 200 414 280 C414 340 400 390 372 418 C340 440 260 440 228 418 C200 390 186 340 186 280 C184 200 224 138 300 138 Z" fill={look.hair} stroke={INK} strokeWidth="5" />
      <path d="M228 418 C250 396 350 396 372 418 C340 440 260 440 228 418 Z" fill={look.hair} />
      <path d="M236 176 C270 150 330 150 366 176" stroke={look.hairL} strokeWidth="9" opacity="0.28" fill="none" strokeLinecap="round" />
      {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${300 + (i - 2.5) * 12} 152 Q${300 + (i - 2.5) * 38} 250 ${300 + (i - 2.5) * 30} ${380}`} stroke={look.hairL} strokeWidth="1.5" opacity="0.22" fill="none" />)}
      {look.hairStyle === "bun" && <circle cx="300" cy="106" r="50" fill={look.hair} stroke={INK} strokeWidth="5" />}
    </g>
  );
}

function Face({ f, look, uid, lightX, rim, gx, gy, shift, kNear, kFar, turn }: {
  f: FaceSpec; look: Look; uid: string; lightX: number; rim: string; gx: number; gy: number; shift: number; kNear: number; kFar: number; turn: number;
}) {
  const w = look.jaw;
  const jx = (n: number) => 300 + (n - 300) * w;
  const faceD = `M300 140 C372 140 412 200 410 275 C409 330 ${jx(399)} 380 ${jx(368)} 418 C${jx(348)} 440 324 452 300 452 C276 452 ${jx(252)} 440 ${jx(232)} 418 C${jx(201)} 380 191 330 190 275 C188 200 228 140 300 140 Z`;
  const clipId = `${uid}face`, patId = `${uid}hatch`;
  const sh = lightX >= 0 ? -1 : 1;           // shadow falls on this side
  const shadowD = sh < 0
    ? "M150 120 L286 120 C270 220 292 330 276 470 L150 470 Z"
    : "M450 120 L314 120 C330 220 308 330 324 470 L450 470 Z";
  const eyeY = 285, ex = 55;
  const eyeL = { cx: 300 + shift - ex * kFar * (turn ? 1 : 1), cy: eyeY };
  const eyeR = { cx: 300 + shift + ex * kNear, cy: eyeY };
  // Figure space faces +x, so the right eye is the far eye when turned: compress it, enlarge the near (left) one.
  const lookNear = turn ? { l: kNear, r: kFar } : { l: 1, r: 1 };
  return (
    <g>
      <defs>
        <clipPath id={clipId}><path d={faceD} /></clipPath>
        <pattern id={patId} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><line x1="0" y1="0" x2="0" y2="7" stroke={INK} strokeWidth="1.6" /></pattern>
      </defs>
      {/* ears */}
      <ellipse cx="190" cy="318" rx="16" ry="38" fill={look.skinD} stroke={INK} strokeWidth="4.5" />
      <ellipse cx="410" cy="318" rx="16" ry="38" fill={look.skin} stroke={INK} strokeWidth="4.5" />
      <path d="M186 300 Q180 320 190 340 M414 300 Q420 320 410 340" stroke={INK} strokeWidth="2.2" fill="none" opacity="0.7" />
      {look.earring && <circle cx={sh < 0 ? 410 : 190} cy="358" r="5" fill="#d6dbe2" stroke={INK} strokeWidth="1.6" />}
      {/* head */}
      <path d={faceD} fill={look.skin} />
      <g clipPath={`url(#${clipId})`}>
        <path d={shadowD} fill={look.skinD} opacity="0.62" />
        <path d={shadowD} fill={`url(#${patId})`} opacity="0.2" />
        <path d={sh < 0 ? "M404 200 C414 260 410 340 384 410" : "M196 200 C186 260 190 340 216 410"} stroke={rim} strokeWidth="14" fill="none" opacity="0.5" strokeLinecap="round" />
        {/* shade under the brow, cheek and jaw */}
        <ellipse cx="300" cy="455" rx="120" ry="38" fill={look.skinD} opacity="0.35" />
        <path d={`M${300 + sh * 70} 352 C${300 + sh * 92} 372 ${300 + sh * 92} 410 ${300 + sh * 70} 440`} stroke={INK} strokeWidth="2" opacity="0.3" fill="none" />
        {/* forehead lines when the brows are raised */}
        {f.browLift > 0.4 && <g stroke={INK} strokeWidth="2" opacity={0.2 + f.browLift * 0.25} fill="none"><path d="M240 204 Q300 194 360 204" /><path d="M248 220 Q300 211 352 220" /></g>}
        {/* furrow between the brows */}
        {f.browAngle > 0.3 && <g stroke={INK} strokeWidth="2.4" opacity={0.3 + f.browAngle * 0.4} fill="none"><path d={`M${292 + shift} 224 L${292 + shift} 258`} /><path d={`M${308 + shift} 226 L${308 + shift} 258`} /></g>}
        {(look.agelines ?? 0) > 0.4 && <g stroke={INK} strokeWidth="1.6" opacity={0.1 + (look.agelines ?? 0) * 0.14} fill="none"><path d="M236 224 Q300 214 364 224" /></g>}
        {/* stubble */}
        {(look.stubble ?? 0) > 0 && <path d="M214 372 C222 424 262 452 300 454 C340 452 380 424 386 372 C372 392 346 404 300 404 C254 404 228 392 214 372 Z" fill={look.hair} opacity={look.stubble} />}
        {(look.stubble ?? 0) > 0.3 && <path d="M214 372 C222 424 262 452 300 454 C340 452 380 424 386 372 L386 440 L214 440 Z" fill={`url(#${patId})`} opacity="0.12" />}
        {/* jaw muscle */}
        {f.clench > 0.2 && <g stroke={INK} fill="none" opacity={0.2 + f.clench * 0.4}><path d={`M${300 + sh * 94} 372 Q${300 + sh * 100} 400 ${300 + sh * 82} 424`} strokeWidth="3" /><path d={`M${300 - sh * 94} 372 Q${300 - sh * 100} 400 ${300 - sh * 82} 424`} strokeWidth="3" /></g>}
      </g>
      {/* nose */}
      <g fill="none" strokeLinecap="round">
        <path d={`M${296 + shift * 1.3} 290 C${288 + shift * 1.3} 316 ${284 + shift * 1.3} 336 ${280 + shift * 1.3} 350`} stroke={INK} strokeWidth="3.2" opacity="0.7" />
        <path d={`M${272 + shift * 1.4} 356 Q${300 + shift * 1.4} 372 ${328 + shift * 1.4} 356`} stroke={INK} strokeWidth="3.4" />
        <path d={`M${282 + shift * 1.4} 358 q-4 4 0 8 M${318 + shift * 1.4} 358 q4 4 0 8`} stroke={INK} strokeWidth="2.6" />
        <path d={`M${272 + shift * 1.4} 352 C${262 + shift * 1.4} 346 ${260 + shift * 1.4} 360 ${270 + shift * 1.4} 366 M${328 + shift * 1.4} 352 C${338 + shift * 1.4} 346 ${340 + shift * 1.4} 360 ${330 + shift * 1.4} 366`} stroke={INK} strokeWidth="2.4" opacity="0.55" />
        <ellipse cx={300 + shift * 1.4} cy="371" rx="20" ry="6" fill={look.skinD} opacity="0.5" stroke="none" />
      </g>
      {/* nasolabial lines: tension in the cheeks */}
      <g stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity={0.18 + f.nasolabial * 0.55}>
        <path d={`M${272 + shift} 364 Q${252 + shift} 380 ${258 + shift} ${404}`} />
        <path d={`M${328 + shift} 364 Q${348 + shift} 380 ${342 + shift} ${404}`} />
      </g>
      <Eye cx={eyeL.cx} cy={eyeL.cy} side={-1} f={f} look={look} gx={gx} gy={gy} k={lookNear.l} uid={uid} />
      <Eye cx={eyeR.cx} cy={eyeR.cy} side={1} f={f} look={look} gx={gx} gy={gy} k={lookNear.r} uid={uid} />
      <Brow side={-1} f={f} look={look} shift={shift} k={kNear} />
      <Brow side={1} f={f} look={look} shift={shift} k={kFar} />
      {look.moustache && <path d={`M${262 + shift} 392 Q${280 + shift} 374 ${300 + shift} 384 Q${320 + shift} 374 ${338 + shift} 392 Q${320 + shift} 402 ${300 + shift} 396 Q${280 + shift} 402 ${262 + shift} 392 Z`} fill={look.hair} stroke={INK} strokeWidth="2" />}
      <Mouth f={f} look={look} shift={shift} k={kNear} />
      {look.glasses && (
        <g fill="none" stroke="#10151d" strokeWidth="5" strokeLinejoin="round">
          <rect x={eyeL.cx - 38} y={eyeY - 26} width={76 * lookNear.l} height="50" rx="14" fill="#9fd0ff" fillOpacity="0.1" />
          <rect x={eyeR.cx - 38 * lookNear.r} y={eyeY - 26} width={76 * lookNear.r} height="50" rx="14" fill="#9fd0ff" fillOpacity="0.1" />
          <path d={`M${eyeL.cx + 38 * lookNear.l} ${eyeY - 6} Q${300 + shift} ${eyeY - 12} ${eyeR.cx - 38 * lookNear.r} ${eyeY - 6}`} />
          <path d={`M${eyeL.cx - 38} ${eyeY - 8} L190 ${eyeY - 4} M${eyeR.cx + 38 * lookNear.r} ${eyeY - 8} L410 ${eyeY - 4}`} strokeWidth="4" />
          <path d={`M${eyeL.cx - 24} ${eyeY - 16} l18 -4 M${eyeR.cx - 20 * lookNear.r} ${eyeY - 16} l18 -4`} stroke="#fff" strokeWidth="3" opacity="0.4" />
        </g>
      )}
      {f.sweat > 0.3 && <path d="M222 206 C216 220 214 230 222 236 C230 230 228 220 222 206 Z" fill="#cfe1ee" stroke={INK} strokeWidth="1.6" opacity={0.5 + f.sweat * 0.4} />}
      {f.sweat > 0.7 && <path d="M384 232 C379 242 378 249 384 253 C390 249 389 242 384 232 Z" fill="#cfe1ee" stroke={INK} strokeWidth="1.4" opacity="0.7" />}
      {/* heavy ink contour, thicker on the shadow side */}
      <path d={faceD} fill="none" stroke={INK} strokeWidth="4.6" strokeLinejoin="round" />
      <path d={sh < 0 ? `M190 275 C191 330 ${jx(201)} 380 ${jx(232)} 418 C${jx(252)} 440 276 452 300 452` : `M410 275 C409 330 ${jx(399)} 380 ${jx(368)} 418 C${jx(348)} 440 324 452 300 452`} fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" />
    </g>
  );
}
