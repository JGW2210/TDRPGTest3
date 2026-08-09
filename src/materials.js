// Shader materials and generated canvas textures for the Paper-Craft Cutout
// look: flat pastels, ink outlines, layered wiggly-cut paper waves.

import * as THREE from 'three';
import { RUNE_CHARS } from './config.js';

export function makeRuneTexture(rng, { count = 170, size = 1024 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#fff';
  for (let i = 0; i < count; i++) {
    const g = RUNE_CHARS[(rng.float() * RUNE_CHARS.length) | 0];
    const s = 18 + rng.float() * 54;
    ctx.save();
    ctx.translate(rng.float() * size, rng.float() * size);
    ctx.rotate((rng.float() - 0.5) * 1.3);
    ctx.globalAlpha = 0.25 + rng.float() * 0.75;
    ctx.font = `${s | 0}px serif`;
    ctx.fillText(g, 0, 0);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

// Stepped shading ramp shared by all MeshToonMaterials.
export function makeToonGradient() {
  const data = new Uint8Array([150, 195, 230, 255]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

// Astral water: a dark aetherial sea. Near-borderless hexes at varying
// depths, soft light-bands drifting with the current, large luminance
// blotches, faint rune-script, and rare starlike glints.
// aFlow = (dirX, dirZ, speed, flags) where flags bits: 1=faint 2=leviathan 4=blocked.
// aDepth = 0 (shallow) .. 1 (deep).
export function makeWaterMaterial(runeTex) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uBreath: { value: 0.5 },
      uRunes: { value: runeTex },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute vec4 aFlow;
      attribute float aDepth;
      varying vec3 vColor;
      varying vec4 vFlow;
      varying vec3 vWorld;
      varying float vDepth;
      uniform float uTime;
      void main() {
        vColor = aColor;
        vFlow = aFlow;
        vDepth = aDepth;
        vec4 wp = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
        #endif
        wp = modelMatrix * wp;
        float flags = aFlow.w;
        float blocked = step(3.5, flags);
        float rem = flags - blocked * 4.0;
        float levi = step(1.5, rem);
        wp.y += sin(uTime * 0.5 + wp.x * 0.05 + wp.z * 0.045) * 0.04;
        wp.y += levi * sin(uTime * 1.35 + wp.x * 0.13 + wp.z * 0.11) * 0.55;
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uBreath;
      uniform sampler2D uRunes;
      varying vec3 vColor;
      varying vec4 vFlow;
      varying vec3 vWorld;
      varying float vDepth;
      const vec3 VOID = vec3(0.045, 0.05, 0.11);
      void main() {
        vec2 dir = vFlow.xy;
        float sp = vFlow.z;
        float flags = vFlow.w;
        float blocked = step(3.5, flags);
        float rem = flags - blocked * 4.0;
        float levi = step(1.5, rem);
        float faint = rem - levi * 2.0;

        // soft light-bands drifting with the current — watery, not liney
        vec2 perp = vec2(-dir.y, dir.x);
        float along = dot(vWorld.xz, dir);
        float across = dot(vWorld.xz, perp);
        float wig = sin(across * 0.22 + uTime * 0.3) * 1.2 + sin(across * 0.09) * 1.8;
        float bands = 0.5 + 0.5 * sin(along * 0.11 - uTime * sp * 0.35 + wig * 0.35);

        // large drifting luminance blotches — the cosmic deep
        float blotch = texture2D(uRunes, vWorld.xz * 0.004 + vec2(uTime * 0.002, -uTime * 0.0015)).a;

        vec3 col = mix(VOID, vColor, 0.42 + 0.3 * bands);
        col = mix(col, VOID, vDepth * 0.5);
        col *= 0.82 + 0.34 * blotch;

        // faint rune-script adrift in the water
        float g1 = texture2D(uRunes, vWorld.xz * 0.03 - dir * uTime * sp * 0.006).a;
        col += vColor * g1 * 0.15 * (0.55 + 0.45 * uBreath);

        // rare starlike glints on the surface
        float g2 = texture2D(uRunes, vWorld.xz * 0.11 + dir * uTime * sp * 0.004 + 0.31).a;
        float glint = pow(g2, 6.0) * max(0.0, sin(uTime * 1.7 + vWorld.x * 0.5 + vWorld.z * 0.4));
        col += vec3(0.75, 0.85, 1.0) * glint * 0.45;

        col *= 0.92 + 0.12 * uBreath;
        col += levi * vColor * 0.14 * (0.5 + 0.5 * sin(uTime * 1.35 + vWorld.x * 0.13));
        col = mix(col, vec3(0.30, 0.28, 0.40), blocked * 0.75);

        float alpha = mix(0.94, 0.12 + 0.5 * uBreath, faint);
        alpha = mix(alpha, 0.85, blocked * 0.3);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

// Pastel pinwheel iris inside each gate port ring.
export function makeSwirlMaterial(color) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv - 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      const vec3 INK = vec3(0.21, 0.18, 0.31);
      void main() {
        float r = length(vUv) * 2.0;
        if (r > 1.0) discard;
        float ang = atan(vUv.y, vUv.x);
        float spiral = sin(ang * 4.0 - uTime * 1.2 + r * 6.0);
        float blade = step(0.0, spiral);
        vec3 col = mix(uColor * 0.85, uColor * 1.1, blade);
        float line = 1.0 - smoothstep(0.0, 0.25, abs(spiral));
        col = mix(col, INK, line * 0.3);
        float glow = smoothstep(1.0, 0.3, r);
        gl_FragColor = vec4(col, glow * 0.85);
      }
    `,
  });
}

export function makeGlowSpriteTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

// Four-point doodle sparkle for the starfield.
export function makeSparkleTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const m = size / 2, arm = size * 0.46, waist = size * 0.07;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(m, m - arm);
  ctx.quadraticCurveTo(m + waist, m - waist, m + arm, m);
  ctx.quadraticCurveTo(m + waist, m + waist, m, m + arm);
  ctx.quadraticCurveTo(m - waist, m + waist, m - arm, m);
  ctx.quadraticCurveTo(m - waist, m - waist, m, m - arm);
  ctx.fill();
  return new THREE.CanvasTexture(c);
}

export function makeNebulaTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const x = size * (0.2 + Math.random() * 0.6);
    const y = size * (0.2 + Math.random() * 0.6);
    const r = size * (0.1 + Math.random() * 0.28);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.16)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(c);
}

export function makeGlyphTexture(ch, color = '#cfe0ff', size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.font = `${(size * 0.62) | 0}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.12;
  ctx.fillStyle = color;
  ctx.fillText(ch, size / 2, size / 2 + size * 0.03);
  return new THREE.CanvasTexture(c);
}
