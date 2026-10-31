import { memo, useEffect, useMemo, useRef } from "react";
import type { Mood } from "./script";
import type { Mouth } from "./narrator";

/**
 * The Archivist: an original character, an elderly keeper of ledgers in a candle-lit library. Drawn as SVG and animated in code.
 * The mouth follows `getMouth()` (measured from the real audio); blinking, glances, brows, head and quill follow the mood of the scene.
 */
interface Face { browL: number; browR: number; tiltL: number; tiltR: number; smile: number; lean: number; look: number }
const FACES: Record<Mood, Face> = {
  calm:    { browL: 0,  browR: 0,  tiltL: 0,  tiltR: 0,  smile: 0.2,  lean: 0,  look: 0 },
  warm:    { browL: -3, browR: -3, tiltL: -3, tiltR: 3,  smile: 3.4,  lean: -2, look: 0 },
  pointed: { browL: -8, browR: 1,  tiltL: -4, tiltR: 5,  smile: -0.4, lean: 3,  look: 0 },
  grave:   { browL: 3,  browR: 3,  tiltL: 9,  tiltR: -9, smile: -2.6, lean: 5,  look: 0.5 },
};
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

function shelf(x: number, w: number, seed: number): { x: number; y: number; w: number; h: number; c: string }[] {
  const colours = ["#5b2a2a", "#2f4a45", "#6b4b2a", "#3a3f58", "#7a6a45", "#4a2f45", "#2b3a2f", "#6a3a2a", "#454a52"];
  let s = seed;
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const books: { x: number; y: number; w: number; h: number; c: string }[] = [];
  for (let row = 0; row < 5; row++) {
    let cx = x + 6;
    const base = 120 + row * 86;
    while (cx < x + w - 14) {
      const bw = 9 + rnd() * 13, bh = 52 + rnd() * 26;
      if (rnd() > 0.1) books.push({ x: cx, y: base - bh, w: bw, h: bh, c: colours[Math.floor(rnd() * colours.length)] });
      cx += bw + 1 + (rnd() > 0.85 ? 8 : 0);
    }
  }
  return books;
}

const SHELVES = [-428, -202, 24, 552, 778, 1004];
const MOTES = Array.from({ length: 16 }, (_, i) => ({ x: -300 + ((i * 97) % 1500), y: 120 + ((i * 53) % 330), r: 1 + (i % 3) * 0.7, d: 7 + (i % 5) * 2.3, o: (i * 0.9) % 6 }));

export const Archivist = memo(function Archivist({ mood, getMouth, turn, active }: { mood: Mood; getMouth: () => Mouth; turn: number; active: boolean }) {
  const books = useMemo(() => SHELVES.flatMap((x, i) => shelf(x, 232, 7 + i * 13)), []);
  const moodRef = useRef(mood); moodRef.current = mood;
  const r = useRef<Record<string, SVGElement | null>>({});
  const ref = (k: string) => (el: SVGElement | null) => { r.current[k] = el; };
  const pageRef = useRef<SVGGElement | null>(null);

  useEffect(() => {                                              // a page turns whenever the scene changes
    const p = pageRef.current;
    if (!p || turn === 0) return;
    p.classList.remove("turning"); void (p as unknown as HTMLElement).getBoundingClientRect?.(); p.classList.add("turning");
  }, [turn]);

  useEffect(() => {
    const cur: Face & { gesture: number; lid: number; ox: number; oy: number; wide: number } = { ...FACES.calm, gesture: 0, lid: 0.12, ox: 0, oy: 0, wide: 0 };
    let frame = 0, nextBlink = performance.now() + 2200, blinkUntil = 0, nextGlance = performance.now() + 1600, tx = 0, ty = 0;
    const calm = () => (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) || document.documentElement.dataset.reduceMotion === "true";
    const set = (k: string, a: string, v: string | number) => r.current[k]?.setAttribute(a, String(v));
    const tick = (now: number) => {
      const reduce = calm();
      const f = FACES[moodRef.current];
      const m = getMouth();
      for (const k of ["browL", "browR", "tiltL", "tiltR", "smile", "lean", "look"] as const) cur[k] = lerp(cur[k], f[k], 0.07);
      const talking = m.open > 0.05;
      const g = moodRef.current === "pointed" || moodRef.current === "grave" ? (talking ? 1 : 0.35) : moodRef.current === "warm" ? (talking ? 0.35 : 0) : 0;
      cur.gesture = lerp(cur.gesture, reduce ? 0 : g, 0.045);
      // blink and glance
      if (now > nextBlink) { blinkUntil = now + 130; nextBlink = now + 2400 + Math.random() * 3200; }
      if (now > nextGlance) { tx = (Math.random() - 0.5) * 5; ty = (Math.random() - 0.3) * 2.6; nextGlance = now + 1300 + Math.random() * 2400; }
      const wantLid = now < blinkUntil ? 1 : 0.12 + cur.look * 0.18;
      cur.lid = lerp(cur.lid, wantLid, now < blinkUntil ? 0.7 : 0.35);
      cur.ox = lerp(cur.ox, tx * (reduce ? 0 : 1), 0.18); cur.oy = lerp(cur.oy, ty + cur.look * 3, 0.18);
      for (const [side, cx] of [["L", 368], ["R", 432]] as const) {
        set(`lid${side}`, "ry", 11 * cur.lid); set(`lid${side}`, "cy", 238 - 11 + 11 * cur.lid);
        set(`pupil${side}`, "transform", `translate(${cur.ox.toFixed(2)},${cur.oy.toFixed(2)})`);
        set(`brow${side}`, "transform", `translate(0,${(side === "L" ? cur.browL : cur.browR).toFixed(2)}) rotate(${(side === "L" ? cur.tiltL : cur.tiltR).toFixed(2)} ${cx} 208)`);
      }
      // the mouth, drawn from how open and how wide the audio says it is
      const w = 12 + m.wide * 8 - m.open * 3, h = m.open * 14, c = -cur.smile;
      const mp = `M ${-w} ${c} Q 0 ${-2.2 - h * 0.35} ${w} ${c} Q 0 ${2.4 + h * 1.35} ${-w} ${c} Z`;
      set("mouth", "d", mp); set("mouthClip", "d", mp); set("lips", "d", mp);
      set("teeth", "y", c - 3); set("teeth", "opacity", h > 3 ? 1 : 0);
      set("tongue", "cy", c + h * 0.9); set("tongue", "rx", w * 0.55); set("tongue", "ry", Math.max(0.1, h * 0.28));
      set("jaw", "transform", `translate(0,${(m.open * 5.5).toFixed(2)})`);
      set("stache", "transform", `translate(0,${(-m.open * 1.2).toFixed(2)})`);
      // the head leans toward the listener, nods slightly with the voice
      const sway = reduce ? 0 : Math.sin(now / 2600) * 0.9;
      set("head", "transform", `translate(0,${(cur.lean + m.open * 1.6).toFixed(2)}) rotate(${(sway + cur.tiltL * 0.05).toFixed(2)} 400 380)`);
      // the quill hand lifts to make a point
      const ex = 250, ey = 488, wx = 280 - cur.gesture * 40, wy = 526 - cur.gesture * 108;
      set("sleeveL", "d", `M ${ex} ${ey} L ${wx} ${wy}`);
      const aim = (Math.atan2(wx - ex, -(wy - ey)) * 180) / Math.PI;                 // the hand continues the line of the forearm
      set("handL", "transform", `translate(${wx.toFixed(1)},${wy.toFixed(1)}) rotate(${aim.toFixed(1)})`);
      const hold = lerp(158, -6, cur.gesture) + (reduce ? 0 : Math.sin(now / 900) * 1.4 * (1 - cur.gesture));
      const slide = lerp(0, -42, cur.gesture);                                        // the quill slides in the grip: nib out to write, nib tucked in to make a point
      set("quill", "transform", `rotate(${hold.toFixed(1)} 0 -30) translate(0 ${slide.toFixed(1)})`);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [getMouth]);

  return (
    <svg className={`arch${active ? " arch--speaking" : ""}`} viewBox="200 20 1200 580" role="img" aria-label="The Archivist, an elderly keeper of ledgers, sits at a desk in a candle-lit library" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="a-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1b1612" /><stop offset="1" stopColor="#2c2118" /></linearGradient>
        <linearGradient id="a-win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#35507a" /><stop offset="1" stopColor="#16233a" /></linearGradient>
        <linearGradient id="a-desk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a3020" /><stop offset="1" stopColor="#24160e" /></linearGradient>
        <radialGradient id="a-lamp" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ffd28a" stopOpacity="0.85" /><stop offset="0.35" stopColor="#f0a24a" stopOpacity="0.3" /><stop offset="1" stopColor="#f0a24a" stopOpacity="0" /></radialGradient>
        <radialGradient id="a-vig" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.55" /></radialGradient>
        <linearGradient id="a-coat" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#1f1d27" /><stop offset="0.5" stopColor="#34313f" /><stop offset="1" stopColor="#1f1d27" /></linearGradient>
        <radialGradient id="a-skin" cx="0.45" cy="0.4" r="0.7"><stop offset="0" stopColor="#d9a67e" /><stop offset="1" stopColor="#b97f58" /></radialGradient>
        <clipPath id="a-mclip"><path ref={ref("mouthClip") as never} d="" /></clipPath>
      </defs>

      <g transform="translate(400 0)">
      <rect x="-400" width="1600" height="600" fill="url(#a-wall)" />
      {/* tall window behind the head, cool light against the warm room */}
      <path d="M290 340V150Q290 40 400 40Q510 40 510 150V340Z" fill="url(#a-win)" stroke="#0e0a07" strokeWidth="8" />
      <path d="M400 40V340M290 190H510M290 270H510" stroke="#0e0a07" strokeWidth="4" />
      <g opacity="0.5" fill="#cfe0ff"><circle cx="330" cy="100" r="1.6" /><circle cx="450" cy="76" r="1.3" /><circle cx="478" cy="128" r="1.5" /><circle cx="352" cy="164" r="1.2" /></g>
      {/* shelves */}
      {SHELVES.map((x) => <rect key={x} x={x} y="48" width="226" height="424" fill="#150f0b" />)}
      {books.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill={b.c} stroke="#0d0907" strokeWidth="0.8" />)}
      {[0, 1, 2, 3, 4].flatMap((row) => SHELVES.map((x) => <rect key={`${row}${x}`} x={x} y={120 + row * 86} width="226" height="6" fill="#3a2616" />))}
      {/* the lantern */}
      <line x1="660" y1="0" x2="660" y2="56" stroke="#2a1d12" strokeWidth="3" />
      <circle className="arch-glow" cx="660" cy="86" r="170" fill="url(#a-lamp)" />
      <path d="M646 62h28l8 16v22q-22 10-44 0V78z" fill="#2a1d12" stroke="#c98a3a" strokeWidth="2" /><ellipse cx="660" cy="88" rx="10" ry="14" fill="#ffd9a0" />

      {/* the Archivist */}
      <g>
        <path d="M232 520L246 462Q252 414 330 398L372 386H428L470 398Q548 414 554 462L568 520Z" fill="url(#a-coat)" />
        <path d="M372 386L400 470L428 386L418 392L400 440L382 392Z" fill="#6c2433" />
        <path d="M356 392L400 520L444 392L428 386L400 470L372 386Z" fill="#7b2a3b" /><path d="M360 392L400 440L440 392L428 386L400 430L372 386Z" fill="#efe8da" />
        {[430, 462, 494].map((y) => <circle key={y} cx="400" cy={y} r="3" fill="#c9a24a" />)}
        <path d="M372 386L338 408L350 440L392 420Z" fill="#26232e" stroke="#15131a" strokeWidth="1.5" /><path d="M428 386L462 408L450 440L408 420Z" fill="#26232e" stroke="#15131a" strokeWidth="1.5" />
        <path d="M372 386Q400 408 428 386L424 372Q400 392 376 372Z" fill="#efe8da" />
        <path d="M388 392L400 412L412 392L400 384Z" fill="#8c2f45" />
        <rect x="370" y="330" width="60" height="62" fill="#b97f58" />
        <path d="M370 372Q400 392 430 372V392H370Z" fill="#8f5f40" opacity="0.5" />
        <g ref={ref("head")}>
          {/* hair behind the ears: silver, swept back and worn to the collar */}
          <g fill="#aeb2ba"><path d="M330 196C300 214 286 262 290 312C292 338 306 356 324 362C318 344 322 322 330 304C336 274 334 238 340 212Z" /><path d="M470 196C500 214 514 262 510 312C508 338 494 356 476 362C482 344 478 322 470 304C464 274 466 238 460 212Z" /></g>
          <g fill="none" stroke="#8d919a" strokeWidth="1.6" opacity="0.7" strokeLinecap="round"><path d="M318 224C304 252 300 292 308 332M326 232C316 262 314 296 320 336" /><path d="M482 224C496 252 500 292 492 332M474 232C484 262 486 296 480 336" /></g>
          <ellipse cx="320" cy="262" rx="12" ry="22" fill="#c48d65" /><ellipse cx="480" cy="262" rx="12" ry="22" fill="#c48d65" />
          <path d="M322 235C322 170 360 148 400 148C440 148 478 170 478 235C478 300 462 350 400 364C338 350 322 300 322 235Z" fill="url(#a-skin)" />
          {/* the hair: a receding, swept-back mane with a widow's peak, sideburns, strands and a few stray wisps */}
          <path d="M316 254C296 174 338 106 400 106C462 106 504 174 484 254C482 234 478 214 466 198C458 188 446 181 432 178C420 186 410 194 400 204C390 194 380 186 368 178C354 181 342 188 334 198C322 214 318 234 316 254Z" fill="#dadde2" />
          <path d="M316 254C312 272 314 292 322 308C326 294 326 278 330 264L330 242Z" fill="#cfd2d8" /><path d="M484 254C488 272 486 292 478 308C474 294 474 278 470 264L470 242Z" fill="#cfd2d8" />
          <g fill="none" strokeLinecap="round">
            <g stroke="#a9adb6" strokeWidth="2.4" opacity="0.85"><path d="M352 184C342 156 358 126 392 112" /><path d="M374 178C368 150 382 124 410 110" /><path d="M400 202C398 162 410 130 432 112" /><path d="M426 180C432 150 446 126 466 124" /><path d="M334 200C320 170 328 134 362 116" /><path d="M466 198C480 168 470 134 442 116" /><path d="M318 236C306 206 308 160 340 130" /><path d="M482 236C494 206 492 160 460 130" /></g>
            <g stroke="#ffffff" strokeWidth="1.7" opacity="0.6"><path d="M358 182C350 158 364 132 396 118" /><path d="M380 178C376 152 390 128 416 116" /><path d="M432 182C438 154 450 132 470 130" /><path d="M342 196C330 170 340 140 368 124" /></g>
            <path d="M334 198C344 187 356 181 368 178C380 186 390 194 400 204C410 194 420 186 432 178C444 181 456 187 466 198" stroke="#9b9fa9" strokeWidth="3" opacity="0.55" />
            <g stroke="#d6d9de" strokeWidth="2.2"><path d="M372 112C366 102 358 98 350 100" /><path d="M432 110C440 100 450 98 458 102" /><path d="M404 106C406 96 414 90 422 90" /><path d="M334 134C326 128 318 128 312 132" /></g>
          </g>
          {/* eyes */}
          {([["L", 368], ["R", 432]] as const).map(([s, cx]) => (
            <g key={s}>
              <ellipse cx={cx} cy="238" rx="17" ry="11" fill="#f4eee4" />
              <g ref={ref(`pupil${s}`)}><circle cx={cx} cy="239" r="7.4" fill="#2f5a63" /><circle cx={cx} cy="239" r="3.6" fill="#0c1416" /><circle cx={cx - 2.4} cy="236.4" r="1.6" fill="#fff" /></g>
              <ellipse ref={ref(`lid${s}`)} cx={cx} cy="228" rx="18" ry="1.3" fill="#bd8660" />
              <path d={`M${cx - 18} 232Q${cx} 224 ${cx + 18} 232`} stroke="#8d5a3d" strokeWidth="2" fill="none" />
            </g>
          ))}
          <path d="M400 252C396 272 388 286 385 292Q400 302 415 292C412 286 404 272 400 252Z" fill="#c4875f" stroke="#a96d48" strokeWidth="1.5" />
          <path d="M330 262Q336 290 352 306M470 262Q464 290 448 306" stroke="#a96d48" strokeWidth="2" fill="none" opacity="0.5" />
          {/* spectacles */}
          <g fill="#cfe6ff" fillOpacity="0.1" stroke="#c9a24a" strokeWidth="3.2"><circle cx="368" cy="238" r="26" /><circle cx="432" cy="238" r="26" /></g>
          <path d="M394 236Q400 230 406 236M342 232L322 228M458 232L478 228" stroke="#c9a24a" strokeWidth="3" fill="none" />
          <path d="M352 224Q362 218 372 220" stroke="#fff" strokeWidth="2" opacity="0.5" fill="none" />
          {/* brows */}
          <g ref={ref("browL")}><path d="M342 210Q366 196 392 207" stroke="#d6d9de" strokeWidth="8" strokeLinecap="round" fill="none" /></g>
          <g ref={ref("browR")}><path d="M458 210Q434 196 408 207" stroke="#d6d9de" strokeWidth="8" strokeLinecap="round" fill="none" /></g>
          {/* mouth, moustache, goatee */}
          <g transform="translate(400 322)">
            <g ref={ref("jaw")}>
              <path d="M-26 20Q0 66 26 20Q12 40 0 42Q-12 40 -26 20Z" fill="#d6d9de" />
              <path ref={ref("mouth") as never} d="" fill="#3a1418" />
              <g clipPath="url(#a-mclip)"><rect ref={ref("teeth") as never} x="-24" y="-3" width="48" height="6" fill="#f3ece0" /><ellipse ref={ref("tongue")} cx="0" cy="3" rx="6" ry="1" fill="#b5524f" /></g>
              <path ref={ref("lips") as never} d="" fill="none" stroke="#9c4a46" strokeWidth="3.2" strokeLinejoin="round" />
            </g>
            <g ref={ref("stache")}><path d="M0 -14C-14 -24-34 -20-44 -6C-30 -10-14 -6 0 -9C14 -6 30 -10 44 -6C34 -20 14 -24 0 -14Z" fill="#d6d9de" stroke="#aeb1b8" strokeWidth="1" /></g>
          </g>
        </g>
      </g>

      {/* the desk, the ledger, the candle */}
      <rect x="-400" y="508" width="1600" height="92" fill="url(#a-desk)" /><rect x="-400" y="508" width="1600" height="5" fill="#7a5233" opacity="0.7" />
      <g>
        <path d="M244 534L400 522V586L244 596Z" fill="#e9dfc7" stroke="#8c7a55" strokeWidth="2" /><path d="M556 534L400 522V586L556 596Z" fill="#efe6cf" stroke="#8c7a55" strokeWidth="2" />
        <g stroke="#8a7a55" strokeWidth="1.6" opacity="0.65">{[0, 1, 2, 3].map((i) => <path key={i} d={`M262 ${548 + i * 10}L384 ${538 + i * 10}M418 ${538 + i * 10}L538 ${548 + i * 10}`} />)}</g>
        <g ref={pageRef} className="arch-page"><path d="M400 522L556 534V596L400 586Z" fill="#f4ecd7" stroke="#8c7a55" strokeWidth="2" /></g>
        <path d="M400 522L400 586" stroke="#6b5a3a" strokeWidth="3" />
      </g>
      <g><rect x="92" y="520" width="92" height="22" fill="#5b2a2a" stroke="#1d0f0f" strokeWidth="2" /><rect x="100" y="540" width="84" height="22" fill="#2f4a45" stroke="#0f1d1b" strokeWidth="2" /></g>
      <g><rect x="652" y="500" width="26" height="40" rx="3" fill="#e8dcc0" /><g className="arch-flame"><path d="M665 468Q652 486 665 498Q678 486 665 468Z" fill="#ffb347" /><path d="M665 480Q660 488 665 494Q670 488 665 480Z" fill="#fff2c4" /></g></g>
      {/* arms and hands, drawn over the desk. The quill hand points along its forearm; the quill is held in a pen grip. */}
      <path ref={ref("sleeveL")} d="M250 488L280 526" stroke="#2a2833" strokeWidth="46" strokeLinecap="round" fill="none" />
      <g ref={ref("handL")}>
        <path d="M-15 -3C-19 -17-19 -31-15 -41C-8 -47 8 -47 15 -41C19 -31 19 -17 15 -3Z" fill="#c48d65" stroke="#a46a46" strokeWidth="1.5" />
        <rect x="-21" y="-3" width="42" height="17" rx="7" fill="#efe8da" stroke="#cfc6b2" strokeWidth="1.3" />
        <g ref={ref("quill")}>
          <path d="M-3 24L5 -70" stroke="#a8987a" strokeWidth="6" strokeLinecap="round" /><path d="M-3 24L5 -70" stroke="#f1e8d0" strokeWidth="3.8" strokeLinecap="round" />
          <path d="M-5.6 18L-3 33L-0.4 18Z" fill="#241a12" />
          <path d="M5 -70C16 -88 20 -110 14 -136C34 -120 40 -94 28 -76C22 -70 12 -68 5 -70Z" fill="#f6efdc" stroke="#b3a37c" strokeWidth="1.4" />
          <path d="M5 -70C13 -92 16 -116 14 -136" fill="none" stroke="#b3a37c" strokeWidth="1.4" />
          <path d="M10 -86L26 -96M12 -100L30 -110M13 -114L26 -124M8 -78L24 -84" stroke="#cdbf9a" strokeWidth="1" fill="none" />
        </g>
        <g stroke="#a46a46" strokeWidth="1.3" fill="#c48d65" strokeLinejoin="round">
          <rect x="-15" y="-19" width="30" height="9.5" rx="4.7" /><rect x="-15.5" y="-28" width="31" height="9.5" rx="4.7" /><rect x="-16" y="-37" width="32" height="9.5" rx="4.7" /><rect x="-16" y="-46" width="32" height="9.5" rx="4.7" />
          <path d="M-12 -12C-22 -20-22 -34-12 -44C-8 -46-3 -43-5 -39C-9 -33-9 -26-8 -20Z" />
        </g>
        <g stroke="#a46a46" strokeWidth="1" fill="none" opacity="0.8" strokeLinecap="round"><path d="M10 -41L10 -38M10 -32L10 -29M9 -23L9 -20M8 -14L8 -11" /><path d="M-14 -36C-10 -34-8 -30-8 -26" /></g>
      </g>
      <path d="M542 482L506 526" stroke="#2a2833" strokeWidth="46" strokeLinecap="round" />
      <g transform="translate(506 526) rotate(219)">
        <rect x="-21" y="-3" width="42" height="17" rx="7" fill="#efe8da" stroke="#cfc6b2" strokeWidth="1.3" />
        <path d="M-16 -3C-20 -16-19 -28-15 -36L15 -36C19 -28 20 -16 16 -3Z" fill="#c48d65" stroke="#a46a46" strokeWidth="1.5" />
        <g fill="#c48d65" stroke="#a46a46" strokeWidth="1.4" strokeLinecap="round">
          <rect x="-15" y="-60" width="7.4" height="28" rx="3.7" transform="rotate(-6 -11 -32)" /><rect x="-6" y="-66" width="7.6" height="33" rx="3.8" /><rect x="3" y="-64" width="7.6" height="31" rx="3.8" /><rect x="11.5" y="-56" width="7" height="25" rx="3.5" transform="rotate(8 15 -32)" />
          <path d="M-14 -10C-24 -16-27 -28-22 -37C-18 -40-14 -36-15 -31C-16 -24-12 -20-8 -18Z" />
        </g>
      </g>

      <g className="arch-motes" fill="#ffe2b0">{MOTES.map((m, i) => <circle key={i} cx={m.x} cy={m.y} r={m.r} style={{ animationDuration: `${m.d}s`, animationDelay: `-${m.o}s` }} />)}</g>
      </g>
      <rect width="1600" height="600" fill="url(#a-vig)" pointerEvents="none" />
    </svg>
  );
});
