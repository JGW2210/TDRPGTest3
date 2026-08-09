// Bespoke decor geometry, one small library per biome — ember-glass fins,
// chime-bells, spore caps, cog stacks, bone arches — replacing the old seven
// shared shapes. Each kind is a single merged geometry (origin at the ground)
// tagged glow (emissive-bright) or matte (toon-shaded); buildWorld instances
// each kind once across the whole map.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const T = (geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => {
  geo.scale(sx, sy, sz);
  if (rx || ry || rz) {
    geo.rotateX(rx);
    geo.rotateY(ry);
    geo.rotateZ(rz);
  }
  geo.translate(x, y, z);
  return geo;
};
const M = (...geos) => mergeGeometries(geos);

const cyl = (rt, rb, h, seg = 7) => new THREE.CylinderGeometry(rt, rb, h, seg);
const cone = (r, h, seg = 6) => new THREE.ConeGeometry(r, h, seg);
const sph = (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 6, 12, arc);
const octa = (r) => new THREE.OctahedronGeometry(r);
const tetra = (r) => new THREE.TetrahedronGeometry(r);
const dodeca = (r) => new THREE.DodecahedronGeometry(r, 0);

// Each entry: () => ({ geo, glow })
const BUILDERS = {
  // -- emberglass
  emberfin: () => ({ glow: true, geo: M(
    T(cone(0.5, 2.2, 4), 0, 1.1, 0, 0, 0, 0.18, 1, 1, 0.3),
    T(cone(0.34, 1.4, 4), 0.5, 0.7, 0, 0, 0, -0.3, 1, 1, 0.3)
  ) }),
  heatbloom: () => ({ glow: true, geo: M(
    T(cyl(0.07, 0.1, 1.3), 0, 0.65, 0),
    T(sph(0.42), 0, 1.5, 0, 0, 0, 0, 1, 0.8, 1)
  ) }),
  // -- chimewood
  chimebell: () => ({ glow: true, geo: M(
    T(cyl(0.05, 0.07, 1.9), 0, 0.95, 0),
    T(new THREE.ConeGeometry(0.5, 0.85, 8, 1, true), 0, 1.45, 0, Math.PI, 0, 0),
    T(sph(0.14, 6, 5), 0, 1.15, 0)
  ) }),
  tuningfork: () => ({ glow: false, geo: M(
    T(box(0.5, 0.3, 0.5), 0, 0.15, 0),
    T(box(0.12, 1.7, 0.12), -0.22, 1.1, 0),
    T(box(0.12, 1.7, 0.12), 0.22, 1.1, 0)
  ) }),
  // -- sporelight
  sporecap: () => ({ glow: true, geo: M(
    T(cyl(0.14, 0.2, 0.95), 0, 0.48, 0),
    T(sph(0.58, 9, 6), 0, 1.05, 0, 0, 0, 0, 1, 0.55, 1)
  ) }),
  puffcluster: () => ({ glow: true, geo: M(
    T(sph(0.32), -0.25, 0.3, 0.1),
    T(sph(0.24), 0.3, 0.24, -0.15),
    T(sph(0.2), 0.05, 0.2, 0.34)
  ) }),
  // -- cinder
  slagheap: () => ({ glow: false, geo: M(
    T(dodeca(0.62), 0, 0.4, 0, 0, 0.5, 0, 1, 0.6, 1),
    T(dodeca(0.4), 0.55, 0.26, 0.3, 0, 1.2, 0, 1, 0.62, 1)
  ) }),
  emberspike: () => ({ glow: true, geo: T(cone(0.3, 1.9, 5), 0, 0.95, 0) }),
  // -- meridian
  coralspire: () => ({ glow: true, geo: M(
    T(cone(0.22, 1.9, 5), -0.3, 0.95, 0, 0, 0, 0.12),
    T(cone(0.18, 2.5, 5), 0.15, 1.25, 0.15, 0, 0, -0.1),
    T(cone(0.15, 1.3, 5), 0.4, 0.65, -0.3, 0, 0, -0.25)
  ) }),
  wavestone: () => ({ glow: false, geo: T(torus(0.62, 0.14, Math.PI), 0, 0.1, 0) }),
  // -- cog
  cogstack: () => ({ glow: false, geo: M(
    T(cyl(0.55, 0.55, 0.3, 9), 0, 0.15, 0),
    T(cyl(0.34, 0.34, 0.5, 9), 0, 0.55, 0, 0, 0.3, 0),
    T(cyl(0.48, 0.48, 0.22, 9), 0, 0.9, 0, 0, 0.6, 0)
  ) }),
  pistoncolumn: () => ({ glow: false, geo: M(
    T(box(0.4, 1.9, 0.4), 0, 0.95, 0),
    T(cyl(0.32, 0.32, 0.35, 9), 0, 2.0, 0)
  ) }),
  // -- whisperdune
  sandsail: () => ({ glow: false, geo: T(cone(0.62, 2.7, 4), 0, 1.35, 0, 0, 0, 0.2, 1, 1, 0.24) }),
  whisperhorn: () => ({ glow: false, geo: M(
    T(cone(0.34, 2.1, 6), 0, 1.05, 0, 0, 0, 0.5),
    T(sph(0.2, 6, 5), -0.85, 1.9, 0)
  ) }),
  // -- frostveil
  icefang: () => ({ glow: true, geo: T(octa(0.5), 0, 1.35, 0, 0, 0, 0, 1, 2.7, 1) }),
  frostbloom: () => ({ glow: true, geo: M(
    T(octa(0.3), 0, 0.4, 0, 0, 0, 0, 1, 1.4, 1),
    T(octa(0.22), 0.4, 0.3, 0, 0, 0, -0.7, 1, 1.4, 1),
    T(octa(0.22), -0.4, 0.3, 0, 0, 0, 0.7, 1, 1.4, 1),
    T(octa(0.22), 0, 0.3, 0.4, 0.7, 0, 0, 1, 1.4, 1),
    T(octa(0.22), 0, 0.3, -0.4, -0.7, 0, 0, 1, 1.4, 1)
  ) }),
  // -- thornlight
  bramblespur: () => ({ glow: false, geo: M(
    T(cone(0.2, 1.7, 5), 0, 0.85, 0, 0, 0, 0.35),
    T(cone(0.16, 1.3, 5), 0.2, 0.65, 0.2, 0.4, 0, -0.4),
    T(cone(0.13, 1.0, 5), -0.25, 0.5, -0.15, -0.35, 0, -0.15)
  ) }),
  lightpod: () => ({ glow: true, geo: M(
    T(cyl(0.05, 0.08, 1.5), 0, 0.75, 0, 0, 0, 0.1),
    T(sph(0.36), 0.15, 1.65, 0)
  ) }),
  // -- graveanchors
  rustanchor: () => ({ glow: false, geo: M(
    T(cyl(0.09, 0.1, 1.9), 0, 1.05, 0),
    T(torus(0.28, 0.07), 0, 2.15, 0),
    T(box(0.85, 0.12, 0.12), 0, 1.6, 0),
    T(torus(0.55, 0.11, Math.PI), 0, 0.55, 0, 0, 0, Math.PI)
  ) }),
  brokenmast: () => ({ glow: false, geo: M(
    T(cyl(0.11, 0.15, 2.5), 0, 1.2, 0, 0, 0, 0.35),
    T(box(1.4, 0.12, 0.12), -0.35, 1.7, 0, 0, 0, 0.35)
  ) }),
  // -- storm
  stormrod: () => ({ glow: true, geo: M(
    T(cyl(0.05, 0.08, 2.8), 0, 1.4, 0),
    T(sph(0.2, 6, 5), 0, 2.9, 0)
  ) }),
  galestone: () => ({ glow: false, geo: M(
    T(dodeca(0.48), 0, 1.5, 0, 0.4, 0.7, 0),
    T(dodeca(0.2), 0.5, 0.9, 0.2, 0, 0.4, 0),
    T(dodeca(0.14), -0.4, 0.5, -0.2, 0, 1.1, 0)
  ) }),
  // -- lanternfen
  fenlantern: () => ({ glow: true, geo: M(
    T(cyl(0.07, 0.1, 1.7), 0, 0.85, 0),
    T(box(0.5, 0.62, 0.5), 0, 1.5, 0),
    T(cone(0.32, 0.3, 4), 0, 1.95, 0)
  ) }),
  wispreed: () => ({ glow: false, geo: M(
    T(cyl(0.04, 0.06, 1.6, 5), -0.15, 0.8, 0, 0, 0, 0.08),
    T(cyl(0.04, 0.06, 1.9, 5), 0.1, 0.95, 0.1, 0, 0, -0.06),
    T(cyl(0.04, 0.06, 1.3, 5), 0.2, 0.65, -0.18, 0, 0, 0.14)
  ) }),
  // -- bleachedchoir
  bonearch: () => ({ glow: false, tint: 0xd8d0bc, geo: T(torus(0.8, 0.12, Math.PI), 0, 0.15, 0) }),
  chorister: () => ({ glow: false, tint: 0xd8d0bc, geo: M(
    T(cone(0.34, 2.3, 6), 0, 1.15, 0),
    T(sph(0.24, 7, 5), 0, 2.45, 0)
  ) }),
  // -- umbral
  shadowspike: () => ({ glow: false, geo: M(
    T(octa(0.42), 0, 1.15, 0, 0, 0, 0.1, 1, 2.8, 1),
    T(octa(0.26), 0.4, 0.6, 0.1, 0, 0, -0.35, 1, 2.2, 1)
  ) }),
  voidshard: () => ({ glow: true, geo: T(tetra(0.7), 0, 0.55, 0, 0.6, 0.4, 0) }),
  // -- unblinking
  eyestalk: () => ({ glow: true, geo: M(
    T(cyl(0.07, 0.11, 1.4), 0, 0.7, 0, 0, 0, 0.14),
    T(sph(0.32, 9, 7), 0.2, 1.55, 0)
  ) }),
  saltpillar: () => ({ glow: false, tint: 0xbcc9c2, geo: T(cyl(0.3, 0.45, 1.8, 5), 0, 0.9, 0) }),
  // -- echoverge
  echostone: () => ({ glow: false, geo: M(
    T(box(0.55, 1.9, 0.22), -0.4, 0.95, 0, 0, 0, 0.06),
    T(box(0.55, 1.9, 0.22), 0.4, 0.95, 0, 0, 0, -0.06)
  ) }),
  twinshard: () => ({ glow: true, geo: M(
    T(tetra(0.5), -0.35, 0.4, 0, 0, 0.3, 0),
    T(tetra(0.5), 0.35, 0.4, 0, 0, -0.3, Math.PI)
  ) }),
  // -- silentorchard
  orchardtree: () => ({ glow: false, geo: M(
    T(cyl(0.14, 0.2, 1.3, 6), 0, 0.65, 0),
    T(cone(0.09, 1.1, 5), 0.35, 1.7, 0, 0, 0, -0.7),
    T(cone(0.09, 1.2, 5), -0.3, 1.8, 0.1, 0.5, 0, 0.6),
    T(cone(0.09, 0.9, 5), 0, 1.75, -0.3, -0.6, 0, 0)
  ) }),
  fallenfruit: () => ({ glow: true, geo: T(sph(0.32, 8, 6), 0, 0.28, 0, 0, 0, 0, 1, 0.88, 1) }),
  // -- mawshallows (toothrock shared with the Orphaned Teeth reef)
  toothrock: () => ({ glow: false, tint: 0xd8d0bc, geo: M(
    T(cone(0.42, 2.0, 6), 0, 1.0, 0, 0, 0, 0.16),
    T(cone(0.26, 1.2, 5), 0.45, 0.6, 0.1, 0, 0, -0.3)
  ) }),
  ribbone: () => ({ glow: false, tint: 0xd8d0bc, geo: T(torus(0.75, 0.1, Math.PI * 0.85), 0, 0.12, 0, 0, 0, 0.2) }),
  // -- secrets
  tearstone: () => ({ glow: true, geo: M(
    T(sph(0.4, 9, 7), 0, 0.42, 0),
    T(cone(0.28, 0.9, 9), 0, 1.0, 0)
  ) }),
  bellfragment: () => ({ glow: false, geo: T(
    new THREE.ConeGeometry(0.62, 1.05, 8, 1, true, 0, Math.PI * 1.25), 0, 0.5, 0, 0, 0, 0.5
  ) }),
  darkmonolith: () => ({ glow: false, geo: T(box(0.55, 2.4, 0.4), 0, 1.2, 0) }),
  // -- asteroid reefs
  voidrubble: () => ({ glow: false, geo: M(
    T(dodeca(0.5), 0, 0.35, 0, 0, 0.8, 0, 1, 0.7, 1),
    T(tetra(0.35), 0.5, 0.25, 0.25, 0, 0.3, 0)
  ) }),
};

export function buildDecorLibrary() {
  const lib = {};
  for (const [kind, make] of Object.entries(BUILDERS)) {
    lib[kind] = make();
  }
  return lib;
}
