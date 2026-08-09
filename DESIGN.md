# Astral Reaches — Design Polls & Decisions

The world map's direction was chosen by poll. Each ballot below records the
options considered, the pick (☑), and how far v1 implements it. Any of these
can be revisited — the generator and renderer are parameterized enough that
most swaps are contained changes.

---

## Poll 1 — Art direction

- ☑ **Ink & Starlight** — deep indigo void; waters as luminous flowing ink
  with rune glyphs drifting in the current; low-poly flat-shaded islands with
  glowing edges; bloom everywhere.
- ☐ Stained-Glass Aurora — translucent lit-from-beneath crystal panes.
- ☐ Obsidian & Emberrune — dark forge, molten rune veins.
- ☐ Living Star-Chart — parchment cartography that inks itself in.

**v1:** implemented. Water shader scrolls two parallax layers of a generated
rune-glyph canvas along each hex's flow vector; hex rims glow; ACES tone
mapping + UnrealBloom carry the ink-glow look.

## Poll 2 — Map topology (~15 areas)

- ☑ **True Orrery Rings** — sun archipelago at the heart; rings of 3/4/4/3
  areas at radii 150/280/415/555; secrets at 830–980.
- ☐ Spiral Galaxy Arms · ☐ Constellation Web · ☐ Shattered Shells.

**v1:** implemented. Every area connects to its nearest inner-ring neighbor
(guaranteed), sometimes a second, plus partial same-ring cycles — so routes
branch and loop. Faint orbit guide-lines render the rings in the zoomed view.

## Poll 3 — Astral waters (all four selected)

- ☑ **Currents & Tides** — v1: per-hex flow vectors (tangent circulation
  around bodies, streamwise along rivers) visibly carry the rune glyphs; the
  sun breathes on a ~42s cycle (`uBreath`), brightening all water and
  revealing faint tide-paths at the peak. *Later:* flow affecting step speed;
  tide-gated hexes that flood/drain.
- ☑ **Water Flavors as Terrain** — v1: 18 named waters, one per area, each
  with its own color and flow speed. *Later:* per-flavor movement rules
  (healing fens, item-hiding shallows).
- ☑ **Runic Locks & Stormwalls** — v1: three rivers sealed by stormwall
  pillars; each has a rune-stone key on a nearby island; stepping on it calms
  the wall (pathfinding respects the seal). *Later:* multi-rune sequences,
  wandering keys.
- ☑ **Living Rivers** — v1: the two longest rivers plus the Unlit Star's
  hidden path are leviathan rivers — a serpent swims beneath, the hexes above
  ride its back (vertex bob), eyes and glowing spine visible. *Later:* routes
  that physically rearrange while the leviathan turns.

## Poll 4 — Scale & motion

- ☑ **Living Orrery** — one continuous scene, seamless zoom from hex to
  system.
- ☐ Anchored Stage + Parallax · ☐ Telescope Hybrid.

**v1:** implemented as a *breathing* orrery: sun pulses, planets spin, moons
orbit planets, three asteroid belts turn at different speeds, comets fly
ellipses with trails, dust disc rotates. Planetary *revolution* around the sun
is deliberately frozen so the hex graph stays stable; the staged path to full
revolution is to orbit each area group rigidly and re-anchor rivers at
gate-crossing moments (roadmap).

## Poll 5 — UI voice (all three selected)

- ☑ **Cartographer's Whisper** — floating screen text: location line, grand
  center announcements, cursor-following hover labels. No panels anywhere.
- ☑ **Twin-Tongue Deciphering** — every name renders in Elder Futhark first;
  announcements decode letter-by-letter; area/gate labels stay rune-only until
  you set foot there, then shimmer into legibility.
- ☑ **The World Speaks** — 3D floating labels over bodies and gates, warning
  glyphs orbiting gate rings, rune-script flowing inside the water itself.

## Poll 6 — Secret discovery (all four selected, split across three secrets)

- ☑ **Faint Tide-Paths** → *the Weeping Comet*: ghost hexes, near-invisible
  at low tide, walkable the whole time.
- ☑ **Rumor Runes** → *the Hollow Moon*: three obelisks in ring-2+ areas each
  hold one rune; strike all three and the sealed path ignites.
- ☑ **Leviathan Trails** → *the Unlit Star*: a bright-spined leviathan swims
  the hidden path — follow the glow.
- ☑ **Star Alignment** → folded into the tide: at peak breath an *alignment
  surge* pillar of light marks every secret body for a few seconds.

## Poll 7 — Biome weirdness

- ☐ Strange · ☐ Very Strange · ☑ **Cosmic-Horror Fringe**

**v1:** each area carries a `dread` value rising with ring index. Effects:
island tilt/hover jitter, palettes lerped toward bruise-violet, whisper glyphs
drifting over outer waters, eerie asides appended to hover text
deterministically per hex ("it watches", "do not count the corners"), the
Unblinking Shallows grow eye-sprites that always face the camera, and the
three secrets are outright wrong (arrhythmic heartbeat moon, weeping tears,
an inverse sun whose darkness breathes opposite the Hearthstar).

## Poll 8 — Gate form

- ☑ **Warden Rings** — runic ring-portals named for Elder Futhark runes,
  swirling void-iris shader, pylons, orbiting warning glyphs. Stepping on the
  gate hex wakes the announcement hook (`the warden stirs beyond the veil`).
- ☐ Colossi at Anchor · ☐ Storm-Eyes.

---

# Round 2 — The Web, Fast Travel & the Paper Turn

A second poll round reshaped the map's structure and its whole mood.

## Poll 9 — Spider-web waterways

- ☑ **Orb-Weaver's Wheel** — complete concentric ring-rivers (2-3 hexes wide)
  at every orbit radius plus eight straight radial spokes sun-to-rim; areas
  sit at spoke-ring crossings.
- ☐ Dewdrop Web · ☐ Spiral Silk · ☐ Tangle Web.

**Implemented:** ring bands are carved with wiggly hand-cut edges and
alternate flow direction per ring; ring waters take the flavor of the nearest
area, blending around the wheel. Spokes extend faintly past the rim to the
three secrets. The old thin point-to-point bezier rivers are gone.

## Poll 10 — Gate fast travel

- ☑ **Riverflight** — each gate is a pair of port rings, one at each shore;
  stepping into (or clicking) a port sweeps the wisp along the actual water
  path between them at high speed, camera chasing, ripples streaking.
- ☐ Blink Step · ☐ The Paper Ferry · ☐ Warden's Toll.

**Implemented:** the flight follows a Catmull-Rom curve over the real hex
path (BFS over the web), so it bends with the river. If a stormwall blocks
the route the gate refuses until the lock is becalmed. First use of a gate
stirs its Warden (boss hook); arrival port won't bounce you straight back.

## Poll 11 — Papery restyle

- ☑ **Paper-Craft Cutout** — flat pastels, ink outline shells (inverted-hull
  on islands, planets, the sun, gate rings), layered wiggly-cut paper wave
  stripes in the water shader with stamped ink runes, toon-stepped shading,
  bloom nearly off, warm twilight-blue sky, doodle sparkle starfield, pastel
  paper clouds, crayon comet trails, craft-paper sun with a spinning ray
  crown.
- ☐ Storybook Watercolor · ☐ Pop-Up Book · ☐ Origami Cosmos.

## Poll 12 — Tone

- ☑ **Squash & Bounce** — wisp squash-and-stretch on every hop and a
  streaking stretch in riverflight; islands spring when landed on; port rings
  boing on crossing; bodies jelly-wobble on first discovery.
- ☐ Doodle Sky (partially absorbed: sparkle stars + crayon trails came with
  the cutout style) · ☐ Confetti & Chimes · ☐ Spooky-Cute Fringe.

**Tone consequence:** the Cosmic-Horror Fringe visuals (watching eyes,
whisper glyphs, bruised palettes, dread hover-asides) were removed for a
uniformly cheerful cosmos. The outer-ring biome *names* stay deliciously
ominous — Ophthal, That Which Watches, is now merely a name.

---

# Round 3 — Depth & the Dark Aetherial Pass

Direct art-direction notes (no poll this round): pull the world back toward a
dark cosmic mood while keeping the papery charm.

- **Hex depth** — water hexes sink to per-hex depths (seeded noise), darker
  the deeper; island heights spread wider so shorelines, shelves, and crags
  read at a glance.
- **Watery, not stripey** — the water shader trades hard paper stripes and
  ink hex borders for soft drifting light-bands, large luminance blotches,
  faint rune-script, and rare starlike glints. Rivers are near-borderless.
- **Movement grid as UI** — a pulsing outline marks the hovered hex and a
  dotted trail marks the queued route; the sea itself carries no grid.
- **Muted palette** — saturation and lightness pulled down across water,
  islands, decor, and debris (`tone()` in buildWorld); deep indigo sky,
  dark paper nebulae, dimmer dust and guides; bloom as a gentle accent.
- **Body character** — each astral body gets a signature feature (chime
  crystals, molten fissure, brass gear, storm-bands, lanterns, bone crown,
  shadow veil, a rare wink…).
- **Named curios & more debris** — eight labeled drifting oddities plus
  instanced fields of paper shards, torn strips, and moonlets.
- **Label layering** — all name sprites render with depth-test off and a high
  render order, so names are always readable above the tiles.

---

# Round 4 — Island Regions & Gate Node Blasts

Direct rework notes: the walkable web is gone.

- **Region anatomy** — each region grows a connected water blob seeded from
  the ring that nestles its astral body, then 3-5 islands of 10-30 hexes grow
  inside the blob (kept a hex apart), with island-level base heights and
  lower shorelines. Waters land at roughly 80-90% of walkable tiles — vast
  seas with sparse island marks. Regions were re-spaced onto wider orbits
  (260/530/800/1070; secrets past 1380) so nothing can touch across the
  void.
- **No rivers** — ring-rivers and spokes are removed entirely. Between
  regions there is only void; clicking another region reports that the
  currents do not reach.
- **Gate nodes** — each neighboring pair of regions gets a gate: two 7-hex
  bare-rock islets (biome-less gray), one hanging off each facing rim,
  attached to their region by a paved line of hexes. The warden ring stands
  on the center rock; entering it BLASTS the wisp to the twin node in a
  soaring eased arc (~1-2.4s by distance) with a tumble and squash. No
  force-walking, no river path.
- **Locks** — stormwalls now seal three departure nodes (becalmed by a
  rune-stone on a nearby island); the Hollow Moon's outer node carries the
  three-rune rumor seal. A leviathan wheels tightly around the Unlit Star's
  hidden crossing; two greater serpents circle the void between orbits.

---

# Round 5 — One Passage Out, Orbit Blasts & the Living Sea

- **One gate outward per ring** — each ring boundary now carries exactly one
  randomly-placed radial gate (plus the three secret gates). Progression:
  circle a ring through its same-ring gates, find THE way out.
- **Blast trajectories by kind** — same-ring gates fly the wisp along the
  line of orbit (angle-lerp around the sun at ring radius; ports are placed
  tangentially so the arc hugs the orbit), while radial/secret gates are a
  straight shot outward. Verified: orbit blasts hold ~253+ radius on a
  260-radius ring where a chord would dip to ~130.
- **Two-layer water** — the sea renders twice from shared instance data: a
  near-opaque glassy base keeping each region's color, and a ghost-sheet
  (+0.52) above it unified to one aetherial slate-blue, patchy along its
  light-bands (solid crests, sheer troughs) and wobbling at its own slower,
  taller rate and phase. The sea moves like a volume.
- **Soft rims** — two rings of unwalkable fringe hexes extend past each
  region's edge, sinking and fading with distance, so regions dissolve into
  the void instead of ending at a hard border. They live only in the
  renderer — never in the hex map — so they cannot be clicked or sailed.

---

## Boss / combat hooks

Entering a gate port fires `handleGate` in `main.js` before the riverflight
begins. A combat scene should hook exactly there (the Warden's Toll poll
option — fight once to bind the gate, then free fast travel — is the natural
extension): each gate has a stable id, rune, its two port hex keys, and the
two area ids it bridges — enough to pick a warden, a difficulty, and an arena
palette.

## Roadmap (not in v1)

- Tide-gated hexes that exist only at high/low tide.
- Flow vectors influencing traversal cost/speed; flavor-specific rules.
- Full planetary revolution (rigid area groups + river re-anchoring).
- Leviathan route rearrangement; leviathans detaching to swim to secrets.
- Fog-of-war cartography (areas sketch in as discovered).
- Combat encounters at warden gates; run structure (permadeath loop, unlocks).
