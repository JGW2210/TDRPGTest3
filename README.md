# TDRPGTest3 — Astral Reaches World Map

A runic cosmic world map for a roguelike (Binding of Isaac-inspired) game:
polygonal worlds orbiting a small paper sun, navigated hex-by-hex across an
**Orb-Weaver's Wheel** of astral waters — concentric ring-rivers and radial
spokes, like a spider web spun across a solar system. Built with three.js.

![style](https://img.shields.io/badge/style-Paper--Craft%20Cutout-f4e3c9)

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

- **The Orb-Weaver's Wheel** — the Hearthstar's archipelago at the heart, then
  four complete concentric ring-rivers (2-3 hexes wide) crossed by eight
  radial spokes. The 14 outer areas sit exactly at spoke-ring crossings, so
  every archipelago is a junction node; the whole web is walkable water.
  Pencil-line orbit guides sell the spider web from the zoomed-out view.
- **Riverflight gates** — every neighboring pair of areas is joined by a gate:
  a PAIR of runic port-rings, one at each shore, with the web's river running
  between them. Click a port (or sail onto it) and your wisp is swept along
  the water in a swift streaking glide to the far port. First crossing stirs
  the gate's named Warden (the boss-fight hook); stormwalls on the route
  refuse the flight until becalmed.
- **Astral waters** — every region has its own named water (the Heliotide,
  the Quicksilver Race, the Lidless Calm…) rendered as layered wiggly-cut
  paper waves with rune glyphs stamped like ink prints, drifting along each
  hex's current. Waters circulate around bodies; rings alternate direction.
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
- **Paper-Craft Cutout look** — flat pastels, ink outline shells on every
  island and body, a craft-paper sun with a spinning crown of rays, doodle
  sparkle stars, pastel paper clouds, crayon comet trails, and a warm
  twilight-blue sky instead of a black void.
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
