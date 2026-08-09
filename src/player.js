// The Star-Pilgrim wisp: click-to-sail, step-by-step hex movement with a
// squashy hop, ripple rings on the water, an orbiting rune halo — and the
// gate blast, a soaring arc between a gate's two node islets.

import * as THREE from 'three';
import { HEX } from './config.js';
import * as Hx from './hexmath.js';
import { findPath } from './pathfind.js';
import { makeGlowSpriteTexture } from './materials.js';

const STEP_TIME = 0.22;

export class Player {
  constructor(world) {
    this.world = world;
    this.hexKey = world.startKey;
    this.path = [];
    this.stepT = 0;
    this.blast = null;
    this.onEnterHex = null; // cb(hexRecord)

    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(0.85, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x4a4f7a, flatShading: true, emissive: 0x2a2f5c, emissiveIntensity: 0.6 })
    );
    body.position.y = 1.2;
    group.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe9c4 })
    );
    head.position.y = 2.9;
    group.add(head);

    this.halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.07, 6, 24),
      new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.85 })
    );
    this.halo.rotation.x = Math.PI / 2;
    this.halo.position.y = 1.8;
    group.add(this.halo);

    this.light = new THREE.PointLight(0xffd9a8, 60, 40, 1.8);
    this.light.position.y = 3.2;
    group.add(this.light);

    // soft aura so the wisp reads even from the orrery zoom
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowSpriteTexture(), color: 0xffe9c4, transparent: true,
      opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    aura.scale.setScalar(7);
    aura.position.y = 2.6;
    group.add(aura);

    this.mesh = group;
    this.ripples = [];
    this._rippleGeo = new THREE.RingGeometry(0.5, 0.72, 24);
    this._syncToHex();
  }

  _hexY(h) {
    return h.kind === 'isle' ? h.elev + 0.15 : 0.35;
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

  // Gate blast: hurled across the void in a soaring arc between node islets.
  startBlast(destKey) {
    const from = this._hexPos(this.hexKey);
    const to = this._hexPos(destKey);
    const dist = from.distanceTo(to);
    this.blast = {
      from, to, destKey, t: 0,
      dur: THREE.MathUtils.clamp(0.7 + dist / 260, 0.9, 2.4),
      height: THREE.MathUtils.clamp(dist * 0.22, 16, 90),
    };
    this.path = [];
    this.stepT = 0;
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
    this.halo.rotation.z += dt * 1.4;
    this.halo.position.y = 1.8 + Math.sin(time * 2.1) * 0.12;
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
        const u = b.t * b.t * (3 - 2 * b.t); // ease through the arc
        this.mesh.position.lerpVectors(b.from, b.to, u);
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

    this.stepT += dt / STEP_TIME;
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
