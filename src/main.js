// Astral Reaches — runic cosmic world map, Paper-Craft Cutout edition.
// An Orb-Weaver's Wheel of ring-rivers and spokes, hex archipelagos at the
// crossings, riverflight gates between paired ports, and a friendly pastel
// cosmos full of leviathans, comets, and secrets.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { HEX, toRunes, INTRO_LINES, WARD_LINES } from './config.js';
import * as Hx from './hexmath.js';
import { Rng } from './rng.js';
import { generateWorld } from './worldgen.js';
import { buildWorld } from './buildWorld.js';
import { makeGlowSpriteTexture } from './materials.js';
import { AstralControls } from './controls.js';
import { Player } from './player.js';
import { Cutscene } from './cutscene.js';
import { ui } from './ui.js';
import { updateLabels } from './labels.js';

// ---------------------------------------------------------------- setup
const params = new URLSearchParams(location.search);
const seed = params.get('seed') || 'AETHERION';

const world = generateWorld(seed);
const buildRng = new Rng(seed + ':build');

const BG = 0x14172e; // dark cosmic indigo with a papery warmth

const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.FogExp2(BG, 0.00026);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.5, 9000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.getElementById('app').appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.45, 0.72);
composer.addPass(bloom);

// dark-aetherial lighting: a dim even wash, one warm key from the hearthstar
scene.add(new THREE.AmbientLight(0xb8c2ee, 0.5));
scene.add(new THREE.HemisphereLight(0xd8d2ff, 0x10121f, 0.35));
const sunLight = new THREE.PointLight(0xffd9a8, 1.5, 0, 0);
sunLight.position.set(0, 40, 0);
scene.add(sunLight);
const rim = new THREE.DirectionalLight(0xdfe4ff, 0.45);
rim.position.set(300, 500, 200);
scene.add(rim);

const built = buildWorld(world, buildRng);
scene.add(built.group);

const player = new Player(world);
scene.add(player.mesh);

const controls = new AstralControls(renderer.domElement, camera);
controls.target.copy(player.mesh.position);
controls.dist = 120;

const cutscene = new Cutscene(controls);

// ---------------------------------------------------------------- state
const announcedGates = new Set();
let suppressGateKey = null; // the teleporter we just landed on — don't bounce back
let locOverrideUntil = 0;
let clockTime = 0;
let lastAreaId = -1;
const springRested = new Set(); // waystation springs already used this visit

// ---------------------------------------------------------------- the run
// Three papercraft hearts, halved. Lose the last half and the run ends —
// rogue death: the next cosmos grows from a fresh seed.
const run = { maxHalves: 6, halves: 6, invulnUntil: -1, dead: false };

function damage(n = 1, note = '') {
  if (run.dead || cutscene.active || player.blast) return;
  if (clockTime < run.invulnUntil) return;
  run.invulnUntil = clockTime + 1.15;
  run.halves = Math.max(0, run.halves - n);
  ui.renderHearts(run.halves, run.maxHalves);
  ui.hurt();
  if (note) flashLocation(note, 2200);
  if (run.halves <= 0) die();
}

function heal(n) {
  if (run.dead) return 0;
  const before = run.halves;
  run.halves = Math.min(run.maxHalves, run.halves + n);
  if (run.halves !== before) ui.renderHearts(run.halves, run.maxHalves);
  return run.halves - before;
}

function die() {
  run.dead = true;
  player.path = [];
  ui.hideDialogue();
  ui.announce('The Wisp Gutters Out', 'ᛉ ᛫ the void reclaims its light ᛫ a new cosmos kindles', 5200);
  ui.deathFade();
  setTimeout(() => {
    const s = Math.random().toString(36).slice(2, 8).toUpperCase();
    location.search = '?seed=' + s;
  }, 3600);
}

function areaOf(hex) {
  return world.areas[hex.areaId];
}

function setLocationFor(hex) {
  const area = areaOf(hex);
  const b = area.biome;
  const where = hex.kind === 'water' ? `adrift on ${b.water.name}` : `ashore in ${b.area.replace(/^The /, 'the ')}`;
  const name = area.discovered ? b.area : toRunes(b.area);
  ui.setLocation(`${name} ✦ ${where}`);
}

function flashLocation(text, ms = 1800) {
  ui.setLocation(text);
  locOverrideUntil = clockTime + ms / 1000;
}

function discoverArea(area, loud = true) {
  if (area.discovered) return;
  area.discovered = true;
  // the fog lifts: tiles pop in staggered while the cutscene watches the body
  built.revealArea(area.id, loud);
  built.labelsByArea.get(area.id)?.decipher();
  built.labelsByLandmark.get(area.id)?.decipher();
  built.wobbleBody(area.id);
  if (loud) {
    const b = area.biome;
    const sub = area.secret ? `${b.body} ᛫ a secret held by the dark` : b.body;
    const bodyY = b.bodyKind === 'sun' ? 20 : b.bodySize + 7;
    cutscene.startDiscovery({
      title: b.area, sub,
      lines: INTRO_LINES[b.key],
      focus: new THREE.Vector3(area.pos.x, bodyY, area.pos.z),
      dist: THREE.MathUtils.clamp(b.bodySize * 6, 50, 110),
      homeOf: () => new THREE.Vector3(player.mesh.position.x, 0, player.mesh.position.z),
    });
  }
}

// Claiming a stormheart shard: the ward falls, the shard flies to the gate's
// lintel, the veil ignites, and the stormfront rolls back one ring — all
// watched by the ignition cutscene.
function handleShardClaim(hex) {
  const ward = world.wards[hex.wardId];
  if (!ward || ward.dispelled) return;
  ward.dispelled = true;
  world.progress.frontier = ward.boundary + 1;
  const gate = world.gates[ward.gateId];
  for (const l of built.labelsByGate.get(gate.id) ?? []) l.decipher();
  built.claimShard(ward.id, () => {
    built.igniteGate(gate.id);
    built.boingGate(gate.id);
    built.setStormFrontier(world.progress.frontier);
  });
  const ph = world.hexes.get(gate.portA);
  const pp = Hx.toWorld(ph.q, ph.r, HEX);
  cutscene.startDiscovery({
    title: `${gate.name} Ignites`,
    sub: `${gate.rune.ch} ᛫ the stormfront rolls back`,
    lines: WARD_LINES[ward.boundary] ?? WARD_LINES[WARD_LINES.length - 1],
    focus: new THREE.Vector3(pp.x, 5, pp.z),
    dist: 52,
    homeOf: () => new THREE.Vector3(player.mesh.position.x, 0, player.mesh.position.z),
  });
}

function handleShrine(hex) {
  const s = world.shrines[hex.shrineId];
  if (!s) return;
  const destKey = hex.shrineRole === 'stone' ? s.padKey : s.stoneKey;
  suppressGateKey = destKey;
  if (!s.visited) {
    s.visited = true;
    ui.announce('An Astral Shrine', 'ᛊ ᛫ the stone hurls you skyward');
  } else {
    flashLocation('✦ the stone takes you ✦', 2000);
  }
  player.startBlast(destKey, 'line');
}

function handleAltar(hex) {
  const s = world.shrines[hex.shrineId];
  if (!s || s.claimed) return;
  s.claimed = true;
  built.claimAltar(s.id);
  if (run.maxHalves < 12) {
    run.maxHalves += 2;
    heal(2);
    ui.renderHearts(run.halves, run.maxHalves);
    ui.announce('A Heart of the Astral', '♥ ᛫ the vessel deepens');
  } else {
    heal(2);
    ui.announce('A Heart of the Astral', '♥ ᛫ the vessel overflows');
  }
}

function handleSpring(hex) {
  if (springRested.has(hex.areaId)) return;
  springRested.add(hex.areaId);
  if (heal(2) > 0) ui.announce('The Spring Mends You', '✦ rest, traveler — nothing else does');
  else flashLocation('✦ the spring murmurs — you are already whole ✦');
}

function handleGate(hex, hexKey) {
  const gate = world.gates[hex.gateId];
  if (gate.wardId !== undefined && !world.wards[gate.wardId].dispelled) {
    flashLocation('ᚺ ✦ the gate is dark ✦ a stormheart crackles somewhere near', 2600);
    return;
  }
  const destKey = gate.portA === hexKey ? gate.portB : gate.portA;
  if (!announcedGates.has(gate.id)) {
    announcedGates.add(gate.id);
    for (const l of built.labelsByGate.get(gate.id) ?? []) l.decipher();
    ui.announce(gate.name, `${gate.rune.ch} ᛫ the warden stirs — the void takes you`);
  } else {
    flashLocation(`✦ cast through ${gate.name.replace(/^The /, 'the ')} ✦`, 2200);
  }
  suppressGateKey = destKey;
  built.boingGate(gate.id);
  player.startBlast(destKey, gate.kind === 'ring' ? 'arc' : 'line');
}

player.onEnterHex = (hex) => {
  const k = Hx.key(hex.q, hex.r);
  if (suppressGateKey && k !== suppressGateKey) suppressGateKey = null;
  const area = areaOf(hex);
  if (area.id !== lastAreaId) {
    lastAreaId = area.id;
    springRested.delete(area.id); // springs re-arm on each fresh visit
  }
  if (!area.discovered) discoverArea(area);
  setLocationFor(hex);
  if (hex.kind === 'isle') built.bounceIsle(k);
  // trapped hexes bite for half a heart
  if (hex.hazard?.kind === 'snare') {
    hex.hazard = null; // one-shot: the glyph burns out
    built.triggerSnare(k);
    damage(1, 'ᚦ ✦ a snare rune sears the sea-road');
  } else if (hex.hazard?.kind === 'geyser' && built.geyserErupting(k, clockTime)) {
    damage(1, '✦ the geyser catches you full ✦');
  } else if (hex.hazard?.kind === 'maw' && built.mawSnapping(k, clockTime)) {
    damage(1, '✦ the maw bloom bites ✦');
  }
  if (hex.wardId !== undefined) handleShardClaim(hex);
  if (hex.spring) handleSpring(hex);
  if (hex.shrineRole === 'altar') handleAltar(hex);
  if ((hex.shrineRole === 'stone' || hex.shrineRole === 'pad') && k !== suppressGateKey) handleShrine(hex);
  if (hex.gateId !== null && k !== suppressGateKey) handleGate(hex, k);
};

// ---------------------------------------------------------------- movement UI
// The water is near-borderless, so the grid lives in UI: a glowing outline on
// the hovered hex, and a trail of dots marking the queued route.
const hexPts = [];
for (let i = 0; i <= 6; i++) {
  const a = Math.PI / 6 + (i * Math.PI) / 3;
  hexPts.push(new THREE.Vector3(Math.cos(a) * HEX * 0.95, 0, Math.sin(a) * HEX * 0.95));
}
const hoverMarker = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints(hexPts),
  new THREE.LineBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.9, depthTest: false })
);
hoverMarker.renderOrder = 20;
hoverMarker.visible = false;
scene.add(hoverMarker);

const PATH_MAX = 200;
const pathDots = new THREE.InstancedMesh(
  new THREE.CircleGeometry(0.55, 8).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({
    color: 0x9fd8ff, transparent: true, opacity: 0.65, depthTest: false,
    blending: THREE.AdditiveBlending,
  }),
  PATH_MAX
);
pathDots.renderOrder = 19;
pathDots.count = 0;
scene.add(pathDots);
const dotDummy = new THREE.Object3D();
let lastPathSig = '';

function refreshPathDots() {
  const path = player.path;
  const sig = path.length ? path[0] + ':' + path.length : '';
  if (sig === lastPathSig) return;
  lastPathSig = sig;
  const n = Math.min(path.length, PATH_MAX);
  for (let i = 0; i < n; i++) {
    const h = world.hexes.get(path[i]);
    const p = Hx.toWorld(h.q, h.r, HEX);
    dotDummy.position.set(p.x, (h.baseY || 0) + (h.kind === 'isle' ? h.elev : 0) + 0.45, p.z);
    dotDummy.updateMatrix();
    pathDots.setMatrixAt(i, dotDummy.matrix);
  }
  pathDots.count = n;
  if (n) pathDots.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------- picking
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function hexKeyAt(clientX, clientY) {
  pointer.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  // fogged regions' tiles are zero-scaled (unhittable); fogged gate
  // doorways must be filtered out by hand
  const hits = raycaster.intersectObjects(
    [built.waterMesh, built.isleMesh,
      ...built.portHitboxes.filter((hb) => world.areas[hb.userData.areaId].discovered)],
    false
  );
  if (!hits.length) return null;
  const hit = hits[0];
  if (hit.object.userData.hexKey) return hit.object.userData.hexKey;
  const keys = hit.object === built.waterMesh ? built.waterKeys : built.isleKeys;
  return keys[hit.instanceId] ?? null;
}

controls.onClick = (x, y) => {
  if (run.dead) return;
  if (cutscene.advance()) return; // clicks progress the cutscene dialogue
  const key = hexKeyAt(x, y);
  if (!key) return;
  if (!player.requestMove(key)) {
    flashLocation('✦ the currents do not reach there ✦');
  }
};

// hover labels
let hoverCooldown = 0;
addEventListener('pointermove', (e) => {
  if (hoverCooldown > 0) return;
  hoverCooldown = 0.08;
  if (cutscene.active) {
    ui.hideHover();
    hoverMarker.visible = false;
    return;
  }
  const key = hexKeyAt(e.clientX, e.clientY);
  if (!key) {
    ui.hideHover();
    hoverMarker.visible = false;
    return;
  }
  const hex = world.hexes.get(key);
  const hp = Hx.toWorld(hex.q, hex.r, HEX);
  hoverMarker.position.set(hp.x, (hex.baseY || 0) + (hex.kind === 'isle' ? hex.elev : 0) + 0.2, hp.z);
  hoverMarker.visible = true;
  const area = areaOf(hex);
  const b = area.biome;
  let text;
  if (hex.gateId !== null) {
    const gate = world.gates[hex.gateId];
    if (gate.wardId !== undefined && !world.wards[gate.wardId].dispelled) {
      text = 'the gate is dark ᛫ the storm denies it';
    } else {
      text = announcedGates.has(gate.id)
        ? `${gate.name} ${gate.rune.ch} ᛫ step in to be cast across`
        : toRunes(gate.name) + ' ' + gate.rune.ch;
    }
  } else if (hex.wardId !== undefined && !world.wards[hex.wardId].dispelled) {
    text = 'a stormheart shard crackles ᛫ seize it';
  } else if (hex.shrineRole === 'stone') {
    text = 'a teleportation stone hums ᛫ step in';
  } else if (hex.shrineRole === 'pad') {
    text = 'the way back down';
  } else if (hex.shrineRole === 'altar') {
    text = world.shrines[hex.shrineId].claimed
      ? 'a spent altar'
      : 'an astral altar ᛫ its trial sleeps, its gift does not';
  } else if (hex.spring) {
    text = 'a healing spring rises here';
  } else if (hex.kind === 'water') {
    text = area.discovered ? b.water.name : toRunes(b.water.name);
  } else {
    text = area.discovered ? b.area : toRunes(b.area);
  }
  ui.hover(text, e.clientX, e.clientY);
});

// ---------------------------------------------------------------- storm strikes
// From ring 2 outward, wandering lightning stalks whichever region holds the
// wisp: a hex glows and crackles for a beat, then the bolt lands.
const strikes = { next: 10, live: [] };

function updateStrikes(t, dt) {
  const curArea = world.areas[world.hexes.get(player.hexKey).areaId];
  const dread = Math.min(1, curArea.biome.dread ?? 0);
  if (curArea.ring >= 2 && t > strikes.next && !run.dead && !cutscene.active) {
    strikes.next = t + 8 - 5 * dread + Math.random() * 3;
    const keys = curArea.hexKeys;
    const key = keys[(Math.random() * keys.length) | 0];
    const h = world.hexes.get(key);
    if (!h.baseY) { // the shrines hang above the weather
      const p = Hx.toWorld(h.q, h.r, HEX);
      const y = h.kind === 'isle' ? h.elev : 0;
      const warn = new THREE.Mesh(
        new THREE.RingGeometry(1.5, 2.4, 18).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({
          color: 0xaeb8ff, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      warn.position.set(p.x, y + 0.15, p.z);
      warn.renderOrder = 6;
      scene.add(warn);
      strikes.live.push({ key, impact: t + 0.95, warn, bolt: null, struck: false, fade: 0.3 });
    }
  }
  for (let i = strikes.live.length - 1; i >= 0; i--) {
    const s = strikes.live[i];
    if (!s.struck) {
      const left = s.impact - t;
      if (left > 0) {
        s.warn.material.opacity = 0.2 + 0.6 * (1 - left / 0.95) * (0.5 + 0.5 * Math.sin(t * 26));
      } else {
        s.struck = true;
        const h = world.hexes.get(s.key);
        const p = Hx.toWorld(h.q, h.r, HEX);
        const y = h.kind === 'isle' ? h.elev : 0;
        s.bolt = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.16, 64, 6, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0xdfe6ff, transparent: true, opacity: 0.95,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
          })
        );
        s.bolt.position.set(p.x, y + 32, p.z);
        s.bolt.renderOrder = 6;
        scene.add(s.bolt);
        if (player.hexKey === s.key) damage(1, 'ᚢ ✦ the storm finds you');
      }
    } else {
      s.fade -= dt;
      const u = Math.max(0, s.fade / 0.3);
      if (s.bolt) s.bolt.material.opacity = u * 0.95;
      s.warn.material.opacity = u * 0.6;
      if (s.fade <= 0) {
        scene.remove(s.warn);
        if (s.bolt) scene.remove(s.bolt);
        strikes.live.splice(i, 1);
      }
    }
  }
}

// ---------------------------------------------------------------- heart sprites
// Rare gentle sprites drifting over discovered seas; sail onto one to mend
// half a heart.
const heartGeo = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.85);
  shape.bezierCurveTo(-1.15, 0.1, -0.95, 0.95, -0.45, 0.95);
  shape.bezierCurveTo(-0.12, 0.95, 0, 0.7, 0, 0.5);
  shape.bezierCurveTo(0, 0.7, 0.12, 0.95, 0.45, 0.95);
  shape.bezierCurveTo(0.95, 0.95, 1.15, 0.1, 0, -0.85);
  return new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false });
})();
const heartGlowTex = makeGlowSpriteTexture();
const heartDrops = [];
let nextHeartAt = 26;

function spawnHeartDrop() {
  const cands = world.areas.filter((a) => a.discovered && !a.asteroid);
  if (!cands.length) return;
  const area = cands[(Math.random() * cands.length) | 0];
  const waters = area.hexKeys.filter((k) => {
    const h = world.hexes.get(k);
    return h.kind === 'water' && !h.hazard;
  });
  if (!waters.length) return;
  const key = waters[(Math.random() * waters.length) | 0];
  const h = world.hexes.get(key);
  const p = Hx.toWorld(h.q, h.r, HEX);
  const g = new THREE.Group();
  const m = new THREE.Mesh(heartGeo, new THREE.MeshBasicMaterial({ color: 0xff8fa8 }));
  m.scale.setScalar(0.85);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: heartGlowTex, color: 0xff9ab8, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.setScalar(4.2);
  glow.renderOrder = 3;
  g.add(m, glow);
  g.position.set(p.x, 1.9, p.z);
  scene.add(g);
  heartDrops.push({ g, key, born: clockTime, phase: Math.random() * 9 });
}

function updateHeartDrops(t, dt) {
  if (t > nextHeartAt) {
    nextHeartAt = t + 16 + Math.random() * 10;
    if (heartDrops.length < 3) spawnHeartDrop();
  }
  for (let i = heartDrops.length - 1; i >= 0; i--) {
    const hd = heartDrops[i];
    hd.g.rotation.y += dt * 1.2;
    hd.g.position.y = 1.9 + Math.sin(t * 1.5 + hd.phase) * 0.35;
    const caught = player.hexKey === hd.key && !player.blast && !run.dead;
    if (caught) {
      if (heal(1) > 0) flashLocation('♥ ✦ a stray heart mends you ✦');
    }
    if (caught || t - hd.born > 90) {
      scene.remove(hd.g);
      heartDrops.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------- keys
addEventListener('keydown', (e) => {
  if (e.key === 'f' || e.key === 'F') controls.focus(player.mesh.position);
  if (e.key === 'r' || e.key === 'R') {
    const s = Math.random().toString(36).slice(2, 8).toUpperCase();
    location.search = '?seed=' + s;
  }
  if (e.key === 'h' || e.key === 'H') ui.showHint();
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// dev/debug handle (also used by automated smoke tests)
window.__astral = { world, player, controls, built, cutscene, run, damage, heal };

// ---------------------------------------------------------------- opening
ui.setSeed(seed, world.title);
ui.renderHearts(run.halves, run.maxHalves);
ui.fadeHintLater();
const startArea = areaOf(world.hexes.get(world.startKey));
lastAreaId = startArea.id;
discoverArea(startArea, false); // home is known from the first breath — no cutscene
setLocationFor(world.hexes.get(world.startKey));
setTimeout(() => ui.announce(world.title, `${toRunes('the astral reaches')} ᛫ seed ${seed}`, 5200), 600);

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  clockTime = t;
  hoverCooldown -= dt;

  // the sun breathes — the tide of the whole system
  const breath = 0.5 + 0.5 * Math.sin(t * 0.15);

  built.animate(t, dt, breath);
  player.update(dt, scene, t);
  updateLabels(dt);
  refreshPathDots();
  hoverMarker.material.opacity = 0.55 + 0.35 * Math.sin(t * 4);

  // lingering on a live hazard hurts too (the invulnerability window paces it)
  if (!run.dead && !player.blast && !cutscene.active) {
    const h = world.hexes.get(player.hexKey);
    if (h?.hazard?.kind === 'geyser' && built.geyserErupting(player.hexKey, t)) {
      damage(1, '✦ the geyser catches you full ✦');
    } else if (h?.hazard?.kind === 'maw' && built.mawSnapping(player.hexKey, t)) {
      damage(1, '✦ the maw bloom bites ✦');
    }
  }
  updateStrikes(t, dt);
  updateHeartDrops(t, dt);
  // the wisp blinks through its invulnerability window
  player.mesh.visible = run.dead || t >= run.invulnUntil || Math.sin(t * 34) > -0.35;

  // gentle follow while sailing or mid-blast, unless the player is steering
  // or a cutscene owns the camera (follow the ground shadow — lifted to the
  // platform's altitude when the wisp rides a shrine blast)
  if (player.isMoving && !cutscene.active
    && performance.now() / 1000 - controls.lastPanTime > 2.5) {
    const baseHex = world.hexes.get(player.blast?.destKey ?? player.hexKey);
    controls.focus(new THREE.Vector3(
      player.mesh.position.x, baseHex?.baseY || 0, player.mesh.position.z
    ));
  }
  cutscene.update(dt);
  if (locOverrideUntil && t > locOverrideUntil) {
    locOverrideUntil = 0;
    setLocationFor(world.hexes.get(player.hexKey));
  }

  // labels swell as you soar out, so the orrery view stays a readable star-chart
  const areaZoom = THREE.MathUtils.clamp(controls.dist / 300, 1, 4.2);
  for (const l of built.labelsByArea.values()) {
    const b = l.sprite.userData.baseScale;
    l.sprite.scale.set(b * areaZoom, b * areaZoom * 0.25, 1);
  }
  const gateZoom = THREE.MathUtils.clamp(controls.dist / 300, 1, 2.0);
  for (const labels of built.labelsByGate.values()) {
    for (const l of labels) {
      const b = l.sprite.userData.baseScale;
      l.sprite.scale.set(b * gateZoom, b * gateZoom * 0.25, 1);
    }
  }

  controls.update(dt);
  composer.render();
}
frame();
