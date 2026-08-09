// Turns generated world data into the three.js scene, in dark-aetherial
// papercraft style: toon-shaded hexes with ink outline shells, a paper sun
// with spinning rays, sculpted astral bodies, dolmen waygates, per-region
// landmarks and ambient veils, leviathans, and a deep runic cosmos.

import * as THREE from 'three';
import { HEX, RINGS } from './config.js';
import * as Hx from './hexmath.js';
import { makeNoise2D } from './rng.js';
import {
  makeRuneTexture, makeWaterMaterial, makeToonGradient,
  makeGlowSpriteTexture, makeNebulaTexture, makeGlyphTexture, makeSparkleTexture,
} from './materials.js';
import { sculptBody } from './bodies.js';
import { makeDolmenGate, makeLandmark } from './structures.js';
import { buildDecorLibrary } from './decorSets.js';
import { makeLabel } from './labels.js';

const DUMMY = new THREE.Object3D();
const INK = 0x1f1a36;
const glowHex = (n) => '#' + n.toString(16).padStart(6, '0');

function jitterColor(hexInt, rng, amt = 0.06) {
  const c = new THREE.Color(hexInt);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(
    (hsl.h + (rng.float() - 0.5) * amt + 1) % 1,
    THREE.MathUtils.clamp(hsl.s + (rng.float() - 0.5) * amt, 0, 1),
    THREE.MathUtils.clamp(hsl.l + (rng.float() - 0.5) * amt, 0, 1)
  );
  return c;
}

// dark-aetherial palette: mute saturation and pull lightness down so the
// biome hues glow softly against the void instead of shouting
function tone(color, sMul, lMul) {
  const hsl = {};
  color.getHSL(hsl);
  color.setHSL(
    hsl.h,
    THREE.MathUtils.clamp(hsl.s * sMul, 0, 1),
    THREE.MathUtils.clamp(hsl.l * lMul, 0, 1)
  );
  return color;
}

export function buildWorld(world, rng) {
  const group = new THREE.Group();
  const animators = [];
  const glowTex = makeGlowSpriteTexture();
  const gradientMap = makeToonGradient();

  // ------------------------------------------------------------ water hexes
  const waterKeys = [];
  const isleKeys = [];
  for (const [k, h] of world.hexes) {
    (h.kind === 'water' ? waterKeys : isleKeys).push(k);
  }

  const runeTex = makeRuneTexture(rng.fork('runes'));
  const waterMat = makeWaterMaterial(runeTex);
  const waterGeo = new THREE.CircleGeometry(HEX * 0.98, 6);
  waterGeo.rotateZ(Math.PI / 6);
  waterGeo.rotateX(-Math.PI / 2);

  const waterMesh = new THREE.InstancedMesh(waterGeo, waterMat, waterKeys.length);
  const aColor = new Float32Array(waterKeys.length * 3);
  const aFlow = new Float32Array(waterKeys.length * 4);
  const aDepth = new Float32Array(waterKeys.length);
  const waterIndexByKey = new Map();
  const depthNoise = makeNoise2D(rng.fork('depth'));

  waterKeys.forEach((k, i) => {
    const h = world.hexes.get(k);
    const area = world.areas[h.areaId];
    const p = Hx.toWorld(h.q, h.r, HEX);
    // the sea has depth: hexes sink to different levels of the cosmic deep
    const depth = THREE.MathUtils.clamp(
      depthNoise.fbm(p.x * 0.03, p.z * 0.03, 3) * 1.5 - 0.2, 0, 1
    );
    DUMMY.position.set(p.x, 0.02 - depth * 1.2, p.z);
    DUMMY.rotation.set(0, 0, 0);
    DUMMY.scale.set(1, 1, 1);
    DUMMY.updateMatrix();
    waterMesh.setMatrixAt(i, DUMMY.matrix);

    const c = tone(jitterColor(area.biome.water.color, rng, 0.05), 0.9, 0.6);
    aColor[i * 3] = c.r;
    aColor[i * 3 + 1] = c.g;
    aColor[i * 3 + 2] = c.b;
    aFlow[i * 4] = h.flow[0];
    aFlow[i * 4 + 1] = h.flow[1];
    aFlow[i * 4 + 2] = area.biome.water.speed;
    aFlow[i * 4 + 3] = (h.faint ? 1 : 0) + (h.levi ? 2 : 0) + (h.blocked ? 4 : 0);
    aDepth[i] = depth;
    waterIndexByKey.set(k, i);
  });
  waterGeo.setAttribute('aColor', new THREE.InstancedBufferAttribute(aColor, 3));
  waterGeo.setAttribute('aFlow', new THREE.InstancedBufferAttribute(aFlow, 4));
  waterGeo.setAttribute('aDepth', new THREE.InstancedBufferAttribute(aDepth, 1));
  const flowAttr = waterGeo.getAttribute('aFlow');
  group.add(waterMesh);

  // a thin ghost sheet floats above the glassy base, wobbling on its own
  // phase — the sea reads as a volume, not a floor
  const waterMatTop = makeWaterMaterial(runeTex, {
    lift: 0.52, ghost: 0.32, speedMul: 1.7,
    unify: 0.8, unifyColor: 0x6f9cd4,
    wobbleRate: 0.55, wobbleAmp: 2.1, phase: 2.3,
  });
  const waterTop = new THREE.InstancedMesh(waterGeo, waterMatTop, waterKeys.length);
  waterTop.instanceMatrix = waterMesh.instanceMatrix;
  waterTop.renderOrder = 1;
  group.add(waterTop);

  // soft rims: two rings of unwalkable ghost-hexes dissolve each region's
  // edge into the void instead of a hard border (visual only — never in the
  // hex map, so they can't be clicked or sailed)
  {
    const fringe = [];
    const seen = new Set(world.hexes.keys());
    for (const area of world.areas) {
      if (area.asteroid) continue; // dry rock in the void — no watery rim
      let frontier = area.hexKeys;
      for (let ringI = 0; ringI < 2; ringI++) {
        const fadeLevel = ringI === 0 ? 0.6 : 0.87;
        const next = [];
        for (const k of frontier) {
          const { q, r } = Hx.parseKey(k);
          for (const d of Hx.DIRS) {
            const nk = Hx.key(q + d[0], r + d[1]);
            if (seen.has(nk)) continue;
            seen.add(nk);
            next.push(nk);
            fringe.push({ q: q + d[0], r: r + d[1], fade: fadeLevel, area });
          }
        }
        frontier = next;
      }
    }

    const fringeGeo = waterGeo.clone();
    const fColor = new Float32Array(fringe.length * 3);
    const fFlow = new Float32Array(fringe.length * 4);
    const fDepth = new Float32Array(fringe.length);
    const fringeMat = makeWaterMaterial(runeTex, { fade: 1 });
    const fringeMesh = new THREE.InstancedMesh(fringeGeo, fringeMat, fringe.length);
    fringe.forEach((f, i) => {
      const p = Hx.toWorld(f.q, f.r, HEX);
      DUMMY.position.set(p.x, -0.18 - f.fade * 0.5, p.z);
      DUMMY.rotation.set(0, 0, 0);
      DUMMY.scale.set(1, 1, 1);
      DUMMY.updateMatrix();
      fringeMesh.setMatrixAt(i, DUMMY.matrix);
      const c = tone(jitterColor(f.area.biome.water.color, rng, 0.05), 0.8, 0.45);
      fColor[i * 3] = c.r;
      fColor[i * 3 + 1] = c.g;
      fColor[i * 3 + 2] = c.b;
      const vx = p.x - f.area.pos.x, vz = p.z - f.area.pos.z;
      const vl = Math.hypot(vx, vz) || 1;
      fFlow[i * 4] = -vz / vl;
      fFlow[i * 4 + 1] = vx / vl;
      fFlow[i * 4 + 2] = f.area.biome.water.speed * 0.7;
      fFlow[i * 4 + 3] = 0;
      fDepth[i] = f.fade;
    });
    fringeGeo.setAttribute('aColor', new THREE.InstancedBufferAttribute(fColor, 3));
    fringeGeo.setAttribute('aFlow', new THREE.InstancedBufferAttribute(fFlow, 4));
    fringeGeo.setAttribute('aDepth', new THREE.InstancedBufferAttribute(fDepth, 1));
    group.add(fringeMesh);
    animators.push((t) => {
      fringeMat.uniforms.uTime.value = t;
      fringeMat.uniforms.uBreath.value = waterMat.uniforms.uBreath.value;
    });
  }

  // ------------------------------------------------------------ island hexes
  const isleGeo = new THREE.CylinderGeometry(HEX * 0.92, HEX * 1.08, 1, 6);
  const isleMat = new THREE.MeshToonMaterial({ gradientMap });
  const isleMesh = new THREE.InstancedMesh(isleGeo, isleMat, isleKeys.length);
  const isleIndexByKey = new Map();
  const terrainNoise = makeNoise2D(rng.fork('terrain'));

  isleKeys.forEach((k, i) => {
    const h = world.hexes.get(k);
    const area = world.areas[h.areaId];
    const p = Hx.toWorld(h.q, h.r, HEX);
    // widen the height spread, then let the biome's terrain profile shape it
    let e = Math.max(0.4, h.elev * (0.75 + rng.float() * 0.75));
    if (!h.rock) {
      switch (area.biome.terrain?.style) {
        case 'terrace': e = 0.35 + Math.round(e / 0.5) * 0.5; break;        // stepped shelves
        case 'dune': e = 0.4 + (e - 0.4) * 0.5; break;                       // low rolling flats
        case 'crag': e *= rng.chance(0.16) ? 1.9 : 1.08; break;              // jagged stacks
        case 'mesa': e = e > 0.95 ? 1.55 + (e - 0.95) * 0.25 : 0.55; break;  // flat-topped lofts
      }
    }
    h.elev = Math.max(0.35, e);
    // a touch of hand-cut wonk on every island
    DUMMY.position.set(p.x, h.elev / 2, p.z);
    DUMMY.rotation.set((rng.float() - 0.5) * 0.05, 0, (rng.float() - 0.5) * 0.05);
    DUMMY.scale.set(1, h.elev, 1);
    DUMMY.updateMatrix();
    isleMesh.setMatrixAt(i, DUMMY.matrix);
    let col;
    if (h.rock) {
      // gate node islets and asteroid reefs are bare rock, unclaimed by any biome
      col = tone(jitterColor(0x6e6e80, rng, 0.08), 0.5, 0.75);
    } else {
      // two-tone tops mottle each island; shorelines catch the water's glow
      const t2 = area.biome.island.top2 !== undefined
        && terrainNoise.fbm(p.x * 0.055, p.z * 0.055, 2) > 0.52;
      col = tone(jitterColor(t2 ? area.biome.island.top2 : area.biome.island.top, rng, 0.07), 0.82, 0.8);
      let shore = false;
      for (const d of Hx.DIRS) {
        const nh = world.hexes.get(Hx.key(h.q + d[0], h.r + d[1]));
        if (!nh || nh.kind === 'water') { shore = true; break; }
      }
      if (shore) col.lerp(new THREE.Color(area.biome.water.color), 0.16);
    }
    isleMesh.setColorAt(i, col);
    isleIndexByKey.set(k, i);
  });
  group.add(isleMesh);

  // cut-cardstock outline: inverted-hull shell sharing the instance matrices
  const isleOutlineGeo = new THREE.CylinderGeometry(HEX * 1.02, HEX * 1.18, 1.12, 6);
  const isleOutline = new THREE.InstancedMesh(
    isleOutlineGeo,
    new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }),
    isleKeys.length
  );
  isleOutline.instanceMatrix = isleMesh.instanceMatrix;
  group.add(isleOutline);

  const isleBaseMatrices = isleMesh.instanceMatrix.array.slice();

  // ------------------------------------------------------------ island decor
  // Each biome furnishes its shores from its own bespoke set (decorSets.js).
  // Landmark hexes are chosen first so each region's signature structure
  // stands on clear ground.
  const landmarkSpots = new Map(); // areaId -> hexKey
  for (const area of world.areas) {
    if (!area.biome.landmark || area.secret || area.asteroid) continue;
    let bestK = null, be = -1;
    for (const k of area.hexKeys) {
      const h = world.hexes.get(k);
      if (h.kind !== 'isle' || h.rock || h.gateId !== null || h.lockKey !== null) continue;
      if (h.elev > be) { be = h.elev; bestK = k; }
    }
    if (bestK) landmarkSpots.set(area.id, bestK);
  }
  const landmarkKeys = new Set(landmarkSpots.values());

  const decorLib = buildDecorLibrary();
  const decorPlacements = {};

  for (const k of isleKeys) {
    const h = world.hexes.get(k);
    const area = world.areas[h.areaId];
    if (landmarkKeys.has(k)) continue;
    // asteroid reefs furnish their bare rock; gate islets stay bare
    if ((h.rock && !area.asteroid) || !rng.chance(area.asteroid ? 0.3 : 0.4)) continue;
    const n = 1 + rng.int(2);
    for (let j = 0; j < n; j++) {
      const kind = rng.pick(area.biome.decor.kinds);
      const p = Hx.toWorld(h.q, h.r, HEX);
      DUMMY.position.set(
        p.x + (rng.float() - 0.5) * HEX * 1.1,
        h.elev,
        p.z + (rng.float() - 0.5) * HEX * 1.1
      );
      DUMMY.rotation.set(0, rng.angle(), (rng.float() - 0.5) * 0.2);
      const s = 0.6 + rng.float() * 1.1;
      DUMMY.scale.set(s, s * (0.8 + rng.float() * 0.9), s);
      DUMMY.updateMatrix();
      const spec = decorLib[kind];
      const col = spec.glow
        ? tone(jitterColor(area.biome.decor.color, rng, 0.08), 0.95, 0.75)
        : tone(jitterColor(spec.tint ?? area.biome.island.side, rng, 0.1), 0.8, 0.9);
      (decorPlacements[kind] ??= []).push({ m: DUMMY.matrix.clone(), c: col });
    }
  }
  for (const [kind, list] of Object.entries(decorPlacements)) {
    const spec = decorLib[kind];
    const mat = spec.glow
      ? new THREE.MeshBasicMaterial()
      : new THREE.MeshToonMaterial({ gradientMap });
    const mesh = new THREE.InstancedMesh(spec.geo, mat, list.length);
    list.forEach((it, i) => {
      mesh.setMatrixAt(i, it.m);
      mesh.setColorAt(i, it.c);
    });
    group.add(mesh);
  }

  // ------------------------------------------------------------ landmarks
  // One named signature structure per region; its name reads runic until the
  // region is discovered.
  const labelsByLandmark = new Map();
  for (const [areaId, k] of landmarkSpots) {
    const area = world.areas[areaId];
    const lm = area.biome.landmark;
    const h = world.hexes.get(k);
    const p = Hx.toWorld(h.q, h.r, HEX);
    const obj = makeLandmark(lm.kind, area.biome, rng, { gradientMap, glowTex, animators });
    obj.position.set(p.x, h.elev, p.z);
    obj.rotation.y = rng.angle();
    group.add(obj);
    const label = makeLabel({
      title: lm.name, color: '#c9d4ef', scale: 16, startHidden: true,
    });
    label.sprite.material.opacity = 0.8;
    label.sprite.position.set(p.x, h.elev + 9.5, p.z);
    group.add(label.sprite);
    labelsByLandmark.set(areaId, label);
  }

  // ------------------------------------------------------------ astral bodies
  const labelsByArea = new Map();
  const bodyGroups = new Map();
  const secretFx = [];

  // Every body gets a signature feature — silhouettes you can name at a glance.
  function addCharacter(area, b, bodyGroup, planet) {
    const s = b.bodySize;
    switch (b.key) {
      case 'chimewood': { // a chime-ring of drifting crystals
        const orbit = new THREE.Group();
        for (let i = 0; i < 6; i++) {
          const shard = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.7),
            new THREE.MeshBasicMaterial({ color: 0x9ffff0 })
          );
          const a = (i / 6) * Math.PI * 2;
          shard.position.set(Math.cos(a) * s * 1.7, Math.sin(a * 2) * 0.8, Math.sin(a) * s * 1.7);
          orbit.add(shard);
        }
        bodyGroup.add(orbit);
        animators.push((t, dt) => { orbit.rotation.y -= dt * 0.35; });
        break;
      }
      case 'echoverge': { // rings of answered light rippling outward
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xa8c4ff, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const echo = new THREE.Mesh(new THREE.TorusGeometry(s * 1.15, 0.12, 6, 32), ringMat);
        echo.rotation.x = Math.PI / 2;
        bodyGroup.add(echo);
        animators.push((t) => {
          const u = (t * 0.35) % 1;
          echo.scale.setScalar(1 + u * 1.8);
          ringMat.opacity = 0.5 * (1 - u);
        });
        break;
      }
      case 'cinder': { // a molten fissure girdling the world
        const crack = new THREE.Mesh(
          new THREE.TorusGeometry(s * 1.02, 0.22, 6, 40),
          new THREE.MeshBasicMaterial({ color: 0xff8c5a })
        );
        crack.rotation.x = rng.angle();
        crack.rotation.y = rng.angle();
        planet.add(crack);
        animators.push((t) => {
          crack.material.color.setHSL(0.05, 0.9, 0.5 + Math.sin(t * 2.1) * 0.12);
        });
        break;
      }
      case 'meridian': { // a great slow wave rolling the equator
        const wave = new THREE.Mesh(
          new THREE.TorusGeometry(s * 1.05, 0.5, 6, 40),
          new THREE.MeshToonMaterial({ color: 0x2e5aa6, gradientMap })
        );
        wave.rotation.x = Math.PI / 2;
        wave.scale.y = 0.4;
        planet.add(wave);
        animators.push((t, dt) => { wave.rotation.z += dt * 0.3; });
        break;
      }
      case 'cog': { // a counter-turning brass gear
        const gear = new THREE.Group();
        const rim = new THREE.Mesh(
          new THREE.TorusGeometry(s * 1.4, 0.35, 6, 24),
          new THREE.MeshToonMaterial({ color: 0xc2995a, gradientMap })
        );
        gear.add(rim);
        for (let i = 0; i < 8; i++) {
          const tooth = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.7, 1.4),
            new THREE.MeshToonMaterial({ color: 0xa8834c, gradientMap })
          );
          const a = (i / 8) * Math.PI * 2;
          tooth.position.set(Math.cos(a) * s * 1.4, Math.sin(a) * s * 1.4, 0);
          tooth.rotation.z = a;
          gear.add(tooth);
        }
        gear.rotation.x = Math.PI / 2 - 0.2;
        bodyGroup.add(gear);
        animators.push((t, dt) => { gear.rotation.z -= dt * 0.18; });
        break;
      }
      case 'whisperdune': { // a murmuring dust veil
        const n = 90;
        const pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const a = rng.angle();
          const r = s * (1.3 + rng.float() * 0.9);
          pos.set([Math.cos(a) * r, (rng.float() - 0.5) * 1.6, Math.sin(a) * r], i * 3);
        }
        const geo2 = new THREE.BufferGeometry();
        geo2.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const veil = new THREE.Points(geo2, new THREE.PointsMaterial({
          color: 0xd9c28a, size: 0.5, transparent: true, opacity: 0.7, depthWrite: false,
        }));
        bodyGroup.add(veil);
        animators.push((t, dt) => { veil.rotation.y += dt * 0.25; });
        break;
      }
      case 'frostveil': { // a standing halo of ice
        const haloRing = new THREE.Mesh(
          new THREE.TorusGeometry(s * 1.6, 0.16, 6, 36),
          new THREE.MeshBasicMaterial({ color: 0xd6f4ff, transparent: true, opacity: 0.7 })
        );
        bodyGroup.add(haloRing);
        animators.push((t, dt) => { haloRing.rotation.y += dt * 0.1; });
        break;
      }
      case 'thornlight': { // wild thorns bursting from the canopy
        for (let i = 0; i < 9; i++) {
          const dir = new THREE.Vector3().randomDirection();
          const thorn = new THREE.Mesh(
            new THREE.ConeGeometry(0.5, 2.6 + rng.float() * 2, 5),
            new THREE.MeshToonMaterial({ color: 0x3f7a33, gradientMap })
          );
          thorn.position.copy(dir).multiplyScalar(s * 0.95);
          thorn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          planet.add(thorn);
        }
        break;
      }
      case 'graveanchors': { // drowned hulls circling like slow gulls
        const fleet = new THREE.Group();
        for (let i = 0; i < 3; i++) {
          const hull = new THREE.Mesh(
            new THREE.BoxGeometry(2.6, 0.8, 1),
            new THREE.MeshToonMaterial({ color: 0x5c6478, gradientMap })
          );
          const a = (i / 3) * Math.PI * 2;
          hull.position.set(Math.cos(a) * s * 1.8, (rng.float() - 0.5) * 2, Math.sin(a) * s * 1.8);
          hull.rotation.set(rng.float() * 0.6, a, rng.float() * 0.5);
          fleet.add(hull);
        }
        bodyGroup.add(fleet);
        animators.push((t, dt) => { fleet.rotation.y += dt * 0.06; });
        break;
      }
      case 'storm': { // twin storm-bands shearing past each other
        const mkBand = (r, tilt, col) => {
          const band = new THREE.Mesh(
            new THREE.TorusGeometry(r, 0.7, 6, 40),
            new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false })
          );
          band.rotation.x = Math.PI / 2 + tilt;
          band.scale.y = 0.3;
          planet.add(band);
          return band;
        };
        const b1 = mkBand(s * 1.06, 0.18, 0x9aa4e6);
        const b2 = mkBand(s * 1.12, -0.14, 0x6a5cc2);
        animators.push((t, dt) => {
          b1.rotation.z += dt * 0.6;
          b2.rotation.z -= dt * 0.45;
        });
        break;
      }
      case 'lanternfen': { // a procession of bobbing lanterns
        const lanterns = new THREE.Group();
        const mats = [];
        for (let i = 0; i < 6; i++) {
          const glow = new THREE.Sprite(new THREE.SpriteMaterial({
            map: glowTex, color: 0xffb0e6, transparent: true, opacity: 0.8,
            blending: THREE.AdditiveBlending, depthWrite: false,
          }));
          const a = (i / 6) * Math.PI * 2;
          glow.position.set(Math.cos(a) * s * 1.7, Math.sin(a * 3) * 1.2, Math.sin(a) * s * 1.7);
          glow.scale.setScalar(2.2);
          lanterns.add(glow);
          mats.push(glow.material);
        }
        bodyGroup.add(lanterns);
        animators.push((t, dt) => {
          lanterns.rotation.y += dt * 0.12;
          mats.forEach((m, i) => { m.opacity = 0.55 + 0.35 * Math.sin(t * 1.8 + i * 1.1); });
        });
        break;
      }
      case 'bleachedchoir': { // a crown of singing bone spires
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const dir = new THREE.Vector3(Math.cos(a) * 0.55, 1, Math.sin(a) * 0.55).normalize();
          const spire = new THREE.Mesh(
            new THREE.ConeGeometry(0.5, 3.4, 5),
            new THREE.MeshToonMaterial({ color: 0xe6ddc9, gradientMap })
          );
          spire.position.copy(dir).multiplyScalar(s * 0.95);
          spire.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          planet.add(spire);
        }
        break;
      }
      case 'umbral': { // wrapped in a slow contrary shadow-veil
        const veil = new THREE.Mesh(
          new THREE.IcosahedronGeometry(s * 1.18, 1),
          new THREE.MeshBasicMaterial({
            color: 0x191433, transparent: true, opacity: 0.4, depthWrite: false,
          })
        );
        bodyGroup.add(veil);
        animators.push((t, dt) => { veil.rotation.y -= dt * 0.04; });
        break;
      }
      case 'silentorchard': { // pale petals shed into the dark, never landing
        const n = 26;
        const pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const a = rng.angle();
          const r = s * (1.2 + rng.float() * 1.1);
          pos.set([Math.cos(a) * r, (rng.float() - 0.5) * s * 1.6, Math.sin(a) * r], i * 3);
        }
        const geo2 = new THREE.BufferGeometry();
        geo2.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const petals = new THREE.Points(geo2, new THREE.PointsMaterial({
          color: 0xe8d8c9, size: 0.55, transparent: true, opacity: 0.7, depthWrite: false,
        }));
        bodyGroup.add(petals);
        animators.push((t, dt) => { petals.rotation.y += dt * 0.06; });
        break;
      }
    }
  }

  for (const area of world.areas) {
    const b = area.biome;
    const bodyGroup = new THREE.Group();
    const y = b.bodyKind === 'sun' ? 20 : b.bodySize + 7;
    bodyGroup.position.set(area.pos.x, y, area.pos.z);
    bodyGroups.set(area.id, bodyGroup);

    if (b.bodyKind === 'sun') {
      // a craft-paper sun: flat warm sphere with a spinning crown of rays
      const sun = new THREE.Mesh(
        new THREE.IcosahedronGeometry(b.bodySize, 2),
        new THREE.MeshToonMaterial({ color: 0xffd166, gradientMap, emissive: 0xff9a3d, emissiveIntensity: 0.35 })
      );
      bodyGroup.add(sun);
      const sunOutline = new THREE.Mesh(
        new THREE.IcosahedronGeometry(b.bodySize * 1.05, 2),
        new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })
      );
      bodyGroup.add(sunOutline);
      const rays = new THREE.Group();
      const rayGeo = new THREE.ConeGeometry(1.9, 6.5, 4);
      rayGeo.rotateX(Math.PI / 2); // point along +z so a y-spin keeps rays flat
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        const ray = new THREE.Mesh(
          rayGeo,
          new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffb347 : 0xff9a3d })
        );
        ray.position.copy(dir).multiplyScalar(b.bodySize * 1.6);
        ray.rotation.y = Math.atan2(dir.x, dir.z);
        ray.scale.set(1, 0.3, 1); // flat like cut paper
        rays.add(ray);
      }
      bodyGroup.add(rays);
      const corona = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: 0xffcf8a, transparent: true, opacity: 0.22,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      corona.scale.setScalar(b.bodySize * 5);
      bodyGroup.add(corona);
      animators.push((t, dt) => {
        rays.rotation.y += dt * 0.15;
        const pulse = 1 + Math.sin(t * 0.5) * 0.02;
        sun.scale.setScalar(pulse);
        corona.scale.setScalar(b.bodySize * (4.7 + Math.sin(t * 0.5) * 0.5));
      });
    } else if (b.bodyKind === 'rubble') {
      // asteroid waystations get no world at all — just a slow knot of
      // drifting stone where a planet ought to hang
      const knot = new THREE.Group();
      const nRocks = 5 + rng.int(4);
      for (let i = 0; i < nRocks; i++) {
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.6 + rng.float() * 1.2, 0),
          new THREE.MeshToonMaterial({
            color: tone(jitterColor(0x8a84a6, rng, 0.12), 0.7, 0.7), gradientMap,
          })
        );
        const a = rng.angle();
        const r = 1.5 + rng.float() * 4.5;
        rock.position.set(Math.cos(a) * r, (rng.float() - 0.5) * 4, Math.sin(a) * r);
        rock.rotation.set(rng.angle(), rng.angle(), rng.angle());
        knot.add(rock);
      }
      bodyGroup.add(knot);
      animators.push((t, dt) => { knot.rotation.y += dt * 0.08; });
    } else {
      const { planet, outline } = sculptBody(b, { rng, gradientMap, animators });
      bodyGroup.add(planet);
      if (outline) bodyGroup.add(outline);
      const spin = 0.02 + rng.float() * 0.05;
      animators.push((t, dt) => {
        planet.rotation.y += dt * spin;
        if (outline) outline.rotation.y = planet.rotation.y;
      });

      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: b.island.glow, transparent: true,
        opacity: area.secret ? 0.32 : 0.2,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      halo.scale.setScalar(b.bodySize * 4);
      bodyGroup.add(halo);

      if (b.hasRings) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(b.bodySize * 1.5, b.bodySize * 2.3, 42),
          new THREE.MeshBasicMaterial({
            color: tone(new THREE.Color(b.island.glow), 0.85, 0.7), transparent: true, opacity: 0.45,
            side: THREE.DoubleSide, depthWrite: false,
          })
        );
        ring.rotation.x = Math.PI / 2 - 0.32;
        bodyGroup.add(ring);
        animators.push((t, dt) => { ring.rotation.z += dt * 0.05; });
      }

      addCharacter(area, b, bodyGroup, planet);

      const nMoons = b.bodyKind === 'planet' && !area.secret ? rng.int(3) : 0;
      for (let mi = 0; mi < nMoons; mi++) {
        const moon = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.8 + rng.float() * 0.9, 0),
          new THREE.MeshToonMaterial({ color: 0xd8dbeb, gradientMap })
        );
        const mr = b.bodySize * (1.9 + mi * 0.8);
        const speed = 0.12 + rng.float() * 0.18;
        const phase = rng.angle();
        const tilt = rng.range(-0.4, 0.4);
        bodyGroup.add(moon);
        animators.push((t) => {
          const a = phase + t * speed;
          moon.position.set(Math.cos(a) * mr, Math.sin(a * 0.9) * mr * Math.sin(tilt), Math.sin(a) * mr);
        });
      }

      if (area.secret) {
        if (b.key === 'hollowmoon') {
          animators.push((t) => {
            // an empty stone bell with a gentle heartbeat
            const beat = Math.pow(Math.max(0, Math.sin(t * 0.9)), 6);
            planet.scale.setScalar(1 + beat * 0.1);
            outline?.scale.setScalar(1.07 * (1 + beat * 0.1));
          });
        }
        if (b.key === 'weepingcomet') {
          const tears = new THREE.BufferGeometry();
          const tearPos = new Float32Array(40 * 3);
          for (let ti = 0; ti < 40; ti++) {
            tearPos[ti * 3] = (rng.float() - 0.5) * b.bodySize * 2;
            tearPos[ti * 3 + 1] = -rng.float() * 26;
            tearPos[ti * 3 + 2] = (rng.float() - 0.5) * b.bodySize * 2;
          }
          tears.setAttribute('position', new THREE.BufferAttribute(tearPos, 3));
          const tearPts = new THREE.Points(tears, new THREE.PointsMaterial({
            color: 0xc9fff5, size: 0.7, transparent: true, opacity: 0.8, depthWrite: false,
          }));
          bodyGroup.add(tearPts);
          animators.push((t, dt) => {
            const arr = tears.attributes.position.array;
            for (let ti = 0; ti < 40; ti++) {
              arr[ti * 3 + 1] -= dt * 3;
              if (arr[ti * 3 + 1] < -26) arr[ti * 3 + 1] = 0;
            }
            tears.attributes.position.needsUpdate = true;
          });
        }
        if (b.key === 'unlitstar') {
          halo.material.color.set(0x7a68c9);
          halo.scale.setScalar(b.bodySize * 6);
          animators.push((t) => {
            // the inverse sun breathes opposite the hearthstar
            halo.material.opacity = 0.3 - Math.sin(t * 0.15) * 0.15;
          });
        }

        // alignment surge: at peak tide a pillar of light marks each secret
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(1.8, 1.8, 220, 10, 1, true),
          new THREE.MeshBasicMaterial({
            color: b.island.glow, transparent: true, opacity: 0,
            side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
          })
        );
        pillar.position.set(area.pos.x, 100, area.pos.z);
        group.add(pillar);
        secretFx.push({ pillar });
      }
    }
    group.add(bodyGroup);

    const label = makeLabel({
      title: b.area,
      sub: b.body,
      color: glowHex(new THREE.Color(b.island.glow).lerp(new THREE.Color(0xffffff), 0.3).getHex()),
      scale: area.asteroid ? 28 : area.secret ? 38 : 48,
      startHidden: true,
    });
    label.sprite.position.set(area.pos.x, y + b.bodySize + 16, area.pos.z);
    group.add(label.sprite);
    labelsByArea.set(area.id, label);
  }

  // ------------------------------------------------------------ dolmen waygates
  // Each gate is a PAIR of ancient stone doorways — rough pillars, a cracked
  // capstone, rubble, moss, and an energy field slung between the pillars.
  const labelsByGate = new Map();
  const gatePortGroups = new Map();
  const portHitboxes = []; // invisible click targets over each doorway

  for (const gate of world.gates) {
    const glyphTex = makeGlyphTexture(gate.rune.ch, '#e6d9ff');
    const ports = [
      { key: gate.portA, otherKey: gate.portB },
      { key: gate.portB, otherKey: gate.portA },
    ];
    const groupsForGate = [];
    const gateLabels = [];
    for (const port of ports) {
      const h = world.hexes.get(port.key);
      const other = world.hexes.get(port.otherKey);
      const p = Hx.toWorld(h.q, h.r, HEX);
      const po = Hx.toWorld(other.q, other.r, HEX);
      const { group: g } = makeDolmenGate({ rng, gradientMap, glyphTex, glowTex, animators });
      g.position.set(p.x, Math.max(0, h.elev - 0.25), p.z);
      if (gate.kind === 'ring') {
        // same-ring doorways open along the orbit's tangent (signed toward
        // the twin) so the gate faces the arc the blast actually flies,
        // not a chord cutting across the void
        const aP = Math.atan2(p.z, p.x);
        const aO = Math.atan2(po.z, po.x);
        let da = aO - aP;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        const sgn = da >= 0 ? 1 : -1;
        g.rotation.y = Math.atan2(-Math.sin(aP) * sgn, Math.cos(aP) * sgn);
      } else {
        // radial and secret crossings are straight shots — face the twin
        g.rotation.y = Math.atan2(po.x - p.x, po.z - p.z);
      }

      const label = makeLabel({
        title: gate.name,
        sub: `${gate.rune.ch} ᛫ step in ᛫ be cast across`,
        color: '#e6d9ff', subColor: '#b8c4e6',
        scale: 22, startHidden: true,
      });
      label.sprite.position.set(p.x, 12, p.z);
      group.add(label.sprite);
      gateLabels.push(label);

      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(4.8, 4.8, 9, 8),
        new THREE.MeshBasicMaterial()
      );
      hit.visible = false;
      hit.position.set(p.x, 4.5, p.z);
      hit.userData.hexKey = port.key;
      group.add(hit);
      portHitboxes.push(hit);

      group.add(g);
      groupsForGate.push(g);
    }
    labelsByGate.set(gate.id, gateLabels);
    gatePortGroups.set(gate.id, groupsForGate);
  }

  // ------------------------------------------------------------ locks
  const lockFx = new Map();
  for (const lock of world.locks) {
    const pillars = new THREE.Group();
    // rumor locks seal a whole hidden path — only pillar its first few hexes
    for (const wk of lock.wallKeys.slice(0, 4)) {
      const wh = world.hexes.get(wk);
      const p = Hx.toWorld(wh.q, wh.r, HEX);
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(1.6, 8, 7, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xa79ad4, transparent: true, opacity: 0.35,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
        })
      );
      cone.position.set(p.x, 4, p.z);
      pillars.add(cone);
      animators.push((t, dt) => {
        cone.rotation.y += dt * 2.2;
        cone.scale.x = cone.scale.z = 1 + Math.sin(t * 5 + p.x) * 0.15;
      });
    }
    group.add(pillars);

    const stones = new Map();
    for (const kk of lock.keyKeys) {
      const kh = world.hexes.get(kk);
      const p = Hx.toWorld(kh.q, kh.r, HEX);
      const stone = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 3.2, 0.8),
        new THREE.MeshToonMaterial({ color: 0x8a7ab8, gradientMap, emissive: 0x6a4fc2, emissiveIntensity: 0.4 })
      );
      stone.position.set(p.x, kh.elev + 1.6, p.z);
      stone.rotation.y = rng.angle();
      group.add(stone);
      const glyphMat = new THREE.SpriteMaterial({
        map: makeGlyphTexture(lock.rune.ch, '#efe4ff'),
        transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false,
      });
      const glyph = new THREE.Sprite(glyphMat);
      glyph.scale.setScalar(2.4);
      glyph.position.set(p.x, kh.elev + 4.6, p.z);
      group.add(glyph);
      const bob = rng.angle();
      animators.push((t) => {
        glyph.position.y = kh.elev + 4.6 + Math.sin(t * 1.6 + bob) * 0.35;
      });
      stones.set(kk, { stone, glyphMat });
    }
    lockFx.set(lock.id, { pillars, stones });
  }

  // ------------------------------------------------------------ leviathans
  for (const levi of world.leviathans) {
    const pts = levi.points.map((p) => new THREE.Vector3(p.x, -1.6, p.z));
    const curve = new THREE.CatmullRomCurve3(pts, levi.loop);
    const segMat = new THREE.MeshToonMaterial({
      color: levi.secret ? 0x6a5cc2 : 0x7a86c9, gradientMap,
      emissive: levi.secret ? 0x8c5aff : 0x2a2666,
      emissiveIntensity: levi.secret ? 0.6 : 0.25,
    });
    const nSeg = 22;
    const segs = [];
    for (let i = 0; i < nSeg; i++) {
      const radius = i === 0 ? 1.7 : 1.5 * (1 - i / nSeg) + 0.35;
      const seg = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 0), segMat);
      group.add(seg);
      segs.push(seg);
    }
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff6e0 });
    const eyes = [];
    for (const side of [-0.6, 0.6]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 5), eyeMat);
      group.add(eye);
      eyes.push({ eye, side });
    }
    const spd = (levi.reverse ? -1 : 1) / (30 + levi.points.length * 0.5);
    const phase0 = rng.float() * 2;
    const du = 0.014;
    const tri = (x) => {
      const c = ((x % 2) + 2) % 2;
      return c < 1 ? c : 2 - c;
    };
    const frac = (x) => ((x % 1) + 1) % 1;
    const param = levi.loop ? frac : tri;
    animators.push((t) => {
      const phase = t * spd + phase0;
      let head = null, headNext = null;
      for (let i = 0; i < nSeg; i++) {
        const u = param(phase - i * du);
        const p = curve.getPoint(u);
        p.y = -1.6 + Math.sin(t * 2 + i * 0.55) * 0.7;
        segs[i].position.copy(p);
        if (i === 0) {
          head = p;
          headNext = curve.getPoint(param(phase + du));
        }
      }
      if (head && headNext) {
        segs[0].lookAt(headNext.x, head.y, headNext.z);
        const dir = new THREE.Vector3().subVectors(headNext, head).setY(0).normalize();
        const perp = new THREE.Vector3(-dir.z, 0, dir.x);
        for (const { eye, side } of eyes) {
          eye.position.copy(head).addScaledVector(perp, side * 1.1).addScaledVector(dir, 1.1);
          eye.position.y = head.y + 0.6;
        }
      }
    });
  }

  // ------------------------------------------------------------ ambient veils
  // Each region carries its own little climate over the sea: embers rise,
  // snow falls, fireflies wander, mists slide, dusk motes hang nearly still.
  for (const area of world.areas) {
    const veil = area.biome.veil;
    if (!veil) continue;
    const R = area.hexRadius * HEX * Hx.SQRT3 * 0.95;
    const n = veil.count;
    const H = 11;
    const base = new Float32Array(n * 3);
    const phase = new Float32Array(n);
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rng.angle();
      const r = Math.sqrt(rng.float()) * R;
      base[i * 3] = area.pos.x + Math.cos(a) * r;
      base[i * 3 + 1] = 0.8 + rng.float() * H;
      base[i * 3 + 2] = area.pos.z + Math.sin(a) * r;
      phase[i] = rng.float() * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: veil.color, size: veil.size, transparent: true,
      opacity: veil.opacity, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    group.add(pts);
    const spd = veil.speed ?? 1;
    const style = veil.style;
    animators.push((t) => {
      for (let i = 0; i < n; i++) {
        const bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2];
        const ph = phase[i];
        let x = bx, y = by, z = bz;
        if (style === 'rise') {
          y = 0.6 + ((by + t * 1.9 * spd + ph) % H);
          x = bx + Math.sin(t * 0.7 + ph) * 0.8;
        } else if (style === 'fall') {
          y = 0.6 + (H - ((by + t * 2.3 * spd + ph) % H));
          x = bx + Math.sin(t * 1.1 + ph) * 0.5;
        } else if (style === 'drift') {
          x = bx + Math.sin(t * 0.16 * spd + ph) * 9;
          z = bz + Math.cos(t * 0.13 * spd + ph * 1.3) * 9;
          y = by + Math.sin(t * 0.5 + ph) * 0.6;
        } else if (style === 'firefly') {
          x = bx + Math.sin(t * 0.6 * spd + ph) * 2.2;
          z = bz + Math.sin(t * 0.5 * spd + ph * 1.7) * 2.2;
          y = by + Math.sin(t * 0.9 + ph) * 1.1;
        } else { // still
          y = by + Math.sin(t * 0.4 + ph) * 0.3;
        }
        pos[i * 3] = x;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = z;
      }
      geo.attributes.position.needsUpdate = true;
      if (style === 'firefly') mat.opacity = veil.opacity * (0.65 + 0.35 * Math.sin(t * 2.1));
    });
  }

  // ------------------------------------------------------------ cosmos décor
  // sparkle starfield
  {
    const n = 3200;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const tints = [new THREE.Color(0xfff6e0), new THREE.Color(0xcfe8ff), new THREE.Color(0xffe3c9), new THREE.Color(0xe4dcff)];
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(2800 + rng.float() * 600);
      pos.set([v.x, v.y, v.z], i * 3);
      const c = tints[rng.int(tints.length)].clone().multiplyScalar(0.5 + rng.float() * 0.5);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({
      map: makeSparkleTexture(), size: 5, sizeAttenuation: false, vertexColors: true,
      transparent: true, opacity: 0.7, depthWrite: false, fog: false, toneMapped: false,
    }));
    group.add(stars);
  }

  // deep paper clouds — dark nebulae with a papery softness
  {
    const nebTex = makeNebulaTexture();
    const tints = [0x3a3f73, 0x2e4a66, 0x4a3266, 0x2e5a52, 0x5a3244];
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: nebTex, color: tints[i % tints.length], transparent: true,
        opacity: 0.22, depthWrite: false, fog: false,
      }));
      const v = new THREE.Vector3().randomDirection();
      v.y = Math.abs(v.y) * 0.5 - 0.1;
      s.position.copy(v.multiplyScalar(2300));
      s.scale.setScalar(900 + rng.float() * 700);
      group.add(s);
    }
  }

  // astral dust
  {
    const n = 1800;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rng.angle();
      const r = 60 + rng.float() * 1550;
      pos.set([Math.cos(a) * r, (rng.float() - 0.5) * 80, Math.sin(a) * r], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x7a84b8, size: 1.1, transparent: true, opacity: 0.4, depthWrite: false,
    }));
    group.add(dust);
    animators.push((t, dt) => { dust.rotation.y += dt * 0.0015; });
  }

  // pencil-line orbit guides under the ring rivers
  {
    const ringMat = new THREE.LineBasicMaterial({
      color: 0x6a74b8, transparent: true, opacity: 0.22, depthWrite: false,
    });
    for (const spec of RINGS) {
      const pts = [];
      for (let i = 0; i <= 160; i++) {
        const a = (i / 160) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * spec.radius, 0.05, Math.sin(a) * spec.radius));
      }
      const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), ringMat);
      group.add(line);
    }
  }

  // asteroid belts between the orbital rings — the orrery's slow clockwork
  {
    const beltSpecs = [
      { r: 395, n: 170, speed: 0.004 },
      { r: 665, n: 200, speed: 0.003 },
      { r: 935, n: 180, speed: 0.002 },
    ];
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    for (const spec of beltSpecs) {
      const beltGroup = new THREE.Group();
      const mesh = new THREE.InstancedMesh(
        rockGeo, new THREE.MeshToonMaterial({ gradientMap }), spec.n
      );
      for (let i = 0; i < spec.n; i++) {
        const a = rng.angle();
        const r = spec.r + (rng.float() - 0.5) * 30;
        DUMMY.position.set(Math.cos(a) * r, (rng.float() - 0.5) * 14, Math.sin(a) * r);
        DUMMY.rotation.set(rng.angle(), rng.angle(), rng.angle());
        DUMMY.scale.setScalar(0.5 + rng.float() * 1.7);
        DUMMY.updateMatrix();
        mesh.setMatrixAt(i, DUMMY.matrix);
        mesh.setColorAt(i, tone(jitterColor(0x8a84a6, rng, 0.15), 0.8, 0.65));
      }
      beltGroup.add(mesh);
      group.add(beltGroup);
      animators.push((t, dt) => { beltGroup.rotation.y += dt * spec.speed; });
    }
  }

  // comets with crayon trails
  {
    const trailTints = [0xffb3c9, 0x9fd8ff, 0xffe3a8];
    for (let i = 0; i < 6; i++) {
      const head = new THREE.Group();
      const rock = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.2, 0),
        new THREE.MeshToonMaterial({ color: 0xf2f6ff, gradientMap })
      );
      head.add(rock);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: trailTints[i % 3], transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      glow.scale.setScalar(8);
      head.add(glow);
      group.add(head);

      const trailN = 30;
      const trailPos = new Float32Array(trailN * 3);
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
      const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({
        color: trailTints[i % 3], transparent: true, opacity: 0.5, depthWrite: false,
      }));
      group.add(trail);

      const a = 1000 + rng.float() * 600;
      const b2 = a * (0.4 + rng.float() * 0.4);
      const speed = 0.02 + rng.float() * 0.03;
      const phase = rng.angle();
      const rot = rng.angle();
      const cr = Math.cos(rot), sr = Math.sin(rot);
      let seeded = false;
      animators.push((t) => {
        const u = phase + t * speed;
        const ex = Math.cos(u) * a, ez = Math.sin(u) * b2;
        const x = ex * cr - ez * sr;
        const z = ex * sr + ez * cr;
        const y = Math.sin(u * 2) * 32 + 18;
        head.position.set(x, y, z);
        if (!seeded) {
          for (let j = 0; j < trailN; j++) trailPos.set([x, y, z], j * 3);
          seeded = true;
        }
        for (let j = trailN - 1; j > 0; j--) {
          trailPos[j * 3] = trailPos[(j - 1) * 3];
          trailPos[j * 3 + 1] = trailPos[(j - 1) * 3 + 1];
          trailPos[j * 3 + 2] = trailPos[(j - 1) * 3 + 2];
        }
        trailPos.set([x, y, z], 0);
        trailGeo.attributes.position.needsUpdate = true;
      });
    }
  }

  // floating runestones adrift in the void
  {
    const n = 120;
    const geo = new THREE.BoxGeometry(0.8, 2, 0.5);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshToonMaterial({ gradientMap }), n);
    for (let i = 0; i < n; i++) {
      const a = rng.angle();
      const r = 80 + rng.float() * 1450;
      DUMMY.position.set(Math.cos(a) * r, -20 + rng.float() * 85, Math.sin(a) * r);
      DUMMY.rotation.set(rng.angle(), rng.angle(), rng.angle());
      DUMMY.scale.setScalar(0.6 + rng.float() * 1.6);
      DUMMY.updateMatrix();
      mesh.setMatrixAt(i, DUMMY.matrix);
      mesh.setColorAt(i, tone(jitterColor(0x8a84a6, rng, 0.12), 0.8, 0.7));
    }
    group.add(mesh);
  }

  // slowly turning glyph billboards
  {
    const glyphMats = [];
    for (let i = 0; i < 8; i++) {
      const ch = 'ᚠᚢᚦᚨᚱᚲᚷᛟ'[i];
      glyphMats.push(new THREE.SpriteMaterial({
        map: makeGlyphTexture(ch, '#aab4dd'),
        transparent: true, opacity: 0.25, depthWrite: false, toneMapped: false,
      }));
    }
    for (let i = 0; i < 40; i++) {
      const s = new THREE.Sprite(glyphMats[rng.int(8)]);
      const a = rng.angle();
      const r = 100 + rng.float() * 1450;
      s.position.set(Math.cos(a) * r, 8 + rng.float() * 75, Math.sin(a) * r);
      s.scale.setScalar(5 + rng.float() * 9);
      group.add(s);
    }
    glyphMats.forEach((m, i) => {
      const w = (i % 2 ? 1 : -1) * (0.05 + 0.04 * (i / 8));
      animators.push((t, dt) => { m.rotation += dt * w; });
    });
  }

  // more flotsam of the void: paper shards, torn strips, stray moonlets
  {
    const fields = [
      { geo: new THREE.TetrahedronGeometry(0.9), n: 160, col: 0x6a6486, spin: 0.008 },
      { geo: new THREE.BoxGeometry(2.2, 0.08, 0.5), n: 110, col: 0x8a84a6, spin: -0.006 },
      { geo: new THREE.IcosahedronGeometry(1.4, 0), n: 70, col: 0x9aa0bd, spin: 0.004 },
    ];
    for (const f of fields) {
      const fieldGroup = new THREE.Group();
      const mesh = new THREE.InstancedMesh(f.geo, new THREE.MeshToonMaterial({ gradientMap }), f.n);
      for (let i = 0; i < f.n; i++) {
        const a = rng.angle();
        const r = 90 + rng.float() * 1450;
        DUMMY.position.set(Math.cos(a) * r, -30 + rng.float() * 110, Math.sin(a) * r);
        DUMMY.rotation.set(rng.angle(), rng.angle(), rng.angle());
        DUMMY.scale.setScalar(0.4 + rng.float() * 1.4);
        DUMMY.updateMatrix();
        mesh.setMatrixAt(i, DUMMY.matrix);
        mesh.setColorAt(i, tone(jitterColor(f.col, rng, 0.12), 0.75, 0.7));
      }
      fieldGroup.add(mesh);
      group.add(fieldGroup);
      animators.push((t, dt) => { fieldGroup.rotation.y += dt * f.spin; });
    }
  }

  // named curios — small drifting oddities with quiet little name-tags
  {
    const toonMat = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap });
    const basicMat = (c) => new THREE.MeshBasicMaterial({ color: c });
    const curios = [
      ['the Anchorless Bell', () => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.6, 10, 1, true), toonMat(0xb08c50)));
        const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 5), basicMat(0xffe9c4));
        clapper.position.y = -1.1;
        g.add(clapper);
        return g;
      }],
      ['the Unfinished Moon', () => new THREE.Mesh(
        new THREE.SphereGeometry(2.2, 10, 8, 0, Math.PI * 1.35), toonMat(0x9aa0bd)
      )],
      ['a Door to Nowhere', () => {
        const g = new THREE.Group();
        const mat = toonMat(0x5c4a91);
        const left = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 0.4), mat);
        left.position.x = -1.2;
        const right = left.clone();
        right.position.x = 1.2;
        const top = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 0.4), mat);
        top.position.y = 2;
        g.add(left, right, top);
        return g;
      }],
      ["the Cartographer's Quill", () => {
        const quill = new THREE.Mesh(new THREE.ConeGeometry(0.35, 5, 6), toonMat(0xe6ddc9));
        quill.rotation.z = 0.8;
        return quill;
      }],
      ['a Very Lost Teacup', () => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.8, 1.2, 10, 1, true), toonMat(0xc99aa8)));
        const handle = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 6, 12), toonMat(0xc99aa8));
        handle.position.x = 1.2;
        g.add(handle);
        return g;
      }],
      ['the First Draft of a Star', () => {
        const geo = new THREE.IcosahedronGeometry(1.6, 1);
        const pos = geo.attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).multiplyScalar(0.7 + rng.float() * 0.6);
          pos.setXYZ(i, v.x, v.y, v.z);
        }
        geo.computeVertexNormals();
        return new THREE.Mesh(geo, basicMat(0xc9a86a));
      }],
      ['the Key to the Deep', () => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 0.35), toonMat(0x4a8c86)));
        const bow = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.16, 6, 12), toonMat(0x4a8c86));
        bow.position.y = 2.1;
        g.add(bow);
        return g;
      }],
      ['a Folded Farewell', () => {
        const g = new THREE.Group();
        const wing = new THREE.Mesh(new THREE.TetrahedronGeometry(1.4), toonMat(0xe8e4f2));
        const wing2 = wing.clone();
        wing2.position.x = 1.3;
        wing2.rotation.y = Math.PI / 3;
        g.add(wing, wing2);
        return g;
      }],
    ];
    curios.forEach(([name, make], i) => {
      const obj = make();
      const a = (i / curios.length) * Math.PI * 2 + rng.angle() * 0.2;
      const r = 200 + rng.float() * 1150;
      obj.position.set(Math.cos(a) * r, 10 + rng.float() * 42, Math.sin(a) * r);
      group.add(obj);
      const bobPhase = rng.angle();
      const spin = (rng.float() - 0.5) * 0.3;
      const baseY = obj.position.y;
      animators.push((t, dt) => {
        obj.rotation.y += dt * spin;
        obj.position.y = baseY + Math.sin(t * 0.5 + bobPhase) * 0.8;
      });
      const label = makeLabel({
        title: name, color: '#b8c4e6', scale: 15, startHidden: false,
      });
      label.sprite.material.opacity = 0.75;
      label.sprite.position.copy(obj.position).add(new THREE.Vector3(0, 4.5, 0));
      group.add(label.sprite);
    });
  }

  // ------------------------------------------------------------ runtime API
  function updateFlags(hexKey) {
    const i = waterIndexByKey.get(hexKey);
    if (i === undefined) return;
    const h = world.hexes.get(hexKey);
    flowAttr.array[i * 4 + 3] = (h.faint ? 1 : 0) + (h.levi ? 2 : 0) + (h.blocked ? 4 : 0);
    flowAttr.needsUpdate = true;
  }

  const fadeOuts = [];
  function releaseLock(lockId) {
    const fx = lockFx.get(lockId);
    if (fx) fadeOuts.push({ obj: fx.pillars, t: 0 });
  }
  function dimKeyStone(lockId, hexKey) {
    const fx = lockFx.get(lockId);
    const stoneFx = fx?.stones.get(hexKey);
    if (stoneFx) {
      stoneFx.stone.material.emissiveIntensity = 0.1;
      stoneFx.glyphMat.opacity = 0.25;
    }
  }

  // ---- squash & bounce
  const isleBounces = [];
  const springs = [];
  const m4 = new THREE.Matrix4();
  const sm = new THREE.Matrix4();

  function bounceIsle(hexKey) {
    const i = isleIndexByKey.get(hexKey);
    if (i !== undefined) isleBounces.push({ i, t: 0 });
  }
  function boingGate(gateId) {
    for (const g of gatePortGroups.get(gateId) ?? []) springs.push({ obj: g, t: 0, amp: 0.22 });
  }
  function wobbleBody(areaId) {
    const g = bodyGroups.get(areaId);
    if (g) springs.push({ obj: g, t: 0, amp: 0.12 });
  }

  function animate(t, dt, breath) {
    waterMat.uniforms.uTime.value = t;
    waterMat.uniforms.uBreath.value = breath;
    waterMatTop.uniforms.uTime.value = t;
    waterMatTop.uniforms.uBreath.value = breath;
    for (const fn of animators) fn(t, dt);
    for (const fx of secretFx) {
      const surge = THREE.MathUtils.smoothstep(breath, 0.86, 1.0);
      fx.pillar.material.opacity = surge * 0.35;
    }
    for (let i = fadeOuts.length - 1; i >= 0; i--) {
      const f = fadeOuts[i];
      f.t += dt;
      const s = Math.max(0.001, 1 - f.t / 1.2);
      f.obj.scale.set(s, s, s);
      if (f.t >= 1.2) {
        f.obj.parent?.remove(f.obj);
        fadeOuts.splice(i, 1);
      }
    }
    if (isleBounces.length) {
      for (let i = isleBounces.length - 1; i >= 0; i--) {
        const b = isleBounces[i];
        b.t += dt;
        const done = b.t >= 0.9;
        const s = done ? 1 : 1 + 0.3 * Math.sin(b.t * 16) * Math.exp(-b.t * 6);
        m4.fromArray(isleBaseMatrices, b.i * 16);
        sm.makeScale(1, s, 1);
        m4.multiply(sm);
        m4.toArray(isleMesh.instanceMatrix.array, b.i * 16);
        if (done) isleBounces.splice(i, 1);
      }
      isleMesh.instanceMatrix.needsUpdate = true;
    }
    for (let i = springs.length - 1; i >= 0; i--) {
      const b = springs[i];
      b.t += dt;
      const done = b.t >= 1;
      const s = done ? 1 : 1 + b.amp * Math.sin(b.t * 14) * Math.exp(-b.t * 5);
      b.obj.scale.setScalar(s);
      if (done) springs.splice(i, 1);
    }
  }

  return {
    group, animate,
    waterMesh, isleMesh, waterKeys, isleKeys, portHitboxes,
    labelsByArea, labelsByGate, labelsByLandmark,
    updateFlags, releaseLock, dimKeyStone,
    bounceIsle, boingGate, wobbleBody,
  };
}
