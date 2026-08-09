// Deterministic seeded randomness + value noise for procedural generation.

function strHash(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seed) {
    this.seedStr = String(seed);
    this.next = mulberry32(strHash(this.seedStr));
  }
  float() { return this.next(); }
  range(a, b) { return a + (b - a) * this.next(); }
  int(n) { return (this.next() * n) | 0; }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[(this.next() * arr.length) | 0]; }
  angle() { return this.next() * Math.PI * 2; }
  fork(label) { return new Rng(this.seedStr + ':' + label); }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = (this.next() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

export function makeNoise2D(rng) {
  const perm = new Uint8Array(512);
  const base = [];
  for (let i = 0; i < 256; i++) base.push(i);
  const shuffled = rng.shuffle(base);
  for (let i = 0; i < 512; i++) perm[i] = shuffled[i & 255];

  const vals = (ix, iy) => perm[(perm[ix & 255] + iy) & 255] / 255;
  const fade = (t) => t * t * (3 - 2 * t);

  function noise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const u = fade(fx), v = fade(fy);
    const a = vals(ix, iy), b = vals(ix + 1, iy);
    const c = vals(ix, iy + 1), d = vals(ix + 1, iy + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function fbm(x, y, oct = 3) {
    let sum = 0, amp = 0.5, freq = 1, tot = 0;
    for (let i = 0; i < oct; i++) {
      sum += amp * noise(x * freq, y * freq);
      tot += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / tot;
  }

  return { noise, fbm };
}
