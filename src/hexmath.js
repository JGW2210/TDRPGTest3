// Axial hex grid math, pointy-top orientation. One global grid spans the whole system.

export const SQRT3 = Math.sqrt(3);
export const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

export const key = (q, r) => q + ',' + r;

export function parseKey(k) {
  const i = k.indexOf(',');
  return { q: +k.slice(0, i), r: +k.slice(i + 1) };
}

export function toWorld(q, r, s) {
  return { x: s * SQRT3 * (q + r / 2), z: s * 1.5 * r };
}

export function round(qf, rf) {
  const xf = qf, zf = rf, yf = -xf - zf;
  let rx = Math.round(xf), ry = Math.round(yf), rz = Math.round(zf);
  const dx = Math.abs(rx - xf), dy = Math.abs(ry - yf), dz = Math.abs(rz - zf);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}

export function toHex(x, z, s) {
  const r = z / (1.5 * s);
  const q = x / (SQRT3 * s) - r / 2;
  return round(q, r);
}

export function dist(q1, r1, q2 = 0, r2 = 0) {
  return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(q1 + r1 - q2 - r2)) / 2;
}

export function line(q1, r1, q2, r2) {
  const n = dist(q1, r1, q2, r2);
  const out = [];
  if (n === 0) return [{ q: q1, r: r1 }];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // tiny epsilon nudge avoids ties landing exactly on hex edges
    const qf = q1 + (q2 - q1) * t + 1e-6;
    const rf = r1 + (r2 - r1) * t + 1e-6;
    out.push(round(qf, rf));
  }
  return out;
}
