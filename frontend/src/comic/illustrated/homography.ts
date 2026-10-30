/** Maps a w x h rectangle (top-left origin) onto four points of a photograph: top-left, top-right, bottom-right, bottom-left.
 *  Returns a CSS matrix3d() so ordinary HTML laid out in that rectangle can sit on a screen photographed at an angle. */
export type Point = [number, number];

export function homographyMatrix3d(w: number, h: number, quad: [Point, Point, Point, Point]): string {
  const src: Point[] = [[0, 0], [w, 0], [w, h], [0, h]];
  // Solve for h11..h32 (h33 = 1) from 8 equations.
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = quad[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const n = 8;
  for (let c = 0; c < n; c++) {                                  // Gaussian elimination with partial pivoting
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c];
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
    x[r] = s / A[r][r];
  }
  const [a, bb, c, d, e, f, g, hh] = x;
  // CSS matrix3d is column-major: [a d 0 g, b e 0 h, 0 0 1 0, c f 0 1]
  return `matrix3d(${[a, d, 0, g, bb, e, 0, hh, 0, 0, 1, 0, c, f, 0, 1].map((v) => v.toFixed(8)).join(",")})`;
}

/** Applies the same mapping to a point, for tests and for checking a quad. */
export function mapPoint(m: string, x: number, y: number): Point {
  const v = m.slice(m.indexOf("(") + 1, -1).split(",").map(Number);
  const w = v[3] * x + v[7] * y + v[15];
  return [(v[0] * x + v[4] * y + v[12]) / w, (v[1] * x + v[5] * y + v[13]) / w];
}
