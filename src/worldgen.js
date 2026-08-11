// Procedural generation of the solar system on one global hex grid.
// Each region is an ISOLATED archipelago: an astral body nestled at the
// center, ringed by waters, with up to three grown islands of 10-30 hexes
// (waters make up roughly 40-60% of the walkable tiles). Nothing connects
// regions on foot — travel happens through gates: paired 7-hex rocky node
// islets on facing rims that blast the player across the void.
// Progression is stormbound: each ring boundary's single outward gate starts
// dark under a storm ward, ignited by the stormheart shard perched beside it.
// Regions also carry ring-scaled hazards, astral shrine platforms hung high
// off their rims, and healing springs on the waystations.

import {
  HEX, RINGS, SECRET_RADIUS, BIOMES, SECRET_BIOMES, ASTEROID_BIOMES, GATE_RUNES,
  TELEPORT_BIOMES, STILLMOON_CRYSTALS, TRAPS, HERMITS, WORLD_ADJ, WORLD_NOUN,
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
  const wards = [];
  const wardens = []; // boundary bosses barring the ascension causeways
  const shrines = [];
  const chains = [];
  const leviathans = [];

  // ---------------------------------------------------------------- layout
  const SPOKES = 8;
  const spokeBase = rng.angle();
  const spokeAngles = Array.from({ length: SPOKES }, (_, i) => spokeBase + (i / SPOKES) * TAU);

  function mkArea(biome, ring, pos, spoke = null) {
    const a = {
      id: areas.length, biome, ring, pos, spoke,
      hexKeys: [], secret: !!biome.secretHint, asteroid: !!biome.asteroid,
      teleport: !!biome.teleport,
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

  // teleport concourses: rings 2-4 each keep ONE marble waystation threaded
  // into a free gap of the ring's gate chain — its pillared hut holds the
  // stone that charts crossings to the ring's visited regions
  const teleportByGap = new Map(); // `${ringNumber}:${gapIndex}` -> area
  for (let R = 2; R <= RINGS.length; R++) {
    const sorted = ringGroups[R].slice().sort((a, b) => a.angle - b.angle);
    const free = [...Array(sorted.length).keys()]
      .filter((gi) => !(R === RINGS.length && asteroidByGap.has(gi)));
    if (!free.length) continue;
    const gi = free[rng.int(free.length)];
    const a = sorted[gi], b = sorted[(gi + 1) % sorted.length];
    let da = b.angle - a.angle;
    while (da <= 0) da += TAU;
    const ang = a.angle + da / 2;
    const rad = RINGS[R - 1].radius + rng.range(-20, 20);
    const area = mkArea(TELEPORT_BIOMES[R - 2], R, {
      x: Math.cos(ang) * rad, z: Math.sin(ang) * rad,
    });
    teleportByGap.set(R + ':' + gi, area);
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
    // (Round 12: the temple lives on an annex court now, not in the knot —
    // concourses no longer need a levelled forecourt inside the rubble)
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
        gateId: null,
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
          gateId: null,
        };
      } else {
        rec = {
          kind: 'water', areaId: area.id, elev: 0, islandId: null, rock: false,
          flow: [-vz / vl, vx / vl], faint: false, blocked: false, levi: false,
          gateId: null,
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
      if (h.baseY) continue; // floating cells are not the sea's rim
      if (h.stillmoon) continue; // satellite rock is not the sea's rim either
      if (h.causeway) continue; // warden causeways out-reach every true rim
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
      // another gate, a ward perch, or a shrine already lives here
      if (existing && (existing.gateId !== null || existing.wardId !== undefined
        || existing.shrineId !== undefined || existing.baseY)) continue;
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
          gateId: null,
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
            gateId: null,
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
            gateId: null,
          } : {
            kind: 'water', areaId: area.id, elev: 0, islandId: null, rock: false,
            flow: [vx / vl, vz / vl], faint: false, blocked: false, levi: false,
            gateId: null,
          });
          area.hexKeys.push(sk);
        }
      }
      usedPorts.add(Hx.key(rim.q, rim.r));
      return ck;
    }
    return null;
  }

  // A 7-hex ANNEX COURT (Round 12): a level flower pad — a heart hex and six
  // petals — stamped just off a waystation knot's rim and stone-paved back to
  // it, exactly like a gate islet. Teleport concourses grow one on the side
  // BETWEEN their two gate islets (the temple stands on it); spring
  // waystations grow one wherever the rock allows (the fountain court).
  // Tries each angle in order; returns { centerKey, keys, angle } or null.
  function placeCourt(area, angles) {
    const c = area.pos;
    const cc0 = Hx.toHex(c.x, c.z, HEX);
    for (const ang of angles) {
      const toward = { x: c.x + Math.cos(ang) * 500, z: c.z + Math.sin(ang) * 500 };
      const rim = pickRim(area, toward);
      if (!rim) continue;
      const rp = worldOf(rim);
      let dx = toward.x - rp.x, dz = toward.z - rp.z;
      const dl = Math.hypot(dx, dz) || 1;
      dx /= dl; dz /= dl;
      for (const shift of [2, 3, 4]) {
        const cc = Hx.toHex(rp.x + dx * HEX * Hx.SQRT3 * shift, rp.z + dz * HEX * Hx.SQRT3 * shift, HEX);
        const cells = [[cc.q, cc.r]];
        for (const d of Hx.DIRS) cells.push([cc.q + d[0], cc.r + d[1]]);
        let ok = true;
        for (const [q, r] of cells) {
          if (hexes.has(Hx.key(q, r))) { ok = false; break; }
          // never bridge to a NEIGHBORING region — BFS is elevation-blind
          for (const d of Hx.DIRS) {
            const nh = hexes.get(Hx.key(q + d[0], r + d[1]));
            if (nh && nh.areaId !== area.id) { ok = false; break; }
          }
          if (!ok) break;
        }
        if (!ok) continue;
        // commit the pad: levelled ground, the heart a step proud
        const keys = [];
        cells.forEach(([q, r], i) => {
          setHex(q, r, {
            kind: 'isle', areaId: area.id,
            elev: i === 0 ? 0.6 : 0.45 + rng.float() * 0.08,
            islandId: null, rock: true, court: true,
            flow: [0, 0], faint: false, blocked: false, levi: false,
            gateId: null,
          });
          const k = Hx.key(q, r);
          area.hexKeys.push(k);
          keys.push(k);
        });
        // pave the way from the rim (waystation knots pave stone)
        for (const step of Hx.line(rim.q, rim.r, cc.q, cc.r)) {
          const sk = Hx.key(step.q, step.r);
          if (!hexes.has(sk)) {
            setHex(step.q, step.r, {
              kind: 'isle', areaId: area.id, elev: 0.3 + rng.float() * 0.3,
              islandId: null, rock: true,
              flow: [0, 0], faint: false, blocked: false, levi: false,
              gateId: null,
            });
            area.hexKeys.push(sk);
          }
        }
        // the pad may out-reach the knot: keep the camera cap honest
        area.hexRadius = Math.max(area.hexRadius, Hx.dist(cc.q, cc.r, cc0.q, cc0.r) + 2);
        return { centerKey: Hx.key(cc.q, cc.r), keys, angle: ang };
      }
    }
    return null;
  }

  // A WARDEN CAUSEWAY (Round 11): a ring boundary's ascension gate no longer
  // perches 2-4 hexes off the rim — its platform reaches ~20 tiles straight
  // out toward the next ring. Near the rim a THRESHOLD boss-gate bars the
  // way; midway the causeway swells into a 3-wide ARENA flat; the dolmen
  // travel gate stands on a 7-hex islet at the far end (the stormheart perch
  // joins it there later). Every cell beyond the threshold starts BLOCKED —
  // main.js unblocks the way when the warden falls.
  function placeBossNode(area, toward) {
    const rim = pickRim(area, toward);
    if (!rim) return null;
    const rp = worldOf(rim);
    let dx = toward.x - rp.x, dz = toward.z - rp.z;
    const dl = Math.hypot(dx, dz) || 1;
    dx /= dl; dz /= dl;
    const px2 = -dz, pz2 = dx; // the causeway's sideways reach
    const ROW = HEX * Hx.SQRT3;
    const N_ROWS = 19;   // rim to the dolmen's heart
    const THRESH = 2;    // the threshold boss-gate bars the causeway here
    const ARENA0 = 8, ARENA1 = 13; // the 3-wide arena flat

    const dolmenC = Hx.toHex(rp.x + dx * ROW * N_ROWS, rp.z + dz * ROW * N_ROWS, HEX);
    const spine = Hx.line(rim.q, rim.r, dolmenC.q, dolmenC.r);
    const special = (h) => h.gateId !== null || h.wardId !== undefined
      || h.shrineId !== undefined || h.chainId !== undefined || h.baseY
      || h.stillmoon || h.springStone || h.teleporter || h.spring;
    const obstructed = (q, r) => {
      const h = hexes.get(Hx.key(q, r));
      return h !== undefined && (h.areaId !== area.id || special(h));
    };
    // the causeway's sky must be clear of anything foreign or special —
    // same-area plain cells near the rim are simply absorbed into the walk
    for (let i = 1; i < spine.length; i++) {
      if (obstructed(spine[i].q, spine[i].r)) return null;
    }
    for (const d of Hx.DIRS) {
      if (obstructed(dolmenC.q + d[0], dolmenC.r + d[1])) return null;
    }

    const causewayKeys = [];
    const thresholdKeys = [];
    const blockedKeys = [];
    let arenaKey = null;
    const claim = (q, r, elev) => {
      const k = Hx.key(q, r);
      if (!hexes.has(k)) {
        setHex(q, r, {
          kind: 'isle', areaId: area.id, elev,
          islandId: null, rock: true, causeway: true,
          flow: [0, 0], faint: false, blocked: false, levi: false,
          gateId: null,
        });
        area.hexKeys.push(k);
      }
      return k;
    };
    for (let i = 1; i < spine.length; i++) {
      const { q, r } = spine[i];
      const t = i / spine.length;
      const rowKeys = [claim(q, r, 0.45 + t * 0.3 + rng.float() * 0.15)];
      // widen: both flanks at the threshold and across the arena, one
      // alternating flank elsewhere — a hand-cut causeway, not a runway
      const flanks = (i === THRESH || (i >= ARENA0 && i <= ARENA1)) ? [1, -1]
        : [i % 2 ? 1 : -1];
      const w = Hx.toWorld(q, r, HEX);
      for (const s of flanks) {
        const fc = Hx.toHex(w.x + px2 * ROW * 0.95 * s, w.z + pz2 * ROW * 0.95 * s, HEX);
        if (obstructed(fc.q, fc.r)) continue;
        rowKeys.push(claim(fc.q, fc.r, 0.4 + t * 0.3 + rng.float() * 0.15));
      }
      for (const k of rowKeys) {
        if (!causewayKeys.includes(k)) causewayKeys.push(k);
        if (i === THRESH) {
          thresholdKeys.push(k);
        } else if (i > THRESH) {
          hexes.get(k).blocked = true;
          if (!blockedKeys.includes(k)) blockedKeys.push(k);
        }
      }
      if (i === Math.floor((ARENA0 + ARENA1) / 2)) {
        arenaKey = Hx.key(q, r);
        hexes.get(arenaKey).bossArena = true;
      }
    }
    // the dolmen's 7-hex islet at the causeway's end
    const portKey = claim(dolmenC.q, dolmenC.r, 0.75 + rng.float() * 0.2);
    for (const d of Hx.DIRS) {
      const k = claim(dolmenC.q + d[0], dolmenC.r + d[1], 0.55 + rng.float() * 0.3);
      if (!causewayKeys.includes(k)) causewayKeys.push(k);
      hexes.get(k).blocked = true;
      if (!blockedKeys.includes(k)) blockedKeys.push(k);
    }
    hexes.get(portKey).blocked = true;
    causewayKeys.push(portKey);
    blockedKeys.push(portKey);
    usedPorts.add(Hx.key(rim.q, rim.r));
    if (!arenaKey) arenaKey = causewayKeys[Math.floor(causewayKeys.length / 2)];
    return { portKey, arenaKey, thresholdKeys, causewayKeys, blockedKeys };
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
  function addGate(a, b, kind = 'ring', boss = false) {
    const ek = Math.min(a.id, b.id) + '-' + Math.max(a.id, b.id);
    if (edgeSet.has(ek)) return null;
    // boss crossings get the warden causeway on the DEPARTURE side (the
    // ascension is one-way — the far port stays an ordinary islet); if the
    // sky refuses a causeway, fall back to a plain node and the warden will
    // simply bar the doorway itself
    const bossInfo = boss ? placeBossNode(a, b.pos) : null;
    const ka = bossInfo?.portKey
      ?? placeNode(a, kind === 'ring' ? orbitToward(a, b) : b.pos);
    const kb = placeNode(b, kind === 'ring' ? orbitToward(b, a) : a.pos);
    if (!ka || !kb) return null;
    edgeSet.add(ek);
    const rune = shuffledRunes[gates.length % shuffledRunes.length];
    const gate = {
      id: gates.length, rune, kind,
      name: `The Gate of ${rune.name}`,
      a: a.id, b: b.id,
      portA: ka, portB: kb,
    };
    if (bossInfo) gate.causeway = bossInfo;
    hexes.get(ka).gateId = gate.id;
    hexes.get(kb).gateId = gate.id;
    gates.push(gate);
    edges.push({ a: a.id, b: b.id });
    return gate;
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
      // an asteroid waystation or teleport concourse in this gap splits the
      // crossing in two hops
      const mid = (isOuter ? asteroidByGap.get(i) : undefined)
        ?? teleportByGap.get(ri + ':' + i);
      if (mid) {
        addGate(g[i], mid, 'ring');
        addGate(mid, nxt, 'ring');
      } else {
        addGate(g[i], nxt, 'ring');
      }
    }
    // exactly ONE passage outward per ring boundary, at a random crossing —
    // it starts dark beneath a storm ward (boundary index = ri - 1), and a
    // WARDEN bars its causeway until beaten in combat
    const inner = rng.pick(ringGroups[ri - 1]);
    const outer = nearestArea(ringGroups[ri], inner.pos.x, inner.pos.z);
    const radial = addGate(inner, outer, 'radial', true);
    if (radial) {
      radial.boundary = ri - 1;
      const info = radial.causeway;
      const warden = {
        id: wardens.length, boundary: ri - 1, gateId: radial.id,
        areaId: inner.id,
        arenaKey: info?.arenaKey ?? radial.portA,
        thresholdKeys: info?.thresholdKeys ?? [],
        blockedKeys: info?.blockedKeys ?? [],
        defeated: false,
      };
      radial.wardenId = warden.id;
      for (const k of warden.thresholdKeys) hexes.get(k).thresholdGate = radial.id;
      for (const k of info?.causewayKeys ?? []) hexes.get(k).causewayGate = radial.id;
      wardens.push(warden);
    }
  }
  for (const s of secretsList) {
    const outer = ringGroups[ringGroups.length - 1];
    const sg = addGate(nearestArea(outer, s.pos.x, s.pos.z), s, 'radial');
    if (sg) sg.secretGate = true;
  }

  // ---------------------------------------------------------------- storm wards
  // Each ring boundary's radial gate starts DARK — no veil, no blast — and a
  // stormheart shard waits on a rocky perch beside its departure islet.
  // Claiming the shard ignites the gate and rolls the stormfront back one
  // ring. (The ward's criterion is pluggable: boss tallies join here later.)
  for (const gate of gates) {
    if (gate.boundary === undefined) continue;
    const c = Hx.parseKey(gate.portA);
    // candidate perches: the ring of cells two out from the islet's heart
    const ring2 = [];
    {
      let cq = c.q + 2, cr = c.r;
      for (let side = 0; side < 6; side++) {
        const d = Hx.DIRS[(side + 2) % 6];
        for (let step = 0; step < 2; step++) {
          ring2.push([cq, cr]);
          cq += d[0]; cr += d[1];
        }
      }
    }
    const free = ring2.filter(([q, r]) => !hexes.has(Hx.key(q, r)));
    if (!free.length) continue;
    const [pq, pr] = free[rng.int(free.length)];
    const ward = {
      id: wards.length, boundary: gate.boundary, gateId: gate.id,
      shardKey: Hx.key(pq, pr), dispelled: false, criterion: 'shard',
    };
    const area = areas[hexes.get(gate.portA).areaId];
    setHex(pq, pr, {
      kind: 'isle', areaId: area.id, elev: 0.6 + rng.float() * 0.3,
      islandId: null, rock: true, wardId: ward.id,
      flow: [0, 0], faint: false, blocked: false, levi: false,
      gateId: null,
    });
    area.hexKeys.push(ward.shardKey);
    gate.wardId = ward.id;
    wards.push(ward);
  }
  wards.sort((a, b) => a.boundary - b.boundary);

  // ---------------------------------------------------------------- temple courts
  // Round 12: each teleport concourse grows a 7-hex ANNEX COURT on the side
  // between its two gate islets — the Parthenon temple spans the pad and the
  // teleport stone stands at its heart. Placed after gates so the bearing
  // can bisect the two doorways.
  for (const area of areas) {
    if (!area.teleport) continue;
    const portAngles = [];
    for (const g of gates) {
      const pk = g.a === area.id ? g.portA : g.b === area.id ? g.portB : null;
      if (!pk) continue;
      const p = worldOf(hexes.get(pk));
      portAngles.push(Math.atan2(p.z - area.pos.z, p.x - area.pos.x));
    }
    const angles = [];
    if (portAngles.length >= 2) {
      // the bisector of the two gate bearings — and its far twin as fallback
      const vx = Math.cos(portAngles[0]) + Math.cos(portAngles[1]);
      const vz = Math.sin(portAngles[0]) + Math.sin(portAngles[1]);
      const bis = Math.hypot(vx, vz) > 1e-4
        ? Math.atan2(vz, vx)
        : portAngles[0] + Math.PI / 2; // opposed gates: either flank works
      angles.push(bis, bis + Math.PI);
    } else if (portAngles.length === 1) {
      angles.push(portAngles[0] + Math.PI);
    }
    for (let i = 0; i < 8; i++) angles.push(rng.angle());
    const court = placeCourt(area, angles);
    if (court) {
      const th = hexes.get(court.centerKey);
      th.teleporter = true;
      area.teleportStoneKey = court.centerKey;
      area.court = { kind: 'temple', ...court };
    } else {
      // no room anywhere (shouldn't happen): fall back to the knot's heart
      // so the ring never loses its teleport stone
      let bestK = null, bd = Infinity;
      for (const k of area.hexKeys) {
        const h = hexes.get(k);
        if (h.gateId !== null) continue;
        const p = worldOf(h);
        const d = Math.hypot(p.x - area.pos.x, p.z - area.pos.z);
        if (d < bd) { bd = d; bestK = k; }
      }
      if (bestK) {
        const th = hexes.get(bestK);
        th.teleporter = true;
        th.elev = 0.6;
        area.teleportStoneKey = bestK;
      }
    }
  }

  // ---------------------------------------------------------------- stillmoons
  // ~30% of the RING regions (never the sun, the secrets, or the bare
  // waystations) grow a STILLMOON off their rim: a 25-30 hex satellite
  // platform of bare rock seeded with crystals of one colour, a small
  // polygonal rock body floating over its heart. Moons are placed AFTER the
  // gates and wards so they can keep well away from them: no moon cell may
  // come within 3 hexes of a gate islet or a shard perch.
  const moonPalette = rng.shuffle(STILLMOON_CRYSTALS.slice());
  let moonCursor = 0;

  // keep-out zone: every hex within 3 of a doorway, a stormheart perch, or
  // any cell of a warden causeway
  const gateZone = new Set();
  for (const [k, h] of hexes) {
    if (h.gateId === null && h.wardId === undefined && !h.causeway) continue;
    const { q, r } = Hx.parseKey(k);
    for (let dq = -3; dq <= 3; dq++) {
      for (let dr = Math.max(-3, -dq - 3); dr <= Math.min(3, -dq + 3); dr++) {
        gateZone.add(Hx.key(q + dq, r + dr));
      }
    }
  }

  function placeStillmoon(area) {
    const ch = Hx.toHex(area.pos.x, area.pos.z, HEX);
    for (let tries = 0; tries < 16; tries++) {
      // any bearing dodges the gates best; ring 1 only may not face the sun
      // (a sunward moon there could poke inside the innermost calm circle)
      const dirAng = rng.angle();
      if (area.ring === 1) {
        let dIn = dirAng - (area.angle + Math.PI);
        while (dIn > Math.PI) dIn -= TAU;
        while (dIn < -Math.PI) dIn += TAU;
        if (Math.abs(dIn) < 0.9) continue;
      }
      const rim = pickRim(area, {
        x: area.pos.x + Math.cos(dirAng) * 4000,
        z: area.pos.z + Math.sin(dirAng) * 4000,
      });
      if (!rim) continue;
      const rp = worldOf(rim);
      // the anchor must sit ADJACENT to the rim hex — that adjacency is the
      // attachment; a gap would strand the moon beyond the wisp's reach
      const ac = Hx.toHex(
        rp.x + Math.cos(dirAng) * HEX * Hx.SQRT3,
        rp.z + Math.sin(dirAng) * HEX * Hx.SQRT3, HEX
      );
      if (hexes.has(Hx.key(ac.q, ac.r))) continue;
      if (Hx.dist(ac.q, ac.r, rim.q, rim.r) !== 1) continue;
      if (gateZone.has(Hx.key(ac.q, ac.r))) continue;
      // no cell of the moon may touch another area's hexes
      const foreign = (q, r) => {
        for (const d of Hx.DIRS) {
          const nh = hexes.get(Hx.key(q + d[0], r + d[1]));
          if (nh && nh.areaId !== area.id) return true;
        }
        return false;
      };
      if (foreign(ac.q, ac.r)) continue;

      const target = 25 + rng.int(6);
      const localKey = (q, r) => q + ',' + r;
      const cells = new Set([localKey(ac.q, ac.r)]);
      const frontier = [[ac.q, ac.r]];
      let guard = 0;
      while (cells.size < target && guard++ < 8000) {
        const [fq, fr] = frontier[rng.int(frontier.length)];
        const d = Hx.DIRS[rng.int(6)];
        const nq = fq + d[0], nr = fr + d[1];
        const nk = localKey(nq, nr);
        if (cells.has(nk) || hexes.has(Hx.key(nq, nr))) continue;
        if (Hx.dist(nq, nr, ac.q, ac.r) > 4) continue;             // compact
        if (Hx.dist(nq, nr, ch.q, ch.r) > area.hexRadius + 8) continue; // bounded
        if (gateZone.has(Hx.key(nq, nr))) continue;                // clear of gates
        if (foreign(nq, nr)) continue;
        cells.add(nk);
        frontier.push([nq, nr]);
      }
      if (cells.size < 25) continue; // cramped sky — try another bearing

      // commit: bare rock, a touch higher toward the heart
      const keys = [];
      let cx = 0, cz = 0;
      for (const k of cells) {
        const [q, r] = k.split(',').map(Number);
        const p = Hx.toWorld(q, r, HEX);
        cx += p.x; cz += p.z;
      }
      cx /= cells.size; cz /= cells.size;
      let coreKey = null, coreD = Infinity;
      for (const k of cells) {
        const [q, r] = k.split(',').map(Number);
        const p = Hx.toWorld(q, r, HEX);
        const dCore = Math.hypot(p.x - cx, p.z - cz);
        setHex(q, r, {
          kind: 'isle', areaId: area.id,
          elev: 0.4 + rng.float() * 0.5 + Math.max(0, 1 - dCore / (HEX * 5)) * 0.35,
          islandId: null, rock: true, stillmoon: true,
          flow: [0, 0], faint: false, blocked: false, levi: false,
          gateId: null,
        });
        const kk = Hx.key(q, r);
        area.hexKeys.push(kk);
        keys.push(kk);
        if (dCore < coreD) { coreD = dCore; coreKey = kk; }
      }
      hexes.get(coreKey).moonCore = true;
      area.stillmoon = {
        centerKey: coreKey, keys,
        color: moonPalette[moonCursor++ % moonPalette.length],
      };
      return area.stillmoon;
    }
    return null;
  }
  for (const area of areas) {
    if (area.asteroid || area.secret || area.ring === 0) continue;
    if (!rng.chance(0.3)) continue;
    placeStillmoon(area);
  }

  // ---------------------------------------------------------------- rock-hop helpers
  // A single new rock cell just off the region's rim, facing `toward` —
  // adjacent to whatever it grew from, so it is always sail-reachable.
  function placeRimPerch(area, toward) {
    const rim = pickRim(area, toward);
    if (!rim) return null;
    const rp = worldOf(rim);
    let dx = toward.x - rp.x, dz = toward.z - rp.z;
    const dl = Math.hypot(dx, dz) || 1;
    dx /= dl; dz /= dl;
    for (const shift of [1, 2]) {
      const cc = Hx.toHex(rp.x + dx * HEX * Hx.SQRT3 * shift, rp.z + dz * HEX * Hx.SQRT3 * shift, HEX);
      const ck = Hx.key(cc.q, cc.r);
      if (hexes.has(ck)) continue;
      setHex(cc.q, cc.r, {
        kind: 'isle', areaId: area.id, elev: 0.5 + rng.float() * 0.25,
        islandId: null, rock: true,
        flow: [0, 0], faint: false, blocked: false, levi: false,
        gateId: null,
      });
      area.hexKeys.push(ck);
      usedPorts.add(Hx.key(rim.q, rim.r));
      return ck;
    }
    return null;
  }

  // Claim a fully isolated cell near (x, z): the cell and ALL six neighbors
  // must be empty sky (hop-rocks may never touch anything walkable — the
  // grid is flat, so adjacency would let the wisp simply sail aboard).
  function claimIsolated(x, z) {
    const c0 = Hx.toHex(x, z, HEX);
    const offs = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, -1], [-1, 1]];
    for (const [oq, or2] of offs) {
      const q = c0.q + oq, r = c0.r + or2;
      if (hexes.has(Hx.key(q, r))) continue;
      let clear = true;
      for (const d of Hx.DIRS) {
        if (hexes.has(Hx.key(q + d[0], r + d[1]))) { clear = false; break; }
      }
      if (clear) return { q, r };
    }
    return null;
  }

  // Tracked commits so a half-built chain can be rolled back cleanly.
  function makeTracker(area) {
    const added = [];
    return {
      commit(q, r, rec) {
        const k = Hx.key(q, r);
        setHex(q, r, rec);
        area.hexKeys.push(k);
        added.push(k);
        return k;
      },
      track(k) {
        if (k) added.push(k);
        return k;
      },
      rollback() {
        const set = new Set(added);
        for (const k of added) hexes.delete(k);
        area.hexKeys = area.hexKeys.filter((k) => !set.has(k));
      },
    };
  }

  // ---------------------------------------------------------------- astral shrines
  // Floating heart-vessel platforms hung high off a region's rim. Their old
  // teleportation stones are gone (Round 9): each platform is reached by a
  // rock-hop chain spiralling up from a launch springboard on the rim — but
  // the chain starts HIDDEN (and blocked, so nothing can path onto it) until
  // the region's starlit lodestone, perched on the far rim directly across
  // the region, is claimed.
  function placeShrine(area) {
    for (let tries = 0; tries < 14; tries++) {
      const tk = makeTracker(area);
      const pa = rng.angle();
      const rad = (area.hexRadius + 6 + rng.int(3)) * HEX * Hx.SQRT3;
      const anchor = Hx.toHex(
        area.pos.x + Math.cos(pa) * rad,
        area.pos.z + Math.sin(pa) * rad, HEX
      );
      const tailDir = Hx.DIRS[rng.int(6)];
      const cells = [[anchor.q, anchor.r]];
      for (const d of Hx.DIRS) cells.push([anchor.q + d[0], anchor.r + d[1]]);
      cells.push([anchor.q + tailDir[0] * 2, anchor.r + tailDir[1] * 2]);
      cells.push([anchor.q + tailDir[0] * 3, anchor.r + tailDir[1] * 3]);
      // the platform and its whole neighborhood must be free sky
      let ok = true;
      for (const [q, r] of cells) {
        if (hexes.has(Hx.key(q, r))) { ok = false; break; }
        for (const d of Hx.DIRS) {
          const nk = Hx.key(q + d[0], r + d[1]);
          if (hexes.has(nk) && !cells.some(([q2, r2]) => Hx.key(q2, r2) === nk)) { ok = false; break; }
        }
        if (!ok) break;
      }
      if (!ok) continue;

      // commit the platform first so nothing else claims its sky
      const baseY = 58 + rng.float() * 22;
      const id = shrines.length;
      for (const [q, r] of cells) {
        tk.commit(q, r, {
          kind: 'isle', areaId: area.id, elev: 0.45 + rng.float() * 0.35,
          islandId: null, rock: true, astral: true, baseY,
          flow: [0, 0], faint: false, blocked: false, levi: false,
          gateId: null,
        });
      }
      const padW = Hx.toWorld(anchor.q, anchor.r, HEX);

      // launch springboard below the platform; lodestone straight across
      const launchKey = tk.track(placeRimPerch(area, padW));
      const lodeKey = launchKey && tk.track(placeRimPerch(area, {
        x: 2 * area.pos.x - padW.x, z: 2 * area.pos.z - padW.z,
      }));
      if (!launchKey || !lodeKey) { tk.rollback(); continue; }

      // the hop chain: rocks helixing up around the platform's column at a
      // tight fixed orbit — the region's rim cells stay well clear
      const lh = hexes.get(launchKey);
      const lw = Hx.toWorld(lh.q, lh.r, HEX);
      const th0 = Math.atan2(lw.z - padW.z, lw.x - padW.x);
      const spin = rng.chance(0.5) ? 1 : -1;
      const nHops = 5;
      const hopKeys = [];
      for (let i = 1; i <= nHops; i++) {
        const t = i / (nHops + 1);
        const th = th0 + spin * i * 0.8;
        const r = (4.3 - t * 0.9) * HEX * Hx.SQRT3;
        const cell = claimIsolated(padW.x + Math.cos(th) * r, padW.z + Math.sin(th) * r);
        if (!cell) break;
        hopKeys.push(tk.commit(cell.q, cell.r, {
          kind: 'isle', areaId: area.id, elev: 0.45 + rng.float() * 0.3,
          islandId: null, rock: true, baseY: baseY * Math.pow(t, 1.15),
          flow: [0, 0], faint: false, blocked: false, levi: false,
          gateId: null,
        }));
      }
      if (hopKeys.length < nHops) { tk.rollback(); continue; }

      const padKey = Hx.key(anchor.q, anchor.r);
      const altarKey = Hx.key(anchor.q + tailDir[0] * 3, anchor.r + tailDir[1] * 3);
      const padHex = hexes.get(padKey);
      padHex.shrineId = id; padHex.shrineRole = 'pad';
      const altarHex = hexes.get(altarKey);
      altarHex.shrineId = id; altarHex.shrineRole = 'altar';

      const chain = {
        id: chains.length, kind: 'shrine', areaId: area.id,
        nodes: [launchKey, ...hopKeys, padKey],
        hidden: true, lodeKey, shrineId: id,
      };
      const launchHex = hexes.get(launchKey);
      launchHex.chainId = chain.id; launchHex.chainRole = 'launch';
      for (const hk of hopKeys) {
        const hh = hexes.get(hk);
        hh.chainId = chain.id; hh.chainRole = 'hop';
      }
      for (const nk of [launchKey, ...hopKeys]) {
        const nh = hexes.get(nk);
        nh.hiddenChain = true;
        nh.blocked = true;
      }
      padHex.chainId = chain.id;
      hexes.get(lodeKey).lodeChain = chain.id;
      chains.push(chain);
      const shrine = { id, areaId: area.id, padKey, altarKey, chainId: chain.id, claimed: false, visited: false };
      shrines.push(shrine);
      return shrine;
    }
    return null;
  }
  for (let ri = 1; ri < ringGroups.length; ri++) {
    const picks = rng.shuffle(ringGroups[ri].filter((a) => !a.asteroid && !a.secret));
    for (const area of picks.slice(0, Math.max(1, Math.ceil(picks.length / 2)))) {
      placeShrine(area);
    }
  }

  // ---------------------------------------------------------------- rock-hop attachments
  // ~40% of regions grow a chain of floating rocks off their rim: a launch
  // springboard, a few isolated hop-rocks bowing sideways over the void, and
  // an orbiting islet at the end. Round 12: markets are a hand-authored
  // 12-hex BAZAAR — a dock stone, a walkable aisle, three sale PEDESTALS one
  // hex apart (blocked: taken from beside, never stood on), and a tent row
  // where the Curio Peddler waits. Hermits keep their small 5-cell curio.
  function placeChain(area, kind) {
    for (let tries = 0; tries < 12; tries++) {
      const tk = makeTracker(area);
      const pa = rng.angle();
      const rad = (area.hexRadius + 12 + rng.int(4)) * HEX * Hx.SQRT3;
      const anchor = Hx.toHex(
        area.pos.x + Math.cos(pa) * rad,
        area.pos.z + Math.sin(pa) * rad, HEX
      );
      let cells, layout = null;
      if (kind === 'market') {
        // the bazaar stamp: rows march along F (away from the region, so the
        // dock faces home), lateral cells along L. Pedestals sit at lateral
        // offsets -2/0/+2 — one walkable gap hex between each pair.
        const aw0 = Hx.toWorld(anchor.q, anchor.r, HEX);
        let ux = aw0.x - area.pos.x, uz = aw0.z - area.pos.z;
        const ul = Math.hypot(ux, uz) || 1;
        ux /= ul; uz /= ul;
        let o = 0, bestDot = -Infinity;
        Hx.DIRS.forEach((d, i) => {
          const w = Hx.toWorld(d[0], d[1], HEX);
          const dd = (w.x * ux + w.z * uz) / (Math.hypot(w.x, w.z) || 1);
          if (dd > bestDot) { bestDot = dd; o = i; }
        });
        const F = Hx.DIRS[o], L = Hx.DIRS[(o + 2) % 6];
        const at = (fr, c2) => [anchor.q + F[0] * fr + L[0] * c2, anchor.r + F[1] * fr + L[1] * c2];
        layout = {
          dock: at(0, 0),
          aisle: [at(1, -1), at(1, 0), at(1, 1)],
          pedestals: [at(2, -2), at(2, 0), at(2, 2)],
          gaps: [at(2, -1), at(2, 1)],
          tent: [at(3, -1), at(3, 0), at(3, 1)], // the heart holds the trader
        };
        cells = [layout.dock, ...layout.aisle, ...layout.pedestals, ...layout.gaps, ...layout.tent];
      } else {
        // the hermit's islet: the anchor plus four of its neighbors
        cells = [[anchor.q, anchor.r]];
        const skip = rng.int(6);
        for (let i = 0; i < 6; i++) {
          if (i === skip || i === (skip + 1) % 6) continue;
          cells.push([anchor.q + Hx.DIRS[i][0], anchor.r + Hx.DIRS[i][1]]);
        }
      }
      let ok = true;
      for (const [q, r] of cells) {
        if (hexes.has(Hx.key(q, r))) { ok = false; break; }
        for (const d of Hx.DIRS) {
          const nk = Hx.key(q + d[0], r + d[1]);
          if (hexes.has(nk) && !cells.some(([q2, r2]) => Hx.key(q2, r2) === nk)) { ok = false; break; }
        }
        if (!ok) break;
      }
      if (!ok) continue;

      const destY = 2.5 + rng.float() * 4.5;
      const cellKey = ([q, r]) => Hx.key(q, r);
      const pedKeys = layout ? layout.pedestals.map(cellKey) : [];
      const traderKey = layout ? cellKey(layout.tent[1]) : null;
      for (const [q, r] of cells) {
        const k = Hx.key(q, r);
        const pi = pedKeys.indexOf(k);
        const isTrader = k === traderKey;
        tk.commit(q, r, {
          kind: 'isle', areaId: area.id,
          // the bazaar is a levelled terrace; pedestals stand a step proud
          elev: layout ? (pi >= 0 ? 0.55 : 0.42) : 0.4 + rng.float() * 0.3,
          islandId: null, rock: true, baseY: destY,
          flow: [0, 0], faint: false, blocked: pi >= 0 || isTrader, levi: false,
          gateId: null,
        });
      }
      const aw = Hx.toWorld(anchor.q, anchor.r, HEX);
      const launchKey = tk.track(placeRimPerch(area, aw));
      if (!launchKey) { tk.rollback(); continue; }

      // hops: march from the launch toward the islet, bowing sideways
      const lh = hexes.get(launchKey);
      const lw = Hx.toWorld(lh.q, lh.r, HEX);
      const dist = Math.hypot(aw.x - lw.x, aw.z - lw.z) || 1;
      const nHops = Math.max(2, Math.round(dist / (HEX * Hx.SQRT3 * 3.4)) - 1);
      const side = rng.chance(0.5) ? 1 : -1;
      const px = (-(aw.z - lw.z) / dist) * side, pz = ((aw.x - lw.x) / dist) * side;
      const bow = (6 + rng.float() * 5) * HEX;
      const hopKeys = [];
      for (let i = 1; i <= nHops; i++) {
        const t = i / (nHops + 1);
        const cell = claimIsolated(
          lw.x + (aw.x - lw.x) * t + px * Math.sin(t * Math.PI) * bow,
          lw.z + (aw.z - lw.z) * t + pz * Math.sin(t * Math.PI) * bow
        );
        if (!cell) break;
        hopKeys.push(tk.commit(cell.q, cell.r, {
          kind: 'isle', areaId: area.id, elev: 0.4 + rng.float() * 0.3,
          islandId: null, rock: true, baseY: 1.5 + (destY - 1.5) * t,
          flow: [0, 0], faint: false, blocked: false, levi: false,
          gateId: null,
        }));
      }
      if (hopKeys.length < nHops) { tk.rollback(); continue; }

      // dock: markets always dock on the stamp's near stone; hermit islets
      // dock on the cell nearest the last hop, gift farthest
      let dockKey = null, farKey = null;
      if (layout) {
        dockKey = cellKey(layout.dock);
      } else {
        const lastW = worldOf(hexes.get(hopKeys[hopKeys.length - 1]));
        let dockD = Infinity, farD = -Infinity;
        for (const [q, r] of cells) {
          const w = Hx.toWorld(q, r, HEX);
          const d2 = Math.hypot(w.x - lastW.x, w.z - lastW.z);
          if (d2 < dockD) { dockD = d2; dockKey = Hx.key(q, r); }
          if (d2 > farD) { farD = d2; farKey = Hx.key(q, r); }
        }
      }
      const chain = {
        id: chains.length, kind, areaId: area.id,
        nodes: [launchKey, ...hopKeys, dockKey],
        destKeys: cells.map(([q, r]) => Hx.key(q, r)),
        hidden: false, claimed: false, visited: false,
        hermit: kind === 'event' ? rng.int(HERMITS.length) : null,
        boonKey: farKey, dockKey,
        // Round 12 bazaar: three sale pedestals + the trader's tent heart.
        // stock (the three items + prices) is rolled at runtime by main.
        pedestalKeys: layout ? pedKeys : null,
        traderKey, stock: null,
      };
      const launchHex = hexes.get(launchKey);
      launchHex.chainId = chain.id; launchHex.chainRole = 'launch';
      for (const hk of hopKeys) {
        const hh = hexes.get(hk);
        hh.chainId = chain.id; hh.chainRole = 'hop';
      }
      for (const [q, r] of cells) hexes.get(Hx.key(q, r)).chainId = chain.id;
      hexes.get(dockKey).chainRole = 'dock';
      if (layout) {
        pedKeys.forEach((pk, pi) => {
          const ph2 = hexes.get(pk);
          ph2.chainRole = 'pedestal';
          ph2.pedestal = pi;
        });
        hexes.get(traderKey).chainRole = 'trader';
      } else {
        hexes.get(farKey).chainRole = 'hermit';
      }
      chains.push(chain);
      return chain;
    }
    return null;
  }
  for (const area of areas) {
    if (area.asteroid || area.secret) continue;
    if (!rng.chance(0.4)) continue;
    placeChain(area, rng.chance(0.5) ? 'market' : 'event');
  }

  // ---------------------------------------------------------------- springs
  // Each asteroid waystation keeps a healing spring — Round 12: a 7-hex
  // FOUNTAIN COURT annexed off the knot's rim, the tiered fountain (and its
  // guardian statue) at the heart. (Teleport concourses keep marble, not
  // water.)
  for (const area of areas) {
    if (!area.asteroid || area.teleport) continue;
    const angles = [];
    for (let i = 0; i < 10; i++) angles.push(rng.angle());
    const court = placeCourt(area, angles);
    if (court) {
      hexes.get(court.centerKey).spring = true;
      area.springKey = court.centerKey;
      area.court = { kind: 'spring', ...court };
    } else {
      // cramped rock: fall back to a spring hex among the rubble
      const cand = area.hexKeys.filter((k) => {
        const h = hexes.get(k);
        return h.gateId === null && h.wardId === undefined;
      });
      if (cand.length) {
        const k = cand[rng.int(cand.length)];
        hexes.get(k).spring = true;
        area.springKey = k;
      }
    }
  }

  // ---------------------------------------------------------------- spring stones
  // Every true region of a teleport-served ring keeps a SPRING STONE: a lone
  // rock in the empty nestling gap directly beneath the astral body. It is
  // where the ring's teleport stone drops arriving travelers; from it the
  // wisp hops out to the nestling waters (the stone touches nothing, so it
  // can never be sailed to or from).
  for (const area of areas) {
    if (area.ring < 2 || area.ring > RINGS.length || area.asteroid || area.secret) continue;
    const ch = Hx.toHex(area.pos.x, area.pos.z, HEX);
    const k = Hx.key(ch.q, ch.r);
    if (hexes.has(k)) continue; // the gap should be empty; if not, no stone
    setHex(ch.q, ch.r, {
      kind: 'isle', areaId: area.id, elev: 0.55 + rng.float() * 0.2,
      islandId: null, rock: true, springStone: true,
      flow: [0, 0], faint: false, blocked: false, levi: false,
      gateId: null,
    });
    area.hexKeys.push(k);
    area.springStoneKey = k;
  }

  // ---------------------------------------------------------------- leviathans
  // Serpents of the open void: two circle between the orbits, and one wheels
  // tightly around the hidden crossing to the Unlit Star, marking the way.
  for (const [radius, reverse] of [
    [(RINGS[0].radius + RINGS[1].radius) / 2, false],
    [(RINGS[1].radius + RINGS[2].radius) / 2, true],
  ]) {
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

  // ---------------------------------------------------------------- hazards
  // Trapped hexes thicken and quicken with every ring outward: snare runes on
  // the isles, void geysers in the waters, maw blooms along the shores.
  // (Storm strikes are a runtime hazard, driven by dread in main.)
  const startHex = hexes.get(startKey);
  for (const area of areas) {
    const d = THREE_CLAMP(area.biome.dread ?? 0, 0, 1);
    const snareP = area.ring === 0 ? 0.012 : 0.03 + 0.05 * d;
    const geyserP = area.ring === 0 ? 0 : 0.018 + 0.032 * d;
    // chompers come from the trap atlas: only mapped biomes carry them,
    // rings 1-2 at ~30% density, the Maw Shallows boosted at home
    const trap = TRAPS[area.biome.key];
    const chompP = !trap || area.ring === 0 ? 0
      : (0.05 + 0.08 * d) * (area.ring <= 2 ? 0.3 : 1) * (trap.boost ?? 1);
    for (const k of area.hexKeys) {
      if (k === startKey) continue;
      const h = hexes.get(k);
      if (h.gateId !== null || h.wardId !== undefined || h.shrineId !== undefined
        || h.chainId !== undefined || h.lodeChain !== undefined
        || h.baseY || h.spring || h.court) continue;
      if (area.ring === 0 && Hx.dist(h.q, h.r, startHex.q, startHex.r) < 4) continue;
      if (h.kind === 'water') {
        if (rng.chance(geyserP)) {
          h.hazard = {
            kind: 'geyser', period: 7.5 - 3.5 * d + rng.float() * 2,
            phase: rng.float() * 20, erupt: 1.15, warn: 1.2,
          };
        }
      } else if (!h.rock) {
        let shore = false;
        for (const d2 of Hx.DIRS) {
          const nh = hexes.get(Hx.key(h.q + d2[0], h.r + d2[1]));
          if (!nh || nh.kind === 'water') { shore = true; break; }
        }
        if (shore && rng.chance(chompP)) {
          h.hazard = {
            kind: 'maw', trap: trap.kind, tint: trap.tint,
            period: 4.6 - 2.0 * d + rng.float() * 1.4,
            phase: rng.float() * 20, snap: 0.55,
          };
        } else if (rng.chance(snareP)) {
          h.hazard = { kind: 'snare' };
        }
      }
    }
  }

  const title = `The ${rng.pick(WORLD_ADJ)} ${rng.pick(WORLD_NOUN)}`;

  return {
    seed: seedStr, title, areas, hexes, gates, edges, wards, wardens, shrines,
    chains, leviathans, startKey, progress: { frontier: 0 },
  };
}
