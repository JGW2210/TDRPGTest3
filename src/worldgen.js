// Procedural generation of the solar system on one global hex grid.
// Each region is an ISOLATED archipelago: an astral body nestled at the
// center, ringed by waters, with up to three grown islands of 10-30 hexes
// (waters make up roughly 40-60% of the walkable tiles). Nothing connects
// regions on foot — travel happens through gates: paired 7-hex rocky node
// islets on facing rims that blast the player across the void.

import {
  HEX, RINGS, SECRET_RADIUS, BIOMES, SECRET_BIOMES, ASTEROID_BIOMES, GATE_RUNES,
  WORLD_ADJ, WORLD_NOUN,
} from './config.js';
import { Rng, makeNoise2D } from './rng.js';
import * as Hx from './hexmath.js';

const TAU = Math.PI * 2;
const THREE_CLAMP = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

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
  const SPOKES = 8;
  const spokeBase = rng.angle();
  const spokeAngles = Array.from({ length: SPOKES }, (_, i) => spokeBase + (i / SPOKES) * TAU);

  function mkArea(biome, ring, pos, spoke = null) {
    const a = {
      id: areas.length, biome, ring, pos, spoke,
      hexKeys: [], secret: !!biome.secretHint, asteroid: !!biome.asteroid,
      angle: Math.atan2(pos.z, pos.x),
      hexRadius: 13, // scoring scale for port picking
    };
    areas.push(a);
    return a;
  }

  const sun = mkArea(BIOMES[0], 0, { x: 0, z: 0 });

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
      group.push(mkArea(slice[i], ri + 1, pos, sp));
    }
    stagger += 1 + rng.int(3);
    ringGroups.push(group);
  }

  const secretSpokes = rng.shuffle([...Array(SPOKES).keys()]).slice(0, SECRET_BIOMES.length);
  const secretsList = SECRET_BIOMES.map((b, i) => {
    const sp = secretSpokes[i];
    const rad = rng.range(SECRET_RADIUS[0], SECRET_RADIUS[1]);
    const pos = { x: Math.cos(spokeAngles[sp]) * rad, z: Math.sin(spokeAngles[sp]) * rad };
    return mkArea(b, 5, pos, sp);
  });

  // asteroid waystations: small bare-rock reefs adrift in some of the gaps
  // between the outer ring's neighboring regions, threaded into its gate chain
  const outerSorted = ringGroups[ringGroups.length - 1].slice().sort((a, b) => a.angle - b.angle);
  const asteroidByGap = new Map(); // gap index i = between outerSorted[i] and [i+1]
  {
    const outerRadius = RINGS[RINGS.length - 1].radius;
    const gapPicks = rng.shuffle([...Array(outerSorted.length).keys()])
      .slice(0, ASTEROID_BIOMES.length);
    gapPicks.forEach((gi, i) => {
      const a = outerSorted[gi], b = outerSorted[(gi + 1) % outerSorted.length];
      let da = b.angle - a.angle;
      while (da <= 0) da += TAU;
      const ang = a.angle + da / 2;
      const rad = outerRadius + rng.range(-25, 25);
      const area = mkArea(ASTEROID_BIOMES[i], RINGS.length, {
        x: Math.cos(ang) * rad, z: Math.sin(ang) * rad,
      });
      asteroidByGap.set(gi, area);
    });
  }

  // ---------------------------------------------------------------- regions
  function setHex(q, r, rec) {
    const k = Hx.key(q, r);
    if (hexes.has(k)) return hexes.get(k);
    rec.q = q; rec.r = r;
    hexes.set(k, rec);
    return rec;
  }

  // Grow one region: a connected water blob wrapped around the body's
  // nestling gap, then islands grown inside it.
  // Asteroid waystations: one connected knot of bare rock, no sea at all.
  function generateAsteroidRegion(area) {
    const c = area.pos;
    const ch = Hx.toHex(c.x, c.z, HEX);
    const target = 10 + rng.int(8);
    area.hexRadius = 5;
    const localKey = (q, r) => q + ',' + r;
    const cells = new Set([localKey(ch.q, ch.r)]);
    const frontier = [[ch.q, ch.r]];
    let guard = 0;
    while (cells.size < target && guard++ < 4000) {
      const [fq, fr] = frontier[rng.int(frontier.length)];
      const dir = Hx.DIRS[rng.int(6)];
      const nq = fq + dir[0], nr = fr + dir[1];
      const nk = localKey(nq, nr);
      if (cells.has(nk) || Hx.dist(nq, nr, ch.q, ch.r) > 4) continue;
      if (hexes.get(Hx.key(nq, nr)) !== undefined) continue;
      cells.add(nk);
      frontier.push([nq, nr]);
    }
    for (const k of cells) {
      const [q, r] = k.split(',').map(Number);
      const rec = setHex(q, r, {
        kind: 'isle', areaId: area.id, elev: 0.35 + rng.float() * 0.9,
        islandId: null, rock: true,
        flow: [0, 0], faint: false, blocked: false, levi: false,
        gateId: null, lockKey: null,
      });
      if (rec.areaId === area.id) area.hexKeys.push(Hx.key(q, r));
    }
  }

  function generateRegion(area) {
    const c = area.pos;
    const ch = Hx.toHex(c.x, c.z, HEX);
    // giants need a wider nestling gap than moons
    const clear = area.biome.bodyKind === 'sun' || area.biome.bodySize >= 10 ? 4 : 3;

    const nIslands = area.secret ? 3 : 3 + rng.int(3);
    const islandSizes = [];
    for (let i = 0; i < nIslands; i++) {
      islandSizes.push(area.secret ? 10 + rng.int(11) : 10 + rng.int(21));
    }
    const isleTotal = islandSizes.reduce((s2, v) => s2 + v, 0);
    // vast seas: islands are sparse marks on a wide water field
    const waterFrac = rng.range(0.8, 0.9);
    const walkableTarget = Math.round(isleTotal / (1 - waterFrac));
    // size the region to its sea, capped so facing regions' gate islets can
    // never bridge the void between
    const maxDist = clear + THREE_CLAMP(Math.ceil(Math.sqrt(walkableTarget / 2.1)), 9, 15);
    area.hexRadius = maxDist;

    // --- connected blob, seeded from the ring that circles the body
    const cells = new Set();
    const frontier = [];
    const localKey = (q, r) => q + ',' + r;
    const distFromCenter = (q, r) => Hx.dist(q, r, ch.q, ch.r);

    // ring at clear+1: the waters that nestle the astral body
    {
      let cq = ch.q + (clear + 1), cr = ch.r;
      for (let side = 0; side < 6; side++) {
        const d = Hx.DIRS[(side + 2) % 6];
        for (let step = 0; step < clear + 1; step++) {
          const k = localKey(cq, cr);
          if (!cells.has(k)) { cells.add(k); frontier.push([cq, cr]); }
          cq += d[0]; cr += d[1];
        }
      }
    }

    let growGuard = 0;
    while (cells.size < walkableTarget && frontier.length && growGuard++ < 80000) {
      const fi = rng.int(frontier.length);
      const [fq, fr] = frontier[fi];
      const dir = Hx.DIRS[rng.int(6)];
      const nq = fq + dir[0], nr = fr + dir[1];
      const nk = localKey(nq, nr);
      const d = distFromCenter(nq, nr);
      if (!cells.has(nk) && d > clear && d <= maxDist && hexes.get(Hx.key(nq, nr)) === undefined) {
        // organic bias: prefer growth where noise smiles on it
        const p = Hx.toWorld(nq, nr, HEX);
        if (rng.float() < 0.5 + 0.5 * noise.fbm(p.x * 0.03, p.z * 0.03, 2)) {
          cells.add(nk);
          frontier.push([nq, nr]);
        }
      } else if (rng.chance(0.03)) {
        frontier.splice(fi, 1); // retire exhausted frontier cells now and then
      }
    }

    // --- islands grown inside the blob (kept one hex apart from each other)
    const cellArr = [...cells].map((k) => k.split(',').map(Number));
    const isleOf = new Map(); // localKey -> island index
    const seeds = [];
    for (let isl = 0; isl < nIslands; isl++) {
      let seed = null;
      for (let tries = 0; tries < 140 && !seed; tries++) {
        const cand = cellArr[rng.int(cellArr.length)];
        const d = distFromCenter(cand[0], cand[1]);
        if (d < clear + 3) continue;
        if (seeds.some(([sq, sr]) => Hx.dist(sq, sr, cand[0], cand[1]) < 7)) continue;
        seed = cand;
      }
      if (!seed) continue;
      seeds.push(seed);

      const mine = [seed];
      isleOf.set(localKey(seed[0], seed[1]), isl);
      let guard = 0;
      while (mine.length < islandSizes[isl] && guard++ < 400) {
        const [gq, gr] = mine[rng.int(mine.length)];
        const dir = Hx.DIRS[rng.int(6)];
        const nq = gq + dir[0], nr = gr + dir[1];
        const nk = localKey(nq, nr);
        if (!cells.has(nk) || isleOf.has(nk)) continue;
        // stay clear of other islands: no neighbor may belong to a different one
        let touchesOther = false;
        for (const d2 of Hx.DIRS) {
          const ok = isleOf.get(localKey(nq + d2[0], nr + d2[1]));
          if (ok !== undefined && ok !== isl) { touchesOther = true; break; }
        }
        if (touchesOther) continue;
        isleOf.set(nk, isl);
        mine.push([nq, nr]);
      }
    }

    // --- commit hexes
    const isleBase = islandSizes.map(() => 0.7 + rng.float() * 1.3);
    for (const [q, r] of cellArr) {
      const lk = localKey(q, r);
      const isl = isleOf.get(lk);
      const p = Hx.toWorld(q, r, HEX);
      const vx = p.x - c.x, vz = p.z - c.z;
      const vl = Math.hypot(vx, vz) || 1;
      let rec;
      if (isl !== undefined) {
        // shorelines sit lower than the island's heart
        let shore = false;
        for (const d2 of Hx.DIRS) {
          if (isleOf.get(localKey(q + d2[0], r + d2[1])) !== isl) { shore = true; break; }
        }
        const elev = isleBase[isl] * (shore ? 0.55 : 1) + noise.fbm(p.x * 0.08, p.z * 0.08, 2) * 0.9;
        rec = {
          kind: 'isle', areaId: area.id, elev, islandId: isl, rock: false,
          flow: [0, 0], faint: false, blocked: false, levi: false,
          gateId: null, lockKey: null,
        };
      } else {
        rec = {
          kind: 'water', areaId: area.id, elev: 0, islandId: null, rock: false,
          flow: [-vz / vl, vx / vl], faint: false, blocked: false, levi: false,
          gateId: null, lockKey: null,
        };
      }
      if (setHex(q, r, rec) === rec) area.hexKeys.push(Hx.key(q, r));
    }
  }

  for (const area of areas) {
    if (area.asteroid) generateAsteroidRegion(area);
    else generateRegion(area);
  }

  // ---------------------------------------------------------------- gates
  // A gate is a pair of 7-hex rocky node islets on facing rims; entering a
  // node blasts the traveler across the void to its twin.
  const worldOf = (h) => Hx.toWorld(h.q, h.r, HEX);
  const usedPorts = new Set();
  const shuffledRunes = rng.shuffle(GATE_RUNES);

  function pickRim(area, toward) {
    const c = area.pos;
    let dirX = toward.x - c.x, dirZ = toward.z - c.z;
    const dl = Math.hypot(dirX, dirZ) || 1;
    dirX /= dl; dirZ /= dl;
    let best = null, bs = -1e9;
    for (const k of area.hexKeys) {
      if (usedPorts.has(k)) continue;
      const h = hexes.get(k);
      if (!h || h.gateId !== null) continue;
      const p = worldOf(h);
      const vx = p.x - c.x, vz = p.z - c.z;
      const L = Math.hypot(vx, vz) || 1;
      let sc = ((vx * dirX + vz * dirZ) / L) * 2 + L / (area.hexRadius * HEX * 1.8);
      if (h.kind === 'water') sc += 0.2;
      if (sc > bs) { bs = sc; best = h; }
    }
    return best;
  }

  function placeNode(area, toward) {
    const rim = pickRim(area, toward);
    if (!rim) return null;
    const rp = worldOf(rim);
    let dx = toward.x - rp.x, dz = toward.z - rp.z;
    const dl = Math.hypot(dx, dz) || 1;
    dx /= dl; dz /= dl;
    for (const shift of [2, 3, 4]) {
      const cx = rp.x + dx * HEX * Hx.SQRT3 * shift;
      const cz = rp.z + dz * HEX * Hx.SQRT3 * shift;
      const cc = Hx.toHex(cx, cz, HEX);
      const ck = Hx.key(cc.q, cc.r);
      const existing = hexes.get(ck);
      if (existing && existing.gateId !== null) continue; // another gate lives here
      // center hex: rocky perch for the warden ring
      if (existing) {
        existing.kind = 'isle';
        existing.rock = true;
        existing.islandId = null;
        existing.elev = Math.max(existing.elev, 0.55);
      } else {
        const rec = setHex(cc.q, cc.r, {
          kind: 'isle', areaId: area.id, elev: 0.55 + rng.float() * 0.35,
          islandId: null, rock: true,
          flow: [0, 0], faint: false, blocked: false, levi: false,
          gateId: null, lockKey: null,
        });
        area.hexKeys.push(Hx.key(cc.q, cc.r));
        void rec;
      }
      // the surrounding six rocks
      for (const d of Hx.DIRS) {
        const nq = cc.q + d[0], nr = cc.r + d[1];
        const nk = Hx.key(nq, nr);
        if (!hexes.has(nk)) {
          setHex(nq, nr, {
            kind: 'isle', areaId: area.id, elev: 0.4 + rng.float() * 0.4,
            islandId: null, rock: true,
            flow: [0, 0], faint: false, blocked: false, levi: false,
            gateId: null, lockKey: null,
          });
          area.hexKeys.push(nk);
        }
      }
      // guarantee the islet touches the region: pave the line from the rim
      // (asteroid reefs pave stone — they have no sea to pave with)
      for (const step of Hx.line(rim.q, rim.r, cc.q, cc.r)) {
        const sk = Hx.key(step.q, step.r);
        if (!hexes.has(sk)) {
          const sp = Hx.toWorld(step.q, step.r, HEX);
          const vx = sp.x - area.pos.x, vz = sp.z - area.pos.z;
          const vl = Math.hypot(vx, vz) || 1;
          setHex(step.q, step.r, area.asteroid ? {
            kind: 'isle', areaId: area.id, elev: 0.3 + rng.float() * 0.3,
            islandId: null, rock: true,
            flow: [0, 0], faint: false, blocked: false, levi: false,
            gateId: null, lockKey: null,
          } : {
            kind: 'water', areaId: area.id, elev: 0, islandId: null, rock: false,
            flow: [vx / vl, vz / vl], faint: false, blocked: false, levi: false,
            gateId: null, lockKey: null,
          });
          area.hexKeys.push(sk);
        }
      }
      usedPorts.add(Hx.key(rim.q, rim.r));
      return ck;
    }
    return null;
  }

  // same-ring ports face along the orbit (tangentially), so ring blasts hug
  // the line of orbit instead of cutting inward toward the neighbor's center
  function orbitToward(fromArea, toArea) {
    const rA = Math.hypot(fromArea.pos.x, fromArea.pos.z) || 1;
    let da = toArea.angle - fromArea.angle;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    const ang = fromArea.angle + Math.sign(da) * 0.45;
    return { x: Math.cos(ang) * rA, z: Math.sin(ang) * rA };
  }

  const edgeSet = new Set();
  function addGate(a, b, kind = 'ring') {
    const ek = Math.min(a.id, b.id) + '-' + Math.max(a.id, b.id);
    if (edgeSet.has(ek)) return;
    const ka = placeNode(a, kind === 'ring' ? orbitToward(a, b) : b.pos);
    const kb = placeNode(b, kind === 'ring' ? orbitToward(b, a) : a.pos);
    if (!ka || !kb) return;
    edgeSet.add(ek);
    const rune = shuffledRunes[gates.length % shuffledRunes.length];
    const gate = {
      id: gates.length, rune, kind,
      name: `The Gate of ${rune.name}`,
      a: a.id, b: b.id,
      portA: ka, portB: kb,
    };
    hexes.get(ka).gateId = gate.id;
    hexes.get(kb).gateId = gate.id;
    gates.push(gate);
    edges.push({ a: a.id, b: b.id });
  }

  const nearestArea = (pool, x, z) => {
    let best = null, bd = Infinity;
    for (const a of pool) {
      const d = Math.hypot(a.pos.x - x, a.pos.z - z);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  };

  for (let ri = 1; ri < ringGroups.length; ri++) {
    const g = ringGroups[ri].slice().sort((p, q2) => p.angle - q2.angle);
    const isOuter = ri === ringGroups.length - 1;
    for (let i = 0; i < g.length; i++) {
      if (g.length <= 1) continue;
      const nxt = g[(i + 1) % g.length];
      // an asteroid waystation in this gap splits the crossing in two hops
      const ast = isOuter ? asteroidByGap.get(i) : undefined;
      if (ast) {
        addGate(g[i], ast, 'ring');
        addGate(ast, nxt, 'ring');
      } else {
        addGate(g[i], nxt, 'ring');
      }
    }
    // exactly ONE passage outward per ring boundary, at a random crossing
    const inner = rng.pick(ringGroups[ri - 1]);
    const outer = nearestArea(ringGroups[ri], inner.pos.x, inner.pos.z);
    addGate(inner, outer, 'radial');
  }
  for (const s of secretsList) {
    const outer = ringGroups[ringGroups.length - 1];
    addGate(nearestArea(outer, s.pos.x, s.pos.z), s, 'radial');
  }

  // ---------------------------------------------------------------- locks
  let runeCursor = gates.length;

  function isleKeysOf(area) {
    return area.hexKeys.filter((k) => {
      const h = hexes.get(k);
      return h && h.kind === 'isle' && !h.rock && h.lockKey === null && h.gateId === null;
    });
  }

  // Stormwalls: three ordinary gates are sealed on their departure node;
  // the becalming rune-stone stands on an island of the same region.
  const lockableGates = rng.shuffle(
    gates.filter((g) =>
      !areas[g.a].secret && !areas[g.b].secret &&
      !areas[g.a].asteroid && !areas[g.b].asteroid && areas[g.a].ring > 0)
  ).slice(0, 3);
  for (const gate of lockableGates) {
    const sideA = areas[gate.a];
    const isles = isleKeysOf(sideA);
    if (!isles.length) continue;
    const rune = shuffledRunes[runeCursor % shuffledRunes.length];
    runeCursor++;
    const lock = {
      id: locks.length, kind: 'stormwall', rune,
      wallKeys: [gate.portA], keyKeys: [rng.pick(isles)],
      struck: new Set(), unlocked: false,
    };
    locks.push(lock);
    hexes.get(gate.portA).blocked = true;
    hexes.get(lock.keyKeys[0]).lockKey = lock.id;
  }

  // Rumor lock: the Hollow Moon's gate stays sealed until three rumor-rune
  // obelisks scattered across the main system are struck.
  const rumorSecret = secretsList.find((s2) => s2.biome.secretHint === 'rumor');
  const rumorGate = rumorSecret && gates.find((g) => g.a === rumorSecret.id || g.b === rumorSecret.id);
  if (rumorGate) {
    const outerPort = rumorGate.a === rumorSecret.id ? rumorGate.portB : rumorGate.portA;
    const keyAreas = rng.shuffle(areas.filter((a) => !a.secret && !a.asteroid && a.ring >= 2)).slice(0, 3);
    const keyKeys = [];
    for (const ka of keyAreas) {
      const isles = isleKeysOf(ka);
      if (isles.length) keyKeys.push(rng.pick(isles));
    }
    if (keyKeys.length === 3) {
      const rune = shuffledRunes[runeCursor % shuffledRunes.length];
      runeCursor++;
      const lock = {
        id: locks.length, kind: 'rumor', rune,
        wallKeys: [outerPort], keyKeys, struck: new Set(), unlocked: false,
        secretAreaId: rumorSecret.id,
      };
      locks.push(lock);
      hexes.get(outerPort).blocked = true;
      for (const kk of keyKeys) hexes.get(kk).lockKey = lock.id;
    }
  }

  // ---------------------------------------------------------------- leviathans
  // Serpents of the open void: two circle between the orbits, and one wheels
  // tightly around the hidden crossing to the Unlit Star, marking the way.
  for (const [radius, reverse] of [[395, false], [665, true]]) {
    const pts = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * TAU;
      pts.push({ x: Math.cos(a) * radius, z: Math.sin(a) * radius });
    }
    leviathans.push({ id: leviathans.length, points: pts, loop: true, secret: false, reverse });
  }
  const leviSecret = secretsList.find((s2) => s2.biome.secretHint === 'levi');
  const leviGate = leviSecret && gates.find((g) => g.a === leviSecret.id || g.b === leviSecret.id);
  if (leviGate) {
    const pa = hexes.get(leviGate.portA);
    const pb = hexes.get(leviGate.portB);
    const wa = worldOf(pa), wb = worldOf(pb);
    const mx = (wa.x + wb.x) / 2, mz = (wa.z + wb.z) / 2;
    const pts = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * TAU;
      pts.push({ x: mx + Math.cos(a) * 30, z: mz + Math.sin(a) * 30 });
    }
    leviathans.push({ id: leviathans.length, points: pts, loop: true, secret: true, reverse: false });
  }

  // ---------------------------------------------------------------- start hex
  let startKey = null, bd2 = Infinity;
  const idealDist = 7 * HEX * Hx.SQRT3;
  for (const k of sun.hexKeys) {
    const h = hexes.get(k);
    if (h.kind !== 'isle' || h.rock) continue;
    const p = worldOf(h);
    const d = Math.abs(Math.hypot(p.x, p.z) - idealDist);
    if (d < bd2) { bd2 = d; startKey = k; }
  }
  if (!startKey) startKey = sun.hexKeys[0] ?? hexes.keys().next().value;

  const title = `The ${rng.pick(WORLD_ADJ)} ${rng.pick(WORLD_NOUN)}`;

  return { seed: seedStr, title, areas, hexes, gates, edges, locks, leviathans, startKey };
}
