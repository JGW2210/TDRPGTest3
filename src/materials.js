// Shader materials and generated canvas textures for the Ink & Starlight look.

import * as THREE from 'three';
import { RUNE_CHARS, HEX } from './config.js';

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

// Astral water: per-instance color + flow vector; rune glyphs drift along the
// current, edges glow, the whole sea breathes with the sun's tide.
// aFlow = (dirX, dirZ, speed, flags) where flags bits: 1=faint 2=leviathan 4=blocked.
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
      varying vec3 vColor;
      varying vec4 vFlow;
      varying vec3 vWorld;
      varying float vR;
      uniform float uTime;
      void main() {
        vColor = aColor;
        vFlow = aFlow;
        vR = length(position.xz) / ${(HEX * 0.98).toFixed(3)};
        vec4 wp = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
        #endif
        wp = modelMatrix * wp;
        float flags = aFlow.w;
        float blocked = step(3.5, flags);
        float rem = flags - blocked * 4.0;
        float levi = step(1.5, rem);
        wp.y += sin(uTime * 0.5 + wp.x * 0.05 + wp.z * 0.045) * 0.06;
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
      varying float vR;
      void main() {
        vec2 dir = vFlow.xy;
        float sp = vFlow.z;
        float flags = vFlow.w;
        float blocked = step(3.5, flags);
        float rem = flags - blocked * 4.0;
        float levi = step(1.5, rem);
        float faint = rem - levi * 2.0;

        vec2 uv = vWorld.xz * 0.035;
        float t = uTime * sp;
        float g1 = texture2D(uRunes, uv - dir * t * 0.020).a;
        float g2 = texture2D(uRunes, uv * 1.9 + dir * t * 0.011 + 0.37).a;
        float shimmer = 0.5 + 0.5 * sin(uTime * 0.7 + vWorld.x * 0.06 + vWorld.z * 0.05);

        vec3 deep = vColor * 0.16 + vec3(0.015, 0.02, 0.05);
        vec3 col = mix(deep, vColor * 0.55, 0.35 + 0.35 * shimmer);
        col += vColor * (g1 * 0.85 + g2 * 0.45) * (0.65 + 0.5 * uBreath);

        float rim = smoothstep(0.7, 0.98, vR);
        col += vColor * rim * (0.55 + 0.25 * uBreath);

        col += levi * vColor * 0.35 * (0.5 + 0.5 * sin(uTime * 1.35 + vWorld.x * 0.13));
        col = mix(col, vec3(0.22, 0.2, 0.33) * (0.7 + 0.3 * sin(uTime * 7.0 + vWorld.x)), blocked * 0.85);

        float alpha = mix(0.92, 0.1 + 0.5 * uBreath, faint);
        alpha = mix(alpha, 0.75, blocked * 0.5);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

export function makeSunMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColA: { value: new THREE.Color(0xfff3c4) },
      uColB: { value: new THREE.Color(0xff8c3a) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalW;
      varying vec3 vPosW;
      void main() {
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vPosW = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColA;
      uniform vec3 uColB;
      varying vec3 vNormalW;
      varying vec3 vPosW;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vPosW);
        float fres = pow(1.0 - abs(dot(vNormalW, viewDir)), 1.6);
        float gran = 0.5 + 0.5 * sin(vPosW.x * 0.8 + uTime * 0.7) * sin(vPosW.y * 0.9 - uTime * 0.5) * sin(vPosW.z * 0.85 + uTime * 0.6);
        vec3 col = mix(uColA * 1.35, uColB * 1.2, fres);
        col += uColB * gran * 0.25;
        col *= 1.0 + 0.08 * sin(uTime * 0.5);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

// Swirling void-iris inside each warden gate ring.
export function makeSwirlMaterial(color) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
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
      void main() {
        float r = length(vUv) * 2.0;
        if (r > 1.0) discard;
        float ang = atan(vUv.y, vUv.x);
        float spiral = sin(ang * 3.0 - uTime * 1.6 + r * 9.0);
        float glow = smoothstep(1.0, 0.15, r);
        float core = smoothstep(0.35, 0.0, r);
        vec3 col = uColor * (0.25 + 0.45 * spiral) * glow + uColor * core * 1.4;
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
  ctx.shadowBlur = size * 0.16;
  ctx.fillStyle = color;
  ctx.fillText(ch, size / 2, size / 2 + size * 0.03);
  return new THREE.CanvasTexture(c);
}

// A pale almond eye for the Unblinking Shallows — it always faces you.
export function makeEyeTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.scale(1, 0.55);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.4);
  g.addColorStop(0, 'rgba(228,244,236,0.95)');
  g.addColorStop(0.8, 'rgba(190,220,208,0.5)');
  g.addColorStop(1, 'rgba(190,220,208,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(10,12,18,0.95)';
  ctx.beginPath();
  ctx.ellipse(size / 2, size / 2, size * 0.05, size * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(c);
}
