// Procedural generation of the solar system on one global hex grid, woven as
// an Orb-Weaver's Wheel: complete concentric ring-rivers at every orbit plus
// straight radial spokes sun-to-rim. Areas sit at spoke-ring crossings; gates
// are PAIRS of ports (fast travel) with the web's rivers running between them.

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
  const hexes = new Map();
  const gates = [];
  const edges = [];
  const locks = [];
  const leviathans = [];

  // ---------------------------------------------------------------- layout
  // Eight spokes; every non-sun area sits exactly where a spoke crosses a ring.
  const SPOKES = 8;
  const spokeBase = rng.angle();
  const spokeAngles = Array.from({ length: SPOKES }, (_, i) => spokeBase + (i / SPOKES) * TAU);

  function mkArea(biome, ring, pos, hexRadius, spoke = null) {
    const a = {
      id: areas.length, biome, ring, pos, hexRadius, spoke,
      hexKeys: [], secret: !!biome.secretHint,
      angle: Math.atan2(pos.z, pos.x),
    };
    areas.push(a);
    return a;
  }

  const sun = mkArea(BIOMES[0], 0, { x: 0, z: 0 }, 11 + rng.int(3));

  const ringGroups = [[sun]];
  let biomeCursor = 1;
  let stagger = rng.int(SPOKES);
  for (let ri = 0; ri < RINGS.length; ri++) {
    const spec = RINGS[ri];
    const slice = rng.shuffle(BIOMES.slice(biomeCursor, biomeCursor + spec.count));
    biomeCursor += spec.count;
    const group = [];
    for (let i = 0; i < spec.count; i++) {
      const sp = (stagger + Math.round((i * SPOKES) / spec.count)) % SPOKES;
      const ang = spokeAngles[sp];
      const pos = { x: Math.cos(ang) * spec.radius, z: Math.sin(ang) * spec.radius };
      group.push(mkArea(slice[i], ri + 1, pos, 9 + rng.int(3), sp));
    }
    stagger += 1 + rng.int(3); // stagger crossings between rings
    ringGroups.push(group);
  }

  const secretSpokes = rng.shuffle([...Array(SPOKES).keys()]).slice(0, SECRET_BIOMES.length);
  const secretsList = SECRET_BIOMES.map((b, i) => {
    const sp = secretSpokes[i];
    const rad = rng.range(SECRET_RADIUS[0], SECRET_RADIUS[1]);
    const pos = { x: Math.cos(spokeAngles[sp]) * rad, z: Math.sin(spokeAngles[sp]) * rad };
    return mkArea(b, 5, pos, 6 + rng.int(2), sp);
  });

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

  // ---------------------------------------------------------------- the web
  const worldOf = (h) => Hx.toWorld(h.q, h.r, HEX);
  const nearestArea = (pool, x, z) => {
    let best = null, bd = Infinity;
    for (const a of pool) {
      const d = Math.hypot(a.pos.x - x, a.pos.z - z);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  };

  // ring bands: one rhombus scan of the whole disc; wiggly edges for charm
  const bandHalf = HEX * 1.9;
  const maxR = RINGS[RINGS.length - 1].radius + bandHalf + HEX * 2;
  const range = Math.ceil(maxR / (HEX * 0.85));
  for (let q = -range; q <= range; q++) {
    for (let r = Math.max(-range, -q - range); r <= Math.min(range, -q + range); r++) {
      if (hexes.has(Hx.key(q, r))) continue;
      const p = Hx.toWorld(q, r, HEX);
      const wr = Math.hypot(p.x, p.z);
      if (wr < 1 || wr > maxR) continue;
      for (let ri = 0; ri < RINGS.length; ri++) {
        const wig = (noise.fbm(p.x * 0.03, p.z * 0.03) - 0.5) * HEX * 2.4;
        if (Math.abs(wr - RINGS[ri].radius + wig) > bandHalf) continue;
        const sign = ri % 2 === 0 ? 1 : -1; // alternate flow direction per ring
        const owner = nearestArea(ringGroups[ri + 1], p.x, p.z);
        setHex(q, r, {
          kind: 'water', areaId: owner.id, elev: 0,
          flow: [(-p.z / wr) * sign, (p.x / wr) * sign],
          faint: false, blocked: false, levi: false,
          gateId: null, lockKey: null, river: true,
        });
        break;
      }
    }
  }

  // radial spokes sun-to-rim (plus faint extensions out to the secrets)
  function carveSpokePath(ang, r0, r1, { faint = false, ownerPool = areas } = {}) {
    const dirx = Math.cos(ang), dirz = Math.sin(ang);
    const steps = Math.ceil((r1 - r0) / (HEX * 0.8));
    const chain = [];
    const seen = new Set();
    let prev = null;
    for (let i = 0; i <= steps; i++) {
      const rr = r0 + ((r1 - r0) * i) / steps;
      const hc = Hx.toHex(dirx * rr, dirz * rr, HEX);
      const cells = prev ? Hx.line(prev.q, prev.r, hc.q, hc.r) : [hc];
      prev = hc;
      for (const cell of cells) {
        const k = Hx.key(cell.q, cell.r);
        if (seen.has(k)) continue;
        seen.add(k);
        const p = Hx.toWorld(cell.q, cell.r, HEX);
        const owner = nearestArea(ownerPool, p.x, p.z);
        setHex(cell.q, cell.r, {
          kind: 'water', areaId: owner.id, elev: 0,
          flow: [dirx, dirz], faint, blocked: false, levi: false,
          gateId: null, lockKey: null, river: true,
        });
        chain.push(k);
        if (rng.chance(0.45)) {
          const d = Hx.DIRS[rng.int(6)];
          setHex(cell.q + d[0], cell.r + d[1], {
            kind: 'water', areaId: owner.id, elev: 0,
            flow: [dirx, dirz], faint, blocked: false, levi: false,
            gateId: null, lockKey: null, river: true,
          });
        }
      }
    }
    return chain;
  }

  const rimR = RINGS[RINGS.length - 1].radius;
  for (let s = 0; s < SPOKES; s++) {
    carveSpokePath(spokeAngles[s], HEX * 4, rimR);
  }
  for (const sArea of secretsList) {
    const rad = Math.hypot(sArea.pos.x, sArea.pos.z);
    sArea.secretChain = carveSpokePath(spokeAngles[sArea.spoke], rimR, rad - HEX * 2, {
      faint: true, ownerPool: [sArea],
    });
  }

  // ---------------------------------------------------------------- gates
  // A gate is a PAIR of ports: step into one, riverflight to the other.
  const usedPorts = new Set();
  const shuffledRunes = rng.shuffle(GATE_RUNES);

  function pickPort(area, toward) {
    const c = area.pos;
    let dirX = toward.x - c.x, dirZ = toward.z - c.z;
    const dl = Math.hypot(dirX, dirZ) || 1;
    dirX /= dl; dirZ /= dl;
    let best = null, bs = -1e9;
    for (const k of area.hexKeys) {
      if (usedPorts.has(k)) continue;
      const h = hexes.get(k);
      if (h.gateId !== null) continue;
      const p = worldOf(h);
      const vx = p.x - c.x, vz = p.z - c.z;
      const L = Math.hypot(vx, vz) || 1;
      let sc = ((vx * dirX + vz * dirZ) / L) * 2 + L / (area.hexRadius * HEX * 1.8);
      if (h.kind === 'water') sc += 0.3;
      if (sc > bs) { bs = sc; best = h; }
    }
    return best;
  }

  const edgeSet = new Set();
  function addGate(a, b) {
    const ek = Math.min(a.id, b.id) + '-' + Math.max(a.id, b.id);
    if (edgeSet.has(ek)) return;
    const pa = pickPort(a, b.pos);
    const pb = pickPort(b, a.pos);
    if (!pa || !pb) return;
    edgeSet.add(ek);
    const rune = shuffledRunes[gates.length % shuffledRunes.length];
    const gate = {
      id: gates.length, rune,
      name: `The Gate of ${rune.name}`,
      a: a.id, b: b.id,
      portA: Hx.key(pa.q, pa.r), portB: Hx.key(pb.q, pb.r),
    };
    pa.gateId = gate.id;
    pb.gateId = gate.id;
    usedPorts.add(gate.portA);
    usedPorts.add(gate.portB);
    gates.push(gate);
    edges.push({ a: a.id, b: b.id });
  }

  const ringEdges = [];
  for (let ri = 1; ri < ringGroups.length; ri++) {
    const g = ringGroups[ri].slice().sort((p, q2) => p.angle - q2.angle);
    for (let i = 0; i < g.length; i++) {
      const nb = g[(i + 1) % g.length];
      addGate(g[i], nb);
      ringEdges.push({ a: g[i], b: nb, ri: ri - 1 });
    }
    for (const area of ringGroups[ri]) {
      addGate(area, nearestArea(ringGroups[ri - 1], area.pos.x, area.pos.z));
    }
  }

  // ---------------------------------------------------------------- locks
  // Stormwalls: seal a few ring segments mid-way between two areas; a
  // rune-stone on a nearby island calms the passage. (The web's redundancy
  // means these are soft obstacles — detours exist, but so does curiosity.)
  let gateCursor = gates.length;

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

  for (const re of rng.shuffle(ringEdges).slice(0, 3)) {
    // seal the ring a quarter-arc out from one area's harbor, so its
    // rune-stone key is always on a nearby island
    const ux = Math.cos(re.a.angle) * 0.75 + Math.cos(re.b.angle) * 0.25;
    const uz = Math.sin(re.a.angle) * 0.75 + Math.sin(re.b.angle) * 0.25;
    const midAng = Math.atan2(uz, ux);
    const R = RINGS[re.ri].radius;
    const center = Hx.toHex(Math.cos(midAng) * R, Math.sin(midAng) * R, HEX);
    const wallKeys = [];
    for (let dq = -2; dq <= 2; dq++) {
      for (let dr = Math.max(-2, -dq - 2); dr <= Math.min(2, -dq + 2); dr++) {
        const k = Hx.key(center.q + dq, center.r + dr);
        const h = hexes.get(k);
        if (h && h.kind === 'water' && h.gateId === null) wallKeys.push(k);
      }
    }
    if (wallKeys.length < 3) continue;
    const keyHex = nearestIsle(wallKeys[0], 50);
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

  // Rumor lock: the Hollow Moon's spoke extension stays sealed until three
  // rumor-rune obelisks scattered across the main system are struck.
  const rumorSecret = secretsList.find((s) => s.biome.secretHint === 'rumor');
  if (rumorSecret && rumorSecret.secretChain?.length) {
    const rune = shuffledRunes[gateCursor % shuffledRunes.length];
    gateCursor++;
    const wallKeys = rumorSecret.secretChain.filter((k) => hexes.get(k)?.faint);
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
        secretAreaId: rumorSecret.id,
      };
      locks.push(lock);
      for (const wk of wallKeys) hexes.get(wk).blocked = true;
      for (const kk of keyKeys) hexes.get(kk).lockKey = lock.id;
    }
  }

  // ---------------------------------------------------------------- leviathans
  // Two serpents endlessly circle the middle rings; a third swims the Unlit
  // Star's hidden spoke, its glow marking the way.
  for (const ri of [1, 2]) {
    const pts = [];
    const n = 48;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      pts.push({ x: Math.cos(a) * RINGS[ri].radius, z: Math.sin(a) * RINGS[ri].radius });
    }
    leviathans.push({ id: leviathans.length, points: pts, loop: true, secret: false, reverse: ri % 2 === 1 });
  }
  const leviSecret = secretsList.find((s) => s.biome.secretHint === 'levi');
  if (leviSecret && leviSecret.secretChain?.length > 6) {
    const pts = leviSecret.secretChain.map((k) => {
      const h = hexes.get(k);
      return worldOf(h);
    });
    for (const k of leviSecret.secretChain) {
      const h = hexes.get(k);
      if (h && h.kind === 'water') h.levi = true;
    }
    leviathans.push({ id: leviathans.length, points: pts, loop: false, secret: true, reverse: false });
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
