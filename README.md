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
  heart, then four orbital rings holding 14 more regions, each an isolated
  archipelago: an astral body nestled at the center, wrapped by a vast
  circulating sea, with 3-5 grown islands of 10-30 hexes each (waters make up
  roughly 80-90% of the walkable tiles). Nothing connects regions on foot — between
  them is only void, faint pencil orbit-guides, belts, and serpents.
- **Gate node blasts** — regions on the same ring are chained by gates: pairs
  of 7-hex rocky node islets crowned with runic warden rings. Same-ring
  blasts ride the LINE OF ORBIT in a sweeping curve; each ring has exactly
  ONE randomly-placed passage outward to the next ring, and those blasts are
  a straight shot across the void. First crossing stirs the gate's named
  Warden (the boss-fight hook); stormbound nodes refuse the blast until
  their rune-stone is struck.
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
- **Bodies with character** — every astral body has a signature: Aeolith's
  chime-ring of crystals, Horolith's counter-turning gear, Fulmen's shearing
  storm-bands, Vesperine's bobbing lanterns, Ophthal's rare wink…
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
| `src/config.js` | Biome/water/decor tables, ring layout, runic alphabets |
| `src/worldgen.js` | Seeded generation: areas, hexes, rivers, gates, locks, leviathans |
| `src/buildWorld.js` | Turns world data into instanced meshes + cosmos décor |
| `src/materials.js` | Water/sun/gate shaders, canvas textures |
| `src/player.js` | The Star-Pilgrim wisp: click-to-sail, BFS pathing, ripples |
| `src/controls.js` | Left-drag glide / right-drag rotate / scroll zoom camera |
| `src/ui.js`, `src/labels.js` | Floating runic text, Twin-Tongue deciphering |
| `DESIGN.md` | The design polls, chosen directions, and roadmap |
