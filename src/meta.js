// Meta progression (Round 11): the only thing that survives a run's death.
// Kill tallies, warden victories, and achievements persist in localStorage
// and gate the deeper reaches of the item pool, Isaac-style — stronger and
// stranger items only join the drop table once the cosmos has seen you earn
// them. Everything else about a run still dies with it (by design).

const KEY = 'astral-reaches-meta-v1';

const DEFAULTS = {
  kills: 0,           // enemies defeated, ever
  wardens: 0,         // highest boundary warden beaten + 1 (0..4)
  bestRing: 0,        // deepest ring ever reached
  runs: 0,
  deaths: 0,
  itemsTaken: 0,
  perfectBars: 0,     // perfect timing-bar strikes, ever
  swiftCasts: 0,      // spells finished with half the clock to spare
  ach: {},            // achievement key -> true
};

export const ACHIEVEMENTS = {
  firstBlood: { name: 'First Blood', desc: 'defeat your first enemy' },
  slayer10: { name: 'Lantern-Dimmer', desc: 'defeat 10 enemies' },
  slayer50: { name: 'Void-Culler', desc: 'defeat 50 enemies' },
  slayer200: { name: 'The Quiet-Maker', desc: 'defeat 200 enemies' },
  warden1: { name: 'Past the First Veil', desc: 'defeat the Emberclad' },
  warden2: { name: 'Past the Second Veil', desc: 'defeat the Tidebound' },
  warden3: { name: 'Past the Third Veil', desc: 'defeat the Galecrowned' },
  warden4: { name: 'Past the Last Veil', desc: 'defeat Nyx Ophellum' },
  flawless: { name: 'Untouched Crown', desc: 'defeat a warden without taking a hit' },
  untouched: { name: 'Clean Hands', desc: 'win any fight without taking a hit' },
  perfect10: { name: 'Metronome Heart', desc: 'land 10 perfect strikes' },
  swiftTongue: { name: 'Swift Tongue', desc: 'finish 10 spells with half the clock left' },
  collector10: { name: 'Curio Pocket', desc: 'take 10 items' },
  collector50: { name: 'Reliquary', desc: 'take 50 items' },
  deepEnd: { name: 'The Deep End', desc: 'reach the fourth orbit' },
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS, ach: {} };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed, ach: parsed.ach ?? {} };
  } catch {
    return { ...DEFAULTS, ach: {} };
  }
}

const state = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch { /* private browsing etc — meta just won't persist */ }
}

// callbacks so main can announce fresh achievements
let onAward = null;

export const meta = {
  get: () => state,

  bump(field, n = 1) {
    state[field] = (state[field] ?? 0) + n;
    this.checkCounters();
    save();
  },

  setMax(field, v) {
    if (v > (state[field] ?? 0)) {
      state[field] = v;
      this.checkCounters();
      save();
    }
  },

  has: (achKey) => !!state.ach[achKey],

  award(achKey) {
    if (state.ach[achKey] || !ACHIEVEMENTS[achKey]) return false;
    state.ach[achKey] = true;
    save();
    onAward?.(achKey, ACHIEVEMENTS[achKey]);
    return true;
  },

  onAward(fn) { onAward = fn; },

  // counter-driven achievements
  checkCounters() {
    if (state.kills >= 1) this.award('firstBlood');
    if (state.kills >= 10) this.award('slayer10');
    if (state.kills >= 50) this.award('slayer50');
    if (state.kills >= 200) this.award('slayer200');
    if (state.wardens >= 1) this.award('warden1');
    if (state.wardens >= 2) this.award('warden2');
    if (state.wardens >= 3) this.award('warden3');
    if (state.wardens >= 4) this.award('warden4');
    if (state.perfectBars >= 10) this.award('perfect10');
    if (state.swiftCasts >= 10) this.award('swiftTongue');
    if (state.itemsTaken >= 10) this.award('collector10');
    if (state.itemsTaken >= 50) this.award('collector50');
    if (state.bestRing >= 4) this.award('deepEnd');
  },
};
