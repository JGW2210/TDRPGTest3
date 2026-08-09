// Procedural generation of the whole solar system on one global hex grid:
// orrery-ring area layout, broken-archipelago stamping, astral rivers with
// warden gates, stormwall rune-locks, leviathan rivers, and secret tide-paths.

import {
  HEX, RINGS, SECRET_RADIUS, BIOMES, SECRET_BIOMES, GATE_RUNES,
  WORLD_ADJ, WORLD_NOUN,
} from './config.js';
import { Rng, makeNoise2D } from './rng.js';
import * as Hx from './hexmath.js';

const TAU = Math.PI * 2;
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const angDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
};

export function generateWorld(seedStr) {
  const rng = new Rng(seedStr);
  const noise = makeNoise2D(rng.fork('noise'));

  const areas = [];
  const hexes = new Map(); // key "q,r" -> hex record
  const gates = [];
  const edges = [];
  const locks = [];
  const leviathans = [];

  // ---------------------------------------------------------------- layout
  function mkArea(biome, ring, pos, hexRadius) {
    const a = {
      id: areas.length, biome, ring, pos, hexRadius,
      hexKeys: [], secret: !!biome.secretHint,
      dread: biome.dread ?? ring / 4,
    };
    areas.push(a);
    return a;
  }

  const sun = mkArea(BIOMES[0], 0, { x: 0, z: 0 }, 12 + rng.int(3));

  const ringGroups = [[sun]];
  let biomeCursor = 1;
  for (let ri = 0; ri < RINGS.length; ri++) {
    const spec = RINGS[ri];
    const group = [];
    const slice = rng.shuffle(BIOMES.slice(biomeCursor, biomeCursor + spec.count));
    biomeCursor += spec.count;
    const base = rng.angle();
    for (let i = 0; i < spec.count; i++) {
      const ang = base + (i / spec.count) * TAU + rng.range(-0.16, 0.16) * (TAU / spec.count);
      const rad = spec.radius * rng.range(0.94, 1.06);
      const pos = { x: Math.cos(ang) * rad, z: Math.sin(ang) * rad };
      group.push(mkArea(slice[i], ri + 1, pos, 10 + rng.int(4)));
    }
    ringGroups.push(group);
  }

  const secretBase = rng.angle();
  const secretsList = [];
  for (let i = 0; i < SECRET_BIOMES.length; i++) {
    const ang = secretBase + (i / SECRET_BIOMES.length) * TAU + rng.range(-0.3, 0.3);
    const rad = rng.range(SECRET_RADIUS[0], SECRET_RADIUS[1]);
    const pos = { x: Math.cos(ang) * rad, z: Math.sin(ang) * rad };
    secretsList.push(mkArea(SECRET_BIOMES[i], 5, pos, 6 + rng.int(2)));
  }

  // ---------------------------------------------------------------- edges
  const edgeSet = new Set();
  function addEdge(a, b, faint = false) {
    const k = Math.min(a.id, b.id) + '-' + Math.max(a.id, b.id);
    if (edgeSet.has(k)) return null;
    edgeSet.add(k);
    const e = { a: a.id, b: b.id, faint };
    edges.push(e);
    return e;
  }
  const distA = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);

  for (let ri = 1; ri < ringGroups.length; ri++) {
    const inner = ringGroups[ri - 1];
    for (const area of ringGroups[ri]) {
      const sorted = inner.slice().sort((p, q) => distA(area, p) - distA(area, q));
      addEdge(area, sorted[0]);
      if (sorted[1] && rng.chance(0.3)) addEdge(area, sorted[1]);
    }
    const g = ringGroups[ri];
    for (let i = 0; i < g.length; i++) {
      if (g.length > 2 && !rng.chance(0.68)) continue;
      addEdge(g[i], g[(i + 1) % g.length]);
    }
  }
  const outerRing = ringGroups[ringGroups.length - 1];
  const secretEdges = [];
  for (const s of secretsList) {
    const near = outerRing.slice().sort((p, q) => distA(s, p) - distA(s, q))[0];
    const e = addEdge(s, near, true);
    if (e) secretEdges.push({ edge: e, secret: s, from: near });
  }

  // ---------------------------------------------------------------- stamping
  function setHex(q, r, rec) {
    const k = Hx.key(q, r);
    if (hexes.has(k)) return hexes.get(k);
    rec.q = q; rec.r = r;
    hexes.set(k, rec);
    return rec;
  }

  function stampArea(area) {
    const c = area.pos;
    const R = area.hexRadius;
    const ch = Hx.toHex(c.x, c.z, HEX);
    const clear = area.biome.bodyKind === 'sun' ? 4 : 3;
    const ns = rng.range(0, 900);
    const cracks = [];
    const nCracks = 3 + rng.int(3);
    for (let i = 0; i < nCracks; i++) cracks.push({ ang: rng.angle(), w: 0.14 + rng.float() * 0.2 });

    for (let dq = -R; dq <= R; dq++) {
      for (let dr = Math.max(-R, -dq - R); dr <= Math.min(R, -dq + R); dr++) {
        const d = Hx.dist(dq, dr);
        if (d <= clear) continue; // the nestling gap around the astral body
        const q = ch.q + dq, r = ch.r + dr;
        const p = Hx.toWorld(q, r, HEX);
        const nd = d / R;
        const ang = Math.atan2(p.z - c.z, p.x - c.x);

        let cut = false;
        for (const cr of cracks) {
          const wob = 0.6 + 0.8 * noise.fbm(p.x * 0.05 + ns, p.z * 0.05 - ns);
          if (Math.abs(angDiff(ang, cr.ang)) < cr.w * wob && nd > 0.32) { cut = true; break; }
        }
        if (cut) continue;

        // pothole voids keep the archipelago broken, not a solid disc
        const hole = noise.fbm(p.x * 0.09 - ns, p.z * 0.09 + ns * 3.1, 2);
        if (hole < 0.16) continue;

        const fall = 1 - smoothstep(0.6, 1.02, nd);
        const m = noise.fbm(p.x * 0.022 + ns, p.z * 0.022 + ns * 1.7, 3);
        const score = fall * (0.45 + 0.75 * m);
        if (score < 0.33) continue;

        const isleN = noise.fbm(p.x * 0.052 + ns * 2.3, p.z * 0.052 - ns, 3);
        const isle = score > 0.48 && isleN > 0.55 && nd > 0.14;

        // area waters circulate around the astral body (tangent current)
        const vx = p.x - c.x, vz = p.z - c.z;
        const vl = Math.hypot(vx, vz) || 1;
        const flow = [-vz / vl, vx / vl];

        const rec = setHex(q, r, {
          kind: isle ? 'isle' : 'water',
          areaId: area.id,
          elev: isle ? 0.7 + isleN * 1.6 : 0,
          flow, faint: false, blocked: false, levi: false,
          gateId: null, lockKey: null, river: false,
        });
        if (rec.areaId === area.id) area.hexKeys.push(Hx.key(q, r));
      }
    }
  }

  for (const area of areas) stampArea(area);

  // ---------------------------------------------------------------- rivers
  const worldOf = (h) => Hx.toWorld(h.q, h.r, HEX);

  function pickPort(area, toward) {
    const c = area.pos;
    let dirX = toward.x - c.x, dirZ = toward.z - c.z;
    const dl = Math.hypot(dirX, dirZ) || 1;
    dirX /= dl; dirZ /= dl;
    let best = null, bs = -1e9;
    for (const k of area.hexKeys) {
      const h = hexes.get(k);
      const p = worldOf(h);
      const vx = p.x - c.x, vz = p.z - c.z;
      const L = Math.hypot(vx, vz) || 1;
      let sc = ((vx * dirX + vz * dirZ) / L) * 2 + L / (area.hexRadius * HEX * 1.8);
      if (h.kind === 'water') sc += 0.08;
      if (sc > bs) { bs = sc; best = h; }
    }
    return best;
  }

  let gateCursor = 0;
  const shuffledRunes = rng.shuffle(GATE_RUNES);

  function carveRiver(edge) {
    const a = areas[edge.a], b = areas[edge.b];
    const ha = pickPort(a, b.pos), hb = pickPort(b, a.pos);
    if (!ha || !hb) return;
    const pa = worldOf(ha), pb = worldOf(hb);
    const mx = (pa.x + pb.x) / 2, mz = (pa.z + pb.z) / 2;
    const dx = pb.x - pa.x, dz = pb.z - pa.z;
    const len = Math.hypot(dx, dz) || 1;
    const px = -dz / len, pz = dx / len;
    const off = rng.range(-0.28, 0.28) * len;
    const cx = mx + px * off, cz = mz + pz * off;

    const nSeg = Math.max(6, Math.ceil((len / HEX) * 2));
    const chain = [];
    const chainSet = new Set();
    let prev = { q: ha.q, r: ha.r };
    const pushHex = (hq, hr) => {
      const k = Hx.key(hq, hr);
      if (!chainSet.has(k)) { chainSet.add(k); chain.push({ q: hq, r: hr }); }
    };
    pushHex(prev.q, prev.r);
    for (let i = 1; i <= nSeg; i++) {
      const t = i / nSeg;
      const it = 1 - t;
      const bx = it * it * pa.x + 2 * it * t * cx + t * t * pb.x;
      const bz = it * it * pa.z + 2 * it * t * cz + t * t * pb.z;
      const hc = Hx.toHex(bx, bz, HEX);
      if (hc.q === prev.q && hc.r === prev.r) continue;
      for (const step of Hx.line(prev.q, prev.r, hc.q, hc.r)) pushHex(step.q, step.r);
      prev = hc;
    }

    // fill river hexes (skips cells areas already own, so rivers merge into shores)
    const half = Math.floor(chain.length / 2);
    for (let i = 0; i < chain.length; i++) {
      const { q, r } = chain[i];
      const nxt = chain[Math.min(i + 1, chain.length - 1)];
      const pHere = Hx.toWorld(q, r, HEX);
      const pNext = Hx.toWorld(nxt.q, nxt.r, HEX);
      let fx = pNext.x - pHere.x, fz = pNext.z - pHere.z;
      const fl = Math.hypot(fx, fz) || 1;
      fx /= fl; fz /= fl;
      const owner = i < half ? a : b;
      setHex(q, r, {
        kind: 'water', areaId: owner.id, elev: 0,
        flow: [fx, fz], faint: edge.faint, blocked: false, levi: false,
        gateId: null, lockKey: null, river: true,
      });
      if (rng.chance(0.4)) {
        const dir = Hx.DIRS[rng.int(6)];
        setHex(q + dir[0], r + dir[1], {
          kind: 'water', areaId: owner.id, elev: 0,
          flow: [fx, fz], faint: edge.faint, blocked: false, levi: false,
          gateId: null, lockKey: null, river: true,
        });
      }
    }

    // warden gate at the crossing's midpoint
    const gh = chain[half];
    const gateHex = hexes.get(Hx.key(gh.q, gh.r));
    if (gateHex && gateHex.kind === 'water' && !gateHex.gateId) {
      const rune = shuffledRunes[gateCursor % shuffledRunes.length];
      const gate = {
        id: gates.length, rune,
        name: `The Gate of ${rune.name}`,
        q: gh.q, r: gh.r,
        between: [a.id, b.id], faint: !!edge.faint,
      };
      gateCursor++;
      gates.push(gate);
      gateHex.gateId = gate.id;
    }
    edge.chain = chain.map((c2) => Hx.key(c2.q, c2.r));
  }

  for (const edge of edges) carveRiver(edge);

  // ---------------------------------------------------------------- locks
  // Stormwalls: a few main rivers are sealed mid-stream; a rune-stone on a
  // nearby island calms the passage when stepped on.
  const lockableEdges = rng.shuffle(
    edges.filter((e) => !e.faint && e.chain && e.chain.length > 10 && e.a !== sun.id && e.b !== sun.id)
  ).slice(0, 3);

  function nearestIsle(fromKey, maxSteps) {
    const from = hexes.get(fromKey);
    if (!from) return null;
    const seen = new Set([fromKey]);
    let frontier = [fromKey];
    for (let step = 0; step < maxSteps; step++) {
      const next = [];
      for (const k of frontier) {
        const h = hexes.get(k);
        for (const d of Hx.DIRS) {
          const nk = Hx.key(h.q + d[0], h.r + d[1]);
          if (seen.has(nk)) continue;
          seen.add(nk);
          const nh = hexes.get(nk);
          if (!nh) continue;
          if (nh.kind === 'isle' && nh.lockKey === null && nh.gateId === null) return nk;
          next.push(nk);
        }
      }
      frontier = next;
      if (!frontier.length) break;
    }
    return null;
  }

  for (const edge of lockableEdges) {
    const idx = Math.floor(edge.chain.length * 0.3);
    const wallKeys = [];
    for (let i = idx; i < Math.min(idx + 2, edge.chain.length); i++) {
      const h = hexes.get(edge.chain[i]);
      if (h && h.kind === 'water' && !h.gateId) wallKeys.push(edge.chain[i]);
    }
    if (!wallKeys.length) continue;
    const keyHex = nearestIsle(wallKeys[0], 16);
    if (!keyHex) continue;
    const rune = shuffledRunes[gateCursor % shuffledRunes.length];
    gateCursor++;
    const lock = {
      id: locks.length, kind: 'stormwall', rune,
      wallKeys, keyKeys: [keyHex], struck: new Set(), unlocked: false,
    };
    locks.push(lock);
    for (const wk of wallKeys) hexes.get(wk).blocked = true;
    hexes.get(keyHex).lockKey = lock.id;
  }

  // Rumor lock: the Hollow Moon's path stays sealed until three rumor-rune
  // obelisks scattered across the main system are struck.
  const rumorSecret = secretEdges.find((se) => se.secret.biome.secretHint === 'rumor');
  if (rumorSecret && rumorSecret.edge.chain) {
    const rune = shuffledRunes[gateCursor % shuffledRunes.length];
    gateCursor++;
    const wallKeys = rumorSecret.edge.chain.filter((k) => {
      const h = hexes.get(k);
      return h && h.faint;
    });
    const keyAreas = rng.shuffle(areas.filter((a) => !a.secret && a.ring >= 2)).slice(0, 3);
    const keyKeys = [];
    for (const ka of keyAreas) {
      const isles = ka.hexKeys.filter((k) => {
        const h = hexes.get(k);
        return h.kind === 'isle' && h.lockKey === null;
      });
      if (isles.length) keyKeys.push(rng.pick(isles));
    }
    if (wallKeys.length && keyKeys.length === 3) {
      const lock = {
        id: locks.length, kind: 'rumor', rune,
        wallKeys, keyKeys, struck: new Set(), unlocked: false,
        secretAreaId: rumorSecret.secret.id,
      };
      locks.push(lock);
      for (const wk of wallKeys) hexes.get(wk).blocked = true;
      for (const kk of keyKeys) hexes.get(kk).lockKey = lock.id;
    }
  }

  // ---------------------------------------------------------------- leviathans
  // The two longest open rivers, plus the Unlit Star's hidden path, are living
  // rivers — star-leviathans swimming beneath the hexes.
  const longRivers = edges
    .filter((e) => !e.faint && e.chain && e.chain.length > 14)
    .sort((p, q) => q.chain.length - p.chain.length)
    .slice(0, 2);
  const leviSecret = secretEdges.find((se) => se.secret.biome.secretHint === 'levi');
  const leviEdges = [...longRivers];
  if (leviSecret && leviSecret.edge.chain) leviEdges.push(leviSecret.edge);

  for (const edge of leviEdges) {
    const pts = edge.chain.map((k) => {
      const h = hexes.get(k);
      return Hx.toWorld(h.q, h.r, HEX);
    });
    if (pts.length < 8) continue;
    for (const k of edge.chain) {
      const h = hexes.get(k);
      if (h && h.kind === 'water') h.levi = true;
    }
    leviathans.push({ id: leviathans.length, points: pts, secret: !!edge.faint });
  }

  // ---------------------------------------------------------------- connectivity
  function componentsOf() {
    const seen = new Set();
    const comps = [];
    for (const k of hexes.keys()) {
      if (seen.has(k)) continue;
      const comp = [];
      const queue = [k];
      seen.add(k);
      while (queue.length) {
        const cur = queue.pop();
        comp.push(cur);
        const h = hexes.get(cur);
        for (const d of Hx.DIRS) {
          const nk = Hx.key(h.q + d[0], h.r + d[1]);
          if (!seen.has(nk) && hexes.has(nk)) { seen.add(nk); queue.push(nk); }
        }
      }
      comps.push(comp);
    }
    return comps;
  }

  let comps = componentsOf();
  let guard = 0;
  while (comps.length > 1 && guard++ < 60) {
    comps.sort((p, q) => q.length - p.length);
    const main = comps[0];
    const other = comps[1];
    const sampleA = main.length > 90 ? rng.shuffle(main).slice(0, 90) : main;
    const sampleB = other.length > 90 ? rng.shuffle(other).slice(0, 90) : other;
    let bestA = null, bestB = null, bd = Infinity;
    for (const ka of sampleA) {
      const a2 = Hx.parseKey(ka);
      for (const kb of sampleB) {
        const b2 = Hx.parseKey(kb);
        const d = Hx.dist(a2.q, a2.r, b2.q, b2.r);
        if (d < bd) { bd = d; bestA = a2; bestB = b2; }
      }
    }
    const ref = hexes.get(Hx.key(bestB.q, bestB.r));
    for (const step of Hx.line(bestA.q, bestA.r, bestB.q, bestB.r)) {
      setHex(step.q, step.r, {
        kind: 'water', areaId: ref.areaId, elev: 0,
        flow: ref.flow.slice(), faint: ref.faint, blocked: false, levi: false,
        gateId: null, lockKey: null, river: true,
      });
    }
    comps = componentsOf();
  }

  // ---------------------------------------------------------------- start hex
  // spawn on an island at mid-radius, clear of the hearthstar's glare
  let startKey = null, bd2 = Infinity;
  const idealDist = sun.hexRadius * HEX * Hx.SQRT3 * 0.62;
  for (const k of sun.hexKeys) {
    const h = hexes.get(k);
    if (h.kind !== 'isle') continue;
    const p = worldOf(h);
    const d = Math.abs(Math.hypot(p.x, p.z) - idealDist);
    if (d < bd2) { bd2 = d; startKey = k; }
  }
  if (!startKey) startKey = sun.hexKeys[0] ?? hexes.keys().next().value;

  const title = `The ${rng.pick(WORLD_ADJ)} ${rng.pick(WORLD_NOUN)}`;

  return { seed: seedStr, title, areas, hexes, gates, edges, locks, leviathans, startKey };
}
