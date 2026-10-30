import type { ReactNode } from "react";

// STAGE 3 PREVIEW. Not used by the game yet.
// Flat 2D vector people for the NotPetya story: one consistent dark outline, solid fills, one shade shape per garment, no gradients.
// Faces are drawn large enough to read at panel size: white eyes with a pupil, shaped brows, a nose line and a mouth per expression.
// Figure space is 400 x 1000 (feet near y=960). Bust crop shows head and shoulders.

export const INK = "#1d1c2b";
const SW = 4;

export type Role = "it_lead" | "terminal_sup" | "net_admin" | "ops_manager" | "recovery_lead" | "customer_rep";
export type Mood = "concern" | "shock" | "suspicion" | "frustration" | "concentration" | "confusion" | "determination" | "relief";
export type Pose = "idle" | "point" | "clipboard" | "hand_chin" | "arms_crossed" | "phone";
type StaffKey = "staff_a" | "staff_b" | "staff_c" | "staff_d";
export type Key = Role | StaffKey;
type Outfit = "it_lead" | "vest" | "cardigan" | "blazer" | "shirt" | "rep";

export const ROLE_TITLES: Record<Role, string> = {
  it_lead: "IT Lead", terminal_sup: "Terminal Supervisor", net_admin: "Network Administrator",
  ops_manager: "Operations Manager", recovery_lead: "Recovery Team Lead", customer_rep: "Customer Representative",
};
export type Expr = Mood | "neutral" | "tired";
export const MOODS: Mood[] = ["concern", "shock", "suspicion", "frustration", "concentration", "confusion", "determination", "relief"];

interface Look {
  skin: string; shade: string; hair: string; top: string; topShade: string; trousers: string; shoes: string;
  outfit: Outfit; hairStyle: "side" | "hat" | "ponytail" | "bob" | "receding" | "bun"; female?: boolean; glasses?: boolean; stubble?: boolean; moustache?: boolean; brow: string;
}
const LOOKS: Record<Key, Look> = {
  it_lead: { outfit: "it_lead", skin: "#c68a5b", shade: "#a9703f", hair: "#22202c", brow: "#22202c", top: "#4b7fb4", topShade: "#3a6592", trousers: "#2d3350", shoes: "#2a2a36", hairStyle: "side", glasses: true, stubble: true },
  terminal_sup: { outfit: "vest", skin: "#d9a77c", shade: "#bb8758", hair: "#8e939c", brow: "#8e939c", top: "#27304a", topShade: "#1d243a", trousers: "#2c3248", shoes: "#2a2a36", hairStyle: "hat", moustache: true },
  net_admin: { outfit: "cardigan", skin: "#8a5a3c", shade: "#6f452c", hair: "#1b1a22", brow: "#1b1a22", top: "#3f8f86", topShade: "#2f726a", trousers: "#2c3146", shoes: "#2a2a36", hairStyle: "ponytail", female: true },
  ops_manager: { outfit: "blazer", skin: "#c98d60", shade: "#ac7247", hair: "#3a2820", brow: "#3a2820", top: "#454e66", topShade: "#343c52", trousers: "#2a2e44", shoes: "#2a2a36", hairStyle: "bob", female: true },
  recovery_lead: { outfit: "shirt", skin: "#eab997", shade: "#cf9a76", hair: "#6b4a34", brow: "#6b4a34", top: "#b9c1cd", topShade: "#98a2b1", trousers: "#3a4056", shoes: "#2a2a36", hairStyle: "receding", stubble: true },
  customer_rep: { outfit: "rep", skin: "#b57a52", shade: "#98603a", hair: "#241a1e", brow: "#241a1e", top: "#9a3f4d", topShade: "#7c2f3c", trousers: "#2b2f45", shoes: "#2a2a36", hairStyle: "bun", female: true },
  staff_a: { outfit: "vest", skin: "#e3ab82", shade: "#c68e66", hair: "#3a2c26", brow: "#3a2c26", top: "#2a3a5a", topShade: "#202d48", trousers: "#2c3248", shoes: "#2a2a36", hairStyle: "hat" },
  staff_b: { outfit: "cardigan", skin: "#a8683f", shade: "#8c522e", hair: "#1c1a20", brow: "#1c1a20", top: "#6a4f8f", topShade: "#523b72", trousers: "#2c3146", shoes: "#2a2a36", hairStyle: "side" },
  staff_c: { outfit: "shirt", skin: "#e8bf9a", shade: "#cf9f78", hair: "#7a5a3c", brow: "#7a5a3c", top: "#7aa2c8", topShade: "#5f86ab", trousers: "#3a4056", shoes: "#2a2a36", hairStyle: "receding" },
  staff_d: { outfit: "blazer", skin: "#b57a52", shade: "#98603a", hair: "#201a1c", brow: "#201a1c", top: "#5a6f4f", topShade: "#445639", trousers: "#2b2f45", shoes: "#2a2a36", hairStyle: "ponytail", female: true },
};

// Brow offsets (y, negative = up): left inner, left outer, right inner, right outer.
const BROWS: Record<Expr, [number, number, number, number]> = {
  neutral: [0, 0, 0, 0], tired: [-5, 4, -5, 4], concern: [-9, 3, -9, 3], shock: [-15, -12, -15, -12], suspicion: [4, 1, -9, -7], frustration: [10, -4, 10, -4],
  concentration: [4, 2, 4, 2], confusion: [-11, -13, 5, 2], determination: [7, 0, 7, 0], relief: [-4, 0, -4, 0],
};
interface EyeSpec { open: number; look: [number, number]; closed?: boolean; lid?: number }
const EYES: Record<Expr, EyeSpec> = {
  neutral: { open: 1, look: [0.3, 0] }, tired: { open: 0.7, look: [0.2, 1.4], lid: 0.45 }, concern: { open: 1, look: [-1, 1] }, shock: { open: 1.25, look: [0, 0] }, suspicion: { open: 0.7, look: [1.6, 0], lid: 0.35 },
  frustration: { open: 0.8, look: [0, 0.4], lid: 0.2 }, concentration: { open: 0.8, look: [-0.4, 1.3], lid: 0.25 }, confusion: { open: 1, look: [1, -0.6] },
  determination: { open: 0.9, look: [0.4, 0], lid: 0.15 }, relief: { open: 0.4, look: [0, 0], closed: true },
};

function Mouth({ mood, lip }: { mood: Expr; lip: string }) {
  const line = { fill: "none", stroke: INK, strokeWidth: 4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (mood) {
    case "neutral": return <path d="M187 153 Q200 158 213 153" {...line} />;
    case "tired": return <path d="M186 156 Q200 152 214 157" {...line} />;
    case "concern": return <path d="M186 158 Q200 146 214 158" {...line} />;
    case "shock": return <ellipse cx="200" cy="156" rx="11" ry="15" fill="#5a2620" stroke={INK} strokeWidth="3" />;
    case "suspicion": return <path d="M186 156 L204 155 Q212 154 216 148" {...line} />;
    case "frustration": return <g><rect x="184" y="146" width="32" height="14" rx="5" fill="#fbf6ef" stroke={INK} strokeWidth="3" /><path d="M192 147 V159 M200 147 V159 M208 147 V159" stroke={INK} strokeWidth="2.5" /></g>;
    case "concentration": return <path d="M190 154 H210" {...line} />;
    case "confusion": return <path d="M184 156 Q192 148 200 156 T216 154" {...line} />;
    case "determination": return <g><path d="M184 154 H216" {...line} /><path d="M180 140 Q184 150 184 154 M220 140 Q216 150 216 154" fill="none" stroke={lip} strokeWidth="3" strokeLinecap="round" opacity="0.55" /></g>;
    case "relief": return <path d="M182 148 Q200 168 218 148 Z" fill="#fbf6ef" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />;
  }
}

function Face({ mood, L }: { mood: Expr; L: Look }) {
  const b = BROWS[mood], e = EYES[mood];
  const eyes = [173, 227];
  const brow = (inner: number, outer: number, side: -1 | 1) => {
    const cx = side === -1 ? 173 : 227;
    // the inner end is the one toward the nose
    const inX = cx + (side === -1 ? 13 : -13), outX = cx + side * 15;
    return <path d={`M${inX} ${82 + inner} Q${(inX + outX) / 2} ${76 + (inner + outer) / 2} ${outX} ${82 + outer}`} fill="none" stroke={L.brow} strokeWidth={L.female ? 6.5 : 8} strokeLinecap="round" />;
  };
  return (
    <g>
      <path d="M200 112 Q192 134 200 140 Q206 141 210 138" fill="none" stroke={L.shade} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      {eyes.map((x, i) => {
        const ry = 15 * e.open;
        return e.closed ? (
          <path key={i} d={`M${x - 14} 114 Q${x} 104 ${x + 14} 114`} fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        ) : (
          <g key={i}>
            <ellipse cx={x} cy="112" rx="14" ry={ry} fill="#fbf6ef" stroke={INK} strokeWidth="3" />
            <circle cx={x + e.look[0] * 4} cy={112 + e.look[1] * 3} r={mood === "shock" ? 5 : 7} fill={INK} />
            {e.lid ? <path d={`M${x - 15} ${112 - ry - 1} H${x + 15} V${112 - ry + 2 * ry * e.lid} H${x - 15} Z`} fill={L.skin} stroke={INK} strokeWidth="3" strokeLinejoin="round" /> : null}
          </g>
        );
      })}
      {brow(b[0], b[1], -1)}{brow(b[2], b[3], 1)}
      {L.moustache && <path d="M176 142 Q200 132 224 142 Q214 152 200 146 Q186 152 176 142 Z" fill={L.hair} stroke={INK} strokeWidth="3" strokeLinejoin="round" />}
      <Mouth mood={mood} lip="#7a3a30" />
      {mood === "concern" && <path d="M246 70 Q256 88 246 96 Q236 88 246 70 Z" fill="#9fd8f0" stroke={INK} strokeWidth="3" strokeLinejoin="round" />}
    </g>
  );
}

const shape = { stroke: INK, strokeWidth: SW, strokeLinejoin: "round" as const };

function HairBack({ L }: { L: Look }): ReactNode {
  if (L.hairStyle === "bob") return <path d="M124 112 C118 36 282 36 276 112 L274 168 Q200 184 126 168 Z" fill={L.hair} {...shape} />;
  if (L.hairStyle === "ponytail") return <g><path d="M256 64 C312 52 340 112 318 176 C312 214 326 240 300 270 C290 228 296 196 282 154 C276 120 266 98 252 84 Z" fill={L.hair} {...shape} /><rect x="248" y="60" width="24" height="18" rx="7" fill="#e8c34a" {...shape} transform="rotate(-24 260 70)" /></g>;
  return null;
}
function HairFront({ L }: { L: Look }): ReactNode {
  const c = L.hair;
  switch (L.hairStyle) {
    case "side": return (
      <g>
        <path d="M141 106 C126 64 146 22 202 17 C258 12 284 52 263 106 L258 94 C252 74 242 62 228 58 L218 72 L204 56 L190 74 L176 60 C160 66 150 82 146 98 Z" fill={c} {...shape} />
        <path d="M184 26 C180 38 178 50 178 60 M214 22 C240 28 254 44 256 62 M170 34 C192 24 214 24 232 30" fill="none" stroke={INK} strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" />
      </g>
    );
    case "receding": return (
      <g>
        <path d="M141 106 C128 60 150 22 204 18 C258 14 282 56 263 106 L259 90 C257 70 248 58 238 52 L220 64 L200 54 L180 64 L162 52 C152 62 148 80 146 98 Z" fill={c} {...shape} />
        <path d="M176 28 C196 20 220 20 240 30 M164 40 C170 34 176 30 182 28" fill="none" stroke={INK} strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" />
      </g>
    );
    case "ponytail": return (
      <g>
        <path d="M130 126 C110 58 148 16 206 16 C264 16 292 58 272 126 L266 136 L258 104 C250 84 234 68 208 66 C182 66 158 80 150 104 L146 136 Z" fill={c} {...shape} />
        <path d="M208 22 C198 36 192 50 188 64 M240 28 C236 40 230 54 226 66" fill="none" stroke={INK} strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" />
      </g>
    );
    case "bob": return (
      <g>
        <path d="M122 140 C106 52 148 12 204 12 C262 12 296 54 280 140 L280 190 Q272 202 262 192 C262 160 258 130 252 104 C244 78 222 64 196 62 C172 64 154 82 148 108 C142 134 138 164 138 192 Q128 202 122 190 Z" fill={c} {...shape} />
        <path d="M188 20 C180 36 176 50 176 64 M222 22 C246 36 258 60 258 96 M130 100 C128 130 128 160 130 184 M270 100 C272 130 272 160 270 184" fill="none" stroke={INK} strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" />
      </g>
    );
    case "bun": return <g><circle cx="200" cy="12" r="28" fill={c} {...shape} /><path d="M128 128 C110 58 146 24 206 24 C266 24 292 60 272 128 L266 138 L258 108 C250 88 232 70 206 68 C180 68 156 82 148 108 L146 138 Z" fill={c} {...shape} /></g>;
    case "hat": return (
      <g>
        <path d="M134 118 L142 150 L148 112 Z M266 118 L258 150 L252 112 Z" fill={c} {...shape} />
        <path d="M126 104 C122 40 170 8 214 12 C262 16 284 52 274 104 Z" fill="#f2c230" {...shape} />
        <path d="M262 28 C276 46 278 74 274 104 L246 104 C256 80 258 52 262 28 Z" fill="#d9a41a" />
        <rect x="112" y="98" width="176" height="18" rx="9" fill="#f2c230" {...shape} />
        <path d="M200 14 V98" stroke="#c99414" strokeWidth="8" />
      </g>
    );
  }
}

function Torso({ role, L }: { role: Outfit; L: Look }): ReactNode {
  const base = <path d="M70 236 Q70 206 104 198 L150 184 H250 L296 198 Q330 206 330 236 L318 566 H82 Z" fill={L.top} {...shape} />;
  const shade = <path d="M250 184 L296 198 Q330 206 330 236 L318 566 H264 Q292 420 250 184 Z" fill={L.topShade} />;
  switch (role) {
    case "it_lead": return (<g>{base}{shade}
      <path d="M170 196 L200 262 L230 196 Z" fill="#eef2f6" {...shape} /><path d="M150 196 L124 244 L176 282 L196 232 Z" fill={L.topShade} {...shape} /><path d="M250 196 L276 244 L224 282 L204 232 Z" fill={L.topShade} {...shape} />
      <path d="M186 240 L180 330" stroke="#e8a33d" strokeWidth="7" strokeLinecap="round" /><rect x="168" y="326" width="30" height="40" rx="4" fill="#f7f9fb" {...shape} /></g>);
    case "vest": return (<g>{base}{shade}
      <path d="M170 196 L200 250 L230 196 Z" fill="#e6e9ee" {...shape} />
      <path d="M130 200 L172 190 L196 560 H116 Z" fill="#f08a24" {...shape} /><path d="M270 200 L228 190 L204 560 H284 Z" fill="#f08a24" {...shape} />
      <path d="M120 420 H190 M210 420 H280 M120 330 H182 M218 330 H280" stroke="#eef0f4" strokeWidth="14" /></g>);
    case "cardigan": return (<g>{base}{shade}
      <path d="M170 196 L200 250 L230 196 Z" fill="#f2f4f7" {...shape} /><path d="M150 196 L134 560 H192 L196 232 Z" fill={L.topShade} {...shape} /><path d="M250 196 L266 560 H208 L204 232 Z" fill={L.top} {...shape} />
      <path d="M172 204 C160 290 214 330 224 270" fill="none" stroke="#2a2a36" strokeWidth="9" strokeLinecap="round" /></g>);
    case "blazer": return (<g>{base}{shade}
      <path d="M170 196 L200 300 L230 196 Z" fill="#f2f4f7" {...shape} /><path d="M150 196 L116 276 L174 340 L198 240 Z" fill={L.topShade} {...shape} /><path d="M250 196 L284 276 L226 340 L202 240 Z" fill={L.top} {...shape} />
      <path d="M186 258 L180 360" stroke="#e8a33d" strokeWidth="7" strokeLinecap="round" /><rect x="168" y="354" width="30" height="40" rx="4" fill="#f7f9fb" {...shape} /></g>);
    case "shirt": return (<g>{base}{shade}
      <path d="M170 196 L200 252 L230 196 Z" fill={L.skin} {...shape} /><path d="M150 196 L128 246 L176 270 L196 226 Z" fill={L.topShade} {...shape} /><path d="M250 196 L272 246 L224 270 L204 226 Z" fill={L.topShade} {...shape} />
      <path d="M200 262 V560" stroke={L.topShade} strokeWidth="6" />
      <rect x="226" y="330" width="54" height="52" rx="6" fill={L.topShade} {...shape} /></g>);
    case "rep": return (<g>{base}{shade}
      <path d="M170 196 L200 270 L230 196 Z" fill="#f2f4f7" {...shape} /><path d="M150 196 L118 270 L176 330 L196 232 Z" fill={L.topShade} {...shape} /><path d="M250 196 L282 270 L224 330 L204 232 Z" fill={L.top} {...shape} />
      <circle cx="200" cy="360" r="7" fill="#e8c34a" {...shape} /><circle cx="200" cy="430" r="7" fill="#e8c34a" {...shape} /></g>);
  }
}

function ArmPair({ pose, L }: { pose: Pose; L: Look }) {
  const idle: [string, [number, number], string, [number, number]] = ["92,244 86,400 96,520", [96, 548], "308,244 314,400 304,520", [304, 548]];
  const arms: Record<Pose, [string, [number, number], string, [number, number]]> = {
    idle, point: ["92,244 86,400 96,520", [96, 548], "308,244 360,300 372,170", [376, 130]],
    clipboard: ["92,244 120,380 214,420", [226, 424], "308,244 330,400 236,444", [226, 448]],
    hand_chin: ["92,244 100,390 258,410", [270, 412], "308,244 338,392 250,300 236,196", [234, 184]],
    arms_crossed: ["92,244 110,400 262,420", [276, 422], "308,244 292,400 138,430", [124, 432]],
    phone: ["92,244 86,400 96,520", [96, 548], "308,244 350,330 276,190", [262, 168]],
  };
  const [la, lh, ra, rh] = arms[pose];
  const arm = (pts: string) => <g><polyline points={pts} fill="none" stroke={INK} strokeWidth="68" strokeLinecap="round" strokeLinejoin="round" /><polyline points={pts} fill="none" stroke={L.top} strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" /></g>;
  const hand = (p: [number, number]) => <circle cx={p[0]} cy={p[1]} r="33" fill={L.skin} {...shape} />;
  return (
    <g>
      {arm(la)}{hand(lh)}{arm(ra)}{hand(rh)}
      {pose === "clipboard" && <g><rect x="196" y="392" width="84" height="104" rx="8" fill="#e9edf5" {...shape} /><rect x="224" y="384" width="28" height="14" rx="4" fill="#59639c" {...shape} /><path d="M208 424 H266 M208 442 H254" stroke="#9aa4c8" strokeWidth="6" /></g>}
      {pose === "phone" && <rect x="248" y="150" width="26" height="46" rx="6" fill="#2a2a36" {...shape} transform="rotate(-18 261 173)" />}
    </g>
  );
}

/** Drawing only (no <svg> wrapper) so scenes can place people inside a panel. */
export function FigureG({ role, mood = "determination", pose = "idle" }: { role: Key; mood?: Expr; pose?: Pose }) {
  const L = LOOKS[role];
  return (
    <g>
      <path d="M108 556 H196 L188 934 H118 Z" fill={L.trousers} {...shape} /><path d="M204 556 H292 L282 934 H212 Z" fill={L.trousers} {...shape} />
      <ellipse cx="146" cy="952" rx="54" ry="22" fill={L.shoes} {...shape} /><ellipse cx="256" cy="952" rx="54" ry="22" fill={L.shoes} {...shape} />
      <Torso role={L.outfit} L={L} />
      <ArmPair pose={pose} L={L} />
      <g>
        <rect x="172" y="150" width="56" height="62" rx="14" fill={L.skin} {...shape} />
        <path d="M172 164 H228 V176 Q200 190 172 176 Z" fill={L.shade} />
        <HairBack L={L} />
        <ellipse cx="136" cy="122" rx="11" ry="17" fill={L.skin} {...shape} /><ellipse cx="264" cy="122" rx="11" ry="17" fill={L.skin} {...shape} />
        <ellipse cx="200" cy="112" rx={L.female ? 60 : 64} ry={L.female ? 72 : 74} fill={L.skin} {...shape} />
        {L.stubble && <path d="M142 138 C148 168 172 184 200 184 C228 184 252 168 258 138 C252 160 232 172 200 172 C168 172 148 160 142 138 Z" fill={L.hair} opacity="0.8" />}
        <Face mood={mood} L={L} />
        {L.glasses && <g fill="none" stroke={INK} strokeWidth="5"><circle cx="173" cy="112" r="24" /><circle cx="227" cy="112" r="24" /><path d="M196 108 Q200 102 204 108" /></g>}
        <HairFront L={L} />
        {L.female && L.hairStyle === "ponytail" && <circle cx="140" cy="140" r="5" fill="#e8c34a" />}
      </g>
    </g>
  );
}

export function Figure({ role, mood, pose, bust = false, title, data }: { role: Key; mood?: Expr; pose?: Pose; bust?: boolean; title?: string; data?: { who: string; pose: string; expression: string } }) {
  return (
    <svg viewBox={bust ? "78 -34 244 262" : "0 0 400 1000"} data-who={data?.who} data-pose={data?.pose} data-expression={data?.expression} role="img" aria-label={title ?? `${(ROLE_TITLES as Record<string, string>)[role] ?? "Staff member"}, ${mood ?? "determination"}`}>
      <FigureG role={role} mood={mood} pose={pose} />
    </svg>
  );
}

// ---- the game's view of the cast -------------------------------------------------------------------------------------
export type Who = "arjun" | "director" | "kavya" | "nisha" | "raghav" | "isha" | "worker" | "worker_b" | "worker_c" | "worker_d";
const LEGACY: Record<string, Expr> = { concerned: "concern", shocked: "shock", focused: "concentration", determined: "determination" };
export const EXPRESSIONS: Expr[] = ["neutral", "tired", ...MOODS];
export type StagePose = Pose | "at_desk" | "arms_down";
/** The six backend character ids keep their ids; on screen they are these roles. */
export const KEY_OF: Record<Who, Key> = { arjun: "it_lead", kavya: "terminal_sup", raghav: "net_admin", nisha: "ops_manager", isha: "customer_rep", director: "recovery_lead", worker: "staff_a", worker_b: "staff_b", worker_c: "staff_c", worker_d: "staff_d" };
export const WHO_TITLES: Record<Who, string> = { arjun: "IT Lead", kavya: "Terminal Supervisor", raghav: "Network Administrator", nisha: "Operations Manager", isha: "Customer Representative", director: "Recovery Team Lead", worker: "Staff member", worker_b: "Staff member", worker_c: "Staff member", worker_d: "Staff member" };

/** One person for the comic, by the game's own id, expression and pose. `bust` crops to head and shoulders. */
export function NpPerson({ who, expression = "neutral", pose = "idle", bust = false, label }: { who: Who; expression?: Expr | string; pose?: StagePose; bust?: boolean; label?: string }) {
  const p: Pose = pose === "at_desk" || pose === "arms_down" ? "idle" : pose;
  const mood = (EXPRESSIONS as string[]).includes(expression) ? (expression as Expr) : LEGACY[expression] ?? "neutral";
  return <Figure role={KEY_OF[who]} mood={mood} pose={p} bust={bust} title={label ?? `${WHO_TITLES[who]}, ${mood}`} data={{ who, pose, expression: mood }} />;
}
