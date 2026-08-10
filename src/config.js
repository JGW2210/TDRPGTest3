// World constants, biome tables, and runic alphabets.
// Layout: True Orrery Rings — sun archipelago at heart, 4 orbital rings (3+4+5+5 areas),
// asteroid waystations threaded into the outer ring, 3 secret bodies far beyond the rim.
// Art direction: dark aetherial papercraft. Dread rises with ring index.
//
// Per-biome visual specs (Round 6):
//   bodyShape — sculpted archetype for the astral body (see bodies.js)
//   terrain   — island shaping profile + secondary top tone
//   veil      — ambient particle weather over the region's sea
//   landmark  — one named signature structure per region (see structures.js)
//   decor     — bespoke decor kinds unique to the biome (see decorSets.js)

export const HEX = 3; // hex radius in world units

export const RINGS = [
  { radius: 260, count: 3 },
  { radius: 530, count: 4 },
  { radius: 800, count: 5 },
  { radius: 1070, count: 5 },
];

export const SECRET_RADIUS = [1380, 1540];

export const BIOMES = [
  {
    key: 'emberglass', area: 'The Emberglass Reefs', body: 'Aurelion, the Hearthstar',
    bodyKind: 'sun', bodyShape: 'sun', bodySize: 16, bodyColor: 0xffc966, bodyColor2: 0xff7733,
    island: { top: 0xd9995c, top2: 0xc27f6a, side: 0x5c3526, glow: 0xffb347 },
    water: { name: 'the Heliotide', color: 0xffb347, speed: 1.15 },
    decor: { kinds: ['emberfin', 'heatbloom'], color: 0xffd9a0 },
    terrain: { style: 'terrace' },
    veil: { style: 'rise', color: 0xffb347, count: 110, size: 0.9, opacity: 0.7 },
    landmark: { kind: 'brazier', name: 'the First Hearth' },
    dread: 0,
  },
  {
    key: 'chimewood', area: 'The Chimewood Groves', body: 'Aeolith, the Chiming Planet',
    bodyKind: 'planet', bodyShape: 'crystal', bodySize: 5.5, bodyColor: 0x7fe8d8, bodyColor2: 0x2e8f86, hasRings: true,
    island: { top: 0x66d9c4, top2: 0x54b8d9, side: 0x2a5a52, glow: 0x9ffff0 },
    water: { name: 'the Silverstream', color: 0xcfd6ff, speed: 0.7 },
    decor: { kinds: ['chimebell', 'tuningfork'], color: 0xa5fff0 },
    terrain: { style: 'terrace' },
    veil: { style: 'firefly', color: 0x9ffff0, count: 70, size: 0.8, opacity: 0.7 },
    landmark: { kind: 'belltower', name: 'the Great Chime' },
    dread: 0,
  },
  {
    key: 'sporelight', area: 'The Sporelight Mires', body: 'Mycora, the Budding Moon',
    bodyKind: 'planet', bodyShape: 'budding', bodySize: 4.2, bodyColor: 0xb07fe8, bodyColor2: 0x5a3d8f,
    island: { top: 0x8f6ac2, top2: 0x6f8f5a, side: 0x413060, glow: 0xd6a5ff },
    water: { name: 'the Glimmer Fen', color: 0x8cf5a6, speed: 0.55 },
    decor: { kinds: ['sporecap', 'puffcluster'], color: 0xc78bff },
    terrain: { style: 'dune' },
    veil: { style: 'rise', color: 0xd6a5ff, count: 90, size: 1.1, opacity: 0.55, speed: 0.6 },
    landmark: { kind: 'giantcap', name: 'the Elder Cap' },
    dread: 0.05,
  },
  {
    key: 'cinder', area: 'The Cinder Barrows', body: 'Pyrrhus, the Smouldering World',
    bodyKind: 'planet', bodyShape: 'cracked', bodySize: 5.5, bodyColor: 0x8f5a4a, bodyColor2: 0x40241e,
    island: { top: 0x6e4a41, top2: 0x8f5a3d, side: 0x33201b, glow: 0xff8c5a },
    water: { name: 'the Ashwake', color: 0xff6d5a, speed: 0.9 },
    decor: { kinds: ['slagheap', 'emberspike'], color: 0xff9a66 },
    terrain: { style: 'crag' },
    veil: { style: 'rise', color: 0xff8c5a, count: 100, size: 0.8, opacity: 0.65 },
    landmark: { kind: 'throne', name: 'the Smouldering Throne' },
    dread: 0.1,
  },
  {
    key: 'meridian', area: 'The Meridian Deeps', body: 'Thalassa, the Drowned Giant',
    bodyKind: 'planet', bodyShape: 'seagiant', bodySize: 11, bodyColor: 0x4a7fd9, bodyColor2: 0x1e3a8f, hasRings: true,
    island: { top: 0x3f7fc4, top2: 0x2f9aa6, side: 0x1d3a66, glow: 0x7fc4ff },
    water: { name: 'the Undertow', color: 0x4f8cff, speed: 1.3 },
    decor: { kinds: ['coralspire', 'wavestone'], color: 0x86c9ff },
    terrain: { style: 'dune' },
    veil: { style: 'drift', color: 0x7fc4ff, count: 80, size: 1.3, opacity: 0.4 },
    landmark: { kind: 'belltower', name: 'the Drowned Belfry', sunken: true },
    dread: 0.15,
  },
  {
    key: 'cog', area: 'The Cog Strand', body: 'Horolith, the Clockwork World',
    bodyKind: 'planet', bodyShape: 'machined', bodySize: 6, bodyColor: 0xc2995a, bodyColor2: 0x6e5426, hasRings: true,
    island: { top: 0xb08c50, top2: 0x8f7a5c, side: 0x59431f, glow: 0xffd27a },
    water: { name: 'the Quicksilver Race', color: 0xd8e6f2, speed: 1.6 },
    decor: { kinds: ['cogstack', 'pistoncolumn'], color: 0xffd98c },
    terrain: { style: 'terrace' },
    veil: { style: 'firefly', color: 0xffd27a, count: 60, size: 0.7, opacity: 0.6 },
    landmark: { kind: 'clocktower', name: 'the Stopped Clock' },
    dread: 0.15,
  },
  {
    key: 'whisperdune', area: 'The Whisperdune Expanse', body: 'Sarrakh, the Murmuring Waste',
    bodyKind: 'planet', bodyShape: 'banded', bodySize: 7.5, bodyColor: 0xd9c28a, bodyColor2: 0x8f7440,
    island: { top: 0xcbb377, top2: 0xd9c9a0, side: 0x6e5c33, glow: 0xfff0b0 },
    water: { name: 'the Mirage Flow', color: 0xffe08a, speed: 0.8 },
    decor: { kinds: ['sandsail', 'whisperhorn'], color: 0xffe9a8 },
    terrain: { style: 'dune' },
    veil: { style: 'drift', color: 0xffe08a, count: 110, size: 0.9, opacity: 0.45 },
    landmark: { kind: 'hourglass', name: 'the Hourglass of Sarrakh' },
    dread: 0.25,
  },
  {
    key: 'frostveil', area: 'The Frostveil Reach', body: 'Nivalis, the Shrouded Moon',
    bodyKind: 'planet', bodyShape: 'cratered', bodySize: 4, bodyColor: 0xbfe4f2, bodyColor2: 0x5a8ca6,
    island: { top: 0xa8d4e6, top2: 0xd8ecf5, side: 0x4a7286, glow: 0xd6f4ff },
    water: { name: 'the Voidmelt', color: 0x7ce8e0, speed: 0.6 },
    decor: { kinds: ['icefang', 'frostbloom'], color: 0xcaf4ff },
    terrain: { style: 'crag' },
    veil: { style: 'fall', color: 0xd6f4ff, count: 130, size: 0.8, opacity: 0.75, speed: 0.7 },
    landmark: { kind: 'fountain', name: 'the Frozen Fountain' },
    dread: 0.2,
  },
  {
    key: 'thornlight', area: 'The Thornlight Bramble', body: 'Verdanth, the Overgrown',
    bodyKind: 'planet', bodyShape: 'mossy', bodySize: 8.5, bodyColor: 0x5aa64a, bodyColor2: 0x2a5c26,
    island: { top: 0x4f9440, top2: 0x6aa632, side: 0x26471f, glow: 0xa8ff6e },
    water: { name: 'the Sapstream', color: 0xa8e86e, speed: 0.75 },
    decor: { kinds: ['bramblespur', 'lightpod'], color: 0xc0ff8c },
    terrain: { style: 'smooth' },
    veil: { style: 'firefly', color: 0xa8ff6e, count: 90, size: 0.8, opacity: 0.7 },
    landmark: { kind: 'flower', name: 'the Rose of Verdanth' },
    dread: 0.4,
  },
  {
    key: 'graveanchors', area: 'The Grave of Anchors', body: 'Ossuar, the Sunken Fleetworld',
    bodyKind: 'planet', bodyShape: 'cratered', bodySize: 5.2, bodyColor: 0x8c94a6, bodyColor2: 0x40485c,
    island: { top: 0x737d91, top2: 0x5c6a7a, side: 0x333a4a, glow: 0x9adbc0 },
    water: { name: 'the Stygian Drift', color: 0x9adbc0, speed: 0.5 },
    decor: { kinds: ['rustanchor', 'brokenmast'], color: 0xb8e6d2 },
    terrain: { style: 'dune' },
    veil: { style: 'drift', color: 0x9adbc0, count: 70, size: 1.4, opacity: 0.35, speed: 0.5 },
    landmark: { kind: 'anchor', name: "the Admiral's Anchor" },
    dread: 0.55,
  },
  {
    key: 'storm', area: 'The Storm Aviary', body: 'Fulmen, the Tempest Giant',
    bodyKind: 'planet', bodyShape: 'gasgiant', bodySize: 13, bodyColor: 0x6a5cc2, bodyColor2: 0x2e2866, hasRings: true,
    island: { top: 0x5c54a6, top2: 0x4a6ab8, side: 0x282452, glow: 0xa89aff },
    water: { name: 'the Galestream', color: 0x8f9bff, speed: 1.8 },
    decor: { kinds: ['stormrod', 'galestone'], color: 0xb0a8ff },
    terrain: { style: 'crag' },
    veil: { style: 'fall', color: 0x8f9bff, count: 150, size: 0.7, opacity: 0.55, speed: 2.2 },
    landmark: { kind: 'spiretower', name: 'the Lightning Spire' },
    dread: 0.55,
  },
  {
    key: 'lanternfen', area: 'The Lantern Fen', body: 'Vesperine, the Dusk Moon',
    bodyKind: 'planet', bodyShape: 'cratered', bodySize: 4.2, bodyColor: 0x8f5aa6, bodyColor2: 0x47265c,
    island: { top: 0x7a4a91, top2: 0x9c5c8a, side: 0x3a2247, glow: 0xff9adb },
    water: { name: 'the Duskwater', color: 0xc07bff, speed: 0.65 },
    decor: { kinds: ['fenlantern', 'wispreed'], color: 0xffb0e6 },
    terrain: { style: 'smooth' },
    veil: { style: 'firefly', color: 0xff9adb, count: 80, size: 1.0, opacity: 0.75 },
    landmark: { kind: 'lantern', name: 'the Mother Lantern' },
    dread: 0.6,
  },
  {
    key: 'echoverge', area: 'The Echo Verge', body: 'Resonar, the Answering Dark',
    bodyKind: 'planet', bodyShape: 'twinned', bodySize: 6, bodyColor: 0x4a5c8f, bodyColor2: 0x1e2847,
    island: { top: 0x6a7ab0, top2: 0x8a90c2, side: 0x2e3654, glow: 0xa8c4ff },
    water: { name: 'the Answering Stillness', color: 0x9fb8e6, speed: 0.45 },
    decor: { kinds: ['echostone', 'twinshard'], color: 0xa8c4ff },
    terrain: { style: 'terrace' },
    veil: { style: 'firefly', color: 0xa8c4ff, count: 70, size: 0.9, opacity: 0.6, speed: 0.7 },
    landmark: { kind: 'twinstones', name: 'the Answering Stones' },
    dread: 0.5,
  },
  {
    key: 'bleachedchoir', area: 'The Bleached Choir', body: 'Cantus, the Singing Husk',
    bodyKind: 'planet', bodyShape: 'husk', bodySize: 6.5, bodyColor: 0xe6ddc9, bodyColor2: 0x8f8871,
    island: { top: 0xd4ccb5, top2: 0xf0ead6, side: 0x6e6852, glow: 0xfff8e0 },
    water: { name: 'the Requiem Flow', color: 0xfff3d6, speed: 0.7 },
    decor: { kinds: ['bonearch', 'chorister'], color: 0xfffbe8 },
    terrain: { style: 'mesa' },
    veil: { style: 'fall', color: 0xfff8e0, count: 60, size: 0.8, opacity: 0.5, speed: 0.4 },
    landmark: { kind: 'organ', name: 'the Choir Loft' },
    dread: 0.8,
  },
  {
    key: 'silentorchard', area: 'The Silent Orchard', body: 'Pomarium, the Fruiting Dark',
    bodyKind: 'planet', bodyShape: 'orchard', bodySize: 6.5, bodyColor: 0x5c4a3a, bodyColor2: 0x2e2418,
    island: { top: 0xb0a08a, top2: 0x9a8f7a, side: 0x54483a, glow: 0xe8d8a0 },
    water: { name: 'the Fallow Milk', color: 0xd9c9b0, speed: 0.5 },
    decor: { kinds: ['orchardtree', 'fallenfruit'], color: 0xe8d8a0 },
    terrain: { style: 'smooth' },
    veil: { style: 'fall', color: 0xe8d8c9, count: 80, size: 1.0, opacity: 0.55, speed: 0.35 },
    landmark: { kind: 'tree', name: 'the First Tree' },
    dread: 0.85,
  },
  {
    key: 'umbral', area: 'The Umbral Terraces', body: 'Nokturn, the Wrong Shadow',
    bodyKind: 'planet', bodyShape: 'shard', bodySize: 7, bodyColor: 0x3a2e5c, bodyColor2: 0x191433,
    island: { top: 0x322a4a, top2: 0x473a66, side: 0x151126, glow: 0x8c5aff },
    water: { name: 'the Nightsong', color: 0x7a5cff, speed: 0.85 },
    decor: { kinds: ['shadowspike', 'voidshard'], color: 0x9a6eff },
    terrain: { style: 'crag' },
    veil: { style: 'rise', color: 0x8c5aff, count: 80, size: 0.9, opacity: 0.5, speed: 0.5 },
    landmark: { kind: 'sundial', name: 'the Sundial of Night' },
    dread: 0.9,
  },
  {
    key: 'mawshallows', area: 'The Maw Shallows', body: 'Fauces, the Hungering Hollow',
    bodyKind: 'planet', bodyShape: 'maw', bodySize: 7.5, bodyColor: 0x8f4a3d, bodyColor2: 0x33110e,
    island: { top: 0xa65c50, top2: 0x8f4a44, side: 0x4a2620, glow: 0xff9a8a },
    water: { name: 'the Swallowing Tide', color: 0xd96a5a, speed: 1.4 },
    decor: { kinds: ['toothrock', 'ribbone'], color: 0xff9a8a },
    terrain: { style: 'crag' },
    veil: { style: 'drift', color: 0xff8f7a, count: 90, size: 1.2, opacity: 0.4 },
    landmark: { kind: 'ribcage', name: 'the Baleen Arch' },
    dread: 0.95,
  },
  {
    key: 'unblinking', area: 'The Unblinking Shallows', body: 'Ophthal, That Which Watches',
    bodyKind: 'planet', bodyShape: 'eye', bodySize: 6, bodyColor: 0xa6b8b0, bodyColor2: 0x4a5c56,
    island: { top: 0x8ca69c, top2: 0xa6b8a0, side: 0x3d4d47, glow: 0xc9f2e4 },
    water: { name: 'the Lidless Calm', color: 0xb2f0dd, speed: 0.4 },
    decor: { kinds: ['eyestalk', 'saltpillar'], color: 0xd2fff0 },
    terrain: { style: 'dune' },
    veil: { style: 'still', color: 0xc9f2e4, count: 50, size: 0.9, opacity: 0.4 },
    landmark: { kind: 'idol', name: 'the Lidless Idol' },
    dread: 1.0,
  },
];

// Small bare-rock waystations threaded between the outer ring's regions —
// no astral body, no sea of their own, just stone adrift in the void.
export const ASTEROID_BIOMES = [
  {
    key: 'shatterreef', area: 'The Shatter Reef', body: 'a nameless ruin of stone',
    bodyKind: 'rubble', bodyShape: 'rubble', bodySize: 3, bodyColor: 0x8a84a6, bodyColor2: 0x4a4658,
    island: { top: 0x6e6e80, top2: 0x7d7d91, side: 0x33333f, glow: 0x9aa0bd },
    water: { name: 'the Empty Drift', color: 0x5c637a, speed: 0.3 },
    decor: { kinds: ['voidrubble'], color: 0x9aa0bd },
    terrain: { style: 'crag' },
    dread: 0.7, asteroid: true,
  },
  {
    key: 'anvilshoal', area: 'The Anvil Shoal', body: 'an anvil the void forgot',
    bodyKind: 'rubble', bodyShape: 'rubble', bodySize: 3, bodyColor: 0x8a84a6, bodyColor2: 0x4a4658,
    island: { top: 0x75707e, top2: 0x666272, side: 0x36323f, glow: 0xa8a0b8 },
    water: { name: 'the Empty Drift', color: 0x5c637a, speed: 0.3 },
    decor: { kinds: ['voidrubble'], color: 0xa8a0b8 },
    terrain: { style: 'mesa' },
    dread: 0.75, asteroid: true,
  },
  {
    key: 'orphanteeth', area: 'The Orphaned Teeth', body: 'the jaw of something vast',
    bodyKind: 'rubble', bodyShape: 'rubble', bodySize: 3, bodyColor: 0x8a84a6, bodyColor2: 0x4a4658,
    island: { top: 0x807a88, top2: 0x8f8a99, side: 0x3d3947, glow: 0xb0a8c2 },
    water: { name: 'the Empty Drift', color: 0x5c637a, speed: 0.3 },
    decor: { kinds: ['toothrock'], color: 0xb0a8c2 },
    terrain: { style: 'crag' },
    dread: 0.8, asteroid: true,
  },
];

// Teleport concourses (Round 10): one bare-rock islet threaded into each of
// rings 2-4, kin to the waystations but dressed in neoclassical marble — a
// Parthenon-style pillared hut keeps the ring's teleport stone.
export const TELEPORT_BIOMES = [
  {
    key: 'pilgrimconcourse', area: "The Pilgrims' Concourse", body: 'a marble mooring in the void',
    bodyKind: 'rubble', bodyShape: 'rubble', bodySize: 3, bodyColor: 0xd8d2c2, bodyColor2: 0x8f8a78,
    island: { top: 0xd8d2c0, top2: 0xc9c2ae, side: 0x6e6852, glow: 0xfff2cc },
    water: { name: 'the Quiet Crossing', color: 0x9aa8c9, speed: 0.35 },
    decor: { kinds: ['saltpillar'], color: 0xfff2cc },
    terrain: { style: 'mesa' },
    dread: 0.1, asteroid: true, teleport: true,
  },
  {
    key: 'marblerotunda', area: 'The Marble Rotunda', body: 'a drowned forum, still standing',
    bodyKind: 'rubble', bodyShape: 'rubble', bodySize: 3, bodyColor: 0xd8d2c2, bodyColor2: 0x8f8a78,
    island: { top: 0xdcd6c6, top2: 0xcfc8b4, side: 0x736c56, glow: 0xfff2cc },
    water: { name: 'the Quiet Crossing', color: 0x9aa8c9, speed: 0.35 },
    decor: { kinds: ['saltpillar'], color: 0xfff2cc },
    terrain: { style: 'mesa' },
    dread: 0.15, asteroid: true, teleport: true,
  },
  {
    key: 'argentacropolis', area: 'The Argent Acropolis', body: 'the last stones of a high city',
    bodyKind: 'rubble', bodyShape: 'rubble', bodySize: 3, bodyColor: 0xd8d2c2, bodyColor2: 0x8f8a78,
    island: { top: 0xe0daca, top2: 0xd2ccb8, side: 0x787158, glow: 0xfff2cc },
    water: { name: 'the Quiet Crossing', color: 0x9aa8c9, speed: 0.35 },
    decor: { kinds: ['saltpillar'], color: 0xfff2cc },
    terrain: { style: 'mesa' },
    dread: 0.2, asteroid: true, teleport: true,
  },
];

// Stillmoon crystal hues (Round 10): every region grows a small rocky
// satellite platform off its rim, seeded with crystals of ONE of these
// colours — no two neighboring stillmoons should read alike.
export const STILLMOON_CRYSTALS = [
  0xff8fa8, // rose
  0x8cf5a6, // spring green
  0x9fd8ff, // sky
  0xffd27a, // amber
  0xc78bff, // violet
  0x7ce8e0, // ice teal
  0xff9a66, // ember
  0xfff6b0, // pale gold
  0xa8c4ff, // periwinkle
  0xff9adb, // dusk pink
];

// Secret bodies far past the rim. secretHint picks the discovery mechanic:
// 'tide'  — faint tide-path hexes, visible when the sun breathes high
// 'rumor' — path stays sealed until all rumor-rune obelisks are struck
// 'levi'  — a star-leviathan swims the hidden path, its glow marking the way
export const SECRET_BIOMES = [
  {
    key: 'weepingcomet', area: 'The Weeping Comet', body: 'Lacrimae, the Grieving Star',
    bodyKind: 'planet', bodyShape: 'teardrop', bodySize: 4.5, bodyColor: 0xd6f4ff, bodyColor2: 0x6ea6c2,
    island: { top: 0xbfe4f2, top2: 0xd8ecf5, side: 0x527a91, glow: 0xeafcff },
    water: { name: 'the Tearstream', color: 0xa8fff2, speed: 0.9 },
    decor: { kinds: ['tearstone', 'icefang'], color: 0xdefcff },
    terrain: { style: 'crag' },
    veil: { style: 'fall', color: 0xa8fff2, count: 80, size: 0.8, opacity: 0.6 },
    dread: 1.1, secretHint: 'tide',
  },
  {
    key: 'hollowmoon', area: 'The Hollow Moon', body: 'Cavum, the Empty Bell',
    bodyKind: 'planet', bodyShape: 'bellshell', bodySize: 5.5, bodyColor: 0x9a8fb0, bodyColor2: 0x473f5c,
    island: { top: 0x847a99, top2: 0x9a8fb0, side: 0x3a3447, glow: 0xccb8ff },
    water: { name: 'the Echo Tide', color: 0xccb8ff, speed: 0.6 },
    decor: { kinds: ['bellfragment', 'echostone'], color: 0xd8c9ff },
    terrain: { style: 'mesa' },
    veil: { style: 'rise', color: 0xccb8ff, count: 60, size: 0.9, opacity: 0.5, speed: 0.4 },
    dread: 1.15, secretHint: 'rumor',
  },
  {
    key: 'unlitstar', area: 'The Unlit Star', body: 'Nihil, the Inverse Sun',
    bodyKind: 'planet', bodyShape: 'darkstar', bodySize: 8, bodyColor: 0x14101f, bodyColor2: 0x000000,
    island: { top: 0x241d38, top2: 0x2e2547, side: 0x0d0a16, glow: 0x5240a8 },
    water: { name: 'the Unlight', color: 0x5240a8, speed: 0.5 },
    decor: { kinds: ['darkmonolith', 'voidshard'], color: 0x6e54c2 },
    terrain: { style: 'crag' },
    veil: { style: 'rise', color: 0x5240a8, count: 70, size: 1.1, opacity: 0.4, speed: 0.3 },
    dread: 1.3, secretHint: 'levi',
  },
];

// Two lines of arrival dialogue per region, spoken by the cartographer's
// whisper during the discovery cutscene (advanced by click).
export const INTRO_LINES = {
  emberglass: [
    "The Hearthstar's warmth reaches even here, where glass grows like coral.",
    'Every tide leaves embers on the shore. None of them cool.',
  ],
  chimewood: [
    'Listen — the crystals ring each other awake as you pass.',
    'Sailors tune their hearts to the Silverstream, and are never lost again.',
  ],
  sporelight: [
    'Spores drift upward like slow rain that changed its mind.',
    'The mires glow kindly. Do not ask what feeds them.',
  ],
  cinder: [
    'Ash settles on the water here, and keeps burning.',
    'Pyrrhus smoulders with old grudges; its barrows remember the fire.',
  ],
  meridian: [
    'Thalassa drowned long ago, and kept on growing.',
    'The Undertow pulls all reckonings toward the deep.',
  ],
  cog: [
    'Every isle here keeps its own stubborn time.',
    'Horolith turns, and the Quicksilver Race runs like a wound spring.',
  ],
  whisperdune: [
    'The dunes murmur your name. Best not to answer.',
    'Mirages sail these waters. So, now, do you.',
  ],
  frostveil: [
    'The Voidmelt is warmer than the air. Barely.',
    'Nivalis hides behind its veil and watches the ice bloom.',
  ],
  thornlight: [
    "The bramble grows toward a light that isn't there yet.",
    'Verdanth overgrew its own name. Given time, it will overgrow yours.',
  ],
  graveanchors: [
    'Every anchor here was dropped with a prayer. None were answered.',
    'The Stygian Drift is slow, but it forgets nothing.',
  ],
  storm: [
    "Fulmen's storms have circled a thousand years without making landfall.",
    "Ride the Galestream lightly. It already knows where you're going.",
  ],
  lanternfen: [
    'The fen lights lanterns for travelers it has taken a liking to.',
    'Dusk never quite finishes here. Vesperine prefers it so.',
  ],
  echoverge: [
    'Say nothing. The Verge will say it back, and mean it differently.',
    'Resonar split in an age before echoes; the halves still answer each other.',
  ],
  bleachedchoir: [
    'The choir bleached white waiting for a note that never came.',
    'Cantus sings through its hollows when the void breathes right.',
  ],
  silentorchard: [
    'The orchard is silent. The fruit is not asleep.',
    'Pomarium bears every season at once, and harvests none.',
  ],
  umbral: [
    'Your shadow arrived here before you did.',
    "Nokturn casts light's opposite. Step carefully between the terraces.",
  ],
  mawshallows: [
    'The tide here swallows. The shallows are its teeth.',
    'Fauces hungers slowly. It has never once been full.',
  ],
  unblinking: [
    'Ophthal has watched your whole approach. It is watching now.',
    'The Lidless Calm ripples only when something below is pleased.',
  ],
  shatterreef: [
    'Bare stone, thin dark, and the long way between.',
    'Rest here, traveler. Nothing else does.',
  ],
  anvilshoal: [
    'Something vast was forged out here, and the anvil left behind.',
    'The rubble still rings faintly when struck.',
  ],
  orphanteeth: [
    'The jaw of something that once bit stars.',
    'Walk the teeth. Mind the gaps.',
  ],
  weepingcomet: [
    'Lacrimae grieves for a sun it never met.',
    'The Tearstream never freezes. Grief keeps it moving.',
  ],
  hollowmoon: [
    'Cavum is empty, and empty things ring loudest.',
    "The Echo Tide answers bells that haven't rung yet.",
  ],
  unlitstar: [
    'Nihil shines darkness the way other stars shine light.',
    'You have found the place the light forgot on purpose.',
  ],
  pilgrimconcourse: [
    'Marble, out here. Someone believed the void could be civilised.',
    'The teleport stone hums in its pillared hut, patient as arithmetic.',
  ],
  marblerotunda: [
    'A forum with no speakers, a rotunda with no roof worth the name.',
    'The stone remembers every crossing ever made from it.',
  ],
  argentacropolis: [
    'The high city fell upward, and this acropolis is what caught.',
    'Its columns still hold the sky they were promised.',
  ],
};

// ---------------------------------------------------------------------------
// The stormfront: a maelstrom sheet sealing everything beyond the frontier
// ring. One boundary per ring crossing; each dispels when its ward's
// criterion is met (this pass: seize the stormheart shard beside the gate).
export const STORM = {
  color: 0x241f4d,     // deep storm indigo
  bright: 0x8a76e6,    // violet churn highlights
  flash: 0xdfe6ff,     // lightning
  outer: 2400,         // the sheet's far edge
  sheetY: 9,           // hangs above the seas, below the labels
};

// Inner radius of the storm sheet for each frontier ring (0 = only the sun
// region is calm). Chosen to clear each ring's region rims + gate islets.
export const STORM_BOUNDARIES = [145, 400, 668, 938];

// Two lines for the shard-claim cutscene, per ring boundary: the crystal
// flies to the great gate's crown and ARMS it. The storm holds until the
// gate is actually used.
export const SHARD_LINES = [
  [
    'The shard leaps from your grasp and seats itself in the great gate’s crown.',
    'The dolmen wakes beneath it. The storm beyond holds its breath.',
  ],
  [
    'A second stormheart finds its socket, and the crown drinks the crackle whole.',
    'The gate is armed. The maelstrom watches you decide.',
  ],
  [
    'The gate takes the crystal like a debt long owed, and stands taller for it.',
    'One launch remains in it. The storm already knows.',
  ],
  [
    'The last stormheart clicks home. The crown blazes like a caught star.',
    'Beyond the veil the outer dark waits to be won.',
  ],
];

// Two lines for the ascension launch — spoken as the beam takes you and the
// stormfront rolls back. There is no way back through a spent gate.
export const WARD_LINES = [
  [
    'The crown discharges, and the beam takes you with it.',
    'Aurora floods the void. The first ring rides out the last of its storm.',
  ],
  [
    'The crystal burns itself hollow to carry you, and the maelstrom unclenches its fist.',
    'The second ring turns slowly in the calm you have made. The way back is sealed.',
  ],
  [
    'Light swallows you whole; the storm parts like torn paper.',
    'Past the calming line, the third ring glitters — and glitters back.',
  ],
  [
    'The last stormfront breaks upon its own heart as the beam carries you through.',
    'The outer dark lies open. Nothing else stands between you and the deep.',
  ],
];

// ---------------------------------------------------------------------------
// Land-trap atlas (Round 9): the one-maw-fits-all chomper is retired. Each
// biome that keeps a chomper gets a personalised archetype + tint; biomes
// absent here carry no chompers at all (snares/geysers/strikes only).
// Rings 1-2 place chompers at ~30% of base density; the Maw Shallows is
// boosted — it is the trap's homeland.
export const TRAPS = {
  mawshallows: { kind: 'toothmaw', tint: 0x4a2620, boost: 1.6 },
  thornlight: { kind: 'flytrap', tint: 0x3f7a33 },
  sporelight: { kind: 'flytrap', tint: 0x8f6ac2 },
  silentorchard: { kind: 'flytrap', tint: 0x9a8f7a },
  meridian: { kind: 'clamshell', tint: 0x2f9aa6 },
  graveanchors: { kind: 'clamshell', tint: 0x5c6a7a },
  unblinking: { kind: 'clamshell', tint: 0x8ca69c },
  cog: { kind: 'gearpress', tint: 0xb08c50 },
  bleachedchoir: { kind: 'bonejaw', tint: 0xe6ddc9 },
  whisperdune: { kind: 'bonejaw', tint: 0xcbb377 },
  umbral: { kind: 'bonejaw', tint: 0x473a66 },
  lanternfen: { kind: 'lure', tint: 0xff9adb },
  frostveil: { kind: 'lure', tint: 0xd6f4ff },
  storm: { kind: 'lure', tint: 0xa89aff },
};

// Two lines for the lodestone chain-reveal cutscene.
export const LODE_LINES = [
  'The lodestone tears free of your hands and streaks out over the sea.',
  'One by one the drowned rocks answer it, heaving up out of the dark.',
];

// Hermits of the void — one squats on each event-body at the end of a rock
// chain. Two lines apiece, spoken every visit; a small gift on the first.
export const HERMITS = [
  {
    name: 'the Tidewatcher', lines: [
      'I count the breaths of the sun. Eleven thousand and four, since you ask.',
      'Take this and go quietly. The tide dislikes being watched back.',
    ],
  },
  {
    name: 'the Unlit Lamplighter', lines: [
      'I put the stars out, one by one, when their shift is done.',
      'You glow too loudly, little wisp. Here — dim yourself somewhere safe.',
    ],
  },
  {
    name: 'the Collector of Corners', lines: [
      'Every void has corners. I keep the spare ones here.',
      'Mind how you leave. You are standing on my second-best corner.',
    ],
  },
  {
    name: 'the Backwards Pilgrim', lines: [
      'I am walking to where I started. It is further than you would think.',
      'You travel outward? Then we have already met, somewhere ahead.',
    ],
  },
  {
    name: 'the Moth-Warden', lines: [
      'The moths carry my letters to the Hearthstar. None have come back.',
      'Post nothing you love. Take this instead — it never writes.',
    ],
  },
  {
    name: 'the Half-Asleep Astronomer', lines: [
      'I have nearly finished naming the dark between the stars.',
      'The gap you sailed through is called Gerald. Treat him kindly.',
    ],
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
