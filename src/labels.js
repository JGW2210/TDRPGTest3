// Floating in-world text sprites with Twin-Tongue deciphering: labels render as
// Elder Futhark until discovered, then resolve letter-by-letter into readable text.

import * as THREE from 'three';
import { toRunes } from './config.js';

const activeDecodes = [];

function drawLabel(ctx, w, h, title, sub, color, subColor) {
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.font = "500 46px Cinzel, serif";
  ctx.fillText(title, w / 2, h * 0.36);
  if (sub) {
    ctx.shadowBlur = 10;
    ctx.fillStyle = subColor;
    ctx.font = "italic 30px 'Cormorant Garamond', serif";
    ctx.fillText(sub, w / 2, h * 0.74);
  }
}

// screenSpace: true renders the label at a CONSTANT SCREEN SIZE regardless
// of camera distance (sizeAttenuation off) — scale is then a fraction of the
// viewport height rather than world units. Used by the star chart, whose
// labels must stay readable from the full orrery zoom.
export function makeLabel({ title, sub = '', color = '#ffe3b0', subColor = '#9fd8ff', scale = 40, startHidden = false, screenSpace = false }) {
  const w = 640, h = 160;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;

  const runic = toRunes(title.replace(/[^a-zA-Z ]/g, ''));
  let discovered = !startHidden;
  drawLabel(ctx, w, h, discovered ? title : runic, discovered ? sub : '', color, subColor);
  tex.needsUpdate = true;

  // depthTest off + high renderOrder: name text always reads above the tiles
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
    sizeAttenuation: !screenSpace,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 30;
  sprite.scale.set(scale, scale * (h / w), 1);
  sprite.userData.baseScale = scale;

  // Twin-Tongue resolve: progressively swap runes for letters over ~1.4s.
  function decipher() {
    if (discovered) return;
    discovered = true;
    activeDecodes.push({
      t: 0, dur: 1.4,
      step(progress) {
        const chars = title.split('');
        const mixed = chars
          .map((c2, i) => (i / chars.length < progress ? c2 : toRunes(c2)))
          .join('');
        drawLabel(ctx, w, h, mixed, progress > 0.85 ? sub : '', color, subColor);
        tex.needsUpdate = true;
      },
    });
  }

  return { sprite, decipher, isDiscovered: () => discovered };
}

export function updateLabels(dt) {
  for (let i = activeDecodes.length - 1; i >= 0; i--) {
    const d = activeDecodes[i];
    d.t += dt;
    const p = Math.min(1, d.t / d.dur);
    d.step(p);
    if (p >= 1) activeDecodes.splice(i, 1);
  }
}
