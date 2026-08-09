// Turns generated world data into the three.js scene: instanced hex seas and
// islands, astral bodies, warden gates, stormwalls, leviathans, and the deep
// clutter of the cosmos (belts, comets, runestones, whispers, watching eyes).

import * as THREE from 'three';
import { HEX, RINGS } from './config.js';
import * as Hx from './hexmath.js';
import {
  makeRuneTexture, makeWaterMaterial, makeSunMaterial, makeSwirlMaterial,
  makeGlowSpriteTexture, makeNebulaTexture, makeGlyphTexture, makeEyeTexture,
} from './materials.js';
import { makeLabel } from './labels.js';

const DUMMY = new THREE.Object3D();
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

export function buildWorld(world, rng) {
  const group = new THREE.Group();
  const animators = [];
  const glowTex = makeGlowSpriteTexture();

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
  const waterIndexByKey = new Map();

  waterKeys.forEach((k, i) => {
    const h = world.hexes.get(k);
    const area = world.areas[h.areaId];
    const p = Hx.toWorld(h.q, h.r, HEX);
    DUMMY.position.set(p.x, 0.02, p.z);
    DUMMY.rotation.set(0, 0, 0);
    DUMMY.scale.set(1, 1, 1);
    DUMMY.updateMatrix();
    waterMesh.setMatrixAt(i, DUMMY.matrix);

    const c = jitterColor(area.biome.water.color, rng, 0.05);
    aColor[i * 3] = c.r;
    aColor[i * 3 + 1] = c.g;
    aColor[i * 3 + 2] = c.b;
    aFlow[i * 4] = h.flow[0];
    aFlow[i * 4 + 1] = h.flow[1];
    aFlow[i * 4 + 2] = area.biome.water.speed;
    aFlow[i * 4 + 3] = (h.faint ? 1 : 0) + (h.levi ? 2 : 0) + (h.blocked ? 4 : 0);
    waterIndexByKey.set(k, i);
  });
  waterGeo.setAttribute('aColor', new THREE.InstancedBufferAttribute(aColor, 3));
  waterGeo.setAttribute('aFlow', new THREE.InstancedBufferAttribute(aFlow, 4));
  const flowAttr = waterGeo.getAttribute('aFlow');
  group.add(waterMesh);

  // ------------------------------------------------------------ island hexes
  const isleGeo = new THREE.CylinderGeometry(HEX * 0.92, HEX * 1.08, 1, 6);
  const isleMat = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.85 });
  const isleMesh = new THREE.InstancedMesh(isleGeo, isleMat, isleKeys.length);
  const bruise = new THREE.Color(0x4a3f5e);

  isleKeys.forEach((k, i) => {
    const h = world.hexes.get(k);
    const area = world.areas[h.areaId];
    const dread = area.dread;
    const p = Hx.toWorld(h.q, h.r, HEX);
    let y = h.elev / 2;
    // high-dread islands go wrong: slight tilts, and some hover free of the sea
    let tx = 0, tz = 0;
    if (dread >= 0.5) {
      tx = (rng.float() - 0.5) * 0.15 * dread;
      tz = (rng.float() - 0.5) * 0.15 * dread;
      if (rng.chance(dread * 0.1)) y += 0.9;
    }
    DUMMY.position.set(p.x, y, p.z);
    DUMMY.rotation.set(tx, 0, tz);
    DUMMY.scale.set(1, Math.max(0.4, h.elev), 1);
    DUMMY.updateMatrix();
    isleMesh.setMatrixAt(i, DUMMY.matrix);
    const c = jitterColor(area.biome.island.top, rng, 0.07);
    c.lerp(bruise, Math.min(0.35, dread * 0.22));
    isleMesh.setColorAt(i, c);
  });
  group.add(isleMesh);

  // ------------------------------------------------------------ island decor
  const decorGeos = {
    crystal: new THREE.IcosahedronGeometry(0.55, 0),
    glass: new THREE.IcosahedronGeometry(0.55, 0),
    ring: new THREE.TorusGeometry(0.55, 0.09, 6, 14),
    shroom: new THREE.SphereGeometry(0.6, 7, 5),
    spire: new THREE.ConeGeometry(0.45, 2.6, 5),
    monolith: new THREE.BoxGeometry(0.55, 2.4, 0.4),
    shard: new THREE.TetrahedronGeometry(0.7),
  };
  decorGeos.spire.translate(0, 1.3, 0);
  decorGeos.monolith.translate(0, 1.2, 0);
  decorGeos.crystal.translate(0, 0.7, 0);
  decorGeos.glass.translate(0, 0.7, 0);
  decorGeos.ring.translate(0, 1.1, 0);
  decorGeos.shroom.translate(0, 0.75, 0);
  decorGeos.shard.translate(0, 0.5, 0);
  const GLOW_KINDS = new Set(['crystal', 'glass', 'ring', 'shroom']);
  const decorPlacements = {};

  for (const k of isleKeys) {
    const h = world.hexes.get(k);
    const area = world.areas[h.areaId];
    if (!rng.chance(0.4)) continue;
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
      const col = GLOW_KINDS.has(kind)
        ? jitterColor(area.biome.decor.color, rng, 0.08)
        : jitterColor(area.biome.island.side, rng, 0.1).lerp(new THREE.Color(0xffffff), 0.15);
      (decorPlacements[kind] ??= []).push({ m: DUMMY.matrix.clone(), c: col });
    }
  }
  for (const [kind, list] of Object.entries(decorPlacements)) {
    const mat = GLOW_KINDS.has(kind)
      ? new THREE.MeshBasicMaterial()
      : new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 });
    const mesh = new THREE.InstancedMesh(decorGeos[kind], mat, list.length);
    list.forEach((it, i) => {
      mesh.setMatrixAt(i, it.m);
      mesh.setColorAt(i, it.c);
    });
    group.add(mesh);
  }

  // ------------------------------------------------------------ astral bodies
  const labelsByArea = new Map();
  const secretFx = [];

  for (const area of world.areas) {
    const b = area.biome;
    const bodyGroup = new THREE.Group();
    const y = b.bodyKind === 'sun' ? 20 : b.bodySize + 7;
    bodyGroup.position.set(area.pos.x, y, area.pos.z);

    if (b.bodyKind === 'sun') {
      const sunMat = makeSunMaterial();
      const sun = new THREE.Mesh(new THREE.IcosahedronGeometry(b.bodySize, 3), sunMat);
      bodyGroup.add(sun);
      const corona = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: 0xffb347, transparent: true, opacity: 0.42,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      corona.scale.setScalar(b.bodySize * 6);
      bodyGroup.add(corona);
      animators.push((t) => {
        sunMat.uniforms.uTime.value = t;
        const pulse = 1 + Math.sin(t * 0.5) * 0.025;
        sun.scale.setScalar(pulse);
        corona.scale.setScalar(b.bodySize * (5.6 + Math.sin(t * 0.5) * 0.7));
      });
    } else {
      const geo = new THREE.IcosahedronGeometry(b.bodySize, 1);
      const pos = geo.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        v.multiplyScalar(1 + (rng.float() - 0.5) * 0.22);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();
      const planet = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: b.bodyColor, flatShading: true,
        emissive: b.bodyColor2, emissiveIntensity: 0.35,
      }));
      bodyGroup.add(planet);
      const spin = 0.02 + rng.float() * 0.05;
      animators.push((t, dt) => { planet.rotation.y += dt * spin; });

      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: b.island.glow, transparent: true,
        opacity: area.secret ? 0.5 : 0.3,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      halo.scale.setScalar(b.bodySize * 4.5);
      bodyGroup.add(halo);

      if (b.hasRings) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(b.bodySize * 1.5, b.bodySize * 2.3, 42),
          new THREE.MeshBasicMaterial({
            color: b.island.glow, transparent: true, opacity: 0.3,
            side: THREE.DoubleSide, depthWrite: false,
          })
        );
        ring.rotation.x = Math.PI / 2 - 0.32;
        bodyGroup.add(ring);
        animators.push((t, dt) => { ring.rotation.z += dt * 0.05; });
      }

      const nMoons = b.bodyKind === 'planet' && !area.secret ? rng.int(3) : 0;
      for (let mi = 0; mi < nMoons; mi++) {
        const moon = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.8 + rng.float() * 0.9, 0),
          new THREE.MeshStandardMaterial({ color: 0xb0b4c9, flatShading: true })
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

      // secret-body wrongness
      if (area.secret) {
        if (b.key === 'hollowmoon') {
          animators.push((t) => {
            // an empty bell with a slow, arrhythmic heartbeat
            const beat = Math.pow(Math.max(0, Math.sin(t * 0.9)), 6);
            planet.scale.setScalar(1 + beat * 0.12);
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
            color: 0xa8fff2, size: 0.7, transparent: true, opacity: 0.7,
            blending: THREE.AdditiveBlending, depthWrite: false,
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
          halo.material.color.set(0x5240a8);
          halo.scale.setScalar(b.bodySize * 8);
          animators.push((t) => {
            // the inverse sun: its darkness breathes opposite the hearthstar
            halo.material.opacity = 0.35 - Math.sin(t * 0.15) * 0.2;
          });
        }

        // alignment surge: at the peak of the tide a pillar of light marks each secret
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
      color: glowHex(b.island.glow),
      scale: area.secret ? 38 : 48,
      startHidden: true,
    });
    label.sprite.position.set(area.pos.x, y + b.bodySize + 16, area.pos.z);
    group.add(label.sprite);
    labelsByArea.set(area.id, label);
  }

  // ------------------------------------------------------------ warden gates
  const gateColor = 0x8c5aff;
  const labelsByGate = new Map();
  for (const gate of world.gates) {
    const h = world.hexes.get(Hx.key(gate.q, gate.r));
    const p = Hx.toWorld(gate.q, gate.r, HEX);
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = Math.atan2(h.flow[0], h.flow[1]);

    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.3, 8, 30),
      new THREE.MeshStandardMaterial({
        color: 0x241d38, flatShading: true,
        emissive: gateColor, emissiveIntensity: gate.faint ? 0.4 : 1.1,
      })
    );
    ringMesh.position.y = 3.8;
    g.add(ringMesh);

    const swirlMat = makeSwirlMaterial(gate.faint ? 0x5240a8 : gateColor);
    const swirl = new THREE.Mesh(new THREE.CircleGeometry(3.0, 32), swirlMat);
    swirl.position.y = 3.8;
    g.add(swirl);
    animators.push((t) => { swirlMat.uniforms.uTime.value = t; });

    for (const side of [-1, 1]) {
      const pylon = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 5.2, 0.9),
        new THREE.MeshStandardMaterial({
          color: 0x1b1633, flatShading: true, emissive: gateColor, emissiveIntensity: 0.35,
        })
      );
      pylon.position.set(side * 5.2, 2.6, 0);
      g.add(pylon);
    }

    // warning glyphs circling the ring — the world speaks
    const glyphMat = new THREE.SpriteMaterial({
      map: makeGlyphTexture(gate.rune.ch, '#cbb2ff'),
      transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false,
    });
    const glyphs = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(glyphMat);
      s.scale.setScalar(1.6);
      g.add(s);
      glyphs.push(s);
    }
    animators.push((t) => {
      glyphs.forEach((s, i) => {
        const a = t * 0.7 + (i / 3) * Math.PI * 2;
        s.position.set(Math.cos(a) * 4.6, 3.8 + Math.sin(t * 1.3 + i) * 0.5, Math.sin(a) * 1.2);
      });
    });

    const label = makeLabel({
      title: gate.name,
      sub: `${gate.rune.ch} ᛫ a warden sleeps`,
      color: '#cbb2ff', subColor: '#8fa8d9',
      scale: 22, startHidden: true,
    });
    label.sprite.position.set(p.x, 11, p.z);
    group.add(label.sprite);
    labelsByGate.set(gate.id, label);
    group.add(g);
  }

  // ------------------------------------------------------------ locks
  const lockFx = new Map(); // lockId -> { pillars: Group, stones: Map(hexKey -> {sprite, mat}) }
  for (const lock of world.locks) {
    const pillars = new THREE.Group();
    // rumor locks seal a whole hidden path — only pillar its first few hexes
    for (const wk of lock.wallKeys.slice(0, 4)) {
      const wh = world.hexes.get(wk);
      const p = Hx.toWorld(wh.q, wh.r, HEX);
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(1.6, 8, 7, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0x6a5cc2, transparent: true, opacity: 0.4,
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
        new THREE.MeshStandardMaterial({
          color: 0x1b1633, flatShading: true, emissive: 0x8c5aff, emissiveIntensity: 0.8,
        })
      );
      stone.position.set(p.x, kh.elev + 1.6, p.z);
      stone.rotation.y = rng.angle();
      group.add(stone);
      const glyphMat = new THREE.SpriteMaterial({
        map: makeGlyphTexture(lock.rune.ch, '#e0ccff'),
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
    const curve = new THREE.CatmullRomCurve3(pts);
    const segMat = new THREE.MeshStandardMaterial({
      color: 0x1b1633, flatShading: true,
      emissive: levi.secret ? 0x8c5aff : 0x4a3d8f,
      emissiveIntensity: levi.secret ? 0.9 : 0.5,
    });
    const nSeg = 22;
    const segs = [];
    for (let i = 0; i < nSeg; i++) {
      const radius = i === 0 ? 1.7 : 1.5 * (1 - i / nSeg) + 0.35;
      const seg = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 0), segMat);
      group.add(seg);
      segs.push(seg);
    }
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffe9c4 });
    const eyes = [];
    for (const side of [-0.6, 0.6]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), eyeMat);
      group.add(eye);
      eyes.push({ eye, side });
    }
    const spd = 1 / (30 + levi.points.length * 0.5);
    const phase0 = rng.float() * 2;
    const du = 0.014;
    animators.push((t) => {
      const phase = t * spd + phase0;
      const tri = (x) => {
        const c = ((x % 2) + 2) % 2;
        return c < 1 ? c : 2 - c;
      };
      let head = null, headNext = null;
      for (let i = 0; i < nSeg; i++) {
        const u = tri(phase - i * du);
        const p = curve.getPoint(u);
        p.y = -1.6 + Math.sin(t * 2 + i * 0.55) * 0.7;
        segs[i].position.copy(p);
        if (i === 0) {
          head = p;
          headNext = curve.getPoint(tri(phase + du));
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

  // ------------------------------------------------------------ cosmos décor
  // starfield
  {
    const n = 4500;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const tints = [new THREE.Color(0xffffff), new THREE.Color(0x9fd8ff), new THREE.Color(0xffd9a0), new THREE.Color(0xc0b2ff)];
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(2800 + rng.float() * 600);
      pos.set([v.x, v.y, v.z], i * 3);
      const c = tints[rng.int(tints.length)].clone().multiplyScalar(0.4 + rng.float() * 0.6);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 1.7, sizeAttenuation: false, vertexColors: true,
      transparent: true, opacity: 0.9, depthWrite: false, fog: false, toneMapped: false,
    }));
    group.add(stars);
  }

  // nebulas
  {
    const nebTex = makeNebulaTexture();
    const tints = [0x2a2050, 0x1d3a66, 0x47265c, 0x1e4a44, 0x4a2634];
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: nebTex, color: tints[i % tints.length], transparent: true,
        opacity: 0.16, depthWrite: false, fog: false,
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
    const n = 2600;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rng.angle();
      const r = 60 + rng.float() * 1050;
      pos.set([Math.cos(a) * r, (rng.float() - 0.5) * 80, Math.sin(a) * r], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x8fa8d9, size: 1.1, transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    group.add(dust);
    animators.push((t, dt) => { dust.rotation.y += dt * 0.0015; });
  }

  // faint orbit guide-lines — the orrery's drawn rings
  {
    const ringMat = new THREE.LineBasicMaterial({
      color: 0x4a5c9e, transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false,
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
      { r: 215, n: 160, speed: 0.004 },
      { r: 348, n: 200, speed: 0.003 },
      { r: 487, n: 180, speed: 0.002 },
    ];
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    for (const spec of beltSpecs) {
      const beltGroup = new THREE.Group();
      const mesh = new THREE.InstancedMesh(
        rockGeo,
        new THREE.MeshStandardMaterial({ flatShading: true, roughness: 1 }),
        spec.n
      );
      for (let i = 0; i < spec.n; i++) {
        const a = rng.angle();
        const r = spec.r + (rng.float() - 0.5) * 30;
        DUMMY.position.set(Math.cos(a) * r, (rng.float() - 0.5) * 14, Math.sin(a) * r);
        DUMMY.rotation.set(rng.angle(), rng.angle(), rng.angle());
        DUMMY.scale.setScalar(0.5 + rng.float() * 1.7);
        DUMMY.updateMatrix();
        mesh.setMatrixAt(i, DUMMY.matrix);
        mesh.setColorAt(i, jitterColor(0x5c5470, rng, 0.15));
      }
      beltGroup.add(mesh);
      group.add(beltGroup);
      animators.push((t, dt) => { beltGroup.rotation.y += dt * spec.speed; });
    }
  }

  // comets with glowing trails
  {
    for (let i = 0; i < 6; i++) {
      const head = new THREE.Group();
      const rock = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.2, 0),
        new THREE.MeshStandardMaterial({ color: 0xd6e6f2, flatShading: true, emissive: 0x9fd8ff, emissiveIntensity: 0.5 })
      );
      head.add(rock);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: 0x9fd8ff, transparent: true, opacity: 0.7,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      glow.scale.setScalar(9);
      head.add(glow);
      group.add(head);

      const trailN = 30;
      const trailPos = new Float32Array(trailN * 3);
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
      const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({
        color: 0x9fd8ff, transparent: true, opacity: 0.4,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      group.add(trail);

      const a = 650 + rng.float() * 420;
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
    const n = 140;
    const geo = new THREE.BoxGeometry(0.8, 2, 0.5);
    const mesh = new THREE.InstancedMesh(
      geo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), n
    );
    for (let i = 0; i < n; i++) {
      const a = rng.angle();
      const r = 80 + rng.float() * 950;
      DUMMY.position.set(Math.cos(a) * r, -20 + rng.float() * 85, Math.sin(a) * r);
      DUMMY.rotation.set(rng.angle(), rng.angle(), rng.angle());
      DUMMY.scale.setScalar(0.6 + rng.float() * 1.6);
      DUMMY.updateMatrix();
      mesh.setMatrixAt(i, DUMMY.matrix);
      mesh.setColorAt(i, jitterColor(0x3a3654, rng, 0.12));
    }
    group.add(mesh);
  }

  // slowly turning glyph billboards
  {
    const glyphMats = [];
    for (let i = 0; i < 8; i++) {
      const ch = 'ᚠᚢᚦᚨᚱᚲᚷᛟ'[i];
      glyphMats.push(new THREE.SpriteMaterial({
        map: makeGlyphTexture(ch, '#8fa8d9'),
        transparent: true, opacity: 0.28, depthWrite: false, toneMapped: false,
      }));
    }
    for (let i = 0; i < 40; i++) {
      const s = new THREE.Sprite(glyphMats[rng.int(8)]);
      const a = rng.angle();
      const r = 100 + rng.float() * 950;
      s.position.set(Math.cos(a) * r, 8 + rng.float() * 75, Math.sin(a) * r);
      s.scale.setScalar(5 + rng.float() * 9);
      group.add(s);
    }
    glyphMats.forEach((m, i) => {
      const w = (i % 2 ? 1 : -1) * (0.05 + 0.04 * (i / 8));
      animators.push((t, dt) => { m.rotation += dt * w; });
    });
  }

  // whisper glyphs and watching eyes in the dread fringe
  {
    const whisperMat = new THREE.SpriteMaterial({
      map: makeGlyphTexture('ᛜ', '#3a2e5c'),
      transparent: true, opacity: 0.18, depthWrite: false,
    });
    const dreadWater = waterKeys.filter((k) => world.areas[world.hexes.get(k).areaId].dread >= 0.55);
    for (let i = 0; i < Math.min(30, dreadWater.length); i++) {
      const k = dreadWater[rng.int(dreadWater.length)];
      const h = world.hexes.get(k);
      const p = Hx.toWorld(h.q, h.r, HEX);
      const s = new THREE.Sprite(whisperMat);
      s.scale.setScalar(2.5 + rng.float() * 2);
      const base = 2.5 + rng.float() * 3;
      const phase = rng.angle();
      s.position.set(p.x, base, p.z);
      group.add(s);
      animators.push((t) => { s.position.y = base + Math.sin(t * 0.5 + phase) * 1.2; });
    }

    const eyeTex = makeEyeTexture();
    const eyeIsles = isleKeys.filter((k) => world.areas[world.hexes.get(k).areaId].dread >= 1.0);
    for (const k of eyeIsles) {
      if (!rng.chance(0.07)) continue;
      const h = world.hexes.get(k);
      const p = Hx.toWorld(h.q, h.r, HEX);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: eyeTex, transparent: true, opacity: 0.55, depthWrite: false,
      }));
      s.scale.set(3, 3, 1);
      s.position.set(p.x, h.elev + 2.4, p.z);
      group.add(s);
    }
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
      stoneFx.stone.material.emissiveIntensity = 0.15;
      stoneFx.glyphMat.opacity = 0.25;
    }
  }

  function animate(t, dt, breath) {
    waterMat.uniforms.uTime.value = t;
    waterMat.uniforms.uBreath.value = breath;
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
  }

  return {
    group, animate,
    waterMesh, isleMesh, waterKeys, isleKeys,
    labelsByArea, labelsByGate,
    updateFlags, releaseLock, dimKeyStone,
  };
}
