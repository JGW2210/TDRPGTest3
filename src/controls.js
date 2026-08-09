// Camera controls: hold LEFT-drag to glide across the sea, hold RIGHT-drag to
// rotate, scroll to soar. A clean left click (no drag) is a sail command.

import * as THREE from 'three';

export class AstralControls {
  constructor(dom, camera) {
    this.dom = dom;
    this.camera = camera;
    this.target = new THREE.Vector3();
    this.yaw = 0.85;
    this.pitch = 0.95;
    this.dist = 130;
    this.minDist = 16;
    this.maxDist = 3600;
    this.onClick = null; // (clientX, clientY) for clean left clicks
    this._btn = -1;
    this._lastX = 0;
    this._lastY = 0;
    this._moved = 0;
    this._focusTo = null;
    this.lastPanTime = -10; // seconds, performance.now() based

    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('pointerdown', (e) => {
      this._btn = e.button;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      this._moved = 0;
      dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener('pointerup', (e) => {
      if (this._btn === 0 && this._moved < 6 && this.onClick) {
        this.onClick(e.clientX, e.clientY);
      }
      this._btn = -1;
    });
    dom.addEventListener('pointermove', (e) => {
      if (this._btn === -1) return;
      const dx = e.clientX - this._lastX;
      const dy = e.clientY - this._lastY;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      this._moved += Math.abs(dx) + Math.abs(dy);
      if (this._btn === 0) this._pan(dx, dy);
      else if (this._btn === 2) this._rotate(dx, dy);
    });
    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.dist = THREE.MathUtils.clamp(
        this.dist * Math.exp(e.deltaY * 0.0012),
        this.minDist, this.maxDist
      );
    }, { passive: false });
  }

  _pan(dx, dy) {
    this._focusTo = null;
    this.lastPanTime = performance.now() / 1000;
    const k = this.dist * 0.0013;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const rx = -fz, rz = fx;
    this.target.x += rx * -dx * k + fx * dy * k;
    this.target.z += rz * -dx * k + fz * dy * k;
  }

  _rotate(dx, dy) {
    this.yaw -= dx * 0.005;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.005, 0.12, 1.5);
  }

  focus(pos) {
    this._focusTo = pos.clone();
  }

  update(dt) {
    if (this._focusTo) {
      this.target.lerp(this._focusTo, 1 - Math.exp(-dt * 4));
      if (this.target.distanceTo(this._focusTo) < 0.5) this._focusTo = null;
    }
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    this.camera.position.set(
      this.target.x + this.dist * cp * Math.sin(this.yaw),
      this.target.y + this.dist * sp,
      this.target.z + this.dist * cp * Math.cos(this.yaw)
    );
    this.camera.lookAt(this.target);
  }
}
