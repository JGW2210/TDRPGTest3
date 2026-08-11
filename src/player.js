// The Star-Pilgrim remade (Round 11): a 2D paper-cutout HOODED MAGICIAN —
// glowing eyes in the cowl, a staff crowned with a caught star — riding the
// same click-to-sail hex movement, squashy hop, water ripples, and rune
// halo. The gate blast still hurls them across the void as an orb of light.

import * as THREE from 'three';
import { HEX } from './config.js';
import * as Hx from './hexmath.js';
import { findPath } from './pathfind.js';
import { magicianCanvas, makePaperFigure } from './sprites.js';

const STEP_TIME = 0.18; // Round 13: the base sail runs ~20% quicker

export class Player {
  constructor(world) {
    this.world = world;
    this.hexKey = world.startKey;
    this.path = [];
    this.stepT = 0;
    this.blast = null;
    this.speedMul = 1; // overworld sail-speed items feed this (Round 11)
    this.onEnterHex = null; // cb(hexRecord)

    const group = new THREE.Group();
    // the paper magician: a billboard cutout, feet at the group origin
    // (its built-in glow doubles as the aura that reads from orrery zoom)
    this.figure = makePaperFigure(magicianCanvas(), {
      height: 3.6, glow: 0xffe9c4, glowScale: 1.9,
    });
    group.add(this.figure);

    this.light = new THREE.PointLight(0xffd9a8, 60, 40, 1.8);
    this.light.position.y = 3.2;
    group.add(this.light);

    this.mesh = group;
    this.ripples = [];
    this._rippleGeo = new THREE.RingGeometry(0.5, 0.72, 24);
    this._syncToHex();
  }

  _hexY(h) {
    // astral shrine platforms carry their altitude in baseY
    return (h.baseY || 0) + (h.kind === 'isle' ? h.elev + 0.15 : 0.35);
  }

  _hexPos(key) {
    const h = this.world.hexes.get(key);
    const { q, r } = Hx.parseKey(key);
    const p = Hx.toWorld(q, r, HEX);
    return new THREE.Vector3(p.x, this._hexY(h), p.z);
  }

  _syncToHex() {
    this.mesh.position.copy(this._hexPos(this.hexKey));
  }

  requestMove(targetKey) {
    if (this.blast) return false;
    // route from the hex we'll stand on next, keeping any in-flight step
    const anchor = this.path.length ? this.path[0] : this.hexKey;
    const path = findPath(this.world.hexes, anchor, targetKey);
    if (!path) return false;
    this.path = (this.path.length ? [this.path[0]] : []).concat(path.slice(1));
    return true;
  }

  // Gate blast: hurled across the void between node islets. Same-ring
  // crossings ride the orbit line ('arc'); outward crossings are a straight
  // shot ('line'); rock-chain leaps are short snappy 'hop's.
  startBlast(destKey, mode = 'line', { durMul = 1 } = {}) {
    const from = this._hexPos(this.hexKey);
    const to = this._hexPos(destKey);
    let dist, arc = null;
    if (mode === 'arc') {
      const a0 = Math.atan2(from.z, from.x);
      const a1 = Math.atan2(to.z, to.x);
      let da = a1 - a0;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const r0 = Math.hypot(from.x, from.z);
      const r1 = Math.hypot(to.x, to.z);
      arc = { a0, da, r0, r1 };
      dist = Math.abs(da) * ((r0 + r1) / 2);
    } else {
      dist = from.distanceTo(to);
    }
    const hop = mode === 'hop';
    this.blast = {
      from, to, destKey, t: 0, arc, mode,
      dur: (hop
        ? THREE.MathUtils.clamp(0.3 + dist / 90, 0.45, 0.95)
        : THREE.MathUtils.clamp(0.7 + dist / 260, 0.9, 2.6)) * durMul,
      height: hop
        ? 2.2 + dist * 0.12
        : arc
          ? THREE.MathUtils.clamp(dist * 0.1, 10, 45)
          : THREE.MathUtils.clamp(dist * 0.22, 16, 90),
    };
    this.path = [];
    this.stepT = 0;
  }

  // Position along the current blast's path at raw progress t (0..1), easing
  // and vertical lift included — the same arc update() flies. The beam fx
  // samples this to lay its ribbon of light along the route.
  blastPointAt(t, out = new THREE.Vector3()) {
    const b = this.blast;
    if (!b) return out;
    const u = t * t * (3 - 2 * t);
    if (b.arc) {
      const ang = b.arc.a0 + b.arc.da * u;
      const rad = b.arc.r0 + (b.arc.r1 - b.arc.r0) * u;
      out.set(Math.cos(ang) * rad, b.from.y + (b.to.y - b.from.y) * u, Math.sin(ang) * rad);
    } else {
      out.copy(b.from).lerp(b.to, u);
    }
    out.y += Math.sin(t * Math.PI) * b.height;
    return out;
  }

  get isMoving() {
    return this.path.length > 0 || !!this.blast;
  }

  spawnRipple(scene, pos, color = 0x9fd8ff) {
    const m = new THREE.Mesh(
      this._rippleGeo,
      new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.7,
        side: THREE.DoubleSide, depthWrite: false,
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos.x, 0.3, pos.z);
    scene.add(m);
    this.ripples.push({ mesh: m, t: 0 });
  }

  update(dt, scene, time) {
    this.light.intensity = 55 + Math.sin(time * 3.1) * 10;

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.t += dt;
      const p = r.t / 0.8;
      r.mesh.scale.setScalar(1 + p * 3.2);
      r.mesh.material.opacity = 0.7 * (1 - p);
      if (p >= 1) {
        scene.remove(r.mesh);
        r.mesh.material.dispose();
        this.ripples.splice(i, 1);
      }
    }

    if (this.blast) {
      const b = this.blast;
      b.t += dt / b.dur;
      if (b.t >= 1) {
        this.hexKey = b.destKey;
        this.blast = null;
        this._syncToHex();
        this.mesh.scale.set(1, 1, 1);
        this.spawnRipple(scene, this.mesh.position);
        if (this.onEnterHex) this.onEnterHex(this.world.hexes.get(this.hexKey));
      } else {
        const u = b.t * b.t * (3 - 2 * b.t); // ease through the flight
        if (b.arc) {
          // follow the line of orbit around the sun
          const ang = b.arc.a0 + b.arc.da * u;
          const rad = b.arc.r0 + (b.arc.r1 - b.arc.r0) * u;
          this.mesh.position.set(
            Math.cos(ang) * rad,
            b.from.y + (b.to.y - b.from.y) * u,
            Math.sin(ang) * rad
          );
        } else {
          this.mesh.position.lerpVectors(b.from, b.to, u);
        }
        this.mesh.position.y += Math.sin(b.t * Math.PI) * b.height;
        this.mesh.rotation.y += dt * 7; // tumbling with style
        const s = Math.sin(b.t * Math.PI);
        this.mesh.scale.set(1 - 0.2 * s, 1 + 0.5 * s, 1 - 0.2 * s);
      }
      return;
    }

    if (!this.path.length) {
      this.mesh.position.y = this._hexPos(this.hexKey).y + Math.sin(time * 1.7) * 0.1;
      // relax any squash back to rest
      this.mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 1 - Math.exp(-dt * 10));
      return;
    }

    this.stepT += (dt / STEP_TIME) * this.speedMul;
    const from = this._hexPos(this.hexKey);
    const to = this._hexPos(this.path[0]);
    if (this.stepT >= 1) {
      this.hexKey = this.path.shift();
      this.stepT = 0;
      this.mesh.position.copy(to);
      const h = this.world.hexes.get(this.hexKey);
      if (h.kind === 'water') this.spawnRipple(scene, to);
      if (this.onEnterHex) this.onEnterHex(h);
    } else {
      const t = this.stepT;
      this.mesh.position.lerpVectors(from, to, t);
      this.mesh.position.y += Math.sin(t * Math.PI) * 0.9; // hop
      this.mesh.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
      // squash & stretch through the hop
      const s = Math.sin(t * Math.PI);
      this.mesh.scale.set(1 - 0.12 * s, 1 + 0.28 * s, 1 - 0.12 * s);
    }
  }
}
