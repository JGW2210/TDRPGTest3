# TDRPGTest3 — Astral Reaches World Map

A runic cosmic world map for a roguelike (Binding of Isaac-inspired) game:
low-poly polygonal worlds orbiting a small sun, navigated hex-by-hex across
archipelagos of **astral waters**. Built with three.js.

![style](https://img.shields.io/badge/style-Ink%20%26%20Starlight-2a2050)

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

- **True Orrery Rings** — the Hearthstar's own archipelago at the heart, then
  four orbital rings holding 14 more areas (15 total), difficulty rising with
  distance. Faint orbit guide-lines sell the star-chart from the zoomed-out view.
- **Astral waters** — every region has its own named water (the Heliotide, the
  Quicksilver Race, the Lidless Calm…) with its own color, flow speed, and
  visible current: rune-glyphs drift along the flow inside the shader. Waters
  circulate around each astral body; rivers stream between areas.
- **The tide** — the sun breathes on a slow cycle. Waters brighten at high
  tide, and *faint tide-paths* into the outer dark only glimmer into view at
  the peak.
- **Warden gates** — every river between two areas is noded by a runic
  ring-portal named for an Elder Futhark rune (the Gate of Sowilo…). Stepping
  onto a gate hex stirs its Warden — the boss-fight hook.
- **Stormwall rune-locks** — some channels are sealed by crackling stormwalls;
  find and step on the matching rune-stone to calm the passage.
- **Star-leviathans** — the greatest rivers are alive: serpents swim beneath
  the hexes (which ride their backs), and one swims the hidden path to a
  secret stage.
- **Three secret outer bodies**, far past the rim, each found differently:
  the Weeping Comet (faint tide-path), the Hollow Moon (strike all three
  rumor-rune obelisks), the Unlit Star (follow the leviathan). At peak tide an
  *alignment surge* pillar of light briefly marks each secret.
- **Cosmic-Horror Fringe** — outer rings go subtly wrong: tilted hexes,
  bruised palettes, hovering islands, whispering water, and — in the
  Unblinking Shallows — islands that watch you back.
- **Non-modular runic UI** — no panels; floating aetherial text only. Names
  appear in Elder Futhark and *decipher* letter-by-letter as your wisp
  translates the cosmos (Twin-Tongue). In-world 3D labels hang over bodies and
  gates, rune-only until discovered.
- **A living sky** — asteroid belts turning between rings, comets with glowing
  trails, drifting runestones, spinning glyphs, nebulae, and dust.

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
