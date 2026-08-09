// Sculpted astral-body archetypes: every world gets bespoke geometry so no
// two silhouettes read alike — oblate banded giants, cratered moons, faceted
// crystals, hollow husks, a watching eye, a hungering maw. Returned as
// { planet, outline } (either may be a Group / null); the caller spins them
// and hangs halos, rings, moons, and labels around them.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const INK = 0x1f1a36;
const UP = new THREE.Vector3(0, 1, 0);

// Deterministic per-position scalar in [0,1): duplicated vertices (non-indexed
// polyhedra repeat corner positions per face) hash identically, so radial
// displacement never tears the surface apart at shared corners.
function posHash(x, y, z, seed) {
  let h = (seed * 0x9e3779b1) | 0;
  h = Math.imul(h ^ Math.round(x * 97), 0x85ebca6b);
  h = Math.imul(h ^ Math.round(y * 97), 0xc2b2ae35);
  h = Math.imul(h ^ Math.round(z * 97), 0x27d4eb2f);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

function displaceRadial(geo, fn) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const m = fn(v);
    pos.setXYZ(i, v.x * m, v.y * m, v.z * m);
  }
  geo.computeVertexNormals();
  return geo;
}

// Crater bowls with soft raised rims, deterministic on direction.
function craterize(geo, craters, depth, radius) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    let m = 1;
    for (const c of craters) {
      const a = n.angleTo(c.dir);
      if (a < c.ang) {
        m -= depth * Math.cos((a / c.ang) * Math.PI * 0.5) * c.scale;
      } else if (a < c.ang * 1.45) {
        m += depth * 0.28 * (1 - (a - c.ang) / (c.ang * 0.45)) * c.scale;
      }
    }
    pos.setXYZ(i, v.x * m, v.y * m, v.z * m);
  }
  geo.computeVertexNormals();
  void radius;
  return geo;
}

// Paint vertex colors by latitude/longitude — bands, storms, dunes.
function paintBands(geo, fn) {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = v.length() || 1;
    const lat = v.y / r; // -1..1
    const lon = Math.atan2(v.z, v.x);
    fn(lat, lon, c);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function rndDir(rng) {
  const y = rng.range(-1, 1);
  const a = rng.angle();
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
}

function inkHull(geoOrMesh, scale = 1.05) {
  const geo = geoOrMesh.isBufferGeometry ? geoOrMesh.clone() : geoOrMesh.geometry.clone();
  const hull = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }));
  hull.scale.setScalar(scale);
  return hull;
}

// ---------------------------------------------------------------- archetypes

export function sculptBody(b, { rng, gradientMap, animators }) {
  const s = b.bodySize;
  const c1 = new THREE.Color(b.bodyColor);
  const c2 = new THREE.Color(b.bodyColor2);
  const toon = (opts) => new THREE.MeshToonMaterial({ gradientMap, ...opts });
  const seed = (rng.float() * 1e6) | 0;

  switch (b.bodyShape) {
    // a faceted gem-world with satellite shards frozen mid-cleave
    case 'crystal': {
      const parts = [new THREE.IcosahedronGeometry(s, 0)];
      parts[0].scale(1, 1.22, 1);
      for (let i = 0; i < 4; i++) {
        const g = new THREE.OctahedronGeometry(s * (0.2 + rng.float() * 0.15));
        g.scale(1, 1.9, 1);
        const dir = rndDir(rng);
        g.rotateZ(rng.angle());
        g.translate(dir.x * s * 1.05, dir.y * s * 1.05, dir.z * s * 1.05);
        parts.push(g);
      }
      const geo = mergeGeometries(parts);
      const planet = new THREE.Mesh(geo, toon({ color: c1 }));
      return { planet, outline: inkHull(geo, 1.06) };
    }

    // a small moon budding with luminous swellings
    case 'budding': {
      const planet = new THREE.Group();
      const baseGeo = new THREE.SphereGeometry(s, 14, 11);
      planet.add(new THREE.Mesh(baseGeo, toon({ color: c1 })));
      const budGeos = [];
      for (let i = 0; i < 7; i++) {
        const g = new THREE.SphereGeometry(s * (0.2 + rng.float() * 0.2), 8, 6);
        const dir = rndDir(rng);
        g.translate(dir.x * s * 0.94, dir.y * s * 0.94, dir.z * s * 0.94);
        budGeos.push(g);
      }
      const budCol = c1.clone().lerp(new THREE.Color(b.island.glow), 0.5);
      planet.add(new THREE.Mesh(mergeGeometries(budGeos), toon({ color: budCol, emissive: budCol, emissiveIntensity: 0.25 })));
      return { planet, outline: inkHull(baseGeo, 1.06) };
    }

    // a scorched world, crater-pocked, glowing faintly from within
    case 'cracked': {
      const geo = new THREE.IcosahedronGeometry(s, 1);
      const craters = Array.from({ length: 5 }, () => ({
        dir: rndDir(rng), ang: 0.35 + rng.float() * 0.3, scale: 0.7 + rng.float() * 0.6,
      }));
      craterize(geo, craters, 0.13, s);
      displaceRadial(geo, (v) => 1 + (posHash(v.x, v.y, v.z, seed) - 0.5) * 0.06);
      const planet = new THREE.Mesh(geo, toon({ color: c1, emissive: 0x551a0e, emissiveIntensity: 0.35 }));
      return { planet, outline: inkHull(geo, 1.06) };
    }

    // a vast glassy ocean giant, softly banded, slightly oblate
    case 'seagiant': {
      const geo = new THREE.SphereGeometry(s, 26, 18);
      geo.scale(1, 0.93, 1);
      paintBands(geo, (lat, lon, c) => {
        const t = 0.5 + 0.5 * Math.sin(lat * 5.2 + Math.sin(lon * 2 + lat * 3) * 0.35);
        c.copy(c1).lerp(c2, 0.25 + t * 0.5);
      });
      const planet = new THREE.Mesh(geo, toon({ vertexColors: true }));
      return { planet, outline: inkHull(geo, 1.045) };
    }

    // a turned-brass machine world of stacked drums
    case 'machined': {
      const radii = [0.5, 0.82, 1.0, 0.82, 0.5];
      const h = s * 0.38;
      const parts = radii.map((r, i) => {
        const g = new THREE.CylinderGeometry(r * s * 0.92, r * s * 0.92, h, 18);
        g.translate(0, (i - 2) * h, 0);
        return g;
      });
      const geo = mergeGeometries(parts);
      const planet = new THREE.Mesh(geo, toon({ color: c1 }));
      const outline = inkHull(geo, 1);
      outline.scale.set(1.07, 1.03, 1.07);
      return { planet, outline };
    }

    // wind-carved dune bands in stepped ochres
    case 'banded': {
      const geo = new THREE.SphereGeometry(s, 24, 18);
      geo.scale(1, 0.9, 1);
      paintBands(geo, (lat, lon, c) => {
        let t = 0.5 + 0.5 * Math.sin(lat * 7 + Math.sin(lon * 3) * 0.4);
        t = Math.round(t * 3) / 3;
        c.copy(c1).lerp(c2, t * 0.75);
      });
      const planet = new THREE.Mesh(geo, toon({ vertexColors: true }));
      return { planet, outline: inkHull(geo, 1.045) };
    }

    // a pale moon worn by countless impacts
    case 'cratered': {
      const geo = new THREE.SphereGeometry(s, 20, 15);
      const craters = Array.from({ length: 8 }, () => ({
        dir: rndDir(rng), ang: 0.22 + rng.float() * 0.3, scale: 0.6 + rng.float() * 0.7,
      }));
      craterize(geo, craters, 0.11, s);
      displaceRadial(geo, (v) => 1 + (posHash(v.x, v.y, v.z, seed) - 0.5) * 0.03);
      const planet = new THREE.Mesh(geo, toon({ color: c1 }));
      return { planet, outline: inkHull(geo, 1.05) };
    }

    // soft rolling overgrowth (the thorns come from its character pass)
    case 'mossy': {
      const geo = new THREE.IcosahedronGeometry(s, 2);
      displaceRadial(geo, (v) => 1 + (posHash(v.x, v.y, v.z, seed) - 0.5) * 0.1);
      const planet = new THREE.Mesh(geo, toon({ color: c1 }));
      return { planet, outline: inkHull(geo, 1.05) };
    }

    // an oblate tempest colossus wrapped in storm bands, one pale great-spot
    case 'gasgiant': {
      const geo = new THREE.SphereGeometry(s, 30, 22);
      geo.scale(1, 0.78, 1);
      const pale = c1.clone().lerp(new THREE.Color(0xd8dcff), 0.55);
      paintBands(geo, (lat, lon, c) => {
        let t = 0.5 + 0.5 * Math.sin(lat * 9 + Math.sin(lon * 2 + lat * 4) * 0.55);
        t = Math.round(t * 4) / 4;
        c.copy(c1).lerp(c2, t * 0.8);
        if (Math.abs(lat + 0.28) < 0.06) c.lerp(pale, 0.5);
      });
      const planet = new THREE.Group();
      planet.add(new THREE.Mesh(geo, toon({ vertexColors: true })));
      const spot = new THREE.Mesh(new THREE.SphereGeometry(s * 0.2, 10, 8), toon({ color: pale }));
      spot.scale.set(1.5, 0.45, 1);
      const spotDir = new THREE.Vector3(Math.cos(0.6), -0.35, Math.sin(0.6)).normalize();
      spot.position.copy(spotDir).multiplyScalar(s * 0.92);
      spot.position.y *= 0.78;
      planet.add(spot);
      return { planet, outline: inkHull(geo, 1.04) };
    }

    // a lidless eye the size of a world — it very rarely blinks
    case 'eye': {
      const planet = new THREE.Group();
      const scleraGeo = new THREE.SphereGeometry(s, 20, 14);
      planet.add(new THREE.Mesh(scleraGeo, toon({ color: 0xd8e2da })));
      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(s * 1.01, 20, 14, 0, Math.PI * 2, 0, 0.52),
        new THREE.MeshBasicMaterial({ color: 0x3d6a5c })
      );
      iris.rotation.x = Math.PI / 2;
      planet.add(iris);
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(s * 1.02, 14, 8, 0, Math.PI * 2, 0, 0.2),
        new THREE.MeshBasicMaterial({ color: 0x101412 })
      );
      pupil.rotation.x = Math.PI / 2;
      planet.add(pupil);
      const lidMat = toon({ color: c1 });
      const lidTop = new THREE.Mesh(new THREE.SphereGeometry(s * 1.04, 20, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), lidMat);
      const lidBot = new THREE.Mesh(new THREE.SphereGeometry(s * 1.04, 20, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), lidMat);
      lidTop.rotation.x = -1.35; // drawn back from the front
      lidBot.rotation.x = 1.35;
      planet.add(lidTop, lidBot);
      animators.push((t) => {
        const wink = Math.pow(Math.max(0, Math.sin(t * 0.19)), 48);
        lidTop.rotation.x = -1.35 + wink * 1.32;
        lidBot.rotation.x = 1.35 - wink * 1.32;
      });
      return { planet, outline: inkHull(scleraGeo, 1.05) };
    }

    // a thin-walled singing husk, split open to the hollow dark inside
    case 'husk': {
      const planet = new THREE.Group();
      const shellGeo = new THREE.SphereGeometry(s, 22, 14, 0, Math.PI * 1.55);
      planet.add(new THREE.Mesh(shellGeo, toon({ color: c1 })));
      const inner = new THREE.Mesh(shellGeo.clone(), toon({ color: c2, side: THREE.BackSide }));
      inner.scale.setScalar(0.985);
      planet.add(inner);
      planet.rotation.y = rng.angle();
      return { planet, outline: null };
    }

    // a wrong-angled shard of night — the one theme jaggedness still serves
    case 'shard': {
      const geo = new THREE.IcosahedronGeometry(s, 1);
      displaceRadial(geo, (v) => 1 + (posHash(v.x, v.y, v.z, seed) - 0.5) * 0.6);
      const planet = new THREE.Mesh(geo, toon({ color: c1 }));
      return { planet, outline: inkHull(geo, 1.06) };
    }

    // a world split in two, its halves forever answering each other
    case 'twinned': {
      const planet = new THREE.Group();
      const lobeGeo = new THREE.SphereGeometry(s, 18, 14);
      const mat = toon({ color: c1 });
      const gap = s * 0.34;
      const hA = new THREE.Mesh(lobeGeo, mat);
      hA.scale.set(0.52, 1, 1);
      hA.position.x = -gap;
      const hB = hA.clone();
      hB.position.x = gap;
      planet.add(hA, hB);
      const coreMat = new THREE.MeshBasicMaterial({
        color: b.island.glow, transparent: true, opacity: 0.55,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const core = new THREE.Mesh(new THREE.CircleGeometry(s * 0.9, 24), coreMat);
      core.rotation.y = Math.PI / 2;
      planet.add(core);
      animators.push((t) => {
        const breathe = Math.sin(t * 0.7) * s * 0.05;
        hA.position.x = -gap - breathe;
        hB.position.x = gap + breathe;
        coreMat.opacity = 0.4 + 0.25 * Math.sin(t * 1.4);
      });
      const outline = new THREE.Group();
      for (const side of [-1, 1]) {
        const hull = inkHull(lobeGeo, 1);
        hull.scale.set(0.52 * 1.07, 1.06, 1.06);
        hull.position.x = side * gap;
        outline.add(hull);
      }
      return { planet, outline };
    }

    // a petrified orchard-world, branches hung with pale watching fruit
    case 'orchard': {
      const planet = new THREE.Group();
      const baseGeo = new THREE.SphereGeometry(s, 14, 10);
      displaceRadial(baseGeo, (v) => 1 + (posHash(v.x, v.y, v.z, seed) - 0.5) * 0.07);
      planet.add(new THREE.Mesh(baseGeo, toon({ color: c1 })));
      const branchGeos = [];
      const fruitGeos = [];
      for (let i = 0; i < 9; i++) {
        const dir = rndDir(rng);
        const len = s * (0.45 + rng.float() * 0.5);
        const g = new THREE.ConeGeometry(s * 0.07, len, 5);
        g.translate(0, len / 2, 0);
        const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
        g.applyQuaternion(q);
        g.translate(dir.x * s * 0.9, dir.y * s * 0.9, dir.z * s * 0.9);
        branchGeos.push(g);
        if (rng.chance(0.7)) {
          const f = new THREE.SphereGeometry(s * 0.1, 7, 5);
          const tip = dir.clone().multiplyScalar(s * 0.9 + len * 0.85);
          f.translate(tip.x, tip.y - s * 0.08, tip.z);
          fruitGeos.push(f);
        }
      }
      planet.add(new THREE.Mesh(mergeGeometries(branchGeos), toon({ color: c2 })));
      if (fruitGeos.length) {
        planet.add(new THREE.Mesh(
          mergeGeometries(fruitGeos),
          new THREE.MeshBasicMaterial({ color: b.island.glow })
        ));
      }
      return { planet, outline: inkHull(baseGeo, 1.06) };
    }

    // a planet that is mostly mouth: a fanged gap opening on a dark throat
    case 'maw': {
      const planet = new THREE.Group();
      const gapLen = 1.15;
      const bodyGeo = new THREE.SphereGeometry(s, 24, 16, 0, Math.PI * 2 - gapLen);
      planet.add(new THREE.Mesh(bodyGeo, toon({ color: c1 })));
      const throat = new THREE.Mesh(
        new THREE.SphereGeometry(s * 0.96, 16, 12),
        toon({ color: c2, side: THREE.BackSide })
      );
      planet.add(throat);
      // fangs along both lips of the gap, pointing into the hollow
      const teethGeos = [];
      const midPhi = -gapLen / 2;
      const target = new THREE.Vector3(-Math.cos(midPhi), 0, Math.sin(midPhi)).multiplyScalar(s * 0.45);
      for (const edgePhi of [0.06, -gapLen + 0.06]) {
        for (let i = 0; i < 5; i++) {
          const th = Math.PI * (0.28 + 0.44 * (i / 4));
          const p = new THREE.Vector3(
            -Math.cos(edgePhi) * Math.sin(th), Math.cos(th), Math.sin(edgePhi) * Math.sin(th)
          ).multiplyScalar(s * 0.97);
          const len = s * (0.2 + rng.float() * 0.14);
          const g = new THREE.ConeGeometry(s * 0.06, len, 5);
          g.translate(0, len / 2, 0);
          const dir = target.clone().sub(p).normalize();
          g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir));
          g.translate(p.x, p.y, p.z);
          teethGeos.push(g);
        }
      }
      planet.add(new THREE.Mesh(mergeGeometries(teethGeos), toon({ color: 0xe8e0d0 })));
      // a slow, patient chewing
      animators.push((t) => {
        planet.scale.y = 1 + Math.sin(t * 0.5) * 0.03;
      });
      return { planet, outline: inkHull(new THREE.SphereGeometry(s, 16, 12), 1.05) };
    }

    // a grieving star drawn out into a falling tear
    case 'teardrop': {
      const sphere = new THREE.SphereGeometry(s, 16, 12);
      const tail = new THREE.ConeGeometry(s * 0.7, s * 1.9, 14);
      tail.translate(0, s * 0.85, 0);
      const geo = mergeGeometries([sphere, tail]);
      const planet = new THREE.Mesh(geo, toon({ color: c1 }));
      planet.rotation.z = 0.45;
      const outline = inkHull(geo, 1.05);
      outline.rotation.z = 0.45;
      return { planet, outline };
    }

    // an empty bell of stone, open to the void below, clapper still hanging
    case 'bellshell': {
      const planet = new THREE.Group();
      const shellGeo = new THREE.SphereGeometry(s, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.68);
      planet.add(new THREE.Mesh(shellGeo, toon({ color: c1 })));
      const inner = new THREE.Mesh(shellGeo.clone(), toon({ color: c2, side: THREE.BackSide }));
      inner.scale.setScalar(0.97);
      planet.add(inner);
      const clapper = new THREE.Mesh(
        new THREE.SphereGeometry(s * 0.18, 8, 6),
        new THREE.MeshBasicMaterial({ color: b.island.glow })
      );
      clapper.position.y = -s * 0.28;
      planet.add(clapper);
      animators.push((t) => {
        clapper.position.x = Math.sin(t * 0.9) * s * 0.12;
      });
      return { planet, outline: null };
    }

    // the inverse sun: a black core crowned with rays of solid dark
    case 'darkstar': {
      const planet = new THREE.Group();
      const coreGeo = new THREE.IcosahedronGeometry(s, 1);
      displaceRadial(coreGeo, (v) => 1 + (posHash(v.x, v.y, v.z, seed) - 0.5) * 0.12);
      planet.add(new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0x0b0813 })));
      const spikeGeos = [];
      for (let i = 0; i < 13; i++) {
        const dir = rndDir(rng);
        const len = s * (0.7 + rng.float() * 0.9);
        const g = new THREE.ConeGeometry(s * 0.12, len, 5);
        g.translate(0, len / 2, 0);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir));
        g.translate(dir.x * s * 0.85, dir.y * s * 0.85, dir.z * s * 0.85);
        spikeGeos.push(g);
      }
      planet.add(new THREE.Mesh(mergeGeometries(spikeGeos), new THREE.MeshBasicMaterial({ color: 0x120e1e })));
      // a violet rim where its darkness meets the sky, in place of ink
      const rim = new THREE.Mesh(coreGeo.clone(), new THREE.MeshBasicMaterial({ color: 0x3a2e6e, side: THREE.BackSide }));
      rim.scale.setScalar(1.08);
      return { planet, outline: rim };
    }

    default: {
      const geo = new THREE.SphereGeometry(s, 16, 12);
      const planet = new THREE.Mesh(geo, toon({ color: c1 }));
      return { planet, outline: inkHull(geo, 1.05) };
    }
  }
}
