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

Pushes to `main` or `claude/tdrpgtest3-world-map-skpoyn` run
`.github/workflows/deploy.yml`, which builds the site and publishes it to
GitHub Pages at `https://<user>.github.io/TDRPGTest3/`.

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
  stirs the gate's named Warden (the boss-fight hook); stormbound nodes
  refuse the blast until their rune-stone is struck.
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
- **The tide** — the sun breathes on a slow cycle. Waters brighten at high
  tide, and *faint tide-paths* into the outer dark only glimmer into view at
  the peak.
- **Stormwall rune-locks** — three ring passages are sealed by crackling
  stormwalls near an area's harbor; step on the matching rune-stone to calm
  them.
- **Star-leviathans** — two serpents endlessly circle the middle rings, and a
  glowing third swims the hidden spoke to a secret stage (its hexes ride on
  its back).
- **Three secret outer bodies**, far past the rim on extended spokes:
  the Weeping Comet (faint tide-path), the Hollow Moon (strike all three
  rumor-rune obelisks), the Unlit Star (follow the leviathan). At peak tide an
  *alignment surge* pillar of light briefly marks each secret.
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
archipelago shapes, river routes, gate runes, lock positions).

## Project shape

| File | Role |
| --- | --- |
| `src/config.js` | Biome/water/terrain/veil/landmark tables, ring layout, runes |
| `src/worldgen.js` | Seeded generation: areas, hexes, asteroids, gates, locks, leviathans |
| `src/buildWorld.js` | Turns world data into instanced meshes + cosmos décor |
| `src/bodies.js` | Sculpted astral-body archetypes (eye, maw, gas giant, husk…) |
| `src/structures.js` | Dolmen waygates + per-region signature landmarks |
| `src/decorSets.js` | Bespoke per-biome island decor geometry library |
| `src/materials.js` | Water/veil shaders, canvas textures |
| `src/player.js` | The Star-Pilgrim wisp: click-to-sail, BFS pathing, ripples |
| `src/controls.js` | Left-drag glide / right-drag rotate / scroll zoom camera |
| `src/ui.js`, `src/labels.js` | Floating runic text, Twin-Tongue deciphering |
| `DESIGN.md` | The design polls, chosen directions, and roadmap |
