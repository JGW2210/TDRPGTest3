// World constants, biome tables, and runic alphabets.
// Layout: True Orrery Rings — sun archipelago at heart, 4 orbital rings (3+4+4+3 areas),
// 3 secret bodies far beyond the rim. Art direction: Ink & Starlight.
// Dread rises with ring index (Cosmic-Horror Fringe): outer rings get subtly wrong.

export const HEX = 3; // hex radius in world units

export const RINGS = [
  { radius: 190, count: 3 },
  { radius: 390, count: 4 },
  { radius: 590, count: 4 },
  { radius: 790, count: 3 },
];

export const SECRET_RADIUS = [1080, 1230];

export const BIOMES = [
  {
    key: 'emberglass', area: 'The Emberglass Reefs', body: 'Aurelion, the Hearthstar',
    bodyKind: 'sun', bodySize: 16, bodyColor: 0xffc966, bodyColor2: 0xff7733,
    island: { top: 0xd9995c, side: 0x5c3526, glow: 0xffb347 },
    water: { name: 'the Heliotide', color: 0xffb347, speed: 1.15 },
    decor: { kinds: ['glass', 'spire'], color: 0xffd9a0 },
    dread: 0,
  },
  {
    key: 'chimewood', area: 'The Chimewood Groves', body: 'Aeolith, the Chiming Planet',
    bodyKind: 'planet', bodySize: 6.5, bodyColor: 0x7fe8d8, bodyColor2: 0x2e8f86, hasRings: true,
    island: { top: 0x66d9c4, side: 0x2a5a52, glow: 0x9ffff0 },
    water: { name: 'the Silverstream', color: 0xcfd6ff, speed: 0.7 },
    decor: { kinds: ['crystal', 'ring'], color: 0xa5fff0 },
    dread: 0,
  },
  {
    key: 'sporelight', area: 'The Sporelight Mires', body: 'Mycora, the Budding Moon',
    bodyKind: 'planet', bodySize: 5, bodyColor: 0xb07fe8, bodyColor2: 0x5a3d8f,
    island: { top: 0x8f6ac2, side: 0x413060, glow: 0xd6a5ff },
    water: { name: 'the Glimmer Fen', color: 0x8cf5a6, speed: 0.55 },
    decor: { kinds: ['shroom', 'shard'], color: 0xc78bff },
    dread: 0.05,
  },
  {
    key: 'cinder', area: 'The Cinder Barrows', body: 'Pyrrhus, the Smouldering World',
    bodyKind: 'planet', bodySize: 6, bodyColor: 0x8f5a4a, bodyColor2: 0x40241e,
    island: { top: 0x6e4a41, side: 0x33201b, glow: 0xff8c5a },
    water: { name: 'the Ashwake', color: 0xff6d5a, speed: 0.9 },
    decor: { kinds: ['monolith', 'crystal'], color: 0xff9a66 },
    dread: 0.1,
  },
  {
    key: 'meridian', area: 'The Meridian Deeps', body: 'Thalassa, the Drowned Giant',
    bodyKind: 'planet', bodySize: 8.5, bodyColor: 0x4a7fd9, bodyColor2: 0x1e3a8f, hasRings: true,
    island: { top: 0x3f7fc4, side: 0x1d3a66, glow: 0x7fc4ff },
    water: { name: 'the Undertow', color: 0x4f8cff, speed: 1.3 },
    decor: { kinds: ['spire', 'ring'], color: 0x86c9ff },
    dread: 0.15,
  },
  {
    key: 'cog', area: 'The Cog Strand', body: 'Horolith, the Clockwork World',
    bodyKind: 'planet', bodySize: 6, bodyColor: 0xc2995a, bodyColor2: 0x6e5426, hasRings: true,
    island: { top: 0xb08c50, side: 0x59431f, glow: 0xffd27a },
    water: { name: 'the Quicksilver Race', color: 0xd8e6f2, speed: 1.6 },
    decor: { kinds: ['ring', 'monolith'], color: 0xffd98c },
    dread: 0.15,
  },
  {
    key: 'whisperdune', area: 'The Whisperdune Expanse', body: 'Sarrakh, the Murmuring Waste',
    bodyKind: 'planet', bodySize: 7, bodyColor: 0xd9c28a, bodyColor2: 0x8f7440,
    island: { top: 0xcbb377, side: 0x6e5c33, glow: 0xfff0b0 },
    water: { name: 'the Mirage Flow', color: 0xffe08a, speed: 0.8 },
    decor: { kinds: ['spire', 'shard'], color: 0xffe9a8 },
    dread: 0.25,
  },
  {
    key: 'frostveil', area: 'The Frostveil Reach', body: 'Nivalis, the Shrouded Moon',
    bodyKind: 'planet', bodySize: 5, bodyColor: 0xbfe4f2, bodyColor2: 0x5a8ca6,
    island: { top: 0xa8d4e6, side: 0x4a7286, glow: 0xd6f4ff },
    water: { name: 'the Voidmelt', color: 0x7ce8e0, speed: 0.6 },
    decor: { kinds: ['crystal', 'shard'], color: 0xcaf4ff },
    dread: 0.2,
  },
  {
    key: 'thornlight', area: 'The Thornlight Bramble', body: 'Verdanth, the Overgrown',
    bodyKind: 'planet', bodySize: 7.5, bodyColor: 0x5aa64a, bodyColor2: 0x2a5c26,
    island: { top: 0x4f9440, side: 0x26471f, glow: 0xa8ff6e },
    water: { name: 'the Sapstream', color: 0xa8e86e, speed: 0.75 },
    decor: { kinds: ['spire', 'shroom'], color: 0xc0ff8c },
    dread: 0.4,
  },
  {
    key: 'graveanchors', area: 'The Grave of Anchors', body: 'Ossuar, the Sunken Fleetworld',
    bodyKind: 'planet', bodySize: 6, bodyColor: 0x8c94a6, bodyColor2: 0x40485c,
    island: { top: 0x737d91, side: 0x333a4a, glow: 0x9adbc0 },
    water: { name: 'the Stygian Drift', color: 0x9adbc0, speed: 0.5 },
    decor: { kinds: ['monolith', 'shard'], color: 0xb8e6d2 },
    dread: 0.55,
  },
  {
    key: 'storm', area: 'The Storm Aviary', body: 'Fulmen, the Tempest Giant',
    bodyKind: 'planet', bodySize: 9, bodyColor: 0x6a5cc2, bodyColor2: 0x2e2866, hasRings: true,
    island: { top: 0x5c54a6, side: 0x282452, glow: 0xa89aff },
    water: { name: 'the Galestream', color: 0x8f9bff, speed: 1.8 },
    decor: { kinds: ['crystal', 'monolith'], color: 0xb0a8ff },
    dread: 0.55,
  },
  {
    key: 'lanternfen', area: 'The Lantern Fen', body: 'Vesperine, the Dusk Moon',
    bodyKind: 'planet', bodySize: 5, bodyColor: 0x8f5aa6, bodyColor2: 0x47265c,
    island: { top: 0x7a4a91, side: 0x3a2247, glow: 0xff9adb },
    water: { name: 'the Duskwater', color: 0xc07bff, speed: 0.65 },
    decor: { kinds: ['shroom', 'ring'], color: 0xffb0e6 },
    dread: 0.6,
  },
  {
    key: 'bleachedchoir', area: 'The Bleached Choir', body: 'Cantus, the Singing Husk',
    bodyKind: 'planet', bodySize: 6.5, bodyColor: 0xe6ddc9, bodyColor2: 0x8f8871,
    island: { top: 0xd4ccb5, side: 0x6e6852, glow: 0xfff8e0 },
    water: { name: 'the Requiem Flow', color: 0xfff3d6, speed: 0.7 },
    decor: { kinds: ['spire', 'monolith'], color: 0xfffbe8 },
    dread: 0.8,
  },
  {
    key: 'umbral', area: 'The Umbral Terraces', body: 'Nokturn, the Wrong Shadow',
    bodyKind: 'planet', bodySize: 7, bodyColor: 0x3a2e5c, bodyColor2: 0x191433,
    island: { top: 0x322a4a, side: 0x151126, glow: 0x8c5aff },
    water: { name: 'the Nightsong', color: 0x7a5cff, speed: 0.85 },
    decor: { kinds: ['monolith', 'crystal'], color: 0x9a6eff },
    dread: 0.9,
  },
  {
    key: 'unblinking', area: 'The Unblinking Shallows', body: 'Ophthal, That Which Watches',
    bodyKind: 'planet', bodySize: 6, bodyColor: 0xa6b8b0, bodyColor2: 0x4a5c56,
    island: { top: 0x8ca69c, side: 0x3d4d47, glow: 0xc9f2e4 },
    water: { name: 'the Lidless Calm', color: 0xb2f0dd, speed: 0.4 },
    decor: { kinds: ['shard', 'ring'], color: 0xd2fff0 },
    dread: 1.0,
  },
];

// Secret bodies far past the rim. secretHint picks the discovery mechanic:
// 'tide'  — faint tide-path hexes, visible when the sun breathes high
// 'rumor' — path stays sealed until all rumor-rune obelisks are struck
// 'levi'  — a star-leviathan swims the hidden path, its glow marking the way
export const SECRET_BIOMES = [
  {
    key: 'weepingcomet', area: 'The Weeping Comet', body: 'Lacrimae, the Grieving Star',
    bodyKind: 'planet', bodySize: 4.5, bodyColor: 0xd6f4ff, bodyColor2: 0x6ea6c2,
    island: { top: 0xbfe4f2, side: 0x527a91, glow: 0xeafcff },
    water: { name: 'the Tearstream', color: 0xa8fff2, speed: 0.9 },
    decor: { kinds: ['crystal', 'spire'], color: 0xdefcff },
    dread: 1.1, secretHint: 'tide',
  },
  {
    key: 'hollowmoon', area: 'The Hollow Moon', body: 'Cavum, the Empty Bell',
    bodyKind: 'planet', bodySize: 5.5, bodyColor: 0x9a8fb0, bodyColor2: 0x473f5c,
    island: { top: 0x847a99, side: 0x3a3447, glow: 0xccb8ff },
    water: { name: 'the Echo Tide', color: 0xccb8ff, speed: 0.6 },
    decor: { kinds: ['ring', 'monolith'], color: 0xd8c9ff },
    dread: 1.15, secretHint: 'rumor',
  },
  {
    key: 'unlitstar', area: 'The Unlit Star', body: 'Nihil, the Inverse Sun',
    bodyKind: 'planet', bodySize: 7, bodyColor: 0x14101f, bodyColor2: 0x000000,
    island: { top: 0x241d38, side: 0x0d0a16, glow: 0x5240a8 },
    water: { name: 'the Unlight', color: 0x5240a8, speed: 0.5 },
    decor: { kinds: ['monolith', 'shard'], color: 0x6e54c2 },
    dread: 1.3, secretHint: 'levi',
  },
];

export const GATE_RUNES = [
  { ch: 'ᚠ', name: 'Fehu' }, { ch: 'ᚢ', name: 'Uruz' }, { ch: 'ᚦ', name: 'Thurisaz' },
  { ch: 'ᚨ', name: 'Ansuz' }, { ch: 'ᚱ', name: 'Raidho' }, { ch: 'ᚲ', name: 'Kenaz' },
  { ch: 'ᚷ', name: 'Gebo' }, { ch: 'ᚹ', name: 'Wunjo' }, { ch: 'ᚺ', name: 'Hagalaz' },
  { ch: 'ᚾ', name: 'Nauthiz' }, { ch: 'ᛁ', name: 'Isa' }, { ch: 'ᛃ', name: 'Jera' },
  { ch: 'ᛇ', name: 'Eihwaz' }, { ch: 'ᛈ', name: 'Perthro' }, { ch: 'ᛉ', name: 'Algiz' },
  { ch: 'ᛊ', name: 'Sowilo' }, { ch: 'ᛏ', name: 'Tiwaz' }, { ch: 'ᛒ', name: 'Berkano' },
  { ch: 'ᛖ', name: 'Ehwaz' }, { ch: 'ᛗ', name: 'Mannaz' }, { ch: 'ᛚ', name: 'Laguz' },
  { ch: 'ᛜ', name: 'Ingwaz' }, { ch: 'ᛞ', name: 'Dagaz' }, { ch: 'ᛟ', name: 'Othala' },
];

export const RUNE_CHARS = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';

const LETTER_RUNES = {
  a: 'ᚨ', b: 'ᛒ', c: 'ᚲ', d: 'ᛞ', e: 'ᛖ', f: 'ᚠ', g: 'ᚷ', h: 'ᚺ', i: 'ᛁ',
  j: 'ᛃ', k: 'ᚲ', l: 'ᛚ', m: 'ᛗ', n: 'ᚾ', o: 'ᛟ', p: 'ᛈ', q: 'ᚲ', r: 'ᚱ',
  s: 'ᛊ', t: 'ᛏ', u: 'ᚢ', v: 'ᚹ', w: 'ᚹ', x: 'ᛉ', y: 'ᛇ', z: 'ᛉ',
};

export function toRunes(text) {
  return String(text).split('').map((c) => LETTER_RUNES[c.toLowerCase()] ?? c).join('');
}

export const WORLD_ADJ = ['Shattered', 'Slumbering', 'Gilded', 'Silent', 'Wandering', 'Runebound', 'Umbral', 'Radiant', 'Drowned', 'Hollow'];
export const WORLD_NOUN = ['Meridian', 'Reaches', 'Orrery', 'Expanse', 'Chorus', 'Tides', 'Firmament', 'Procession', 'Wheel'];
