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
| **Esc** | Close the star chart |
| **F** | Find your wisp |
| **R** | Generate a new cosmos (random seed) |
| **H** | Re-show the controls hint |

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
- **Stillmoons** — every region trails a small satellite platform off its
  rim: 40-50 hexes of bare rock seeded with crystals in a single colour
  (each moon its own), beneath a small polygonal rock body floating over
  the platform's heart.
- **Teleport concourses** — threaded into rings 2-4 like the waystations,
  but dressed marble: a Parthenon-style pillared hut keeps a teleport
  stone. Step up and the star chart unfolds with every charted island on
  the orbit; choose one and a beam takes you skyward, the camera pans the
  ring, and a second beam sets you down on the region's spring stone — a
  lone rock beneath its astral body, a short hop from the nestling waters.
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
  ring you've earned: churning violet storm-bands, lightning, and vast
  horned **storm heralds** pacing beside each sealed passage. Every outward
  gate begins dark — no energy veil — until you seize the **stormheart
  shard** crackling on a perch beside it: the shard streaks into the lintel,
  the veil pours down between the pillars, and the storm rolls back one ring
  in a retreating wave, all watched by an ignition cutscene. The final shard
  dissolves the maelstrom entirely and bares the secret deep.
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
  markets, hermits, or fallen stars) eats one hit in your stead.
- **Rock-hop chains** — many regions grow a chain of floating rocks off
  their rim: a cracked **springboard stone** on the shore, a few isolated
  hop-rocks bowing over the void, and a small orbiting islet at the end —
  the **Curio Peddler's gift market** (one free boon per run) or a
  **hermit of the void** squatting by its astral curio, with two lines of
  talk and a gift for first-time callers. Hops launch ONLY from the
  chain's own stones: click any rock and the wisp leaps stone to stone.
- **Astral shrines** — floating platforms hung high off region rims, each
  bearing a silent altar with a heart container (+1 max heart; trials
  arrive with the combat pass). Their old teleporters are gone: claim the
  **starlit lodestone** perched on the far rim and the drowned rocks heave
  up one by one into a helix of hop-stones spiralling up to the platform.
- **Wandering kindnesses & pressures** — stray **heart-sprites** drift
  over discovered seas; **falling stars** crash-light a hex for a minute
  (reach it for a mend or a charm); the **merchant leviathan** surfaces
  along a rim with a howdah full of gifts; the cartographer posts a
  **bounty** per ring, worth a boon at any market; and while a stormfront
  still stands it occasionally **surges** into the frontier ring. Each
  asteroid waystation keeps a **healing spring** (one heart, per visit).
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

Everything is procedurally generated from the seed (layout, biome placement,
archipelago shapes, gate runes, shard perches, hazards, shrine platforms).

## Project shape

| File | Role |
| --- | --- |
| `src/config.js` | Biome/water/terrain/veil/landmark tables, ring layout, storm boundaries, runes |
| `src/worldgen.js` | Seeded generation: areas, hexes, asteroids, gates, storm wards, hazards, shrines, rock-hop chains, leviathans |
| `src/buildWorld.js` | Turns world data into instanced meshes + stormfront, traps, chains, markets, merchant, cosmos décor |
| `src/bodies.js` | Sculpted astral-body archetypes (eye, maw, gas giant, husk…) |
| `src/structures.js` | Dolmen waygates, chomper trap atlas, springboards, market stalls, hermits, altars, heralds, landmarks |
| `src/cutscene.js` | Discovery cutscene: camera glide + click-through dialogue |
| `src/decorSets.js` | Bespoke per-biome island decor geometry library |
| `src/materials.js` | Water/veil shaders, canvas textures |
| `src/player.js` | The Star-Pilgrim wisp: click-to-sail, BFS pathing, ripples |
| `src/controls.js` | Left-drag glide / right-drag rotate / scroll zoom camera |
| `src/ui.js`, `src/labels.js` | Floating runic text, Twin-Tongue deciphering |
| `DESIGN.md` | The design polls, chosen directions, and roadmap |
