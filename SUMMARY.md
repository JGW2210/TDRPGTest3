# Astral Reaches — Session Handoff Summary

Context for picking up work on this repo. Read this first, then `DESIGN.md`
(decision history) and `README.md` (player-facing feature list).

## What this is

A procedural roguelike (Binding of Isaac-inspired), built with three.js +
Vite. A paper-cutout HOODED MAGICIAN (Round 11 — formerly a wisp) navigates
hex archipelagos orbiting a paper sun in a dark aetherial papercraft
cosmos, duels paper beasts in zoomed combat dioramas, and collects from a
512-piece item pool gated by persistent meta progression. Everything
world-shaped is seeded (`?seed=`, default `AETHERION`). Live at
`https://jgw2210.github.io/TDRPGTest3/` — auto-deployed by
`.github/workflows/deploy.yml` on pushes to `main` (and the dev branch).

## Current world anatomy (the important state)

- **24 areas**: sun + 4 orbital rings (3/4/5/5 regions at radii
  350/700/1050/1400 — WIDENED in Round 11 to fit the warden causeways) + 3
  bare-rock ASTEROID WAYSTATIONS threaded between ring-4 neighbors + 3
  secret bodies past 1700. Layout on 8 staggered spoke angles. Each region
  is an ISOLATED archipelago — no walkable connection between regions, only
  void.
- **Region generation** (`worldgen.js generateRegion`): a connected water
  blob grows from a ring nestling the astral body; 3-5 islands of 10-30
  hexes grow inside it (a hex apart, island-level base heights, lower
  shorelines); waters ≈ 80-90% of walkable tiles; region radius sized to
  its sea, hard-capped so facing gate islets can never bridge the void.
  Asteroid areas (`generateAsteroidRegion`, `area.asteroid`) are one
  connected knot of ~10-18 rock hexes; each spring waystation annexes a
  7-hex FOUNTAIN COURT (Round 12, `placeCourt` — heart + six petals off
  the rim, stone-paved to the knot) whose heart hex carries `hex.spring`:
  a tiered guardian fountain (`makeFountain`), one heart once per visit.
  Drinking EXHAUSTS it visually (water drains dark, jets die, the statue
  bows — `built.exhaustSpring`); heal AND look re-arm on area re-entry.
- **WARDEN CAUSEWAYS (Round 11)** — each ring boundary's ascension gate no
  longer perches 2-4 hexes off the rim: `worldgen placeBossNode` reaches a
  ~20-tile causeway straight out toward the next ring (spine via `Hx.line`,
  1-2 flank cells per row, a 3-wide ARENA flat at rows 8-13, the dolmen's
  7-hex islet + stormheart perch at the far end). A fortified THRESHOLD
  boss-gate (`makeThresholdGate`, ward-lattice barred) stands at row 2;
  every cell beyond it starts `blocked`. Cells carry `hex.causeway` (set at
  claim), `hex.causewayGate`/`hex.thresholdGate` (gate id), `hex.bossArena`.
  `world.wardens[]` = {id, boundary, gateId, areaId, arenaKey,
  thresholdKeys, blockedKeys, defeated}. Stepping on a threshold cell
  (`handleThreshold` in main) pans the camera to the arena, bursts light,
  reveals the warden's paper figure + name splash + intro lines
  (`WARDENS[boundary]` in config), then starts boss combat. Victory
  (`wardenFalls`) unblocks the causeway, drops the lattice
  (`built.openThreshold`), bumps meta, and plays the defeat cutscene. THE
  SHARD/ASCENSION FLOW IS UNCHANGED beyond that — the warden merely stands
  between the region and the shard perch.
- **Gates** = pairs of 7-hex bare-rock node islets on facing rims bearing
  DOLMEN WAYGATES (`structures.js`). Entering (or clicking — invisible
  hitboxes) one fires a BEAM OF LIGHT along the flight path with an ORB
  (the wisp, unmade for the crossing) riding it — `main.js`
  `startFlightBeam` builds a tube along `player.blastPointAt` samples, the
  wisp mesh hides while `flight.active && player.blast`, and the camera
  pulls back to FRAME THE BEAM END TO END (bounding-sphere framing:
  `flight.frameCenter`/`frameDist`), returning to the locked wisp view
  once the orb lands. Same-ring gates chain neighbors around each ring
  (through the waystations AND teleport concourses on rings 2-4), fly
  ALONG THE ORBIT (arc beam), doorways facing the orbit's tangent;
  radial/secret gates fire a straight beam. Each ring boundary has exactly
  ONE radial gate (`gate.boundary` = 0..3); 3 secret gates
  (`gate.secretGate`, still two-way). First use announces the Warden
  (boss hook lives in `main.js handleGate`).
- **STORM + ONE-WAY ASCENSION (Round 8, reshaped Round 10)** — A vast
  MAELSTROM SHEET (`makeStormMaterial`, ring mesh at renderOrder 5) seals
  everything beyond the frontier ring; inner calm radii per frontier live
  in `STORM_BOUNDARIES` (222/572/922/1272 since Round 11 — chosen to clear
  region rims + WARDEN CAUSEWAYS; re-check if orbits change). Boundary radial gates are GRAND
  ASCENSION GATES (`makeDolmenGate({grand:true})` — 1.6× scale, violet
  stone, a crowned CRYSTAL SOCKET, `setCrystal('empty'|'filled'|'spent')`).
  They start DARK under a ward (`world.wards[]`). Claiming the STORMHEART
  SHARD (`hex.wardId`, perch 2 hexes from the departure islet) now only
  ARMS the gate: `handleShardClaim` dispels the ward, flies the shard into
  the crown (`built.claimShard` → `setGateCrystal('filled')`), ignites the
  veil, and plays the arming cutscene (`SHARD_LINES[boundary]`) — THE
  STORM HOLDS. Using the armed gate (`startAscension` in main) is the
  point of no return: crystal → 'spent', `world.progress.frontier`
  advances, `run.ringReached` rises, the next bounty posts, a grand launch
  beam fires (`durMul 1.7`, `WARD_LINES` spoken mid-flight, camera pulls
  wide) and `built.setStormFrontier` rolls the storm back WHILE the orb
  flies. The outer port refuses inward travel forever ("the way back is
  sealed"); timed events (stars/hearts/merchant) only spawn in regions
  with `ring >= run.ringReached`. The last launch dissolves the sheet and
  un-smothers the secrets' surge pillars. (The storm heralds are RETIRED —
  `makeHerald` sits unused beside `makeShrineStone`.) Criterion is
  pluggable: boss tallies later.
- **STILLMOONS (Round 10, tuned 10.1)** — ~30% of the RING regions (never
  the sun, secrets, waystations or concourses) grow a 25-30 hex bare-rock
  SATELLITE PLATFORM attached to their sea rim (`worldgen placeStillmoon`,
  `hex.stillmoon`, `area.stillmoon = {centerKey, keys, color}`). Moons are
  placed AFTER gates + wards and reject any cell inside the `gateZone`
  (≤3 hexes from a doorway or shard perch); bearings are free except ring
  1 may not face sunward (would poke into the innermost calm circle), and
  `pickRim` skips stillmoon cells so later launches/lodestones anchor on
  the true rim. Each moon carries instanced crystals in ONE colour
  (`STILLMOON_CRYSTALS`, shuffled, cycled) and a small polygonal rock body
  (`makeStillmoonBody`) afloat over its `moonCore` hex. Fog-registered.
- **TELEPORT CONCOURSES + SPRING STONES (Round 10, courts Round 12)** —
  rings 2-4 each thread ONE marble waystation (`TELEPORT_BIOMES`,
  `area.teleport`, biome-flagged `asteroid` so all waystation exclusions
  apply; no spring) into a free gap of the ring's gate chain. Round 12:
  the temple no longer sits in the knot — a 7-hex ANNEX COURT
  (`placeCourt`, `area.court`, `hex.court`) is stamped off the rim at the
  bearing BISECTING the two gate islets and paved to the island; the
  teleporter hex (`hex.teleporter`, `area.teleportStoneKey`) is the
  court's heart, and `makeTemple` is now a full-size Parthenon (~2.2×,
  forecourt steps facing the island). Stepping on (or
  clicking under) the stone opens the STAR CHART in TELEPORT-SELECT mode
  (`tpSelect`): the current orbit burns violet (ring band + halos behind
  each choice), the DISCOVERED true regions' bodies are the picker —
  hover swells them, click crosses — and `#tpanel` is just a prompt +
  cancel (no list). Every ring 2-4 region keeps
  an isolated SPRING STONE (`hex.springStone`, `area.springStoneKey`) — a
  lone rock in the empty nestling gap under the astral body, reachable
  only by hop (`trySpringHop`: ≤6 hexes on/off the stone). The crossing
  (`beginTeleportTo`/`updateTeleport`): upward beam takes the wisp →
  camera pans the orbit → downward beam sets it on the spring stone.
  `damage()` is inert while `teleport.active`.
- **CAMERA (Round 10, chart reworked 10.1)** — `controls.mode`: 'locked'
  (default) pins the target to the wisp, either drag ROTATES, zoom capped
  at `zoomCapFor` (region extent × 2.6 + 70; smooth reel-in when the cap
  shrinks); during a gate beam the camera frames the beam end to end,
  then reels back in. 'free' = the STAR CHART (`#chartbtn` / M key,
  `enterChart`/`exitChart` in main): AUTO-GLIDES out to the full orrery
  (target sun, dist 2800, top-down pitch — until the user pans), clicks
  never move the wisp, labels are SCREEN-SPACE (`makeLabel({screenSpace})`
  — constant on-screen size, readable fully zoomed out; name + orbit +
  body, runic where undiscovered) plus a "your wisp" marker. DISCOVERED
  bodies swell ×2.5-6 (`chartFx`, invisible sphere hitboxes) and enlarge
  further on hover. All rebuilt fresh each open. Ophthal's eye TRACKS the
  wisp (`built.setTrackTarget`; the 'eye' body slerps toward it instead
  of spinning). The cursor hover label follows via `ui.moveHover` on
  every pointermove (transform-only write); only the raycast is
  throttled.
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
- **HEARTS (Round 8) + CHARM/VOUCHER (Round 9) + STARDUST (Round 12)** —
  `run` state in main.js: `maxHalves` (6 start, cap 12), `halves`,
  `invulnUntil` (1.15s window + wisp blink), `dead`, `charm` (0/1 — a
  ward-charm eats one hit before hearts do, `ui.renderCharm`), `voucher`
  (bounty vouchers, redeemed at bazaar pedestals), `stardust`. Any hazard
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
- **ROCK-HOP CHAINS (Round 9; bazaars Round 12)** — `world.chains[]`
  (`kind`: 'shrine'|'market'|'event'; `nodes` = [launchKey, ...hopKeys,
  dock/pad]; `destKeys`, `dockKey`; markets add `pedestalKeys`,
  `traderKey`, `stock`; hermits keep `boonKey`). ~40% of non-secret,
  non-asteroid regions grow a VISIBLE attachment chain: launch springboard
  (`makeSpringboard`, `chainRole='launch'`) → 2-4 isolated hop-rocks
  bowing over the void (baseY 2.5-7) → the destination islet. MARKETS
  (Round 12) are a hand-authored 12-cell BAZAAR STAMP: dock stone facing
  home → 3-wide aisle → 5-wide pedestal row (three SALE PEDESTALS one
  walkable gap apart, `chainRole='pedestal'` + `hex.pedestal` idx,
  BLOCKED — never stood on, clicked from an adjacent tile) → 3-wide tent
  row (heart = the 2D paper trader, `chainRole='trader'`, also blocked)
  under a broad pavilion (`makeMarketStall` + `makeSalePedestal`;
  `drawTrader` in sprites). HERMIT chains keep the organic 5-cell islet
  (`makeHermit` + a drifting curio; `HERMITS` in config, dialogue via
  cutscene, gift on first visit). HOPS START ONLY FROM CHAIN NODES:
  `tryHop` in main walks `chain.nodes` sequentially with
  `player.startBlast(key, 'hop')` (short snappy arc); clicking any node
  while on a node hops rock-to-rock toward it. Hop cells are claimed by
  `claimIsolated` (cell + all 6 neighbors empty) because BFS is
  elevation-blind — adjacency would let the wisp sail aboard.
- **STARDUST + BAZAAR SALES (Round 12, main.js)** — the run's first
  currency: every combat victory pays `2 + ring (+2 elite, +8 warden)`
  stardust (`run.stardust`, `ui.renderStardust` beside the hearts). At
  world-wake `rollMarketStock` stocks each bazaar's three pedestals from
  the run's pool (no cross-market duplicates; tints the wares by tier via
  `built.stockPedestal`), priced by `STARDUST_PRICES` (8/14/22/30).
  Clicking a stocked pedestal from an ADJACENT tile (`tryPedestal`) opens
  the item card with a trader-patter + price `#item-note` row; buying
  deducts (or consumes a bounty voucher — free), `built.claimPedestal`
  bursts the ware, and the item applies like any drop. `grantBoon` now
  serves only hermits, the merchant leviathan, and stars.
- **THE GRIMOIRE (Round 13, config + main + combat + ui)** — spell words
  belong to the player. `GRIMOIRE_WORDS` (config.js): 28 words in five
  tiers where LENGTH IS STRENGTH — 5-letter starters ×1.00 → 9-letter
  sovereigns ×2.30 (AETHERION ×2.50); tier 1+ words carry a
  burn/freeze/slow chance rolled on a landed strike. `run.grimoire =
  { owned, active }` starts with the five starters; RUNE STONES teach
  more (`learnWord(ring)` — tier-weighted around the ring, auto-joins
  the hand while under 8): a quarter of felled foes drop one (elders/
  wardens always), up to two drift over discovered regions
  (`updateRuneDrops`), and ~a third of bazaars stock one on a pedestal
  (12 ✦; `entry.runestone`). The PANEL (`G` / the ᚱ button,
  `ui.showGrimoire`, `#grimoire` + `.wchip`) toggles the ACTIVE HAND of
  1-8 words; combat draws uniformly from the hand at target commit —
  long-word hands are high-risk/high-power loadouts. All-words-known
  stones crumble into +10 stardust.
- **Heart-sprites** — runtime-only (main.js `updateHeartDrops`): up to 3
  drifting hearts over discovered non-asteroid seas, heal half on catch,
  fade after 90s.
- **COMBAT (Round 11, `combat.js`; reworked Round 12)** — a papercraft
  DIORAMA floats over the encounter hex (torn disc + cut peaks in the
  biome's colors, camera drops to over-the-shoulder; the combat OWNS the
  camera + keyboard + clicks). Two 3x3 boards: on the player board row 0
  faces the foe, row 2 the camera; on the enemy board row 0 is the back
  rank. Turns fill initiative meters at each side's SPEED. Player attack:
  'target' (WASD cursor, `PATTERNS[run.stats.pattern]` footprint preview,
  foresight ghosts) → 'spell' (type a `SPELL_WORDS` tier word against a
  per-ring clock; typos cost 0.18s; timeout fizzles to 0.45x) → 'bar'
  (Undertale sweep; perfect 1.6x + shatters lane-hexes) → resolve. Round
  13: the target phase runs on an AIM CLOCK — `max(0.5, 1.5 − 0.2·ring)`
  seconds (+0.5 clarity), fuse bar shown, auto-committing the hovered
  square at zero — and the spell word is DRAWN FROM THE GRIMOIRE HAND
  (see below), its power multiplying atk and its status effect rolling on
  a landed strike. Round 12: EVERY foe steps its patrol ONE step at
  TARGET COMMIT (frozen foes hold still; the end-of-turn shuffle and the
  dodger special-case are gone) — aiming is a prediction, and the strike
  flies as a staff-bolt FX that lands ~0.22s later (`_landStrike` applies
  damage on arrival). Round 13 pace: meters fill at 12.5x (was 9x),
  resolve pause 0.6s, enemy turn lead 0.7s/tail 0.45s, strike interval
  0.75-1.2s.
  Enemy turn: a strike timeline — danger squares TRACK the player in
  amber (reveal lead grows with sight), LOCK red, bite after a ~0.5s
  react window (`max(0.42, 0.55 − 0.03·ring)` + dodge stat). Melee = 1
  square, ranged = 2 squares rolling toward the camera, wardens add
  sweep/cross. ATTACK FX KIT (Round 12, stage-local, torn down with the
  diorama): spikes snap out of struck tiles, shots arc caster→square
  (ranged bolts visible for the whole react window), swings slash melee
  bites, stone bolts fall on cross patterns; overlays stay as underlay.
  Control-hex debuffs: reverse, scramble (reshuffles every 1.5s),
  lanelock (perfect strike clears). RELIC on Q (12 relics, kill-charged).
  `combat.debugWin()` + `combat.debugState()` for tests.
- **ROAMERS (Round 11; hunters Round 12; DENSE Round 13, runtime-only in
  main)** — up to 60 paper beasts drift through discovered regions
  (**5 + ring per region** — 5 at the sun, 9 in the deep; ring ≥
  ringReached, spawn cadence ~2.2-4.2s; never on special/trigger/court
  hexes — `roamerHexOk`). Round 12 they HUNT: within a 6-hex sight radius
  (`CHASE_RADIUS`) a beast steps toward the pilgrim (`chaseStep`: BFS
  next-hop over cells it may walk; no road → the legal step that closes
  the gap, so water-bound beasts pace the shoreline) at a ring-scaled
  cadence far below sail speed early (`stepEvery` 1.6s ring 0 → 0.55s
  floor). RINGS 0-1 BEASTS ARE WATER-BOUND (`roamer.waterOnly` — spawn on
  and move across water only; isles are safe ground early); ring 2+ cross
  land. Sharing a tile starts combat — that is the ONLY trigger; an ELDER
  (16%, ring ≥ 1) sits still and challenges by dialogue choice
  (`ui.choice`) when adjacent. The BESTIARY (enemies.js) keys one
  archetype per biome: painter silhouette + patrol (`PATROLS`) + dodge
  temperament + ranged weight + debuff kit (ring ≥ 3, or elite ring ≥ 2).
  `makeEnemy` seasons hp/spd by ring + dread.
- **ITEMS + META (Round 11)** — `items.js`: 512-piece pool (200 common /
  150 rare, last 3 per line "cracked" with trade-offs / 100 super-rare
  playstyle benders incl. patterns + imbues + overworld movement / 50
  hand-cut legendaries with flags / 12 relics). `run.mods` accumulates
  effects; `computeStats(run)` derives `run.stats` (atk, spd, sight,
  foresight, spellTime, barWidth, dodge, crit, luck, stepSpeed →
  `player.speedMul`, hopRange → spring hops, hazardGuard, imbues, thorns,
  shield, lifesteal, relicRate, pattern, flags). Drops (`rollDrop`) are
  ALWAYS OPTIONAL (ui.itemCard take/leave; gambler flag rerolls one
  refusal); luck tilts tiers, `tierBoost` floors them (wardens 2, elders 1,
  transmute +1); taken ids leave the run's pool. `meta.js` persists in
  localStorage (THE ONLY SURVIVOR OF DEATH): kills, wardens, bestRing,
  itemsTaken, perfectBars, swiftCasts + achievements; super-rares unlock at
  15 kills or warden 1, legendaries at warden 1 or 40 kills, weird pieces
  behind `item.unlock = 'ach:*'`. Wardens offer a RELIC before their item
  (starts charged; voltsparks refill; `run.relic = {def, charge}`).
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
| `config.js` | HEX size, RINGS radii, STORM + STORM_BOUNDARIES, SHARD_LINES (arming) + WARD_LINES (launch), WARDENS (Round 11: names/tints/intro+defeat lines), GRIMOIRE_WORDS + WORD_TIERS (Round 13 — SPELL_WORDS retired), TRAPS atlas, HERMITS, LODE_LINES, biome tables, ASTEROID_BIOMES, TELEPORT_BIOMES, STILLMOON_CRYSTALS, runes |
| `worldgen.js` | Seeded gen: layout (+ teleport concourses in ring gaps) → regions → gates (boundary gates via `placeBossNode` warden causeways) → storm wards → temple courts (`placeCourt` 7-hex annex pads, teleporter at the heart) → stillmoons → shrines (baseY platform + hidden helix chain + lodestone) → attachment chains (12-cell bazaar stamps / hermit islets) → spring courts (7-hex fountain pads) → spring stones → start hex → hazards (trap atlas; skips `hex.court`) |
| `buildWorld.js` | All meshes/décor/animators + runtime API (igniteGate, claimShard, setStormFrontier, setGateCrystal, setTrackTarget, triggerSnare, geyserErupting, mawSnapping, claimAltar, revealChain, claimLodestone, stockPedestal, claimPedestal, exhaustSpring, merchant, burstAt, landmarkSpots, bounceIsle, boingGate, wobbleBody, revealArea, openThreshold) |
| `bodies.js` | sculptBody: bespoke per-body geometry archetypes |
| `structures.js` | makeDolmenGate (startLit/ignite; grand + setCrystal for ascension gates), makeThresholdGate (Round 11 boss-gate + ward-lattice, open()), makeTemple (Round 12: full Parthenon spanning its court, forecourt steps front), makeFountain (Round 12: tiered fountain + guardian statue, setExhausted), makeStillmoonBody, makeChomper (6 trap archetypes, setOpen), makeSpringboard, makeMarketStall (Round 12: broad pavilion + 2D trader), makeSalePedestal (setTint/claim), makeHermit, makeAltar, makeLandmark, makeHerald + makeShrineStone + makeBoonPedestal (all retired, unused) |
| `sprites.js` | Round 11 paper-cutout atelier: drawMagician, drawTrader (Round 12 — the Curio Peddler cutout), ~18 creature silhouette painters, drawWarden (4 regalia), item card sprites (tier frame + glyph + tint), `makePaperFigure` billboard helper, canvas caches |
| `combat.js` | The combat engine: diorama stage, speed meters, target→spell→bar attack (foes step patrol on target commit — Round 12), ~0.5s ring-nudged react windows, the attack FX kit (spikes/shots/swings/falls), telegraphed strike timelines, control-hex debuffs, statuses, relics, PATTERNS |
| `enemies.js` | BESTIARY (per-biome archetypes + PATROLS), makeEnemy (ring/dread seasoning, elites), makeWardenEnemy |
| `items.js` | The 512-piece pool (generated tables + 50 hand-cut legendaries + 12 relics), computeStats/applyItem, rollDrop/rollRelic with unlock gating |
| `meta.js` | localStorage meta: counters + ~15 achievements, onAward hook |
| `cutscene.js` | Camera glide + click-through dialogue (discovery + gate arming + warden defeat) |
| `decorSets.js` | buildDecorLibrary: ~40 merged decor geometries |
| `materials.js` | Water shader, energy veil (uIgnite), storm sheet shader, canvas textures |
| `player.js` | The paper magician (makePaperFigure billboard + warm light; the old torus halo is GONE — Round 12), click-to-sail BFS stepping, `speedMul` (stepSpeed items), `startBlast(destKey, 'arc'\|'line'\|'hop', {durMul})`, `blastPointAt(t)` path sampler, baseY-aware heights |
| `controls.js` | mode 'locked' (either-drag rotate, capped zoom, no pan) \| 'free' (LMB glide), RMB rotate, wheel zoom (max 4400), smooth cap reel-in |
| `main.js` | Wiring: run state (hearts/charm/voucher/stardust/death/ringReached + mods/stats/items/relic/kills), combat triggers + rewards (onCombatVictory/offerItem/offerRelic + stardust pay), roamer hunter AI (chaseStep, water-bound rings 0-1), bazaar stock + sales (rollMarketStock/tryPedestal), warden thresholds (bossFx intro), beam flights + ascension launches, star chart + map labels, teleport sequence, hop logic, hazard checks (hazardGuard/stormSoul), storm strikes + surges, heart-sprites, falling stars, merchant visits, bounties, shard/lodestone/altar/hermit/spring/teleporter handlers, hover+path UI, `window.__astral` |
| `pathfind.js`, `hexmath.js`, `rng.js`, `labels.js`, `ui.js` | Support (ui adds the Round 11 combat surface: combatShow/Banner/Hint, foePanel/foeHp, spellShow/Progress, barShow/Cursor/Result, debuffs, itemCard — Round 12: + `note` row for sale patter/price, renderStardust — Round 13: showGrimoire/hideGrimoire/setGrimoireCount, aimShow/aimTick/aimHide — relicSlot, bossIntro, choice, statsLine) |

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
  - combat (Round 11): start a fight directly —
    `const e = __astral.debug.makeEnemy(area, {}); __astral.combat.start({
    enemy: e, worldPos: {x,y,z}, biome: area.biome, boss: false })`; wait
    for `combat.phase === 'target'`, press Space, read
    `combat.spell.word`, type it via `page.keyboard`, Space on the bar;
    `combat.debugWin()` forces victory (reward flow may complete
    SYNCHRONOUSLY when no item drops — wait on `phase === 'reward' ||
    !combat.active`). Boss path: teleport onto `world.wardens[0]
    .thresholdKeys[0]` + `player.onEnterHex(...)` → bossFx intro (~5 sim s)
    → boss combat. Item cards: click `#item-take` / `#item-leave`. Meta is
    localStorage — a fresh browser context starts clean.
- NOTE: headless SwiftShader runs a few fps and `dt` clamps at 0.05s, so
  sim time crawls (~0.2-0.4 s/s): blasts, storm retreats, and camera glides
  take many real seconds — poll with `waitForFunction`, not fixed waits.
- Expected console noise headless: the Google Fonts fetch fails (no
  network), surfacing as font errors / `ERR_CONNECTION_RESET`.

## Gotchas

- Worldgen/build rng call ORDER is the seed contract — reordering rng
  calls reshuffles every world. (Rounds 8, 11 and 12 all re-ordered it:
  old seeds now produce different worlds. That's expected.)
- ANNEX COURTS (`placeCourt`) commit AFTER gates/wards (temples need the
  two gate bearings to bisect) and reject any cell whose neighbor belongs
  to ANOTHER area — BFS is elevation-blind, a touching pad is a bridge.
  Court cells carry `hex.court`; hazards skip them, `roamerHexOk` and the
  falling-star picker exclude them. `placeCourt` also bumps
  `area.hexRadius` so the locked camera's zoom cap covers the pad.
- BAZAAR pedestal + trader hexes are `blocked` — pathfinding never enters
  them, and `startCombatWith` can never fire there (roamers skip all chain
  cells anyway). The pedestal INTERACTION is click-driven in
  `controls.onClick` (BEFORE the requestMove fallback): `tryPedestal`
  demands the player stand within hex-dist 1 and not be moving. Sale
  stock lives on `chain.stock[i] = { item, price, sold }` — rolled once
  per run by `rollMarketStock` at world-wake (call it before offering
  anything; it also tints the wares).
- The player's strike now lands ~0.22s AFTER the bar locks (`_fxShot` →
  `_landStrike` applies damage on arrival). Tests watching `enemy.hp`
  after a bar lock must poll; `combat.debugWin()` is still instant. The
  FX arrival can END the combat synchronously — `_fxUpdate` bails if
  `!this.active` after any `onArrive`.
- BILLBOARD CLEARANCE: the paper cutouts are depth-tested billboards, so
  scenery must never share their depth. The diorama's backdrop arc stands
  at radius 14.6 on a 17.3 disc precisely so the nearest cone surface
  stays ~2.5 units behind the back rank (z ≈ -9.4) — shrink either and
  figures will slice into the peaks again. `makePaperFigure` additionally
  biases its sprites toward the camera (`polygonOffset -4/-24`) so decor
  or terrain that merely GRAZES a cutout's plane can't shave it; genuine
  occlusion (a whole island in front) still wins.
- ORBIT GEOMETRY IS ONE COUPLED CONTRACT (Round 11): `RINGS`
  (350/700/1050/1400), `STORM_BOUNDARIES` (222/572/922/1272), and the ~20
  tile warden causeways were derived together. Worst case per boundary r:
  region rim ≈ 99u + causeway ≈ 114u past it must stay INSIDE boundary r
  (margin ~9u), while the NEXT ring's inward gate islet (ring radius −
  ~125u) must stay OUTSIDE it. Region `maxDist` cap (clear+9..15) is still
  the rim guarantee. Touch ANY of ring radii / causeway length /
  `STORM_BOUNDARIES` / region sizes → re-derive all of them (see
  scratchpad-style math in DESIGN.md Round 11). Belts, leviathan orbits and
  the merchant circle now derive from RINGS midpoints.
- `pickRim` MUST skip `hex.causeway` (as well as `baseY`/`stillmoon`) — a
  20-row causeway out-scores every true rim cell for aligned bearings and
  would silently detach stillmoons/launches/lodestones onto it. The
  stillmoon `gateZone` keep-out also includes every causeway cell.
- Causeway cells beyond the threshold row are `blocked` until
  `wardenFalls` clears `warden.blockedKeys` — BOTH pathability and the
  boss trigger rely on that (the player can only ever reach rows ≤ 2
  before the fight).
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
- `INTRO_LINES` keyed by `biome.key`; `SHARD_LINES` (arming cutscene) and
  `WARD_LINES` (launch dialogue) indexed by boundary.
- STILLMOON GEOMETRY CONTRACT: moons grow ≤4 hexes from an anchor that is
  ADJACENT to a rim hex, bounded to `hexRadius + 8` from the region
  center — the absolute worst case at ANY bearing (rim 98.7u + moon 26u +
  tile 3u = R+128) stays inside every `STORM_BOUNDARIES` gap
  (388<400, 658<668, 928<938); ring 1 additionally excludes the sunward
  cone (min radial stays > 145). Moons place AFTER gates/wards and reject
  cells in `gateZone` (≤3 hexes of any doorway/perch) and cells adjacent
  to ANOTHER area's hexes. `pickRim` MUST keep skipping `hex.stillmoon`
  (like `baseY`) or shrine launches/lodestones will anchor off moon tips.
- SPRING STONES touch nothing (the nestling gap guarantees ≥`clear` empty
  hexes around them): BFS can never reach one, only `trySpringHop`
  (≤6 hex leap on/off). Don't grow anything into the nestling gap.
- Frontier now advances at LAUNCH, not shard claim: `ward.dispelled` means
  "armed", `gate.spent` means "used". Surges still key off
  `world.progress.frontier`, so an armed-but-unlaunched frontier ring
  keeps its storm and its surges — intended.
- The chart (`mapFx.active`) blocks sailing clicks and hides hover; it
  refuses to open while `player.isMoving`/cutscene/teleport. Teleport
  destinations must be `discovered` AND hold a `springStoneKey`.
- Locked camera: `controls.maxDist` is rewritten EVERY FRAME in main
  (zoomCapFor / 3600 in chart / uncapped during launch cinema) — set it
  nowhere else, it will be overwritten.
- The cutscene owns the camera by nulling `controls._focusTo` every
  frame; anything else wanting camera control must check `cutscene.active`
  (sail-follow and storm strikes in main do). COMBAT and the BOSS INTRO do
  the same — main's locked-camera block additionally checks
  `combat.active`/`bossFx.active`.
- COMBAT OWNS THE KEYBOARD: main's overworld keydown handler bails while
  `combat.active || bossFx.active || ui.itemCardOpen || ui.choiceOpen` —
  spelling words hits every letter key, including F/M/R/H (R would reseed
  mid-fight!). combat.js registers its own keydown listener, always
  installed, self-guarded by `this.active`. Clicks likewise route through
  `combat.onClick` first.
- `damage()` is inert during `combat.active` (combat routes hits through
  main's `combatDamage`, which respects charm + a 0.35s combat invuln and
  triggers `die()` itself). Hazard bites pass `{hazard:true}` so
  `hazardGuard` items can shrug them; `stormSoul` skips storm-strike hits.
- The reward flow can complete SYNCHRONOUSLY inside a victory (no drop →
  `combat.finish()` immediately); anything watching phases must accept
  'reward' OR inactive. Meta tier unlocks are bumped BEFORE the boss's
  drops are rolled (wardens must unlock the tiers their own loot needs).
- `run.mods` accumulates raw item effects; NEVER write `run.stats`
  directly — call `computeStats(run)` (applyItem does). Instant payloads
  (heal/charm/containers/setMaxHalves) are returned by `applyItem` and
  applied by main's `applyInstant`.
- Meta (`meta.js`) writes localStorage on every bump — it is shared across
  seeds and survives death BY DESIGN; smoke tests get a clean slate only
  because each Playwright context is fresh.
- Roamers never spawn on / walk onto special hexes (`roamerHexOk`) — the
  overlap trigger would otherwise fire combat on top of a gate/teleporter
  handler. Round 12: rings 0-1 roamers additionally require WATER hexes
  (`waterOnly`) for both spawn and every step — `chaseStep`'s goal cell
  (the player's own hex) obeys the same terrain rule, so a shore-bound
  pilgrim can watch a beast pace the waterline but never be boarded.
- Spring exhaustion state is TWO halves: `springRested` (main, the heal
  gate) and the fountain's visual state (`built.exhaustSpring`). Both are
  reset together in `onEnterHex`'s area-change branch — clear one without
  the other and the fountain will look wrong.
- THE AIM CLOCK auto-commits via `_confirmTarget()` from inside
  `update()` — anything watching the target phase must accept it ending
  without input. The grimoire hand can never be empty (the UI refuses to
  drop below one; combat falls back to the starters if it somehow is).
  Bazaar stock entries are now `{ item, ... }` OR `{ runestone: true,
  ... }` — anything iterating stock must handle both shapes.
- The overworld keydown handler swallows everything while
  `ui.grimoireOpen` except G/Escape (which close it) — R could otherwise
  reseed under a misclick. Combat refuses to open the panel at all.

## Roadmap (undone, in rough priority)

1. Combat round 2: player-board effects (12 candidates listed in DESIGN.md
   Round 11 — ember/mire/gale/crumble/sanctuary/sparkle/rift/static/
   lodestone/echo/mirror/tidal), richer enemy strike patterns + timings
   (the timeline machinery already takes arbitrary types), shrine trials in
   front of the heart containers, ward criteria beyond the shard
   (`ward.criterion` is still pluggable), "or otherwise depending on the
   attack type" targeting variants for the player.
2. Run structure beyond death: run summary screen, same-seed practice mode;
   persist discovery/ward/warden state within a run so a reload doesn't
   wipe it (meta already persists).
3. New discovery mechanic for the Hollow Moon (rumor obelisks retired).
4. Tide-gated hexes; flavor-specific water rules.
5. Full planetary revolution (rigid region groups; gates re-anchor).
6. Sound: chimes for discovery, storm rumble, shard crack, blast whoosh,
   heart tear, spell keys, bar ticks, warden horns.

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

→ Round 10 (single spec, no polls): gate crossings became beam-and-orb
flights with the camera in tow; the camera locked to the wisp (rotate +
capped zoom) with a UI star-chart free camera and space-view labels;
STILLMOONS — 40-50 hex crystal-seeded satellite platforms on every true
region's rim with a floating rock body; ring progression made ONE-WAY
through grand crystal-socket ascension gates (shard claim arms, launch
spends the crystal and dispels the storm mid-flight); Ophthal's eye now
tracks the wisp; teleport concourses on rings 2-4 — marble waystations
with a Parthenon temple whose stone teleports (beam up, pan, beam down)
to any visited same-ring region's spring stone under its astral body.

→ Round 11 (single spec, no polls): COMBAT, written as one piece — the
player remade as a 2D paper-cutout hooded magician (glowing eyes, star
staff; `sprites.js` atelier); per-biome paper beasts roaming discovered
regions (tile-share starts a duel, Elders challenge by dialogue choice);
zoomed papercraft combat dioramas with two 3x3 boards, speed-metered
turns, the target→spell-typing→timing-bar attack challenge, telegraphed
enemy strikes with WASD dodging (melee lanes, 2-square ranged runs,
warden sweeps), control-hex debuffs (reversed/scrambled keys, locked
lanes), burn/freeze/slow imbues; a 512-piece item pool (200/150/100/50 +
12 relics, trade-off "cracked" pieces, always-optional card drops, 2D
card sprites) gated by localStorage META progression (kills, wardens,
achievements); a single Q-fired relic slot charged by kills; and the four
WARDENS bodily blocking the ascension gates at the end of ~20-tile
causeways behind threshold boss-gates (camera pan + burst-of-light name
reveal into combat). Orbits widened to 350/700/1050/1400 to fit the
causeways.

→ Round 12 (Polls 33-43): the magician's leftover torus halo deleted;
7-hex ANNEX COURTS (`placeCourt`) — every teleport concourse's temple
moved onto a court stamped between its two gate islets (makeTemple grown
into a full Parthenon), every spring waystation given a fountain court
with a tiered guardian fountain that visibly EXHAUSTS when drunk
(`makeFountain` + `built.exhaustSpring`, re-armed on re-entry); markets
rebuilt as 12-cell BAZAARS (broad pavilion tent, 2D paper trader, three
blocked sale pedestals one hex apart, clicked from beside) selling
run-pool items for the new STARDUST currency (combat pays it; vouchers
redeem one ware free; the item card gained a patter+price note row);
roamers made HUNTERS (6-hex sight chase, ring-scaled cadence slower than
sailing, rings 0-1 water-bound so land is safe early); combat re-ordered
so EVERY foe steps its patrol at target commit (end-of-turn shuffle gone
— aiming is prediction), react windows ~0.5s ring-nudged, and an attack
FX kit (tile spikes, caster→square shots, melee swing arcs, falling
bolts) for both sides.

→ Round 13 (Polls 44-47): THE GRIMOIRE — spell words became the player's
arsenal (28 words in `GRIMOIRE_WORDS`, length = strength ×1.00→×2.50,
tier-1+ words rolling burn/freeze/slow on landed strikes), learned from
RUNE STONES (25% enemy drops, elders/wardens always; drifting world
pickups; ~a third of bazaar pedestals) and curated in the grimoire panel
(G key — an active HAND of 1-8 words combat draws from); the target
phase gained an AIM CLOCK (1.5s − 0.2s/ring, floor 0.5s, auto-commits
the hovered square at zero); regions run DENSE (5 + ring roamers each,
global cap 60, ~2-4s spawn cadence); and the whole game quickened —
meters 12.5x, shorter combat pauses, base sail 0.18s/hex, stars/hearts/
merchant on tighter cadences.

Dev branch convention: work happens on a `claude/...` branch, PR'd to
`main` and merged; this round's branch is
`claude/game-mechanics-visual-polish-kuh8u3`. NOTE: GitHub Pages deploys
from `main` only — dev branches must NOT be added to the deploy workflow
triggers (the `github-pages` environment rejects them, and via the shared
concurrency group a failing dev run can cancel the real deploy).
