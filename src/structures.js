// Built things of the old world: dolmen waygates (ancient-ruin ports with an
// energy field slung between two pillars) and one named signature landmark
// per region. All stone is hand-roughened; all magic is additive glow.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeVeilMaterial } from './materials.js';
import { traderCanvas, makePaperFigure } from './sprites.js';

const INK = 0x1f1a36;

// Position-keyed hash so displacement never tears duplicated vertices.
function posHash(x, y, z, seed) {
  let h = (seed * 0x9e3779b1) | 0;
  h = Math.imul(h ^ Math.round(x * 89), 0x85ebca6b);
  h = Math.imul(h ^ Math.round(y * 89), 0xc2b2ae35);
  h = Math.imul(h ^ Math.round(z * 89), 0x27d4eb2f);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

// Roughen stone: nudge vertices outward in XZ (keeps silhouettes chunky).
function roughen(geo, seed, amt) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = posHash(x, y, z, seed) - 0.5;
    const rl = Math.hypot(x, z) || 1;
    const m = 1 + (n * amt) / rl;
    pos.setXYZ(i, x * m, y + (posHash(z, x, y, seed + 7) - 0.5) * amt * 0.4, z * m);
  }
  geo.computeVertexNormals();
  return geo;
}

const compose = (x, y, z, rx = 0, ry = 0, rz = 0) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(1, 1, 1)
  );

// ---------------------------------------------------------------- dolmen gate

// startLit: a warded (stormbound) gate begins DARK — no veil, no under-glow,
// rune plates barely embers — until ignite() pours the energy field in.
// grand: the outward ASCENSION gates are half again as tall and carry a
// crystal socket in their crown — empty until the stormheart shard seats
// itself, spent (grey, glowless) once the gate has hurled its one traveler.
export function makeDolmenGate({ rng, gradientMap, glyphTex, glowTex, animators, startLit = true, grand = false }) {
  const g = new THREE.Group();
  const seed = (rng.float() * 1e6) | 0;
  const lit = { cur: startLit ? 1 : 0, target: startLit ? 1 : 0 };
  const S = grand ? 1.6 : 1; // the ascension gates loom

  const stoneMat = new THREE.MeshToonMaterial({
    color: new THREE.Color(grand ? 0x77719c : 0x8c8678)
      .offsetHSL((rng.float() - 0.5) * 0.03, 0, (rng.float() - 0.5) * 0.05),
    gradientMap,
  });
  const stoneDark = new THREE.MeshToonMaterial({ color: 0x635e55, gradientMap });
  const mossMat = new THREE.MeshToonMaterial({ color: 0x55704a, gradientMap });

  const stoneParts = [];
  const inkParts = [];
  function addStone(geo, m4, hull = [1.16, 1.03, 1.16]) {
    const o = geo.clone();
    o.scale(hull[0], hull[1], hull[2]);
    geo.applyMatrix4(m4);
    o.applyMatrix4(m4);
    stoneParts.push(geo);
    inkParts.push(o);
  }

  // two massive rough-hewn pillars, each leaning slightly off true
  // (the grand gates stand truer — awe wants discipline)
  for (const side of [-1, 1]) {
    const p = roughen(new THREE.CylinderGeometry(0.82 * S, 1.18 * S, 5.6 * S, 7, 3), seed + side, 0.4 * S);
    addStone(p, compose(side * 2.9 * S, 2.78 * S, 0, 0, rng.angle(), rng.range(-0.05, 0.05) * (grand ? 0.4 : 1)));
  }
  // the cracked capstone: two halves, one slumped a little lower
  const linA = roughen(new THREE.BoxGeometry(3.35 * S, 0.95 * S, 1.5 * S), seed + 3, 0.22 * S);
  addStone(linA, compose(-1.52 * S, 6.12 * S, 0, 0, 0, grand ? 0.012 : 0.03), [1.08, 1.12, 1.12]);
  const linB = roughen(new THREE.BoxGeometry(3.3 * S, 0.95 * S, 1.5 * S), seed + 4, 0.22 * S);
  addStone(linB, compose(1.62 * S, 6.0 * S + (grand ? 0.14 : 0), 0, 0, 0, grand ? -0.02 : -0.055), [1.08, 1.12, 1.12]);
  // a fallen fragment of the old arch, half-buried where it landed
  const shard = roughen(new THREE.BoxGeometry(2.2, 0.62, 1.05), seed + 5, 0.2);
  addStone(
    shard,
    compose((rng.chance(0.5) ? -1 : 1) * rng.range(2.2, 3.6) * S, 0.26, rng.range(1.6, 3.2), 0, rng.angle(), 0.14),
    [1.1, 1.15, 1.15]
  );

  // the crown: a peaked apex stone bearing the crystal socket
  const crystalY = 6.6 * S + (grand ? 2.75 : 0);
  if (grand) {
    const crown = roughen(new THREE.BoxGeometry(2.5, 1.5, 1.9), seed + 6, 0.2);
    addStone(crown, compose(0, 6.6 * S + 0.75, 0, 0, 0, 0), [1.1, 1.1, 1.1]);
    for (const side of [-1, 1]) {
      const prong = roughen(new THREE.ConeGeometry(0.34, 1.7, 5), seed + 7 + side, 0.1);
      addStone(prong, compose(side * 0.85, 6.6 * S + 2.2, 0, 0, 0, -side * 0.22), [1.2, 1.06, 1.2]);
    }
  }

  g.add(new THREE.Mesh(mergeGeometries(stoneParts), stoneMat));
  g.add(new THREE.Mesh(
    mergeGeometries(inkParts),
    new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })
  ));

  // scattered rubble ringing the threshold
  {
    const bits = [];
    const n = 7 + rng.int(4);
    for (let i = 0; i < n; i++) {
      const b = new THREE.DodecahedronGeometry(0.28 + rng.float() * 0.3, 0);
      b.scale(1, 0.55 + rng.float() * 0.3, 1);
      const a = rng.angle();
      const r = (2.4 + rng.float() * 2.2) * S;
      b.applyMatrix4(compose(Math.cos(a) * r, 0.16, Math.sin(a) * r, 0, rng.angle(), 0));
      bits.push(b);
    }
    g.add(new THREE.Mesh(mergeGeometries(bits), stoneDark));
  }

  // moss holding the ruin together
  {
    const clumps = [];
    for (let i = 0; i < 6; i++) {
      const c = new THREE.SphereGeometry(0.22 + rng.float() * 0.16, 6, 5);
      c.scale(1, 0.4, 1);
      if (i < 4) {
        const side = i % 2 ? 1 : -1;
        const a = rng.angle();
        c.applyMatrix4(compose(side * 2.9 * S + Math.cos(a) * 1.02, (0.5 + rng.float() * 4.6) * S, Math.sin(a) * 1.02));
      } else {
        c.applyMatrix4(compose(rng.range(-2.4, 2.4) * S, 6.62 * S, rng.range(-0.4, 0.4)));
      }
      clumps.push(c);
    }
    g.add(new THREE.Mesh(mergeGeometries(clumps), mossMat));
  }

  // the warden's rune, carved into both pillar faces
  const plateMat = new THREE.MeshBasicMaterial({
    map: glyphTex, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false,
  });
  for (const side of [-1, 1]) {
    for (const face of [1, -1]) {
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.3 * S, 1.3 * S), plateMat);
      plate.position.set(side * 2.9 * S, 3.25 * S, face * 1.18 * S);
      plate.renderOrder = 2; // above the water sheets
      if (face < 0) plate.rotation.y = Math.PI;
      g.add(plate);
    }
  }

  // the energy field hung between the pillars (absent while the gate is dark)
  const veilMat = makeVeilMaterial(0xb89aff, lit.cur);
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(4.0 * S, 4.8 * S, 1, 10), veilMat);
  veil.position.set(0, 2.78 * S, 0);
  veil.renderOrder = 2;
  g.add(veil);

  const under = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xb89aff, transparent: true, opacity: 0.22 * lit.cur,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  under.position.set(0, 3 * S, 0);
  under.scale.setScalar(7.5 * S);
  under.renderOrder = 3;
  g.add(under);

  // the crystal in its socket (grand gates only): absent, seated, or spent
  const crystalState = { cur: 'empty' };
  let crystal = null, crystalInk = null, crystalGlow = null;
  if (grand) {
    crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.62, 0),
      new THREE.MeshBasicMaterial({ color: 0xcabcff })
    );
    crystal.scale.set(0.8, 1.7, 0.8);
    crystal.position.y = crystalY;
    crystal.visible = false;
    crystalInk = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.62, 0),
      new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })
    );
    crystalInk.scale.set(0.95, 1.85, 0.95);
    crystalInk.position.y = crystalY;
    crystalInk.visible = false;
    crystalGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0x8a76e6, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    crystalGlow.position.y = crystalY;
    crystalGlow.scale.setScalar(6);
    crystalGlow.renderOrder = 3;
    g.add(crystal, crystalInk, crystalGlow);
  }
  function setCrystal(state) {
    if (!grand) return;
    crystalState.cur = state;
    crystal.visible = crystalInk.visible = state !== 'empty';
    if (state === 'spent') crystal.material.color.set(0x6a6478);
  }

  // two warning glyphs still slowly pacing their rounds
  const orbiters = [];
  for (let i = 0; i < 2; i++) {
    const s = new THREE.Sprite(plateMat.clone());
    s.scale.setScalar(1.4 * S);
    s.renderOrder = 3;
    g.add(s);
    orbiters.push(s);
  }
  const phase = rng.angle();
  animators.push((t, dt) => {
    lit.cur += (lit.target - lit.cur) * Math.min(1, dt * 1.4);
    veilMat.uniforms.uTime.value = t;
    veilMat.uniforms.uIgnite.value = lit.cur;
    under.material.opacity = 0.22 * lit.cur;
    plateMat.opacity = (0.68 + 0.22 * Math.sin(t * 1.3 + phase)) * (0.22 + 0.78 * lit.cur);
    orbiters.forEach((s, i) => {
      const a = t * 0.5 + phase + i * Math.PI;
      s.position.set(Math.cos(a) * 4.5 * S, (4.1 + Math.sin(t * 1.1 + i * 2) * 0.5) * S, Math.sin(a) * 4.5 * S);
      s.material.opacity = plateMat.opacity;
    });
    if (crystalGlow) {
      if (crystalState.cur === 'filled') {
        crystal.rotation.y += dt * 0.9;
        crystalInk.rotation.y = crystal.rotation.y;
        crystalGlow.material.opacity = 0.4 + 0.22 * Math.sin(t * 4.1 + phase);
      } else {
        crystalGlow.material.opacity = Math.max(0, crystalGlow.material.opacity - dt * 0.6);
      }
    }
  });

  return { group: g, ignite: () => { lit.target = 1; }, setCrystal, crystalY, grand };
}

// ---------------------------------------------------------------- shrine stone
// The teleportation stone at the heart of an astral shrine's sea islet: a
// circle of six leaning menhirs around a glowing rune disc that hurls the
// traveler skyward to the floating platform.
export function makeShrineStone({ rng, gradientMap, glowTex, animators }) {
  const g = new THREE.Group();
  const seed = (rng.float() * 1e6) | 0;
  const stoneMat = new THREE.MeshToonMaterial({ color: 0x7d76a1, gradientMap });

  const parts = [];
  const inks = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng.float() * 0.2;
    const h = 1.7 + rng.float() * 1.1;
    const m = roughen(new THREE.BoxGeometry(0.62, h, 0.42), seed + i, 0.16);
    const mtx = compose(Math.cos(a) * 2.1, h / 2, Math.sin(a) * 2.1, 0, -a, (rng.float() - 0.5) * 0.22);
    const o = m.clone();
    o.scale(1.18, 1.06, 1.18);
    m.applyMatrix4(mtx);
    o.applyMatrix4(mtx);
    parts.push(m);
    inks.push(o);
  }
  g.add(new THREE.Mesh(mergeGeometries(parts), stoneMat));
  g.add(new THREE.Mesh(
    mergeGeometries(inks),
    new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })
  ));

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: 0xb9a6ff, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  disc.position.y = 0.14;
  disc.renderOrder = 2;
  g.add(disc);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xb9a6ff, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.position.y = 1.6;
  glow.scale.setScalar(6);
  glow.renderOrder = 3;
  g.add(glow);

  const ph = rng.angle();
  animators.push((t) => {
    disc.material.opacity = 0.28 + 0.2 * Math.sin(t * 1.7 + ph);
    glow.material.opacity = 0.24 + 0.16 * Math.sin(t * 1.1 + ph);
  });
  return g;
}

// ---------------------------------------------------------------- shrine altar
// The silent altar on a floating platform. Bears a papercraft heart-vessel
// until claimed; trials arrive with the combat pass.
export function makeAltar({ rng, gradientMap, glowTex, animators }) {
  const g = new THREE.Group();
  const ped = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 1.15, 1.9, 7),
    new THREE.MeshToonMaterial({ color: 0x7d76a1, gradientMap })
  );
  ped.position.y = 0.95;
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 0.75, 0.8, 8, 1, true),
    new THREE.MeshToonMaterial({ color: 0x8c86ad, gradientMap, side: THREE.DoubleSide })
  );
  bowl.position.y = 2.2;
  g.add(ped, bowl);

  // a cut-paper heart, slowly turning above the bowl
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.85);
  shape.bezierCurveTo(-1.15, 0.1, -0.95, 0.95, -0.45, 0.95);
  shape.bezierCurveTo(-0.12, 0.95, 0, 0.7, 0, 0.5);
  shape.bezierCurveTo(0, 0.7, 0.12, 0.95, 0.45, 0.95);
  shape.bezierCurveTo(0.95, 0.95, 1.15, 0.1, 0, -0.85);
  const heart = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: false }),
    new THREE.MeshBasicMaterial({ color: 0xff8fa8 })
  );
  heart.position.y = 3.6;
  const heartInk = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }),
    new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })
  );
  heartInk.scale.setScalar(1.12);
  heartInk.position.set(0, 3.6, -0.04);
  g.add(heart, heartInk);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xff9ab8, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.position.y = 3.6;
  glow.scale.setScalar(5.5);
  glow.renderOrder = 3;
  g.add(glow);

  const state = { claimed: false, t: 0 };
  const ph = rng.angle();
  animators.push((t, dt) => {
    if (!state.claimed) {
      heart.rotation.y += dt * 0.8;
      heartInk.rotation.y = heart.rotation.y;
      const bob = Math.sin(t * 1.4 + ph) * 0.18;
      heart.position.y = 3.6 + bob;
      heartInk.position.y = 3.6 + bob;
      glow.position.y = 3.6 + bob;
      glow.material.opacity = 0.38 + 0.2 * Math.sin(t * 2.1 + ph);
    } else if (state.t < 1) {
      state.t = Math.min(1, state.t + dt * 1.4);
      const s = 1 - state.t;
      heart.scale.setScalar(Math.max(0.001, s));
      heartInk.scale.setScalar(Math.max(0.001, s * 1.12));
      glow.material.opacity = 0.5 * s;
    }
  });
  return { group: g, claim: () => { state.claimed = true; } };
}

// ---------------------------------------------------------------- chompers
// The land-trap atlas: one snapping archetype per biome family, personalised
// by tint. Every model exposes setOpen(o) with o in [0..1] (1 = jaws wide,
// 0 = shut) — buildWorld drives the snap cycle.
export function makeChomper(kind, { tint, gradientMap, rng }) {
  const g = new THREE.Group();
  const toon = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap });
  const basic = (c) => new THREE.MeshBasicMaterial({ color: c });
  const toothMat = toon(0xf2ead2);
  const bodyMat = toon(tint ?? 0x6e5c66);
  let setOpen;

  switch (kind) {
    case 'flytrap': { // a Venus trap grown to hex scale
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + rng.float();
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 4), bodyMat);
        leaf.position.set(Math.cos(a) * 0.75, 0.28, Math.sin(a) * 0.75);
        leaf.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15);
        g.add(leaf);
      }
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.7, 6), bodyMat);
      stem.position.y = 0.35;
      g.add(stem);
      const jaws = [];
      for (const side of [-1, 1]) {
        const jaw = new THREE.Group();
        const pod = new THREE.Mesh(
          new THREE.SphereGeometry(0.72, 8, 6, 0, Math.PI), bodyMat
        );
        pod.scale.set(1, 1.15, 0.5);
        pod.rotation.x = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        jaw.add(pod);
        for (let i = 0; i < 4; i++) {
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.4, 4), toothMat);
          tooth.position.set(-0.45 + i * 0.3, 0.05, side * 0.62);
          tooth.rotation.x = side * 0.5;
          jaw.add(tooth);
        }
        jaw.position.y = 0.75;
        g.add(jaw);
        jaws.push({ jaw, side });
      }
      setOpen = (o) => {
        for (const { jaw, side } of jaws) jaw.rotation.x = side * (0.12 + 1.0 * o);
      };
      break;
    }
    case 'clamshell': { // a great pearl-clam agape on the shore
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), basic(0xfff2d9));
      pearl.position.y = 0.42;
      const lower = new THREE.Mesh(new THREE.SphereGeometry(1.0, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat);
      lower.scale.set(1, 0.42, 1);
      lower.rotation.x = Math.PI;
      lower.position.y = 0.44;
      const hinge = new THREE.Group();
      const upper = new THREE.Mesh(new THREE.SphereGeometry(1.0, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat);
      upper.scale.set(1, 0.42, 1);
      upper.position.z = 1.0;
      hinge.add(upper);
      hinge.position.set(0, 0.46, -1.0);
      for (let i = 0; i < 3; i++) { // barnacles
        const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), toon(0x8c8678));
        const a = rng.angle();
        b.position.set(Math.cos(a) * 0.8, 0.25, Math.sin(a) * 0.8);
        g.add(b);
      }
      g.add(pearl, lower, hinge);
      setOpen = (o) => { hinge.rotation.x = -1.05 * o; };
      break;
    }
    case 'gearpress': { // Horolith's contribution: a clapping tooth-gear
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.1, 6), toon(0x6e5426));
      post.position.set(0, 0.55, -0.85);
      const mkGear = () => {
        const gear = new THREE.Group();
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.22, 9), bodyMat);
        gear.add(disc);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.3), toothMat);
          tooth.position.set(Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85);
          tooth.rotation.y = -a;
          gear.add(tooth);
        }
        return gear;
      };
      const lower = mkGear();
      lower.position.y = 0.28;
      const hinge = new THREE.Group();
      const upper = mkGear();
      upper.position.z = 0.85;
      hinge.add(upper);
      hinge.position.set(0, 0.62, -0.85);
      g.add(post, lower, hinge);
      setOpen = (o) => { hinge.rotation.x = -1.1 * o; };
      break;
    }
    case 'bonejaw': { // mandibles of something long unfed, half-buried
      const jaws = [];
      for (const side of [-1, 1]) {
        const jaw = new THREE.Group();
        const arc = new THREE.Mesh(
          new THREE.TorusGeometry(0.85, 0.14, 6, 10, Math.PI * 0.85), bodyMat
        );
        arc.rotation.x = -Math.PI / 2;
        arc.rotation.z = side > 0 ? -0.4 : Math.PI - 0.4 + 0.8;
        jaw.add(arc);
        for (let i = 0; i < 4; i++) {
          const a = 0.35 + i * 0.6;
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.45, 4), toothMat);
          tooth.position.set(Math.cos(a) * 0.85 * side, 0.2, -Math.sin(a) * 0.85);
          jaw.add(tooth);
        }
        jaw.position.y = 0.3;
        g.add(jaw);
        jaws.push({ jaw, side });
      }
      const knuckle = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), bodyMat);
      knuckle.position.set(0, 0.25, 0.9);
      g.add(knuckle);
      setOpen = (o) => {
        for (const { jaw, side } of jaws) jaw.rotation.y = side * (0.15 + 0.85 * o);
      };
      break;
    }
    case 'lure': { // a pretty light on a stalk; the teeth wait below
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 1.5, 6), toon(0x3a3447));
      stalk.position.y = 0.75;
      stalk.rotation.z = 0.35;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), basic(tint ?? 0xffd9a8));
      bulb.position.set(-0.5, 1.5, 0);
      g.add(stalk, bulb);
      const teeth = [];
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const pivot = new THREE.Group();
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.85, 4), toothMat);
        tooth.position.y = 0.42;
        pivot.add(tooth);
        pivot.position.set(Math.cos(a) * 0.85, 0.1, Math.sin(a) * 0.85);
        pivot.rotation.y = -a - Math.PI / 2;
        g.add(pivot);
        teeth.push(pivot);
      }
      setOpen = (o) => {
        for (const p of teeth) p.rotation.x = -(1 - o) * 1.25 - 0.15;
      };
      break;
    }
    default: { // toothmaw — the Maw Shallows' native chomper
      const mkJaw = (up) => {
        const jaw = new THREE.Group();
        const lip = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 0.5, 7), bodyMat);
        jaw.add(lip);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + 0.4;
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.8, 4), toothMat);
          tooth.position.set(Math.cos(a) * 0.95, up ? 0.5 : -0.5, Math.sin(a) * 0.95);
          if (!up) tooth.rotation.x = Math.PI;
          jaw.add(tooth);
        }
        return jaw;
      };
      const lower = mkJaw(true);
      lower.position.y = 0.3;
      const hinge = new THREE.Group();
      const upper = mkJaw(false);
      upper.position.set(0, 0.55, 1.0);
      hinge.add(upper);
      hinge.position.set(0, 0.55, -1.0);
      g.add(lower, hinge);
      setOpen = (o) => { hinge.rotation.x = -0.95 * o; };
    }
  }
  g.rotation.y = rng.angle();
  setOpen(1);
  return { group: g, setOpen };
}

// ---------------------------------------------------------------- springboard
// The launch hex of a rock-hop chain: a cracked stone springboard ringed by
// small cairns that point the way out over the void.
export function makeSpringboard({ rng, gradientMap, glowTex }) {
  const g = new THREE.Group();
  const seed = (rng.float() * 1e6) | 0;
  const disc = new THREE.Mesh(
    roughen(new THREE.CylinderGeometry(1.7, 1.9, 0.45, 8, 1), seed, 0.2),
    new THREE.MeshToonMaterial({ color: 0x8c8678, gradientMap })
  );
  disc.position.y = 0.22;
  disc.rotation.z = 0.05;
  g.add(disc);
  // the crack
  const crack = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.06, 0.12),
    new THREE.MeshBasicMaterial({ color: INK })
  );
  crack.position.y = 0.46;
  crack.rotation.y = rng.angle();
  g.add(crack);
  // pointing cairns at the void-side rim
  for (let i = 0; i < 3; i++) {
    const cairn = new THREE.Group();
    let y = 0;
    for (let s = 0; s < 3 - (i % 2); s++) {
      const r = 0.24 - s * 0.06;
      const stone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(r, 0),
        new THREE.MeshToonMaterial({ color: 0x6e6e80, gradientMap })
      );
      stone.position.y = y + r;
      y += r * 1.7;
      cairn.add(stone);
    }
    cairn.position.set(1.1 + i * 0.25, 0.4, -0.9 + i * 0.9);
    g.add(cairn);
  }
  const under = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xb9a6ff, transparent: true, opacity: 0.28,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  under.position.y = 0.7;
  under.scale.setScalar(4.5);
  under.renderOrder = 3;
  g.add(under);
  return g;
}

// ---------------------------------------------------------------- gift market
// The Curio Peddler's tent — Round 12: a broad patched pavilion spanning the
// bazaar's back row, and the trader in person as a 2D paper cutout beneath
// it. Local +Z is the tent's FRONT (toward the pedestal row and the dock);
// buildWorld rotates the group to face the aisle.
export function makeMarketStall({ rng, gradientMap, glowTex, animators }) {
  const g = new THREE.Group();
  const toon = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap });

  // four timber poles: the front pair taller, so the canvas sheds starlight
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const h = sz > 0 ? 4.6 : 3.6;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, h, 5), toon(0x59431f));
      pole.position.set(sx * 5.6, h / 2, sz * 2.3);
      pole.rotation.z = sx * 0.03;
      g.add(pole);
    }
  }
  // the awning: one broad patched sheet pitched down toward the back
  const awning = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.14, 5.8), toon(0xb8506a));
  awning.position.set(0, 4.15, -0.1);
  awning.rotation.x = 0.19;
  g.add(awning);
  // patches sewn onto the canvas
  for (let i = 0; i < 4; i++) {
    const patch = new THREE.Mesh(
      new THREE.BoxGeometry(1.2 + rng.float() * 1.4, 0.05, 1.0 + rng.float()),
      toon(i % 2 ? 0xe8e4d2 : 0x8c5a6e)
    );
    patch.position.set(-4.6 + rng.float() * 9.2, 4.24 + i * 0.001, -1.6 + rng.float() * 3.2);
    patch.rotation.x = 0.19;
    patch.rotation.y = (rng.float() - 0.5) * 0.3;
    g.add(patch);
  }
  // scalloped valance along the front lip
  const valance = new THREE.Mesh(new THREE.BoxGeometry(12.7, 0.5, 0.1), toon(0xe8e4d2));
  valance.position.set(0, 4.4, 2.75);
  g.add(valance);
  // a canvas back wall keeping the void wind out
  const back = new THREE.Mesh(new THREE.BoxGeometry(12.2, 2.8, 0.12), toon(0xa04a60));
  back.position.set(0, 1.5, -2.45);
  g.add(back);

  // wares stacked in the wings: crates, sacks, a rolled carpet
  for (let i = 0; i < 6; i++) {
    const s = 0.6 + rng.float() * 0.5;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), toon(i % 2 ? 0xa6845c : 0x8c6e4a));
    const sx = i < 3 ? -1 : 1;
    crate.position.set(sx * (3.4 + rng.float() * 1.4), s / 2 + (i % 3 === 2 ? 0.9 : 0), -1.2 + rng.float() * 1.6);
    crate.rotation.y = rng.angle();
    g.add(crate);
  }
  const carpet = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.6, 7), toon(0x8a5aa0));
  carpet.position.set(-4.4, 0.35, 1.4);
  carpet.rotation.z = Math.PI / 2;
  carpet.rotation.y = 0.4;
  g.add(carpet);

  // the trader: a paper cutout waiting at the tent's heart
  const trader = makePaperFigure(traderCanvas(), {
    height: 3.7, glow: 0xffd9a8, glowScale: 1.5,
  });
  trader.position.set(0.2, 0.05, -0.7);
  g.add(trader);

  // the hanging lantern over the counter
  const lantern = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xffd9a8, transparent: true, opacity: 0.6,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  lantern.position.set(1.6, 3.4, 1.6);
  lantern.scale.setScalar(2.6);
  lantern.renderOrder = 3;
  g.add(lantern);

  const ph = rng.angle();
  animators.push((t) => {
    lantern.material.opacity = 0.45 + 0.18 * Math.sin(t * 2.1 + ph) * Math.sin(t * 0.9);
    // the trader sways gently, paper in a soft wind
    trader.rotation.z = Math.sin(t * 0.8 + ph) * 0.03;
  });
  return g;
}

// A sale pedestal (Round 12): a waist-high plinth on its own blocked hex,
// the ware floating above as a tier-tinted sigil. Bought (or bare), the
// ware shrinks away and the runelight dies.
export function makeSalePedestal({ rng, gradientMap, glowTex, animators }) {
  const g = new THREE.Group();
  const ped = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.85, 1.5, 7),
    new THREE.MeshToonMaterial({ color: 0x7d76a1, gradientMap })
  );
  ped.position.y = 0.75;
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.6, 0.22, 7),
    new THREE.MeshToonMaterial({ color: 0x8f88b5, gradientMap })
  );
  cap.position.y = 1.58;
  const ware = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.48, 0),
    new THREE.MeshBasicMaterial({ color: 0xffd9a8 })
  );
  ware.position.y = 2.7;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xffd9a8, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.position.y = 2.7;
  glow.scale.setScalar(3.4);
  glow.renderOrder = 3;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.05, 6, 20),
    new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.5 })
  );
  ring.position.y = 2.7;
  ring.renderOrder = 2;
  g.add(ped, cap, ware, glow, ring);
  const state = { claimed: false };
  const ph = rng.angle();
  animators.push((t, dt) => {
    if (state.claimed) {
      ware.scale.lerp(new THREE.Vector3(0.001, 0.001, 0.001), Math.min(1, dt * 3));
      glow.material.opacity = Math.max(0, glow.material.opacity - dt * 0.8);
      ring.material.opacity = Math.max(0, ring.material.opacity - dt * 0.8);
    } else {
      ware.rotation.y += dt * 1.2;
      ware.position.y = 2.7 + Math.sin(t * 1.7 + ph) * 0.16;
      glow.position.y = ware.position.y;
      ring.position.y = ware.position.y;
      ring.rotation.x = Math.PI / 2 + Math.sin(t * 0.8 + ph) * 0.4;
      ring.rotation.y = t * 0.5;
      glow.material.opacity = 0.36 + 0.16 * Math.sin(t * 2.4 + ph);
    }
  });
  return {
    group: g,
    setTint: (c) => {
      ware.material.color.setHex(c);
      glow.material.color.setHex(c);
    },
    claim: () => { state.claimed = true; },
  };
}

// The boon pedestal: the peddler's one free gift, floating until taken.
// RETIRED (Round 12): the bazaar's three makeSalePedestal wares replaced
// it. Kept for reference, like makeShrineStone — nothing imports it.
export function makeBoonPedestal({ rng, gradientMap, glowTex, animators }) {
  const g = new THREE.Group();
  const ped = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, 1.1, 7),
    new THREE.MeshToonMaterial({ color: 0x7d76a1, gradientMap })
  );
  ped.position.y = 0.55;
  const gift = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.42, 0),
    new THREE.MeshBasicMaterial({ color: 0xffd9a8 })
  );
  gift.position.y = 1.9;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xffd9a8, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.position.y = 1.9;
  glow.scale.setScalar(3.2);
  glow.renderOrder = 3;
  g.add(ped, gift, glow);
  const state = { claimed: false };
  const ph = rng.angle();
  animators.push((t, dt) => {
    if (state.claimed) {
      gift.scale.lerp(new THREE.Vector3(0.001, 0.001, 0.001), Math.min(1, dt * 3));
      glow.material.opacity = Math.max(0, glow.material.opacity - dt * 0.8);
    } else {
      gift.rotation.y += dt * 1.1;
      gift.position.y = 1.9 + Math.sin(t * 1.6 + ph) * 0.15;
      glow.material.opacity = 0.38 + 0.18 * Math.sin(t * 2.2 + ph);
    }
  });
  return { group: g, claim: () => { state.claimed = true; } };
}

// ---------------------------------------------------------------- hermit
// A small robed figure by a cold little fire, out where nothing else sits.
export function makeHermit({ rng, gradientMap, glowTex, animators }) {
  const g = new THREE.Group();
  const toon = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap });
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.5, 6), toon(0x5c5470));
  robe.position.y = 0.75;
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.7, 6), toon(0x474060));
  hood.position.y = 1.65;
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.2, 5), toon(0x59431f));
  staff.position.set(0.7, 1.1, 0);
  staff.rotation.z = -0.12;
  const tip = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0x9ffff0, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  tip.position.set(0.83, 2.25, 0);
  tip.scale.setScalar(1.2);
  tip.renderOrder = 3;
  const fire = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0x8f9bff, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  fire.position.set(-0.8, 0.35, 0.5);
  fire.scale.setScalar(1.8);
  fire.renderOrder = 3;
  g.add(robe, hood, staff, tip, fire);
  const ph = rng.angle();
  animators.push((t) => {
    fire.material.opacity = 0.35 + 0.2 * Math.sin(t * 4.2 + ph) * Math.sin(t * 2.7);
    tip.material.opacity = 0.55 + 0.2 * Math.sin(t * 1.3 + ph);
  });
  g.rotation.y = rng.angle();
  return g;
}

// ---------------------------------------------------------------- storm herald
// RETIRED (Round 10.1): the warden silhouettes no longer pace the storm.
// Kept for reference, like makeShrineStone — nothing imports it.
export function makeHerald({ rng, glowTex }) {
  const g = new THREE.Group();
  const dark = new THREE.MeshBasicMaterial({ color: 0x0e0b1e });
  const robe = new THREE.Mesh(new THREE.ConeGeometry(7.5, 30, 7), dark);
  robe.position.y = 15;
  const head = new THREE.Mesh(new THREE.SphereGeometry(3.4, 8, 6), dark);
  head.position.y = 32;
  g.add(robe, head);
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.9, 6.5, 5), dark);
    horn.position.set(side * 2.6, 36, 0);
    horn.rotation.z = -side * 0.5;
    g.add(horn);
    const eye = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xb9a6ff, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    eye.position.set(side * 1.3, 32.4, 2.9);
    eye.scale.setScalar(2.6);
    eye.renderOrder = 6;
    g.add(eye);
  }
  g.rotation.y = rng.angle();
  return g;
}

// ---------------------------------------------------------------- teleport temple
// The temple of a teleport concourse — Round 12: grown from a pillared hut
// into a true Parthenon spanning its 7-hex annex court. A three-stepped
// stylobate, a full peristyle of marble columns, a gabled roof, and broad
// forecourt steps spilling from the FRONT (local +Z — buildWorld turns it
// to face the island between the two gates). The ring's teleport stone
// still burns on its omphalos at the heart.
export function makeTemple({ rng, gradientMap, glowTex, animators }) {
  const g = new THREE.Group();
  const seed = (rng.float() * 1e6) | 0;
  const marble = new THREE.MeshToonMaterial({ color: 0xe6e0cc, gradientMap });
  const marbleDim = new THREE.MeshToonMaterial({ color: 0xcfc8b2, gradientMap });

  const parts = [];
  const inks = [];
  const add = (geo, m4, hull = 1.06, list = parts) => {
    const o = geo.clone();
    o.scale(hull, hull, hull);
    geo.applyMatrix4(m4);
    o.applyMatrix4(m4);
    list.push(geo);
    inks.push(o);
  };

  // stepped stylobate, broad enough to hold the court
  add(roughen(new THREE.BoxGeometry(11.6, 0.5, 9.4), seed, 0.1), compose(0, 0.25, 0), 1.02);
  add(roughen(new THREE.BoxGeometry(10.6, 0.5, 8.4), seed + 1, 0.1), compose(0, 0.72, 0), 1.02);
  add(roughen(new THREE.BoxGeometry(9.6, 0.5, 7.4), seed + 2, 0.08), compose(0, 1.19, 0), 1.02);

  // forecourt steps spilling toward the island
  add(roughen(new THREE.BoxGeometry(6.6, 0.42, 1.7), seed + 3, 0.06), compose(0, 0.21, 5.6), 1.02);
  add(roughen(new THREE.BoxGeometry(5.4, 0.42, 1.4), seed + 4, 0.06), compose(0, 0.62, 4.95), 1.02);

  // the peristyle: five columns a flank, a pair holding each end
  const colPos = [];
  for (const x of [-3.9, -1.95, 0, 1.95, 3.9]) for (const z of [-2.85, 2.85]) colPos.push([x, z]);
  for (const x of [-3.9, 3.9]) colPos.push([x, 0]);
  for (const [x, z] of colPos) {
    add(new THREE.CylinderGeometry(0.3, 0.37, 3.7, 7), compose(x, 3.3, z, 0, rng.angle(), 0), 1.1);
    add(new THREE.BoxGeometry(0.86, 0.22, 0.86), compose(x, 5.26, z), 1.08);
    add(new THREE.BoxGeometry(0.82, 0.2, 0.82), compose(x, 1.55, z), 1.08);
  }

  // entablature + gabled roof
  add(roughen(new THREE.BoxGeometry(9.9, 0.62, 6.9), seed + 5, 0.06), compose(0, 5.7, 0), 1.03);
  const roofA = new THREE.BoxGeometry(10.3, 0.24, 4.3);
  add(roofA, compose(0, 6.95, -1.8, 0.47, 0, 0), 1.04, parts);
  const roofB = new THREE.BoxGeometry(10.3, 0.24, 4.3);
  add(roofB, compose(0, 6.95, 1.8, -0.47, 0, 0), 1.04, parts);

  g.add(new THREE.Mesh(mergeGeometries(parts), marble));
  g.add(new THREE.Mesh(
    mergeGeometries(inks),
    new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })
  ));

  // pediment gables closing the roof ends
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-3.45, 0);
  gableShape.lineTo(3.45, 0);
  gableShape.lineTo(0, 1.85);
  gableShape.closePath();
  for (const side of [-1, 1]) {
    const gable = new THREE.Mesh(
      new THREE.ExtrudeGeometry(gableShape, { depth: 0.16, bevelEnabled: false }),
      marbleDim
    );
    gable.rotation.y = Math.PI / 2;
    gable.position.set(side * 5.0, 6.0, side * 0.08);
    g.add(gable);
  }

  // votive braziers flanking the forecourt steps
  for (const side of [-1, 1]) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.24, 0.5, 7), marbleDim);
    bowl.position.set(side * 3.6, 1.65, 4.6);
    g.add(bowl);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0x9fd8ff, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    flame.position.set(side * 3.6, 2.15, 4.6);
    flame.scale.setScalar(1.6);
    flame.renderOrder = 3;
    g.add(flame);
    const fp = rng.angle();
    animators.push((t) => {
      flame.material.opacity = 0.4 + 0.18 * Math.sin(t * 3.4 + fp) * Math.sin(t * 1.7);
    });
  }

  // the teleport stone: a glowing orb on its omphalos, ringed by runelight
  const omphalos = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.85, 1.3, 8), marbleDim);
  omphalos.position.y = 2.1;
  const orb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.62, 1),
    new THREE.MeshBasicMaterial({ color: 0x9fd8ff })
  );
  orb.position.y = 3.35;
  const orbGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0x9fd8ff, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  orbGlow.position.y = 3.35;
  orbGlow.scale.setScalar(6.2);
  orbGlow.renderOrder = 3;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.06, 6, 22),
    new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.6 })
  );
  ring.position.y = 3.35;
  ring.renderOrder = 2;
  g.add(omphalos, orb, orbGlow, ring);

  const ph = rng.angle();
  animators.push((t, dt) => {
    orb.rotation.y += dt * 0.5;
    orb.position.y = 3.35 + Math.sin(t * 1.3 + ph) * 0.1;
    orbGlow.position.y = orb.position.y;
    orbGlow.material.opacity = 0.36 + 0.2 * Math.sin(t * 2.3 + ph);
    ring.rotation.x = Math.PI / 2 + Math.sin(t * 0.7 + ph) * 0.35;
    ring.rotation.y = t * 0.4;
  });
  return g;
}

// ---------------------------------------------------------------- fountain
// Round 12: the healing spring made stone. A tiered marble fountain at the
// heart of a waystation's 7-hex court — twin basins, a crown jet, drifting
// mist — with a robed GUARDIAN STATUE on a plinth at the back (local -Z),
// its ewer pouring starlit water. Drunk dry it EXHAUSTS: the water drains
// dark, the jets die, the pour stops, the statue's lantern eyes go out and
// its head bows — until the pilgrim next returns to the region.
export function makeFountain({ rng, gradientMap, glowTex, animators }) {
  const g = new THREE.Group();
  const toon = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap });
  const stone = toon(0x8f8a9e);
  const stoneDim = toon(0x716b85);

  // the basins: a wide lower pool, a raised middle tier, the crown bowl
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.95, 0.85, 10), stone);
  basin.position.y = 0.42;
  const lip = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.17, 6, 14), stoneDim);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.86;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.55, 0.9, 7), stoneDim);
  column.position.y = 1.25;
  const tier = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.55, 0.5, 9), stone);
  tier.position.y = 1.85;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.6, 7), stoneDim);
  stem.position.y = 2.35;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.5, 0.42, 9), stone);
  bowl.position.y = 2.75;
  g.add(basin, lip, column, tier, stem, bowl);

  const LIVE_WATER = new THREE.Color(0x9adbc0);
  const DEAD_WATER = new THREE.Color(0x3d4452);

  // water sheets: additive discs riding each basin
  const waterMatOf = () => new THREE.MeshBasicMaterial({
    color: 0x9adbc0, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const waterLow = new THREE.Mesh(new THREE.CircleGeometry(2.45, 16).rotateX(-Math.PI / 2), waterMatOf());
  waterLow.position.y = 0.9;
  waterLow.renderOrder = 2;
  const waterMid = new THREE.Mesh(new THREE.CircleGeometry(1.25, 14).rotateX(-Math.PI / 2), waterMatOf());
  waterMid.position.y = 2.14;
  waterMid.renderOrder = 2;
  g.add(waterLow, waterMid);

  // the crown jet + four spill jets arcing to the lower pool
  const jetMat = new THREE.MeshBasicMaterial({
    color: 0xc9f2e4, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.24, 1.7, 6, 1, true), jetMat);
  jet.position.y = 3.7;
  g.add(jet);
  const spills = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const spill = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 1.5, 5, 1, true), jetMat.clone());
    spill.position.set(Math.cos(a) * 1.65, 1.55, Math.sin(a) * 1.65);
    spill.rotation.z = Math.cos(a) * 0.55;
    spill.rotation.x = -Math.sin(a) * 0.55;
    g.add(spill);
    spills.push(spill);
  }
  // drifting mist over the water
  const mist = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0x9adbc0, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  mist.position.y = 2.6;
  mist.scale.setScalar(7.5);
  mist.renderOrder = 3;
  g.add(mist);

  // the guardian statue: robed, hooded, pouring from a stone ewer
  const statue = new THREE.Group();
  const plinth = new THREE.Mesh(
    roughen(new THREE.BoxGeometry(2.0, 1.0, 1.6), (rng.float() * 1e6) | 0, 0.08), stoneDim
  );
  plinth.position.y = 0.5;
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.85, 3.0, 7), stone);
  robe.position.y = 2.5;
  const head = new THREE.Group(); // pivot at the shoulders, so it can bow
  head.position.y = 3.8;
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.52, 1.0, 7), stoneDim);
  hood.position.y = 0.28;
  head.add(hood);
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0x9adbc0, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    eye.position.set(side * 0.16, 0.05, 0.3);
    eye.scale.setScalar(0.5);
    eye.renderOrder = 3;
    head.add(eye);
    eyes.push(eye);
  }
  // arms cradling the ewer, tipped toward the pool
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.1, 5), stone);
  arm.position.set(0, 2.9, 0.55);
  arm.rotation.x = 1.15;
  const ewer = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.62, 7), stoneDim);
  ewer.position.set(0, 3.0, 0.95);
  ewer.rotation.x = 0.9;
  statue.add(plinth, robe, head, arm, ewer);
  statue.position.set(0, 0, -3.6);
  g.add(statue);
  // the pour: a thin ribbon of starlit water from the ewer to the pool
  const pour = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.09, 2.6, 5, 1, true), jetMat.clone());
  pour.position.set(0, 1.9, -2.2);
  pour.rotation.x = 0.32;
  g.add(pour);

  // exhaustion state: visuals ease between full song and drained silence
  const state = { exhausted: false, u: 0 };
  const ph = rng.angle();
  animators.push((t, dt) => {
    state.u += ((state.exhausted ? 1 : 0) - state.u) * Math.min(1, dt * 2.2);
    const live = 1 - state.u;
    const pulse = Math.sin(t * 1.4 + ph);
    waterLow.material.opacity = 0.14 + (0.4 + 0.14 * pulse) * live;
    waterMid.material.opacity = 0.12 + (0.42 + 0.14 * Math.sin(t * 1.9 + ph)) * live;
    waterLow.material.color.copy(DEAD_WATER).lerp(LIVE_WATER, live);
    waterMid.material.color.copy(DEAD_WATER).lerp(LIVE_WATER, live);
    const js = Math.max(0.001, live);
    jet.scale.set(js, js * (1 + 0.08 * Math.sin(t * 6 + ph)), js);
    jet.material.opacity = 0.65 * live;
    for (const s of spills) {
      s.scale.setScalar(Math.max(0.001, live));
      s.material.opacity = 0.5 * live;
    }
    pour.scale.setScalar(Math.max(0.001, live));
    pour.material.opacity = 0.6 * live;
    mist.material.opacity = (0.24 + 0.12 * Math.sin(t * 2.2 + ph)) * live;
    for (const e of eyes) e.material.opacity = 0.06 + 0.7 * live * (0.8 + 0.2 * Math.sin(t * 1.1 + ph));
    // the guardian bows as the spring runs dry
    head.rotation.x = 0.52 * state.u;
  });
  return {
    group: g,
    setExhausted: (on) => { state.exhausted = !!on; },
  };
}

// ---------------------------------------------------------------- stillmoon body
// The small polygonal rock body hung above a stillmoon's heart: a chunk of
// void-stone shot through with the moon's crystal colour.
export function makeStillmoonBody({ rng, gradientMap, color }) {
  const g = new THREE.Group();
  const seed = (rng.float() * 1e6) | 0;
  const coreGeo = new THREE.DodecahedronGeometry(2.1, 0);
  {
    const pos = coreGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const m = 0.85 + posHash(x, y, z, seed) * 0.35;
      pos.setXYZ(i, x * m, y * m, z * m);
    }
    coreGeo.computeVertexNormals();
  }
  const core = new THREE.Mesh(
    coreGeo,
    new THREE.MeshToonMaterial({ color: 0x716b85, gradientMap })
  );
  const ink = new THREE.Mesh(
    coreGeo.clone(),
    new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })
  );
  ink.scale.setScalar(1.08);
  g.add(core, ink);

  // embedded crystal spurs in the moon's colour
  const spurGeos = [];
  const n = 5 + rng.int(3);
  for (let i = 0; i < n; i++) {
    const dir = new THREE.Vector3(
      rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)
    ).normalize();
    const len = 0.7 + rng.float() * 0.9;
    const spur = new THREE.OctahedronGeometry(0.32, 0);
    spur.scale(0.8, len / 0.32 * 0.45, 0.8);
    spur.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    spur.translate(dir.x * 1.9, dir.y * 1.9, dir.z * 1.9);
    spurGeos.push(spur);
  }
  g.add(new THREE.Mesh(
    mergeGeometries(spurGeos),
    new THREE.MeshBasicMaterial({ color })
  ));
  return g;
}

// ---------------------------------------------------------------- landmarks

// One named signature structure per region. ~5-8 units tall, biome-tinted.
export function makeLandmark(kind, biome, rng, { gradientMap, glowTex, animators }) {
  const g = new THREE.Group();
  const toon = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap });
  const basic = (c) => new THREE.MeshBasicMaterial({ color: c });
  const glowSprite = (color, scale, opacity = 0.6) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    s.scale.setScalar(scale);
    s.renderOrder = 3; // above the water sheets
    return s;
  };
  const glow = biome.decor.color;
  const dark = biome.island.side;

  switch (kind) {
    case 'brazier': { // the First Hearth — a bowl of never-dying flame
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 1.6, 7), toon(dark));
      ped.position.y = 0.8;
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.0, 1.2, 8, 1, true), toon(0x8c8678));
      bowl.position.y = 2.1;
      const flame = glowSprite(glow, 4.4, 0.75);
      flame.position.y = 3.1;
      g.add(ped, bowl, flame);
      animators.push((t) => { flame.material.opacity = 0.6 + 0.25 * Math.sin(t * 5.2) * Math.sin(t * 3.1); });
      break;
    }
    case 'belltower': { // a tower with a glowing bell in its niche
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.5, 5.6, 4), toon(0x8c8678));
      tower.position.y = 2.8;
      tower.rotation.y = Math.PI / 4;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.6, 4), toon(dark));
      roof.position.y = 6.3;
      roof.rotation.y = Math.PI / 4;
      const bell = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 8, 1, true), basic(glow));
      bell.position.y = 4.6;
      g.add(tower, roof, bell);
      animators.push((t) => { bell.rotation.z = Math.sin(t * 1.7) * 0.22; });
      if (biome.landmark?.sunken) {
        g.rotation.z = 0.3;
        g.position.y -= 1.4;
      }
      break;
    }
    case 'giantcap': { // an elder mushroom old as the mire
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 3.4, 8), toon(0xcfc4b0));
      stem.position.y = 1.7;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(2.7, 10, 7), toon(biome.island.top));
      cap.scale.y = 0.55;
      cap.position.y = 3.6;
      g.add(stem, cap);
      for (let i = 0; i < 4; i++) {
        const spot = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 5), basic(glow));
        const a = rng.angle();
        spot.position.set(Math.cos(a) * 1.7, 4.1 + rng.float() * 0.4, Math.sin(a) * 1.7);
        g.add(spot);
      }
      break;
    }
    case 'throne': { // an empty seat, still warm
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 1.8), toon(dark));
      seat.position.y = 1.2;
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.4, 0.5), toon(dark));
      back.position.set(0, 2.6, -0.85);
      g.add(seat, back);
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 1.6), toon(0x8c8678));
        arm.position.set(side * 1.2, 1.7, 0.1);
        g.add(arm);
      }
      const ember = glowSprite(glow, 3, 0.5);
      ember.position.y = 1.9;
      g.add(ember);
      break;
    }
    case 'clocktower': { // its hands agree to disagree, forever
      const tower = new THREE.Mesh(new THREE.BoxGeometry(1.9, 5.8, 1.9), toon(0x8c8678));
      tower.position.y = 2.9;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.4, 4), toon(dark));
      roof.position.y = 6.5;
      roof.rotation.y = Math.PI / 4;
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.85, 20), basic(0xf2ead2));
      face.position.set(0, 4.9, 0.96);
      const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.02), basic(0x2e2618));
      hourHand.position.set(0, 4.9, 0.98);
      hourHand.rotation.z = 2.4;
      const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.02), basic(0x2e2618));
      minHand.position.set(0, 4.9, 0.98);
      minHand.rotation.z = -0.7;
      g.add(tower, roof, face, hourHand, minHand);
      break;
    }
    case 'hourglass': { // sand that murmurs as it falls
      const frame = [];
      for (const y of [0.2, 5.4]) {
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.4, 8), toon(dark));
        disc.position.y = y;
        frame.push(disc);
      }
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.2, 6), toon(dark));
        post.position.set(Math.cos(a) * 1.45, 2.8, Math.sin(a) * 1.45);
        frame.push(post);
      }
      const top = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.2, 10), basic(glow));
      top.position.y = 4.2;
      const bot = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.2, 10), basic(glow));
      bot.position.y = 1.5;
      bot.rotation.x = Math.PI;
      g.add(...frame, top, bot);
      const waist = glowSprite(glow, 2.2, 0.6);
      waist.position.y = 2.85;
      g.add(waist);
      break;
    }
    case 'fountain': { // spray frozen mid-leap
      let y = 0.3;
      for (const [r, h] of [[2.2, 0.5], [1.4, 0.45], [0.7, 0.4]]) {
        const tier = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, h, 9), toon(0x8c8678));
        tier.position.y = y;
        g.add(tier);
        y += h + 0.5;
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const jet = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.6 + rng.float(), 5), basic(glow));
        jet.position.set(Math.cos(a) * 0.5, 2.6, Math.sin(a) * 0.5);
        jet.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
        g.add(jet);
      }
      break;
    }
    case 'flower': { // one impossible bloom above the brambles
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 3.8, 6), toon(dark));
      stem.position.y = 1.9;
      g.add(stem);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.9, 5), basic(glow));
        petal.position.set(Math.cos(a) * 0.85, 4.1, Math.sin(a) * 0.85);
        petal.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
        g.add(petal);
      }
      const heart = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), basic(0xfff2c9));
      heart.position.y = 4.0;
      g.add(heart);
      break;
    }
    case 'anchor': { // dropped by something that never came back
      const lean = 0.3;
      const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 5.4, 7), toon(dark));
      shank.position.y = 2.9;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.14, 6, 12), toon(dark));
      ring.position.y = 5.8;
      const cross = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.3), toon(dark));
      cross.position.y = 4.6;
      const flukes = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.24, 6, 10, Math.PI), toon(dark));
      flukes.position.y = 1.0;
      flukes.rotation.z = Math.PI;
      g.add(shank, ring, cross, flukes);
      g.rotation.z = lean;
      break;
    }
    case 'spiretower': { // it remembers every storm by name
      const spire = new THREE.Mesh(new THREE.ConeGeometry(1.0, 7.2, 6), toon(0x8c8678));
      spire.position.y = 3.6;
      g.add(spire);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), basic(glow));
      orb.position.y = 7.5;
      const crackle = glowSprite(glow, 3.4, 0.5);
      crackle.position.y = 7.5;
      g.add(orb, crackle);
      animators.push((t) => {
        crackle.material.opacity = 0.25 + 0.55 * Math.pow(Math.max(0, Math.sin(t * 2.3) * Math.sin(t * 5.7)), 3);
      });
      break;
    }
    case 'lantern': { // all the fen's wisps were lit from this one
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 5.0, 7), toon(dark));
      post.position.y = 2.5;
      const arm = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 6, 10, Math.PI * 0.55), toon(dark));
      arm.position.set(0, 5.0, 0);
      arm.rotation.z = -0.4;
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.3, 1.0), basic(glow));
      box.position.set(1.05, 4.4, 0);
      const halo = glowSprite(glow, 4, 0.6);
      halo.position.copy(box.position);
      g.add(post, arm, box, halo);
      animators.push((t) => { halo.material.opacity = 0.45 + 0.25 * Math.sin(t * 2.4); });
      break;
    }
    case 'organ': { // pipes that sing when the void breathes
      const base = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.9, 1.4), toon(dark));
      base.position.y = 0.45;
      g.add(base);
      for (let i = 0; i < 6; i++) {
        const h = 2.2 + Math.abs(i - 2.5) * 1.1;
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, h, 8), toon(0xe8e0cc));
        pipe.position.set(-1.75 + i * 0.7, 0.9 + h / 2, 0);
        g.add(pipe);
      }
      break;
    }
    case 'sundial': { // it casts a shadow with no sun to cast it
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, 0.35, 12), toon(0x8c8678));
      disc.position.y = 0.5;
      const gnomon = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.9, 1.9), toon(dark));
      gnomon.position.y = 1.4;
      gnomon.rotation.x = -0.5;
      const wrongShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.9, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x0d0a16, transparent: true, opacity: 0.8 })
      );
      wrongShadow.rotation.x = -Math.PI / 2;
      wrongShadow.position.set(0.9, 0.69, 0.4);
      g.add(disc, gnomon, wrongShadow);
      animators.push((t) => {
        // the shadow keeps its own slow time
        const a = t * 0.05;
        wrongShadow.position.set(Math.cos(a) * 1.1, 0.69, Math.sin(a) * 1.1);
        wrongShadow.rotation.z = -a;
      });
      break;
    }
    case 'idol': { // it does not blink; do not test it
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.95, 3.8, 7), toon(0x8c8678));
      pillar.position.y = 1.9;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 9), basic(0xe8f2ec));
      eye.position.y = 4.6;
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), basic(0x101412));
      pupil.position.set(0, 4.6, 0.82);
      g.add(pillar, eye, pupil);
      animators.push((t) => {
        // the gaze wanders; the lid never comes
        const a = Math.sin(t * 0.23) * 0.9;
        const b = Math.sin(t * 0.17 + 2) * 0.3;
        pupil.position.set(Math.sin(a) * 0.82, 4.6 + b * 0.3, Math.cos(a) * 0.82);
      });
      break;
    }
    case 'twinstones': { // strike one and the other rings
      for (const side of [-1, 1]) {
        const stone = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.8, 0.8), toon(0x8c8678));
        stone.position.set(side * 1.3, 2.3, 0);
        stone.rotation.z = -side * 0.14;
        g.add(stone);
      }
      const thread = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 3.6),
        new THREE.MeshBasicMaterial({
          color: glow, transparent: true, opacity: 0.28,
          side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      thread.position.y = 2.5;
      thread.renderOrder = 2;
      g.add(thread);
      animators.push((t) => { thread.material.opacity = 0.18 + 0.16 * Math.sin(t * 1.1); });
      break;
    }
    case 'tree': { // the orchard grew from this one seed
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, 4.4, 7), toon(dark));
      trunk.position.y = 2.2;
      g.add(trunk);
      for (let i = 0; i < 5; i++) {
        const a = rng.angle();
        const tilt = 0.5 + rng.float() * 0.5;
        const branch = new THREE.Mesh(new THREE.ConeGeometry(0.2, 2.6, 5), toon(dark));
        branch.position.set(Math.cos(a) * 1.1, 4.4 + rng.float() * 0.8, Math.sin(a) * 1.1);
        branch.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
        g.add(branch);
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.32, 7, 5), basic(glow));
        fruit.position.set(Math.cos(a) * 1.9, 4.6 + rng.float() * 0.8, Math.sin(a) * 1.9);
        g.add(fruit);
      }
      break;
    }
    case 'ribcage': { // walk the aisle of something that once sang
      for (let i = 0; i < 5; i++) {
        const r = 2.4 - i * 0.28;
        const rib = new THREE.Mesh(new THREE.TorusGeometry(r, 0.16, 6, 12, Math.PI), toon(0xe8e0d0));
        rib.position.set(0, 0.3, -2.2 + i * 1.1);
        g.add(rib);
      }
      const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5.4, 6), toon(0xd6cebc));
      spine.rotation.x = Math.PI / 2;
      spine.position.y = 2.55;
      g.add(spine);
      break;
    }
    default: {
      const stone = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.6, 0.9), toon(0x8c8678));
      stone.position.y = 1.8;
      g.add(stone);
    }
  }
  return g;
}

// ---------------------------------------------------------------- threshold gate
// The warden's boss-gate (Round 11): a broad fortified arch barring a
// causeway near its rim end. Heavier and wider than any dolmen — two bastion
// piers, a spiked lintel, and a humming ward-lattice slung across the gap
// that burns away when the warden falls. open() drops the lattice.
export function makeThresholdGate({ rng, gradientMap, glowTex, animators, tint = 0x8a76e6 }) {
  const g = new THREE.Group();
  const seed = (rng.float() * 1e6) | 0;

  const stoneMat = new THREE.MeshToonMaterial({
    color: new THREE.Color(0x5f5a80).offsetHSL((rng.float() - 0.5) * 0.03, 0, (rng.float() - 0.5) * 0.04),
    gradientMap,
  });

  const stoneParts = [];
  const inkParts = [];
  function addStone(geo, m4, hull = [1.14, 1.03, 1.14]) {
    const o = geo.clone();
    o.scale(hull[0], hull[1], hull[2]);
    geo.applyMatrix4(m4);
    o.applyMatrix4(m4);
    stoneParts.push(geo);
    inkParts.push(o);
  }

  // bastion piers: squat, stepped, unarguable
  for (const side of [-1, 1]) {
    const base = roughen(new THREE.CylinderGeometry(1.5, 1.9, 2.2, 7, 2), seed + side, 0.3);
    addStone(base, compose(side * 4.4, 1.1, 0, 0, rng.angle(), 0));
    const mid = roughen(new THREE.CylinderGeometry(1.15, 1.45, 3.4, 7, 2), seed + side * 3, 0.28);
    addStone(mid, compose(side * 4.4, 3.7, 0, 0, rng.angle(), side * 0.02));
    const cap = roughen(new THREE.ConeGeometry(1.3, 1.6, 6), seed + side * 5, 0.16);
    addStone(cap, compose(side * 4.4, 6.1, 0, 0, rng.angle(), 0), [1.18, 1.05, 1.18]);
  }
  // the spiked lintel spanning the causeway
  const lin = roughen(new THREE.BoxGeometry(9.6, 1.15, 1.6), seed + 9, 0.2);
  addStone(lin, compose(0, 6.35, 0, 0, 0, rng.range(-0.015, 0.015)), [1.05, 1.12, 1.12]);
  for (let i = -2; i <= 2; i++) {
    const spike = roughen(new THREE.ConeGeometry(0.3, 1.4 - Math.abs(i) * 0.18, 5), seed + 20 + i, 0.1);
    addStone(spike, compose(i * 1.7, 7.3 - Math.abs(i) * 0.1, 0, 0, 0, i * 0.05), [1.2, 1.05, 1.2]);
  }

  g.add(new THREE.Mesh(mergeGeometries(stoneParts), stoneMat));
  g.add(new THREE.Mesh(
    mergeGeometries(inkParts),
    new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })
  ));

  // the ward-lattice: crossed strands of light barring the arch
  const lattice = new THREE.Group();
  const strandMat = new THREE.MeshBasicMaterial({
    color: tint, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  for (let i = 0; i < 5; i++) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 0.16), strandMat);
    bar.position.set(0, 1.0 + i * 1.15, 0);
    bar.rotation.z = (i % 2 ? 1 : -1) * 0.09;
    lattice.add(bar);
  }
  for (const side of [-1, 1]) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 5.4), strandMat);
    bar.position.set(side * 2.3, 3.3, 0);
    bar.rotation.z = side * 0.12;
    lattice.add(bar);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: tint, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.setScalar(9);
  glow.position.y = 3.6;
  glow.renderOrder = 3;
  lattice.add(glow);
  lattice.renderOrder = 4;
  g.add(lattice);

  const state = { open: 0, target: 0 }; // 0 = barred, 1 = open
  const ph = rng.angle();
  animators.push((t, dt) => {
    if (state.open < state.target) {
      state.open = Math.min(1, state.open + dt * 0.8);
      lattice.position.y = -state.open * 1.5;
    }
    const breathe = 0.55 + 0.2 * Math.sin(t * 2.6 + ph);
    strandMat.opacity = (1 - state.open) * breathe;
    glow.material.opacity = (1 - state.open) * 0.4;
    lattice.visible = state.open < 1;
  });

  return {
    group: g,
    open: () => { state.target = 1; },
  };
}
