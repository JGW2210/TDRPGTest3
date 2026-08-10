// The item pool (Round 11): 500 papercraft curios in four tiers —
// 200 commons (simple stat nudges), 150 rares (stronger, some cracked with
// trade-offs), 100 super-rares (playstyle benders: imbues, attack patterns,
// foresight, overworld movement), 50 legendaries (hand-cut, run-warping) —
// plus a dozen RELICS for the single relic slot (active, cooldown refilled
// by felling enemies). Drops are random but always optional, and the deeper
// tiers only join the table once meta progression has unlocked them.
//
// Every item carries a sprite recipe (tier frame + glyph + tint) rendered by
// sprites.js, and an `effects` bag folded into run.stats by computeStats.

import { meta } from './meta.js';

// ---------------------------------------------------------------- stats
export function freshMods() {
  return { flags: {}, pattern: null };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Fold the run's accumulated item mods into the derived stat block the
// combat and overworld read. Call after every pickup.
export function computeStats(run) {
  const m = run.mods;
  const s = run.stats;
  s.atk = Math.max(0.2, (1 + (m.atk ?? 0)) * (1 + (m.atkMul ?? 0)));
  s.spd = Math.max(4, 10 + (m.spd ?? 0));            // initiative fill rate
  s.sight = clamp(m.sight ?? 0, 0, 5);               // telegraph clarity
  s.foresight = clamp(m.foresight ?? 0, 0, 3);       // enemy-move prediction
  s.spellTime = clamp(1 + (m.spellTime ?? 0), 0.6, 2.2);
  s.barWidth = clamp(1 + (m.barWidth ?? 0), 0.5, 2.4);
  s.dodge = clamp(m.dodge ?? 0, 0, 0.45);            // extra react window (s)
  s.crit = clamp(m.crit ?? 0, 0, 0.75);
  s.luck = m.luck ?? 0;
  s.stepSpeed = clamp(1 + (m.stepSpeed ?? 0), 0.6, 2.1);
  s.hopRange = Math.round(m.hopRange ?? 0);
  s.hazardGuard = clamp(m.hazardGuard ?? 0, 0, 0.8);
  s.burn = clamp(m.burn ?? 0, 0, 1);
  s.freeze = clamp(m.freeze ?? 0, 0, 0.8);
  s.slow = clamp(m.slow ?? 0, 0, 1);
  s.thorns = m.thorns ?? 0;
  s.shield = Math.max(0, Math.round(m.shield ?? 0));
  s.lifesteal = clamp(m.lifesteal ?? 0, 0, 0.9);
  s.relicRate = clamp(1 + (m.relicRate ?? 0), 0.4, 1.4);
  s.pattern = m.pattern ?? 'single';
  s.flags = m.flags;
  return s;
}

// Apply an item; returns its instant payload (heal/charm/containers) for the
// caller to act on. Trade-offs fold in exactly like buffs, just negative.
export function applyItem(run, item) {
  run.items.push(item.id);
  run.taken.add(item.id);
  for (const bag of [item.effects, item.tradeoff]) {
    if (!bag) continue;
    for (const [k, v] of Object.entries(bag)) {
      if (k === 'instant') continue;
      if (k === 'pattern') run.mods.pattern = v;
      else if (k === 'flags') Object.assign(run.mods.flags, v);
      else run.mods[k] = (run.mods[k] ?? 0) + v;
    }
  }
  computeStats(run);
  return item.effects?.instant ?? null;
}

// ---------------------------------------------------------------- naming
const mkNames = (adjs, nouns) => {
  const out = [];
  for (const n of nouns) for (const a of adjs) out.push(`${a} ${n}`);
  return out;
};

// human line for an effects bag
const EFFECT_TEXT = {
  atk: (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)} attack`,
  atkMul: (v) => `attack ${v > 0 ? '+' : ''}${Math.round(v * 100)}%`,
  spd: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} speed`,
  sight: (v) => `${v > 0 ? '+' : ''}${v} sight (clearer telegraphs)`,
  foresight: (v) => `${v > 0 ? '+' : ''}${v} foresight (foe moves foretold)`,
  spellTime: (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}% casting time`,
  barWidth: (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}% strike window`,
  dodge: (v) => `${v > 0 ? '+' : ''}${(v * 1000).toFixed(0)}ms react window`,
  crit: (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}% critical chance`,
  luck: (v) => `${v > 0 ? '+' : ''}${v} luck`,
  stepSpeed: (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}% sail speed`,
  hopRange: (v) => `${v > 0 ? '+' : ''}${v} spring-hop reach`,
  hazardGuard: (v) => `${Math.round(v * 100)}% chance to shrug off hazards`,
  burn: (v) => `${Math.round(v * 100)}% chance to ignite (burn)`,
  freeze: (v) => `${Math.round(v * 100)}% chance to freeze`,
  slow: (v) => `${Math.round(v * 100)}% chance to slow`,
  thorns: (v) => `foes take ${v.toFixed(1)} when they strike you`,
  shield: (v) => `+${v} shield each combat`,
  lifesteal: (v) => `${Math.round(v * 100)}% chance to mend on a kill`,
  relicRate: (v) => `relic recharges ${Math.round(-v * 100)}% faster`,
  pattern: (v) => `attack pattern: ${v}`,
};

function describe(effects, tradeoff, instant) {
  const bits = [];
  for (const [k, v] of Object.entries(effects ?? {})) {
    if (k === 'instant' || k === 'flags') continue;
    bits.push(EFFECT_TEXT[k] ? EFFECT_TEXT[k](v) : `${k} ${v}`);
  }
  for (const [k, v] of Object.entries(effects?.flags ?? {})) {
    bits.push(FLAG_TEXT[k] ?? k);
    void v;
  }
  if (instant?.heal) bits.push(`mends ${instant.heal / 2} heart${instant.heal > 2 ? 's' : ''}`);
  if (instant?.charm) bits.push('grants a ward-charm');
  if (instant?.containers) bits.push(`+${instant.containers / 2} heart container${instant.containers > 2 ? 's' : ''}`);
  const bad = [];
  for (const [k, v] of Object.entries(tradeoff ?? {})) {
    bad.push(EFFECT_TEXT[k] ? EFFECT_TEXT[k](v) : `${k} ${v}`);
  }
  return bits.join(' ᛫ ') + (bad.length ? ` ⊘ but ${bad.join(' ᛫ ')}` : '');
}

const FLAG_TEXT = {
  autoSpell: 'spells write themselves',
  minGood: 'strikes never fall below a clean hit',
  doubleTap: 'perfect strikes echo for half again',
  calmMind: 'debuffs last half as long',
  stormSoul: 'storm strikes cannot touch you',
  glassStep: 'first hit each combat is dodged outright',
  scholar: 'spell words are one letter shorter',
  gambler: 'drops reroll once if you decline them',
  echoVision: 'enemy attack order is fully revealed',
  mirrorWard: 'reflected: lane-lock debuffs rebound on the foe',
};

// ---------------------------------------------------------------- the pool
export const ITEMS = [];
export const ITEM_BY_ID = new Map();

function add(item) {
  ITEMS.push(item);
  ITEM_BY_ID.set(item.id, item);
}

// ---- 200 COMMONS: one small stat nudge each --------------------------------
const COMMON_KINDS = [
  {
    key: 'atk', glyph: 'sword', tint: 0xff9a8a, effects: { atk: 0.2 },
    names: mkNames(['Whetted', 'Keen', 'Sparking', 'Ember', 'Bitter'], ['Quill', 'Splinter', 'Talon', 'Barb']),
  },
  {
    key: 'spd', glyph: 'boot', tint: 0x9fd8ff, effects: { spd: 0.8 },
    names: mkNames(['Fleet', 'Skipping', 'Eager', 'Gusty', 'Light'], ['Heel', 'Feather', 'Sandal', 'Stride']),
  },
  {
    key: 'sight', glyph: 'eye', tint: 0xc9f2e4, effects: { sight: 0.5 },
    names: mkNames(['Clear', 'Waking', 'Patient', 'Wide', 'Quiet'], ['Iris', 'Lens', 'Glimpse', 'Monocle']),
  },
  {
    key: 'spell', glyph: 'rune', tint: 0xd6c9ff, effects: { spellTime: 0.07 },
    names: mkNames(['Murmured', 'Inked', 'Practiced', 'Soft', 'Old'], ['Syllable', 'Vowel', 'Verse', 'Stanza']),
  },
  {
    key: 'bar', glyph: 'hourglass', tint: 0xffd27a, effects: { barWidth: 0.09 },
    names: mkNames(['Steady', 'Level', 'Poised', 'True', 'Even'], ['Pendulum', 'Beat', 'Pulse', 'Cadence']),
  },
  {
    key: 'dodge', glyph: 'boot', tint: 0xa8c4ff, effects: { dodge: 0.03 },
    names: mkNames(['Slipping', 'Wary', 'Sidelong', 'Coy', 'Sudden'], ['Step', 'Lean', 'Flinch', 'Sway']),
  },
  {
    key: 'crit', glyph: 'star', tint: 0xfff6b0, effects: { crit: 0.04 },
    names: mkNames(['Lucky', 'Cruel', 'Gleaming', 'Fine', 'Narrow'], ['Point', 'Edge', 'Glint', 'Sting']),
  },
  {
    key: 'luck', glyph: 'spiral', tint: 0x8cf5a6, effects: { luck: 1 },
    names: mkNames(['Found', 'Crooked', 'Grinning', 'Odd', 'Pocket'], ['Penny', 'Knuckle', 'Clover', 'Die']),
  },
  {
    key: 'step', glyph: 'droplet', tint: 0x7ce8e0, effects: { stepSpeed: 0.06 },
    names: mkNames(['Gliding', 'Current', 'Tide', 'Drifting', 'Sleek'], ['Fin', 'Keel', 'Oar', 'Sail']),
  },
  {
    key: 'mend', glyph: 'heart', tint: 0xff8fa8, effects: { instant: { heal: 2 } },
    names: mkNames(['Warm', 'Kind', 'Honest', 'Small', 'Shared'], ['Loaf', 'Broth', 'Ember', 'Blanket']),
  },
];
{
  let idx = 0;
  for (const kind of COMMON_KINDS) {
    kind.names.forEach((name, vi) => {
      // late variants run a touch stronger — the pool stays fresh
      const boost = 1 + (vi % 4) * 0.25;
      const effects = {};
      for (const [k, v] of Object.entries(kind.effects)) {
        if (k === 'instant') effects.instant = { ...v };
        else effects[k] = Math.round(v * boost * 100) / 100;
      }
      add({
        id: 'c' + String(idx).padStart(3, '0'),
        tier: 'common', name, kind: kind.key,
        glyph: kind.glyph, tint: kind.tint,
        rune: 'ᚠᚢᚦᚨᚱᚲ'[vi % 6],
        effects, tradeoff: null, unlock: null,
        desc: describe(effects, null, effects.instant),
      });
      idx++;
    });
  }
}

// ---- 150 RARES: stronger nudges; the last few of each line are CRACKED —
// bigger still, but they take something back -------------------------------
const RARE_KINDS = [
  { key: 'atk', glyph: 'sword', tint: 0xff9a8a, effects: { atk: 0.5 }, cracked: { tradeoff: { spd: -1 } } },
  { key: 'spd', glyph: 'boot', tint: 0x9fd8ff, effects: { spd: 1.8 }, cracked: { tradeoff: { atk: -0.15 } } },
  { key: 'sight', glyph: 'eye', tint: 0xc9f2e4, effects: { sight: 1 }, cracked: { tradeoff: { spd: -0.8 } } },
  { key: 'spell', glyph: 'rune', tint: 0xd6c9ff, effects: { spellTime: 0.16 }, cracked: { tradeoff: { barWidth: -0.08 } } },
  { key: 'bar', glyph: 'hourglass', tint: 0xffd27a, effects: { barWidth: 0.2 }, cracked: { tradeoff: { spellTime: -0.07 } } },
  { key: 'dodge', glyph: 'boot', tint: 0xa8c4ff, effects: { dodge: 0.07 }, cracked: { tradeoff: { atk: -0.15 } } },
  { key: 'crit', glyph: 'star', tint: 0xfff6b0, effects: { crit: 0.09 }, cracked: { tradeoff: { barWidth: -0.08 } } },
  { key: 'thorns', glyph: 'flame', tint: 0xff9a66, effects: { thorns: 0.5 }, cracked: { tradeoff: { dodge: -0.02 } } },
  { key: 'life', glyph: 'heart', tint: 0xff8fa8, effects: { lifesteal: 0.15, luck: 1 }, cracked: { tradeoff: { spd: -0.8 } } },
  { key: 'vessel', glyph: 'heart', tint: 0xffb0e6, effects: { instant: { containers: 2 } }, cracked: { tradeoff: { spd: -0.6 } } },
];
const RARE_NAMES = [
  mkNames(['Hungering', 'Twice-Forged', 'Star-Bit'], ['Fang', 'Cleaver', 'Lance', 'Needle', 'Brand']),
  mkNames(['Comet', 'Zephyr', 'Untethered'], ['Anklet', 'Wings', 'Gale', 'Skate', 'Current']),
  mkNames(['Third', 'Unlidded', 'Farseeing'], ['Eye', 'Scope', 'Mirror', 'Window', 'Astrolabe']),
  mkNames(['Fluent', 'Silver', 'Borrowed'], ['Tongue', 'Grimoire', 'Psalter', 'Alphabet', 'Chorus']),
  mkNames(['Master', 'Patient', 'Clockwork'], ['Metronome', 'Balance', 'Chime', 'Escapement', 'Anchor']),
  mkNames(['Phantom', 'Untouched', 'Slipstream'], ['Cloak', 'Veil', 'Shadow', 'Echo', 'Feint']),
  mkNames(['Assassin', 'Falling-Star', 'Hairline'], ['Focus', 'Prism', 'Dagger', 'Sliver', 'Spark']),
  mkNames(['Bristling', 'Ungrateful', 'Nettle'], ['Mantle', 'Corona', 'Hide', 'Crown', 'Wreath']),
  mkNames(['Grave', 'Moth', 'Tidal'], ['Sip', 'Tithe', 'Toll', 'Harvest', 'Drink']),
  mkNames(['Deep', 'Second', 'Paper'], ['Vessel', 'Chamber', 'Reservoir', 'Atrium', 'Bloom']),
];
{
  let idx = 0;
  RARE_KINDS.forEach((kind, ki) => {
    RARE_NAMES[ki].forEach((name, vi) => {
      const cracked = vi >= 12; // the last three of each line
      const boost = (1 + (vi % 3) * 0.3) * (cracked ? 1.7 : 1);
      const effects = {};
      for (const [k, v] of Object.entries(kind.effects)) {
        if (k === 'instant') {
          effects.instant = {};
          for (const [ik, iv] of Object.entries(v)) effects.instant[ik] = cracked ? iv * 2 : iv;
        } else effects[k] = Math.round(v * boost * 100) / 100;
      }
      const tradeoff = cracked ? { ...kind.cracked.tradeoff } : null;
      add({
        id: 'r' + String(idx).padStart(3, '0'),
        tier: 'rare', name: cracked ? `Cracked ${name}` : name, kind: kind.key,
        glyph: kind.glyph, tint: kind.tint,
        rune: 'ᚷᚹᚺᚾᛁᛃ'[vi % 6],
        effects, tradeoff, unlock: null,
        desc: describe(effects, tradeoff, effects.instant),
      });
      idx++;
    });
  });
}

// ---- 100 SUPER-RARES: playstyle benders, 20 lines × 5 ----------------------
const SUPER_KINDS = [
  { key: 'twin', glyph: 'wand', tint: 0xc78bff, effects: { pattern: 'twin' }, names: ['Gemini Focus', 'The Answering Wand', 'Twinned Sigil', 'Mirrorcast Rod', 'Both Hands At Once'] },
  { key: 'pierce', glyph: 'wand', tint: 0x9fd8ff, effects: { pattern: 'pierce' }, names: ['Lance of the Long Word', 'Skewer Sigil', 'The Throughline', 'Needle Logic', 'Depth Charge'] },
  { key: 'sweep', glyph: 'wand', tint: 0xffd27a, effects: { pattern: 'sweep' }, names: ['The Broad Stroke', 'Scythe Sigil', 'Horizon Cut', 'Rake of Stars', 'Margin Notes'] },
  { key: 'burn', glyph: 'flame', tint: 0xff9a66, effects: { burn: 0.35 }, names: ['Bottled Hearthstar', 'Cinder Tithe', 'The Long Smoulder', 'Ash Alphabet', 'Pyre Ink'] },
  { key: 'freeze', glyph: 'snow', tint: 0xd6f4ff, effects: { freeze: 0.25 }, names: ['Nivalis Splinter', 'The Stopped Breath', 'Frostveil Clasp', 'Winter Comma', 'Stillmoon Chip'] },
  { key: 'slow', glyph: 'droplet', tint: 0x9adbc0, effects: { slow: 0.35 }, names: ['Stygian Drip', 'The Heavy Hour', 'Molasses Rune', 'Anchor Words', 'Drowsy Tide'] },
  { key: 'foresight', glyph: 'eye', tint: 0xa8c4ff, effects: { foresight: 1 }, names: ['Almanac of Feet', 'The Choreography', 'Habit Reader', "Dancer's Notation", 'Tomorrow Glass'] },
  { key: 'omen', glyph: 'eye', tint: 0xc9f2e4, effects: { sight: 2 }, names: ['Ophthal Shard', 'The Kind Warning', 'Long Lantern', 'Herald Bell', 'Stormglass'] },
  { key: 'shield', glyph: 'shieldrune', tint: 0xdfe6ff, effects: { shield: 1 }, names: ['Paper Aegis', 'The Polite Refusal', 'Doorstop Sigil', 'Warding Fold', 'Umbrella Clause'] },
  { key: 'thorns', glyph: 'flame', tint: 0xff8fa8, effects: { thorns: 1 }, names: ['Bramble Verdict', 'The Costly Bite', 'Retort Crown', 'Hedge Law', 'Spite Mantle'] },
  { key: 'life', glyph: 'heart', tint: 0xff8fa8, effects: { lifesteal: 0.35 }, names: ['The Red Ledger', 'Vampiric Comma', 'Heartsip Chalice', 'Tithe of Teeth', 'Rose Debt'] },
  { key: 'relic', glyph: 'relic', tint: 0xffe9c4, effects: { relicRate: -0.25 }, names: ['Quickened Reliquary', 'The Eager Socket', 'Charge Coil', 'Votive Battery', 'Prayer Wheel'] },
  { key: 'crit', glyph: 'star', tint: 0xfff6b0, effects: { crit: 0.18 }, names: ['Eight-Pointed Verdict', 'The Exact Place', 'Fault Line', 'Star Chart of Wounds', 'Killing Comma'] },
  { key: 'glass', glyph: 'sword', tint: 0xff9a8a, effects: { atkMul: 0.4 }, tradeoff: { spd: -2 }, names: ['Glass Greatquill', 'The Heavy Answer', 'Slag Hammer', 'Overwrought Wand', 'Cannon Logic'] },
  { key: 'wind', glyph: 'boot', tint: 0x9fd8ff, effects: { spd: 3 }, tradeoff: { atk: -0.2 }, names: ['Galestream Bottled', 'The Hurry', 'Zephyr Contract', 'Borrowed Wings', 'Tailwind Tithe'] },
  { key: 'strider', glyph: 'droplet', tint: 0x7ce8e0, effects: { stepSpeed: 0.22, hopRange: 2 }, names: ['Leviathan Gait', 'The Seven-League Fin', 'Springstone Heart', 'Tide Walker', 'Wave Stitcher'] },
  { key: 'guard', glyph: 'shieldrune', tint: 0x8cf5a6, effects: { hazardGuard: 0.35 }, names: ['Snare-Eater Charm', 'The Careful Habit', 'Geyser Umbrella', 'Trap Grammar', 'Old Scars'] },
  { key: 'tongue', glyph: 'rune', tint: 0xd6c9ff, effects: { spellTime: 0.35 }, tradeoff: { barWidth: -0.12 }, names: ['The Unhurried Word', 'Slow Ink', 'Patient Grimoire', 'Long Breath', 'Deliberate Verse'] },
  { key: 'tempo', glyph: 'hourglass', tint: 0xffd27a, effects: { barWidth: 0.45 }, tradeoff: { spellTime: -0.12 }, names: ['The Wide Now', 'Generous Metronome', 'Fat Second', 'Loose Escapement', 'Grace Note'] },
  { key: 'bulwark', glyph: 'heart', tint: 0xffb0e6, effects: { instant: { containers: 4 } }, tradeoff: { spd: -1.5 }, names: ['Fourfold Vessel', 'The Deep Atrium', 'Cathedral Heart', 'Ballast Bloom', 'Stone Chambers'] },
];
{
  let idx = 0;
  SUPER_KINDS.forEach((kind) => {
    kind.names.forEach((name, vi) => {
      const effects = JSON.parse(JSON.stringify(kind.effects));
      const tradeoff = kind.tradeoff ? { ...kind.tradeoff } : null;
      add({
        id: 's' + String(idx).padStart(3, '0'),
        tier: 'superrare', name, kind: kind.key,
        glyph: kind.glyph === 'shieldrune' ? 'star' : kind.glyph, tint: kind.tint,
        rune: 'ᛇᛈᛉᛊᛏᛒ'[vi % 6],
        effects, tradeoff, unlock: null,
        desc: describe(effects, tradeoff, effects.instant),
      });
      idx++;
    });
  });
}

// ---- 50 LEGENDARIES: hand-cut, run-warping ---------------------------------
const L = (name, effects, tradeoff = null, unlock = null, glyph = 'star', tint = 0xffd27a, desc = null) =>
  ({ name, effects, tradeoff, unlock, glyph, tint, desc });
const LEGENDARIES = [
  L('The Unwritten Word', { flags: { autoSpell: true } }, { barWidth: -0.2 }, null, 'rune', 0xd6c9ff),
  L('Metronome of the First Dawn', { flags: { minGood: true } }, { spellTime: -0.1 }, null, 'hourglass'),
  L('Stormheart Prosthesis', { atk: 2, burn: 0.5 }, { spd: -1.5 }, 'ach:warden1', 'flame', 0xff9a66),
  L('Crown of the Fifth Veil', { atk: 0.8, spd: 2, sight: 1, foresight: 1, crit: 0.1 }, null, 'ach:warden4', 'star', 0xffe9c4),
  L("The Cartographer's Own Eyes", { sight: 4, foresight: 3 }, null, null, 'eye', 0xc9f2e4),
  L('Paper Soul', { atkMul: 1.2, dodge: 0.12 }, { instant: { setMaxHalves: 4 } }, 'ach:flawless', 'heart', 0xfff6b0),
  L('The Fifth Lane', { pattern: 'cross' }, { spd: -1 }, null, 'wand', 0xc78bff),
  L('Echo of the Answering Dark', { pattern: 'twin', crit: 0.12 }, null, 'ach:warden2', 'wand', 0xa8c4ff),
  L('Aurelion Fragment', { burn: 0.8, atk: 0.6 }, { freeze: -0.5 }, null, 'flame', 0xffc966),
  L('Absolute Zero Comma', { freeze: 0.55 }, { spd: -1 }, null, 'snow', 0xd6f4ff),
  L('The Slow Apocalypse', { slow: 0.8, thorns: 1.5 }, null, null, 'droplet', 0x9adbc0),
  L('Gerald, the Named Gap', { dodge: 0.2, flags: { glassStep: true } }, null, 'ach:untouched', 'spiral', 0x8cf5a6),
  L('The Whole Choreography', { flags: { echoVision: true }, foresight: 2 }, null, 'ach:perfect10', 'eye', 0xa8c4ff),
  L('Vampiric Chapter', { lifesteal: 0.7, atk: 0.4 }, { instant: { containers: -2 } }, null, 'heart', 0xff8fa8),
  L('The Patient Executioner', { crit: 0.4, barWidth: 0.3 }, { spd: -2.5 }, null, 'star', 0xfff6b0),
  L('Leviathan Ligament', { spd: 5 }, { atk: -0.3 }, null, 'boot', 0x9fd8ff),
  L('Seven-League Manuscript', { stepSpeed: 0.5, hopRange: 4 }, null, null, 'droplet', 0x7ce8e0),
  L('The Kindest Lie', { instant: { containers: 6, heal: 6 } }, { atkMul: -0.15 }, null, 'heart', 0xffb0e6),
  L('Warden-Bone Quill', { atk: 1.2, thorns: 1 }, null, 'ach:warden2', 'sword', 0xe6ddc9),
  L('The Scholar of Short Words', { flags: { scholar: true }, spellTime: 0.2 }, null, 'ach:swiftTongue', 'rune', 0xd6c9ff),
  L('Double Underline', { flags: { doubleTap: true } }, null, 'ach:perfect10', 'star', 0xffd27a),
  L('The Calm Mind', { flags: { calmMind: true }, sight: 1 }, null, null, 'eye', 0xc9f2e4),
  L('Faraday Cloak', { flags: { stormSoul: true }, hazardGuard: 0.3 }, null, null, 'spiral', 0x8f9bff),
  L("The Gambler's Second Chance", { flags: { gambler: true }, luck: 3 }, null, null, 'spiral', 0x8cf5a6),
  L('Mirror-Bound Oath', { flags: { mirrorWard: true }, shield: 1 }, null, null, 'star', 0xdfe6ff),
  L('Hearthstar Marrow', { instant: { containers: 4, heal: 8 }, burn: 0.25 }, null, null, 'heart', 0xffc966),
  L('The Longest Now', { barWidth: 0.8 }, { spellTime: -0.2 }, null, 'hourglass', 0xffd27a),
  L('Ink That Remembers', { spellTime: 0.5, crit: 0.1 }, null, null, 'rune', 0xd6c9ff),
  L('Nyx-Feather Mantle', { dodge: 0.25, spd: 2 }, { instant: { containers: -2 } }, 'ach:warden3', 'boot', 0x9a6eff),
  L('The Unblinking Contract', { sight: 3, crit: 0.2 }, { dodge: -0.05 }, null, 'eye', 0xb2f0dd),
  L('Cinder Choir Robes', { thorns: 2, burn: 0.3 }, null, null, 'flame', 0xff8c5a),
  L('The Fourth Wall', { shield: 3 }, { spd: -1 }, null, 'star', 0xdfe6ff),
  L('Grave-Anchor Gauntlet', { atk: 1.5 }, { stepSpeed: -0.15 }, null, 'sword', 0x8c94a6),
  L('Chimewood Tuning Peg', { barWidth: 0.35, spellTime: 0.15 }, null, null, 'hourglass', 0x7fe8d8),
  L('Sporelight Symbiote', { lifesteal: 0.4, luck: 2 }, null, null, 'heart', 0xc78bff),
  L('The Mirage Quill', { pattern: 'scatter', atk: 0.5 }, null, null, 'wand', 0xffe08a),
  L('Undertow Locket', { slow: 0.5, freeze: 0.2 }, null, null, 'droplet', 0x4f8cff),
  L('The First Hearth Coal', { burn: 0.6, instant: { heal: 4 } }, null, null, 'flame', 0xffb347),
  L('Horolith Escapement', { spd: 3, barWidth: 0.2 }, null, null, 'hourglass', 0xc2995a),
  L('Whisperdune Hourglass', { spellTime: 0.35, dodge: 0.08 }, null, null, 'hourglass', 0xd9c28a),
  L('Frostveil Regalia', { freeze: 0.4, shield: 1 }, null, null, 'snow', 0xbfe4f2),
  L('Thornlight Communion', { thorns: 1.5, lifesteal: 0.25 }, null, null, 'flame', 0xa8ff6e),
  L('The Admiral Regrets', { atk: 1, crit: 0.15 }, { luck: -2 }, null, 'sword', 0x9adbc0),
  L('Fulmen Conductor', { crit: 0.25, spd: 2 }, { hazardGuard: -0.2 }, null, 'star', 0x8f9bff),
  L('Vesperine Dusk-Lantern', { sight: 2, foresight: 1, luck: 2 }, null, null, 'eye', 0xff9adb),
  L('Resonar Fork', { pattern: 'twin', barWidth: 0.2 }, null, null, 'wand', 0xa8c4ff),
  L('Cantus Breath', { flags: { scholar: true }, barWidth: 0.25 }, null, null, 'rune', 0xfff8e0),
  L('Pomarium Windfall', { instant: { heal: 12 }, luck: 3 }, null, null, 'heart', 0xe8d8a0),
  L('Nokturn Negative', { dodge: 0.18, foresight: 1 }, { sight: -1 }, null, 'spiral', 0x8c5aff),
  L('Fauces, Pocket-Sized', { atkMul: 0.6, lifesteal: 0.3 }, { instant: { containers: -2 } }, 'ach:slayer50', 'sword', 0xd96a5a),
];
LEGENDARIES.forEach((spec, i) => {
  add({
    id: 'l' + String(i).padStart(3, '0'),
    tier: 'legendary', name: spec.name, kind: 'legendary',
    glyph: spec.glyph, tint: spec.tint, rune: 'ᛖᛗᛚᛜᛞᛟ'[i % 6],
    effects: spec.effects, tradeoff: spec.tradeoff, unlock: spec.unlock,
    desc: spec.desc ?? describe(spec.effects, spec.tradeoff, spec.effects?.instant),
  });
});

// ---- RELICS: the single active slot ---------------------------------------
// cd = kills to recharge. Effects resolve inside combat.js (use key).
export const RELICS = [
  { id: 'R00', name: 'The Guttering Nova', use: 'nova', cd: 5, desc: 'unleash a starburst — heavy damage to the foe', glyph: 'relic', tint: 0xffe9c4 },
  { id: 'R01', name: 'Bell of Held Breath', use: 'stasis', cd: 6, desc: 'the foe forgets its next turn entirely', glyph: 'relic', tint: 0xd6f4ff },
  { id: 'R02', name: 'Cartographer\'s Flask', use: 'mend', cd: 5, desc: 'mend two full hearts on the spot', glyph: 'relic', tint: 0xff8fa8 },
  { id: 'R03', name: 'The Folded Bulwark', use: 'aegis', cd: 4, desc: 'raise three shields for this combat', glyph: 'relic', tint: 0xdfe6ff },
  { id: 'R04', name: 'Stolen Metronome', use: 'overclock', cd: 6, desc: 'double your speed for the rest of the fight', glyph: 'relic', tint: 0x9fd8ff },
  { id: 'R05', name: 'The Honest Lens', use: 'clarity', cd: 4, desc: 'every telegraph runs long for the rest of the fight', glyph: 'relic', tint: 0xc9f2e4 },
  { id: 'R06', name: 'Salt Circle, Portable', use: 'purge', cd: 5, desc: 'burn away debuffs and refuse new ones this fight', glyph: 'relic', tint: 0x8cf5a6 },
  { id: 'R07', name: 'Pocket Maelstrom', use: 'stormcall', cd: 6, desc: 'lightning racks the foe and slows it', glyph: 'relic', tint: 0x8f9bff },
  { id: 'R08', name: 'The Borrowed Hour', use: 'timeslip', cd: 7, desc: 'act again at once — an extra turn', glyph: 'relic', tint: 0xffd27a },
  { id: 'R09', name: 'Ember in Amber', use: 'ignite', cd: 4, desc: 'set the foe alight with a deep burn', glyph: 'relic', tint: 0xff9a66 },
  { id: 'R10', name: 'The Transmuter\'s Thumb', use: 'transmute', cd: 8, desc: 'your next drop arrives one tier finer', glyph: 'relic', tint: 0xc78bff },
  { id: 'R11', name: 'Eclipse, Bottled', use: 'eclipse', cd: 7, desc: 'the foe\'s attacks thin to half for two turns', glyph: 'relic', tint: 0x9a6eff },
];
export const RELIC_BY_ID = new Map(RELICS.map((r) => [r.id, r]));

// ---------------------------------------------------------------- unlock gates
export function tierUnlocked(tier) {
  const m = meta.get();
  if (tier === 'common' || tier === 'rare') return true;
  if (tier === 'superrare') return m.kills >= 15 || m.wardens >= 1;
  if (tier === 'legendary') return m.wardens >= 1 || m.kills >= 40;
  return true;
}

export function itemUnlocked(item) {
  if (!tierUnlocked(item.tier)) return false;
  if (!item.unlock) return true;
  const [kind, key] = item.unlock.split(':');
  if (kind === 'ach') return meta.has(key);
  if (kind === 'kills') return meta.get().kills >= +key;
  return true;
}

// ---------------------------------------------------------------- drops
const TIERS = ['common', 'rare', 'superrare', 'legendary'];

// Roll one droppable item. luck tilts the table upward; tierBoost guarantees
// a minimum tier (wardens boost 2 → at least super-rare). Items already
// taken this run stay out of the pool, Isaac-style.
export function rollDrop({ luck = 0, tierBoost = 0, taken = new Set(), rand = Math.random } = {}) {
  let w = [0.55 - luck * 0.03, 0.30 + luck * 0.012, 0.12 + luck * 0.013, 0.03 + luck * 0.005];
  w = w.map((x) => Math.max(0.01, x));
  // unlocked tiers only
  for (let i = 0; i < 4; i++) if (!tierUnlocked(TIERS[i])) w[i] = 0;
  const minTier = Math.min(3, tierBoost);
  for (let i = 0; i < minTier; i++) w[i] = 0;
  const total = w.reduce((a, b) => a + b, 0);
  // a quality floor above every unlocked tier: degrade to the BEST tier the
  // meta has opened, not all the way to common
  if (total <= 0) {
    let best = 0;
    for (let i = 3; i >= 0; i--) if (tierUnlocked(TIERS[i])) { best = i; break; }
    w[best] = 1;
  }
  let roll = rand() * w.reduce((a, b) => a + b, 0);
  let tier = TIERS[0];
  for (let i = 0; i < 4; i++) {
    roll -= w[i];
    if (roll <= 0) { tier = TIERS[i]; break; }
  }
  for (let fall = TIERS.indexOf(tier); fall >= 0; fall--) {
    const cands = ITEMS.filter((it) =>
      it.tier === TIERS[fall] && !taken.has(it.id) && itemUnlocked(it));
    if (cands.length) return cands[(rand() * cands.length) | 0];
  }
  return null;
}

export function rollRelic({ taken = new Set(), rand = Math.random } = {}) {
  const cands = RELICS.filter((r) => !taken.has(r.id));
  if (!cands.length) return RELICS[(rand() * RELICS.length) | 0];
  return cands[(rand() * cands.length) | 0];
}

// sanity: the pool is the size the design demands
export const POOL_COUNTS = {
  common: ITEMS.filter((i) => i.tier === 'common').length,
  rare: ITEMS.filter((i) => i.tier === 'rare').length,
  superrare: ITEMS.filter((i) => i.tier === 'superrare').length,
  legendary: ITEMS.filter((i) => i.tier === 'legendary').length,
  relics: RELICS.length,
  total: ITEMS.length + RELICS.length,
};
