// Astral Reaches — runic cosmic world map, Paper-Craft Cutout edition.
// An Orb-Weaver's Wheel of ring-rivers and spokes, hex archipelagos at the
// crossings, riverflight gates between paired ports, and a friendly pastel
// cosmos full of leviathans, comets, and secrets.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import {
  HEX, RINGS, toRunes, INTRO_LINES, SHARD_LINES, WARD_LINES, LODE_LINES, HERMITS,
  WARDENS,
} from './config.js';
import * as Hx from './hexmath.js';
import { Rng } from './rng.js';
import { generateWorld } from './worldgen.js';
import { buildWorld } from './buildWorld.js';
import { makeGlowSpriteTexture } from './materials.js';
import { AstralControls } from './controls.js';
import { Player } from './player.js';
import { Cutscene } from './cutscene.js';
import { ui } from './ui.js';
import { makeLabel, updateLabels } from './labels.js';
import { Combat } from './combat.js';
import { makeEnemy, makeWardenEnemy, BESTIARY } from './enemies.js';
import {
  freshMods, computeStats, applyItem, rollDrop, rollRelic, ITEMS, RELICS,
  POOL_COUNTS,
} from './items.js';
import { meta, ACHIEVEMENTS } from './meta.js';
import { creatureCanvas, makePaperFigure, wardenCanvas, itemDataUrl } from './sprites.js';

// ---------------------------------------------------------------- setup
const params = new URLSearchParams(location.search);
const seed = params.get('seed') || 'AETHERION';

const world = generateWorld(seed);
const buildRng = new Rng(seed + ':build');

const BG = 0x14172e; // dark cosmic indigo with a papery warmth

const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.FogExp2(BG, 0.00023);

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
built.setTrackTarget(player.mesh.position); // Ophthal watches the wisp

const controls = new AstralControls(renderer.domElement, camera);
controls.target.copy(player.mesh.position);
controls.dist = 120;

const cutscene = new Cutscene(controls);

// how far the locked camera may zoom out: just beyond the current region
function zoomCapFor(area) {
  return Math.max(150, area.hexRadius * HEX * Hx.SQRT3 * 2.6 + 70);
}

// ---------------------------------------------------------------- state
const announcedGates = new Set();
let suppressGateKey = null; // the teleporter we just landed on — don't bounce back
let locOverrideUntil = 0;
let clockTime = 0;
let lastAreaId = -1;
const springRested = new Set(); // waystation springs already used this visit

// ---------------------------------------------------------------- the run
// Three papercraft hearts, halved. Lose the last half and the run ends —
// rogue death: the next cosmos grows from a fresh seed. A ward-charm (from
// a gift market, hermit, or fallen star) eats one hit in your stead; a
// bounty voucher buys a boon at any market.
// ringReached: the deepest ring the wisp has ascended to. Ascension gates
// fire ONCE and only outward — everything sunward of ringReached is lost to
// this run, so timed events stop spawning there.
const run = {
  maxHalves: 6, halves: 6, invulnUntil: -1, dead: false, charm: 0, voucher: 0,
  ringReached: 0,
  // Round 11 — the roguelike layer: item mods fold into derived stats,
  // taken ids leave the pool, one relic rides the belt, kills charge it
  mods: freshMods(), stats: {}, items: [], taken: new Set(),
  relic: null, relicTaken: new Set(), transmute: false, kills: 0,
  // Round 12 — STARDUST: coin shaken from felled foes, spent at the
  // bazaar pedestals (bounty vouchers still buy one ware free)
  stardust: 0,
};
computeStats(run);
meta.bump('runs');

function damage(n = 1, note = '', { hazard = false } = {}) {
  if (run.dead || cutscene.active || player.blast || teleport.active || combat.active) return;
  if (clockTime < run.invulnUntil) return;
  // trained feet: hazard bites can be shrugged off outright
  if (hazard && Math.random() < run.stats.hazardGuard) {
    flashLocation('✦ you slip the bite untouched ✦', 1800);
    return;
  }
  run.invulnUntil = clockTime + 1.15;
  if (run.charm > 0) {
    run.charm -= 1;
    ui.renderCharm(run.charm);
    ui.hurt();
    flashLocation('ᛉ ✦ the ward-charm shatters in your stead ✦', 2400);
    return;
  }
  run.halves = Math.max(0, run.halves - n);
  ui.renderHearts(run.halves, run.maxHalves);
  ui.hurt();
  if (note) flashLocation(note, 2200);
  if (run.halves <= 0) die();
}

// A boon: mend a heart if hurt, else a ward-charm, else nothing is consumed.
function grantBoon(what) {
  if (run.halves < run.maxHalves) {
    heal(2);
    ui.announce('A Gift Freely Given', `♥ ᛫ ${what} mends you`);
    return true;
  }
  if (run.charm < 1) {
    run.charm = 1;
    ui.renderCharm(run.charm);
    ui.announce('A Gift Freely Given', 'ᛉ ᛫ a ward-charm — it will eat the next bite');
    return true;
  }
  flashLocation('✦ you want for nothing ᛫ the gift keeps ✦', 2400);
  return false;
}

function heal(n) {
  if (run.dead) return 0;
  const before = run.halves;
  run.halves = Math.min(run.maxHalves, run.halves + n);
  if (run.halves !== before) ui.renderHearts(run.halves, run.maxHalves);
  return run.halves - before;
}

function die() {
  if (run.dead) return;
  run.dead = true;
  meta.bump('deaths');
  player.path = [];
  ui.hideDialogue();
  ui.hideItemCard();
  ui.hideChoice();
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

// Claiming a stormheart shard ARMS the ascension gate: the crystal flies to
// the crown's socket and the veil ignites — but the stormfront HOLDS until
// the gate is actually used. (The launch is the dispelling.)
function handleShardClaim(hex) {
  const ward = world.wards[hex.wardId];
  if (!ward || ward.dispelled) return;
  ward.dispelled = true;
  const gate = world.gates[ward.gateId];
  for (const l of built.labelsByGate.get(gate.id) ?? []) l.decipher();
  built.claimShard(ward.id, () => {
    built.igniteGate(gate.id);
    built.boingGate(gate.id);
  });
  const ph = world.hexes.get(gate.portA);
  const pp = Hx.toWorld(ph.q, ph.r, HEX);
  cutscene.startDiscovery({
    title: `${gate.name} Is Armed`,
    sub: `${gate.rune.ch} ᛫ the crown takes the stormheart`,
    lines: SHARD_LINES[ward.boundary] ?? SHARD_LINES[SHARD_LINES.length - 1],
    focus: new THREE.Vector3(pp.x, 7, pp.z),
    dist: 56,
    homeOf: () => new THREE.Vector3(player.mesh.position.x, 0, player.mesh.position.z),
  });
}

// ---------------------------------------------------------------- rock chains
// Hops may only begin from a chain node (the launch springboard, a hop-rock,
// the dock, or a shrine pad). Clicking any node of the same chain hops the
// wisp rock to rock toward it.
let pendingHops = [];

function tryHop(currentHex, currentKey, targetKey) {
  if (currentHex.chainId === undefined) return false;
  const chain = world.chains[currentHex.chainId];
  if (!chain || chain.hidden) return false;
  const nodes = chain.nodes;
  const ci = nodes.indexOf(currentKey);
  const ti = nodes.indexOf(targetKey);
  if (ci === -1 || ti === -1 || ti === ci) return false;
  const step = ti > ci ? 1 : -1;
  pendingHops = [];
  for (let i = ci + step; i !== ti + step; i += step) pendingHops.push(nodes[i]);
  hopNext();
  return true;
}

function hopNext() {
  const next = pendingHops.shift();
  if (next) player.startBlast(next, 'hop');
}

// The starlit lodestone: wakes its shrine chain — rocks heave up out of the
// dark, launch-side first, while the cutscene watches.
function handleLodestone(hex) {
  const chain = world.chains[hex.lodeChain];
  if (!chain || !chain.hidden) return;
  chain.hidden = false;
  for (const nk of chain.nodes) {
    const nh = world.hexes.get(nk);
    nh.blocked = false;
    nh.hiddenChain = false;
  }
  built.claimLodestone(chain.id, () => built.revealChain(chain.id));
  const lh = world.hexes.get(chain.nodes[0]);
  const lp = Hx.toWorld(lh.q, lh.r, HEX);
  const ph = world.hexes.get(chain.nodes[chain.nodes.length - 1]);
  const pp = Hx.toWorld(ph.q, ph.r, HEX);
  cutscene.startDiscovery({
    title: 'The Rocks Remember the Sky',
    sub: 'ᛚ ᛫ a way opens, stone by stone',
    lines: LODE_LINES,
    focus: new THREE.Vector3((lp.x + pp.x) / 2, (ph.baseY || 0) * 0.45, (lp.z + pp.z) / 2),
    dist: 120,
    homeOf: () => new THREE.Vector3(player.mesh.position.x, 0, player.mesh.position.z),
  });
}

// ---------------------------------------------------------------- the bazaar
// Round 12: markets SELL. Each bazaar's three pedestals stock items from the
// run's pool, tier-priced in stardust; the trader haggles through the item
// card. A pedestal is never stood on — only clicked from an adjacent tile.
const STARDUST_PRICES = { common: 8, rare: 14, superrare: 22, legendary: 30 };
const TRADER_LINES = [
  'found it drifting past the third ring, cold as a promise',
  'a fair price for a thing that wants to be yours',
  'the void gives, the void takes — I merely arrange the meeting',
  'no refunds ᛫ the currents keep what they are given',
  'careful — that one hums when the storm is close',
];

// roll every bazaar's stock once, at world-wake (no duplicate wares between
// markets; bought ids leave the run's pool as if taken)
function rollMarketStock() {
  const stocked = new Set();
  for (const chain of world.chains) {
    if (chain.kind !== 'market' || !chain.pedestalKeys) continue;
    chain.stock = [];
    chain.pedestalKeys.forEach((pk, i) => {
      const taken = new Set([...run.taken, ...stocked]);
      const item = rollDrop({ luck: run.stats.luck, tierBoost: 0, taken });
      if (!item) { chain.stock.push(null); return; }
      stocked.add(item.id);
      chain.stock.push({ item, price: STARDUST_PRICES[item.tier] ?? 10, sold: false });
      built.stockPedestal(chain.id, i, item.tint);
      void pk;
    });
  }
}

function gainStardust(n) {
  if (n <= 0) return;
  run.stardust += n;
  ui.renderStardust(run.stardust);
}

// clicking a pedestal from an adjacent tile opens the trader's sale prompt
function tryPedestal(hex) {
  const chain = world.chains[hex.chainId];
  const entry = chain?.stock?.[hex.pedestal];
  const cur = world.hexes.get(player.hexKey);
  if (!cur || Hx.dist(cur.q, cur.r, hex.q, hex.r) > 1 || player.isMoving) {
    flashLocation('✦ step beside the pedestal to bargain ✦', 2200);
    return;
  }
  if (!entry || entry.sold) {
    flashLocation('✦ a bare pedestal ᛫ its ware is gone ✦', 2200);
    return;
  }
  const item = entry.item;
  const free = run.voucher > 0;
  const canPay = free || run.stardust >= entry.price;
  const patter = TRADER_LINES[(chain.id + hex.pedestal) % TRADER_LINES.length];
  ui.itemCard(
    {
      name: item.name, tier: item.tier, desc: item.desc, dataUrl: itemDataUrl(item),
      note: free
        ? `“${patter}” ᛫ your bounty voucher covers it`
        : `“${patter}” ᛫ ${entry.price} ✦ stardust (you carry ${run.stardust})`,
      takeLabel: free ? '✦ redeem the voucher ✦'
        : canPay ? `✦ buy ᛫ ${entry.price} ✦` : `⊘ ${entry.price} ✦ needed`,
      leaveLabel: 'walk away',
    },
    () => {
      if (!canPay) {
        flashLocation('⊘ your pouch is too light ᛫ the peddler tuts', 2400);
        return;
      }
      if (free) {
        run.voucher -= 1;
        refreshBountyLine();
      } else {
        run.stardust -= entry.price;
        ui.renderStardust(run.stardust);
      }
      entry.sold = true;
      built.claimPedestal(chain.id, hex.pedestal);
      const inst = applyItem(run, item);
      applyInstant(inst);
      meta.bump('itemsTaken');
      refreshStatsUi();
      applyStatsToOverworld();
      ui.announce('A Bargain Struck', `✦ ᛫ ${item.name} is yours`);
    },
    () => {}
  );
}

function handleHermit(hex) {
  const chain = world.chains[hex.chainId];
  if (!chain) return;
  const hermit = HERMITS[chain.hermit ?? 0];
  if (!chain.visited) {
    chain.visited = true;
    if (run.halves < run.maxHalves) heal(2);
    else if (run.charm < 1) { run.charm = 1; ui.renderCharm(run.charm); }
  }
  const hp = Hx.toWorld(hex.q, hex.r, HEX);
  cutscene.startDiscovery({
    title: hermit.name,
    sub: '᛫ a hermit of the void ᛫',
    lines: hermit.lines,
    focus: new THREE.Vector3(hp.x, (hex.baseY || 0) + 3, hp.z),
    dist: 28,
    homeOf: () => new THREE.Vector3(
      player.mesh.position.x,
      world.hexes.get(player.hexKey)?.baseY || 0,
      player.mesh.position.z
    ),
  });
}

// ---------------------------------------------------------------- bounties
// The cartographer posts one landmark bounty per unlocked ring; honoring it
// banks a boon redeemable at any gift market.
const bounty = { active: null };

function refreshBountyLine() {
  if (bounty.active) ui.setBounty(`bounty ᛫ set foot on ${bounty.active.text}`);
  else if (run.voucher > 0) ui.setBounty(`✶ ${run.voucher} voucher${run.voucher > 1 ? 's' : ''} ᛫ any bazaar pedestal honors it`);
  else ui.setBounty('');
}

function newBounty(ring) {
  const cands = world.areas.filter((a) =>
    a.ring === ring && !a.asteroid && !a.secret && built.landmarkSpots.has(a.id));
  if (!cands.length) { bounty.active = null; refreshBountyLine(); return; }
  const area = cands[(Math.random() * cands.length) | 0];
  bounty.active = {
    ring, areaId: area.id,
    hexKey: built.landmarkSpots.get(area.id),
    text: area.biome.landmark.name,
  };
  refreshBountyLine();
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
  // the fountain runs dry: water darkens, jets die, the guardian bows
  built.exhaustSpring(hex.areaId, true);
  if (heal(2) > 0) ui.announce('The Fountain Mends You', '✦ the guardian pours ᛫ rest, traveler');
  else flashLocation('✦ the fountain murmurs — you are already whole ✦');
}

// ---------------------------------------------------------------- combat (Round 11)
// Fights are a zoomed papercraft diorama staged over the encounter hex —
// see combat.js. Main owns the triggers (a roamer sharing your tile, an
// elder's challenge, a warden's causeway threshold), the rewards (drops
// from the 500-item pool, relics from the wardens), and the meta tallies.

let combatInvulnUntil = -1;
function combatDamage(n, note) {
  if (run.dead) return 'dead';
  if (clockTime < combatInvulnUntil) return 'hit';
  combatInvulnUntil = clockTime + 0.35;
  if (run.charm > 0) {
    run.charm -= 1;
    ui.renderCharm(run.charm);
    ui.hurt();
    flashLocation('ᛉ ✦ the ward-charm shatters in your stead ✦', 2000);
    return 'charm';
  }
  run.halves = Math.max(0, run.halves - n);
  ui.renderHearts(run.halves, run.maxHalves);
  ui.hurt();
  if (note) flashLocation(note, 1800);
  if (run.halves <= 0) {
    die();
    return 'dead';
  }
  return 'hit';
}

// instant item payloads: heals, charms, heart containers
function applyInstant(inst) {
  if (!inst) return;
  if (inst.setMaxHalves) {
    run.maxHalves = inst.setMaxHalves;
    run.halves = Math.min(run.halves, run.maxHalves);
  }
  if (inst.containers) {
    run.maxHalves = Math.max(2, Math.min(24, run.maxHalves + inst.containers));
    run.halves = Math.min(run.halves, run.maxHalves);
  }
  ui.renderHearts(run.halves, run.maxHalves);
  if (inst.heal) heal(inst.heal);
  if (inst.charm && run.charm < 1) {
    run.charm = 1;
    ui.renderCharm(run.charm);
  }
}

function refreshStatsUi() {
  ui.statsLine(run.stats, run.items.length);
}

function applyStatsToOverworld() {
  player.speedMul = run.stats.stepSpeed;
}

function refreshRelicUi() {
  if (!run.relic) {
    ui.relicSlot(null);
    return;
  }
  const d = run.relic.def;
  ui.relicSlot({
    name: d.name, desc: d.desc, charge: run.relic.charge, cd: d.cd,
    dataUrl: itemDataUrl({ id: d.id, tier: 'legendary', glyph: d.glyph, tint: d.tint }),
  });
}

// a drop is always OPTIONAL — the card offers, the pilgrim decides
function offerItem(tierBoost, done, excluded = new Set()) {
  const taken = new Set([...run.taken, ...excluded]);
  const item = rollDrop({ luck: run.stats.luck, tierBoost, taken });
  if (!item) { done(); return; }
  ui.itemCard(
    { name: item.name, tier: item.tier, desc: item.desc, dataUrl: itemDataUrl(item) },
    () => {
      const inst = applyItem(run, item);
      applyInstant(inst);
      meta.bump('itemsTaken');
      refreshStatsUi();
      applyStatsToOverworld();
      done();
    },
    () => {
      // a gambler's refusal shakes the pool once more
      if (run.stats.flags.gambler && !excluded.size) {
        excluded.add(item.id);
        offerItem(tierBoost, done, excluded);
      } else done();
    }
  );
}

function offerRelic(done) {
  const r = rollRelic({ taken: run.relicTaken });
  if (!r) { done(); return; }
  ui.itemCard(
    {
      name: r.name, tier: 'relic',
      desc: `${r.desc} ᛫ recharges after ${r.cd} fallen foes ᛫ fired with Q`,
      dataUrl: itemDataUrl({ id: r.id, tier: 'legendary', glyph: r.glyph, tint: r.tint }),
      takeLabel: '✦ claim the relic ✦', leaveLabel: 'refuse it',
    },
    () => {
      run.relic = { def: r, charge: r.cd }; // it wakes charged
      run.relicTaken.add(r.id);
      refreshRelicUi();
      done();
    },
    () => done()
  );
}

let activeBoss = null; // the world.wardens entry while a boss fight runs

function onCombatVictory({ enemy, boss, flawless }) {
  run.kills += 1;
  meta.bump('kills');
  // stardust shakes loose from every felled foe — coin for the bazaars
  const dust = 2 + (enemy.ring ?? 0) + (enemy.elite ? 2 : 0) + (boss ? 8 : 0);
  gainStardust(dust);
  flashLocation(`✦ +${dust} stardust shakes loose ✦`, 2400);
  // a warden's fall unlocks deeper tiers BEFORE its spoils are rolled
  if (boss && activeBoss) meta.setMax('wardens', activeBoss.boundary + 1);
  if (run.relic && run.relic.charge < run.relic.def.cd) {
    run.relic.charge += 1;
    refreshRelicUi();
  }
  if (flawless) meta.award('untouched');
  if (boss && flawless) meta.award('flawless');
  if (Math.random() < run.stats.lifesteal) heal(1);
  const boost = (boss ? 2 : enemy.elite ? 1 : 0) + (run.transmute ? 1 : 0);
  run.transmute = false;
  const chance = boss || enemy.elite ? 1 : 0.4 + run.stats.luck * 0.04;
  const wrap = () => afterVictory(boss, enemy);
  if (boss && !run.relic) offerRelic(() => offerItem(boost, wrap));
  else if (Math.random() < chance) offerItem(boost, wrap);
  else {
    // now and then a felled foe coughs up a voltspark for the relic
    if (run.relic && run.relic.charge < run.relic.def.cd && Math.random() < 0.15) {
      run.relic.charge = run.relic.def.cd;
      refreshRelicUi();
      flashLocation('✦ a voltspark leaps into your relic ᛫ it hums, ready ✦', 2600);
    }
    wrap();
  }
}

function afterVictory(boss, enemy) {
  combat.finish();
  if (boss && activeBoss) {
    wardenFalls(activeBoss);
    activeBoss = null;
  } else {
    ui.announce('The Way Is Clear', `✦ ᛫ the ${enemy.name.toLowerCase()} comes apart like wet paper`);
  }
}

function wardenFalls(warden) {
  warden.defeated = true;
  const gate = world.gates[warden.gateId];
  for (const k of warden.blockedKeys) {
    const h = world.hexes.get(k);
    if (h) h.blocked = false;
  }
  built.openThreshold(gate.id);
  meta.setMax('wardens', warden.boundary + 1);
  const w = WARDENS[warden.boundary];
  const ah = world.hexes.get(warden.arenaKey);
  const ap = Hx.toWorld(ah.q, ah.r, HEX);
  cutscene.startDiscovery({
    title: `${w.name} Yields`,
    sub: `${w.title} ᛫ the ward-lattice falls`,
    lines: w.defeat,
    focus: new THREE.Vector3(ap.x, 4, ap.z),
    dist: 46,
    homeOf: () => new THREE.Vector3(player.mesh.position.x, 0, player.mesh.position.z),
  });
}

const combat = new Combat({
  scene, controls, run, cui: ui,
  hooks: {
    damagePlayer: combatDamage,
    healPlayer: heal,
    onVictory: onCombatVictory,
    onDefeat: () => {},
    announce: (t2, s2) => ui.announce(t2, s2),
    flash: flashLocation,
    onRelicUsed: refreshRelicUi,
    onStrike: (res) => {
      if (res.swift) meta.bump('swiftCasts');
      if (res.perfect) meta.bump('perfectBars');
    },
  },
});

// ---------------------------------------------------------------- roamers
// Paper beasts drifting through discovered regions. Round 12: they HUNT —
// a beast that spots the pilgrim within its sight radius steps toward them,
// on a cadence that starts well below sail speed in the early rings and
// quickens with depth. Rings 0-1 beasts are WATER-BOUND: they never set
// foot on an isle, so land is safe ground early. Sharing a tile begins
// combat outright; an ELDER (challenger) holds its ground and asks first —
// a floating choice, Isaac-style optional.
const roamers = { list: [], nextSpawn: 16 };
const CHASE_RADIUS = 6;

function hexTopY(h) {
  return (h.baseY || 0) + (h.kind === 'isle' ? h.elev : 0);
}

function roamerCanvas(area, elite) {
  const b = area.biome;
  const spec = BESTIARY[b.key] ?? BESTIARY.shatterreef;
  return creatureCanvas({
    id: b.key + (elite ? ':elite' : ''),
    painter: spec.painter,
    base: elite ? b.island.top2 : b.island.top,
    dark: b.island.side,
    eye: b.island.glow,
  });
}

function roamerHexOk(h, areaId, waterOnly = false) {
  return h && h.areaId === areaId && !h.blocked && !h.hazard && !h.baseY
    && (!waterOnly || h.kind === 'water')
    && h.gateId === null && h.wardId === undefined && h.chainId === undefined
    && h.lodeChain === undefined && !h.spring && !h.springStone && !h.teleporter
    && h.thresholdGate === undefined && h.causewayGate === undefined && !h.stillmoon
    && !h.court;
}

// the next single step of a hunt: shortest legal road to the pilgrim's hex,
// or failing that (they are ashore and the beast is water-bound), the legal
// neighbor that closes the gap — the beast paces the shoreline
function chaseStep(r, h, ph) {
  const goalK = Hx.key(ph.q, ph.r);
  const allowed = (nk) => {
    const nh = world.hexes.get(nk);
    if (!nh || nh.areaId !== r.areaId || nh.blocked) return false;
    // the pilgrim's own hex is a legal destination (that's the ambush) as
    // long as the terrain rule holds
    if (nk === goalK) return !r.waterOnly || nh.kind === 'water';
    return roamerHexOk(nh, r.areaId, r.waterOnly);
  };
  const seen = new Set();
  const queue = []; // [q, r, firstStepKey]
  for (const d of Hx.DIRS) {
    const nq = h.q + d[0], nr = h.r + d[1];
    const nk = Hx.key(nq, nr);
    if (!allowed(nk)) continue;
    seen.add(nk);
    queue.push([nq, nr, nk]);
  }
  for (let qi = 0; qi < queue.length && qi < 160; qi++) {
    const [cq, cr, first] = queue[qi];
    if (Hx.key(cq, cr) === goalK) return first;
    if (Hx.dist(cq, cr, ph.q, ph.r) > CHASE_RADIUS + 3) continue;
    for (const d of Hx.DIRS) {
      const nq = cq + d[0], nr = cr + d[1];
      const nk = Hx.key(nq, nr);
      if (seen.has(nk) || !allowed(nk)) continue;
      seen.add(nk);
      queue.push([nq, nr, first]);
    }
  }
  let best = null, bd = Hx.dist(h.q, h.r, ph.q, ph.r);
  for (const d of Hx.DIRS) {
    const nq = h.q + d[0], nr = h.r + d[1];
    const nk = Hx.key(nq, nr);
    if (!roamerHexOk(world.hexes.get(nk), r.areaId, r.waterOnly)) continue;
    const nd = Hx.dist(nq, nr, ph.q, ph.r);
    if (nd < bd) { bd = nd; best = nk; }
  }
  return best;
}

function spawnRoamer() {
  const cands = world.areas.filter((a) =>
    a.discovered && !a.teleport && a.ring >= run.ringReached
    && roamers.list.filter((r) => r.areaId === a.id).length < (a.ring === 0 ? 1 : 3));
  if (!cands.length) return;
  const area = cands[(Math.random() * cands.length) | 0];
  const startHex = world.hexes.get(world.startKey);
  const waterOnly = area.ring <= 1; // early beasts never leave the sea
  const keys = area.hexKeys.filter((k) => {
    const h = world.hexes.get(k);
    if (!roamerHexOk(h, area.id, waterOnly) || k === player.hexKey) return false;
    if (area.ring === 0 && Hx.dist(h.q, h.r, startHex.q, startHex.r) < 6) return false;
    const ph = world.hexes.get(player.hexKey);
    return Hx.dist(h.q, h.r, ph.q, ph.r) > 3; // never materialize on top of the wisp
  });
  if (!keys.length) return;
  const key = keys[(Math.random() * keys.length) | 0];
  const elite = area.ring >= 1 && Math.random() < 0.16;
  const spec = BESTIARY[area.biome.key] ?? BESTIARY.shatterreef;
  const fig = makePaperFigure(roamerCanvas(area, elite), {
    height: elite ? 3.2 : 2.5, glow: area.biome.island.glow, glowScale: 1.4,
  });
  const h = world.hexes.get(key);
  const p = Hx.toWorld(h.q, h.r, HEX);
  fig.position.set(p.x, hexTopY(h) + 0.25, p.z);
  scene.add(fig);
  roamers.list.push({
    fig, hexKey: key, areaId: area.id, elite, waterOnly,
    // hunt cadence: rings 0-1 lumber far below sail speed, deep rings close in
    stepEvery: Math.max(0.55, 1.6 - 0.25 * area.ring),
    name: elite ? `Elder ${spec.name}` : spec.name,
    nextMove: clockTime + 2 + Math.random() * 3,
    phase: Math.random() * 9, prompted: false,
  });
}

function removeRoamer(r) {
  scene.remove(r.fig);
  r.fig.traverse((o) => { o.material?.dispose?.(); });
  const i = roamers.list.indexOf(r);
  if (i >= 0) roamers.list.splice(i, 1);
}

function startCombatWith(roamer) {
  if (combat.active || bossFx.active || cutscene.active || teleport.active
    || launch.active || run.dead || player.blast) return;
  if (mapFx.active) exitChart();
  ui.hideHover();
  ui.hideChoice();
  hoverMarker.visible = false;
  player.path = [];
  const area = world.areas[roamer.areaId];
  const enemy = makeEnemy(area, { elite: roamer.elite });
  const h = world.hexes.get(player.hexKey);
  const wp = new THREE.Vector3(
    player.mesh.position.x, hexTopY(h) + 6.5, player.mesh.position.z
  );
  removeRoamer(roamer);
  combat.start({ enemy, worldPos: wp, biome: area.biome, boss: false });
}

function updateRoamers(t, dt) {
  if (!run.dead && t > roamers.nextSpawn) {
    roamers.nextSpawn = t + 7 + Math.random() * 6;
    if (roamers.list.length < 22) spawnRoamer();
  }
  const busy = combat.active || bossFx.active || cutscene.active
    || teleport.active || launch.active || run.dead;
  const ph = world.hexes.get(player.hexKey);
  for (const r of roamers.list) {
    const h = world.hexes.get(r.hexKey);
    const p = Hx.toWorld(h.q, h.r, HEX);
    const wantY = hexTopY(h) + 0.25 + Math.sin(t * 1.8 + r.phase) * 0.22;
    r.fig.position.x += (p.x - r.fig.position.x) * Math.min(1, dt * 3.2);
    r.fig.position.z += (p.z - r.fig.position.z) * Math.min(1, dt * 3.2);
    r.fig.position.y += (wantY - r.fig.position.y) * Math.min(1, dt * 4);
    if (!r.elite && t > r.nextMove && !busy) {
      // the hunt: within sight, step toward the pilgrim at the beast's own
      // cadence; otherwise drift as before
      const chasing = h.areaId === ph.areaId && !player.blast
        && Hx.dist(h.q, h.r, ph.q, ph.r) <= CHASE_RADIUS;
      r.nextMove = t + (chasing ? r.stepEvery : 2.5 + Math.random() * 2.5);
      let stepKey = chasing ? chaseStep(r, h, ph) : null;
      if (!stepKey && !chasing) {
        const dirs = Hx.DIRS.filter((d) =>
          roamerHexOk(world.hexes.get(Hx.key(h.q + d[0], h.r + d[1])), r.areaId, r.waterOnly));
        if (dirs.length) {
          const d = dirs[(Math.random() * dirs.length) | 0];
          stepKey = Hx.key(h.q + d[0], h.r + d[1]);
        }
      }
      if (stepKey) r.hexKey = stepKey;
    }
    if (busy) continue;
    // sharing a tile is a fight, no questions asked
    if (r.hexKey === player.hexKey && !player.blast) {
      startCombatWith(r);
      break;
    }
    // an elder challenges from the next tile over — and takes an answer
    if (r.elite) {
      const d = Hx.dist(ph.q, ph.r, h.q, h.r);
      if (d === 1 && !r.prompted && !ui.choiceOpen && !player.isMoving) {
        r.prompted = true;
        ui.choice(`the ${r.name.toLowerCase()} bars its ground ᛫ answer its challenge?`, [
          { label: '⚔ fight', cb: () => startCombatWith(r) },
          { label: 'step back', cb: () => {} },
        ]);
      } else if (d > 2) {
        r.prompted = false;
      }
    }
  }
}

// ---------------------------------------------------------------- warden thresholds
// Crossing a causeway's boss-gate: the camera pans to the arena between the
// threshold and the travel gate, a burst of light reveals the warden and its
// name — then the fight begins in earnest.
const bossFx = {
  active: false, phase: 'off', t: 0, warden: null, gate: null,
  fig: null, arenaPos: null, spoke2: false,
};

function handleThreshold(hex) {
  const gate = world.gates[hex.thresholdGate];
  const warden = gate ? world.wardens[gate.wardenId] : null;
  if (!warden || warden.defeated || bossFx.active || combat.active) return;
  player.path = [];
  ui.hideHover();
  hoverMarker.visible = false;
  bossFx.active = true;
  bossFx.phase = 'pan';
  bossFx.t = 0;
  bossFx.warden = warden;
  bossFx.gate = gate;
  bossFx.spoke2 = false;
  const ah = world.hexes.get(warden.arenaKey);
  const ap = Hx.toWorld(ah.q, ah.r, HEX);
  bossFx.arenaPos = new THREE.Vector3(ap.x, (ah.elev ?? 0) + 0.3, ap.z);
  ui.announce('The Causeway Shudders', 'ᚺ ᛫ something vast takes its post ahead');
}

function updateBossIntro(dt) {
  if (!bossFx.active) return;
  bossFx.t += dt;
  const c = controls;
  c._focusTo = null;
  c.target.lerp(bossFx.arenaPos, 1 - Math.exp(-dt * 3));
  c.dist += (36 - c.dist) * Math.min(1, dt * 2.4);
  c.pitch += (0.6 - c.pitch) * Math.min(1, dt * 2);
  const w = WARDENS[bossFx.warden.boundary];
  if (bossFx.phase === 'pan' && bossFx.t > 1.5) {
    bossFx.phase = 'reveal';
    bossFx.t = 0;
    built.burstAt(bossFx.arenaPos.clone().add(new THREE.Vector3(0, 3.5, 0)), w.tint, 18);
    bossFx.fig = makePaperFigure(wardenCanvas(bossFx.warden.boundary, w.tint, w.tint2, w.eye), {
      height: 6.5, glow: w.eye, glowScale: 1.6,
    });
    bossFx.fig.position.copy(bossFx.arenaPos);
    bossFx.fig.scale.setScalar(0.01);
    scene.add(bossFx.fig);
    ui.bossIntro(w.name, w.title);
    ui.dialogue(w.intro[0]);
  } else if (bossFx.phase === 'reveal') {
    bossFx.fig.scale.lerp(new THREE.Vector3(1, 1, 1), 1 - Math.exp(-dt * 5));
    if (bossFx.t > 1.6 && !bossFx.spoke2) {
      bossFx.spoke2 = true;
      ui.dialogue(w.intro[1]);
    }
    if (bossFx.t > 3.4) {
      ui.hideBossIntro();
      ui.hideDialogue();
      scene.remove(bossFx.fig);
      bossFx.fig.traverse((o) => { o.material?.dispose?.(); });
      bossFx.fig = null;
      activeBoss = bossFx.warden;
      const enemy = makeWardenEnemy(bossFx.warden.boundary);
      combat.start({
        enemy,
        worldPos: bossFx.arenaPos.clone().add(new THREE.Vector3(0, 4.8, 0)),
        biome: world.areas[bossFx.warden.areaId].biome,
        boss: true,
      });
      bossFx.active = false;
    }
  }
}

meta.onAward((key, a) => {
  ui.announce(`Unlocked ᛫ ${a.name}`, `✶ ᛫ ${a.desc} ᛫ deeper curios join the pool`);
  void key;
});

// ---------------------------------------------------------------- gate flight
// The wisp no longer tumbles bodily through the void: a gate blast fires a
// BEAM OF LIGHT along the flight path — the orbit's arc for ring crossings,
// a straight lance for radial ones — with an orb of light (the wisp,
// unmade for the crossing) riding it. The camera follows the orb.
const flight = { active: false, beam: null, orb: null, idx: 0, fade: 0, launch: false };

function startFlightBeam(isLaunch = false) {
  endFlightBeam();
  if (!player.blast) return;
  const pts = [];
  for (let i = 0; i <= 64; i++) pts.push(player.blastPointAt(i / 64, new THREE.Vector3()));
  // end-to-end framing: a bounding sphere of the whole path lets the camera
  // hold the beam in view from doorway to doorway while the orb flies
  const center = new THREE.Box3().setFromPoints(pts).getCenter(new THREE.Vector3());
  let radius = 0;
  for (const p of pts) radius = Math.max(radius, center.distanceTo(p));
  flight.frameCenter = center;
  flight.frameDist = THREE.MathUtils.clamp(radius * 2.5, 200, 4200);
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, 96, isLaunch ? 1.15 : 0.5, 7, false);
  const beam = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: isLaunch ? 0xdfe6ff : 0xb89aff, transparent: true,
    opacity: isLaunch ? 0.7 : 0.5, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide,
  }));
  beam.renderOrder = 6;
  scene.add(beam);
  const orb = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(isLaunch ? 1.15 : 0.75, 12, 9),
    new THREE.MeshBasicMaterial({ color: 0xfff6e0 })
  );
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: heartGlowTex, color: isLaunch ? 0xdfe6ff : 0xb89aff, transparent: true,
    opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.setScalar(isLaunch ? 12 : 7);
  glow.renderOrder = 6;
  orb.add(core, glow, new THREE.PointLight(isLaunch ? 0xdfe6ff : 0xb89aff, 60, 60, 1.8));
  orb.position.copy(player.mesh.position);
  scene.add(orb);
  flight.active = true;
  flight.beam = beam;
  flight.orb = orb;
  flight.idx = geo.index.count;
  flight.fade = 0;
  flight.launch = isLaunch;
  geo.setDrawRange(0, 1);
}

function endFlightBeam() {
  if (flight.beam) {
    scene.remove(flight.beam);
    flight.beam.geometry.dispose();
    flight.beam.material.dispose();
  }
  if (flight.orb) scene.remove(flight.orb);
  flight.beam = flight.orb = null;
  flight.active = false;
}

function updateFlight(dt) {
  if (!flight.active) return;
  if (player.blast) {
    flight.orb.position.copy(player.mesh.position);
    flight.beam.geometry.setDrawRange(
      0, Math.floor(flight.idx * Math.min(1, player.blast.t * 1.12 + 0.05))
    );
  } else {
    // arrived: the beam gutters out and the orb folds back into the wisp
    flight.fade += dt;
    const u = 1 - Math.min(1, flight.fade / 0.8);
    flight.beam.material.opacity = (flight.launch ? 0.7 : 0.5) * u;
    flight.orb.scale.setScalar(Math.max(0.001, u));
    flight.orb.position.copy(player.mesh.position);
    if (u <= 0) endFlightBeam();
  }
}

// ---------------------------------------------------------------- ascension
// Using an armed ascension gate is the point of no return: the crystal is
// SPENT, the launch beam carries the orb outward, and the stormfront rolls
// back while it flies. There is no way back through.
const launch = { active: false, lines: null, shown: 0 };

function startAscension(gate, hexKey) {
  const ward = world.wards[gate.wardId];
  gate.spent = true;
  built.setGateCrystal(gate.id, 'spent');
  const frontier = ward.boundary + 1;
  world.progress.frontier = frontier;
  run.ringReached = Math.max(run.ringReached, frontier);
  meta.setMax('bestRing', frontier);
  newBounty(frontier); // the cartographer posts the next ring's errand
  const destKey = gate.portB;
  suppressGateKey = destKey;
  announcedGates.add(gate.id);
  for (const l of built.labelsByGate.get(gate.id) ?? []) l.decipher();
  built.boingGate(gate.id);
  ui.announce('The Stormfront Breaks', `${gate.rune.ch} ᛫ ${gate.name.replace(/^The /, 'the ')} spends its heart`);
  player.startBlast(destKey, 'line', { durMul: 1.7 });
  startFlightBeam(true);
  built.setStormFrontier(frontier); // the maelstrom eases while the orb flies
  launch.active = true;
  launch.lines = WARD_LINES[ward.boundary] ?? WARD_LINES[WARD_LINES.length - 1];
  launch.shown = 1;
  ui.dialogue(launch.lines[0]);
  void hexKey;
}

function handleGate(hex, hexKey) {
  const gate = world.gates[hex.gateId];
  if (gate.wardId !== undefined && !world.wards[gate.wardId].dispelled) {
    flashLocation('ᚺ ✦ the gate is dark ✦ its crown hungers for a stormheart', 2600);
    return;
  }
  if (gate.boundary !== undefined) {
    if (hexKey === gate.portB) {
      flashLocation('ᚺ ✦ the way back is sealed ✦ the storm admits no return', 2600);
      return;
    }
    if (gate.spent) {
      flashLocation('✦ the crown is spent ✦ this gate will not fire again', 2400);
      return;
    }
    startAscension(gate, hexKey);
    return;
  }
  const destKey = gate.portA === hexKey ? gate.portB : gate.portA;
  if (!announcedGates.has(gate.id)) {
    announcedGates.add(gate.id);
    for (const l of built.labelsByGate.get(gate.id) ?? []) l.decipher();
    ui.announce(gate.name, `${gate.rune.ch} ᛫ the warden stirs — the beam takes you`);
  } else {
    flashLocation(`✦ cast through ${gate.name.replace(/^The /, 'the ')} ✦`, 2200);
  }
  suppressGateKey = destKey;
  built.boingGate(gate.id);
  player.startBlast(destKey, gate.kind === 'ring' ? 'arc' : 'line');
  startFlightBeam(false);
}

// ---------------------------------------------------------------- star chart
// The free camera: a UI-toggled orrery view. The wisp cannot be steered
// while it is open; the regions wear space-chart labels — name, orbit,
// body — runic where the chart is still blank.
const cam = { mode: 'locked' };
const camFocus = new THREE.Vector3();
const mapFx = { active: false, sprites: [], you: null };
// the chart's own machinery: auto-glide, swollen hover-reactive bodies
const CHART_HOME = new THREE.Vector3(0, 0, 0);
const CHART_DIST = 3400;
const chartFx = { bodies: [], hitboxes: [], hovered: -1, easing: false, openedPerf: 0 };
const chartHitMat = new THREE.MeshBasicMaterial();
// teleport selection: violet-lit bodies on the current orbit are the picker
const tpSelect = { active: false, ring: 0, dests: [], fx: [] };

function chartScaleFor(area) {
  const b = area.biome;
  if (b.bodyKind === 'sun') return 2.5;
  if (b.bodyKind === 'rubble') return 5;
  return 6;
}

function buildMapLabels() {
  const romans = ['·', 'I', 'II', 'III', 'IV', '✧'];
  for (const area of world.areas) {
    const b = area.biome;
    const disc = !!area.discovered;
    let sub;
    if (area.ring === 0) sub = disc ? `the heart ᛫ ${b.body}` : 'the heart ᛫ unknown';
    else if (area.secret) sub = disc ? `the far dark ᛫ ${b.body}` : 'the far dark ᛫ a rumor';
    else if (area.teleport) sub = `orbit ${romans[area.ring]} ᛫ teleport concourse`;
    else if (area.asteroid) sub = `orbit ${romans[area.ring]} ᛫ waystation`;
    else sub = disc ? `orbit ${romans[area.ring]} ᛫ ${b.body}` : `orbit ${romans[area.ring]} ᛫ uncharted`;
    // screen-space labels: constant on-screen size, readable from the full
    // orrery zoom (scale is a fraction of the viewport height)
    const label = makeLabel({
      title: disc ? b.area : toRunes(b.area),
      sub,
      color: disc ? '#ffe3b0' : '#8f9ac2',
      subColor: disc ? '#9fd8ff' : '#6f7aa6',
      scale: area.asteroid ? 0.17 : 0.23,
      screenSpace: true,
    });
    const y = (b.bodyKind === 'sun' ? 20 : b.bodySize + 7)
      + b.bodySize * chartScaleFor(area) + 16;
    label.sprite.position.set(area.pos.x, y, area.pos.z);
    scene.add(label.sprite);
    mapFx.sprites.push(label.sprite);
  }
  const you = makeLabel({ title: '✦ your wisp ✦', color: '#ffe9c4', scale: 0.14, screenSpace: true });
  scene.add(you.sprite);
  mapFx.sprites.push(you.sprite);
  mapFx.you = you.sprite;
}

function destroyMapLabels() {
  for (const s of mapFx.sprites) {
    scene.remove(s);
    s.material.map?.dispose();
    s.material.dispose();
  }
  mapFx.sprites = [];
  mapFx.you = null;
}

function clearTpSelect() {
  for (const o of tpSelect.fx) {
    scene.remove(o);
    o.material?.dispose?.();
    o.geometry?.dispose?.();
  }
  tpSelect.fx = [];
  tpSelect.active = false;
  tpSelect.dests = [];
}

function enterChart() {
  if (mapFx.active || cutscene.active || teleport.active || run.dead || player.isMoving
    || combat.active || bossFx.active) return false;
  mapFx.active = true;
  cam.mode = controls.mode = 'free';
  controls.maxDist = 4400;
  ui.setChartActive(true);
  ui.hideHover();
  for (const l of built.labelsByArea.values()) l.sprite.visible = false;
  buildMapLabels();
  // the chart glides out to the full orrery by itself (until it arrives,
  // or the user takes over the pan) — completion-based, not timed, so it
  // finishes at any frame rate
  chartFx.easing = true;
  chartFx.openedPerf = performance.now() / 1000;
  chartFx.hovered = -1;
  chartFx.bodies = [];
  chartFx.hitboxes = [];
  for (const area of world.areas) {
    if (!area.discovered) continue;
    const g = built.bodyGroups.get(area.id);
    if (!g) continue;
    chartFx.bodies.push({ areaId: area.id, g, y0: g.position.y, f: chartScaleFor(area) });
    // a generous invisible bubble makes each swollen body easy to hover
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(45, area.biome.bodySize * chartScaleFor(area) * 1.25), 8, 6),
      chartHitMat
    );
    hit.visible = false;
    hit.position.copy(g.position);
    hit.userData.areaId = area.id;
    scene.add(hit);
    chartFx.hitboxes.push(hit);
  }
  return true;
}

function exitChart() {
  if (!mapFx.active) return;
  mapFx.active = false;
  cam.mode = controls.mode = 'locked';
  ui.setChartActive(false);
  ui.hideTeleport();
  ui.hideHover();
  destroyMapLabels();
  clearTpSelect();
  for (const b of chartFx.bodies) {
    b.g.scale.setScalar(1);
    b.g.position.y = b.y0;
  }
  chartFx.bodies = [];
  for (const h of chartFx.hitboxes) {
    scene.remove(h);
    h.geometry.dispose();
  }
  chartFx.hitboxes = [];
  chartFx.hovered = -1;
  for (const area of world.areas) {
    if (!area.discovered) continue;
    const l = built.labelsByArea.get(area.id);
    if (l) l.sprite.visible = true;
  }
  controls.focus(player.mesh.position);
}

function toggleChart() {
  if (mapFx.active) exitChart();
  else enterChart();
}

// ---------------------------------------------------------------- teleportation
// The concourse stone: opens the chart with the ring's visited islands
// listed. Choosing one runs the crossing — a beam takes the wisp skyward,
// the camera pans the orbit, and a second beam sets it down on the
// destination's spring stone beneath the astral body.
const teleport = { active: false, phase: null, t: 0, dest: null, stoneKey: null, beam: null, landed: false };
const panTarget = new THREE.Vector3();

function verticalBeam(x, z) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.4, 150, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xcfe8ff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  m.position.set(x, 75, z);
  m.renderOrder = 6;
  scene.add(m);
  return m;
}

function openTeleport(hex) {
  const area = areaOf(hex);
  if (!enterChart()) return;
  tpSelect.active = true;
  tpSelect.ring = area.ring;
  tpSelect.dests = world.areas.filter((a) =>
    a.ring === area.ring && !a.asteroid && !a.secret && a.discovered && a.springStoneKey);
  // the current orbit burns violet — those are the islands that answer
  const R = RINGS[area.ring - 1].radius;
  const band = new THREE.Mesh(
    new THREE.RingGeometry(R - 6, R + 6, 160).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: 0x8a76e6, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  band.position.y = 1.2;
  band.renderOrder = 4;
  scene.add(band);
  tpSelect.fx.push(band);
  for (const d of tpSelect.dests) {
    const g = built.bodyGroups.get(d.id);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: heartGlowTex, color: 0x9a86ff, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    halo.position.copy(g.position);
    halo.scale.setScalar(Math.max(70, d.biome.bodySize * chartScaleFor(d) * 3));
    halo.renderOrder = 4;
    scene.add(halo);
    tpSelect.fx.push(halo);
  }
  ui.showTeleportPrompt(
    tpSelect.dests.length
      ? 'the violet-lit islands answer ᛫ click one to cross'
      : 'no islands charted on this orbit yet',
    () => exitChart()
  );
}

function beginTeleportTo(dest) {
  exitChart();
  teleport.active = true;
  teleport.phase = 'up';
  teleport.t = 0;
  teleport.dest = dest;
  teleport.stoneKey = dest.springStoneKey;
  teleport.landed = false;
  teleport.beam = verticalBeam(player.mesh.position.x, player.mesh.position.z);
  built.burstAt(player.mesh.position.clone(), 0x9fd8ff, 8);
  ui.announce('The Stone Takes You', `✦ ᛫ crossing to ${dest.biome.area.replace(/^The /, 'the ')}`);
}

function updateTeleport(dt) {
  if (!teleport.active) return;
  teleport.t += dt;
  if (teleport.phase === 'up') {
    const u = Math.min(1, teleport.t / 0.7);
    teleport.beam.material.opacity = 0.85 * Math.sin(u * Math.PI);
    teleport.beam.scale.set(1 - u * 0.45, 1, 1 - u * 0.45);
    if (u >= 1) {
      scene.remove(teleport.beam);
      teleport.beam.geometry.dispose();
      teleport.beam.material.dispose();
      teleport.beam = null;
      teleport.phase = 'pan';
      teleport.t = 0;
    }
  } else if (teleport.phase === 'pan') {
    const sh = world.hexes.get(teleport.stoneKey);
    const sp = Hx.toWorld(sh.q, sh.r, HEX);
    panTarget.set(sp.x, 0, sp.z);
    controls._focusTo = null;
    controls.target.lerp(panTarget, 1 - Math.exp(-dt * 2.2));
    const cap = zoomCapFor(teleport.dest) * 0.75;
    controls.dist += (cap - controls.dist) * Math.min(1, dt * 2);
    if (controls.target.distanceTo(panTarget) < 10 || teleport.t > 3.4) {
      teleport.phase = 'down';
      teleport.t = 0;
      teleport.beam = verticalBeam(sp.x, sp.z);
    }
  } else if (teleport.phase === 'down') {
    const u = Math.min(1, teleport.t / 0.7);
    teleport.beam.material.opacity = 0.85 * Math.sin(u * Math.PI);
    if (u >= 0.45 && !teleport.landed) {
      teleport.landed = true;
      player.hexKey = teleport.stoneKey;
      player._syncToHex();
      built.burstAt(player.mesh.position.clone(), 0x9fd8ff, 8);
    }
    if (u >= 1) {
      scene.remove(teleport.beam);
      teleport.beam.geometry.dispose();
      teleport.beam.material.dispose();
      teleport.beam = null;
      teleport.active = false;
      player.onEnterHex(world.hexes.get(teleport.stoneKey));
    }
  }
}

// hops on and off a spring stone: the stone touches nothing, so the only
// way out (or back up) is a short leap to/from the nestling waters
function trySpringHop(cur, targetKey) {
  const th = world.hexes.get(targetKey);
  if (!th || th.blocked || player.blast) return false;
  const near = Hx.dist(cur.q, cur.r, th.q, th.r) <= 6 + run.stats.hopRange;
  if (!near) return false;
  if (cur.springStone && !th.baseY) {
    player.startBlast(targetKey, 'hop');
    return true;
  }
  if (th.springStone && !cur.baseY) {
    player.startBlast(targetKey, 'hop');
    return true;
  }
  return false;
}

player.onEnterHex = (hex) => {
  const k = Hx.key(hex.q, hex.r);
  // an ascension launch ends where the new ring begins
  if (launch.active && !player.blast) {
    launch.active = false;
    ui.hideDialogue();
  }
  if (suppressGateKey && k !== suppressGateKey) suppressGateKey = null;
  const area = areaOf(hex);
  if (area.id !== lastAreaId) {
    lastAreaId = area.id;
    if (springRested.has(area.id)) {
      springRested.delete(area.id); // springs re-arm on each fresh visit
      built.exhaustSpring(area.id, false); // the guardian lifts its head
    }
  }
  if (!area.discovered) discoverArea(area);
  setLocationFor(hex);
  if (hex.kind === 'isle') built.bounceIsle(k);
  // trapped hexes bite for half a heart
  if (hex.hazard?.kind === 'snare') {
    hex.hazard = null; // one-shot: the glyph burns out
    built.triggerSnare(k);
    damage(1, 'ᚦ ✦ a snare rune sears the sea-road', { hazard: true });
  } else if (hex.hazard?.kind === 'geyser' && built.geyserErupting(k, clockTime)) {
    damage(1, '✦ the geyser catches you full ✦', { hazard: true });
  } else if (hex.hazard?.kind === 'maw' && built.mawSnapping(k, clockTime)) {
    damage(1, '✦ the maw bloom bites ✦', { hazard: true });
  }
  if (hex.thresholdGate !== undefined) handleThreshold(hex);
  if (hex.wardId !== undefined) handleShardClaim(hex);
  if (hex.lodeChain !== undefined) handleLodestone(hex);
  if (hex.spring) handleSpring(hex);
  if (hex.teleporter) openTeleport(hex);
  if (hex.shrineRole === 'altar') handleAltar(hex);
  if (hex.chainRole === 'hermit') handleHermit(hex);
  if (bounty.active && k === bounty.active.hexKey) {
    bounty.active = null;
    run.voucher += 1;
    refreshBountyLine();
    ui.announce('Bounty Honored', '✶ ᛫ the cartographer credits you a voucher — any bazaar pedestal honors it');
  }
  if (merchantVisit.state === 'parked' && k === merchantVisit.hexKey) {
    grantBoon("the merchant's favor");
    departMerchant();
  }
  // mid-chain: keep hopping toward the clicked rock
  if (pendingHops.length && hex.chainId !== undefined) hopNext();
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
  if (run.dead || teleport.active || launch.active) return;
  if (combat.active) { combat.onClick(x, y, camera); return; }
  if (bossFx.active || ui.choiceOpen || ui.itemCardOpen) return;
  if (cutscene.advance()) return; // clicks progress the cutscene dialogue
  if (cam.mode === 'free') {
    // on the chart, a click may pick a violet-lit island to cross to
    if (tpSelect.active) {
      pointer.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(chartFx.hitboxes, false);
      if (hits.length) {
        const area = world.areas[hits[0].object.userData.areaId];
        if (tpSelect.dests.includes(area)) {
          beginTeleportTo(area);
          return;
        }
        flashLocation('✦ only the violet-lit islands answer the stone ✦', 2200);
      }
    }
    return; // otherwise the chart is for looking, not sailing
  }
  const key = hexKeyAt(x, y);
  if (!key) return;
  const cur = world.hexes.get(player.hexKey);
  if (key === player.hexKey) {
    if (cur?.teleporter) openTeleport(cur); // re-consult the stone underfoot
    return;
  }
  // bazaar pedestals are never walked on — only bargained with from beside
  const clicked = world.hexes.get(key);
  if (clicked?.chainRole === 'pedestal') {
    tryPedestal(clicked);
    return;
  }
  if (clicked?.chainRole === 'trader') {
    flashLocation('✦ the peddler minds the tent ᛫ the wares wait on the pedestals ✦', 2400);
    return;
  }
  if (!player.blast && cur && tryHop(cur, player.hexKey, key)) return;
  if (cur && trySpringHop(cur, key)) return;
  if (!player.requestMove(key)) {
    const th = world.hexes.get(key);
    if (th?.chainId !== undefined && !world.chains[th.chainId]?.hidden) {
      flashLocation('✦ hop the void-rocks from their springboard ✦');
    } else if (th?.springStone) {
      flashLocation('✦ the spring stone answers only nearby leaps ✦');
    } else {
      flashLocation('✦ the currents do not reach there ✦');
    }
  }
};

// hover labels: the label GLIDES with the cursor on every pointermove (a
// cheap transform write); only the raycast + text lookup is throttled, so
// nothing hops or lags
let hoverCooldown = 0;
addEventListener('pointermove', (e) => {
  ui.moveHover(e.clientX, e.clientY);
  if (hoverCooldown > 0) return;
  hoverCooldown = 0.06;
  if (cutscene.active || teleport.active || combat.active || bossFx.active) {
    ui.hideHover();
    hoverMarker.visible = false;
    return;
  }
  if (mapFx.active) {
    // the chart: hovering a charted body swells it (and names it)
    hoverMarker.visible = false;
    pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(chartFx.hitboxes, false);
    if (hits.length) {
      const area = world.areas[hits[0].object.userData.areaId];
      chartFx.hovered = area.id;
      const pickable = tpSelect.active && tpSelect.dests.includes(area);
      ui.hover(pickable ? `${area.biome.area} ᛫ click to cross` : area.biome.area);
    } else {
      chartFx.hovered = -1;
      ui.hideHover();
    }
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
      text = 'the great gate is dark ᛫ its crown hungers for a stormheart';
    } else if (gate.boundary !== undefined && key === gate.portB) {
      text = 'the way back is sealed ᛫ the storm admits no return';
    } else if (gate.boundary !== undefined && gate.spent) {
      text = 'a spent ascension gate ᛫ its crystal is ash';
    } else if (gate.boundary !== undefined) {
      text = `${gate.name} ${gate.rune.ch} ᛫ armed — step in to ascend ᛫ THERE IS NO WAY BACK`;
    } else {
      text = announcedGates.has(gate.id)
        ? `${gate.name} ${gate.rune.ch} ᛫ step in to ride the beam`
        : toRunes(gate.name) + ' ' + gate.rune.ch;
    }
  } else if (hex.thresholdGate !== undefined) {
    const wd = world.wardens[world.gates[hex.thresholdGate]?.wardenId];
    text = wd?.defeated
      ? 'the threshold stands open ᛫ the warden is paper on the wind'
      : 'a warden\'s threshold ᛫ cross it and the causeway will answer';
  } else if (hex.causewayGate !== undefined) {
    const wd = world.wardens[world.gates[hex.causewayGate]?.wardenId];
    text = wd?.defeated
      ? 'the warden causeway ᛫ the gate waits at its end'
      : 'a warden causeway ᛫ something vast keeps it';
  } else if (hex.teleporter) {
    text = 'the teleport stone ᛫ step into the temple to chart a crossing';
  } else if (hex.springStone) {
    text = 'a spring stone ᛫ leap to or from the nestling waters';
  } else if (hex.moonCore) {
    text = area.discovered ? 'the stillmoon’s heart' : toRunes('the stillmoon');
  } else if (hex.stillmoon) {
    text = area.discovered
      ? `a stillmoon of ${b.area.replace(/^The /, 'the ')}`
      : toRunes('a stillmoon');
  } else if (hex.wardId !== undefined && !world.wards[hex.wardId].dispelled) {
    text = 'a stormheart shard crackles ᛫ seize it';
  } else if (hex.lodeChain !== undefined && world.chains[hex.lodeChain]?.hidden) {
    text = 'a starlit lodestone hums ᛫ seize it';
  } else if (hex.chainRole === 'launch') {
    text = 'a springboard stone ᛫ click a rock to hop the void';
  } else if (hex.chainRole === 'hop') {
    text = 'a hop-rock adrift ᛫ leap along the chain';
  } else if (hex.chainRole === 'dock') {
    text = 'the dock stone ᛫ the chain home begins here';
  } else if (hex.chainRole === 'pedestal') {
    const bc = world.chains[hex.chainId];
    const entry = bc?.stock?.[hex.pedestal];
    text = !entry || entry.sold
      ? 'a bare pedestal ᛫ its ware is gone'
      : run.voucher > 0
        ? `${entry.item.name} ᛫ your voucher covers it ᛫ click from beside`
        : `${entry.item.name} ᛫ ${entry.price} ✦ stardust ᛫ click from beside`;
  } else if (hex.chainRole === 'trader') {
    text = 'the Curio Peddler ᛫ the wares wait on the pedestals';
  } else if (hex.chainRole === 'hermit') {
    text = 'a hermit of the void ᛫ approach';
  } else if (hex.chainId !== undefined && world.chains[hex.chainId]?.kind === 'market') {
    text = "the Curio Peddler's bazaar";
  } else if (hex.chainId !== undefined && world.chains[hex.chainId]?.kind === 'event') {
    text = "a hermit's curio, adrift";
  } else if (hex.shrineRole === 'pad') {
    text = 'the shrine platform ᛫ hop the chain down';
  } else if (hex.shrineRole === 'altar') {
    text = world.shrines[hex.shrineId].claimed
      ? 'a spent altar'
      : 'an astral altar ᛫ its trial sleeps, its gift does not';
  } else if (hex.spring) {
    text = springRested.has(hex.areaId)
      ? 'the fountain lies exhausted ᛫ its guardian bows'
      : 'a guardian fountain ᛫ drink and be mended';
  } else if (hex.kind === 'water') {
    text = area.discovered ? b.water.name : toRunes(b.water.name);
  } else {
    text = area.discovered ? b.area : toRunes(b.area);
  }
  ui.hover(text);
});

// ---------------------------------------------------------------- storm strikes
// From ring 2 outward, wandering lightning stalks whichever region holds the
// wisp: a hex glows and crackles for a beat, then the bolt lands. While a
// stormfront still stands, it occasionally SURGES into the frontier ring —
// a warning, then ten seconds of quickened strikes wherever the wisp sails.
const strikes = { next: 10, live: [] };
const surge = { next: 130, until: 0, areaId: -1 };

function updateStrikes(t, dt) {
  const curArea = world.areas[world.hexes.get(player.hexKey).areaId];
  const dread = Math.min(1, curArea.biome.dread ?? 0);
  if (t > surge.next && world.progress.frontier < world.wards.length
    && !run.dead && !cutscene.active && !combat.active) {
    surge.next = t + 90 + Math.random() * 60;
    if (curArea.ring === world.progress.frontier && curArea.discovered) {
      surge.until = t + 10;
      surge.areaId = curArea.id;
      flashLocation('ᚢ ✦ the stormfront SURGES ✦ ware the sky', 2800);
    }
  }
  const surging = t < surge.until && curArea.id === surge.areaId;
  if ((curArea.ring >= 2 || surging) && t > strikes.next && !run.dead
    && !cutscene.active && !combat.active) {
    strikes.next = t + (surging ? 1.1 : 8 - 5 * dread + Math.random() * 3);
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
        if (player.hexKey === s.key && !run.stats.flags.stormSoul) {
          damage(1, 'ᚢ ✦ the storm finds you', { hazard: true });
        }
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
  // only regions the wisp can still reach (ascension is one-way)
  const cands = world.areas.filter((a) => a.discovered && !a.asteroid && a.ring >= run.ringReached);
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

// ---------------------------------------------------------------- falling stars
// Every couple of minutes a star falls onto a discovered region: a streak,
// an impact glow, and a 60-second crash-light. Reach it in time for a mend —
// or, out in the dread rings, a ward-charm.
const stars = { next: 75, live: [] };

function spawnFallingStar() {
  const cands = world.areas.filter((a) => a.discovered && !a.asteroid && a.ring >= run.ringReached);
  if (!cands.length) return null;
  const area = cands[(Math.random() * cands.length) | 0];
  const keys = area.hexKeys.filter((k) => {
    const h = world.hexes.get(k);
    return !h.hazard && !h.baseY && h.gateId === null && h.wardId === undefined
      && h.chainId === undefined && h.lodeChain === undefined && !h.spring
      && !h.springStone && !h.court;
  });
  if (!keys.length) return null;
  const key = keys[(Math.random() * keys.length) | 0];
  const h = world.hexes.get(key);
  const p = Hx.toWorld(h.q, h.r, HEX);
  const y0 = h.kind === 'isle' ? h.elev : 0.3;
  const streak = new THREE.Sprite(new THREE.SpriteMaterial({
    map: heartGlowTex, color: 0xfff6e0, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  streak.scale.setScalar(7);
  streak.renderOrder = 6;
  streak.position.set(p.x + 80, 130, p.z + 50);
  scene.add(streak);
  const star = {
    key, area: area.id, x: p.x, z: p.z, y0,
    landAt: clockTime + 1.4, until: clockTime + 61.4,
    streak, marker: null, ring: null,
  };
  stars.live.push(star);
  return star;
}

function updateStars(t, dt) {
  if (!run.dead && t > stars.next) {
    stars.next = t + 100 + Math.random() * 60;
    spawnFallingStar();
  }
  for (let i = stars.live.length - 1; i >= 0; i--) {
    const s = stars.live[i];
    if (s.streak) {
      const u = Math.min(1, 1 - (s.landAt - t) / 1.4);
      s.streak.position.set(s.x + 80 * (1 - u), s.y0 + 130 * (1 - u) * (1 - u), s.z + 50 * (1 - u));
      if (u >= 1) {
        scene.remove(s.streak);
        s.streak = null;
        built.burstAt(new THREE.Vector3(s.x, s.y0 + 1, s.z), 0xfff6e0, 12);
        s.marker = new THREE.Sprite(new THREE.SpriteMaterial({
          map: heartGlowTex, color: 0xfff0c9, transparent: true, opacity: 0.7,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        s.marker.position.set(s.x, s.y0 + 1.2, s.z);
        s.marker.scale.setScalar(5);
        s.marker.renderOrder = 6;
        scene.add(s.marker);
        if (world.hexes.get(player.hexKey)?.areaId === s.area) {
          flashLocation('★ ✦ a star has fallen nearby ✦', 2600);
        }
      }
    } else if (s.marker) {
      s.marker.material.opacity = (0.45 + 0.3 * Math.sin(t * 3.2)) * Math.min(1, (s.until - t) / 8);
    }
    const caught = !s.streak && player.hexKey === s.key && !player.blast && !run.dead;
    if (caught) {
      const area = world.areas[s.area];
      if (area.ring >= 3 && run.charm < 1) {
        run.charm = 1;
        ui.renderCharm(run.charm);
        ui.announce('Starlight, Bottled', 'ᛉ ᛫ the fallen star hardens into a ward-charm');
      } else {
        heal(1);
        ui.announce('Starlight, Caught', '★ ᛫ half a heart mends in your hands');
      }
    }
    if (caught || t > s.until) {
      if (s.streak) scene.remove(s.streak);
      if (s.marker) scene.remove(s.marker);
      stars.live.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------- the merchant
// Now and then the merchant leviathan surfaces alongside a discovered
// region's rim, howdah lamp lit. Step onto the marked hex for its favor.
const merchantVisit = { next: 210, state: 'idle', hexKey: null, until: 0, marker: null };

function departMerchant() {
  merchantVisit.state = 'idle';
  merchantVisit.hexKey = null;
  if (merchantVisit.marker) {
    scene.remove(merchantVisit.marker);
    merchantVisit.marker = null;
  }
  built.merchant.depart();
}

function updateMerchant(t) {
  if (merchantVisit.state === 'idle' && t > merchantVisit.next && !run.dead) {
    merchantVisit.next = t + 220 + Math.random() * 90;
    const cands = world.areas.filter((a) => a.discovered && !a.asteroid && a.ring >= run.ringReached);
    if (!cands.length) return;
    const area = cands[(Math.random() * cands.length) | 0];
    const rims = area.hexKeys.filter((k) => {
      const h = world.hexes.get(k);
      if (h.kind !== 'water' || h.hazard || h.baseY) return false;
      for (const d of Hx.DIRS) {
        if (!world.hexes.has(Hx.key(h.q + d[0], h.r + d[1]))) return true;
      }
      return false;
    });
    if (!rims.length) return;
    const key = rims[(Math.random() * rims.length) | 0];
    const h = world.hexes.get(key);
    const p = Hx.toWorld(h.q, h.r, HEX);
    merchantVisit.state = 'coming';
    merchantVisit.hexKey = key;
    built.merchant.sendTo(p.x, p.z, () => {
      merchantVisit.state = 'parked';
      merchantVisit.until = clockTime + 120;
      merchantVisit.marker = new THREE.Sprite(new THREE.SpriteMaterial({
        map: heartGlowTex, color: 0xffd9a8, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      merchantVisit.marker.position.set(p.x, 2.2, p.z);
      merchantVisit.marker.scale.setScalar(5);
      merchantVisit.marker.renderOrder = 6;
      scene.add(merchantVisit.marker);
      ui.announce('A Horn Sounds Across the Void', '᛫ the merchant leviathan surfaces ᛫ seek its lamp');
    });
  } else if (merchantVisit.state === 'parked') {
    if (merchantVisit.marker) {
      merchantVisit.marker.material.opacity = 0.4 + 0.25 * Math.sin(t * 2.6);
    }
    if (t > merchantVisit.until) departMerchant();
  }
}

// ---------------------------------------------------------------- keys
addEventListener('keydown', (e) => {
  // combat and its overlays own the keyboard (typing spells hits every key)
  if (combat.active || bossFx.active || ui.itemCardOpen || ui.choiceOpen) return;
  if (e.key === 'f' || e.key === 'F') controls.focus(player.mesh.position);
  if (e.key === 'm' || e.key === 'M') toggleChart();
  if (e.key === 'Escape' && mapFx.active) exitChart();
  if (e.key === 'r' || e.key === 'R') {
    const s = Math.random().toString(36).slice(2, 8).toUpperCase();
    location.search = '?seed=' + s;
  }
  if (e.key === 'h' || e.key === 'H') ui.showHint();
});
ui.onChartClick(toggleChart);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// dev/debug handle (also used by automated smoke tests)
window.__astral = {
  world, player, controls, built, cutscene, run, damage, heal,
  combat, meta,
  debug: {
    spawnFallingStar, bounty, newBounty, merchantVisit, surge, grantBoon, tryHop,
    cam, mapFx, chartFx, tpSelect, enterChart, exitChart, toggleChart, openTeleport,
    beginTeleportTo, teleport, launch, flight, startAscension, trySpringHop,
    roamers, spawnRoamer, startCombatWith, bossFx, handleThreshold, wardenFalls,
    offerItem, offerRelic, onCombatVictory, ITEMS, RELICS, POOL_COUNTS,
    makeEnemy, makeWardenEnemy, ACHIEVEMENTS,
    tryPedestal, rollMarketStock, gainStardust, STARDUST_PRICES, handleSpring,
  },
};

// ---------------------------------------------------------------- opening
ui.setSeed(seed, world.title);
ui.renderHearts(run.halves, run.maxHalves);
ui.renderCharm(run.charm);
ui.renderStardust(run.stardust);
refreshStatsUi();
refreshRelicUi();
applyStatsToOverworld();
rollMarketStock(); // the bazaars lay out their wares for this run
newBounty(0); // the cartographer's first errand, close to home
const startArea = areaOf(world.hexes.get(world.startKey));
lastAreaId = startArea.id;
ui.fadeHintLater();
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
      damage(1, '✦ the geyser catches you full ✦', { hazard: true });
    } else if (h?.hazard?.kind === 'maw' && built.mawSnapping(player.hexKey, t)) {
      damage(1, '✦ the maw bloom bites ✦', { hazard: true });
    }
  }
  updateStrikes(t, dt);
  updateHeartDrops(t, dt);
  updateStars(t, dt);
  updateMerchant(t);
  updateFlight(dt);
  updateTeleport(dt);
  updateRoamers(t, dt);
  updateBossIntro(dt);
  combat.update(dt, camera);
  // the wisp blinks through its invulnerability window — and is absent
  // entirely while it rides a beam or a teleport crossing (or stands on
  // the combat stage as its papercraft self)
  player.mesh.visible = run.dead || t >= run.invulnUntil || Math.sin(t * 34) > -0.35;
  if ((flight.active && player.blast) || teleport.active || combat.active) player.mesh.visible = false;

  // camera: the locked mode pins the view to the wisp — except while a gate
  // beam flies, when it pulls back to FRAME THE BEAM END TO END, returning
  // to the locked view once the orb lands. Cutscenes, the teleport sequence,
  // combat, and the boss reveal steer for themselves; the chart roams free.
  if (cam.mode === 'locked' && !cutscene.active && !teleport.active
    && !combat.active && !bossFx.active) {
    if (flight.active && player.blast) {
      controls.maxDist = 4400;
      controls.target.lerp(flight.frameCenter, 1 - Math.exp(-dt * 2.6));
      controls.dist += (flight.frameDist - controls.dist) * Math.min(1, dt * 2.2);
      if (launch.active) {
        controls.pitch += (0.78 - controls.pitch) * Math.min(1, dt * 1.2);
        if (player.blast.t > 0.55 && launch.shown < 2) {
          launch.shown = 2;
          ui.dialogue(launch.lines[1]);
        }
      }
    } else {
      // hops still follow the wisp itself (lifted to the destination's baseY)
      const curHex = world.hexes.get(player.blast?.destKey ?? player.hexKey);
      camFocus.set(player.mesh.position.x, curHex?.baseY || 0, player.mesh.position.z);
      controls.target.lerp(camFocus, 1 - Math.exp(-dt * 5));
      const curArea = curHex ? world.areas[curHex.areaId] : null;
      controls.maxDist = curArea ? zoomCapFor(curArea) : 300;
    }
  } else if (cam.mode === 'free') {
    controls.maxDist = 4400;
  }
  cutscene.update(dt);

  // the star chart: glide out to the full orrery on open, swell the charted
  // bodies (the hovered one further), keep the wisp marker in place
  if (mapFx.active) {
    if (chartFx.easing) {
      if (controls.lastPanTime >= chartFx.openedPerf
        || Math.abs(controls.dist - CHART_DIST) < 40) {
        chartFx.easing = false; // arrived, or the user took the wheel
      } else {
        controls._focusTo = null;
        controls.target.lerp(CHART_HOME, 1 - Math.exp(-dt * 3));
        controls.dist += (CHART_DIST - controls.dist) * Math.min(1, dt * 2.6);
        controls.pitch += (1.15 - controls.pitch) * Math.min(1, dt * 2.4);
      }
    }
    for (const b of chartFx.bodies) {
      const goal = b.areaId === chartFx.hovered ? b.f * 1.45 : b.f;
      const s = b.g.scale.x + (goal - b.g.scale.x) * Math.min(1, dt * 6);
      b.g.scale.setScalar(s);
      b.g.position.y = Math.max(b.y0, world.areas[b.areaId].biome.bodySize * s * 0.85);
    }
    mapFx.you?.position.set(player.mesh.position.x, player.mesh.position.y + 13, player.mesh.position.z);
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
