// Built things of the old world: dolmen waygates (ancient-ruin ports with an
// energy field slung between two pillars) and one named signature landmark
// per region. All stone is hand-roughened; all magic is additive glow.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeVeilMaterial } from './materials.js';

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

export function makeDolmenGate({ rng, gradientMap, glyphTex, glowTex, animators }) {
  const g = new THREE.Group();
  const seed = (rng.float() * 1e6) | 0;

  const stoneMat = new THREE.MeshToonMaterial({
    color: new THREE.Color(0x8c8678).offsetHSL((rng.float() - 0.5) * 0.03, 0, (rng.float() - 0.5) * 0.05),
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
  for (const side of [-1, 1]) {
    const p = roughen(new THREE.CylinderGeometry(0.82, 1.18, 5.6, 7, 3), seed + side, 0.4);
    addStone(p, compose(side * 2.9, 2.78, 0, 0, rng.angle(), rng.range(-0.05, 0.05)));
  }
  // the cracked capstone: two halves, one slumped a little lower
  const linA = roughen(new THREE.BoxGeometry(3.35, 0.95, 1.5), seed + 3, 0.22);
  addStone(linA, compose(-1.52, 6.12, 0, 0, 0, 0.03), [1.08, 1.12, 1.12]);
  const linB = roughen(new THREE.BoxGeometry(3.3, 0.95, 1.5), seed + 4, 0.22);
  addStone(linB, compose(1.62, 6.0, 0, 0, 0, -0.055), [1.08, 1.12, 1.12]);
  // a fallen fragment of the old arch, half-buried where it landed
  const shard = roughen(new THREE.BoxGeometry(2.2, 0.62, 1.05), seed + 5, 0.2);
  addStone(
    shard,
    compose((rng.chance(0.5) ? -1 : 1) * rng.range(2.2, 3.6), 0.26, rng.range(1.6, 3.2), 0, rng.angle(), 0.14),
    [1.1, 1.15, 1.15]
  );

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
      const r = 2.4 + rng.float() * 2.2;
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
        c.applyMatrix4(compose(side * 2.9 + Math.cos(a) * 1.02, 0.5 + rng.float() * 4.6, Math.sin(a) * 1.02));
      } else {
        c.applyMatrix4(compose(rng.range(-2.4, 2.4), 6.62, rng.range(-0.4, 0.4)));
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
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), plateMat);
      plate.position.set(side * 2.9, 3.25, face * 1.18);
      plate.renderOrder = 2; // above the water sheets
      if (face < 0) plate.rotation.y = Math.PI;
      g.add(plate);
    }
  }

  // the energy field hung between the pillars
  const veilMat = makeVeilMaterial(0xb89aff);
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 4.8, 1, 10), veilMat);
  veil.position.set(0, 2.78, 0);
  veil.renderOrder = 2;
  g.add(veil);

  const under = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xb89aff, transparent: true, opacity: 0.22,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  under.position.set(0, 3, 0);
  under.scale.setScalar(7.5);
  under.renderOrder = 3;
  g.add(under);

  // two warning glyphs still slowly pacing their rounds
  const orbiters = [];
  for (let i = 0; i < 2; i++) {
    const s = new THREE.Sprite(plateMat.clone());
    s.scale.setScalar(1.4);
    s.renderOrder = 3;
    g.add(s);
    orbiters.push(s);
  }
  const phase = rng.angle();
  animators.push((t) => {
    veilMat.uniforms.uTime.value = t;
    plateMat.opacity = 0.68 + 0.22 * Math.sin(t * 1.3 + phase);
    orbiters.forEach((s, i) => {
      const a = t * 0.5 + phase + i * Math.PI;
      s.position.set(Math.cos(a) * 4.5, 4.1 + Math.sin(t * 1.1 + i * 2) * 0.5, Math.sin(a) * 4.5);
    });
  });

  return { group: g };
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
