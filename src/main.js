// Astral Reaches — runic cosmic world map, Paper-Craft Cutout edition.
// An Orb-Weaver's Wheel of ring-rivers and spokes, hex archipelagos at the
// crossings, riverflight gates between paired ports, and a friendly pastel
// cosmos full of leviathans, comets, and secrets.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { toRunes } from './config.js';
import * as Hx from './hexmath.js';
import { Rng } from './rng.js';
import { generateWorld } from './worldgen.js';
import { buildWorld } from './buildWorld.js';
import { AstralControls } from './controls.js';
import { Player } from './player.js';
import { ui } from './ui.js';
import { updateLabels } from './labels.js';
import { findPath } from './pathfind.js';

// ---------------------------------------------------------------- setup
const params = new URLSearchParams(location.search);
const seed = params.get('seed') || 'AETHERION';

const world = generateWorld(seed);
const buildRng = new Rng(seed + ':build');

const BG = 0x2e3158; // warm deep twilight-blue

const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.FogExp2(BG, 0.0004);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.5, 7000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('app').appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.3, 0.4, 0.85);
composer.addPass(bloom);

// paper-craft lighting: bright and even, one warm key from the hearthstar
scene.add(new THREE.AmbientLight(0xdfe2ff, 0.8));
scene.add(new THREE.HemisphereLight(0xfff2dd, 0x8a90c9, 0.5));
const sunLight = new THREE.PointLight(0xffe3b0, 1.3, 0, 0);
sunLight.position.set(0, 40, 0);
scene.add(sunLight);
const rim = new THREE.DirectionalLight(0xfff6e6, 0.7);
rim.position.set(300, 500, 200);
scene.add(rim);

const built = buildWorld(world, buildRng);
scene.add(built.group);

const player = new Player(world);
scene.add(player.mesh);

const controls = new AstralControls(renderer.domElement, camera);
controls.target.copy(player.mesh.position);
controls.dist = 120;

// ---------------------------------------------------------------- state
const announcedGates = new Set();
let suppressGateKey = null; // the port we just landed on — don't bounce back
let locOverrideUntil = 0;
let clockTime = 0;

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
  built.labelsByArea.get(area.id)?.decipher();
  built.wobbleBody(area.id);
  if (loud) {
    const sub = area.secret ? `${area.biome.body} ᛫ a secret held by the dark` : area.biome.body;
    ui.announce(area.biome.area, sub);
  }
}

function handleLockStrike(hex) {
  const lock = world.locks[hex.lockKey];
  if (!lock || lock.unlocked) return;
  const k = Hx.key(hex.q, hex.r);
  if (lock.struck.has(k)) return;
  lock.struck.add(k);
  built.dimKeyStone(lock.id, k);

  if (lock.kind === 'stormwall') {
    lock.unlocked = true;
    for (const wk of lock.wallKeys) {
      world.hexes.get(wk).blocked = false;
      built.updateFlags(wk);
    }
    built.releaseLock(lock.id);
    ui.announce(`The Rune of ${lock.rune.name} Cracks`, `${lock.rune.ch} ᛫ the stormwall calms`);
  } else if (lock.kind === 'rumor') {
    if (lock.struck.size >= lock.keyKeys.length) {
      lock.unlocked = true;
      for (const wk of lock.wallKeys) {
        const wh = world.hexes.get(wk);
        wh.blocked = false;
        wh.faint = false;
        built.updateFlags(wk);
      }
      built.releaseLock(lock.id);
      ui.announce('The Hollow Moon Answers', 'ᛟ ᛫ a path ignites across the dark');
    } else {
      ui.announce(
        `A Rumor Rune Ignites`,
        `${lock.rune.ch} ᛫ ${lock.struck.size} of ${lock.keyKeys.length} whispers gathered`
      );
    }
  }
}

function handleGate(hex, hexKey) {
  const gate = world.gates[hex.gateId];
  const destKey = gate.portA === hexKey ? gate.portB : gate.portA;
  const fp = findPath(world.hexes, hexKey, destKey);
  if (!fp) {
    flashLocation('ᚺ ✦ a stormwall chokes the crossing ✦ seek its rune-stone');
    return;
  }
  if (!announcedGates.has(gate.id)) {
    announcedGates.add(gate.id);
    for (const l of built.labelsByGate.get(gate.id) ?? []) l.decipher();
    ui.announce(gate.name, `${gate.rune.ch} ᛫ the warden stirs, and the river carries you`);
  } else {
    flashLocation(`✦ riding ${gate.name.replace(/^The /, 'the ')} ✦`, 2200);
  }
  suppressGateKey = destKey;
  built.boingGate(gate.id);
  player.startFlight(fp);
}

player.onEnterHex = (hex) => {
  const k = Hx.key(hex.q, hex.r);
  if (suppressGateKey && k !== suppressGateKey) suppressGateKey = null;
  const area = areaOf(hex);
  if (!area.discovered) discoverArea(area);
  setLocationFor(hex);
  if (hex.kind === 'isle') built.bounceIsle(k);
  if (hex.lockKey !== null) handleLockStrike(hex);
  if (hex.gateId !== null && k !== suppressGateKey) handleGate(hex, k);
};

// ---------------------------------------------------------------- picking
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function hexKeyAt(clientX, clientY) {
  pointer.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(
    [built.waterMesh, built.isleMesh, ...built.portHitboxes], false
  );
  if (!hits.length) return null;
  const hit = hits[0];
  if (hit.object.userData.hexKey) return hit.object.userData.hexKey;
  const keys = hit.object === built.waterMesh ? built.waterKeys : built.isleKeys;
  return keys[hit.instanceId] ?? null;
}

controls.onClick = (x, y) => {
  const key = hexKeyAt(x, y);
  if (!key) return;
  const hex = world.hexes.get(key);
  if (hex.blocked) {
    flashLocation('ᚺ ✦ a stormwall bars the way ✦ seek its rune-stone');
    return;
  }
  if (!player.requestMove(key)) {
    flashLocation('✦ the currents do not reach there ✦');
  }
};

// hover labels
let hoverCooldown = 0;
addEventListener('pointermove', (e) => {
  if (hoverCooldown > 0) return;
  hoverCooldown = 0.08;
  const key = hexKeyAt(e.clientX, e.clientY);
  if (!key) { ui.hideHover(); return; }
  const hex = world.hexes.get(key);
  const area = areaOf(hex);
  const b = area.biome;
  let text;
  if (hex.gateId !== null) {
    const gate = world.gates[hex.gateId];
    text = announcedGates.has(gate.id)
      ? `${gate.name} ${gate.rune.ch} ᛫ step through to ride`
      : toRunes(gate.name) + ' ' + gate.rune.ch;
  } else if (hex.blocked) {
    text = 'a stormwall rages';
  } else if (hex.lockKey !== null && !world.locks[hex.lockKey].unlocked) {
    text = `a rune-stone hums ᛫ ${world.locks[hex.lockKey].rune.ch}`;
  } else if (hex.kind === 'water') {
    text = area.discovered ? b.water.name : toRunes(b.water.name);
  } else {
    text = area.discovered ? b.area : toRunes(b.area);
  }
  ui.hover(text, e.clientX, e.clientY);
});

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
window.__astral = { world, player, controls };

// ---------------------------------------------------------------- opening
ui.setSeed(seed, world.title);
ui.fadeHintLater();
const startArea = areaOf(world.hexes.get(world.startKey));
startArea.discovered = true;
built.labelsByArea.get(startArea.id)?.decipher();
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

  // gentle follow while sailing or flying, unless the player is steering
  if (player.isMoving && performance.now() / 1000 - controls.lastPanTime > 2.5) {
    controls.focus(player.mesh.position);
  }
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
