import { createContext, useContext, type ReactNode } from "react";

/** When a generated or hand-made picture exists for a page, it is set here and replaces the drawn art; bubbles and captions stay as live text on top. */
export const ArtContext = createContext<string | null>(null);

/**
 * A small kit for drawing stickman comic pages: round white heads, thick black ink, flat saturated colour with halftone dots, speech bubbles in a
 * tinted strip above the picture, a yellow caption box below it, and big red sound effects. Everything is SVG, drawn here, and works offline.
 */
export const INK = "#16120f";
export const FONT = '"Comic Sans MS", "Comic Neue", "Chalkboard SE", "Segoe Print", cursive';
const SFX_FONT = 'Impact, "Arial Black", "Segoe UI Black", sans-serif';

/** Patterns used by every page: halftone dots for shading and fine hatching for shadow. */
export function Defs() {
  return (
    <defs>
      <pattern id="ck-dots" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="4.5" cy="4.5" r="1.9" fill={INK} /></pattern>
      <pattern id="ck-dots-s" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3" cy="3" r="1.2" fill={INK} /></pattern>
      <pattern id="ck-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="9" stroke={INK} strokeWidth="1.6" /></pattern>
    </defs>
  );
}

export type Mouth = "open" | "smile" | "worried" | "shout" | "flat" | "o" | "grit";
export type Pose = "stand" | "point" | "hands-up" | "clipboard" | "shrug" | "hold" | "sit" | "lean" | "wave";

/** Arm and leg joints for each pose, relative to the hip at (0,0). The neck is at (0,-118). */
const POSES: Record<Pose, { l: [number, number][]; r: [number, number][]; legs: [number, number][][] }> = {
  stand:     { l: [[-30, -86], [-44, -40]], r: [[30, -86], [44, -40]], legs: [[[-16, 60], [-24, 120]], [[16, 60], [24, 120]]] },
  point:     { l: [[-30, -86], [-44, -40]], r: [[44, -120], [104, -128]], legs: [[[-16, 60], [-24, 120]], [[16, 60], [24, 120]]] },
  "hands-up":{ l: [[-48, -130], [-58, -182]], r: [[48, -130], [58, -182]], legs: [[[-18, 60], [-30, 120]], [[18, 60], [30, 120]]] },
  clipboard: { l: [[-26, -80], [6, -92]], r: [[26, -80], [14, -100]], legs: [[[-16, 60], [-24, 120]], [[16, 60], [24, 120]]] },
  shrug:     { l: [[-40, -100], [-62, -108]], r: [[40, -100], [62, -108]], legs: [[[-16, 60], [-24, 120]], [[16, 60], [24, 120]]] },
  hold:      { l: [[-28, -84], [-8, -64]], r: [[28, -84], [8, -64]], legs: [[[-16, 60], [-24, 120]], [[16, 60], [24, 120]]] },
  sit:       { l: [[-30, -84], [-40, -44]], r: [[30, -84], [44, -50]], legs: [[[46, 6], [52, 70]], [[84, 6], [90, 70]]] },
  lean:      { l: [[-30, -86], [-44, -40]], r: [[30, -86], [44, -40]], legs: [[[-18, 60], [-34, 118]], [[18, 60], [34, 122]]] },
  wave:      { l: [[-30, -86], [-44, -40]], r: [[44, -126], [64, -178]], legs: [[[-16, 60], [-24, 120]], [[16, 60], [24, 120]]] },
};

export type Outfit = "none" | "scrubs" | "nurse" | "coat" | "gown" | "hoodie" | "tee" | "vest" | "jacket";
export type Hat = "none" | "scrub-cap" | "nurse-cap" | "grey-hair" | "mask-only" | "beanie" | "cap" | "hard-hat";

const line = (pts: [number, number][], w = 7) => <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={INK} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;

function Face({ mouth, look = 0, sweat = false, mask = false }: { mouth: Mouth; look?: number; sweat?: boolean; mask?: boolean }) {
  const eyes = mouth === "worried" || mouth === "shout" ? 4.6 : 3.8;
  return (
    <g>
      <ellipse cx={-14 + look} cy={-6} rx={eyes} ry={eyes + 1.4} fill={INK} /><ellipse cx={14 + look} cy={-6} rx={eyes} ry={eyes + 1.4} fill={INK} />
      {mouth === "worried" && <><path d="M-24 -22 L-6 -17M24 -22 L6 -17" stroke={INK} strokeWidth="4" strokeLinecap="round" /></>}
      {mouth === "grit" && <path d="M-26 -17 L-6 -12M26 -17 L6 -12" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />}
      {!mask && mouth === "open" && <><path d="M-17 14 Q0 36 17 14 Q0 8 -17 14Z" fill={INK} /><path d="M-9 22 Q0 29 9 22 Q0 19 -9 22Z" fill="#f0788c" /></>}
      {!mask && mouth === "shout" && <><ellipse cx="0" cy="24" rx="15" ry="14" fill={INK} /><ellipse cx="0" cy="30" rx="9" ry="6" fill="#f0788c" /></>}
      {!mask && mouth === "smile" && <path d="M-16 14 Q0 30 16 14" fill="none" stroke={INK} strokeWidth="4.2" strokeLinecap="round" />}
      {!mask && mouth === "worried" && <path d="M-14 26 Q0 14 14 26" fill="none" stroke={INK} strokeWidth="4.2" strokeLinecap="round" />}
      {!mask && mouth === "flat" && <path d="M-12 20 L12 20" stroke={INK} strokeWidth="4.2" strokeLinecap="round" />}
      {!mask && mouth === "o" && <ellipse cx="0" cy="22" rx="6" ry="8" fill={INK} />}
      {!mask && mouth === "grit" && <><rect x="-15" y="14" width="30" height="13" rx="3" fill="#fff" stroke={INK} strokeWidth="3.4" /><path d="M-5 14V27M5 14V27" stroke={INK} strokeWidth="2.4" /></>}
      {mask && <><path d="M-26 8 Q0 -2 26 8 L22 34 Q0 44 -22 34Z" fill="#cfe9f5" stroke={INK} strokeWidth="3.6" strokeLinejoin="round" /><path d="M-18 16 H18M-18 24 H18" stroke="#8cb8d0" strokeWidth="2.4" /></>}
      {sweat && <path d="M42 -34 Q50 -18 42 -12 Q34 -18 42 -34Z" fill="#7fd0ff" stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />}
    </g>
  );
}

/** One stickman. (x, y) is the hip; the figure stands about 290 units tall at scale 1. */
export function Stick({ x, y, s = 1, flip = false, pose = "stand", mouth = "flat", look = 0, outfit = "none", hat = "none", sweat = false, mask = false, tilt = 0, color = "#fff", shirtColor, extra }: {
  x: number; y: number; s?: number; flip?: boolean; pose?: Pose; mouth?: Mouth; look?: number; outfit?: Outfit; hat?: Hat; sweat?: boolean; mask?: boolean; tilt?: number; color?: string; shirtColor?: string; extra?: ReactNode;
}) {
  const P = POSES[pose];
  const shirt = shirtColor ?? (outfit === "scrubs" ? "#2bb3a3" : outfit === "nurse" ? "#5aa7e0" : outfit === "coat" ? "#f4f4f0" : outfit === "gown" ? "#bcd8ea" : outfit === "hoodie" ? "#f5c518" : outfit === "vest" ? "#f2e03a" : outfit === "jacket" ? "#8a5a3c" : outfit === "tee" ? "#d96a5a" : null);
  const lower = outfit === "coat" ? 96 : outfit === "gown" ? 70 : 8;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      {pose === "sit" ? null : null}
      {/* legs, torso, arms: thick black stick lines */}
      {P.legs.map((leg, i) => <g key={i}>{line([[0, 0], ...leg], 8)}<ellipse cx={leg[1][0] + (leg[1][0] < 0 ? -8 : 8)} cy={leg[1][1] + 3} rx="15" ry="6.5" fill={INK} /></g>)}
      <g transform={`rotate(${tilt} 0 -118)`}>
        {line([[0, 0], [0, -118]], 8)}
        {line([[0, -108], ...P.l], 7)}{line([[0, -108], ...P.r], 7)}
        <circle cx={P.l[1][0]} cy={P.l[1][1]} r="7.5" fill="#fff" stroke={INK} strokeWidth="4" /><circle cx={P.r[1][0]} cy={P.r[1][1]} r="7.5" fill="#fff" stroke={INK} strokeWidth="4" />
        {shirt && (
          <g>
            <path d={`M-30 -112 Q0 -126 30 -112 L26 ${lower - 10} Q0 ${lower} -26 ${lower - 10}Z`} fill={shirt} stroke={INK} strokeWidth="4.6" strokeLinejoin="round" />
            <path d={`M-30 -112 Q0 -126 30 -112 L26 ${lower - 10} Q0 ${lower} -26 ${lower - 10}Z`} fill="url(#ck-dots-s)" opacity="0.22" />
            {outfit === "scrubs" && <path d="M-12 -116 Q0 -62 12 -116" fill="none" stroke={INK} strokeWidth="3.6" />}
            {outfit === "scrubs" && <circle cx="10" cy="-66" r="7" fill="#ccc" stroke={INK} strokeWidth="3" />}
            {outfit === "nurse" && <path d="M-26 -60 H26 L24 -10 H-24Z" fill="#fff" stroke={INK} strokeWidth="3.4" strokeLinejoin="round" />}
            {outfit === "coat" && <path d="M0 -118 V90M-8 -112 L0 -84 L8 -112" fill="none" stroke={INK} strokeWidth="3.4" />}
            {outfit === "hoodie" && <path d="M-24 -114 Q0 -90 24 -114" fill="none" stroke={INK} strokeWidth="3.6" />}
            {outfit === "vest" && <path d={`M-26 -80H26M-26 -50H26`} stroke="#e8e8e8" strokeWidth="7" />}
          </g>)}
        {/* the round white head */}
        <g transform="translate(0 -170)">
          <circle r="49" fill={color} stroke={INK} strokeWidth="6" />
          <path d="M-36 20 Q-14 46 26 40" fill="none" stroke={INK} strokeWidth="2" opacity="0" />
          {hat === "scrub-cap" && <path d="M-47 -8 Q-44 -58 0 -56 Q44 -58 47 -8 Q0 -26 -47 -8Z" fill="#2bb3a3" stroke={INK} strokeWidth="4.6" strokeLinejoin="round" />}
          {hat === "nurse-cap" && <g><path d="M-30 -36 L-24 -66 L24 -66 L30 -36Z" fill="#fff" stroke={INK} strokeWidth="4.2" strokeLinejoin="round" /><path d="M-5 -62V-42M-12 -52H2" stroke="#e53935" strokeWidth="5" /></g>}
          {hat === "beanie" && <g><path d="M-47 -10 Q-46 -62 0 -60 Q46 -62 47 -10 Q0 -28 -47 -10Z" fill="#7b4fc4" stroke={INK} strokeWidth="4.6" strokeLinejoin="round" /><circle cx="0" cy="-62" r="9" fill="#7b4fc4" stroke={INK} strokeWidth="3.6" /></g>}
          {hat === "cap" && <g><path d="M-46 -8 Q-44 -54 0 -52 Q44 -54 46 -8 Q0 -22 -46 -8Z" fill="#d8402f" stroke={INK} strokeWidth="4.6" strokeLinejoin="round" /><path d="M-6 -16 Q40 -10 62 -18 Q50 -2 -6 -6Z" fill="#b8301f" stroke={INK} strokeWidth="3.6" strokeLinejoin="round" /></g>}
          {hat === "hard-hat" && <g><path d="M-48 -6 Q-46 -62 0 -62 Q46 -62 48 -6Z" fill="#f2b21a" stroke={INK} strokeWidth="4.6" strokeLinejoin="round" /><rect x="-54" y="-8" width="108" height="9" rx="4" fill="#f2b21a" stroke={INK} strokeWidth="3.6" /></g>}
          {hat === "grey-hair" && <><path d="M-48 -4 Q-52 -40 -34 -38 Q-40 -10 -44 8Z" fill="#cfd2d6" stroke={INK} strokeWidth="3.4" /><path d="M48 -4 Q52 -40 34 -38 Q40 -10 44 8Z" fill="#cfd2d6" stroke={INK} strokeWidth="3.4" /><path d="M-26 -44 Q0 -62 26 -44" fill="none" stroke={INK} strokeWidth="3.4" /></>}
          <Face mouth={mouth} look={look} sweat={sweat} mask={mask} />
          {outfit === "coat" && <g fill="none" stroke={INK} strokeWidth="3.6"><circle cx="-14" cy="-6" r="12" /><circle cx="14" cy="-6" r="12" /><path d="M-2 -8 H2" /></g>}
        </g>
        {extra}
      </g>
    </g>
  );
}

/** A speech bubble in the tinted strip above the picture. `tail` is where the point of its tail lands, in page coordinates. */
export function Bubble({ x, y, w, lines, tail }: { x: number; y: number; w: number; lines: string[]; tail: [number, number] }) {
  const h = 34 + lines.length * 34;
  const cx = x + w / 2, cy = y + h / 2;
  const base = Math.max(x + 60, Math.min(x + w - 60, tail[0]));
  return (
    <g fontFamily={FONT} fontWeight="700">
      <path d={`M${base - 20} ${cy + h / 2 - 8} L${tail[0]} ${tail[1]} L${base + 14} ${cy + h / 2 - 10}Z`} fill="#fff" stroke={INK} strokeWidth="4.4" strokeLinejoin="round" />
      <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} fill="#fff" stroke={INK} strokeWidth="4.4" />
      <path d={`M${base - 18} ${cy + h / 2 - 7} L${base + 12} ${cy + h / 2 - 9}`} stroke="#fff" strokeWidth="9" />
      {lines.map((t, i) => <text key={i} x={cx} y={cy - ((lines.length - 1) * 34) / 2 + i * 34 + 9} textAnchor="middle" fontSize="27" fill={INK}>{t}</text>)}
    </g>
  );
}

/** The yellow caption box at the bottom-left of the picture. */
export function Caption({ lines, w = 840 }: { lines: string[]; w?: number }) {
  const h = 26 + lines.length * 33;
  return (
    <g fontFamily={FONT} fontWeight="700">
      <rect x="31" y={715 - h + 5} width={w} height={h} fill={INK} /><rect x="24" y={715 - h - 2} width={w} height={h} fill="#fbe04d" stroke={INK} strokeWidth="4" />
      {lines.map((t, i) => <text key={i} x="40" y={715 - h + 32 + i * 33} fontSize="25" fill={INK}>{t}</text>)}
    </g>
  );
}

/** A big, slanted, red sound effect with a black outline. */
export function Sfx({ x, y, text, size = 96, rotate = -6, fill = "#ff4a2a" }: { x: number; y: number; text: string; size?: number; rotate?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) skewX(-8)`}>
      <text fontFamily={SFX_FONT} fontSize={size} fill={INK} stroke={INK} strokeWidth="16" strokeLinejoin="round" transform="translate(7 7)" letterSpacing="2">{text}</text>
      <text fontFamily={SFX_FONT} fontSize={size} fill={fill} stroke={INK} strokeWidth="9" strokeLinejoin="round" paintOrder="stroke" letterSpacing="2">{text}</text>
    </g>
  );
}

/** The setting of a page. A finished picture, if there is one, replaces it; the characters, signs and text drawn after it stay on top. */
export function Backdrop({ children }: { children: ReactNode }) {
  const art = useContext(ArtContext);
  return art ? <image href={art} x="24" y="176" width="1232" height="520" preserveAspectRatio="xMidYMid slice" /> : <g>{children}</g>;
}

/** A page: tinted strip with bubbles on top, the picture inside a black frame, then the caption. Pages are 1280 by 720, like a video frame. */
export function Page({ tint, bubbles, caption, captionWidth, children }: { tint: string; bubbles: ReactNode; caption?: string[]; captionWidth?: number; children: ReactNode }) {
  return (
    <svg viewBox="0 0 1280 720" className="ck-page" role="img" preserveAspectRatio="xMidYMid meet">
      <Defs />
      <rect width="1280" height="720" fill="#f3ead2" />
      <rect x="24" y="22" width="1232" height="146" fill={tint} stroke={INK} strokeWidth="6" />
      <rect x="24" y="22" width="1232" height="146" fill="url(#ck-dots-s)" opacity="0.07" />
      <svg x="24" y="176" width="1232" height="520" viewBox="24 176 1232 520" overflow="hidden"><g>{children}</g></svg>
      <rect x="24" y="176" width="1232" height="520" fill="none" stroke={INK} strokeWidth="6" />
      {bubbles}
      {caption && <Caption lines={caption} w={captionWidth} />}
    </svg>
  );
}

/** Small things that tell the story at a glance. */
export const Cough = ({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`} stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none"><path d="M0 0 L24 -10M2 16 L30 14M0 32 L24 42" /></g>
);
export const Clock = ({ x, y, r = 40, h = 7, m = 30 }: { x: number; y: number; r?: number; h?: number; m?: number }) => {
  const a = (v: number, len: number, d: number) => [x + len * Math.sin((v * Math.PI) / d), y - len * Math.cos((v * Math.PI) / d)] as const;
  const hh = a((h % 12) + m / 60, r * 0.5, 6), mm = a(m, r * 0.78, 30);
  return (<g><circle cx={x} cy={y} r={r} fill="#fff" stroke={INK} strokeWidth="5" /><path d={`M${x} ${y}L${hh[0]} ${hh[1]}`} stroke={INK} strokeWidth="5" strokeLinecap="round" /><path d={`M${x} ${y}L${mm[0]} ${mm[1]}`} stroke={INK} strokeWidth="3.4" strokeLinecap="round" /><circle cx={x} cy={y} r="4" fill={INK} /></g>);
};
