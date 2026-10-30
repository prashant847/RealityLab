import { useId } from "react";
import { add, pt, ribbon, rng, spline, type Pt } from "./draw";

// A face drawn from anatomical landmarks. The two characters share only this construction; every landmark, tone, line
// and wrinkle comes from the character's own spec, so they are different people, not one face with a new colour.
// Light comes from the right (a screen) with warm rim light from the left; the face is turned slightly to the right.

export interface Palette { skin: string; mid: string; deep: string; light: string; lip: string; hair: string; iris: string; ink: string; cool: string }

export interface EyeSpec { c: Pt; w: number; open: number; tilt: number }
export interface FaceSpec {
  palette: Palette;
  contour: Pt[];                          // closed outline of the face
  terminator: Pt[];                       // edge of the shadow on the near (left) side, top to bottom
  ear: Pt[];                              // near ear, closed
  near: EyeSpec; far: EyeSpec;
  nearBrow: Pt[]; farBrow: Pt[];          // inner end to outer end
  browThick: number;
  nose: { bridge: Pt; mid: Pt; tip: Pt; nearAla: Pt; farAla: Pt; base: number };
  mouth: { c: Pt; w: number };
  chin: Pt;
  age: { forehead: number; nasolabial: number; crow: number; bags: number };
  stubble: number;                        // 0..1
  beard: Pt[]; jawShade: Pt[]; lightForehead: Pt[]; lightCheek: Pt[]; lightChin: Pt[]; hollow: Pt[];
  foreheadY: number;                      // y of the lowest forehead line
}

/** Everything that changes with the character's state of mind. */
export interface Expression {
  browInner: number;                      // px, negative lifts the inner ends (worry)
  browOuter: number;                      // px, positive lowers the outer ends
  browLift: number;                       // px, negative lifts the whole brow
  browGap: number;                        // px the inner ends are drawn together
  lid: number;                            // 0 open .. 1 nearly closed
  wide: number;                           // 0..1 eyes widened
  gaze: Pt;                               // -1..1 each axis
  corner: number;                         // mouth corners: +down, -up (px)
  open: number;                           // mouth opening (px)
  press: number;                          // 0..1 lips pressed thin
  furrow: number;                         // 0..1 lines between the brows
  tension: number;                        // 0..1 jaw muscle and cheek tension
}

export const EXPRESSIONS: Record<string, Expression> = {
  neutral: { browInner: 0, browOuter: 0, browLift: 0, browGap: 0, lid: 0.12, wide: 0, gaze: [0.4, 0], corner: 0, open: 0, press: 0.2, furrow: 0, tension: 0.1 },
  concern: { browInner: -27, browOuter: 9, browLift: -6, browGap: 15, lid: 0.2, wide: 0.1, gaze: [0.85, 0.35], corner: 10, open: 0, press: 0.8, furrow: 1, tension: 0.75 },
  alarm: { browInner: -30, browOuter: -8, browLift: -20, browGap: 8, lid: 0, wide: 0.9, gaze: [0.9, 0.1], corner: 3, open: 13, press: 0, furrow: 0.6, tension: 0.8 },
  pressure: { browInner: 14, browOuter: -3, browLift: 4, browGap: 18, lid: 0.38, wide: 0, gaze: [0.5, 0.5], corner: 12, open: 0, press: 1, furrow: 1, tension: 1 },
  uncertain: { browInner: -24, browOuter: 8, browLift: -8, browGap: 10, lid: 0.3, wide: 0, gaze: [-0.95, 0.3], corner: 9, open: 0, press: 0.7, furrow: 0.7, tension: 0.7 },
};

const P = (a: number[][]): Pt[] => a as Pt[];

function eyePaths(e: EyeSpec, side: "near" | "far", ex: Expression) {
  const inner = side === "near" ? 1 : -1;
  const lidF = 1 - ex.lid * 0.6 + ex.wide * 0.35;
  const h = e.open * lidF;
  const [cx, cy] = e.c, w = e.w;
  const innerPt: Pt = [cx + inner * w * 0.5, cy + 3];
  const outerPt: Pt = [cx - inner * w * 0.5, cy - e.tilt];
  const upper = P([innerPt, [cx + inner * w * 0.3, cy - h * 0.72], [cx - inner * w * 0.02, cy - h], [cx - inner * w * 0.3, cy - h * 0.78], outerPt]);
  const lower = P([outerPt, [cx - inner * w * 0.26, cy + h * 0.5], [cx + inner * w * 0.04, cy + h * 0.6 + ex.wide * 3], [cx + inner * w * 0.3, cy + h * 0.42], innerPt]);
  return { upper, lower, innerPt, outerPt, h, inner };
}

function Eye({ e, side, ex, pal, uid }: { e: EyeSpec; side: "near" | "far"; ex: Expression; pal: Palette; uid: string }) {
  const { upper, lower, outerPt, innerPt, h, inner } = eyePaths(e, side, ex);
  const [cx, cy] = e.c;
  const shape = spline([...upper, ...lower.slice(1, -1)], true, 0.5);
  const irisR = e.w * 0.25;
  const ix = cx + ex.gaze[0] * e.w * 0.14, iy = cy + ex.gaze[1] * h * 0.3 - 1;
  const clip = `${uid}eye${side}`;
  const crease = upper.slice(1, 4).map((q) => add(q, 0, -(5 + h * 0.32) - ex.lid * 2));
  const creaseLine = spline([add(innerPt, inner * -1, -4 - ex.lid * 2), ...crease, add(outerPt, inner * 2, -7)], false, 0.5);
  return (
    <g>
      <defs><clipPath id={clip}><path d={shape} /></clipPath></defs>
      {/* eye socket shadow */}
      <ellipse cx={cx - inner * 4} cy={cy - 2} rx={e.w * 0.68} ry={h * 0.95 + 9} fill={pal.deep} opacity="0.2" />
      <path d={shape} fill="#e6dccd" />
      <g clipPath={`url(#${clip})`}>
        <rect x={cx - e.w} y={cy - h - 6} width={e.w * 2} height={h * 0.62 + 6} fill="#8a6a55" opacity="0.5" />
        <circle cx={ix} cy={iy} r={irisR} fill="#26170d" />
        <circle cx={ix} cy={iy} r={irisR * 0.82} fill={pal.iris} />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => { const a = (i / 7) * Math.PI * 2; return <line key={i} x1={ix + Math.cos(a) * irisR * 0.3} y1={iy + Math.sin(a) * irisR * 0.3} x2={ix + Math.cos(a) * irisR * 0.78} y2={iy + Math.sin(a) * irisR * 0.78} stroke="#6a4528" strokeWidth="1.4" opacity="0.7" />; })}
        <circle cx={ix} cy={iy} r={irisR * 0.42} fill="#05060a" />
        <circle cx={ix + irisR * 0.34} cy={iy - irisR * 0.38} r={irisR * 0.2} fill="#f4f1ea" opacity="0.92" />
        <ellipse cx={ix - irisR * 0.2} cy={iy + irisR * 0.45} rx={irisR * 0.28} ry={irisR * 0.12} fill="#fff" opacity="0.18" />
        <path d={spline(upper.map((q) => add(q, 0, h * 0.28)), false)} stroke="#000" strokeWidth={h * 0.6} fill="none" opacity="0.18" />
      </g>
      <path d={spline(lower, false)} fill="none" stroke={pal.ink} strokeWidth="2.2" opacity="0.7" strokeLinecap="round" />
      <path d={spline(upper, false)} fill="none" stroke={pal.ink} strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${outerPt[0]} ${outerPt[1]} q${-inner * 9} -2 ${-inner * 13} -7`} fill="none" stroke={pal.ink} strokeWidth="3.6" strokeLinecap="round" />
      {[0, 1, 2].map((i) => <path key={i} d={`M${upper[3 - 0][0] - inner * i * 4 + inner * 6} ${upper[3][1] + i * 2 - 1} l${-inner * 6} ${-6 - i * 1.5}`} stroke={pal.ink} strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />)}
      <path d={creaseLine} fill="none" stroke={pal.deep} strokeWidth="2.6" strokeLinecap="round" opacity="0.85" />
      {e.w > 0 && <path d={spline([add(lower[1], 0, 8), add(lower[2], 0, 11 + ex.lid * 2), add(lower[3], 0, 8)], false)} fill="none" stroke={pal.deep} strokeWidth="2.2" opacity="0.45" strokeLinecap="round" />}
    </g>
  );
}

function Brow({ pts, thick, ex, side, pal, seed }: { pts: Pt[]; thick: number; ex: Expression; side: "near" | "far"; pal: Palette; seed: number }) {
  const inner = side === "near" ? 1 : -1;
  const n = pts.length;
  const moved = pts.map((q, i) => {
    const k = i / (n - 1);
    return [q[0] - inner * ex.browGap * (1 - k) * 0.5, q[1] + ex.browLift + ex.browInner * (1 - k) + ex.browOuter * k] as Pt;
  });
  const th = moved.map((_, i) => { const k = i / (n - 1); return thick * (k < 0.5 ? 0.85 + k * 0.5 : 1.1 - (k - 0.5) * 1.5); });
  const r = rng(seed);
  const hairs = Array.from({ length: 16 }, (_, i) => {
    const k = (i + 0.5) / 16, idx = Math.min(n - 2, Math.floor(k * (n - 1)));
    const t = k * (n - 1) - idx;
    const a = pt(moved[idx], moved[idx + 1], t);
    const dir = (side === "near" ? -1 : 1) * 1;
    const len = 6 + r() * 6;
    return <path key={i} d={`M${a[0] + (r() - 0.5) * 4} ${a[1] + thick * 0.35} l${dir * -len * (side === "near" ? -1 : -1) * -0.6 + (r() - 0.5) * 2} ${-thick * 0.7 - r() * 3}`} stroke={pal.ink} strokeWidth="1.6" opacity="0.55" strokeLinecap="round" />;
  });
  return (
    <g>
      <path d={ribbon(moved, th)} fill={pal.hair} stroke={pal.ink} strokeWidth="1.2" />
      {hairs}
      <path d={spline(moved.map((q) => add(q, 0, -thick * 0.2)), false)} stroke={pal.cool} strokeWidth="1.8" opacity="0.28" fill="none" />
    </g>
  );
}

export function Face({ spec, ex }: { spec: FaceSpec; ex: Expression }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { palette: pal, near, far, nose, mouth } = spec;
  const faceClip = `${uid}face`, shadeClip = `${uid}shade`, hatch = `${uid}hatch`;
  const faceD = spline(spec.contour, true);
  const shadowD = spline([[200, 200], ...spec.terminator, [200, 800]], true, 0.4);
  const k = ex.tension;
  // brow ridge shadow over the eyes, cheek hollows, nose cast shadow, chin/jaw shadow
  const ridge = (e: EyeSpec, s: number) => spline([[e.c[0] - e.w * 0.7, e.c[1] - e.open - 14], [e.c[0], e.c[1] - e.open - 22], [e.c[0] + e.w * 0.7, e.c[1] - e.open - 12], [e.c[0] + e.w * 0.6, e.c[1] - 4], [e.c[0], e.c[1] - e.open - 3], [e.c[0] - e.w * 0.6, e.c[1] - 2]], true, 0.5 * s);
  // mouth
  const mc = mouth.c, mw = mouth.w;
  const nc: Pt = [mc[0] - mw * 0.55, mc[1] + 2 + ex.corner * 0.6], fc: Pt = [mc[0] + mw * 0.46, mc[1] + ex.corner * 0.55 - 1];
  const press = ex.press;
  const line = spline([nc, [mc[0] - mw * 0.24, mc[1] + 2 + press * 0.5], [mc[0], mc[1] + 3.5], [mc[0] + mw * 0.26, mc[1] + 2 + press * 0.3], fc], false);
  const rows = (n: number, y0: number, dy: number, x0: number, x1: number, amp: number, op: number) => Array.from({ length: n }, (_, i) => <path key={i} d={`M${x0} ${y0 + i * dy} Q${(x0 + x1) / 2} ${y0 + i * dy - amp} ${x1} ${y0 + i * dy + 1}`} stroke={pal.deep} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity={op} />);
  const R = rng(7);
  const bx = spec.beard.map((q) => q[0]), by = spec.beard.map((q) => q[1]);
  const bx0 = Math.min(...bx), bx1 = Math.max(...bx), by0 = Math.min(...by), by1 = Math.max(...by);
  const dots = Array.from({ length: 520 }, () => [bx0 + R() * (bx1 - bx0), by0 + R() * (by1 - by0)] as Pt);
  const jawShade = spline(spec.jawShade, true);
  return (
    <g>
      <defs>
        <clipPath id={faceClip}><path d={faceD} /></clipPath>
        <clipPath id={shadeClip}><path d={shadowD} /></clipPath>
        <pattern id={hatch} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(52)"><line x1="0" y1="0" x2="0" y2="9" stroke={pal.ink} strokeWidth="1.6" /></pattern>
        <clipPath id={`${uid}beard`}><path d={spline(spec.beard, true)} /></clipPath>
      </defs>
      {/* ear (near side) */}
      <path d={spline(spec.ear, true)} fill={pal.mid} stroke={pal.ink} strokeWidth="3" />
      <path d={spline([add(spec.ear[2], 4, 6), add(spec.ear[3], 6, 4), add(spec.ear[4], 4, 0), add(spec.ear[5], 2, -6)], false)} fill="none" stroke={pal.deep} strokeWidth="3" opacity="0.8" strokeLinecap="round" />
      {/* skin base and shading */}
      <path d={faceD} fill={pal.skin} />
      <g clipPath={`url(#${faceClip})`}>
        <path d={shadowD} fill={pal.mid} />
        <g clipPath={`url(#${shadeClip})`}>
          <rect x="200" y="200" width="400" height="600" fill={`url(#${hatch})`} opacity="0.13" />
          <path d={jawShade} fill={pal.deep} opacity="0.55" />
        </g>
        {/* light side: forehead, cheekbone, nose bridge catch the screen light */}
        <path d={spline(spec.lightForehead, true)} fill={pal.light} opacity="0.36" />
        <path d={spline(spec.lightCheek, true)} fill={pal.light} opacity="0.28" />
        <path d={spline(spec.lightChin, true)} fill={pal.light} opacity="0.22" />
        <path d={ridge(near, 1)} fill={pal.deep} opacity="0.4" /><path d={ridge(far, 1)} fill={pal.mid} opacity="0.55" />
        <path d={spline(spec.hollow, true)} fill={pal.deep} opacity="0.3" />
        {/* cheek / jaw tension */}
        
        {/* stubble: soft shadow and fine dots */}
        {spec.stubble > 0 && <g clipPath={`url(#${uid}beard)`}>
          <rect x="200" y="400" width="480" height="340" fill="#120b0a" opacity={0.1 + spec.stubble * 0.14} />
          {dots.map((d, i) => <circle key={i} cx={d[0]} cy={d[1]} r={1.3} fill="#0a0707" opacity={0.2 * spec.stubble + 0.08} />)}
        </g>}
      </g>
      {/* forehead lines and the furrow between the brows */}
      <g fill="none" strokeLinecap="round">
        {spec.age.forehead > 0 && rows(3, spec.foreheadY - 44 + ex.browLift * 0.5, 22, 330, 560, 6, 0.12 + spec.age.forehead * 0.18 + Math.max(0, -ex.browInner) * 0.012)}
        {ex.furrow > 0 && <>
          <path d={`M${near.c[0] + near.w * 0.55} ${near.c[1] - 52} q-3 20 1 38`} stroke={pal.deep} strokeWidth="3" opacity={0.4 + ex.furrow * 0.55} />
          <path d={`M${far.c[0] - far.w * 0.6} ${far.c[1] - 52} q3 20 -1 38`} stroke={pal.deep} strokeWidth="3" opacity={0.35 + ex.furrow * 0.5} />
          <path d={`M${(near.c[0] + far.c[0]) / 2 + 2} ${near.c[1] - 58} q2 14 -1 30`} stroke={pal.deep} strokeWidth="2.6" opacity={0.25 + ex.furrow * 0.45} />
        </>}
        <path d={`M${near.c[0] - near.w * 0.55} ${near.c[1] + 4} l-14 -4 M${near.c[0] - near.w * 0.58} ${near.c[1] + 12} l-15 2 M${near.c[0] - near.w * 0.55} ${near.c[1] + 20} l-12 7`} stroke={pal.deep} strokeWidth="2" opacity={spec.age.crow * (0.35 + k * 0.3)} />
        <path d={spline([add(nose.nearAla, -16, -14), [nose.nearAla[0] - 36, nose.nearAla[1] + 30], [mouth.c[0] - mouth.w * 0.7, mouth.c[1] - 14]], false)} stroke={pal.deep} strokeWidth="3" opacity={spec.age.nasolabial * (0.5 + k * 0.5)} />
        <path d={spline([add(nose.farAla, 14, -8), [nose.farAla[0] + 20, nose.farAla[1] + 26], [mouth.c[0] + mouth.w * 0.62, mouth.c[1] - 12]], false)} stroke={pal.deep} strokeWidth="2.4" opacity={spec.age.nasolabial * (0.35 + k * 0.4)} />
        {k > 0.3 && <path d={spline([[mouth.c[0] - 26, mouth.c[1] + 44], [mouth.c[0], mouth.c[1] + 38 - k * 3], [mouth.c[0] + 26, mouth.c[1] + 43]], false)} stroke={pal.deep} strokeWidth="2.4" opacity={0.25 + k * 0.35} />}
      </g>
      {/* eyes and brows */}
      <Eye e={near} side="near" ex={ex} pal={pal} uid={uid} />
      <Eye e={far} side="far" ex={ex} pal={pal} uid={uid} />
      <Brow pts={spec.nearBrow} thick={spec.browThick} ex={ex} side="near" pal={pal} seed={3} />
      <Brow pts={spec.farBrow} thick={spec.browThick * 0.95} ex={ex} side="far" pal={pal} seed={9} />
      {/* eye bags */}
      <path d={spline([add(near.c, -near.w * 0.45, near.open + 10), add(near.c, 0, near.open + 17 + spec.age.bags * 4), add(near.c, near.w * 0.5, near.open + 9)], false)} fill="none" stroke={pal.deep} strokeWidth="2.6" opacity={0.25 + spec.age.bags * 0.4} strokeLinecap="round" />
      <path d={spline([add(far.c, -far.w * 0.5, far.open + 9), add(far.c, 0, far.open + 15 + spec.age.bags * 3), add(far.c, far.w * 0.45, far.open + 8)], false)} fill="none" stroke={pal.deep} strokeWidth="2.4" opacity={0.2 + spec.age.bags * 0.35} strokeLinecap="round" />
      {/* nose */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={spline([[nose.bridge[0] - 6, nose.bridge[1]], [nose.mid[0] - 10, nose.mid[1]], [nose.nearAla[0] + 6, nose.nearAla[1] - 22], [nose.nearAla[0], nose.nearAla[1]]], false)} stroke={pal.ink} strokeWidth="3.2" opacity="0.7" />
        <path d={spline([add(nose.bridge, 24, 6), add(nose.mid, 22, 20), add(nose.tip, 18, -6)], false)} stroke={pal.light} strokeWidth="5" opacity="0.5" />
        <path d={spline([nose.nearAla, add(nose.nearAla, 12, 18), add(nose.tip, -14, 28), add(nose.tip, 18, 33), add(nose.farAla, -8, 24), nose.farAla], false)} stroke={pal.ink} strokeWidth="3.4" />
        <path d={spline([nose.farAla, add(nose.farAla, 12, -6), add(nose.farAla, 10, -24), add(nose.farAla, -6, -36)], false)} stroke={pal.ink} strokeWidth="2.8" opacity="0.85" />
      </g>
      <ellipse cx={nose.tip[0] - 3} cy={nose.tip[1] - 6} rx="12" ry="8" fill={pal.light} opacity="0.5" />
      <path d={spline([add(nose.nearAla, 2, 18), add(nose.tip, -24, 24), add(nose.tip, -8, 34), add(nose.nearAla, 16, 30)], true)} fill="#1a0e0a" opacity="0.85" />
      <path d={spline([add(nose.farAla, -22, 22), add(nose.farAla, -8, 22), add(nose.farAla, -4, 28), add(nose.farAla, -20, 31)], true)} fill="#1a0e0a" opacity="0.75" />
      <path d={spline([add(nose.nearAla, 10, 34), add(nose.tip, -6, 46), add(nose.farAla, -4, 38), add(nose.farAla, 6, 28), add(nose.tip, 12, 36)], true)} fill={pal.deep} opacity="0.45" />
      {/* mouth */}
      <path d={spline([nc, [mc[0] - mw * 0.3, mc[1] - 7 + press * 3], [mc[0] - mw * 0.1, mc[1] - 14 + press * 4], [mc[0], mc[1] - 10 + press * 3], [mc[0] + mw * 0.13, mc[1] - 14 + press * 4], [mc[0] + mw * 0.31, mc[1] - 7 + press * 3], fc, [mc[0] + mw * 0.26, mc[1] + 2], [mc[0], mc[1] + 3.5], [mc[0] - mw * 0.24, mc[1] + 2]], true)} fill={pal.lip} opacity={0.95 - press * 0.2} />
      {ex.open > 1 && <path d={spline([nc, [mc[0] - mw * 0.24, mc[1] + 3], [mc[0], mc[1] + 4], [mc[0] + mw * 0.26, mc[1] + 3], fc, [mc[0] + mw * 0.24, mc[1] + 3 + ex.open], [mc[0], mc[1] + 6 + ex.open], [mc[0] - mw * 0.22, mc[1] + 3 + ex.open]], true)} fill="#24100d" />}
      {ex.open > 4 && <path d={spline([[mc[0] - mw * 0.22, mc[1] + 4], [mc[0], mc[1] + 5], [mc[0] + mw * 0.24, mc[1] + 4], [mc[0] + mw * 0.2, mc[1] + 10], [mc[0], mc[1] + 11], [mc[0] - mw * 0.2, mc[1] + 10]], true)} fill="#e8e0d2" />}
      <path d={spline([nc, [mc[0] - mw * 0.26, mc[1] + 14 - press * 5 + ex.open], [mc[0], mc[1] + 19 - press * 7 + ex.open], [mc[0] + mw * 0.26, mc[1] + 13 - press * 5 + ex.open], fc, [mc[0] + mw * 0.25, mc[1] + 2 + ex.open * 0.9], [mc[0], mc[1] + 4 + ex.open], [mc[0] - mw * 0.25, mc[1] + 3 + ex.open * 0.9]], true)} fill={pal.lip} opacity={0.88 - press * 0.15} />
      <path d={spline([[mc[0] - mw * 0.14, mc[1] + 11 + ex.open], [mc[0], mc[1] + 14 + ex.open], [mc[0] + mw * 0.16, mc[1] + 11 + ex.open]], false)} stroke={pal.light} strokeWidth="3.4" opacity="0.4" fill="none" strokeLinecap="round" />
      <path d={spline([nc, [mc[0] - mw * 0.3, mc[1] - 7 + press * 3], [mc[0] - mw * 0.1, mc[1] - 14 + press * 4], [mc[0], mc[1] - 10 + press * 3], [mc[0] + mw * 0.13, mc[1] - 14 + press * 4], [mc[0] + mw * 0.31, mc[1] - 7 + press * 3], fc], false)} fill="none" stroke={pal.deep} strokeWidth="2.2" opacity="0.7" strokeLinecap="round" />
      <path d={spline([[nc[0] + 8, mc[1] + 8 + ex.open], [mc[0] - mw * 0.26, mc[1] + 15 - press * 5 + ex.open], [mc[0], mc[1] + 20 - press * 7 + ex.open], [mc[0] + mw * 0.26, mc[1] + 14 - press * 5 + ex.open], [fc[0] - 8, mc[1] + 7 + ex.open]], false)} fill="none" stroke={pal.deep} strokeWidth="2" opacity="0.55" strokeLinecap="round" />
      <path d={line} fill="none" stroke={pal.ink} strokeWidth={5.2 - press * 0.6} strokeLinecap="round" />
      <path d={`M${nc[0] - 4} ${nc[1] - 1} q-5 2 -7 7`} stroke={pal.deep} strokeWidth="2.4" fill="none" opacity="0.7" strokeLinecap="round" />
      <path d={`M${fc[0] + 3} ${fc[1] - 1} q5 3 6 8`} stroke={pal.deep} strokeWidth="2.2" fill="none" opacity="0.6" strokeLinecap="round" />
      <path d={spline([[mc[0] - 22, mc[1] + 32], [mc[0] + 2, mc[1] + 38 - ex.open * 0.2 + ex.open], [mc[0] + 28, mc[1] + 31]], false)} stroke={pal.deep} strokeWidth="9" opacity={0.18} fill="none" strokeLinecap="round" />
      {/* philtrum */}
      <path d={spline([add(nose.tip, 8, 44), [mc[0] - 4, mc[1] - 20]], false)} stroke={pal.deep} strokeWidth="2.4" opacity="0.3" fill="none" />
      {/* face contour: thin all round, heavy on the shadow side */}
      <path d={faceD} fill="none" stroke={pal.ink} strokeWidth="2.6" strokeLinejoin="round" />
      <path d={spline(spec.contour.slice(-9).concat(spec.contour.slice(0, 2)), false)} fill="none" stroke={pal.ink} strokeWidth="6" strokeLinecap="round" opacity="0.9" />
      <path d={spline(spec.contour.slice(10, 17), false)} fill="none" stroke={pal.ink} strokeWidth="4" strokeLinecap="round" opacity="0.9" />
    </g>
  );
}
