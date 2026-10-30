import { Arm, BrowFill, EXPR, Eye, Hand, Mouth, OUT, OW, Sweat, ToonSvg, type Look } from "./kit";

// Arjun Mehta, IT & Systems Lead. Round head, thick black quiff, short beard, round-rect glasses. Steel-blue work shirt, amber lanyard.
export const ARJUN_LOOK: Look = { skin: "#c58a5c", hair: "#17181f", brow: "#17181f" };
const SHIRT = "#4f86b8", COLLAR = "#3b6e9c", TEE = "#f1f4f7", AMBER = "#f2a93b";

export type ArjunExpression = "neutral" | "concern" | "alarm" | "suspicion";
export type ArjunPose = "idle" | "point";

export function ArjunToon({ expression = "concern", pose = "idle" }: { expression?: ArjunExpression; pose?: ArjunPose }) {
  const ex = EXPR[expression], L = ARJUN_LOOK;
  const sw = { stroke: OUT, strokeWidth: OW, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const left = pose === "point" ? "M210 760 Q70 780 96 600" : "M210 760 Q116 860 130 930";
  return (
    <ToonSvg label="Arjun Mehta" expression={expression}>
      {/* neck */}
      <rect x="344" y="560" width="112" height="140" rx="30" fill={L.skin} {...sw} />
      {/* torso */}
      <path d="M150 1000 Q140 740 270 706 L350 676 H450 L530 706 Q660 740 650 1000 Z" fill={SHIRT} {...sw} />
      {/* open collar, white tee, lanyard, badge, pocket */}
      <path d="M350 676 Q400 750 450 676 L440 760 Q400 800 360 760 Z" fill={TEE} {...sw} />
      <path d="M340 662 L276 748 L362 790 L392 706 Z" fill={COLLAR} {...sw} /><path d="M460 662 L524 748 L438 790 L408 706 Z" fill={COLLAR} {...sw} />
      <path d="M352 672 L376 850 L400 940 M448 672 L424 850 L400 940" fill="none" stroke={OUT} strokeWidth="20" strokeLinecap="round" />
      <path d="M352 672 L376 850 L400 940 M448 672 L424 850 L400 940" fill="none" stroke={AMBER} strokeWidth="11" strokeLinecap="round" />
      <rect x="356" y="920" width="88" height="70" rx="8" fill="#ffffff" {...sw} />
      <rect x="500" y="800" width="100" height="90" rx="14" fill={COLLAR} {...sw} />
      {/* arms: sleeve from the shoulder, hand on the end */}
      <Arm d={left} color={SHIRT} start={[210, 760]} />
      {pose === "point" ? <Hand x={96} y={560} rot={-12} pose="point" skin={L.skin} /> : <Hand x={130} y={944} pose="fist" skin={L.skin} />}
      <Arm d="M590 760 Q684 860 670 930" color={SHIRT} start={[590, 760]} />
      <Hand x={670} y={944} pose="fist" skin={L.skin} />
      {/* ears and head */}
      <g transform="translate(0 112) translate(400 500) scale(1.22) translate(-400 -500)">
      <circle cx="248" cy="336" r="32" fill={L.skin} {...sw} /><circle cx="552" cy="336" r="32" fill={L.skin} {...sw} />
      <path d="M250 300 C250 190 320 130 400 130 C480 130 550 190 550 300 C550 400 510 490 400 500 C290 490 250 400 250 300 Z" fill={L.skin} {...sw} />
      {/* beard (chin and jaw) */}
      <path d="M252 360 C258 440 312 498 400 502 C488 498 542 440 548 360 C534 420 500 454 456 466 Q400 452 344 466 C300 454 266 420 252 360 Z" fill={L.hair} {...sw} />
      {/* nose */}
      <path d="M404 358 Q392 392 378 402 Q402 416 426 402" fill="none" stroke={OUT} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      {/* eyes, brows, glasses */}
      <Eye cx={340} cy={320} ex={ex} skin={L.skin} /><Eye cx={460} cy={320} ex={ex} skin={L.skin} />
      <BrowFill cx={338} cy={248} side={-1} ex={ex} color={L.brow} /><BrowFill cx={462} cy={248} side={1} ex={ex} color={L.brow} />
      <rect x="280" y="270" width="120" height="100" rx="34" fill="none" stroke={OUT} strokeWidth="10" /><rect x="400" y="270" width="120" height="100" rx="34" fill="none" stroke={OUT} strokeWidth="10" />
      <path d="M396 304 Q400 296 404 304" fill="none" stroke={OUT} strokeWidth="9" /><path d="M280 300 L250 304 M520 300 L550 304" stroke={OUT} strokeWidth="9" strokeLinecap="round" />
      <Mouth cx={400} cy={434} w={42} ex={ex} />
      {/* hair: a quiff */}
      <path d="M232 300 C214 170 306 92 412 94 C526 96 590 180 568 300 C558 238 522 196 470 184 C420 172 350 180 308 212 C268 240 244 266 232 300 Z" fill={L.hair} {...sw} />
      {ex.sweat && <Sweat x={566} y={230} />}
      </g>
    </ToonSvg>
  );
}
