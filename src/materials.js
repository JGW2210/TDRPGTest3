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
// blotches, faint rune-script, and rare starlike glints. Rendered twice:
// a glassy base tile plus a thin translucent sheet floating above it
// (lift + ghost), each wobbling on its own phase so the sea feels alive.
// aFlow = (dirX, dirZ, speed, flags) where flags bits: 1=faint 2=leviathan 4=blocked.
// aDepth = 0 (shallow) .. 1 (deep).
export function makeWaterMaterial(runeTex, {
  lift = 0, ghost = 1, speedMul = 1,
  unify = 0, unifyColor = 0x9fd8ff,
  wobbleRate = 1, wobbleAmp = 1, phase = 0,
  fade = 0,
} = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uBreath: { value: 0.5 },
      uRunes: { value: runeTex },
      uLift: { value: lift },
      uGhost: { value: ghost },
      uSpeedMul: { value: speedMul },
      uUnify: { value: unify },
      uUnifyColor: { value: new THREE.Color(unifyColor) },
      uWobbleRate: { value: wobbleRate },
      uWobbleAmp: { value: wobbleAmp },
      uPhase: { value: phase },
      uFade: { value: fade },
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
      uniform float uLift;
      uniform float uWobbleRate;
      uniform float uWobbleAmp;
      uniform float uPhase;
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
        // transient chop: two wobble frequencies, each layer on its own
        // rate, height, and phase
        wp.y += uLift;
        wp.y += sin(uTime * 0.9 * uWobbleRate + uPhase + wp.x * 0.21 + wp.z * 0.17) * 0.1 * uWobbleAmp;
        wp.y += sin(uTime * 0.5 * uWobbleRate + uPhase * 1.7 + wp.x * 0.05 + wp.z * 0.045) * 0.06 * uWobbleAmp;
        wp.y += levi * sin(uTime * 1.35 + wp.x * 0.13 + wp.z * 0.11) * 0.55;
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uBreath;
      uniform sampler2D uRunes;
      uniform float uGhost;
      uniform float uSpeedMul;
      uniform float uUnify;
      uniform vec3 uUnifyColor;
      uniform float uFade;
      varying vec3 vColor;
      varying vec4 vFlow;
      varying vec3 vWorld;
      varying float vDepth;
      const vec3 VOID = vec3(0.045, 0.05, 0.11);
      void main() {
        vec2 dir = vFlow.xy;
        float sp = vFlow.z * uSpeedMul;
        float flags = vFlow.w;
        float blocked = step(3.5, flags);
        float rem = flags - blocked * 4.0;
        float levi = step(1.5, rem);
        float faint = rem - levi * 2.0;

        // the ghost sheet forgets its region: one shared aetherial hue
        vec3 tint = mix(vColor, uUnifyColor, uUnify);

        // soft light-bands drifting with the current — watery, not liney
        vec2 perp = vec2(-dir.y, dir.x);
        float along = dot(vWorld.xz, dir);
        float across = dot(vWorld.xz, perp);
        float wig = sin(across * 0.22 + uTime * 0.35) * 1.2 + sin(across * 0.09) * 1.8;
        float bands = 0.5 + 0.5 * sin(along * 0.11 - uTime * sp * 0.45 + wig * 0.35);

        // large drifting luminance blotches — the cosmic deep
        float blotch = texture2D(uRunes, vWorld.xz * 0.004 + vec2(uTime * 0.002, -uTime * 0.0015)).a;

        vec3 col = mix(VOID, tint, 0.42 + 0.3 * bands);
        col = mix(col, VOID, vDepth * 0.5 * (1.0 - uUnify));
        col *= 0.82 + 0.34 * blotch;

        // faint rune-script adrift in the water
        float g1 = texture2D(uRunes, vWorld.xz * 0.03 - dir * uTime * sp * 0.006).a;
        col += tint * g1 * 0.15 * (0.55 + 0.45 * uBreath);

        // rare starlike glints on the surface
        float g2 = texture2D(uRunes, vWorld.xz * 0.11 + dir * uTime * sp * 0.004 + 0.31).a;
        float glint = pow(g2, 6.0) * max(0.0, sin(uTime * 1.7 + vWorld.x * 0.5 + vWorld.z * 0.4));
        col += vec3(0.75, 0.85, 1.0) * glint * 0.45;

        // the ghost sheet carries brighter highlights than the glassy base
        col *= 1.0 + (1.0 - uGhost) * 0.35 * bands;

        col *= 0.92 + 0.12 * uBreath;
        col += levi * tint * 0.14 * (0.5 + 0.5 * sin(uTime * 1.35 + vWorld.x * 0.13));
        col = mix(col, vec3(0.30, 0.28, 0.40), blocked * 0.75);

        float alpha = mix(0.985, 0.12 + 0.5 * uBreath, faint);
        alpha = mix(alpha, 0.85, blocked * 0.3);
        // fringe hexes dissolve into the void with distance (vDepth = fade)
        alpha *= mix(1.0, clamp(1.0 - vDepth, 0.0, 1.0), uFade);
        // the ghost sheet is patchy: solid on band crests, sheer in troughs,
        // so the glassy base and its region color show through beneath
        alpha *= 1.0 - (1.0 - uGhost) * (1.0 - bands) * 0.9;
        gl_FragColor = vec4(col, alpha * uGhost);
      }
    `,
  });
}

// The shimmering energy field hung between a dolmen gate's two pillars:
// slow aurora bands, a fine vertical shimmer, soft rectangular edge fade,
// and a gentle ripple along the plane so it hangs like woven light.
// uIgnite scales the whole field: a dark (warded) gate holds it at 0 until
// its stormheart is claimed and the veil pours in.
export function makeVeilMaterial(color, ignite = 1) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uIgnite: { value: ignite },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.z += sin(uv.y * 6.0 + uTime * 1.7) * 0.09 * uv.y;
        p.x += sin(uv.y * 9.0 - uTime * 1.1) * 0.04;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uIgnite;
      varying vec2 vUv;
      void main() {
        float x = vUv.x, y = vUv.y;
        // soft fade at the stone edges, harder at the threshold
        float edge = smoothstep(0.0, 0.14, x) * smoothstep(1.0, 0.86, x)
                   * smoothstep(0.0, 0.07, y) * smoothstep(1.0, 0.78, y);
        // slow aurora folds drifting sideways
        float bands = 0.5 + 0.5 * sin(x * 8.0 + sin(y * 6.0 + uTime * 1.2) * 1.4 + uTime * 0.8);
        // fine vertical shimmer rising through the field
        float shimmer = 0.5 + 0.5 * sin(y * 24.0 - uTime * 2.8 + sin(x * 13.0) * 1.6);
        vec3 col = uColor * (0.5 + 0.5 * bands) + vec3(0.55, 0.62, 0.95) * shimmer * 0.16;
        // an igniting veil pours in from the capstone down
        float pour = smoothstep(1.0 - uIgnite * 1.15, 1.0 - uIgnite * 1.15 + 0.25, 1.0 - y);
        float alpha = edge * (0.30 + 0.28 * bands + 0.14 * shimmer) * uIgnite * pour;
        gl_FragColor = vec4(col * (0.7 + 0.5 * uIgnite), alpha);
      }
    `,
  });
}

// The stormfront: a vast annular maelstrom sheet sealing the void beyond the
// frontier ring. The water's visual language turned violent — churning bands,
// debris-dark blotches, constant lightning flicker, and a glowing leading
// wall at its inner edge. uInner animates the retreat; uFade dissolves the
// whole storm once the last ward falls.
export function makeStormMaterial(runeTex, { color, bright, flash, outer }) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uInner: { value: 0 },
      uFade: { value: 1 },
      uOuter: { value: outer },
      uRunes: { value: runeTex },
      uDeep: { value: new THREE.Color(color) },
      uBright: { value: new THREE.Color(bright) },
      uFlash: { value: new THREE.Color(flash) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      uniform float uTime;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float r = length(wp.xz);
        float a = atan(wp.z, wp.x);
        // the sheet heaves like a sea in fury
        wp.y += sin(uTime * 1.4 + r * 0.05 + a * 5.0) * 1.4
              + sin(uTime * 0.7 + r * 0.016 - a * 3.0) * 2.2;
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uInner;
      uniform float uFade;
      uniform float uOuter;
      uniform sampler2D uRunes;
      uniform vec3 uDeep;
      uniform vec3 uBright;
      uniform vec3 uFlash;
      varying vec3 vWorld;
      void main() {
        float r = length(vWorld.xz);
        float ang = atan(vWorld.z, vWorld.x);
        // churn: two blotch layers wheeling against each other
        vec2 sw1 = vec2(cos(uTime * 0.03), sin(uTime * 0.03));
        float n1 = texture2D(uRunes, vWorld.xz * 0.0021 + sw1 * 0.15 + uTime * 0.004).a;
        float n2 = texture2D(uRunes, vWorld.xz * 0.0063 - sw1 * 0.23 - uTime * 0.006).a;
        // storm bands racing around the orbit line
        float band = 0.5 + 0.5 * sin(r * 0.045 - uTime * 2.2 + ang * 6.0 + n1 * 7.0);
        vec3 col = mix(uDeep, uBright, 0.16 + 0.42 * band * (0.4 + 0.6 * n1));
        col = mix(col, uDeep * 0.55, n2 * 0.55); // debris-dark curds
        // lightning: sparse cells flickering white
        float bolt = pow(n2, 7.0) * max(0.0, sin(uTime * 11.0 + n1 * 43.0 + ang * 9.0));
        col += uFlash * bolt * 2.4;
        // the leading wall: a bright churn at the storm's inner edge
        float rim = 1.0 - smoothstep(uInner + 6.0, uInner + 64.0, r);
        col += uBright * rim * (0.5 + 0.5 * sin(uTime * 3.1 + ang * 14.0)) * 0.8;
        float alpha = smoothstep(uInner, uInner + 26.0, r)   // calm within
                    * (0.86 + 0.12 * n1)
                    * (1.0 - smoothstep(uOuter * 0.82, uOuter * 0.98, r))
                    * uFade;
        gl_FragColor = vec4(col, alpha);
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
