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

- **18 regions**: sun + 4 orbital rings (3/4/4/3 areas at radii
  260/530/800/1070) + 3 secret bodies past 1380. Layout on 8 staggered
  spoke angles. Each region is an ISOLATED archipelago — no walkable
  connection between regions, only void.
- **Region generation** (`worldgen.js generateRegion`): a connected water
  blob grows from a ring nestling the astral body; 3-5 islands of 10-30
  hexes grow inside it (a hex apart, island-level base heights, lower
  shorelines); waters ≈ 80-90% of walkable tiles; region radius sized to
  its sea, hard-capped so facing gate islets can never bridge the void.
- **Gates** = pairs of 7-hex bare-rock node islets on facing rims, crowned
  with runic warden rings. Entering (or clicking — invisible hitboxes) one
  BLASTS the wisp to its twin. Same-ring gates chain neighbors around each
  ring and fly ALONG THE ORBIT (polar-lerp arc; ports placed tangentially);
  each ring boundary has exactly ONE randomly-placed radial gate flying a
  straight shot; 3 secret gates likewise straight. First use announces the
  Warden (boss hook lives in `main.js handleGate`).
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
| `config.js` | HEX size, RINGS radii, biome/water tables, runes, toRunes |
| `worldgen.js` | Seeded gen: layout → regions → gates → locks → leviathans |
| `buildWorld.js` | All meshes/décor/animators + runtime API (updateFlags, releaseLock, bounceIsle, boingGate, wobbleBody) |
| `materials.js` | Water shader (layer options: lift/ghost/unify/wobble/fade), swirl, canvas textures |
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

Built across one long session via design polls (all recorded in
DESIGN.md): Ink & Starlight v1 with walkable rivers → Orb-Weaver's web +
riverflight → papercraft turn → dark aetherial depth pass → isolated
island regions with blast gates → vast seas → one-gate-per-ring + orbit
blasts + layered living water + soft rims. The dev branch
`claude/tdrpgtest3-world-map-skpoyn` was merged to `main` via PR; future
work should branch fresh from `main`.
