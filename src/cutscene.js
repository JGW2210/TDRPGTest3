// The discovery cutscene: on first landfall in a new region the camera
// leaves the wisp, glides to the region's celestial body, and the
// cartographer's whisper delivers its arrival lines — advanced by click —
// while the region assembles out of the fog below. A final click sends the
// camera home to the wisp.

import * as THREE from 'three';
import { ui } from './ui.js';

export class Cutscene {
  constructor(controls) {
    this.controls = controls;
    this.active = false;
    this.phase = 'idle'; // 'dialogue' | 'return'
  }

  startDiscovery({ title, sub, lines, focus, dist, homeOf }) {
    this.active = true;
    this.phase = 'dialogue';
    this.lines = lines?.length ? lines : ['The currents have carried you somewhere new.'];
    this.idx = 0;
    this.focus = focus;
    this.targetDist = dist;
    this.homeOf = homeOf; // () => Vector3 to return to
    this.returnT = 0;
    this.homePitch = this.controls.pitch; // restored on the glide home
    ui.announce(title, sub, 6200);
    ui.dialogue(this.lines[0]);
  }

  // A click during the cutscene advances the dialogue. Returns true when the
  // click was consumed.
  advance() {
    if (!this.active) return false;
    if (this.phase !== 'dialogue') return true; // clicks during the glide home are swallowed
    this.idx++;
    if (this.idx < this.lines.length) {
      ui.dialogue(this.lines[this.idx]);
    } else {
      ui.hideDialogue();
      this.phase = 'return';
      this.returnHome = this.homeOf?.() ?? null;
    }
    return true;
  }

  update(dt) {
    if (!this.active) return;
    const c = this.controls;
    c._focusTo = null; // the cutscene owns the camera
    if (this.phase === 'dialogue') {
      const k = 1 - Math.exp(-dt * 2.2);
      c.target.lerp(this.focus, k);
      c.dist += (this.targetDist - c.dist) * k;
      c.pitch += (0.5 - c.pitch) * k; // level out: the body against the stars
      c.yaw += dt * 0.04; // slow cinematic drift around the body
    } else if (this.phase === 'return') {
      this.returnT += dt;
      const k = 1 - Math.exp(-dt * 3);
      if (this.returnHome) {
        c.target.lerp(this.returnHome, k);
        c.dist += (130 - c.dist) * k;
      }
      c.pitch += (this.homePitch - c.pitch) * k;
      if (this.returnT > 1.4) {
        this.active = false;
        this.phase = 'idle';
      }
    }
  }
}
