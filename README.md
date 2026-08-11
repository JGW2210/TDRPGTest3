# TDRPGTest3 — Astral Reaches World Map

A runic cosmic world map for a roguelike (Binding of Isaac-inspired) game:
polygonal worlds orbiting a small paper sun, each an **isolated archipelago**
adrift in the void — big grown islands around an astral body, wrapped in
deep astral waters — linked only by **gate nodes** that blast the traveler
across the dark. Built with three.js.

![style](https://img.shields.io/badge/style-Dark%20Aetherial%20Papercraft-2a2050)

## Run it

```bash
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`). Append `?seed=ANYTHING`
for a different cosmos, or press **R** in-game.

## Deployment (GitHub Pages)

Pushes to `main` run `.github/workflows/deploy.yml`, which builds the site
and publishes it to GitHub Pages at `https://<user>.github.io/TDRPGTest3/`.
Only `main` may deploy: the `github-pages` environment's protection rules
reject other branches, so dev branches are not workflow triggers (their runs
would fail at the deploy job and — via the shared `pages` concurrency group —
could cancel a legitimate `main` deploy).

One-time setup if the first run can't enable Pages by itself:
repo **Settings → Pages → Source: GitHub Actions**, then re-run the workflow
(or push again). The Vite config uses a relative `base`, so the build works at
any mount path.

## Controls

| Input | Action |
| --- | --- |
| **Click** a hex | Sail there, step by step |
| **Hold either drag** | Rotate / tilt (the camera stays locked on your wisp) |
| **Scroll** | Zoom, out to just beyond the current region |
| **M** / the ✦ star chart ✦ button | Toggle the free camera: glide the whole orrery under space-chart labels (no sailing while open) |
| **Esc** | Close the star chart (or the grimoire) |
| **G** / the ᚱ grimoire button | Open the grimoire: choose your active hand of up to 8 spell words |
| **F** | Find your wisp |
| **Q** | Fire your relic (in combat, once its kill-charge is full) |
| **R** | Generate a new cosmos (random seed) |
| **H** | Re-show the controls hint |

In **combat**: **WASD / arrows** move you square to square (and aim your
strike — against a burning fuse that commits the hovered square when it
runs out), **Space / Enter / click** commits, **letters** spell the
word drawn from your grimoire hand, **Space** locks the timing bar,
**Q** fires the relic.

In the star chart, **left-drag** glides, **right-drag** rotates, and
**scroll** soars out to the full orrery.

## What's in the world

- **Island regions in a vast orrery** — the Hearthstar's archipelago at the
  heart, then four orbital rings (3/4/5/5) holding 17 more regions, each an
  isolated archipelago: an astral body nestled at the center, wrapped by a
  vast circulating sea, with 3-5 grown islands of 10-30 hexes each (waters
  make up roughly 80-90% of the walkable tiles). Nothing connects regions on
  foot — between them is only void, faint pencil orbit-guides, belts, and
  serpents. Threaded between the outermost regions drift three **asteroid
  waystations** — bare-rock reefs with no body and no sea, just stone,
  rubble, and two doorways.
- **Dolmen waygate beams** — regions on the same ring are chained by gates:
  pairs of 7-hex rocky node islets bearing ancient dolmen doorways — rough
  mossy pillars, a cracked capstone, rubble, and a shimmering energy field
  hung between the stones. Stepping in unmakes the wisp into an ORB OF
  LIGHT that rides a beam to the twin doorway, camera in tow: same-ring
  beams sweep the LINE OF ORBIT in a glowing arc, outward beams lance
  straight across the void. First crossing stirs the gate's named Warden
  (the boss-fight hook).
- **One-way ascension gates** — each ring boundary keeps exactly one
  passage outward: a grand crowned dolmen half again as tall as its kin,
  with an empty crystal socket in its crown. Claiming the stormheart shard
  beside it seats the crystal and ARMS the gate; using the gate spends the
  crystal forever — a great launch beam hurls the orb outward while the
  maelstrom rolls back around it. There is no way back: outward is the
  run.
- **Stillmoons** — about a third of the ring regions trail a small
  satellite platform off their rim, always well clear of the gates: 25-30
  hexes of bare rock seeded with crystals in a single colour (each moon
  its own), beneath a small polygonal rock body floating over the
  platform's heart.
- **Teleport concourses** — threaded into rings 2-4 like the waystations,
  but dressed marble: a full-size Parthenon now stands on its own level
  7-hex **temple court**, annexed off the island's rim on the side between
  the two gates and stone-paved back to it, forecourt steps spilling
  toward the island and the teleport stone burning at its heart. Step up
  and the star chart unfolds with the current orbit lit
  violet — hover a charted island's body and it swells; click it and a
  beam takes you skyward, the camera pans the ring, and a second beam sets
  you down on the region's spring stone — a lone rock beneath its astral
  body, a short hop from the nestling waters.
- **Astral waters with depth** — every region has its own named water (the
  Heliotide, the Quicksilver Race, the Lidless Calm…). Hexes sink to
  different levels of the cosmic deep, near-borderless, with soft light-bands
  drifting along each current, faint rune-script, and rare starlike glints.
  The sea is rendered twice — a near-opaque glassy base in each region's own
  color, plus a translucent ghost-sheet above it in one shared aetherial
  slate-blue, patchy along its light-bands and wobbling at its own slower,
  taller rate — so the water reads as a restless volume, not a floor. Two
  rings of unwalkable ghost-hexes dissolve each region's rim into the void.
  The movement grid lives in UI instead: a glowing outline on the hovered hex
  and a trail of dots marking the queued route.
- **The fog and the first landfall** — only your home region is visible at
  first; every other region hides beneath the fog of war. Step through a
  gate and, as you land, the new region assembles out of the dark — tiles
  swelling into place — while the camera glides to its astral body and the
  cartographer's whisper delivers its arrival lines, advanced click by
  click, before returning you to your wisp.
- **The stormfront** — a vast maelstrom sheet seals everything beyond the
  ring you've earned: churning violet storm-bands, debris-dark curds, and
  constant lightning. Every outward gate begins dark — no energy veil —
  until you seize the **stormheart shard** crackling on a perch beside it:
  the shard streaks into the gate's crown and arms it, the veil pours down
  between the pillars, and the storm waits for you to commit. The launch
  itself rolls the maelstrom back one ring in a retreating wave; the final
  launch dissolves it entirely and bares the secret deep.
- **Three papercraft hearts, halved** — trapped hexes cost half a heart:
  one-shot **snare runes** on the isles, telegraphed **void geysers** in the
  waters, and (from ring 2 out) wandering **storm strikes** — all denser
  and quicker with every ring. The **chompers** come from a trap atlas,
  each biome snapping in its own shape: tooth-maws in the Maw Shallows,
  Venus flytraps in the bramble and spore mires, giant clams on the
  drowned shores, gear-presses on the Cog Strand, buried bone-jaws,
  lure-lanterns that bite — sparse in the first rings, thick in the deep
  ones. Lose the last half and the wisp gutters out: rogue death, and a
  brand-new cosmos grows from a fresh seed. A **ward-charm** (gift of
  hermits, the merchant, or fallen stars) eats one hit in your stead.
- **Rock-hop chains** — many regions grow a chain of floating rocks off
  their rim: a cracked **springboard stone** on the shore, a few isolated
  hop-rocks bowing over the void, and an orbiting islet at the end —
  the **Curio Peddler's bazaar** or a **hermit of the void** squatting by
  its astral curio, with two lines of talk and a gift for first-time
  callers. Hops launch ONLY from the chain's own stones: click any rock
  and the wisp leaps stone to stone.
- **The bazaar & stardust (Round 12)** — the peddler SELLS now. Every
  felled beast shakes loose **stardust** (more in deeper rings, more from
  elders and wardens; the pouch sits beside your hearts), and each bazaar
  is a hand-laid 12-hex market: a broad patched pavilion with the trader —
  a 2D paper cutout with lantern eyes — waiting beneath it, and **three
  sale pedestals** standing one hex apart in front. Pedestal tiles can
  never be walked on: stand beside one and click it, and the trader names
  a tier-struck price over the item's card. Cartographer bounty vouchers
  redeem any one ware free.
- **Astral shrines** — floating platforms hung high off region rims, each
  bearing a silent altar with a heart container (+1 max heart; trials
  arrive with the combat pass). Their old teleporters are gone: claim the
  **starlit lodestone** perched on the far rim and the drowned rocks heave
  up one by one into a helix of hop-stones spiralling up to the platform.
- **Wandering kindnesses & pressures** — stray **heart-sprites** drift
  over discovered seas; **falling stars** crash-light a hex for a minute
  (reach it for a mend or a charm); the **merchant leviathan** surfaces
  along a rim with a howdah full of gifts; the cartographer posts a
  **bounty** per ring, worth a free ware at any bazaar; and while a
  stormfront still stands it occasionally **surges** into the frontier
  ring. Each asteroid waystation keeps a **guardian fountain** on its own
  7-hex court — a tiered marble fountain with a robed statue pouring from
  an ewer at its back. Drink and it mends a heart, then visibly
  **exhausts**: the water drains dark, the jets die, the guardian's eyes
  go out and its head bows — until you next return to the region.
- **The tide** — the sun breathes on a slow cycle. Waters brighten at high
  tide, and *faint tide-paths* into the outer dark only glimmer into view at
  the peak.
- **Star-leviathans** — two serpents endlessly circle the middle rings, and a
  glowing third swims the hidden spoke to a secret stage (its hexes ride on
  its back).
- **Three secret outer bodies**, far past the rim on extended spokes:
  the Weeping Comet, the Hollow Moon, the Unlit Star (follow the leviathan).
  The maelstrom smothers their signs until its last wall falls; then, at
  peak tide, an *alignment surge* pillar of light briefly marks each secret.
- **Dark aetherial papercraft look** — muted toned-down hues glowing softly
  against a deep indigo void, ink outline shells on every island and body, a
  craft-paper sun with a spinning crown of rays, sparkle stars, dark paper
  nebulae, and crayon comet trails.
- **Sculpted bodies with character** — every astral body is bespoke geometry
  at its own scale: Thalassa an oblate ocean giant, Fulmen a banded tempest
  colossus dwarfing the moons, Horolith a turned-brass machine world with its
  counter-turning gear, Ophthal a lidless eye that very rarely blinks,
  Fauces a fanged mouth slowly chewing, Resonar a world split into answering
  halves, Cantus a hollow husk, Nihil a black-rayed inverse sun…
- **Regions with their own dress** — each biome shapes its islands its own
  way (terraces, dunes, crags, mesas) in two mottled tones with glowing
  shorelines; furnishes them from a bespoke decor kit (chime-bells, cog
  stacks, rust anchors, bone arches, eyestalks…); hangs its own weather over
  the sea (rising embers, falling snow, wandering fireflies, sliding mists);
  and keeps one named landmark — the First Hearth, the Stopped Clock, the
  Lidless Idol, the Baleen Arch — runic until you set foot there.
- **Named curios** — small drifting oddities with quiet name-tags scattered
  through the void: the Anchorless Bell, a Door to Nowhere, a Very Lost
  Teacup, the First Draft of a Star — plus fields of paper shards, torn
  strips, and stray moonlets.
- **Squash & bounce** — the wisp squashes through every hop, islands spring
  when you land, port rings boing as you pass through, and astral bodies
  wobble like jelly when first discovered.
- **Non-modular runic UI** — no panels; floating aetherial text only. Names
  appear in Elder Futhark and *decipher* letter-by-letter as your wisp
  translates the cosmos (Twin-Tongue). In-world 3D labels hang over bodies and
  gates, rune-only until discovered.

- **Paper beasts that HUNT, in packs (Rounds 11-13)** — every biome keeps
  its own 2D paper-cutout beasts (a Cinderling of the reefs, a Mirage
  Viper of the dunes, an Oculite of the shallows…) roaming its discovered
  region — **five of them at the sun, one more per ring outward**, topped
  up fast. Spot one within six hexes and it turns hunter — stepping
  toward you hex by hex, clearly slower than your sail in the early
  rings, quicker with every ring outward. Beasts of the first two rings
  are **water-bound**: they never set foot on an isle, so ashore is safe
  ground early. Battle begins ONLY when you share a tile; **Elder**
  beasts instead hold their ground and challenge you by dialogue choice —
  those fights are always yours to accept.
- **The grimoire (Round 13)** — spell words are YOURS now. You start with
  five 5-letter starters and learn stronger ones from **rune stones**: a
  quarter of felled beasts carry one (elders and wardens always), drifting
  stones hover over discovered seas, and bazaars sometimes sell one. A
  word's **length is its strength** — 5-letter words cast at ×1.00,
  9-letter sovereigns up to ×2.50, all scaled by your attack stat, and
  stronger words roll burn / freeze / slow on a landed strike. Press
  **G** to open the grimoire and choose your active **hand of up to
  eight**: combat draws its word from the hand, so a long-word hand is a
  deliberate high-risk, high-power loadout.
- **The duel (Rounds 11-13)** — sharing a tile zooms the world into a
  papercraft **combat diorama** staged over the hex: two 3x3 boards face
  each other, turns scheduled by **speed** (meters fill fast — fights
  open in moments now). Your attack is a three-step challenge — pick a
  target square against a burning **aim fuse** (1.5s at the sun, tighter
  every ring: dawdle and it commits wherever you hover; items widen the
  pattern), **type the word drawn from your grimoire hand** against the
  clock, then land an **Undertale-style timing bar**. The moment your
  target locks, EVERY foe takes one step of its patrol — aiming is a
  prediction, and foresight items preview the step — then your staff-bolt
  flies and the strike lands where it bursts, spikes snapping up through
  every covered square. On the foe's turn danger
  squares track you in amber, lock red, and bite after a ~0.5s wind-up
  (a touch tighter in the deep rings) — melee lunges with a slashing arc,
  ranged bolts arc visibly through the whole wind-up and roll toward the
  camera, sweeps raise a row of spikes, crosses drop falling stone —
  while you dodge freely with WASD. Deep-ring foes throw **control-hexes**:
  reversed keys, scrambled keys, or a locked lane only a perfect strike
  reopens.
- **The hooded magician** — the Star-Pilgrim remade as a paper cutout:
  glowing eyes deep in the cowl, a staff crowned with a caught star.
- **500-item pool, Isaac-style (Round 11)** — 200 commons, 150 rares (a few
  *cracked*, stronger but costly), 100 super-rares that bend the playstyle
  (imbues that burn/freeze/slow, attack patterns, foresight into enemy
  patrols, overworld movement), and 50 hand-cut legendaries that warp the
  run. Drops are random but **always optional**, offered on a papercraft
  card with a 2D sprite; deeper tiers and the strangest pieces stay locked
  until meta progression (kills, wardens, achievements) opens them — and
  that meta is the only thing death cannot take.
- **The relic slot (Round 11)** — exactly one active relic rides your belt,
  fired with **Q** and recharged by felling enemies (or a stray voltspark):
  novas, stasis bells, borrowed hours, bottled eclipses.
- **Warden causeways (Round 11)** — every ascension gate now stands at the
  far end of a ~20-tile causeway reaching out from the region rim, barred
  near its start by a fortified **threshold gate**. Cross the threshold and
  the camera pans to the arena beyond, a burst of light reveals the
  **warden** — Pyraxis the Emberclad, Maelis the Tidebound, Vhorren the
  Galecrowned, Nyx Ophellum — and the fight begins. Only its defeat drops
  the ward-lattice and opens the way to the stormheart shard and the gate.

Everything is procedurally generated from the seed (layout, biome placement,
archipelago shapes, gate runes, warden causeways, shard perches, hazards,
shrine platforms). The 500-item pool and the bestiary are fixed tables;
drops, roams, and unlocks are the run's own dice.

## Project shape

| File | Role |
| --- | --- |
| `src/config.js` | Biome/water/terrain/veil/landmark tables, ring layout, storm boundaries, runes |
| `src/worldgen.js` | Seeded generation: areas, hexes, asteroids, gates, storm wards, hazards, shrines, rock-hop chains, leviathans |
| `src/buildWorld.js` | Turns world data into instanced meshes + stormfront, traps, chains, markets, merchant, cosmos décor |
| `src/bodies.js` | Sculpted astral-body archetypes (eye, maw, gas giant, husk…) |
| `src/structures.js` | Dolmen waygates (grand ascension variant), the court-spanning Parthenon temple, guardian fountains (with exhaustion), stillmoon bodies, chomper trap atlas, springboards, bazaar pavilions + sale pedestals, hermits, altars, landmarks |
| `src/cutscene.js` | Discovery cutscene: camera glide + click-through dialogue |
| `src/decorSets.js` | Bespoke per-biome island decor geometry library |
| `src/materials.js` | Water/veil shaders, canvas textures |
| `src/player.js` | The paper magician: click-to-sail, BFS pathing, ripples |
| `src/sprites.js` | Paper-cutout atelier: magician, the trader, biome beasts, wardens, item cards |
| `src/combat.js` | The combat diorama: speed-metered turns, spell + timing-bar attack, commit-step foes, ~0.5s telegraphs, the attack FX kit, debuffs, relics |
| `src/enemies.js` | Bestiary: per-biome beasts, patrols, temperaments; the four wardens |
| `src/items.js` | The 500-item pool + relics, drop rolls, stat engine |
| `src/meta.js` | localStorage meta progression: kills, wardens, achievements, unlocks |
| `src/controls.js` | Left-drag glide / right-drag rotate / scroll zoom camera |
| `src/ui.js`, `src/labels.js` | Floating runic text, Twin-Tongue deciphering |
| `DESIGN.md` | The design polls, chosen directions, and roadmap |
