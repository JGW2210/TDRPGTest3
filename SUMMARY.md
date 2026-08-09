# Astral Reaches — Session Handoff Summary

Context for picking up work on this repo. Read this first, then `DESIGN.md`
(decision history) and `README.md` (player-facing feature list).

## What this is

A procedural world map for a roguelike (Binding of Isaac-inspired) game,
built with three.js + Vite. A wisp navigates hex archipelagos orbiting a
paper sun in a dark aetherial papercraft cosmos. Everything is seeded
(`?seed=`, default `AETHERION`). Live at
`https://jgw2210.github.io/TDRPGTest3/` — auto-deployed by
`.github/workflows/deploy.yml` on pushes to `main` (and the dev branch).

## Current world anatomy (the important state)

- **24 areas**: sun + 4 orbital rings (3/4/5/5 regions at radii
  260/530/800/1070) + 3 bare-rock ASTEROID WAYSTATIONS threaded between
  ring-4 neighbors + 3 secret bodies past 1380. Layout on 8 staggered spoke
  angles. Each region is an ISOLATED archipelago — no walkable connection
  between regions, only void.
- **Region generation** (`worldgen.js generateRegion`): a connected water
  blob grows from a ring nestling the astral body; 3-5 islands of 10-30
  hexes grow inside it (a hex apart, island-level base heights, lower
  shorelines); waters ≈ 80-90% of walkable tiles; region radius sized to
  its sea, hard-capped so facing gate islets can never bridge the void.
  Asteroid areas (`generateAsteroidRegion`, `area.asteroid`) are one
  connected knot of ~10-18 rock hexes: no water, no fringe, no body — just
  a slow rubble knot overhead. Their gate paving is rock, not water.
- **Gates** = pairs of 7-hex bare-rock node islets on facing rims bearing
  DOLMEN WAYGATES (`structures.js`): rough hash-jittered pillars, cracked
  capstone, rubble, moss, carved rune plates, an aurora energy veil
  (`makeVeilMaterial`) between the pillars. Entering (or clicking —
  invisible hitboxes) one BLASTS the wisp to its twin. Same-ring gates
  chain neighbors around each ring (through the waystations on ring 4), fly
  ALONG THE ORBIT (polar-lerp arc), and their doorways FACE THE ORBIT'S
  TANGENT signed toward the twin; radial/secret gates face their twin
  straight on. Each ring boundary has exactly ONE randomly-placed radial
  gate; 3 secret gates likewise. First use announces the Warden (boss hook
  lives in `main.js handleGate`).
- **Per-biome identity** (config fields → renderers): `bodyShape` →
  sculpted archetypes in `bodies.js` (sizes ~4-13; eye blinks, maw chews,
  twinned lobes breathe); `terrain.style` (terrace/dune/crag/mesa/smooth) +
  `island.top2` two-tone + shoreline water-glow tint in the isle loop;
  `veil` → per-region particle weather (rise/fall/drift/firefly/still);
  `landmark` → one named structure per non-secret region
  (`makeLandmark`), label runic until discovery (`labelsByLandmark`);
  `decor.kinds` → bespoke sets in `decorSets.js` (~40 kinds, `glow`/`tint`
  flags).
- **Locks**: 3 stormwalls seal random gates' departure nodes (rune-stone
  key on an island in the same region); the Hollow Moon's outer node needs
  3 rumor-rune obelisks struck across ring-2+ regions. Blocked hexes are
  unwalkable and blasts refuse a stormbound far node.
- **Water**: two instanced layers sharing instance data — near-opaque
  glassy base in each region's water color, sinking to per-hex noise
  depths; plus a translucent ghost-sheet (+0.52, α≈0.32) unified to one
  aetherial slate-blue, patchy along its drifting light-bands, wobbling at
  its own slower/taller rate. Two rings of unwalkable fringe hexes fade
  each region's rim into the void (render-only, not in the hex map).
- **Fog of war** (`buildWorld` fog section): every region starts unseen —
  instances zero-scaled via per-area registries (`instanceGroups`,
  `objectsByArea`), objects hidden. `built.revealArea(areaId, animated)`
  pops a region in (staggered easeOutBack swell). Main reveals the start
  region instantly; `discoverArea` reveals the rest. Fogged port hitboxes
  are filtered out of the raycast in `main.js hexKeyAt`.
- **Discovery cutscene** (`cutscene.js` + `ui.dialogue`): on first landfall
  the camera glides to the region's body (pitch levels to 0.5, slow yaw
  drift), `INTRO_LINES[biome.key]` advance by click, final click glides
  home. `controls.onClick` routes to `cutscene.advance()` while active.
- **Render-order contract**: the sea draws base (0) then ghost-sheet (1);
  ANY transparent thing above the water needs renderOrder ≥ 2 or the sheet
  overpaints it (bodyGroup children get 3 via a traverse; veils/lock fx 2;
  labels 30).
- **Leviathans**: two serpents loop the void between orbits; a third
  wheels around the Unlit Star's hidden crossing as its discovery hint.
- **UI**: non-modular floating runic text; Twin-Tongue deciphering (runes
  → letters on discovery); labels depth-test-off + zoom-scaled; movement
  grid lives in UI (pulsing hover hex outline + dotted route trail).
- **Style**: dark cosmic indigo + papercraft — toon shading with ink
  outline shells, paper sun with spinning ray crown, per-body signature
  features, named drifting curios, squash & bounce everywhere.

## Code map (src/)

| File | Role |
| --- | --- |
| `config.js` | HEX size, RINGS radii, biome tables (incl. bodyShape/terrain/veil/landmark/decor kinds), ASTEROID_BIOMES, runes |
| `worldgen.js` | Seeded gen: layout → regions + asteroid waystations → gates → locks → leviathans |
| `buildWorld.js` | All meshes/décor/animators + runtime API (updateFlags, releaseLock, bounceIsle, boingGate, wobbleBody) |
| `bodies.js` | sculptBody: bespoke per-body geometry archetypes (tear-free position-hash displacement) |
| `structures.js` | makeDolmenGate + makeLandmark (17 landmark kinds) |
| `cutscene.js` | Discovery cutscene: camera glide + click-through dialogue |
| `decorSets.js` | buildDecorLibrary: ~40 merged decor geometries, glow/tint flags |
| `materials.js` | Water shader (layer options: lift/ghost/unify/wobble/fade), energy veil, canvas textures |
| `player.js` | Click-to-sail BFS stepping, squashy hops, `startBlast(destKey, 'arc'|'line')` |
| `controls.js` | LMB-drag glide, RMB-drag rotate, wheel zoom (max 3600) |
| `main.js` | Wiring: lights/bloom, gate/lock/discovery handlers, hover+path UI, `window.__astral` debug handle |
| `pathfind.js`, `hexmath.js`, `rng.js`, `labels.js`, `ui.js` | Support |

## Dev workflow

- `npm run dev` / `npm run build` (Vite, relative base for Pages).
- Headless smoke tests: playwright-core + system chromium
  (`--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader`),
  drive the app via `window.__astral` (`{ world, player, controls }`) —
  e.g. teleport with `player.hexKey = key; player._syncToHex()`, walk with
  `player.requestMove(key)`, inspect `world.gates/locks/areas`.
- NOTE: headless SwiftShader runs ~8fps and `dt` clamps at 0.05s, so walks
  look slow in tests — frame-rate independent on real GPUs.

## Gotchas

- Worldgen/build rng call ORDER is the seed contract — reordering rng
  calls reshuffles every world.
- Region `maxDist` cap (clear+9..15) is the geometric guarantee that two
  facing gate islets never merge into a walkable void-bridge. If orbits or
  region sizes change, re-check that invariant.
- Custom instanced attributes live on the GEOMETRY (shared by base water,
  ghost sheet); `instanceMatrix` lives on each MESH (shared by
  assignment). The fringe mesh clones the geometry for its own attributes.
- `hex.elev` is mutated at build time (height spread) — build runs before
  Player is constructed, and decor/keystones read it after.
- Labels must keep `depthTest: false` + renderOrder, or they vanish under
  tiles.

## Roadmap (undone, in rough priority)

1. Warden combat at gates (hook: `handleGate` in main.js — gate has id,
   rune, kind, both port keys, both area ids). Warden's Toll design in
   DESIGN.md poll 10.
2. Run structure: permadeath loop, run seeds, unlocks.
3. Tide-gated hexes (flood/drain with breath); flavor-specific water rules.
4. Full planetary revolution (rigid region groups; gates re-anchor).
5. Dewdrop lakes / shops / shrines at points of interest.
6. Sound: chimes for discovery, deciphering ticks, blast whoosh.

## History

Built across sessions via design polls (all recorded in DESIGN.md): Ink &
Starlight v1 with walkable rivers → Orb-Weaver's web + riverflight →
papercraft turn → dark aetherial depth pass → isolated island regions with
blast gates → vast seas → one-gate-per-ring + orbit blasts + layered
living water + soft rims → Round 6 visual-identity pass (dolmen waygates
facing orbit tangents, sculpted body archetypes, per-biome terrain/decor/
veils/landmarks, 3/4/5/5 rings + asteroid waystations, Echo Verge / Silent
Orchard / Maw Shallows). The first dev branch was merged to `main` via PR;
Round 6 lives on `claude/game-visuals-world-design-0hk7so`.
