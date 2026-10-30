import type { ReactNode } from "react";
import { INK } from "./ink";
import type { Look } from "./looks";

// All coordinates share the figure's 600-wide body space (head centred on x=300, shoulders at y≈590).
// A pose describes the arms, hands and anything held or touched. "near" is the arm on the side the
// character is facing (screen right before any flip); the renderer mirrors the whole figure for left-facing placements.

export type PoseId =
  | "idle" | "crossed" | "point" | "hold_paper" | "hold_tablet" | "lean_terminal" | "stop_palm" | "open_palm"
  | "hand_chin" | "hand_neck" | "radio" | "hands_desk" | "hips" | "hover_pen" | "point_map";

type Pt = [number, number];
const smooth = (pts: Pt[]): string => {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const m: Pt = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    d += ` Q${pts[i][0]} ${pts[i][1]} ${m[0]} ${m[1]}`;
  }
  const l = pts[pts.length - 1];
  return `${d} L${l[0]} ${l[1]}`;
};

/** A limb as an inked tube: ink outline, base colour, a shaded underside and a thin lit edge. */
function Tube({ pts, w, c, cD, cL }: { pts: Pt[]; w: number; c: string; cD: string; cL?: string }) {
  const d = smooth(pts);
  return (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d={d} stroke={INK} strokeWidth={w + 11} />
      <path d={d} stroke={c} strokeWidth={w} />
      <path d={d} stroke={cD} strokeWidth={w * 0.34} opacity="0.55" style={{ transform: `translate(${w * 0.28}px, ${w * 0.1}px)` }} />
      {cL && <path d={d} stroke={cL} strokeWidth={4} opacity="0.35" style={{ transform: `translate(${-w * 0.3}px, ${-w * 0.08}px)` }} />}
    </g>
  );
}

type HandKind = "open" | "fist" | "point" | "flat";
/** A hand drawn with ink outline; fingers are capsules so the silhouette reads at small sizes. `r` rotates it (degrees). */
function Hand({ x, y, r = 0, kind, look, s = 1 }: { x: number; y: number; r?: number; kind: HandKind; look: Look; s?: number }) {
  const cap = (x1: number, y1: number, x2: number, y2: number, w: number) => ({ d: `M${x1} ${y1} L${x2} ${y2}`, w });
  const fingers = kind === "open" || kind === "flat"
    ? [cap(-19, -6, -22, -58, 13), cap(-6, -8, -7, -68, 13), cap(8, -8, 9, -64, 13), cap(21, -4, 25, -50, 12)]
    : kind === "point"
      ? [cap(-14, -14, -14, -84, 13), cap(0, -10, 2, -26, 13), cap(13, -8, 14, -22, 13), cap(25, -4, 26, -18, 12)]
      : [cap(-19, -10, -20, -28, 14), cap(-6, -12, -6, -32, 14), cap(8, -12, 8, -30, 14), cap(21, -8, 21, -24, 13)];
  const thumb = kind === "open" || kind === "flat" ? cap(-24, 22, -52, -4, 14) : kind === "point" ? cap(-24, 14, -42, -2, 13) : cap(-22, 10, 6, -2, 14);
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} strokeLinecap="round" strokeLinejoin="round">
      {[...fingers, thumb].map((f, i) => <path key={`o${i}`} d={f.d} stroke={INK} strokeWidth={f.w + 8} fill="none" />)}
      <rect x="-30" y="-14" width="60" height="62" rx="18" fill={look.skin} stroke={INK} strokeWidth="5" />
      {[...fingers, thumb].map((f, i) => <path key={`f${i}`} d={f.d} stroke={look.skin} strokeWidth={f.w} fill="none" />)}
      <path d="M-14 -4 L-14 16 M0 -6 L0 16 M13 -6 L13 14" stroke={look.skinD} strokeWidth="2.2" opacity="0.7" fill="none" />
      <path d="M-30 30 Q-34 8 -24 -10" stroke={look.skinD} strokeWidth="6" fill="none" opacity="0.4" />
      {kind === "fist" && <path d="M-22 -12 Q-8 -20 6 -12 Q18 -20 26 -8" stroke={INK} strokeWidth="2.6" fill="none" opacity="0.8" />}
    </g>
  );
}

// ---- props --------------------------------------------------------------------------------------------
function Report({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect x="-100" y="-125" width="200" height="250" fill="#d9d3c2" stroke={INK} strokeWidth="5" />
      <path d="M-78 -98 L10 -98 M-78 -80 L52 -80" stroke={INK} strokeWidth="5" opacity="0.8" />
      <path d="M-78 -52 L74 -52 M-78 -38 L60 -38 M-78 -24 L70 -24" stroke={INK} strokeWidth="2.4" opacity="0.5" />
      <path d="M-76 70 L-76 6 M-76 70 L76 70" stroke={INK} strokeWidth="2.4" opacity="0.8" fill="none" />
      {[[-56, 40], [-30, 28], [-4, 50], [22, 62], [48, 30]].map(([bx, bh], i) => (
        <rect key={i} x={bx} y={70 - bh} width="16" height={bh} fill={i === 3 ? "#c9422f" : i === 1 ? "#e8a33d" : "#4a6a8a"} stroke={INK} strokeWidth="2" />
      ))}
      <path d="M-70 30 L-40 20 L-10 40 L20 52 L66 34" stroke={INK} strokeWidth="2.4" fill="none" strokeDasharray="5 4" opacity="0.7" />
    </g>
  );
}
function Tablet({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect x="-92" y="-118" width="184" height="236" rx="14" fill="#0b121e" stroke={INK} strokeWidth="6" />
      <rect x="-80" y="-106" width="160" height="212" rx="6" fill="#1f3a58" />
      <path d="M-66 -86 L20 -86 M-66 -68 L56 -68 M-66 -50 L40 -50" stroke="#9fd0ff" strokeWidth="4" opacity="0.8" />
      <rect x="-66" y="-14" width="132" height="70" fill="#102338" stroke="#4a6a8a" strokeWidth="2" />
      <path d="M-58 44 L-30 20 L0 32 L28 0 L58 10" stroke="#e8a33d" strokeWidth="3.5" fill="none" />
      <path d="M-80 -106 L80 -106 L80 -20 L-80 40 Z" fill="#fff" opacity="0.05" />
    </g>
  );
}
function MapPad({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect x="-86" y="-112" width="172" height="224" fill="#cbbf9c" stroke={INK} strokeWidth="5" />
      <path d="M-86 -20 C-40 -40 -10 10 30 -6 C60 -18 70 20 86 10 L86 112 L-86 112 Z" fill="#4a6a8a" opacity="0.85" />
      <path d="M-70 -90 L-30 -40 L10 -60 L40 -10 L70 -26" stroke="#8a2f22" strokeWidth="5" strokeDasharray="10 7" fill="none" />
      <path d="M-70 60 L-20 40 L30 70 L74 52" stroke={INK} strokeWidth="2.4" fill="none" opacity="0.6" />
      <path d="M-70 -60 L-30 -60 M-70 -44 L-46 -44" stroke={INK} strokeWidth="2.6" opacity="0.5" />
    </g>
  );
}
function Radio({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <path d="M26 -52 L30 -190" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <rect x="-30" y="-60" width="62" height="118" rx="12" fill="#1b212b" stroke={INK} strokeWidth="5" />
      <rect x="-18" y="-44" width="38" height="26" rx="3" fill="#8fd1a0" opacity="0.8" stroke={INK} strokeWidth="2" />
      <path d="M-16 -6 L18 -6 M-16 8 L18 8 M-16 22 L18 22" stroke="#5a6573" strokeWidth="4" />
    </g>
  );
}
function Desk({ y }: { y: number }) {
  return (
    <g>
      <path d={`M-250 ${y} L850 ${y - 18} L850 1100 L-250 1100 Z`} fill="#202733" stroke={INK} strokeWidth="6" />
      <path d={`M-250 ${y} L850 ${y - 18}`} stroke="#6d7e92" strokeWidth="4" opacity="0.8" />
      <path d={`M-250 ${y + 40} L850 ${y + 22}`} stroke={INK} strokeWidth="3" opacity="0.5" />
    </g>
  );
}
function Console({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-30 20 L260 -6 L300 60 L-20 90 Z" fill="#1b212b" stroke={INK} strokeWidth="5" />
      {Array.from({ length: 4 }, (_, i) => <path key={i} d={`M${-14 + i * 4} ${34 + i * 13} L${262 + i * 8} ${6 + i * 15}`} stroke="#4a5666" strokeWidth="5" strokeDasharray="12 5" />)}
      <path d="M-30 20 L-6 -170 L250 -190 L260 -6" fill="#0c1520" stroke={INK} strokeWidth="5" />
      <path d="M-14 6 L4 -150 L238 -168 L246 -14 Z" fill="#17314c" opacity="0.9" />
      <path d="M16 -120 L150 -130 M14 -96 L190 -108 M12 -72 L120 -82" stroke="#9fd0ff" strokeWidth="3.4" opacity="0.8" />
      <path d="M12 -48 L60 -54" stroke="#c9422f" strokeWidth="4" />
    </g>
  );
}
function Pen({ x, y, r }: { x: number; y: number; r: number }) {
  return <g transform={`translate(${x} ${y}) rotate(${r})`}><path d="M0 -10 L0 90" stroke={INK} strokeWidth="14" strokeLinecap="round" /><path d="M0 -6 L0 84" stroke="#4a6a8a" strokeWidth="7" strokeLinecap="round" /></g>;
}

export interface PoseResult {
  /** Drawn before the torso (reaching past it, props held behind). */
  behind?: ReactNode;
  /** Drawn on top of the torso, before the head. */
  front?: ReactNode;
  /** Drawn on top of the head (hands at the face). */
  over?: ReactNode;
  /** How the upper body moves for this pose. */
  lean?: { x: number; y: number; rot: number };
  /** Head offset on top of the lean. */
  head?: { x: number; y: number; rot: number };
}

export function buildPose(pose: PoseId, look: Look, sy: number): PoseResult {
  const w = look.female ? 100 : 112;
  const vest = look.outfit === "hivis_vest";   // a vest leaves the sleeves of the shirt underneath showing
  const arm = (pts: Pt[]) => <Tube pts={pts} w={w} c={vest ? look.under : look.cloth} cD={vest ? "#12161c" : look.clothD} cL={vest ? "#3a4351" : look.clothL} />;
  const F: Pt = [78, sy + 44], N: Pt = [522, sy + 44];
  const idleFar = arm([F, [40, 880], [52, 1100]]);
  const idleNear = arm([N, [560, 880], [548, 1100]]);
  switch (pose) {
    case "idle":
      return { front: <>{idleFar}{idleNear}</> };
    case "crossed":
      return { front: <>{arm([F, [40, 840], [250, 800], [440, 770]])}<Hand x={450} y={766} r={-80} kind="fist" look={look} s={0.95} />{arm([N, [560, 860], [330, 860], [150, 825]])}<Hand x={142} y={820} r={80} kind="fist" look={look} s={0.95} /></> };
    case "point":
      return { front: <>{idleFar}{arm([N, [620, 800], [700, 660]])}<Hand x={716} y={604} r={28} kind="point" look={look} /></>, lean: { x: 10, y: 0, rot: 2 } };
    case "point_map":
      return { front: <>{arm([F, [30, 860], [110, 800], [160, 770]])}<MapPad x={160} y={660} r={-7} /><Hand x={186} y={742} r={-12} kind="fist" look={look} s={0.9} />{arm([N, [570, 850], [470, 770], [340, 700]])}<Hand x={306} y={682} r={-76} kind="point" look={look} s={0.95} /></>, head: { x: 0, y: 6, rot: -4 } };
    case "hold_paper":
      return { front: <>{arm([F, [60, 840], [230, 790]])}{arm([N, [540, 840], [370, 790]])}<Report x={300} y={690} r={-3} /><Hand x={226} y={796} r={80} kind="fist" look={look} s={0.9} /><Hand x={374} y={796} r={-80} kind="fist" look={look} s={0.9} /></>, head: { x: 0, y: 10, rot: 0 } };
    case "hold_tablet":
      return { front: <>{arm([F, [60, 840], [220, 790]])}{arm([N, [540, 840], [380, 790]])}<Tablet x={300} y={700} r={-2} /><Hand x={216} y={796} r={80} kind="fist" look={look} s={0.9} /><Hand x={384} y={796} r={-80} kind="fist" look={look} s={0.9} /></> };
    case "lean_terminal":
      return { behind: <Console x={430} y={740} />, front: <>{idleFar}{arm([N, [590, 780], [690, 800]])}<Hand x={706} y={812} r={105} kind="flat" look={look} s={0.9} /></>, lean: { x: 70, y: 30, rot: 7 }, head: { x: 14, y: 12, rot: 4 } };
    case "stop_palm":
      return { front: <>{idleFar}{arm([N, [610, 780], [650, 590]])}<Hand x={654} y={520} r={4} kind="open" look={look} s={1.1} /></>, lean: { x: 8, y: 0, rot: 1.5 } };
    case "open_palm":
      return { front: <>{idleFar}{arm([N, [600, 820], [690, 760]])}<Hand x={728} y={742} r={72} kind="open" look={look} s={1.05} /></> };
    case "hand_chin":
      return { front: <>{arm([F, [40, 820], [250, 820], [470, 800]])}</>, over: <>{arm([N, [560, 870], [520, 740], [400, 540]])}<Hand x={382} y={520} r={-18} kind="fist" look={look} s={0.95} /></>, head: { x: 0, y: 8, rot: -3 } };
    case "hand_neck":
      return { front: <>{idleFar}</>, over: <>{arm([N, [580, 830], [520, 650], [420, 566]])}<Hand x={404} y={548} r={-72} kind="open" look={look} s={0.9} /></>, head: { x: -6, y: 18, rot: -4 } };
    case "radio":
      return { front: <>{idleFar}</>, over: <>{arm([N, [585, 830], [520, 660], [440, 560]])}<Radio x={410} y={490} r={14} /><Hand x={426} y={548} r={-30} kind="fist" look={look} s={0.95} /></> };
    case "hands_desk":
      return { front: <>{arm([F, [72, 800], [170, 860]])}{arm([N, [528, 800], [430, 860]])}<Desk y={840} /><Hand x={176} y={872} r={95} kind="fist" look={look} s={0.95} /><Hand x={424} y={872} r={-95} kind="fist" look={look} s={0.95} /></>, lean: { x: 0, y: 28, rot: 0 }, head: { x: 0, y: 10, rot: 0 } };
    case "hips":
      return { front: <>{arm([F, [30, 800], [150, 900]])}<Hand x={160} y={920} r={90} kind="fist" look={look} s={0.9} />{arm([N, [570, 800], [450, 900]])}<Hand x={440} y={920} r={-90} kind="fist" look={look} s={0.9} /></> };
    case "hover_pen":
      return { front: <>{arm([F, [60, 820], [210, 830], [250, 810]])}{arm([N, [545, 800], [440, 790], [360, 750]])}<Report x={300} y={880} r={-4} /><Pen x={350} y={800} r={10} /><Hand x={352} y={770} r={-20} kind="fist" look={look} s={0.9} /></>, head: { x: 0, y: 14, rot: 0 } };
  }
}
