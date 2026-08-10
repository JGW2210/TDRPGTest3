// The bestiary (Round 11). Every biome keeps its own paper-cutout beast:
// a silhouette family (sprites.js painter), a palette pulled from the
// biome's own colors, and a combat temperament — how it patrols its 3x3
// board, how it likes to strike, whether it dodges, and which control-hexes
// (debuffs) it can throw once the deep rings teach it manners.
//
// Board cells are 0..8 row-major. For the ENEMY board, row 0 is the back
// rank and row 2 faces the player. Movement patterns are PERIODIC AND
// PLANNED — an enemy walks its patrol one step per turn (and a dodger takes
// one extra step the instant you commit an attack), so with enough
// foresight every sidestep is readable.

import { WARDENS } from './config.js';
import { creatureCanvas, wardenCanvas } from './sprites.js';

// a few patrol shapes on the 3x3 (indices row-major)
export const PATROLS = {
  still: [4],
  pace: [3, 4, 5, 4],                    // left-right along the middle rank
  column: [1, 4, 7, 4],                  // toward the player and back
  orbit: [0, 1, 2, 5, 8, 7, 6, 3],       // the full perimeter
  corners: [0, 2, 8, 6],                 // corner flit
  zigzag: [0, 4, 2, 4, 8, 4, 6, 4],      // spokes through the center
};

// biome key -> beast. hp/spd are pre-ring seasoning; atk is halves per hit.
export const BESTIARY = {
  emberglass: {
    name: 'Cinderling', painter: 'imp', hp: 3, spd: 9, atk: 1,
    patrol: 'pace', dodges: false, ranged: 0.35,
  },
  chimewood: {
    name: 'Chimewing', painter: 'moth', hp: 2.5, spd: 12, atk: 1,
    patrol: 'corners', dodges: true, ranged: 0.5,
  },
  sporelight: {
    name: 'Sporeling', painter: 'puff', hp: 3.5, spd: 7, atk: 1,
    patrol: 'still', dodges: false, ranged: 0.6,
  },
  cinder: {
    name: 'Ash Hound', painter: 'hound', hp: 4, spd: 11, atk: 1,
    patrol: 'pace', dodges: false, ranged: 0.15,
  },
  meridian: {
    name: 'Tide-Crab', painter: 'crab', hp: 5, spd: 7, atk: 1,
    patrol: 'pace', dodges: false, ranged: 0.3,
  },
  cog: {
    name: 'Cog-Mite', painter: 'gear', hp: 4, spd: 10, atk: 1,
    patrol: 'zigzag', dodges: true, ranged: 0.4, debuffs: ['random'],
  },
  whisperdune: {
    name: 'Mirage Viper', painter: 'serpent', hp: 4, spd: 12, atk: 1,
    patrol: 'corners', dodges: true, ranged: 0.45, debuffs: ['reverse'],
  },
  frostveil: {
    name: 'Frost Wisp', painter: 'wisp', hp: 3.5, spd: 9, atk: 1,
    patrol: 'orbit', dodges: false, ranged: 0.7,
  },
  thornlight: {
    name: 'Bramble Fiend', painter: 'thorn', hp: 5, spd: 8, atk: 1,
    patrol: 'column', dodges: false, ranged: 0.25, debuffs: ['lanelock'],
  },
  graveanchors: {
    name: 'Anchor Wraith', painter: 'wraith', hp: 4.5, spd: 8, atk: 1,
    patrol: 'still', dodges: true, ranged: 0.55, debuffs: ['lanelock'],
  },
  storm: {
    name: 'Gale Harpy', painter: 'harpy', hp: 4.5, spd: 13, atk: 1,
    patrol: 'corners', dodges: true, ranged: 0.5, debuffs: ['random'],
  },
  lanternfen: {
    name: 'Fen-Light', painter: 'lantern', hp: 4, spd: 9, atk: 1,
    patrol: 'orbit', dodges: false, ranged: 0.65, debuffs: ['reverse'],
  },
  echoverge: {
    name: 'Echo Shade', painter: 'jack', hp: 4.5, spd: 10, atk: 1,
    patrol: 'zigzag', dodges: true, ranged: 0.5, debuffs: ['reverse', 'random'],
  },
  bleachedchoir: {
    name: 'Bone Chorister', painter: 'skull', hp: 5, spd: 9, atk: 1,
    patrol: 'pace', dodges: false, ranged: 0.6, debuffs: ['lanelock'],
  },
  silentorchard: {
    name: 'Orchard Knot', painter: 'thorn', hp: 6, spd: 7, atk: 2,
    patrol: 'still', dodges: false, ranged: 0.35, debuffs: ['lanelock'],
  },
  umbral: {
    name: 'Umbral Jack', painter: 'jack', hp: 5, spd: 12, atk: 1,
    patrol: 'corners', dodges: true, ranged: 0.45, debuffs: ['reverse', 'lanelock'],
  },
  mawshallows: {
    name: 'Maw-Spawn', painter: 'maw', hp: 6, spd: 9, atk: 2,
    patrol: 'column', dodges: false, ranged: 0.2,
  },
  unblinking: {
    name: 'Oculite', painter: 'eye', hp: 5, spd: 10, atk: 1,
    patrol: 'orbit', dodges: true, ranged: 0.75, debuffs: ['random', 'lanelock'],
  },
  // waystations + concourses share one vermin; secrets keep hollows
  shatterreef: { name: 'Void-Mite', painter: 'mite', hp: 3.5, spd: 10, atk: 1, patrol: 'zigzag', dodges: false, ranged: 0.4 },
  anvilshoal: { name: 'Void-Mite', painter: 'mite', hp: 3.5, spd: 10, atk: 1, patrol: 'zigzag', dodges: false, ranged: 0.4 },
  orphanteeth: { name: 'Void-Mite', painter: 'mite', hp: 3.5, spd: 10, atk: 1, patrol: 'zigzag', dodges: false, ranged: 0.4 },
  weepingcomet: {
    name: 'Grief Hollow', painter: 'bell', hp: 7, spd: 10, atk: 2,
    patrol: 'orbit', dodges: true, ranged: 0.6, debuffs: ['reverse', 'lanelock'],
  },
  hollowmoon: {
    name: 'Bell Hollow', painter: 'bell', hp: 7, spd: 10, atk: 2,
    patrol: 'zigzag', dodges: true, ranged: 0.5, debuffs: ['random', 'lanelock'],
  },
  unlitstar: {
    name: 'Unlight Hollow', painter: 'bell', hp: 8, spd: 12, atk: 2,
    patrol: 'corners', dodges: true, ranged: 0.55, debuffs: ['reverse', 'random', 'lanelock'],
  },
};

// A combat-ready enemy instance for a region. Elites ("challengers") sit
// still in the overworld and ask before they bite — stronger, always worth
// an item.
export function makeEnemy(area, { elite = false, rand = Math.random } = {}) {
  const b = area.biome;
  const spec = BESTIARY[b.key] ?? BESTIARY.shatterreef;
  const ring = area.ring ?? 1;
  const dread = b.dread ?? 0.3;
  const hp = Math.round((spec.hp + ring * 1.1 + dread * 2) * (elite ? 1.9 : 1) * 2) / 2;
  const canvas = creatureCanvas({
    id: b.key + (elite ? ':elite' : ''),
    painter: spec.painter,
    base: elite ? b.island.top2 : b.island.top,
    dark: b.island.side,
    eye: b.island.glow,
    size: 160,
  });
  const patrol = PATROLS[spec.patrol] ?? PATROLS.still;
  return {
    kind: 'beast',
    key: b.key, name: elite ? `Elder ${spec.name}` : spec.name,
    elite, ring, dread,
    hp, maxHp: hp,
    atk: spec.atk + (elite && ring >= 3 ? 1 : 0),
    spd: spec.spd + ring * 0.6 + (elite ? 1.5 : 0),
    ranged: spec.ranged,
    patrol, patrolIdx: (rand() * patrol.length) | 0,
    dodges: spec.dodges,
    // control-hexes only trouble the deep rings (or an elite one ring early)
    debuffs: (ring >= 3 || (elite && ring >= 2)) ? (spec.debuffs ?? []) : [],
    strikes: Math.min(4, 1 + Math.floor(ring / 2) + (elite ? 1 : 0)),
    canvas,
    glow: b.island.glow,
    statuses: { burn: 0, freezeTurns: 0, slowTurns: 0 },
  };
}

export function makeWardenEnemy(boundary) {
  const w = WARDENS[boundary] ?? WARDENS[WARDENS.length - 1];
  const canvas = wardenCanvas(boundary, w.tint, w.tint2, w.eye);
  const patrols = [PATROLS.pace, PATROLS.column, PATROLS.orbit, PATROLS.zigzag];
  return {
    kind: 'warden',
    key: w.key, name: w.name, title: w.title,
    boundary, ring: boundary + 1, elite: true,
    hp: 22 + boundary * 9, maxHp: 22 + boundary * 9,
    atk: boundary >= 2 ? 2 : 1,
    spd: 10 + boundary * 1.5,
    ranged: 0.45,
    patrol: patrols[boundary] ?? PATROLS.orbit,
    patrolIdx: 0,
    dodges: boundary >= 1,
    debuffs: [[], ['lanelock'], ['reverse', 'lanelock'], ['reverse', 'random', 'lanelock']][boundary] ?? [],
    strikes: 3 + (boundary >= 2 ? 1 : 0),
    canvas,
    glow: w.eye,
    intro: w.intro, defeatLines: w.defeat,
    statuses: { burn: 0, freezeTurns: 0, slowTurns: 0 },
  };
}
