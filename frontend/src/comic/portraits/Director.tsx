import { EXPRESSIONS, Face, type FaceSpec } from "./Face";
import { ribbon, spline, type Pt } from "./draw";

// Operations Director. Fifties, a broad, squarer face with a heavy brow, short silver-grey hair swept back, clean shaven.
// Charcoal blazer over an open pale shirt, plant ID on a dark lanyard. Deliberately unlike Arjun: wider jaw, shorter nose,
// lighter warm-olive skin, grey hair, no beard, no glasses.
const P = (a: number[][]): Pt[] => a as Pt[];

export const DIRECTOR: FaceSpec = {
  palette: { skin: "#c08a64", mid: "#a06c4a", deep: "#6e4330", light: "#d9a47c", lip: "#a05a4c", hair: "#8e9199", iris: "#5b6b6e", ink: "#0a0708", cool: "#b8d4ee" },
  contour: P([[420, 200], [506, 206], [578, 246], [616, 312], [634, 388], [638, 452], [634, 520], [624, 586], [602, 640], [566, 676], [510, 696], [440, 702], [372, 692], [322, 664], [288, 618], [266, 556], [256, 480], [254, 404], [262, 336], [284, 270], [336, 222]]),
  terminator: P([[336, 222], [330, 306], [342, 372], [364, 434], [372, 490], [366, 540], [374, 596], [392, 656], [414, 700]]),
  ear: P([[268, 386], [244, 378], [224, 402], [220, 450], [232, 500], [258, 520], [276, 502], [278, 440]]),
  near: { c: [356, 408], w: 80, open: 17, tilt: 1 },
  far: { c: [526, 402], w: 66, open: 16, tilt: 2 },
  nearBrow: P([[424, 372], [388, 360], [344, 358], [302, 372]]),
  farBrow: P([[462, 370], [502, 356], [552, 354], [598, 368]]),
  browThick: 18,
  nose: { bridge: [440, 386], mid: [446, 452], tip: [478, 506], nearAla: [432, 514], farAla: [516, 512], base: 534 },
  mouth: { c: [462, 592], w: 124 },
  chin: [440, 702],
  age: { forehead: 0.9, nasolabial: 0.9, crow: 0.9, bags: 0.9 },
  stubble: 0,
  beard: P([[300, 560], [400, 600], [520, 600], [600, 560], [600, 640], [440, 700], [300, 640]]),
  jawShade: P([[264, 520], [286, 604], [332, 662], [404, 698], [452, 704], [500, 694], [450, 676], [392, 652], [334, 594]]),
  lightForehead: P([[476, 212], [574, 254], [612, 334], [602, 398], [552, 366], [530, 304], [490, 256]]),
  lightCheek: P([[506, 444], [612, 438], [632, 500], [602, 560], [534, 540], [500, 498]]),
  lightChin: P([[420, 662], [492, 682], [548, 660], [506, 696], [444, 702]]),
  hollow: P([[300, 470], [346, 520], [366, 576], [334, 556]]),
  foreheadY: 352,
};

const HAIR = P([[256, 350], [250, 290], [268, 236], [316, 188], [390, 156], [470, 148], [548, 164], [604, 204], [634, 266], [640, 330], [632, 356], [618, 312], [596, 268], [556, 238], [500, 224], [440, 222], [384, 234], [336, 258], [304, 296], [282, 340]]);

function Hair() {
  const lock = (pts: number[][], th: number[], c: string) => <path d={ribbon(P(pts), th)} fill={c} />;
  return (
    <g>
      <path d={spline(HAIR, true)} fill="#848790" stroke="#0a0708" strokeWidth="3" strokeLinejoin="round" />
      {lock([[300, 262], [352, 198], [430, 168], [520, 172], [600, 214]], [4, 22, 28, 22, 4], "#9fa2aa")}
      {lock([[286, 300], [316, 232], [384, 190], [468, 166]], [4, 18, 24, 4], "#767982")}
      {lock([[480, 224], [550, 190], [610, 226], [634, 300]], [4, 18, 22, 4], "#969aa2")}
      {lock([[540, 236], [596, 238], [628, 290], [636, 346]], [4, 14, 16, 4], "#7b7e87")}
      <path d={spline(P([[330, 240], [400, 190], [480, 172], [560, 186]]), false)} stroke="#d2d8e0" strokeWidth="4" fill="none" opacity="0.6" strokeLinecap="round" />
      <path d={spline(P([[500, 200], [570, 204], [612, 244]]), false)} stroke="#d2d8e0" strokeWidth="3" fill="none" opacity="0.45" strokeLinecap="round" />
      {Array.from({ length: 24 }, (_, i) => <path key={i} d={`M${292 + i * 14.5} ${236 - Math.sin(i / 3.5) * 7 + (i > 14 ? (i - 14) * 2 : 0)} q${5 + (i % 3)} -${12 + (i % 4) * 3} ${12 + (i % 4)} -${22 + (i % 3) * 4}`} stroke="#4d4f57" strokeWidth="1.7" fill="none" opacity="0.7" strokeLinecap="round" />)}
      <path d={spline(P([[262, 344], [268, 392], [280, 420], [284, 372]]), true)} fill="#7d8089" stroke="#0a0708" strokeWidth="1.6" />
      <path d={spline(P([[256, 350], [244, 400], [250, 452]]), false)} stroke="#0a0708" strokeWidth="3" fill="none" />
    </g>
  );
}

function Body() {
  const cloth = "#2c323d", shade = "#1a1e27", hi = "#4d596b";
  return (
    <g>
      <path d={spline(P([[350, 650], [344, 760], [340, 860], [330, 940], [590, 940], [580, 860], [574, 760], [566, 672]]), true)} fill="#b17c58" stroke="#0a0708" strokeWidth="2.6" />
      <path d={spline(P([[350, 690], [420, 744], [510, 736], [566, 680], [570, 790], [470, 812], [390, 796], [350, 780]]), true)} fill="#6a4030" opacity="0.7" />
      <path d={spline(P([[540, 730], [570, 716], [576, 820], [544, 840]]), true)} fill="#d9a47c" opacity="0.25" />
      <path d={spline(P([[330, 860], [240, 884], [120, 914], [30, 980], [0, 1500], [820, 1500], [790, 980], [720, 920], [620, 884], [580, 862]]), true)} fill={cloth} stroke="#0a0708" strokeWidth="3" />
      <path d={spline(P([[330, 860], [240, 884], [120, 914], [30, 980], [0, 1500], [320, 1500], [360, 960]]), true)} fill={shade} />
      <path d={spline(P([[620, 884], [720, 920], [790, 980], [820, 1500], [700, 1500], [650, 960]]), true)} fill={hi} opacity="0.5" />
      <path d={spline(P([[388, 800], [420, 840], [452, 1000], [490, 842], [520, 800], [470, 822], [452, 828], [430, 822]]), true, 0.3)} fill="#dde3ea" stroke="#0a0708" strokeWidth="2.6" />
      <path d={spline(P([[388, 800], [420, 840], [452, 1000], [440, 920], [414, 846]]), true, 0.3)} fill="#9aa5b4" opacity="0.7" />
      <path d={spline(P([[340, 790], [300, 896], [406, 924], [436, 826]]), true, 0.12)} fill="#c9d1db" stroke="#0a0708" strokeWidth="3" strokeLinejoin="round" />
      <path d={spline(P([[340, 790], [300, 896], [406, 924], [366, 850]]), true, 0.12)} fill="#8d98a8" opacity="0.7" />
      <path d={spline(P([[564, 794], [606, 900], [516, 926], [474, 832]]), true, 0.12)} fill="#e4e9ef" stroke="#0a0708" strokeWidth="3" strokeLinejoin="round" />
      <path d={spline(P([[330, 860], [336, 970], [400, 1500], [380, 930], [372, 880]]), true, 0.15)} fill="#232933" stroke="#0a0708" strokeWidth="3" />
      <path d={spline(P([[600, 868], [570, 970], [504, 1500], [530, 930], [540, 884]]), true, 0.15)} fill="#38414f" stroke="#0a0708" strokeWidth="3" />
      <path d={spline(P([[330, 860], [300, 900], [336, 934], [372, 900]]), true, 0.1)} fill="#2b323d" stroke="#0a0708" strokeWidth="2.4" />
      <path d={spline(P([[600, 868], [632, 906], [592, 940], [548, 906]]), true, 0.1)} fill="#434d5c" stroke="#0a0708" strokeWidth="2.4" />
      <path d={spline(P([[340, 880], [346, 990], [404, 1090]]), false)} stroke="#6d7a8c" strokeWidth="1.8" strokeDasharray="6 5" fill="none" opacity="0.7" />
      <path d={spline(P([[596, 888], [572, 990], [510, 1090]]), false)} stroke="#8e9bad" strokeWidth="1.8" strokeDasharray="6 5" fill="none" opacity="0.7" />
      <g fill="none" stroke={shade} strokeWidth="3" strokeLinecap="round" opacity="0.8">
        <path d={spline(P([[180, 960], [230, 1000], [250, 1060]]), false)} /><path d={spline(P([[700, 960], [730, 1010], [726, 1070]]), false)} />
      </g>
      <path d={spline(P([[372, 840], [392, 930], [430, 1060]]), false)} stroke="#0a0708" strokeWidth="15" fill="none" strokeLinecap="round" />
      <path d={spline(P([[372, 840], [392, 930], [430, 1060]]), false)} stroke="#46566b" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d={spline(P([[534, 850], [516, 930], [488, 1060]]), false)} stroke="#0a0708" strokeWidth="15" fill="none" strokeLinecap="round" />
      <path d={spline(P([[534, 850], [516, 930], [488, 1060]]), false)} stroke="#5a6c84" strokeWidth="9" fill="none" strokeLinecap="round" />
      <rect x="414" y="1040" width="96" height="52" rx="6" fill="#dfe4ea" stroke="#0a0708" strokeWidth="3" /><rect x="424" y="1050" width="22" height="30" fill="#5b6f86" /><path d="M454 1056 L498 1056 M454 1068 L488 1068" stroke="#0a0708" strokeWidth="3" opacity="0.7" />
      <path d={spline(P([[330, 866], [250, 890], [140, 922], [60, 970]]), false)} fill="none" stroke="#f0a64a" strokeWidth="5" opacity="0.6" strokeLinecap="round" />
    </g>
  );
}

export type DirectorExpression = "neutral" | "pressure" | "uncertain";

/** Head-and-shoulders of the Operations Director, 800 x 1000. */
export function DirectorPortrait({ expression = "pressure", title = "The Operations Director" }: { expression?: DirectorExpression; title?: string }) {
  const ex = EXPRESSIONS[expression];
  return (
    <svg className="portrait portrait--director" viewBox="0 0 800 1000" role="img" aria-label={`${title}, ${expression}`} data-expression={expression}>
      <g transform="translate(0 -78)"><Body /></g>
      <g transform="translate(446 0) scale(0.9 1) translate(-446 0)"><Face spec={DIRECTOR} ex={ex} /><Hair /></g>
    </svg>
  );
}
