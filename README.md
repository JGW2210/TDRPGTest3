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
| **Hold left-drag** | Glide the camera across the sea |
| **Hold right-drag** | Rotate / tilt |
| **Scroll** | Soar between hex-level and the full orrery |
| **F** | Find your wisp |
| **R** | Generate a new cosmos (random seed) |
| **H** | Re-show the controls hint |

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
- **Dolmen waygate blasts** — regions on the same ring are chained by gates:
  pairs of 7-hex rocky node islets bearing ancient dolmen doorways — rough
  mossy pillars, a cracked capstone, rubble, and a shimmering energy field
  hung between the stones. Same-ring doorways face along the orbit's tangent
  and their blasts ride the LINE OF ORBIT in a sweeping curve; each ring has
  exactly ONE randomly-placed passage outward to the next ring, and those
  gates face their twin for a straight shot across the void. First crossing
  stirs the gate's named Warden (the boss-fight hook).
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
  waters, snapping **maw blooms** on the shores, and (from ring 2 out)
  wandering **storm strikes** — all denser and quicker with every ring.
  Lose the last half and the wisp gutters out: rogue death, and a brand-new
  cosmos grows from a fresh seed. Shrine altars grant heart containers,
  stray **heart-sprites** drift over discovered seas to mend you, and each
  asteroid waystation keeps a **healing spring** (one heart, once per visit).
- **Astral shrines** — floating challenge platforms hung high off the rims
  of regions from ring 1 outward, each betrayed by a thin beam of light
  dropping to a 7-hex teleportation stone islet in the sea. Step onto the
  stone circle and it hurls the wisp skyward; a silent altar waits on top
  (its trial arrives with the combat pass), bearing a heart container.
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
| `src/worldgen.js` | Seeded generation: areas, hexes, asteroids, gates, storm wards, hazards, shrines, leviathans |
| `src/buildWorld.js` | Turns world data into instanced meshes + stormfront, hazards, shrines, cosmos décor |
| `src/bodies.js` | Sculpted astral-body archetypes (eye, maw, gas giant, husk…) |
| `src/structures.js` | Dolmen waygates, shrine stones & altars, storm heralds, landmarks |
| `src/cutscene.js` | Discovery cutscene: camera glide + click-through dialogue |
| `src/decorSets.js` | Bespoke per-biome island decor geometry library |
| `src/materials.js` | Water/veil shaders, canvas textures |
| `src/player.js` | The Star-Pilgrim wisp: click-to-sail, BFS pathing, ripples |
| `src/controls.js` | Left-drag glide / right-drag rotate / scroll zoom camera |
| `src/ui.js`, `src/labels.js` | Floating runic text, Twin-Tongue deciphering |
| `DESIGN.md` | The design polls, chosen directions, and roadmap |
