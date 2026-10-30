import { Face, EXPRESSIONS, type FaceSpec } from "./Face";
import { add, ribbon, spline, type Pt } from "./draw";

// Arjun Mehta, IT & Systems Lead. Late thirties, Indian. A narrower face with a strong nose, deep-set tired eyes,
// thin black-framed glasses, thick black side-parted hair and a close-trimmed beard shadow. Steel-blue work shirt with the
// sleeves of a man who has been at a terminal all evening, an amber site lanyard.
const P = (a: number[][]): Pt[] => a as Pt[];

export const ARJUN: FaceSpec = {
  palette: { skin: "#a9714d", mid: "#8a5636", deep: "#5c3523", light: "#c58b62", lip: "#8b4d3b", hair: "#0d0c10", iris: "#4b2f1c", ink: "#0a0708", cool: "#8fb8e0" },
  contour: P([[420, 190], [500, 200], [570, 245], [608, 310], [624, 380], [628, 440], [622, 510], [610, 575], [588, 625], [550, 655], [500, 672], [440, 680], [385, 670], [335, 640], [298, 596], [272, 530], [258, 460], [254, 395], [262, 330], [280, 262], [332, 214]]),
  terminator: P([[332, 214], [326, 300], [340, 366], [366, 430], [376, 480], [370, 530], [380, 590], [398, 650], [420, 690]]),
  ear: P([[270, 372], [246, 364], [226, 386], [220, 436], [234, 488], [260, 510], [278, 492], [280, 430]]),
  near: { c: [352, 396], w: 86, open: 21, tilt: 3 },
  far: { c: [520, 392], w: 70, open: 19, tilt: 4 },
  nearBrow: P([[418, 354], [384, 340], [342, 336], [300, 348]]),
  farBrow: P([[456, 354], [494, 338], [546, 334], [590, 346]]),
  browThick: 12,
  nose: { bridge: [436, 372], mid: [442, 440], tip: [476, 492], nearAla: [430, 500], farAla: [510, 498], base: 520 },
  mouth: { c: [458, 568], w: 128 },
  chin: [440, 680],
  age: { forehead: 0.5, nasolabial: 0.7, crow: 0.6, bags: 0.6 },
  stubble: 0.85,
  beard: P([[262, 470], [300, 520], [352, 556], [420, 568], [520, 560], [600, 516], [626, 540], [618, 610], [592, 652], [530, 686], [450, 698], [380, 686], [320, 652], [280, 598]]),
  jawShade: P([[262, 520], [284, 596], [326, 646], [396, 684], [450, 694], [504, 680], [450, 660], [390, 640], [330, 590]]),
  lightForehead: P([[470, 205], [565, 250], [604, 330], [594, 392], [546, 356], [526, 300], [486, 250]]),
  lightCheek: P([[502, 430], [604, 424], [622, 486], [592, 540], [528, 520], [496, 482]]),
  lightChin: P([[420, 640], [490, 660], [540, 640], [500, 676], [440, 682]]),
  hollow: P([[300, 460], [344, 504], [364, 556], [332, 536]]),
  foreheadY: 336,
};

const HAIR_SHAPE = P([[250, 332], [244, 270], [260, 210], [304, 158], [372, 120], [450, 106], [530, 118], [590, 158], [626, 222], [636, 292], [628, 352], [618, 376], [608, 332], [596, 284], [574, 246], [532, 222], [472, 208], [412, 206], [356, 222], [312, 252], [288, 296], [276, 352]]);

function Hair() {
  const lock = (pts: number[][], th: number[], c: string) => <path d={ribbon(P(pts), th)} fill={c} />;
  return (
    <g>
      <path d={spline(HAIR_SHAPE, true)} fill="#0b0a0e" stroke="#050405" strokeWidth="3" strokeLinejoin="round" />
      {/* grouped locks sweeping from the part back over the crown */}
      {lock([[352, 210], [400, 150], [470, 120], [560, 138], [620, 200]], [4, 24, 30, 24, 4], "#15141a")}
      {lock([[330, 230], [356, 172], [420, 132], [500, 118], [586, 150]], [4, 20, 26, 20, 4], "#1b1a22")}
      {lock([[300, 262], [312, 198], [364, 150], [440, 124]], [4, 18, 22, 4], "#14131a")}
      {lock([[470, 214], [530, 170], [590, 176], [630, 246]], [4, 18, 22, 4], "#18171f")}
      {lock([[536, 228], [590, 214], [624, 264], [632, 330]], [4, 16, 18, 4], "#13121a")}
      {/* highlights that catch the cool screen light */}
      <path d={spline(P([[372, 200], [420, 150], [490, 128], [560, 142]]), false)} stroke="#8fb8e0" strokeWidth="4" fill="none" opacity="0.5" strokeLinecap="round" />
      <path d={spline(P([[470, 160], [540, 150], [596, 178]]), false)} stroke="#8fb8e0" strokeWidth="3" fill="none" opacity="0.4" strokeLinecap="round" />
      <path d={spline(P([[596, 214], [620, 250], [628, 300]]), false)} stroke="#8fb8e0" strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round" />
      {/* part, and fine strands along the hairline */}
      <path d={spline(P([[352, 214], [372, 176], [402, 142]]), false)} stroke="#050405" strokeWidth="2.4" fill="none" />
      {Array.from({ length: 22 }, (_, i) => { const a = 288 + i * 15; return <path key={i} d={`M${a} ${224 - Math.sin(i / 3) * 6 + (i > 11 ? i - 11 : 0)} q${6 + (i % 3)} -${14 + (i % 4) * 4} ${14 + (i % 5)} -${24 + (i % 3) * 5}`} stroke="#050405" strokeWidth="1.8" fill="none" opacity="0.7" strokeLinecap="round" />; })}
      <path d={spline(P([[250, 332], [238, 392], [244, 448], [258, 470]]), false)} stroke="#050405" strokeWidth="3" fill="none" />
      <path d={spline(P([[262, 352], [270, 396], [282, 424], [286, 380]]), true)} fill="#0b0a0e" />
    </g>
  );
}

function Glasses() {
  const frame = "#0d1117";
  const near = "M298 372 Q298 358 314 358 L398 358 Q414 358 414 374 L412 424 Q410 440 394 440 L318 440 Q300 440 300 424 Z";
  const far = "M470 362 Q470 352 484 352 L546 352 Q566 354 570 368 L566 414 Q562 430 546 430 L488 430 Q472 430 472 414 Z";
  return (
    <g>
      <path d={near} fill="#b8d4ee" opacity="0.1" /><path d={far} fill="#b8d4ee" opacity="0.1" />
      <path d="M316 424 L366 366 M344 438 L402 372" stroke="#fff" strokeWidth="5" opacity="0.2" strokeLinecap="round" />
      <path d="M492 420 L524 366 M514 428 L548 374" stroke="#fff" strokeWidth="4" opacity="0.18" strokeLinecap="round" />
      <path d="M414 380 Q442 368 470 376" fill="none" stroke={frame} strokeWidth="6" strokeLinecap="round" />
      <path d={near} fill="none" stroke={frame} strokeWidth="6.5" strokeLinejoin="round" /><path d={far} fill="none" stroke={frame} strokeWidth="6" strokeLinejoin="round" />
      <path d="M300 378 L270 380 L252 392" fill="none" stroke={frame} strokeWidth="5.5" strokeLinecap="round" />
      <path d="M306 446 Q356 464 402 448" fill="none" stroke="#2b1710" strokeWidth="10" opacity="0.18" strokeLinecap="round" />
      <path d="M320 362 L396 362" stroke="#8fb8e0" strokeWidth="2" opacity="0.45" />
    </g>
  );
}

function Body() {
  const shirt = "#4c6a89", shade = "#2f4a66", deep = "#1c3047", hi = "#7d9fc0";
  return (
    <g>
      {/* neck */}
      <path d={spline(P([[356, 640], [350, 760], [344, 860], [330, 940], [586, 940], [578, 860], [570, 760], [560, 664]]), true)} fill="#a06a47" stroke="#0a0708" strokeWidth="2.6" />
      <path d={spline(P([[352, 690], [420, 744], [510, 736], [562, 680], [566, 790], [470, 812], [390, 796], [350, 780]]), true)} fill="#4f2f20" opacity="0.7" />
      <path d={spline(P([[530, 740], [566, 720], [572, 820], [540, 840]]), true)} fill="#c58b62" opacity="0.22" />
      {/* shirt, in shadow on the left and lit on the right */}
      <path d={spline(P([[316, 838], [250, 862], [150, 892], [70, 936], [20, 1500], [780, 1500], [772, 940], [722, 902], [640, 872], [592, 848]]), true)} fill={shirt} stroke="#0a0708" strokeWidth="3" />
      <path d={spline(P([[316, 838], [250, 862], [150, 892], [70, 936], [20, 1500], [300, 1500], [350, 930]]), true)} fill={shade} />
      <path d={spline(P([[316, 838], [270, 880], [210, 930], [130, 1500], [20, 1500], [70, 936], [150, 892], [250, 862]]), true)} fill={deep} opacity="0.55" />
      <path d={spline(P([[620, 868], [700, 900], [770, 950], [780, 1500], [680, 1500], [640, 930]]), true)} fill={hi} opacity="0.4" />
      {/* fabric folds */}
      <g fill="none" stroke={deep} strokeWidth="3" strokeLinecap="round" opacity="0.7">
        <path d={spline(P([[196, 930], [240, 960], [270, 1000]]), false)} /><path d={spline(P([[120, 960], [160, 990]]), false)} />
        <path d={spline(P([[660, 920], [690, 960], [700, 1000]]), false)} /><path d={spline(P([[580, 900], [600, 950], [596, 1000]]), false)} />
      </g>
      <path d={spline(P([[150, 892], [230, 920], [290, 990]]), false)} fill="none" stroke="#0a0708" strokeWidth="2" opacity="0.45" />
      <path d={spline(P([[640, 872], [700, 920], [736, 1000]]), false)} fill="none" stroke={hi} strokeWidth="2.4" opacity="0.5" />
      {/* undershirt in the open collar */}
      <path d={spline(P([[392, 792], [424, 826], [452, 960], [482, 830], [512, 790], [470, 814], [452, 820], [430, 814]]), true, 0.3)} fill="#cfd6df" stroke="#0a0708" strokeWidth="2.6" />
      <path d={spline(P([[392, 792], [424, 826], [452, 960], [442, 900], [414, 832]]), true, 0.3)} fill="#8c97a6" opacity="0.7" />
      {/* collar stand, then two pointed collar leaves with seams and top-stitching */}
      <path d={ribbon(P([[340, 786], [400, 800], [452, 802], [510, 798], [566, 784]]), [20, 22, 22, 22, 20])} fill="#4a6684" stroke="#0a0708" strokeWidth="2.4" />
      <path d={spline(P([[338, 782], [292, 878], [398, 904], [432, 818]]), true, 0.12)} fill="#5a7ba0" stroke="#0a0708" strokeWidth="3" strokeLinejoin="round" />
      <path d={spline(P([[338, 782], [292, 878], [398, 904], [356, 840]]), true, 0.12)} fill={shade} opacity="0.75" />
      <path d={spline(P([[570, 790], [614, 884], [516, 910], [474, 824]]), true, 0.12)} fill="#6e92b8" stroke="#0a0708" strokeWidth="3" strokeLinejoin="round" />
      <path d={spline(P([[344, 798], [304, 868], [390, 892]]), false, 0.12)} stroke="#a7bdd3" strokeWidth="1.8" fill="none" strokeDasharray="6 5" opacity="0.75" />
      <path d={spline(P([[566, 804], [604, 874], [520, 898]]), false, 0.12)} stroke="#c3d5e6" strokeWidth="1.8" fill="none" strokeDasharray="6 5" opacity="0.75" />
      <path d={spline(P([[316, 846], [250, 872], [160, 904]]), false)} stroke="#0a0708" strokeWidth="2" fill="none" opacity="0.5" />
      {/* placket and buttons */}
      <path d="M452 940 L452 1000" stroke="#0a0708" strokeWidth="3" /><path d="M468 936 L468 1000" stroke={hi} strokeWidth="1.6" opacity="0.6" />
      <circle cx="460" cy="982" r="8" fill="#9fb4ca" stroke="#0a0708" strokeWidth="2" /><circle cx="460" cy="982" r="2.4" fill="#2a3a4c" />
      {/* lanyard and badge */}
      <path d={spline(P([[340, 806], [372, 890], [428, 990]]), false)} stroke="#0a0708" strokeWidth="15" fill="none" strokeLinecap="round" />
      <path d={spline(P([[340, 806], [372, 890], [428, 990]]), false)} stroke="#e8a33d" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d={spline(P([[574, 812], [548, 890], [498, 990]]), false)} stroke="#0a0708" strokeWidth="15" fill="none" strokeLinecap="round" />
      <path d={spline(P([[574, 812], [548, 890], [498, 990]]), false)} stroke="#f0b457" strokeWidth="9" fill="none" strokeLinecap="round" />
      <rect x="412" y="978" width="100" height="40" rx="6" fill="#dfe4ea" stroke="#0a0708" strokeWidth="3" />
      <rect x="422" y="988" width="22" height="26" fill="#4f6f8f" /><path d="M452 992 L500 992 M452 1002 L488 1002" stroke="#0a0708" strokeWidth="3" opacity="0.7" />
      {/* warm rim light from the left (an emergency lamp behind) */}
      <path d={spline(P([[318, 842], [262, 866], [160, 900], [80, 946]]), false)} fill="none" stroke="#f0a64a" strokeWidth="5" opacity="0.7" strokeLinecap="round" />
      {void add}
    </g>
  );
}

export type ArjunExpression = "neutral" | "concern" | "alarm";

/** Head-and-shoulders of Arjun Mehta, 800 x 1000. Expression is the only thing that changes. */
export function ArjunPortrait({ expression = "concern", title = "Arjun Mehta" }: { expression?: ArjunExpression; title?: string }) {
  const ex = EXPRESSIONS[expression];
  return (
    <svg className="portrait portrait--arjun" viewBox="0 0 800 1000" role="img" aria-label={`${title}, ${expression}`} data-expression={expression}>
      <g transform="translate(0 -78)"><Body /></g>
      <Face spec={ARJUN} ex={ex} />
      <Glasses />
      <Hair />
    </svg>
  );
}
