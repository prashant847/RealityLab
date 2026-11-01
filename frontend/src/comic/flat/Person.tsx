import type { ReactNode } from "react";
import { hasSprite, spritePose, StickSprite } from "../stick/StickSprite";

// Flat full-body people in the reference style: no outlines, solid fills, small faces (dot eyes, thin brows, a short mouth), a slightly large
// head, simple torso and trousers, round mitten hands and a few darker detail shapes on the clothes. Figure space is 400 x 1000.

export type Expr = "neutral" | "concerned" | "shocked" | "focused" | "tired" | "determined";
export type Pose = "idle" | "at_desk" | "hand_chin" | "arms_down" | "point" | "clipboard" | "arms_crossed";
export type Who = "arjun" | "director" | "worker" | "worker_b" | "worker_c" | "worker_d" | "kavya" | "nisha" | "raghav" | "isha";
export const WHO_NAMES: Record<Who, string> = { arjun: "Arjun Mehta", director: "The Operations Director", worker: "A staff member", worker_b: "A staff member", worker_c: "A staff member", worker_d: "A staff member", kavya: "Kavya Rao", nisha: "Nisha Sen", raghav: "Raghav Verma", isha: "Dr. Isha Kapoor" };

interface Face { brow: [number, number]; lid: number; wide: boolean; gaze: [number, number]; mouth: "line" | "down" | "open" | "tight" | "flat"; tilt: number }
const FACES: Record<Expr, Face> = {
  neutral: { brow: [0, 0], lid: 0.1, wide: false, gaze: [0.3, 0], mouth: "line", tilt: 0 },
  concerned: { brow: [-9, 3], lid: 0.1, wide: false, gaze: [-0.8, 0.5], mouth: "down", tilt: -3 },
  shocked: { brow: [-8, -9], lid: 0, wide: true, gaze: [0, 0], mouth: "open", tilt: 0 },
  focused: { brow: [5, -1], lid: 0.3, wide: false, gaze: [-0.9, 0.6], mouth: "tight", tilt: -3 },
  tired: { brow: [-5, 4], lid: 0.5, wide: false, gaze: [0.1, 0.8], mouth: "flat", tilt: 5 },
  determined: { brow: [7, -2], lid: 0.2, wide: false, gaze: [0.2, 0], mouth: "tight", tilt: 0 },
};

interface Look {
  skin: string; skinDark: string; hair: string; top: string; topDark: string; topLight: string; trousers: string; shoes: string; lip: string;
  style: "quiff" | "short" | "helmet" | "ponytail" | "bob" | "bun" | "grey"; female?: boolean; moustache?: boolean; stubble?: boolean; glasses?: boolean;
}
const LOOKS: Record<Who, Look> = {
  arjun: { skin: "#d19a68", skinDark: "#b4804f", hair: "#1d1e28", top: "#4f86b8", topDark: "#3d6a95", topLight: "#6ea0cf", trousers: "#2b2f4a", shoes: "#14141c", lip: "#7e3a30", style: "quiff", stubble: true, glasses: true },
  director: { skin: "#eab997", skinDark: "#cf9a76", hair: "#b8bdc6", top: "#3c4453", topDark: "#2c333f", topLight: "#566174", trousers: "#2f3643", shoes: "#14141c", lip: "#9a4a40", style: "grey" },
  worker: { skin: "#e3ab82", skinDark: "#c68e66", hair: "#3a2c26", top: "#e88b2c", topDark: "#c26f1b", topLight: "#f5a74c", trousers: "#3a4263", shoes: "#14141c", lip: "#8a4036", style: "helmet" },
  worker_b: { skin: "#8a5a3c", skinDark: "#704630", hair: "#1c1a20", top: "#3f9a8e", topDark: "#2f7a70", topLight: "#8fd6c8", trousers: "#2f3652", shoes: "#14141c", lip: "#6a3030", style: "helmet" },
  worker_c: { skin: "#e8bf9a", skinDark: "#cf9f78", hair: "#6b3f2a", top: "#d9d34a", topDark: "#b0ab30", topLight: "#f0ec7c", trousers: "#454a66", shoes: "#14141c", lip: "#a04a44", style: "short" },
  worker_d: { skin: "#b57a52", skinDark: "#995f3b", hair: "#201a1c", top: "#c4533f", topDark: "#9f3f2f", topLight: "#e8806c", trousers: "#2c3150", shoes: "#14141c", lip: "#7e3a30", style: "ponytail", female: true },
  kavya: { skin: "#c28458", skinDark: "#a76d44", hair: "#17141a", top: "#3a4260", topDark: "#2c3350", topLight: "#d7e04a", trousers: "#2b2f4a", shoes: "#14141c", lip: "#8a3f3a", style: "ponytail", female: true },
  nisha: { skin: "#c98d60", skinDark: "#ae7549", hair: "#1b1418", top: "#33406a", topDark: "#27325a", topLight: "#cfe0f2", trousers: "#262a46", shoes: "#14141c", lip: "#8f3c40", style: "bob", female: true },
  raghav: { skin: "#ab7650", skinDark: "#8f5f3d", hair: "#a9aeb6", top: "#5f6d57", topDark: "#4b5745", topLight: "#e8a33d", trousers: "#2f3342", shoes: "#14141c", lip: "#7a3e34", style: "short", moustache: true },
  isha: { skin: "#c78f66", skinDark: "#ac7650", hair: "#17141a", top: "#e9eef4", topDark: "#c9d3de", topLight: "#3a9aa0", trousers: "#3a9aa0", shoes: "#e9eef4", lip: "#8f3c40", style: "bun", female: true },
};

const Hand = ({ x, y, c }: { x: number; y: number; c: string }) => <circle cx={x} cy={y} r="33" fill={c} />;
const Arm = ({ pts, c }: { pts: string; c: string }) => <polyline points={pts} fill="none" stroke={c} strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" />;

function FaceParts({ f, L, t }: { f: Face; L: Look; t: number }) {
  const ex = [200 - 26 + t, 200 + 26 + t];
  const h = 10 + (f.wide ? 3 : 0), lid = 2 * h * f.lid;
  const thick = L.style === "grey" || L.style === "short";
  const brow = (x: number, side: -1 | 1) => {
    const iy = 92 + f.brow[0], oy = 92 + f.brow[1];
    return <path d={`M${x - side * 15} ${iy} L${x + side * 15} ${oy}`} stroke={thick ? (L.style === "grey" ? "#8f95a0" : "#8a8f98") : L.hair} strokeWidth={thick ? 8 : L.female ? 4.5 : 5.5} strokeLinecap="round" />;
  };
  const mx = 200 + t, my = 150;
  const mouth = f.mouth === "open" ? <ellipse cx={mx} cy={my + 4} rx="9" ry="12" fill="#5a2620" />
    : <path d={f.mouth === "down" ? `M${mx - 15} ${my + 5} Q${mx} ${my - 5} ${mx + 15} ${my + 5}` : f.mouth === "tight" ? `M${mx - 14} ${my} H${mx + 14}` : f.mouth === "flat" ? `M${mx - 13} ${my + 2} Q${mx} ${my} ${mx + 14} ${my + 4}` : `M${mx - 13} ${my - 1} Q${mx} ${my + 6} ${mx + 13} ${my - 1}`} fill="none" stroke={L.lip} strokeWidth="5.5" strokeLinecap="round" />;
  return (
    <g>
      <path d={`M${200 + t} 108 Q${192 + t} 130 ${186 + t} 136 Q${200 + t} 142 ${214 + t} 136`} fill="none" stroke={L.skinDark} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      {ex.map((x, i) => (
        <g key={i}>
          <ellipse cx={x} cy="112" rx={h + 1.5} ry={h} fill="#fbf6ef" />
          <circle cx={x + f.gaze[0] * 5} cy={112 + f.gaze[1] * 3} r={f.wide ? 5.5 : 6.5} fill="#2a1a12" />
          {f.lid > 0.05 && <rect x={x - h - 2} y={112 - h} width={2 * h + 4} height={lid} fill={L.skin} />}
        </g>
      ))}
      {brow(ex[0], -1)}{brow(ex[1], 1)}
      {L.moustache && <path d={`M${mx - 20} ${my - 8} Q${mx} ${my - 18} ${mx + 20} ${my - 8} Q${mx} ${my - 6} ${mx - 20} ${my - 8} Z`} fill={L.hair} />}
      {mouth}
    </g>
  );
}

function Outfit({ who, L }: { who: Who; L: Look }): ReactNode {
  if (who === "arjun") return (
    <g>
      <path d="M170 196 L200 270 L230 196 Z" fill="#eef2f6" />
      <path d="M150 196 L120 250 L176 290 L196 232 Z" fill={L.topDark} /><path d="M250 196 L280 250 L224 290 L204 232 Z" fill={L.topDark} />
      <rect x="236" y="330" width="62" height="58" rx="6" fill={L.topDark} /><rect x="104" y="330" width="62" height="58" rx="6" fill={L.topDark} />
      <path d="M176 200 L190 360 L200 470 M224 200 L210 360 L200 470" stroke="#f2a93b" strokeWidth="9" strokeLinecap="round" fill="none" />
      <rect x="176" y="452" width="48" height="40" rx="6" fill="#f7f9fb" /><rect x="184" y="460" width="14" height="18" fill={L.top} />
      <rect x="196" y="270" width="8" height="290" fill={L.topDark} />
      {[300, 350, 400, 450].map((y) => <circle key={y} cx="200" cy={y} r="5" fill="#eef2f6" />)}
    </g>
  );
  if (who === "director") return (
    <g>
      <path d="M168 192 L200 300 L232 192 Z" fill="#f4f6f9" />
      <path d="M150 192 L126 240 L172 276 L194 210 Z" fill="#dfe4ea" /><path d="M250 192 L274 240 L228 276 L206 210 Z" fill="#cfd6df" />
      <path d="M190 232 H210 L216 262 L200 274 L184 262 Z" fill="#b83a3a" /><path d="M186 272 H214 L226 420 L200 450 L174 420 Z" fill="#b83a3a" /><path d="M200 272 H214 L226 420 L200 450 Z" fill="#8f2c2c" />
      <path d="M150 204 L112 262 L160 330 L196 300 Z" fill={L.topLight} /><path d="M250 204 L288 262 L240 330 L204 300 Z" fill={L.topDark} />
      <rect x="236" y="370" width="52" height="40" rx="5" fill={L.topLight} /><rect x="112" y="370" width="52" height="40" rx="5" fill={L.topDark} />
      <rect x="250" y="336" width="34" height="18" rx="3" fill="#f4f6f9" />
      {[470, 510].map((y) => <circle key={y} cx="200" cy={y} r="6" fill="#aeb6c3" />)}
      <rect x="86" y="430" width="22" height="34" rx="4" fill="#f4f6f9" />
    </g>
  );
  if (who === "kavya") return (
    <g>
      <path d="M170 196 L200 258 L230 196 Z" fill={L.skin} />
      <path d="M132 190 L168 190 L196 560 H132 Z" fill={L.topLight} /><path d="M268 190 L232 190 L204 560 H268 Z" fill={L.topLight} />
      <rect x="132" y="330" width="64" height="18" fill="#e9edf2" /><rect x="204" y="330" width="64" height="18" fill="#e9edf2" /><rect x="132" y="450" width="64" height="18" fill="#e9edf2" /><rect x="204" y="450" width="64" height="18" fill="#e9edf2" />
      <rect x="228" y="380" width="30" height="46" rx="5" fill="#2c3350" />
    </g>
  );
  if (who === "nisha") return (
    <g>
      <path d="M168 192 L200 290 L232 192 Z" fill={L.topLight} />
      <path d="M150 196 L116 262 L172 318 L196 232 Z" fill={L.topDark} /><path d="M250 196 L284 262 L228 318 L204 232 Z" fill={L.top} />
      <circle cx="200" cy="330" r="6" fill="#e8a33d" /><circle cx="200" cy="400" r="6" fill="#e8a33d" />
      <rect x="110" y="410" width="54" height="40" rx="5" fill={L.topDark} /><rect x="236" y="410" width="54" height="40" rx="5" fill={L.topDark} />
    </g>
  );
  if (who === "raghav") return (
    <g>
      <path d="M168 192 L200 270 L232 192 Z" fill="#d9dee5" />
      <path d="M150 196 L118 258 L174 304 L196 232 Z" fill={L.topDark} /><path d="M250 196 L282 258 L226 304 L204 232 Z" fill={L.topDark} />
      <rect x="112" y="330" width="60" height="52" rx="6" fill={L.topDark} /><rect x="228" y="330" width="60" height="52" rx="6" fill={L.topDark} />
      <rect x="72" y="470" width="256" height="26" fill={L.topLight} /><path d="M200 270 V560" stroke={L.topDark} strokeWidth="7" />
    </g>
  );
  if (who === "isha") return (
    <g>
      <path d="M170 192 L200 262 L230 192 Z" fill="#3a9aa0" />
      <path d="M150 192 L118 270 L170 330 L194 230 Z" fill={L.topDark} /><path d="M250 192 L282 270 L230 330 L206 230 Z" fill={L.topDark} />
      <path d="M172 200 C160 300 190 380 220 340" stroke="#2c3a46" strokeWidth="10" fill="none" strokeLinecap="round" /><circle cx="222" cy="342" r="15" fill="#aab4c0" />
      <rect x="236" y="400" width="52" height="44" rx="5" fill={L.topDark} /><rect x="244" y="410" width="22" height="10" fill="#3a9aa0" />
    </g>
  );
  return (
    <g>
      <path d="M170 196 L200 258 L230 196 Z" fill={L.skin} />
      <rect x="132" y="196" width="26" height="364" fill={L.topLight} /><rect x="242" y="196" width="26" height="364" fill={L.topLight} />
      <rect x="132" y="470" width="136" height="20" fill="#f1f3f6" /><rect x="132" y="300" width="136" height="20" fill="#f1f3f6" />
    </g>
  );
}

/** Hair that hangs behind the head and shoulders (drawn before the face). */
function HairBack({ L }: { L: Look }): ReactNode {
  switch (L.style) {
    case "bob": return <path d="M128 112 C122 40 278 40 272 112 L270 156 Q200 172 130 156 Z" fill={L.hair} />;
    case "ponytail": return <g><path d="M258 66 C306 52 332 104 314 168 C308 204 322 232 298 262 C288 222 292 190 280 150 C274 118 264 96 252 84 Z" fill={L.hair} /><rect x="250" y="62" width="22" height="16" rx="6" fill={L.topLight} transform="rotate(-24 261 70)" /></g>;
    default: return null;
  }
}

/** Darker strands drawn inside the hair mass, so it reads as hair with direction instead of one flat cap. Black at low opacity: it darkens, never shines. */
const Strands = ({ d, o = 0.16 }: { d: string[]; o?: number }) => <g fill="none" stroke="#000" strokeOpacity={o} strokeWidth="5" strokeLinecap="round">{d.map((x, i) => <path key={i} d={x} />)}</g>;

function Hair({ L }: { L: Look; who?: Who }): ReactNode {
  const c = L.hair;
  switch (L.style) {
    // Every cap has tapered sideburns, a hairline that is not a clean arc, and a visible part or sweep.
    case "short": return (
      <g>
        <path d="M133 126 C116 62 148 24 202 24 C256 24 288 62 267 126 L260 140 L254 108 C250 92 238 80 220 80 C206 80 196 70 184 74 C168 80 156 86 150 104 L146 140 Z" fill={c} />
        <Strands d={["M176 34 C164 52 160 70 158 90", "M206 30 C198 50 196 62 190 74", "M238 40 C242 58 246 72 248 90"]} />
      </g>
    );
    case "grey": return (
      <g>
        <path d="M130 128 C112 58 150 20 206 20 C262 20 290 60 270 128 L262 142 L256 106 C250 88 236 76 214 74 C196 72 182 62 168 68 C156 76 150 92 148 110 L144 142 Z" fill={c} />
        <Strands d={["M170 66 C190 40 222 34 254 52", "M176 76 C200 52 238 50 260 72", "M152 90 C156 70 166 56 182 46"]} o={0.13} />
      </g>
    );
    case "quiff": return (
      <g>
        <path d="M132 128 C112 56 140 6 206 8 C272 10 296 58 268 128 L262 138 L256 104 C252 86 240 72 220 68 C204 64 188 54 170 62 C152 70 146 90 146 114 L144 138 Z" fill={c} />
        <Strands d={["M168 34 C190 18 232 20 258 46", "M160 52 C186 36 222 38 248 62", "M150 80 C154 66 160 56 172 48"]} o={0.22} />
      </g>
    );
    case "helmet": return <g><path d="M128 108 C122 48 168 14 214 18 C262 22 282 58 272 108 L128 108 Z" fill="#f5b83c" /><rect x="116" y="100" width="168" height="16" rx="8" fill="#d99a22" /><path d="M200 20 V100" stroke="#d99a22" strokeWidth="8" /></g>;
    case "ponytail": return (
      <g>
        <path d="M128 126 C110 56 146 16 206 16 C266 16 292 58 272 126 L266 136 L258 104 C250 84 232 66 206 64 C180 64 156 78 148 104 L146 136 Z" fill={c} />
        <Strands d={["M206 22 C196 36 190 50 186 64", "M238 26 C232 40 226 54 222 66", "M172 32 C168 46 164 58 160 74"]} o={0.2} />
      </g>
    );
    case "bob": return (
      <g>
        <path d="M120 142 C104 54 146 12 204 12 C264 12 298 54 282 142 L280 192 L262 192 C262 160 260 128 254 102 C242 74 216 60 192 62 C168 66 152 86 146 110 C142 134 138 166 138 192 L120 192 Z" fill={c} />
        <Strands d={["M206 18 C190 38 172 58 160 88", "M236 24 C230 40 218 54 206 66", "M270 70 C274 110 272 150 270 186", "M128 74 C124 110 126 150 128 186"]} o={0.2} />
      </g>
    );
    case "bun": return (
      <g>
        <circle cx="200" cy="16" r="28" fill={c} /><Strands d={["M186 8 C196 4 206 8 214 16"]} o={0.25} /><rect x="176" y="34" width="48" height="10" rx="5" fill={L.topLight} />
        <path d="M128 126 C110 56 146 22 206 22 C266 22 292 58 272 126 L266 136 L258 106 C250 86 232 68 206 66 C180 66 156 80 148 106 L146 136 Z" fill={c} />
        <Strands d={["M206 28 C196 42 190 54 186 68", "M236 32 C230 44 226 56 222 70", "M170 38 C166 50 162 62 160 76"]} o={0.2} />
      </g>
    );
  }
  return null;
}

export const personLabel = (who: Who, expression: Expr) => `${WHO_NAMES[who]}, ${expression}`;

/** One person, full body, in a pose and expression; fills a 400 x 1000 figure space. */
export function FlatPerson({ who, expression = "neutral", pose = "idle", label, bust = false }: { who: Who; expression?: Expr; pose?: Pose; label?: string; bust?: boolean }) {
  const key: string = who;   // (a plain string, so the vector figure below stays typed as a fallback)
  if (hasSprite(key)) return <StickSprite who={key} pose={spritePose(expression, pose)} bust={bust} meta={{ pose, expression }} label={label ?? personLabel(who, expression)} />;
  const L = LOOKS[who], f = FACES[expression];
  const turn = pose === "at_desk" ? -16 : 0;
  const lean = pose === "at_desk" ? -5 : 0;
  const idle: [string, [number, number], string, [number, number]] = ["92,244 86,400 96,520", [96, 548], "308,244 314,400 304,520", [304, 548]];
  const arms: Record<Pose, [string, [number, number], string, [number, number]]> = {
    idle, arms_down: idle,
    at_desk: ["92,244 66,380 124,486", [132, 506], "308,244 336,382 262,484", [252, 504]],
    hand_chin: ["92,244 100,390 258,410", [270, 412], "308,244 338,392 250,300 236,196", [234, 184]],
    point: ["92,244 86,400 96,520", [96, 548], "308,244 360,300 372,170", [376, 130]],
    clipboard: ["92,244 120,380 214,420", [226, 424], "308,244 330,400 236,444", [226, 448]],
    arms_crossed: ["92,244 110,400 262,420", [276, 422], "308,244 292,400 138,430", [124, 432]],
  };
  const [la, lh, ra, rh] = arms[pose];
  const neckPad = L.female ? 8 : 0;
  return (
    <svg viewBox={bust ? "46 -30 308 372" : "0 0 400 1000"} role="img" aria-label={label ?? personLabel(who, expression)} data-who={who} data-pose={pose} data-expression={expression}>
      <g transform={`rotate(${lean} 200 560)`}>
        <path d="M108 556 H196 L188 930 H118 Z" fill={L.trousers} /><path d="M204 556 H292 L282 930 H212 Z" fill={L.trousers} />
        <ellipse cx="146" cy="952" rx="54" ry="22" fill={L.shoes} /><ellipse cx="256" cy="952" rx="54" ry="22" fill={L.shoes} />
        <path d="M70 236 Q70 206 104 198 L150 184 H250 L296 198 Q330 206 330 236 L318 566 H82 Z" fill={L.top} />
        <path d="M250 184 L296 198 Q330 206 330 236 L318 566 H262 Q290 420 250 184 Z" fill={L.topDark} />
        <Outfit who={who} L={L} />
        <Arm pts={la} c={L.top} /><Hand x={lh[0]} y={lh[1]} c={L.skin} />
        <Arm pts={ra} c={L.top} /><Hand x={rh[0]} y={rh[1]} c={L.skin} />
        {pose === "clipboard" && <g><rect x="196" y="392" width="84" height="104" rx="8" fill="#e9edf5" /><rect x="224" y="384" width="28" height="14" rx="4" fill="#59639c" /><rect x="208" y="420" width="56" height="6" fill="#9aa4c8" /><rect x="208" y="438" width="44" height="6" fill="#9aa4c8" /></g>}
        <g transform={`rotate(${f.tilt} 200 190)`}>
          <rect x="172" y="150" width="56" height="60" rx="14" fill={L.skin} />
          <rect x="172" y="150" width="56" height="26" fill={L.skinDark} />
          <HairBack L={L} />
          <ellipse cx={136 + turn * 0.5} cy="122" rx="11" ry="17" fill={L.skin} /><ellipse cx={264 + turn * 0.5} cy="122" rx="11" ry="17" fill={L.skinDark} />
          <ellipse cx="200" cy="112" rx={L.female ? 60 : 64} ry={L.female ? 72 : 74} fill={L.skin} />
          {L.stubble && <path d="M140 138 C146 168 170 184 200 184 C230 184 254 168 260 138 C254 152 240 158 226 160 C214 156 186 156 174 160 C160 158 146 152 140 138 Z" fill={L.hair} />}
          <FaceParts f={f} L={L} t={turn} />
          {L.glasses && <g fill="none" stroke="#1d1d24" strokeWidth="5"><circle cx={174 + turn * 0.9} cy="112" r="22" /><circle cx={226 + turn * 0.9} cy="112" r="22" /><path d={`M${196 + turn * 0.9} 110 Q${200 + turn * 0.9} 104 ${204 + turn * 0.9} 110`} /></g>}
          <Hair L={L} />
        </g>
        {void neckPad}
      </g>
    </svg>
  );
}
