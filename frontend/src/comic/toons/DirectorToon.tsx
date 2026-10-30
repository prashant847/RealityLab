import { Arm, BrowFill, EXPR, Eye, Hand, Mouth, OUT, OW, Sweat, ToonSvg, type Look } from "./kit";

// Operations Director. A broader, older character than Arjun: wide face, short grey swept-back hair, heavy grey brows, no glasses or beard.
// Charcoal blazer, white shirt, red tie.
export const DIRECTOR_LOOK: Look = { skin: "#e2b08a", hair: "#b9bec7", brow: "#8f95a0" };
const COAT = "#3a4352", LAPEL = "#4b5667", SHIRT = "#f4f6f8", TIE = "#b73a3a";

export type DirectorExpression = "neutral" | "pressure" | "uncertain";
export type DirectorPose = "idle" | "hand_chin";

export function DirectorToon({ expression = "uncertain", pose = "idle" }: { expression?: DirectorExpression; pose?: DirectorPose }) {
  const ex = EXPR[expression], L = DIRECTOR_LOOK;
  const sw = { stroke: OUT, strokeWidth: OW, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const right = pose === "hand_chin" ? "M600 770 Q744 790 704 700 Q676 650 566 648" : "M600 770 Q700 860 686 930";
  return (
    <ToonSvg label="The Operations Director" expression={expression}>
      <rect x="338" y="560" width="124" height="140" rx="30" fill={L.skin} {...sw} />
      {/* wide-shouldered blazer, shirt, tie, lapels */}
      <path d="M70 1000 Q60 744 220 708 L340 676 H460 L580 708 Q740 744 730 1000 Z" fill={COAT} {...sw} />
      <path d="M340 676 Q400 770 460 676 L500 740 L430 1000 H370 L300 740 Z" fill={SHIRT} {...sw} />
      <path d="M392 724 H408 L420 770 L400 790 L380 770 Z" fill={TIE} {...sw} /><path d="M378 778 H422 L446 930 L400 984 L354 930 Z" fill={TIE} {...sw} />
      <path d="M300 740 L230 790 L268 830 L236 1000 H336 L372 840 Z" fill={LAPEL} {...sw} /><path d="M500 740 L570 790 L532 830 L564 1000 H464 L428 840 Z" fill={LAPEL} {...sw} />
      {/* arms */}
      <Arm d="M200 770 Q110 860 124 930" color={COAT} start={[200, 770]} />
      <Hand x={124} y={944} pose="fist" skin={L.skin} />
      <Arm d={right} color={COAT} start={[600, 770]} />
      {pose === "hand_chin" ? <Hand x={548} y={640} rot={-20} pose="fist" skin={L.skin} /> : <Hand x={686} y={944} pose="fist" skin={L.skin} />}
      {/* ears and head: wider than Arjun's */}
      <g transform="translate(0 112) translate(400 500) scale(1.22) translate(-400 -500)">
      <circle cx="232" cy="336" r="32" fill={L.skin} {...sw} /><circle cx="568" cy="336" r="32" fill={L.skin} {...sw} />
      <path d="M240 300 C240 190 312 134 400 134 C488 134 560 190 560 300 C562 400 520 496 400 502 C280 496 238 400 240 300 Z" fill={L.skin} {...sw} />
      <path d="M404 362 Q390 400 372 410 Q402 426 432 410" fill="none" stroke={OUT} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <Eye cx={336} cy={322} ex={ex} skin={L.skin} /><Eye cx={464} cy={322} ex={ex} skin={L.skin} />
      <BrowFill cx={334} cy={252} side={-1} ex={ex} color={L.brow} w={104} t={24} /><BrowFill cx={466} cy={252} side={1} ex={ex} color={L.brow} w={104} t={24} />
      <Mouth cx={400} cy={452} w={50} ex={ex} />
      {/* hair: grey, swept back */}
      <path d="M226 304 C208 172 302 100 412 100 C522 100 594 178 574 304 C568 242 536 202 490 190 C446 178 396 182 352 198 C296 220 244 252 226 304 Z" fill={L.hair} {...sw} />
      {ex.sweat && <Sweat x={582} y={236} />}
      </g>
    </ToonSvg>
  );
}
