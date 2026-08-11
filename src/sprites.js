// Paper-cutout sprite atelier (Round 11). Everything that walks, fights, or
// waits to be picked up is a 2D papercraft cutout drawn on canvas: flat
// fills, hand-cut jittered edges, an ink outline, and glowing eyes. The
// player is a hooded magician; enemies are biome-styled beasts; the four
// wardens are grand armored cutouts; every item in the pool gets a small
// card sprite built from its tier + kind recipe.

import * as THREE from 'three';
import { Rng } from './rng.js';

const INK = '#1f1a36';

const css = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');

function shade(hexInt, mul) {
  const r = Math.min(255, (((hexInt >> 16) & 255) * mul) | 0);
  const g = Math.min(255, (((hexInt >> 8) & 255) * mul) | 0);
  const b = Math.min(255, ((hexInt & 255) * mul) | 0);
  return `rgb(${r},${g},${b})`;
}

// A hand-cut paper blob: an irregular polygon around (cx, cy). The jitter is
// seeded so every sprite keeps its silhouette between redraws.
function paperBlob(ctx, rng, cx, cy, rx, ry, { points = 11, jitter = 0.16, rot = 0 } = {}) {
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const a = rot + (i / points) * Math.PI * 2;
    const j = 1 + (rng.float() - 0.5) * 2 * jitter;
    const x = cx + Math.cos(a) * rx * j;
    const y = cy + Math.sin(a) * ry * j;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function glowEye(ctx, x, y, r, color) {
  const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
  halo.addColorStop(0, color);
  halo.addColorStop(0.35, color + 'aa');
  halo.addColorStop(1, color + '00');
  ctx.fillStyle = halo;
  ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

function inked(ctx, fill, lw = 4) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

// ---------------------------------------------------------------- the magician
// The Star-Pilgrim remade: a hooded magician cut from midnight paper —
// glowing eyes deep in the cowl, a staff crowned with a caught star.
export function drawMagician(ctx, S, { robe = 0x4a4f7a, robe2 = 0x2a2f5c, eye = '#9fd8ff', star = '#ffe9c4' } = {}) {
  const rng = new Rng('magician');
  const cx = S * 0.46, base = S * 0.94;
  ctx.clearRect(0, 0, S, S);
  ctx.lineJoin = 'round';

  // staff first — it leans behind the figure
  ctx.save();
  ctx.translate(S * 0.72, S * 0.52);
  ctx.rotate(0.22);
  ctx.fillStyle = shade(robe2, 0.75);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(-S * 0.02, -S * 0.42, S * 0.045, S * 0.86, S * 0.02);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // robe: a tall cutout that flares to a torn hem
  ctx.beginPath();
  ctx.moveTo(cx, S * 0.16);
  ctx.bezierCurveTo(cx - S * 0.19, S * 0.24, cx - S * 0.24, S * 0.52, cx - S * 0.3, base);
  // torn hem
  for (let i = 0; i <= 6; i++) {
    const x = cx - S * 0.3 + (i / 6) * S * 0.6;
    ctx.lineTo(x, base - (i % 2 ? S * 0.035 : 0) - rng.float() * S * 0.02);
  }
  ctx.bezierCurveTo(cx + S * 0.24, S * 0.52, cx + S * 0.19, S * 0.24, cx, S * 0.16);
  ctx.closePath();
  inked(ctx, css(robe), 4.5);

  // sash + inner fold
  ctx.beginPath();
  ctx.moveTo(cx - S * 0.13, S * 0.5);
  ctx.quadraticCurveTo(cx, S * 0.56, cx + S * 0.13, S * 0.5);
  ctx.lineTo(cx + S * 0.1, S * 0.58);
  ctx.quadraticCurveTo(cx, S * 0.63, cx - S * 0.1, S * 0.58);
  ctx.closePath();
  inked(ctx, css(robe2), 3);

  // sleeve reaching for the staff
  ctx.beginPath();
  ctx.moveTo(cx + S * 0.05, S * 0.34);
  ctx.quadraticCurveTo(cx + S * 0.24, S * 0.36, S * 0.72, S * 0.42);
  ctx.quadraticCurveTo(cx + S * 0.22, S * 0.48, cx + S * 0.07, S * 0.46);
  ctx.closePath();
  inked(ctx, css(robe), 4);

  // hood: a deep cowl, the face a well of dark
  ctx.beginPath();
  ctx.moveTo(cx, S * 0.05);
  ctx.bezierCurveTo(cx - S * 0.17, S * 0.07, cx - S * 0.2, S * 0.24, cx - S * 0.12, S * 0.32);
  ctx.quadraticCurveTo(cx, S * 0.37, cx + S * 0.12, S * 0.32);
  ctx.bezierCurveTo(cx + S * 0.2, S * 0.24, cx + S * 0.17, S * 0.07, cx, S * 0.05);
  ctx.closePath();
  inked(ctx, css(robe), 4.5);
  ctx.beginPath();
  ctx.ellipse(cx, S * 0.24, S * 0.095, S * 0.105, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#12101f';
  ctx.fill();

  // the glowing eyes
  glowEye(ctx, cx - S * 0.038, S * 0.235, S * 0.021, eye);
  glowEye(ctx, cx + S * 0.038, S * 0.235, S * 0.021, eye);

  // the staff's caught star
  const sx = S * 0.72 + Math.sin(0.22) * S * 0.42, sy = S * 0.52 - Math.cos(0.22) * S * 0.42;
  const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, S * 0.12);
  halo.addColorStop(0, star);
  halo.addColorStop(0.4, star + '88');
  halo.addColorStop(1, star + '00');
  ctx.fillStyle = halo;
  ctx.fillRect(sx - S * 0.12, sy - S * 0.12, S * 0.24, S * 0.24);
  ctx.fillStyle = '#fff9ec';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? S * 0.055 : S * 0.022;
    const x = sx + Math.cos(a) * r, y = sy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// ---------------------------------------------------------------- the trader
// The Curio Peddler in person (Round 12): a broad paper cutout — a heavy
// pack looming behind, a patched travelling robe, warm lantern eyes deep in
// the hood, and a crook-hung lantern held out over the wares.
export function drawTrader(ctx, S) {
  const rng = new Rng('trader');
  const cx = S * 0.44, base = S * 0.94;
  ctx.clearRect(0, 0, S, S);
  ctx.lineJoin = 'round';

  // the pack: a lumpy bundle towering behind one shoulder
  paperBlob(ctx, rng, cx + S * 0.17, S * 0.38, S * 0.17, S * 0.22, { points: 10, jitter: 0.2 });
  inked(ctx, css(0x6a4a32), 4);
  // strapped bundles atop the pack
  paperBlob(ctx, rng, cx + S * 0.2, S * 0.17, S * 0.1, S * 0.06, { points: 8, jitter: 0.25 });
  inked(ctx, css(0x8a5aa0), 3);
  paperBlob(ctx, rng, cx + S * 0.1, S * 0.12, S * 0.07, S * 0.05, { points: 8, jitter: 0.25 });
  inked(ctx, css(0xb8506a), 3);

  // robe: a squat bell with a torn hem — a walker, not a wisp
  ctx.beginPath();
  ctx.moveTo(cx, S * 0.2);
  ctx.bezierCurveTo(cx - S * 0.2, S * 0.28, cx - S * 0.26, S * 0.6, cx - S * 0.3, base);
  for (let i = 0; i <= 6; i++) {
    const x = cx - S * 0.3 + (i / 6) * S * 0.56;
    ctx.lineTo(x, base - (i % 2 ? S * 0.03 : 0) - rng.float() * S * 0.018);
  }
  ctx.bezierCurveTo(cx + S * 0.24, S * 0.6, cx + S * 0.2, S * 0.28, cx, S * 0.2);
  ctx.closePath();
  inked(ctx, css(0x8c6e4a), 4.5);

  // patches stitched on the robe
  for (const [px, py, pw, phh, col] of [
    [cx - S * 0.14, S * 0.55, S * 0.1, S * 0.09, 0xb8506a],
    [cx + S * 0.05, S * 0.68, S * 0.09, S * 0.08, 0x5c6e9e],
    [cx - S * 0.04, S * 0.8, S * 0.08, S * 0.07, 0xe8e4d2],
  ]) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((rng.float() - 0.5) * 0.4);
    ctx.beginPath();
    ctx.rect(0, 0, pw, phh);
    ctx.fillStyle = css(col);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // sash with hanging trinkets
  ctx.beginPath();
  ctx.moveTo(cx - S * 0.18, S * 0.52);
  ctx.quadraticCurveTo(cx, S * 0.58, cx + S * 0.18, S * 0.52);
  ctx.lineTo(cx + S * 0.15, S * 0.6);
  ctx.quadraticCurveTo(cx, S * 0.65, cx - S * 0.15, S * 0.6);
  ctx.closePath();
  inked(ctx, css(0x59431f), 3);
  for (const tx of [-0.08, 0, 0.09]) {
    ctx.beginPath();
    ctx.arc(cx + tx * S, S * 0.66, S * 0.016, 0, Math.PI * 2);
    inked(ctx, tx === 0 ? '#ffd9a8' : '#9fd8ff', 2);
  }

  // the crook arm holding a lantern out over the counter
  ctx.beginPath();
  ctx.moveTo(cx - S * 0.06, S * 0.36);
  ctx.quadraticCurveTo(cx - S * 0.26, S * 0.36, cx - S * 0.34, S * 0.44);
  ctx.quadraticCurveTo(cx - S * 0.24, S * 0.48, cx - S * 0.08, S * 0.46);
  ctx.closePath();
  inked(ctx, css(0x8c6e4a), 4);
  // the staff-crook
  ctx.save();
  ctx.translate(S * 0.12, S * 0.5);
  ctx.rotate(-0.08);
  ctx.fillStyle = shade(0x59431f, 0.9);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-S * 0.016, -S * 0.34, S * 0.032, S * 0.76, S * 0.016);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // lantern swinging from the crook
  const lx = S * 0.115, ly = S * 0.24;
  ctx.beginPath();
  ctx.moveTo(lx, ly - S * 0.055);
  ctx.lineTo(lx, ly - S * 0.03);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(lx - S * 0.032, ly - S * 0.03, S * 0.064, S * 0.08, S * 0.012);
  inked(ctx, css(0x2c2740), 3);
  const lg = ctx.createRadialGradient(lx, ly + S * 0.01, 0, lx, ly + S * 0.01, S * 0.07);
  lg.addColorStop(0, '#ffd9a8');
  lg.addColorStop(0.5, '#ffd9a866');
  lg.addColorStop(1, '#ffd9a800');
  ctx.fillStyle = lg;
  ctx.fillRect(lx - S * 0.07, ly - S * 0.06, S * 0.14, S * 0.14);
  ctx.fillStyle = '#ffedd0';
  ctx.beginPath();
  ctx.arc(lx, ly + S * 0.01, S * 0.017, 0, Math.PI * 2);
  ctx.fill();

  // hood: deep, wide-brimmed, the face a warm-lit well
  ctx.beginPath();
  ctx.moveTo(cx, S * 0.08);
  ctx.bezierCurveTo(cx - S * 0.2, S * 0.1, cx - S * 0.23, S * 0.28, cx - S * 0.13, S * 0.36);
  ctx.quadraticCurveTo(cx, S * 0.41, cx + S * 0.13, S * 0.36);
  ctx.bezierCurveTo(cx + S * 0.23, S * 0.28, cx + S * 0.2, S * 0.1, cx, S * 0.08);
  ctx.closePath();
  inked(ctx, css(0x59431f), 4.5);
  ctx.beginPath();
  ctx.ellipse(cx, S * 0.27, S * 0.1, S * 0.11, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1410';
  ctx.fill();

  // lantern eyes, warm amber
  glowEye(ctx, cx - S * 0.04, S * 0.265, S * 0.02, '#ffd9a8');
  glowEye(ctx, cx + S * 0.04, S * 0.265, S * 0.02, '#ffd9a8');
}

export function traderCanvas(S = 192) {
  const key = 'trader:' + S;
  if (!canvasCache.has(key)) {
    const c = makeCanvas(S);
    drawTrader(c.getContext('2d'), S);
    canvasCache.set(key, c);
  }
  return canvasCache.get(key);
}

// ---------------------------------------------------------------- creatures
// One painter per silhouette family; enemies map onto them with a palette
// and a few tweaks. All draw into a square canvas, feet at the bottom.
const PAINTERS = {
  imp(ctx, S, rng, p) {
    paperBlob(ctx, rng, S * 0.5, S * 0.58, S * 0.26, S * 0.3, { points: 10 });
    inked(ctx, p.base);
    for (const s of [-1, 1]) { // horns
      ctx.beginPath();
      ctx.moveTo(S * 0.5 + s * S * 0.12, S * 0.34);
      ctx.quadraticCurveTo(S * 0.5 + s * S * 0.26, S * 0.2, S * 0.5 + s * S * 0.17, S * 0.08);
      ctx.quadraticCurveTo(S * 0.5 + s * S * 0.13, S * 0.22, S * 0.5 + s * S * 0.04, S * 0.32);
      ctx.closePath();
      inked(ctx, p.dark, 3);
    }
    for (const s of [-1, 1]) { // stubby arms
      ctx.beginPath();
      ctx.ellipse(S * 0.5 + s * S * 0.28, S * 0.62, S * 0.07, S * 0.13, s * 0.5, 0, Math.PI * 2);
      inked(ctx, p.dark, 3);
    }
    glowEye(ctx, S * 0.42, S * 0.5, S * 0.035, p.eye);
    glowEye(ctx, S * 0.58, S * 0.5, S * 0.035, p.eye);
    // jagged grin
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const x = S * 0.4 + (i / 6) * S * 0.2;
      const y = S * 0.66 + (i % 2 ? S * 0.02 : -S * 0.01);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  },

  moth(ctx, S, rng, p) {
    for (const s of [-1, 1]) { // big paper wings
      ctx.beginPath();
      ctx.moveTo(S * 0.5, S * 0.5);
      ctx.bezierCurveTo(S * 0.5 + s * S * 0.42, S * 0.12, S * 0.5 + s * S * 0.48, S * 0.5, S * 0.5 + s * S * 0.1, S * 0.56);
      ctx.bezierCurveTo(S * 0.5 + s * S * 0.36, S * 0.62, S * 0.5 + s * S * 0.3, S * 0.82, S * 0.5, S * 0.62);
      ctx.closePath();
      inked(ctx, p.base, 3.5);
      ctx.beginPath();
      ctx.ellipse(S * 0.5 + s * S * 0.22, S * 0.38, S * 0.06, S * 0.09, s * 0.6, 0, Math.PI * 2);
      inked(ctx, p.dark, 2.5);
    }
    paperBlob(ctx, rng, S * 0.5, S * 0.52, S * 0.09, S * 0.2, { points: 8 });
    inked(ctx, p.dark, 3);
    glowEye(ctx, S * 0.46, S * 0.4, S * 0.028, p.eye);
    glowEye(ctx, S * 0.54, S * 0.4, S * 0.028, p.eye);
  },

  puff(ctx, S, rng, p) {
    paperBlob(ctx, rng, S * 0.5, S * 0.55, S * 0.32, S * 0.28, { points: 14, jitter: 0.22 });
    inked(ctx, p.base);
    for (let i = 0; i < 5; i++) { // spore freckles
      const a = rng.float() * Math.PI * 2, r = rng.float() * S * 0.18;
      ctx.beginPath();
      ctx.arc(S * 0.5 + Math.cos(a) * r, S * 0.55 + Math.sin(a) * r * 0.8, S * 0.03 + rng.float() * S * 0.02, 0, Math.PI * 2);
      ctx.fillStyle = p.dark;
      ctx.fill();
    }
    paperBlob(ctx, rng, S * 0.5, S * 0.3, S * 0.14, S * 0.1, { points: 9 }); // cap
    inked(ctx, p.dark, 3);
    glowEye(ctx, S * 0.43, S * 0.52, S * 0.032, p.eye);
    glowEye(ctx, S * 0.57, S * 0.52, S * 0.032, p.eye);
  },

  hound(ctx, S, rng, p) {
    paperBlob(ctx, rng, S * 0.46, S * 0.6, S * 0.3, S * 0.18, { points: 10, rot: 0.2 });
    inked(ctx, p.base);
    // legs
    for (const x of [0.28, 0.4, 0.56, 0.68]) {
      ctx.beginPath();
      ctx.roundRect(S * x - S * 0.025, S * 0.68, S * 0.05, S * 0.22, S * 0.02);
      inked(ctx, p.dark, 2.5);
    }
    // head + snout
    paperBlob(ctx, rng, S * 0.74, S * 0.42, S * 0.13, S * 0.11, { points: 9 });
    inked(ctx, p.base, 3.5);
    ctx.beginPath();
    ctx.moveTo(S * 0.82, S * 0.42);
    ctx.lineTo(S * 0.96, S * 0.47);
    ctx.lineTo(S * 0.82, S * 0.52);
    ctx.closePath();
    inked(ctx, p.dark, 2.5);
    // ears
    ctx.beginPath();
    ctx.moveTo(S * 0.68, S * 0.34);
    ctx.lineTo(S * 0.64, S * 0.18);
    ctx.lineTo(S * 0.75, S * 0.31);
    ctx.closePath();
    inked(ctx, p.dark, 2.5);
    glowEye(ctx, S * 0.74, S * 0.41, S * 0.03, p.eye);
  },

  crab(ctx, S, rng, p) {
    paperBlob(ctx, rng, S * 0.5, S * 0.6, S * 0.3, S * 0.2, { points: 11 });
    inked(ctx, p.base);
    for (const s of [-1, 1]) { // claws
      ctx.beginPath();
      ctx.moveTo(S * 0.5 + s * S * 0.26, S * 0.55);
      ctx.quadraticCurveTo(S * 0.5 + s * S * 0.46, S * 0.42, S * 0.5 + s * S * 0.4, S * 0.26);
      ctx.quadraticCurveTo(S * 0.5 + s * S * 0.48, S * 0.4, S * 0.5 + s * S * 0.34, S * 0.44);
      ctx.closePath();
      inked(ctx, p.dark, 3);
      for (let l = 0; l < 3; l++) { // legs
        ctx.beginPath();
        ctx.moveTo(S * 0.5 + s * S * 0.2, S * 0.68 + l * S * 0.04);
        ctx.lineTo(S * 0.5 + s * (S * 0.42 + l * S * 0.02), S * 0.78 + l * S * 0.06);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3.5;
        ctx.stroke();
      }
    }
    glowEye(ctx, S * 0.42, S * 0.52, S * 0.034, p.eye);
    glowEye(ctx, S * 0.58, S * 0.52, S * 0.034, p.eye);
  },

  gear(ctx, S, rng, p) {
    // a toothed wheel with a peering core
    const teeth = 9;
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * Math.PI * 2;
      const r = (i % 2 === 0 ? S * 0.34 : S * 0.26);
      const x = S * 0.5 + Math.cos(a) * r, y = S * 0.52 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    inked(ctx, p.base);
    ctx.beginPath();
    ctx.arc(S * 0.5, S * 0.52, S * 0.16, 0, Math.PI * 2);
    inked(ctx, p.dark, 3);
    glowEye(ctx, S * 0.5, S * 0.52, S * 0.05, p.eye);
    for (let l = 0; l < 3; l++) { // scuttle legs
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(S * 0.5 + s * S * 0.2, S * 0.72);
        ctx.lineTo(S * 0.5 + s * (S * 0.28 + l * S * 0.06), S * 0.92);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  },

  serpent(ctx, S, rng, p) {
    ctx.beginPath();
    ctx.moveTo(S * 0.18, S * 0.88);
    ctx.bezierCurveTo(S * 0.02, S * 0.66, S * 0.5, S * 0.62, S * 0.42, S * 0.44);
    ctx.bezierCurveTo(S * 0.36, S * 0.28, S * 0.6, S * 0.16, S * 0.66, S * 0.3);
    ctx.lineTo(S * 0.56, S * 0.34);
    ctx.bezierCurveTo(S * 0.54, S * 0.3, S * 0.46, S * 0.34, S * 0.52, S * 0.44);
    ctx.bezierCurveTo(S * 0.62, S * 0.64, S * 0.2, S * 0.66, S * 0.3, S * 0.82);
    ctx.closePath();
    inked(ctx, p.base);
    paperBlob(ctx, rng, S * 0.64, S * 0.26, S * 0.13, S * 0.1, { points: 9, rot: 0.5 });
    inked(ctx, p.dark, 3);
    glowEye(ctx, S * 0.68, S * 0.24, S * 0.03, p.eye);
    // forked tongue
    ctx.strokeStyle = p.eye;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(S * 0.76, S * 0.28);
    ctx.lineTo(S * 0.86, S * 0.3);
    ctx.moveTo(S * 0.86, S * 0.3);
    ctx.lineTo(S * 0.9, S * 0.26);
    ctx.moveTo(S * 0.86, S * 0.3);
    ctx.lineTo(S * 0.9, S * 0.34);
    ctx.stroke();
  },

  wisp(ctx, S, rng, p) {
    // a teardrop spirit with trailing paper ribbons
    ctx.beginPath();
    ctx.moveTo(S * 0.5, S * 0.14);
    ctx.bezierCurveTo(S * 0.78, S * 0.34, S * 0.72, S * 0.66, S * 0.5, S * 0.72);
    ctx.bezierCurveTo(S * 0.28, S * 0.66, S * 0.22, S * 0.34, S * 0.5, S * 0.14);
    ctx.closePath();
    inked(ctx, p.base);
    for (let i = 0; i < 3; i++) {
      const x0 = S * (0.36 + i * 0.14);
      ctx.beginPath();
      ctx.moveTo(x0, S * 0.7);
      ctx.quadraticCurveTo(x0 + S * 0.05, S * 0.82, x0 - S * 0.03, S * (0.9 + rng.float() * 0.06));
      ctx.quadraticCurveTo(x0 + S * 0.08, S * 0.8, x0 + S * 0.06, S * 0.7);
      ctx.closePath();
      inked(ctx, p.dark, 2.5);
    }
    glowEye(ctx, S * 0.43, S * 0.42, S * 0.035, p.eye);
    glowEye(ctx, S * 0.57, S * 0.42, S * 0.035, p.eye);
  },

  thorn(ctx, S, rng, p) {
    paperBlob(ctx, rng, S * 0.5, S * 0.58, S * 0.26, S * 0.24, { points: 10 });
    inked(ctx, p.base);
    for (let i = 0; i < 8; i++) { // bramble spikes
      const a = (i / 8) * Math.PI * 2 + 0.3;
      const bx = S * 0.5 + Math.cos(a) * S * 0.24, by = S * 0.58 + Math.sin(a) * S * 0.22;
      ctx.beginPath();
      ctx.moveTo(bx - Math.sin(a) * S * 0.04, by + Math.cos(a) * S * 0.04);
      ctx.lineTo(bx + Math.cos(a) * S * 0.16, by + Math.sin(a) * S * 0.16);
      ctx.lineTo(bx + Math.sin(a) * S * 0.04, by - Math.cos(a) * S * 0.04);
      ctx.closePath();
      inked(ctx, p.dark, 2.5);
    }
    glowEye(ctx, S * 0.43, S * 0.54, S * 0.032, p.eye);
    glowEye(ctx, S * 0.57, S * 0.54, S * 0.032, p.eye);
  },

  wraith(ctx, S, rng, p) {
    // a hooded tatter, cousin to the magician gone wrong
    ctx.beginPath();
    ctx.moveTo(S * 0.5, S * 0.1);
    ctx.bezierCurveTo(S * 0.24, S * 0.2, S * 0.28, S * 0.6, S * 0.2, S * 0.9);
    for (let i = 0; i <= 5; i++) { // torn hem
      ctx.lineTo(S * (0.2 + i * 0.12), S * (0.9 - (i % 2 ? 0.1 : 0.02)));
    }
    ctx.bezierCurveTo(S * 0.72, S * 0.6, S * 0.76, S * 0.2, S * 0.5, S * 0.1);
    ctx.closePath();
    inked(ctx, p.base);
    ctx.beginPath();
    ctx.ellipse(S * 0.5, S * 0.3, S * 0.11, S * 0.12, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0d0a16';
    ctx.fill();
    glowEye(ctx, S * 0.455, S * 0.3, S * 0.026, p.eye);
    glowEye(ctx, S * 0.545, S * 0.3, S * 0.026, p.eye);
  },

  harpy(ctx, S, rng, p) {
    for (const s of [-1, 1]) { // storm wings, raised
      ctx.beginPath();
      ctx.moveTo(S * 0.5, S * 0.48);
      ctx.bezierCurveTo(S * 0.5 + s * S * 0.3, S * 0.36, S * 0.5 + s * S * 0.46, S * 0.12, S * 0.5 + s * S * 0.48, S * 0.06);
      for (let f = 0; f < 4; f++) {
        ctx.lineTo(S * 0.5 + s * (S * 0.44 - f * S * 0.08), S * (0.2 + f * 0.09));
      }
      ctx.closePath();
      inked(ctx, p.base, 3.5);
    }
    paperBlob(ctx, rng, S * 0.5, S * 0.55, S * 0.14, S * 0.17, { points: 9 });
    inked(ctx, p.dark, 3.5);
    ctx.beginPath(); // beak
    ctx.moveTo(S * 0.5, S * 0.48);
    ctx.lineTo(S * 0.62, S * 0.52);
    ctx.lineTo(S * 0.5, S * 0.55);
    ctx.closePath();
    inked(ctx, p.eyeSolid ?? '#ffd27a', 2);
    glowEye(ctx, S * 0.46, S * 0.46, S * 0.03, p.eye);
    // talons
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(S * 0.5 + s * S * 0.06, S * 0.7);
      ctx.lineTo(S * 0.5 + s * S * 0.1, S * 0.86);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  },

  lantern(ctx, S, rng, p) {
    // a hanging lantern-ghost: glow held in a paper cage, tendrils below
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(S * 0.5, S * 0.06);
    ctx.lineTo(S * 0.5, S * 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(S * 0.32, S * 0.2, S * 0.36, S * 0.42, S * 0.08);
    inked(ctx, p.dark, 3.5);
    const halo = ctx.createRadialGradient(S * 0.5, S * 0.4, 0, S * 0.5, S * 0.4, S * 0.16);
    halo.addColorStop(0, '#fff6d8');
    halo.addColorStop(1, p.eye + '00');
    ctx.fillStyle = halo;
    ctx.fillRect(S * 0.34, S * 0.24, S * 0.32, S * 0.34);
    glowEye(ctx, S * 0.44, S * 0.38, S * 0.03, p.eye);
    glowEye(ctx, S * 0.56, S * 0.38, S * 0.03, p.eye);
    for (let i = 0; i < 4; i++) { // tendrils
      const x0 = S * (0.36 + i * 0.093);
      ctx.beginPath();
      ctx.moveTo(x0, S * 0.62);
      ctx.quadraticCurveTo(x0 + S * 0.04, S * 0.76, x0 - S * 0.02, S * (0.88 + rng.float() * 0.06));
      ctx.strokeStyle = css(0x000000 | 0);
      ctx.strokeStyle = p.baseRaw ? css(p.baseRaw) : p.base;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
  },

  skull(ctx, S, rng, p) {
    paperBlob(ctx, rng, S * 0.5, S * 0.42, S * 0.24, S * 0.22, { points: 12, jitter: 0.08 });
    inked(ctx, p.base);
    // jaw, slightly unhinged mid-hymn
    ctx.beginPath();
    ctx.roundRect(S * 0.38, S * 0.6, S * 0.24, S * 0.14, S * 0.04);
    inked(ctx, p.base, 3);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(S * (0.41 + i * 0.06), S * 0.6);
      ctx.lineTo(S * (0.41 + i * 0.06), S * 0.72);
      ctx.stroke();
    }
    // eye hollows singing with light
    ctx.fillStyle = '#0d0a16';
    ctx.beginPath();
    ctx.ellipse(S * 0.42, S * 0.4, S * 0.055, S * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(S * 0.58, S * 0.4, S * 0.055, S * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
    glowEye(ctx, S * 0.42, S * 0.4, S * 0.024, p.eye);
    glowEye(ctx, S * 0.58, S * 0.4, S * 0.024, p.eye);
  },

  jack(ctx, S, rng, p) {
    // a tall thin shadow with too-long arms
    ctx.beginPath();
    ctx.moveTo(S * 0.5, S * 0.08);
    ctx.bezierCurveTo(S * 0.38, S * 0.2, S * 0.42, S * 0.6, S * 0.4, S * 0.92);
    ctx.lineTo(S * 0.6, S * 0.92);
    ctx.bezierCurveTo(S * 0.58, S * 0.6, S * 0.62, S * 0.2, S * 0.5, S * 0.08);
    ctx.closePath();
    inked(ctx, p.base);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(S * 0.5 + s * S * 0.08, S * 0.32);
      ctx.quadraticCurveTo(S * 0.5 + s * S * 0.34, S * 0.4, S * 0.5 + s * S * 0.38, S * 0.78);
      ctx.quadraticCurveTo(S * 0.5 + s * S * 0.3, S * 0.44, S * 0.5 + s * S * 0.1, S * 0.4);
      ctx.closePath();
      inked(ctx, p.dark, 2.5);
    }
    glowEye(ctx, S * 0.46, S * 0.2, S * 0.027, p.eye);
    glowEye(ctx, S * 0.54, S * 0.2, S * 0.027, p.eye);
  },

  maw(ctx, S, rng, p) {
    // mostly a mouth that learned to swim
    paperBlob(ctx, rng, S * 0.5, S * 0.55, S * 0.32, S * 0.26, { points: 11 });
    inked(ctx, p.base);
    ctx.beginPath();
    ctx.ellipse(S * 0.5, S * 0.6, S * 0.22, S * 0.14, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#33110e';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#fff3e0';
    for (let i = 0; i < 7; i++) { // teeth
      const x = S * (0.32 + i * 0.06);
      ctx.beginPath();
      ctx.moveTo(x, S * 0.5);
      ctx.lineTo(x + S * 0.03, S * 0.58);
      ctx.lineTo(x + S * 0.06, S * 0.5);
      ctx.closePath();
      ctx.fill();
    }
    glowEye(ctx, S * 0.4, S * 0.4, S * 0.03, p.eye);
    glowEye(ctx, S * 0.6, S * 0.4, S * 0.03, p.eye);
  },

  eye(ctx, S, rng, p) {
    paperBlob(ctx, rng, S * 0.5, S * 0.5, S * 0.3, S * 0.26, { points: 12, jitter: 0.1 });
    inked(ctx, p.base);
    ctx.beginPath();
    ctx.ellipse(S * 0.5, S * 0.5, S * 0.2, S * 0.13, 0, 0, Math.PI * 2);
    inked(ctx, '#f4ecd8', 3);
    glowEye(ctx, S * 0.5, S * 0.5, S * 0.07, p.eye);
    for (let i = 0; i < 8; i++) { // watching cilia
      const a = (i / 8) * Math.PI * 2 + 0.2;
      ctx.beginPath();
      ctx.moveTo(S * 0.5 + Math.cos(a) * S * 0.29, S * 0.5 + Math.sin(a) * S * 0.25);
      ctx.lineTo(S * 0.5 + Math.cos(a) * S * 0.38, S * 0.5 + Math.sin(a) * S * 0.33);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  },

  mite(ctx, S, rng, p) {
    paperBlob(ctx, rng, S * 0.5, S * 0.5, S * 0.22, S * 0.2, { points: 9 });
    inked(ctx, p.base);
    for (let l = 0; l < 3; l++) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(S * 0.5 + s * S * 0.18, S * (0.44 + l * 0.08));
        ctx.lineTo(S * 0.5 + s * S * 0.4, S * (0.36 + l * 0.14));
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3.5;
        ctx.stroke();
      }
    }
    glowEye(ctx, S * 0.5, S * 0.46, S * 0.045, p.eye);
  },

  bell(ctx, S, rng, p) {
    // a hollow bell-shell with a void inside
    ctx.beginPath();
    ctx.moveTo(S * 0.5, S * 0.12);
    ctx.bezierCurveTo(S * 0.2, S * 0.18, S * 0.22, S * 0.62, S * 0.26, S * 0.78);
    ctx.lineTo(S * 0.74, S * 0.78);
    ctx.bezierCurveTo(S * 0.78, S * 0.62, S * 0.8, S * 0.18, S * 0.5, S * 0.12);
    ctx.closePath();
    inked(ctx, p.base);
    ctx.beginPath();
    ctx.ellipse(S * 0.5, S * 0.56, S * 0.16, S * 0.18, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0d0a16';
    ctx.fill();
    glowEye(ctx, S * 0.45, S * 0.52, S * 0.026, p.eye);
    glowEye(ctx, S * 0.55, S * 0.52, S * 0.026, p.eye);
  },
};

// ---------------------------------------------------------------- wardens
// The four boundary bosses: grand armored cutouts, half again the paper.
export function drawWarden(ctx, S, boundary, tint, tint2, eyeColor) {
  const rng = new Rng('warden:' + boundary);
  const cx = S * 0.5;
  ctx.clearRect(0, 0, S, S);
  const base = css(tint), dark = css(tint2);
  const eye = '#' + (eyeColor >>> 0).toString(16).padStart(6, '0');

  // cape
  ctx.beginPath();
  ctx.moveTo(cx, S * 0.18);
  ctx.bezierCurveTo(cx - S * 0.3, S * 0.3, cx - S * 0.34, S * 0.7, cx - S * 0.38, S * 0.95);
  for (let i = 0; i <= 6; i++) ctx.lineTo(cx - S * 0.38 + (i / 6) * S * 0.76, S * (0.95 - (i % 2 ? 0.05 : 0)));
  ctx.bezierCurveTo(cx + S * 0.34, S * 0.7, cx + S * 0.3, S * 0.3, cx, S * 0.18);
  ctx.closePath();
  inked(ctx, dark, 5);

  // armored torso
  ctx.beginPath();
  ctx.moveTo(cx, S * 0.24);
  ctx.bezierCurveTo(cx - S * 0.2, S * 0.3, cx - S * 0.18, S * 0.6, cx - S * 0.14, S * 0.78);
  ctx.lineTo(cx + S * 0.14, S * 0.78);
  ctx.bezierCurveTo(cx + S * 0.18, S * 0.6, cx + S * 0.2, S * 0.3, cx, S * 0.24);
  ctx.closePath();
  inked(ctx, base, 5);
  // plate seams
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - S * (0.17 - i * 0.02), S * (0.34 + i * 0.11));
    ctx.quadraticCurveTo(cx, S * (0.38 + i * 0.11), cx + S * (0.17 - i * 0.02), S * (0.34 + i * 0.11));
    ctx.stroke();
  }

  // pauldrons
  for (const s of [-1, 1]) {
    paperBlob(ctx, rng, cx + s * S * 0.22, S * 0.32, S * 0.11, S * 0.08, { points: 8 });
    inked(ctx, base, 4);
    for (let k = 0; k < 3; k++) { // shoulder spikes
      ctx.beginPath();
      ctx.moveTo(cx + s * (S * 0.16 + k * S * 0.05), S * 0.28);
      ctx.lineTo(cx + s * (S * 0.2 + k * S * 0.05), S * (0.16 - k * 0.02));
      ctx.lineTo(cx + s * (S * 0.24 + k * S * 0.05), S * 0.28);
      ctx.closePath();
      inked(ctx, dark, 2.5);
    }
  }

  // helm: a crowned cowl with a dark visor
  ctx.beginPath();
  ctx.moveTo(cx, S * 0.06);
  ctx.bezierCurveTo(cx - S * 0.13, S * 0.08, cx - S * 0.15, S * 0.22, cx - S * 0.1, S * 0.27);
  ctx.quadraticCurveTo(cx, S * 0.31, cx + S * 0.1, S * 0.27);
  ctx.bezierCurveTo(cx + S * 0.15, S * 0.22, cx + S * 0.13, S * 0.08, cx, S * 0.06);
  ctx.closePath();
  inked(ctx, base, 4.5);
  ctx.beginPath();
  ctx.ellipse(cx, S * 0.2, S * 0.075, S * 0.06, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#0d0a16';
  ctx.fill();
  glowEye(ctx, cx - S * 0.03, S * 0.2, S * 0.017, eye);
  glowEye(ctx, cx + S * 0.03, S * 0.2, S * 0.017, eye);

  // boundary regalia
  if (boundary === 0) {
    // the Emberclad: a greatsword of cooling slag
    ctx.save();
    ctx.translate(cx + S * 0.3, S * 0.56);
    ctx.rotate(-0.12);
    ctx.beginPath();
    ctx.moveTo(0, S * 0.28);
    ctx.lineTo(-S * 0.035, -S * 0.28);
    ctx.lineTo(0, -S * 0.36);
    ctx.lineTo(S * 0.035, -S * 0.28);
    ctx.closePath();
    inked(ctx, '#ffb37a', 3);
    ctx.beginPath();
    ctx.roundRect(-S * 0.07, S * 0.26, S * 0.14, S * 0.035, S * 0.01);
    inked(ctx, dark, 2.5);
    ctx.restore();
  } else if (boundary === 1) {
    // the Tidebound: a trident and fin crest
    ctx.save();
    ctx.translate(cx - S * 0.3, S * 0.52);
    ctx.beginPath();
    ctx.roundRect(-S * 0.014, -S * 0.3, S * 0.028, S * 0.62, S * 0.01);
    inked(ctx, dark, 2.5);
    for (const o of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.moveTo(o * S * 0.05, -S * 0.28);
      ctx.lineTo(o * S * 0.06, -S * 0.4);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4.5;
      ctx.stroke();
      ctx.strokeStyle = '#7fc4ff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); // crest
    ctx.moveTo(cx - S * 0.02, S * 0.06);
    ctx.quadraticCurveTo(cx + S * 0.1, S * 0.0, cx + S * 0.06, S * 0.12);
    ctx.closePath();
    inked(ctx, '#7fc4ff', 2.5);
  } else if (boundary === 2) {
    // the Galecrowned: a hovering crown of small lightnings
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.8 + (i / 4) * Math.PI * 0.6;
      const x = cx + Math.cos(a) * S * 0.14, y = S * 0.08 + Math.sin(a) * S * 0.05;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + S * 0.02, y - S * 0.05);
      ctx.lineTo(x + S * 0.005, y - S * 0.05);
      ctx.lineTo(x + S * 0.03, y - S * 0.1);
      ctx.strokeStyle = '#dfe6ff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  } else {
    // the Outer Dark: extra eyes open across the cape
    for (let i = 0; i < 6; i++) {
      const a = rng.float() * Math.PI * 2, r = S * (0.16 + rng.float() * 0.16);
      glowEye(ctx, cx + Math.cos(a) * r, S * 0.55 + Math.sin(a) * r * 0.55, S * 0.013, eye);
    }
  }
}

// ---------------------------------------------------------------- canvases
const canvasCache = new Map();

function makeCanvas(S) {
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  return c;
}

export function magicianCanvas(S = 192) {
  const key = 'magician:' + S;
  if (!canvasCache.has(key)) {
    const c = makeCanvas(S);
    drawMagician(c.getContext('2d'), S);
    canvasCache.set(key, c);
  }
  return canvasCache.get(key);
}

// enemy sprite canvas from an archetype recipe + biome palette
export function creatureCanvas({ id, painter, base, dark, eye, size = 160 }) {
  const key = 'c:' + id + ':' + size;
  if (!canvasCache.has(key)) {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    const fn = PAINTERS[painter] ?? PAINTERS.imp;
    fn(ctx, size, new Rng('creature:' + id), {
      base: css(base), baseRaw: base, dark: shade(dark ?? base, 0.72),
      eye: '#' + (eye >>> 0).toString(16).padStart(6, '0'),
    });
    canvasCache.set(key, c);
  }
  return canvasCache.get(key);
}

export function wardenCanvas(boundary, tint, tint2, eyeColor, size = 256) {
  const key = 'w:' + boundary + ':' + size;
  if (!canvasCache.has(key)) {
    const c = makeCanvas(size);
    drawWarden(c.getContext('2d'), size, boundary, tint, tint2, eyeColor);
    canvasCache.set(key, c);
  }
  return canvasCache.get(key);
}

// A paper cutout standing in the world: a billboard sprite (with a faint
// backing glow so it reads at night) whose feet sit at the group's origin.
export function makePaperFigure(canvas, { height = 3.2, glow = null, glowScale = 1.6 } = {}) {
  const group = new THREE.Group();
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, alphaTest: 0.08, depthWrite: false, toneMapped: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(height, height, 1);
  sprite.center.set(0.5, 0.06); // feet on the ground
  sprite.renderOrder = 4;
  group.add(sprite);
  if (glow !== null) {
    const gm = new THREE.SpriteMaterial({
      map: paperGlowTex(), color: glow, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const gs = new THREE.Sprite(gm);
    gs.scale.setScalar(height * glowScale);
    gs.position.y = height * 0.45;
    gs.renderOrder = 3;
    group.add(gs);
    group.userData.glow = gs;
  }
  group.userData.sprite = sprite;
  return group;
}

let _glowTex = null;
function paperGlowTex() {
  if (_glowTex) return _glowTex;
  const c = makeCanvas(128);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.28)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  _glowTex = new THREE.CanvasTexture(c);
  return _glowTex;
}

// ---------------------------------------------------------------- item cards
// Every item's face: a torn-paper card shaped by tier, a kind-glyph at the
// heart, tinted by its effect family. 96px, cached by item id.
const TIER_CARD = {
  common: { frame: 'circle', rim: '#8f96b8', back: 0x3a3f63 },
  rare: { frame: 'diamond', rim: '#9fd8ff', back: 0x2e4a66 },
  superrare: { frame: 'shield', rim: '#c78bff', back: 0x47265c },
  legendary: { frame: 'burst', rim: '#ffd27a', back: 0x5c4326 },
};

function cardFrame(ctx, S, rng, frame) {
  const cx = S / 2, cy = S / 2, R = S * 0.42;
  ctx.beginPath();
  if (frame === 'circle') {
    paperBlob(ctx, rng, cx, cy, R, R, { points: 13, jitter: 0.07 });
  } else if (frame === 'diamond') {
    for (let i = 0; i <= 4; i++) {
      const a = -Math.PI / 2 + (i / 4) * Math.PI * 2;
      const j = 1 + (rng.float() - 0.5) * 0.08;
      const x = cx + Math.cos(a) * R * j, y = cy + Math.sin(a) * R * j;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (frame === 'shield') {
    ctx.moveTo(cx, cy - R);
    ctx.bezierCurveTo(cx + R, cy - R * 0.8, cx + R * 0.9, cy + R * 0.2, cx, cy + R);
    ctx.bezierCurveTo(cx - R * 0.9, cy + R * 0.2, cx - R, cy - R * 0.8, cx, cy - R);
    ctx.closePath();
  } else { // burst
    for (let i = 0; i < 20; i++) {
      const a = -Math.PI / 2 + (i / 20) * Math.PI * 2;
      const r = (i % 2 === 0 ? R : R * 0.72) * (1 + (rng.float() - 0.5) * 0.1);
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
}

// tiny glyph painters for the card hearts
const GLYPHS = {
  sword(ctx, S, col) {
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, S * 0.2);
    ctx.lineTo(-S * 0.035, -S * 0.14);
    ctx.lineTo(0, -S * 0.22);
    ctx.lineTo(S * 0.035, -S * 0.14);
    ctx.closePath();
    inked(ctx, col, 2.5);
    ctx.beginPath();
    ctx.roundRect(-S * 0.09, S * 0.16, S * 0.18, S * 0.04, S * 0.01);
    inked(ctx, col, 2);
    ctx.restore();
  },
  boot(ctx, S, col) {
    ctx.beginPath();
    ctx.moveTo(S * 0.4, S * 0.28);
    ctx.lineTo(S * 0.4, S * 0.58);
    ctx.lineTo(S * 0.66, S * 0.66);
    ctx.lineTo(S * 0.66, S * 0.72);
    ctx.lineTo(S * 0.34, S * 0.72);
    ctx.lineTo(S * 0.34, S * 0.28);
    ctx.closePath();
    inked(ctx, col, 2.5);
  },
  eye(ctx, S, col) {
    ctx.beginPath();
    ctx.moveTo(S * 0.26, S * 0.5);
    ctx.quadraticCurveTo(S * 0.5, S * 0.28, S * 0.74, S * 0.5);
    ctx.quadraticCurveTo(S * 0.5, S * 0.72, S * 0.26, S * 0.5);
    ctx.closePath();
    inked(ctx, col, 2.5);
    ctx.beginPath();
    ctx.arc(S * 0.5, S * 0.5, S * 0.08, 0, Math.PI * 2);
    inked(ctx, '#ffffff', 2);
  },
  heart(ctx, S, col) {
    ctx.beginPath();
    ctx.moveTo(S * 0.5, S * 0.72);
    ctx.bezierCurveTo(S * 0.2, S * 0.5, S * 0.3, S * 0.26, S * 0.5, S * 0.4);
    ctx.bezierCurveTo(S * 0.7, S * 0.26, S * 0.8, S * 0.5, S * 0.5, S * 0.72);
    ctx.closePath();
    inked(ctx, col, 2.5);
  },
  star(ctx, S, col) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const r = i % 2 === 0 ? S * 0.24 : S * 0.1;
      const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    inked(ctx, col, 2.5);
  },
  flame(ctx, S, col) {
    ctx.beginPath();
    ctx.moveTo(S * 0.5, S * 0.24);
    ctx.bezierCurveTo(S * 0.7, S * 0.42, S * 0.68, S * 0.6, S * 0.5, S * 0.74);
    ctx.bezierCurveTo(S * 0.32, S * 0.6, S * 0.36, S * 0.48, S * 0.44, S * 0.4);
    ctx.bezierCurveTo(S * 0.44, S * 0.48, S * 0.5, S * 0.46, S * 0.5, S * 0.24);
    ctx.closePath();
    inked(ctx, col, 2.5);
  },
  snow(ctx, S, col) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(S / 2, S / 2);
      ctx.lineTo(S / 2 + Math.cos(a) * S * 0.22, S / 2 + Math.sin(a) * S * 0.22);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(S / 2 + Math.cos(a) * S * 0.22, S / 2 + Math.sin(a) * S * 0.22, S * 0.03, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
    }
  },
  hourglass(ctx, S, col) {
    ctx.beginPath();
    ctx.moveTo(S * 0.34, S * 0.28);
    ctx.lineTo(S * 0.66, S * 0.28);
    ctx.lineTo(S * 0.42, S * 0.5);
    ctx.lineTo(S * 0.66, S * 0.72);
    ctx.lineTo(S * 0.34, S * 0.72);
    ctx.lineTo(S * 0.58, S * 0.5);
    ctx.closePath();
    inked(ctx, col, 2.5);
  },
  spiral(ctx, S, col) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 4;
      const r = S * 0.04 + (i / 40) * S * 0.22;
      const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  },
  droplet(ctx, S, col) {
    ctx.beginPath();
    ctx.moveTo(S * 0.5, S * 0.24);
    ctx.bezierCurveTo(S * 0.72, S * 0.5, S * 0.66, S * 0.72, S * 0.5, S * 0.74);
    ctx.bezierCurveTo(S * 0.34, S * 0.72, S * 0.28, S * 0.5, S * 0.5, S * 0.24);
    ctx.closePath();
    inked(ctx, col, 2.5);
  },
  rune(ctx, S, col, ch = 'ᚱ') {
    ctx.fillStyle = col;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.font = `700 ${S * 0.5}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(ch, S / 2, S * 0.52);
    ctx.fillText(ch, S / 2, S * 0.52);
  },
  wand(ctx, S, col) {
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(Math.PI / 5);
    ctx.beginPath();
    ctx.roundRect(-S * 0.03, -S * 0.2, S * 0.06, S * 0.42, S * 0.02);
    inked(ctx, col, 2.5);
    ctx.restore();
    GLYPHS.star(ctx, S * 0.6, col);
  },
  relic(ctx, S, col) {
    ctx.beginPath();
    ctx.moveTo(S * 0.5, S * 0.22);
    ctx.lineTo(S * 0.7, S * 0.42);
    ctx.lineTo(S * 0.62, S * 0.72);
    ctx.lineTo(S * 0.38, S * 0.72);
    ctx.lineTo(S * 0.3, S * 0.42);
    ctx.closePath();
    inked(ctx, col, 2.5);
    glowEye(ctx, S * 0.5, S * 0.48, S * 0.05, '#fff6d8');
  },
};

export function itemCanvas({ id, tier, glyph, tint, rune }, S = 96) {
  const key = 'i:' + id;
  if (!canvasCache.has(key)) {
    const c = makeCanvas(S);
    const ctx = c.getContext('2d');
    const rng = new Rng('item:' + id);
    const spec = TIER_CARD[tier] ?? TIER_CARD.common;
    ctx.clearRect(0, 0, S, S);
    // backing shadow, then card, then rim
    ctx.save();
    ctx.translate(2.5, 3.5);
    cardFrame(ctx, S, new Rng('item:' + id), spec.frame);
    ctx.fillStyle = 'rgba(13,10,22,0.55)';
    ctx.fill();
    ctx.restore();
    cardFrame(ctx, S, rng, spec.frame);
    inked(ctx, css(spec.back), 3.5);
    ctx.save();
    ctx.globalAlpha = 0.9;
    (GLYPHS[glyph] ?? GLYPHS.rune)(ctx, S, css(tint), rune);
    ctx.restore();
    // tier rim glint
    ctx.strokeStyle = spec.rim;
    ctx.lineWidth = 1.6;
    cardFrame(ctx, S, new Rng('item:' + id), spec.frame);
    ctx.stroke();
    canvasCache.set(key, c);
  }
  return canvasCache.get(key);
}

export function itemDataUrl(recipe) {
  return itemCanvas(recipe).toDataURL();
}
