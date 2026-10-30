// Generates the placeholder art set + manifest.json into public/assets.
// Run:  npm run assets      (safe to re-run; output is deterministic)
//
// These are original, hand-built vector placeholders in ONE consistent style (navy / steel /
// amber, layered silhouettes with a rim light). Swap any file for final artwork of the same
// name and size; the manifest and renderer need no changes.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "assets");
const P = {
  ink: "#070b14", navy: "#0b1220", deep: "#101a2b", charcoal: "#1a2230", slate: "#232e40",
  steel: "#2f4560", steelL: "#4a6a8a", grey: "#8a97a6", mist: "#c5cfdb", amber: "#e8a33d",
  orange: "#d9742b", teal: "#3f7f86",
};

const write = (rel, text) => {
  const f = join(OUT, rel);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, text.trim() + "\n");
};
const n = (v) => Math.round(v * 10) / 10;
const svg = (w, h, body, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">\n<defs>${defs}</defs>\n${body}\n</svg>`;
const rect = (x, y, w, h, fill, extra = "") => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}" ${extra}/>`;
const poly = (pts, fill, extra = "") => `<polygon points="${pts.map((p) => p.map(n).join(",")).join(" ")}" fill="${fill}" ${extra}/>`;
const line = (x1, y1, x2, y2, stroke, w = 2, extra = "") => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${stroke}" stroke-width="${w}" ${extra}/>`;
const circ = (x, y, r, fill, extra = "") => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${fill}" ${extra}/>`;
const lin = (id, c1, c2, vertical = true) => `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;
const rad = (id, c, a = 0.8) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${a}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
const VIGNETTE_DEFS = `<radialGradient id="vg" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="${P.ink}" stop-opacity="0"/><stop offset="1" stop-color="${P.ink}" stop-opacity="0.78"/></radialGradient>`;
const vignette = (w, h) => rect(0, 0, w, h, "url(#vg)");
const glow = (x, y, r, color, a = 0.7) => circ(x, y, r, color, `opacity="${a}" filter="url(#blur)"`);
const BLUR = `<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>`;

// bilinear point on a quad (tl, tr, br, bl)
const bil = (q, u, v) => {
  const top = [q[0][0] + (q[1][0] - q[0][0]) * u, q[0][1] + (q[1][1] - q[0][1]) * u];
  const bot = [q[3][0] + (q[2][0] - q[3][0]) * u, q[3][1] + (q[2][1] - q[3][1]) * u];
  return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v];
};
const quad = (q, u1, v1, u2, v2) => [bil(q, u1, v1), bil(q, u2, v1), bil(q, u2, v2), bil(q, u1, v2)];

const W = 1600, H = 900;

// ------------------------------------------------------------------ environments
function rackSide(left, boxColors) {
  const q = left ? [[0, 40], [560, 290], [560, 540], [0, 900]] : [[1600, 40], [1040, 290], [1040, 540], [1600, 900]];
  let s = poly(q, P.charcoal) + poly(q, "none", `stroke="${P.steel}" stroke-width="3"`);
  for (let i = 1; i < 5; i++) s += line(...bil(q, 0, i / 5), ...bil(q, 1, i / 5), P.steelL, 3, 'opacity="0.7"');
  for (let i = 0; i <= 8; i++) s += line(...bil(q, i / 8, 0), ...bil(q, i / 8, 1), P.steel, 2, 'opacity="0.6"');
  let k = 0;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row * 7 + col * 3) % 4 === 0) continue;
      const c = boxColors[(row + col + k++) % boxColors.length];
      const u1 = col / 8 + 0.012, u2 = (col + 1) / 8 - 0.012, v2 = (row + 1) / 5 - 0.01, v1 = v2 - 0.15 - ((row * col) % 3) * 0.02;
      s += poly(quad(q, u1, v1, u2, v2), c, 'stroke="#0006" stroke-width="1"');
    }
  }
  return s;
}
function warehouse_floor() {
  const defs = lin("wall", P.deep, P.slate) + lin("floor", "#202b3c", P.ink) + rad("hz", P.steelL, 0.55) + VIGNETTE_DEFS + BLUR;
  let b = rect(0, 0, W, H, "url(#wall)") + poly([[0, 900], [1600, 900], [1600, 540], [0, 540]], "url(#floor)");
  b += rect(560, 290, 480, 250, P.charcoal) + rect(560, 290, 480, 250, "none", `stroke="${P.steel}" stroke-width="2"`);
  for (let i = 0; i < 4; i++) b += rect(580 + i * 118, 330, 100, 190, "#141d2c", `stroke="${P.steel}" stroke-width="2"`);
  b += rackSide(true, [P.amber, "#7f6a45", P.steelL, P.grey, P.orange]) + rackSide(false, [P.steelL, P.amber, P.grey, "#7f6a45", P.mist]);
  for (let i = 0; i < 6; i++) { const t = i / 5, w = 360 - t * 260, y = 20 + t * 150; b += rect(800 - w / 2, y, w, 8 - t * 4, P.mist, 'opacity="0.9"') + glow(800, y + 6, w / 2.4, P.steelL, 0.22); }
  for (const x of [-420, -140, 140, 420]) b += line(800 + x * 0.12, 545, 800 + x * 2.2, 900, P.amber, 3, 'stroke-dasharray="26 22" opacity="0.55"');
  b += circ(800, 470, 320, "url(#hz)") + vignette(W, H);
  return svg(W, H, b, defs);
}
function control_room() {
  const defs = lin("wall", P.navy, P.charcoal) + rad("scr", P.steelL, 0.7) + VIGNETTE_DEFS + BLUR;
  let b = rect(0, 0, W, H, "url(#wall)");
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    const x = 160 + c * 340, y = 110 + r * 230, alert = (r * 4 + c) % 5 === 2;
    b += glow(x + 150, y + 90, 170, alert ? P.orange : P.steelL, 0.25);
    b += rect(x, y, 300, 180, "#0a111d", `stroke="${P.steel}" stroke-width="6"`) + rect(x + 10, y + 10, 280, 160, alert ? "#2a1a12" : "#10243a");
    let pts = ""; for (let i = 0; i <= 10; i++) pts += `${x + 24 + i * 25},${y + 140 - ((i * 37 + r * 19 + c * 11) % 70)} `;
    b += `<polyline points="${pts}" fill="none" stroke="${alert ? P.orange : P.amber}" stroke-width="3"/>`;
    for (let i = 0; i < 4; i++) b += rect(x + 24, y + 28 + i * 12, 60 + ((i * 17 + c * 9) % 80), 4, alert ? P.orange : P.steelL, 'opacity="0.6"');
  }
  b += poly([[0, 900], [1600, 900], [1600, 700], [0, 760]], "#0d1522") + poly([[0, 760], [1600, 700], [1600, 720], [0, 780]], P.steel);
  for (let i = 0; i < 9; i++) b += rect(80 + i * 170, 735 - (i % 3) * 3, 110, 12, "#152033") + circ(110 + i * 170, 745, 4, i % 4 === 0 ? P.orange : P.steelL);
  b += rect(0, 0, W, 60, "#080d18") + rect(120, 20, 1360, 8, P.mist, 'opacity="0.55"') + vignette(W, H);
  return svg(W, H, b, defs);
}
function electrical_area() {
  const defs = lin("wall", P.navy, "#182235") + `<pattern id="haz" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="30" height="60" fill="${P.amber}"/><rect x="30" width="30" height="60" fill="${P.ink}"/></pattern>` + rad("lamp", P.amber, 0.5) + VIGNETTE_DEFS + BLUR;
  let b = rect(0, 0, W, H, "url(#wall)");
  for (let i = 0; i < 3; i++) b += rect(0, 90 + i * 28, W, 10, "#0a0f19") + rect(0, 94 + i * 28, W, 3, P.steel, 'opacity="0.6"');
  for (let i = 0; i < 7; i++) {
    const x = 60 + i * 220;
    b += rect(x, 250, 190, 500, "#1d2838", `stroke="${P.steel}" stroke-width="4"`) + line(x + 95, 250, x + 95, 750, P.ink, 4);
    b += rect(x + 12, 280, 70, 90, "#111a28") + rect(x + 108, 280, 70, 90, "#111a28");
    for (let k = 0; k < 4; k++) b += circ(x + 30 + k * 40, 420, 6, (i + k) % 5 === 0 ? P.orange : k % 2 ? P.steelL : P.amber, (i + k) % 5 === 0 ? 'filter="url(#blur)" opacity="0.9"' : 'opacity="0.8"');
    b += rect(x + 80, 500, 8, 70, P.grey) + rect(x + 102, 500, 8, 70, P.grey);
  }
  b += rect(0, 750, W, 150, "#0c131f") + poly([[0, 800], [W, 800], [W, 840], [0, 840]], "url(#haz)", 'opacity="0.85"');
  b += glow(1180, 200, 280, P.orange, 0.18) + glow(430, 100, 200, P.amber, 0.14) + vignette(W, H);
  return svg(W, H, b, defs);
}
function loading_dock() {
  const defs = lin("wall", P.deep, P.slate) + lin("wet", "#1b2638", P.ink) + rad("lamp", P.amber, 0.7) + VIGNETTE_DEFS + BLUR;
  let b = rect(0, 0, W, H, "url(#wall)") + rect(0, 620, W, 280, "url(#wet)");
  for (let i = 0; i < 3; i++) {
    const x = 90 + i * 510, open = i === 1;
    b += rect(x, 160, 440, 460, "#0c1320", `stroke="${P.steel}" stroke-width="6"`);
    if (open) {
      b += rect(x + 40, 260, 360, 360, "#080c14") + rect(x + 70, 290, 300, 300, "#2a3547") + rect(x + 70, 290, 300, 300, "none", `stroke="${P.grey}" stroke-width="3"`);
      b += rect(x + 90, 540, 40, 18, P.orange) + rect(x + 310, 540, 40, 18, P.orange) + glow(x + 110, 548, 50, P.orange, 0.7) + glow(x + 330, 548, 50, P.orange, 0.7);
      b += rect(x, 160, 440, 110, P.steelL, 'opacity="0.9"');
    } else {
      for (let k = 0; k < 14; k++) b += rect(x + 8, 170 + k * 32, 424, 26, k % 2 ? "#26334a" : "#2d3d58");
    }
    b += circ(x + 220, 130, 10, P.amber) + glow(x + 220, 130, 90, P.amber, 0.5);
  }
  for (const x of [60, 780, 1540]) b += rect(x - 12, 600, 24, 60, P.amber) + rect(x - 12, 620, 24, 10, P.ink);
  for (let i = 0; i < 5; i++) b += rect(100 + i * 330, 700 + (i % 2) * 40, 160, 6, P.amber, 'opacity="0.18"');
  b += rect(540, 650, 520, 230, "url(#wet)", 'opacity="0.6"') + vignette(W, H);
  return svg(W, H, b, defs);
}
function ops_office() {
  const defs = lin("sky", "#0a1325", "#1b2b45") + lin("desk", "#1a2434", P.ink) + VIGNETTE_DEFS + BLUR;
  let b = rect(0, 0, W, H, "url(#sky)");
  for (let i = 0; i < 26; i++) {
    const w = 50 + ((i * 53) % 70), h = 120 + ((i * 97) % 300), x = i * 64 - 20, y = 560 - h;
    b += rect(x, y, w, h + 200, i % 2 ? "#0f1a2c" : "#132136");
    for (let r = 0; r < h / 26; r++) for (let c = 0; c < w / 20; c++) if ((i * 13 + r * 7 + c * 5) % 6 === 0) b += rect(x + 6 + c * 18, y + 8 + r * 24, 8, 10, P.amber, 'opacity="0.75"');
  }
  for (let i = 0; i < 9; i++) b += rect(i * 200 - 4, 0, 8, 620, "#05080f");
  b += rect(0, 0, W, 40, "#05080f") + rect(0, 612, W, 14, "#05080f");
  b += poly([[0, 626], [W, 626], [W, 900], [0, 900]], "#0b121e") + poly([[120, 700], [1480, 700], [1560, 900], [40, 900]], "url(#desk)");
  b += rect(560, 400, 480, 200, "#0b1220", `stroke="${P.steel}" stroke-width="6"`);
  for (let i = 0; i < 6; i++) b += rect(590 + i * 70, 560 - (30 + ((i * 41) % 110)), 44, 30 + ((i * 41) % 110), i === 3 ? P.orange : P.steelL, 'opacity="0.85"');
  b += glow(800, 500, 260, P.steelL, 0.22) + circ(250, 120, 40, P.amber, 'opacity="0.9"') + glow(250, 120, 140, P.amber, 0.35) + vignette(W, H);
  return svg(W, H, b, defs);
}
function hospital_corridor() {
  const defs = lin("fl", "#243545", "#0b121c") + rad("lt", P.mist, 0.6) + VIGNETTE_DEFS + BLUR;
  const vp = [800, 440];
  let b = rect(0, 0, W, H, "#16222f");
  b += poly([[0, 0], [W, 0], [1040, 330], [560, 330]], "#1f2f3f") + poly([[0, H], [W, H], [1040, 560], [560, 560]], "url(#fl)");
  b += poly([[0, 0], [560, 330], [560, 560], [0, H]], "#26394b") + poly([[W, 0], [1040, 330], [1040, 560], [W, H]], "#223445");
  b += rect(560, 330, 480, 230, "#0d1620");
  for (let i = 0; i < 5; i++) { const t = i / 5, y = 6 + t * 270, w = 520 - t * 400; b += rect(800 - w / 2, y, w, 18 - t * 12, P.mist, 'opacity="0.92"') + glow(800, y + 8, w / 2.2, P.mist, 0.18); }
  for (const left of [true, false]) for (let i = 0; i < 3; i++) {
    const q = left ? [[0, 0], [560, 330], [560, 560], [0, H]] : [[W, 0], [1040, 330], [1040, 560], [W, H]];
    const u = 0.1 + i * 0.3, d = poly(quad(q, u, 0.22, u + 0.13, 0.9), "#0f1a26", `stroke="${P.grey}" stroke-width="3"`);
    b += d + poly(quad(q, u + 0.03, 0.3, u + 0.1, 0.45), P.teal, 'opacity="0.55"');
  }
  b += rect(740, 345, 120, 36, P.teal, 'opacity="0.9"') + rect(792, 351, 16, 24, P.mist) + rect(784, 359, 32, 8, P.mist);
  b += circ(800, 450, 160, P.mist, 'opacity="0.1" filter="url(#blur)"') + vignette(W, H);
  void vp;
  return svg(W, H, b, defs);
}
function flooded_highway() {
  const defs = lin("sky", "#0a111e", "#25364f") + lin("water", "#1d2c42", "#05080e") + lin("road", "#20293a", "#121a27") + VIGNETTE_DEFS + BLUR;
  let b = rect(0, 0, W, H, "url(#sky)");
  for (let i = 0; i < 6; i++) b += rect(0, 40 + i * 55, W, 22 + (i % 3) * 8, "#0b1322", `opacity="${0.35 + (i % 3) * 0.1}"`);
  for (let i = 0; i < 18; i++) b += rect(i * 96, 400 - ((i * 61) % 90), 60, 200, "#0d1626");
  b += poly([[0, 560], [W, 560], [W, 480], [0, 480]], "#0e1827");
  b += poly([[700, 480], [900, 480], [1480, 900], [120, 900]], "url(#road)");
  for (let i = 0; i < 7; i++) { const t = i / 7, y = 500 + t * 340; b += rect(795 - t * 18, y, 10 + t * 28, 14 + t * 22, P.amber, 'opacity="0.55"'); }
  b += poly([[0, 640], [W, 640], [W, 900], [0, 900]], "url(#water)", 'opacity="0.93"');
  for (let i = 0; i < 16; i++) b += rect(120 + ((i * 211) % 1400), 650 + i * 14, 80 + ((i * 53) % 220), 3, i % 3 ? P.steelL : P.amber, 'opacity="0.42"');
  for (const x of [330, 1270]) { b += rect(x, 180, 12, 480, "#05080f") + rect(x - 40, 170, 90, 12, "#05080f") + circ(x - 36, 188, 12, P.amber) + glow(x - 36, 190, 120, P.amber, 0.5); b += rect(x - 70, 700, 160, 5, P.amber, 'opacity="0.35"'); }
  for (let i = 0; i < 10; i++) { const t = i / 10; b += rect(690 - t * 560, 480 + t * 330, 8 + t * 14, 40 + t * 60, "#0c121d") + rect(910 + t * 540, 480 + t * 330, 8 + t * 14, 40 + t * 60, "#0c121d"); }
  b += vignette(W, H);
  return svg(W, H, b, defs);
}
function alt_depot() {
  const defs = lin("sky", "#091020", "#1a2740") + lin("gr", "#18222f", P.ink) + rad("fl", P.mist, 0.5) + VIGNETTE_DEFS + BLUR;
  let b = rect(0, 0, W, H, "url(#sky)") + rect(0, 640, W, 260, "url(#gr)");
  b += rect(160, 230, 1280, 420, "#141f30", `stroke="${P.steel}" stroke-width="4"`) + rect(140, 205, 1320, 32, "#0a111d");
  for (let i = 0; i < 4; i++) { const x = 230 + i * 300; b += rect(x, 340, 240, 310, "#0d1522"); for (let k = 0; k < 10; k++) b += rect(x + 4, 344 + k * 30, 232, 24, k % 2 ? "#233149" : "#1f2b41"); b += rect(x + 100, 300, 40, 14, i === 2 ? P.orange : P.amber) + glow(x + 120, 307, 70, i === 2 ? P.orange : P.amber, 0.5); }
  for (let i = 0; i < 7; i++) { const x = 40 + i * 70, y = 600 - (i % 2) * 70; b += rect(x, y, 66, 66, i % 3 ? P.steel : "#7f6a45", 'stroke="#0007" stroke-width="2"'); }
  for (let i = 0; i < 6; i++) b += rect(1130 + i * 72, 580 - (i % 3) * 66, 68, 66, i % 2 ? P.steelL : P.steel, 'stroke="#0007" stroke-width="2"');
  for (const x of [120, 1480]) { b += rect(x, 120, 10, 520, "#05080f") + rect(x - 30, 110, 70, 16, P.mist) + `<polygon points="${x - 28},126 ${x + 38},126 ${x + 180},640 ${x - 170},640" fill="${P.mist}" opacity="0.08"/>`; }
  for (let i = 0; i < 28; i++) b += line(i * 58, 700, i * 58, 880, "#0a0f18", 2) ;
  b += rect(0, 720, W, 6, "#0a0f18") + rect(300, 780, 1000, 6, P.steelL, 'opacity="0.25"') + vignette(W, H);
  return svg(W, H, b, defs);
}
function press_scene() {
  const defs = lin("bg", "#080d18", "#1a2236") + rad("bk1", P.amber, 0.65) + rad("bk2", P.mist, 0.5) + VIGNETTE_DEFS + BLUR;
  let b = rect(0, 0, W, H, "url(#bg)");
  b += rect(420, 120, 760, 520, "#101a2a", `stroke="${P.steel}" stroke-width="5"`) + rect(450, 150, 330, 480, "#c88b38", 'opacity="0.55"') + rect(800, 150, 350, 480, "#e0a850", 'opacity="0.5"');
  b += rect(780, 150, 20, 480, "#05080f") + glow(790, 400, 280, P.amber, 0.35);
  b += poly([[0, 900], [W, 900], [W, 650], [0, 650]], "#0b101b") + poly([[300, 650], [1300, 650], [1500, 900], [100, 900]], "#121a29");
  for (let i = 0; i < 22; i++) { const x = (i * 197) % 1500 + 40, y = 120 + ((i * 131) % 380), r = 14 + (i * 7) % 34; b += circ(x, y, r, i % 3 ? "url(#bk2)" : "url(#bk1)"); }
  for (let i = 0; i < 7; i++) { const x = 120 + i * 220, h = 120 + (i % 3) * 40; b += rect(x - 6, 900 - h, 12, h, "#030509") + `<ellipse cx="${x}" cy="${900 - h - 20}" rx="26" ry="32" fill="#030509"/>`; }
  b += line(0, 690, 1600, 640, P.amber, 4, 'stroke-dasharray="40 24" opacity="0.7"') + vignette(W, H);
  return svg(W, H, b, defs);
}
const ENVIRONMENTS = {
  warehouse_floor: [warehouse_floor, "Rows of storage racks receding under overhead strip lights."],
  control_room: [control_room, "Monitor wall with trend lines and a few amber alerts."],
  electrical_area: [electrical_area, "Switchgear cabinets, cable trays and hazard striping."],
  loading_dock: [loading_dock, "Roller doors, one open onto a truck, wet concrete."],
  ops_office: [ops_office, "Night skyline through floor-to-ceiling glass, ops desk."],
  hospital_corridor: [hospital_corridor, "Cool one-point-perspective hospital corridor."],
  flooded_highway: [flooded_highway, "Highway disappearing under floodwater, rain and lamplight."],
  alt_depot: [alt_depot, "Alternate depot yard with floodlights and stacked containers."],
  press_scene: [press_scene, "Night entrance ringed with camera lights and microphones."],
};

// ------------------------------------------------------------------ characters
const CHARS = {
  player: { name: "Operations Director", role: "You", skin: "#c9967a", hair: "#15151d", cloth: "#16233a", accent: P.amber },
  kavya: { name: "Kavya Rao", role: "Safety Chief", skin: "#8c5a3c", hair: "#0d0d12", cloth: "#232c3b", accent: P.orange },
  arjun: { name: "Arjun Mehta", role: "IT & Systems Lead", skin: "#b57a55", hair: "#0d0d12", cloth: P.steel, accent: P.steelL },
  nisha: { name: "Nisha Sen", role: "Finance Director", skin: "#a96b4c", hair: "#0d0d12", cloth: "#222a38", accent: P.amber },
  raghav: { name: "Raghav Verma", role: "Logistics Manager", skin: "#9a6446", hair: "#6b727c", cloth: "#3a4450", accent: P.orange },
  isha: { name: "Dr. Isha Kapoor", role: "Hospital Liaison", skin: "#c08a6a", hair: "#0d0d12", cloth: "#dfe6ee", accent: P.teal },
};
const EXPRESSIONS = ["calm", "worried", "angry", "surprised", "determined", "exhausted", "speaking", "pointing"];
// brows: [lx1,ly1,lx2,ly2, rx1,ry1,rx2,ry2]; eye ry; mouth path or ellipse
const EXPR = {
  calm: { brow: [222, 258, 282, 255, 318, 255, 378, 258], eye: 14, mouth: "M272 380 Q300 386 328 380" },
  worried: { brow: [222, 262, 282, 244, 318, 244, 378, 262], eye: 15, mouth: "M272 390 Q300 374 328 390" },
  angry: { brow: [220, 242, 282, 264, 318, 264, 380, 242], eye: 11, mouth: "M268 388 Q300 372 332 388" },
  surprised: { brow: [222, 238, 282, 232, 318, 232, 378, 238], eye: 20, mouthEllipse: [300, 388, 15, 22] },
  determined: { brow: [220, 250, 282, 259, 318, 259, 380, 250], eye: 11, mouth: "M268 382 L332 382" },
  exhausted: { brow: [222, 262, 282, 262, 318, 262, 378, 262], eye: 14, lid: true, mouth: "M276 388 Q300 392 324 388", bags: true },
  speaking: { brow: [222, 255, 282, 251, 318, 251, 378, 255], eye: 14, mouthEllipse: [300, 384, 24, 15] },
  pointing: { brow: [222, 251, 282, 247, 318, 247, 378, 251], eye: 15, mouthEllipse: [300, 384, 13, 8], point: true },
};
function portrait(id, c, ex) {
  const e = EXPR[ex];
  const defs = `<linearGradient id="sk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.skin}"/><stop offset="1" stop-color="${shade(c.skin, -34)}"/></linearGradient>` +
    `<linearGradient id="cl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(c.cloth, 14)}"/><stop offset="1" stop-color="${shade(c.cloth, -22)}"/></linearGradient>`;
  let b = "";
  if (id === "nisha") b += `<path d="M190 280 Q170 520 205 640 L250 560 L350 560 L395 640 Q430 520 410 280 Z" fill="${c.hair}"/>`;
  // torso
  b += `<path d="M30 800 L80 610 Q110 540 220 520 L380 520 Q490 540 520 610 L570 800 Z" fill="url(#cl)"/>`;
  b += `<path d="M30 800 L80 610 Q110 540 220 520" fill="none" stroke="${P.amber}" stroke-width="3" opacity="0.5"/>`;
  if (e.point) b += `<path d="M470 610 Q540 560 560 470" fill="none" stroke="${shade(c.cloth, 6)}" stroke-width="58" stroke-linecap="round"/><circle cx="562" cy="452" r="26" fill="${c.skin}"/><path d="M562 440 L600 392" stroke="${c.skin}" stroke-width="15" stroke-linecap="round"/>`;
  // neck + collar
  b += `<rect x="262" y="400" width="76" height="130" rx="30" fill="${shade(c.skin, -26)}"/>`;
  if (id === "isha") b += `<path d="M215 524 L300 640 L385 524 L340 520 L300 580 L260 520 Z" fill="${P.teal}"/><path d="M240 520 Q300 700 360 520" fill="none" stroke="${P.grey}" stroke-width="7"/><circle cx="300" cy="716" r="18" fill="${P.grey}"/>`;
  else if (id === "kavya") b += `<path d="M120 800 L150 600 L225 530 L260 800 Z M480 800 L450 600 L375 530 L340 800 Z" fill="${P.orange}"/><rect x="132" y="680" width="120" height="16" fill="${P.mist}" opacity="0.9" transform="skewY(-8)"/><rect x="348" y="680" width="120" height="16" fill="${P.mist}" opacity="0.9" transform="skewY(8)"/>`;
  else if (id === "arjun") b += `<path d="M205 540 Q300 600 395 540 L420 600 Q300 660 180 600 Z" fill="${shade(c.cloth, 22)}"/><path d="M270 600 L262 700 M330 600 L338 700" stroke="${P.mist}" stroke-width="4"/>`;
  else if (id === "nisha") b += `<path d="M225 526 L300 650 L375 526 L340 520 L300 590 L260 520 Z" fill="#e9edf3"/><circle cx="300" cy="668" r="9" fill="${P.amber}"/>`;
  else if (id === "raghav") b += `<path d="M225 526 L300 600 L375 526 Z" fill="#cfd6df"/><path d="M200 520 L240 800 M400 520 L360 800" stroke="${P.amber}" stroke-width="6" opacity="0.8"/><rect x="430" y="600" width="46" height="74" rx="8" fill="#0d1218"/><rect x="442" y="612" width="22" height="10" fill="${P.amber}"/>`;
  else b += `<path d="M225 526 L300 620 L375 526 Z" fill="#cfd6df"/><path d="M300 560 L300 640" stroke="${P.amber}" stroke-width="5"/><circle cx="196" cy="640" r="12" fill="${P.amber}"/>`;
  // head
  const tilt = ex === "exhausted" ? ' transform="rotate(5 300 420)"' : "";
  b += `<g${tilt}>`;
  b += `<ellipse cx="300" cy="300" rx="108" ry="134" fill="url(#sk)"/>`;
  b += `<ellipse cx="192" cy="310" rx="14" ry="30" fill="${shade(c.skin, -18)}"/><ellipse cx="408" cy="310" rx="14" ry="30" fill="${shade(c.skin, -34)}"/>`;
  // hair / headwear
  if (id === "kavya") b += `<path d="M184 262 Q190 140 300 132 Q410 140 416 262 L396 252 Q300 214 204 252 Z" fill="#e9edf2"/><rect x="176" y="250" width="248" height="14" rx="6" fill="#cfd6df"/><rect x="288" y="132" width="24" height="120" fill="${P.amber}"/><path d="M200 262 Q190 330 205 340 L210 270 Z M400 262 Q410 330 395 340 L390 270 Z" fill="${c.hair}"/>`;
  else if (id === "isha") b += `<path d="M190 280 Q180 150 300 140 Q420 150 410 280 Q380 190 300 190 Q220 190 190 280 Z" fill="${c.hair}"/><circle cx="300" cy="136" r="38" fill="${c.hair}"/>`;
  else if (id === "nisha") b += `<path d="M186 290 Q176 150 300 140 Q424 150 414 290 Q384 188 300 190 Q216 188 186 290 Z" fill="${c.hair}"/>`;
  else if (id === "arjun") b += `<path d="M188 280 Q178 140 300 136 Q422 140 412 280 Q392 210 340 200 Q300 230 250 200 Q206 214 188 280 Z" fill="${c.hair}"/>`;
  else if (id === "raghav") b += `<path d="M192 270 Q196 160 300 156 Q404 160 408 270 Q380 214 300 212 Q220 214 192 270 Z" fill="${c.hair}"/><path d="M214 360 Q300 470 386 360 Q380 420 300 440 Q220 420 214 360 Z" fill="${c.hair}" opacity="0.5"/>`;
  else b += `<path d="M190 276 Q184 150 300 144 Q416 150 410 276 Q380 200 300 198 Q220 200 190 276 Z" fill="${c.hair}"/>`;
  // eyes
  for (const cx of [255, 345]) {
    b += `<ellipse cx="${cx}" cy="292" rx="25" ry="${e.eye}" fill="#f1f3f6"/><circle cx="${cx + (ex === "pointing" ? 5 : 0)}" cy="292" r="${Math.min(10, e.eye - 2)}" fill="#1b140f"/><circle cx="${cx + 3}" cy="288" r="3" fill="#fff" opacity="0.8"/>`;
    if (e.lid) b += `<path d="M${cx - 26} 292 Q${cx} ${292 - e.eye - 2} ${cx + 26} 292 L${cx + 26} 278 L${cx - 26} 278 Z" fill="${shade(c.skin, -8)}"/><path d="M${cx - 26} 292 Q${cx} 296 ${cx + 26} 292" stroke="${shade(c.skin, -60)}" stroke-width="2" fill="none"/>`;
    if (e.bags) b += `<ellipse cx="${cx}" cy="316" rx="26" ry="8" fill="#2b1a1a" opacity="0.28"/>`;
  }
  const br = e.brow;
  b += `<path d="M${br[0]} ${br[1]} L${br[2]} ${br[3]}" stroke="${c.hair}" stroke-width="11" stroke-linecap="round"/><path d="M${br[4]} ${br[5]} L${br[6]} ${br[7]}" stroke="${c.hair}" stroke-width="11" stroke-linecap="round"/>`;
  if (id === "arjun") b += `<circle cx="255" cy="292" r="33" fill="none" stroke="${P.mist}" stroke-width="5"/><circle cx="345" cy="292" r="33" fill="none" stroke="${P.mist}" stroke-width="5"/><line x1="288" y1="290" x2="312" y2="290" stroke="${P.mist}" stroke-width="5"/>`;
  b += `<path d="M300 300 Q288 346 304 352" stroke="${shade(c.skin, -52)}" stroke-width="4" fill="none" opacity="0.7"/>`;
  if (e.mouthEllipse) { const [mx, my, rx, ry] = e.mouthEllipse; b += `<ellipse cx="${mx}" cy="${my}" rx="${rx}" ry="${ry}" fill="#2a0f12"/><ellipse cx="${mx}" cy="${my + ry * 0.45}" rx="${rx * 0.6}" ry="${ry * 0.4}" fill="#8a3a3a"/>`; }
  else b += `<path d="${e.mouth}" stroke="#3a1a1a" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  if (ex === "angry" || ex === "determined") b += `<path d="M262 252 L258 276 M338 252 L342 276" stroke="${shade(c.skin, -50)}" stroke-width="3" opacity="0.6"/>`;
  b += `<path d="M408 220 Q430 300 400 380" stroke="${P.amber}" stroke-width="5" fill="none" opacity="0.4"/></g>`;
  return svg(600, 800, b, defs);
}
function shade(hex, amt) {
  const v = parseInt(hex.slice(1), 16);
  const f = (s) => Math.max(0, Math.min(255, ((v >> s) & 255) + amt));
  return "#" + [16, 8, 0].map((s) => f(s).toString(16).padStart(2, "0")).join("");
}

// ------------------------------------------------------------------ ui
const logo = svg(64, 64, `<rect width="64" height="64" rx="14" fill="${P.navy}"/><path d="M36 8 L16 36 H30 L26 56 L48 26 H34 Z" fill="${P.amber}"/>`);
const grain = svg(200, 200, `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0"/></filter><rect width="200" height="200" filter="url(#g)"/>`);
const halftone = svg(12, 12, `<circle cx="3" cy="3" r="1.3" fill="#fff"/><circle cx="9" cy="9" r="1.3" fill="#fff"/>`);

// ------------------------------------------------------------------ manifest
const EFFECT_DOCS = {
  smoke: "Drifting smoke plumes rising from the lower panel.",
  sparks: "Short-lived orange sparks and a flash.",
  warning_lights: "Pulsing amber warning glow at the panel edges.",
  rain: "Diagonal rain streaks.",
  power_failure: "Dark overlay with a flickering dropout.",
  damaged_inventory: "Torn crate and scattered box silhouettes along the lower edge.",
  system_alert: "Scan lines and an alert triangle.",
  emergency_lighting: "Red-amber emergency tint with pulsing corner lamps.",
};
const manifest = { version: 1, generator: "tools/generate-assets.mjs", environments: {}, characters: {}, effects: {}, ui: {} };
for (const [id, [fn, description]] of Object.entries(ENVIRONMENTS)) {
  write(`environments/${id}.svg`, fn());
  manifest.environments[id] = { path: `environments/${id}.svg`, width: W, height: H, description, status: "placeholder" };
}
for (const [id, c] of Object.entries(CHARS)) {
  const expressions = {};
  for (const ex of EXPRESSIONS) { write(`characters/${id}_${ex}.svg`, portrait(id, c, ex)); expressions[ex] = `characters/${id}_${ex}.svg`; }
  manifest.characters[id] = { name: c.name, role: c.role, width: 600, height: 800, expressions, description: `${c.name}, ${c.role}. Bust portrait, transparent background.`, status: "placeholder" };
}
for (const [id, description] of Object.entries(EFFECT_DOCS)) manifest.effects[id] = { kind: "component", component: "EffectOverlay", description };
write("ui/logo-mark.svg", logo); write("ui/grain.svg", grain); write("ui/halftone.svg", halftone);
manifest.ui = { logo_mark: { path: "ui/logo-mark.svg" }, grain: { path: "ui/grain.svg" }, halftone: { path: "ui/halftone.svg" } };
write("manifest.json", JSON.stringify(manifest, null, 2));

// verify every path in the manifest exists
const missing = [];
const check = (p) => { if (!existsSync(join(OUT, p))) missing.push(p); };
Object.values(manifest.environments).forEach((e) => check(e.path));
Object.values(manifest.characters).forEach((c) => Object.values(c.expressions).forEach(check));
Object.values(manifest.ui).forEach((u) => check(u.path));
if (missing.length) { console.error("Missing assets:", missing); process.exit(1); }
console.log(`assets ok: ${Object.keys(manifest.environments).length} environments, ${Object.keys(CHARS).length * EXPRESSIONS.length} character poses, ${Object.keys(manifest.effects).length} effects`);
