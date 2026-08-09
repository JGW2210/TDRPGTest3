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
  connected knot of ~10-18 rock hexes; each keeps a glowing HEALING SPRING
  (`hex.spring` — one heart, once per visit, re-armed on area re-entry).
- **Gates** = pairs of 7-hex bare-rock node islets on facing rims bearing
  DOLMEN WAYGATES (`structures.js`). Entering (or clicking — invisible
  hitboxes) one BLASTS the wisp to its twin. Same-ring gates chain neighbors
  around each ring (through the waystations on ring 4), fly ALONG THE ORBIT,
  doorways facing the orbit's tangent; radial/secret gates face their twin
  straight on. Each ring boundary has exactly ONE radial gate
  (`gate.boundary` = 0..3); 3 secret gates (`gate.secretGate`). First use
  announces the Warden (boss hook lives in `main.js handleGate`).
- **STORM PROGRESSION (Round 8)** — the old rune-pedestal locks are GONE.
  A vast MAELSTROM SHEET (`makeStormMaterial`, ring mesh at renderOrder 5)
  seals everything beyond the frontier ring; inner calm radii per frontier
  live in `STORM_BOUNDARIES` (145/400/668/938 — chosen to clear region rims
  + gate islets; re-check if orbits change). Each boundary's radial gate
  starts DARK (no veil — `makeDolmenGate({startLit:false})`, veil alpha via
  `uIgnite`) under a ward (`world.wards[]`: boundary, gateId, shardKey,
  criterion 'shard', dispelled). A STORMHEART SHARD floats on a rock perch
  (`hex.wardId`) two hexes from the departure islet. Stepping on it →
  `main.js handleShardClaim`: ward dispels, `world.progress.frontier`
  advances, `built.claimShard` flies the shard to the lintel, then
  `built.igniteGate` + `built.setStormFrontier` (storm eases back; the
  last ward dissolves the sheet and un-smothers the secrets' surge
  pillars), all under an ignition cutscene (`WARD_LINES[boundary]`).
  Dark gates refuse blasts with a flash message. STORM HERALDS — vast
  horned silhouettes (`makeHerald`, NOT fogged) — pace each sealed
  boundary near its gate and fade out on dispel. Criterion is pluggable:
  boss tallies later.
- **HAZARDS (Round 8, trap atlas Round 9)** — assigned in worldgen after
  the start hex, scaled by `biome.dread`, skipped on
  gate/ward/shrine/chain/lodestone/spring/platform hexes and a 4-hex cradle
  around the start. `hex.hazard = {kind, period, phase, ...}`: `snare`
  (isle glyph, one-shot — instanced mesh, `built.triggerSnare` zero-scales
  instance + its fog base), `geyser` (water, telegraphed cycle —
  `built.geyserErupting(key, t)`), `maw` (shore chomper —
  `built.mawSnapping(key, t)`). CHOMPERS COME FROM THE TRAP ATLAS
  (`TRAPS` in config.js): six archetypes (toothmaw / flytrap / clamshell /
  gearpress / bonejaw / lure) built by `makeChomper(kind).setOpen(o)`,
  mapped per biome with tints; unmapped biomes (chimewood, cinder,
  echoverge, secrets) carry none; rings 1-2 at ~30% density; Maw Shallows
  boosted. Damage applies on enter AND while standing (frame check in
  main). STORM STRIKES are runtime-only (`updateStrikes` in main): ring ≥ 2
  (or during a SURGE), random hex in the wisp's region, 0.95s crackle
  telegraph then bolt.
- **HEARTS (Round 8) + CHARM/VOUCHER (Round 9)** — `run` state in main.js:
  `maxHalves` (6 start, cap 12), `halves`, `invulnUntil` (1.15s window +
  wisp blink), `dead`, `charm` (0/1 — a ward-charm eats one hit before
  hearts do, `ui.renderCharm`), `voucher` (bounty boons owed). Any hazard
  = half a heart. `grantBoon()` = mend if hurt, else charm, else nothing
  consumed. `ui.renderHearts` draws papercraft split-heart SVGs top-left;
  damage = red `#hurtflash` + hearts shake. Zero → `die()`: announce,
  `#deathfade`, then reload with a NEW RANDOM SEED (rogue death).
  `damage()` is inert during cutscenes and blasts (landing is
  safe-by-design: ports and chain nodes are hazard-free).
- **RUN EVENTS (Round 9, all runtime-only in main.js)** — FALLING STARS
  (`updateStars`/`spawnFallingStar`): every ~2min a star streaks onto a
  discovered region, 60s crash-light; catching it = half a heart, or a
  ward-charm in rings 3+. STORM SURGES (in `updateStrikes`, `surge` state):
  while any ward stands, occasional 10s bursts of quickened strikes in the
  frontier ring where the wisp sails. MERCHANT LEVIATHAN
  (`updateMerchant` + `built.merchant.sendTo/depart`): a fourth serpent
  with a howdah roams a 470-radius circle, occasionally parks at a
  discovered region's rim water hex; stepping on its marked hex grants a
  boon. CARTOGRAPHER BOUNTIES (`newBounty`/`refreshBountyLine` + `#bounty`
  line): one landmark errand per unlocked ring (uses
  `built.landmarkSpots`); honoring banks a voucher redeemable at any
  market pedestal.
- **ASTRAL SHRINES (Round 8, chain access Round 9)** — ~10 shrines, half
  the regions per ring (rings 1-4, never asteroid/secret). Each = a
  FLOATING PLATFORM of ~9 astral hexes (`hex.astral`, pale violet) hung at
  `hex.baseY` ≈ 58-80 on free grid columns past the rim (single-layer grid:
  cells + full neighborhood must be empty; fringe growth skips baseY
  hexes). THE TELEPORT STONES ARE GONE: access is a HIDDEN ROCK-HOP CHAIN
  helixing up around the platform column (launch springboard on the rim
  below, 5 hop-rocks at a tight fixed orbit, ending on the pad), blocked +
  `hiddenChain` until the region's STARLIT LODESTONE — perched on the FAR
  rim, straight across the region (`hex.lodeChain`) — is claimed
  (`handleLodestone`: unblock, `built.claimLodestone` flight,
  `built.revealChain` staggered surfacing, cutscene w/ `LODE_LINES`). The
  altar (`shrineRole='altar'`, `makeAltar`) is SILENT for now and grants a
  heart container (+2 max halves, filled). `player._hexY`, hover marker,
  and path dots all add `baseY`; sail-follow lifts the camera target to
  the destination's baseY.
- **ROCK-HOP CHAINS (Round 9)** — `world.chains[]` (`kind`:
  'shrine'|'market'|'event'; `nodes` = [launchKey, ...hopKeys, dock/pad];
  `destKeys`, `boonKey`, `dockKey` for attachments). ~40% of non-secret,
  non-asteroid regions grow a VISIBLE attachment chain: launch springboard
  (`makeSpringboard`, `chainRole='launch'`) → 2-4 isolated hop-rocks
  bowing over the void (baseY 2.5-7) → a 5-cell orbiting islet: either the
  CURIO PEDDLER's gift market (`makeMarketStall` + `makeBoonPedestal`,
  `chainRole='boon'` — one free boon per run via `grantBoon`; bounty
  vouchers also redeem here) or a HERMIT (`makeHermit` + a drifting curio;
  `HERMITS` in config, dialogue via cutscene, gift on first visit). HOPS
  START ONLY FROM CHAIN NODES: `tryHop` in main walks `chain.nodes`
  sequentially with `player.startBlast(key, 'hop')` (short snappy arc);
  clicking any node while on a node hops rock-to-rock toward it. Hop cells
  are claimed by `claimIsolated` (cell + all 6 neighbors empty) because
  BFS is elevation-blind — adjacency would let the wisp sail aboard.
- **Heart-sprites** — runtime-only (main.js `updateHeartDrops`): up to 3
  drifting hearts over discovered non-asteroid seas, heal half on catch,
  fade after 90s.
- **Per-biome identity** (config fields → renderers): `bodyShape` →
  sculpted archetypes in `bodies.js`; `terrain.style` + `island.top2` +
  shoreline water-glow tint in the isle loop; `veil` → per-region particle
  weather; `landmark` → one named structure per non-secret region (picker
  skips hazard hexes); `decor.kinds` → bespoke sets in `decorSets.js`.
- **Water**: two instanced layers sharing instance data — near-opaque
  glassy base in each region's water color + a translucent unified
  ghost-sheet (+0.52, renderOrder 1). Two rings of unwalkable fringe hexes
  fade each region's rim (render-only; skips shrine platforms).
- **Fog of war**: every region starts unseen — instances zero-scaled via
  `instanceGroups`, objects hidden via `objectsByArea`/`regFx`.
  `built.revealArea(areaId, animated)`. Fogged port hitboxes filtered out
  of the raycast. Deliberately unfogged: leviathans, void debris/curios,
  secret pillars (storm-smothered instead), the stormfront, storm heralds.
- **Discovery cutscene** (`cutscene.js`): camera glide + click-through
  lines (`INTRO_LINES`); the same class runs the gate-ignition scene.
- **Render-order contract**: sea base 0, ghost-sheet 1, transparent
  dressings ≥ 2 (bodyGroup traverse sets 3), stormfront 5, herald eyes and
  strike/burst fx 6, labels 30.
- **Leviathans**: two serpents loop the void between orbits; a third
  wheels around the Unlit Star's hidden crossing.
- **UI**: floating runic text; Twin-Tongue deciphering; hearts row;
  hurt-flash + death-fade overlays; movement grid in UI (hover hex outline
  + dotted route).

## Code map (src/)

| File | Role |
| --- | --- |
| `config.js` | HEX size, RINGS radii, STORM + STORM_BOUNDARIES + WARD_LINES, TRAPS atlas, HERMITS, LODE_LINES, biome tables, ASTEROID_BIOMES, runes |
| `worldgen.js` | Seeded gen: layout → regions → gates → storm wards → shrines (baseY platform + hidden helix chain + lodestone) → attachment chains (markets/hermits) → springs → start hex → hazards (trap atlas) |
| `buildWorld.js` | All meshes/décor/animators + runtime API (igniteGate, claimShard, setStormFrontier, triggerSnare, geyserErupting, mawSnapping, claimAltar, revealChain, claimLodestone, claimBoon, merchant, burstAt, landmarkSpots, bounceIsle, boingGate, wobbleBody, revealArea) |
| `bodies.js` | sculptBody: bespoke per-body geometry archetypes |
| `structures.js` | makeDolmenGate (startLit/ignite), makeChomper (6 trap archetypes, setOpen), makeSpringboard, makeMarketStall, makeBoonPedestal, makeHermit, makeAltar, makeHerald, makeLandmark, makeShrineStone (retired, unused) |
| `cutscene.js` | Camera glide + click-through dialogue (discovery + gate ignition) |
| `decorSets.js` | buildDecorLibrary: ~40 merged decor geometries |
| `materials.js` | Water shader, energy veil (uIgnite), storm sheet shader, canvas textures |
| `player.js` | Click-to-sail BFS stepping, `startBlast(destKey, 'arc'\|'line'\|'hop')`, baseY-aware heights |
| `controls.js` | LMB-drag glide, RMB-drag rotate, wheel zoom (max 3600) |
| `main.js` | Wiring: run state (hearts/charm/voucher/death), hop logic (tryHop/pendingHops), hazard checks, storm strikes + surges, heart-sprites, falling stars, merchant visits, bounties, shard/lodestone/altar/boon/hermit/spring handlers, hover+path UI, `window.__astral` |
| `pathfind.js`, `hexmath.js`, `rng.js`, `labels.js`, `ui.js` | Support (ui: renderHearts/renderCharm/setBounty/hurt/deathFade) |

## Dev workflow

- `npm run dev` / `npm run build` (Vite, relative base for Pages).
- Headless smoke tests: `npm i --no-save playwright-core`, launch the
  system chromium headless shell (under `/opt/pw-browsers/`) with
  `--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader`,
  serve `dist/` via `npx vite preview`, and drive the app through
  `window.__astral` (`{ world, player, controls, built, cutscene, run,
  damage, heal }`):
  - teleport: `player.hexKey = key; player._syncToHex()`; walk:
    `player.requestMove(key)`; inspect `world.gates/wards/shrines/areas`.
  - claim a ward: teleport onto `world.wards[i].shardKey` and call
    `player.onEnterHex(world.hexes.get(key))` — the ignition cutscene takes
    the camera; `page.mouse.click(...)` advances it.
  - IMPORTANT for tests: reveal/discover a region (`built.revealArea(id,
    false); world.areas[id].discovered = true`) BEFORE teleporting onto its
    hazards — an undiscovered landfall starts a discovery cutscene, and
    `damage()` is inert during cutscenes.
  - lift fog directly for visual checks: `built.revealArea(areaId, false)`.
- NOTE: headless SwiftShader runs a few fps and `dt` clamps at 0.05s, so
  sim time crawls (~0.2-0.4 s/s): blasts, storm retreats, and camera glides
  take many real seconds — poll with `waitForFunction`, not fixed waits.
- Expected console noise headless: the Google Fonts fetch fails (no
  network), surfacing as font errors / `ERR_CONNECTION_RESET`.

## Gotchas

- Worldgen/build rng call ORDER is the seed contract — reordering rng
  calls reshuffles every world. (Round 8 re-ordered it: old seeds now
  produce different worlds than in Round 7 builds. That's expected.)
- Region `maxDist` cap (clear+9..15) is the geometric guarantee that two
  facing gate islets never merge. `STORM_BOUNDARIES` (145/400/668/938)
  additionally assume region extent + islets + shard perch stay inside
  each boundary — re-check BOTH if orbits or region sizes change.
- Custom instanced attributes live on the GEOMETRY; `instanceMatrix` on
  each MESH. The fringe mesh clones the geometry for its own attributes.
- `hex.elev` is mutated at build time — build runs before Player exists;
  decor, gates, shards, shrine structures read it after the isle loop.
- `hex.baseY` (shrine platforms) is the ONLY vertical offset: worldgen
  sets it, and player/_hexY, buildWorld isle placement, hover marker,
  path dots, and the camera-follow all add it. New per-hex visuals must
  do the same or they'll render at sea level under the platform.
- Shrine platform cells occupy free grid columns just OUTSIDE the region
  rim with an empty 1-cell margin (checked at placement) — pathfinding
  cannot reach them except along the hop chain; keep that margin or BFS
  will walk into the sky. Hop-rocks enforce the same via `claimIsolated`
  (cell + all six neighbors empty): BFS is elevation-blind, so ANY
  adjacency to walkable cells is a bridge.
- `pickRim` MUST skip `baseY` cells — freshly committed platforms/islets
  live in `area.hexKeys` and out-score every true rim hex on
  alignment+distance, which silently detaches launches from the region
  (this was a real Round 9 bug; the smoke test now asserts launch
  attachment).
- Hidden shrine chains are pulled OUT of the isle fog byArea groups
  (`chainHiddenIdx`) and zero-scaled at build; `revealChain` restores
  them. They are also `blocked` in the hex map until the lodestone claim
  clears it — both halves matter (visibility and pathability).
- FOG REGISTRATION IS MANDATORY: any new per-region visual must join
  `instanceGroups` (mesh + base matrices + byArea) or `regFx(areaId, obj)`.
  Deliberately unregistered: leviathans, void debris/curios, secret
  pillars, stormfront, heralds.
- `triggerSnare` zero-scales the instance in BOTH the live matrix array
  and the fog `base` array — otherwise a later `setAreaScale` resurrects
  the burnt-out glyph.
- `damage()` is inert during `cutscene.active` and `player.blast`. Real
  play never lands the wisp on a hazard from a blast (ports are bare
  rock), but tests teleporting into undiscovered regions will silently
  take no damage (see dev workflow note).
- `suppressGateKey` guards BOTH gate blasts and shrine teleports against
  instant bounce-back — set it to the destination key before any
  `startBlast` from a trigger hex.
- Labels must keep `depthTest: false` + renderOrder, or they vanish.
- Per-region reveal state lives only in `area.discovered` + renderer
  `revealedAreas`; ward/shrine/heart state lives in `world.wards`,
  `world.shrines`, `world.progress`, and main's `run` — none persisted; a
  reload is a fresh run (by design: death reloads with a new seed).
- `INTRO_LINES` keyed by `biome.key`; `WARD_LINES` indexed by boundary.
- The cutscene owns the camera by nulling `controls._focusTo` every
  frame; anything else wanting camera control must check `cutscene.active`
  (sail-follow and storm strikes in main do).

## Roadmap (undone, in rough priority)

1. Combat: warden fights at gates (hook: `handleGate`), boss-tally ward
   criteria (`ward.criterion`), shrine trials (hazard gauntlet first) in
   front of the heart containers. Design as a full roguelike system —
   deferred deliberately to be written as one piece.
2. Run structure beyond death: run summary, meta unlocks, optional
   same-seed practice mode; persist discovery/ward state within a run so
   a reload doesn't wipe it.
3. New discovery mechanic for the Hollow Moon (rumor obelisks retired).
4. Tide-gated hexes; flavor-specific water rules.
5. Full planetary revolution (rigid region groups; gates re-anchor).
6. Sound: chimes for discovery, storm rumble, shard crack, blast whoosh,
   heart tear.

## History

Built across sessions via design polls (all recorded in DESIGN.md): Ink &
Starlight v1 with walkable rivers → Orb-Weaver's web + riverflight →
papercraft turn → dark aetherial depth pass → isolated island regions with
blast gates → vast seas → one-gate-per-ring + orbit blasts + layered
living water + soft rims → Round 6 visual-identity pass (dolmen waygates,
sculpted bodies, per-biome terrain/decor/veils/landmarks, asteroid
waystations; PR #2) → Round 7 (fog of war, discovery cutscenes, render-order
fix; PR #3) → Round 8 (Polls 17-24: stormfront progression replacing rune
pedestals — maelstrom sheet, dark gates ignited by stormheart shards,
ignition cutscenes, storm heralds; ring-scaled hazards — snares, geysers,
maws, storm strikes; papercraft hearts with rogue death on a new seed;
astral shrine platforms + teleport stones + heart-container altars;
waystation springs; wandering heart-sprites).

→ Round 9 (Polls 25-32: the trap atlas — six personalised chomper
archetypes, rings 1-2 thinned; rock-hop chains — launch springboards,
isolated hop-rocks, Curio Peddler gift markets and void hermits on
orbiting islets; shrine teleport stones replaced by lodestone-revealed
helix chains; ward-charms + bounty vouchers; falling stars, storm surges,
the merchant leviathan, cartographer bounties).

Dev branch convention: work happens on a `claude/...` branch, PR'd to
`main` and merged; this round's branch is
`claude/roguelike-progression-world-bvsh25`. NOTE: GitHub Pages deploys
from `main` only — dev branches must NOT be added to the deploy workflow
triggers (the `github-pages` environment rejects them, and via the shared
concurrency group a failing dev run can cancel the real deploy).
