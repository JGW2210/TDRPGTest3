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

# Round 6 — Ruin Gates, Sculpted Worlds & the Wider Rim

A visual-identity pass, chosen by poll. Alongside the ballots, two direct
notes were implemented: ring-kind gates now FACE THE ORBIT'S TANGENT (signed
toward their twin, matching the arc the blast flies) instead of pointing
straight at the far gate; and the outer rings widened — ring 3 grew to 5
regions, ring 4 to 5, with small bare-rock **asteroid waystations** threaded
into ring 4's gate chain (the Shatter Reef, the Anvil Shoal, the Orphaned
Teeth — no astral body, no sea, two dolmen doorways each).

## Poll 13 — Gate form (ancient ruins + energy field)

- ☑ **Dolmen Waygate** — two massive rough-hewn stone pillars carry a cracked
  capstone lintel; a shimmering energy veil hangs in the doorway. Rubble,
  fallen shards, moss, and the warden's rune carved into both pillar faces.
- ☐ Twin Obelisks · ☐ Broken Archway · ☐ Sunken Henge.

**Implemented:** `structures.js makeDolmenGate` — hash-roughened stone (no
vertex tearing), merged ink hulls, `makeVeilMaterial` aurora-band field,
half-buried thresholds, two pacing warning glyphs. The old torus warden
rings, swirl iris, and pylons are gone.

## Poll 14 — Astral body rework

- ☑ **Sculpted archetypes** — bespoke geometry per body; sizes re-spread
  (~4–13) so giants dwarf moons; jagged noise only where a theme wants it.
- ☐ Smooth worlds, loud features · ☐ Exaggerated scale drama.

**Implemented:** `bodies.js sculptBody` — crystal (Aeolith), budding
(Mycora), cracked (Pyrrhus), sea giant (Thalassa, 11), machined drums
(Horolith), dune-banded (Sarrakh), cratered (Nivalis/Ossuar/Vesperine),
mossy (Verdanth), oblate banded gas giant with a great-spot (Fulmen, 13),
lidless eye that rarely blinks (Ophthal), split husk (Cantus), night shard
(Nokturn), twinned lobes with a glowing core (Resonar), petrified orchard
(Pomarium), fanged maw (Fauces), teardrop (Lacrimae), open bell-shell with a
swinging clapper (Cavum), black-rayed inverse sun (Nihil). The old shared
jagged icosahedron — which per-vertex noise was literally tearing at the
seams — is retired.

## Poll 15 — Region differentiation layers (all four selected)

- ☑ **Bespoke decor sets** — every biome furnishes its shores from its own
  hand-built kit (`decorSets.js`): ember-fins, chime-bells, spore caps, cog
  stacks, rust anchors, bone arches, eyestalks, tooth-rocks…
- ☑ **Signature landmarks** — one named structure per region
  (`structures.js makeLandmark`): the First Hearth, the Great Chime, the
  Stopped Clock, the Lidless Idol, the Baleen Arch… labeled, runic until the
  region is discovered.
- ☑ **Terrain identity** — per-biome island shaping profiles (terrace /
  dune / crag / mesa / smooth), two-tone island tops mottled by noise, and
  shoreline hexes tinted by their water's glow.
- ☑ **Ambient veils** — per-region particle weather: rising embers and
  spores, falling snow and petals, wandering fireflies, sliding mists,
  near-still watching motes.

## Poll 16 — New biomes (1× ring 3, 2× ring 4)

- ☐ Glass, Wax & Thread · ☐ Rust, Silk & Salt
- ☑ **Echo, Orchard & Maw** —
  **The Echo Verge** (Resonar, the Answering Dark): a still slate-blue sea,
  terraced twin-toned isles, paired echo-stones, rings of answered light
  rippling from the split planet.
  **The Silent Orchard** (Pomarium, the Fruiting Dark): a pale fallow-milk
  sea, petrified orchard trees, glowing fallen fruit, petals shed into the
  dark that never land.
  **The Maw Shallows** (Fauces, the Hungering Hollow): a swallowing red
  tide, crag isles studded with tooth-rocks and rib-bones, a planet that is
  mostly mouth, slowly chewing.

---

# Round 7 — The Fog and the First Landfall

Direct feature notes (no poll this round):

- **Fog of war** — every region except home starts unseen: its tiles,
  decor, gates, landmark, veil, labels, and astral body are invisible
  (instances scaled to nothing, objects hidden). Only the void's own
  furniture — stars, belts, comets, curios, leviathans, and the secrets'
  alignment-surge pillars — shows from the start. Fogged gate doorways are
  unclickable; fogged tiles can't be hovered or sailed to.
- **Discovery cutscene** — first landfall after a gate blast lifts the fog:
  tiles pop in with a staggered elastic swell while the camera leaves the
  wisp, levels out, and glides to the region's celestial body. The
  cartographer's whisper delivers two arrival lines per region
  (`INTRO_LINES` in config.js), each advanced by click and shimmering from
  runes into letters; the final click sends the camera home to the wisp.
  The home region reveals silently at start.
- **Transparency layering fix** — planet rings (and every transparent
  dressing: halos, storm-bands, dust veils, gate glows, ambient-veil
  particles, lock pillars) now carry renderOrder 2-3, above the sea's
  ghost-sheet (renderOrder 1). Previously the sheet drew after them and
  overpainted them — rings appeared to sink beneath the hexes.

---

# Round 8 — The Stormfront, Hearts & Astral Shrines

The roguelike run takes shape, chosen by poll. Alongside the ballots, three
direct notes were implemented: the **rune pedestals are gone** (stormwall
key-stones and rumor obelisks removed — ring progression is gated by the
stormfront instead); each ring boundary's outward gate begins **dark** — its
energy veil is absent until the ward is met, and ignition plays a cutscene at
the gate; and for this pass the ward's criterion is a **trigger item beside
the gate** (the criterion is pluggable — boss tallies join it with the combat
write).

## Poll 17 — Stormfront form

- ☑ **Maelstrom sheet** — a vast flat storm-sea filling the void from just
  past the frontier ring out to the world's edge: churning indigo-violet
  bands, debris-dark curds, constant lightning flicker, a glowing leading
  wall at its inner edge. Everything beyond hides beneath it (fog of war
  included, and the secrets' alignment surges are smothered while held). On
  dispel it rolls back to the next boundary in a retreating wave.
- ☐ Curtain wall · ☐ Storm cloud belt · ☐ Sheet + curtain.

**Implemented:** `makeStormMaterial` (materials.js) on a big ring mesh;
`STORM_BOUNDARIES` in config.js hold the four calm radii (145/400/668/938,
chosen to clear each ring's region rims + gate islets); `built.setStormFrontier`
eases the retreat; the last ward dissolves the sheet entirely, exposing the
secrets' surge pillars for the first time.

## Poll 18 — The trigger item

- ☑ **Stormheart shard** — a crackling crystal on a rocky perch two hexes
  from the outward gate's departure islet. Stepping onto it seizes it: the
  shard streaks into the dolmen's lintel, the veil pours down between the
  pillars, and the stormfront rolls back — watched by an ignition cutscene
  with two lines per boundary (`WARD_LINES`).
- ☐ Warden's rune-key · ☐ Caged star · ☐ Storm-bell.

## Poll 19 — Hazards (all four selected)

All scale in density and intensity with the biome's dread; a live one costs
half a heart; the home region keeps a gentle 4-hex cradle around the start.

- ☑ **Snare runes** — dim trap-glyphs on isle hexes; snap once, then burn out.
- ☑ **Void geysers** — water hexes erupting on a telegraphed cycle (bubbling
  foam builds first); standing or landing mid-eruption hurts.
- ☑ **Storm strikes** — from ring 2 outward, wandering lightning stalks the
  wisp's region: a hex crackles for a beat, then the bolt lands.
- ☑ **Maw blooms** — biome-tinted snapping shore-flora on a visible rhythm.

## Poll 20 — Death rule

- ☐ Same-seed rebirth · ☑ **New-seed rogue death** — losing the last
  half-heart guts the run: the wisp gutters out, the screen falls dark, and a
  brand-new cosmos grows from a fresh random seed.
- ☐ Anchor respawn.

## Poll 21 — Astral shrine placement

- ☑ **Hover above the region** — the platform hangs ~60-80 units up off the
  region's rim (the global grid is single-layer, so its cells live on free
  sky columns just past the rim, carrying altitude in `baseY`), betrayed by a
  thin beam of light dropping to its 7-hex teleportation stone islet in the
  sea. The stone hurls the wisp skyward in a vertical blast; the arrival pad
  dives you back down.
- ☐ Adrift past the rim · ☐ Rises with the rings.

## Poll 22 — Shrine trial

- ☑ **Silent altar for now** — platform, altar, reward; trials get designed
  properly alongside the combat/roguelike write. (Hazard gauntlet was the
  recommended alternative and remains the natural first trial.)
- ☐ Hazard gauntlet · ☐ Timed mote chase · ☐ Echo-order puzzle.

## Poll 23 — Hearts UI

- ☑ **Papercraft heart row** — three cut-paper hearts top-left, each split
  into two torn halves; damage tears a half away with a shake, a red vignette
  pulse, and a brief invulnerability blink on the wisp.
- ☐ Halo pips on the wisp · ☐ Row + halo echo.

## Poll 24 — Expansions (all four selected)

- ☑ **Heart containers** — each shrine altar bears one: max hearts +1
  (capped at six), immediately filled.
- ☑ **Wandering heart-sprites** — rare drifting hearts over discovered seas;
  sail onto one to mend half a heart.
- ☑ **Storm heralds** — vast horned silhouettes pacing the maelstrom beside
  each sealed outward gate, violet-eyed, dimly visible through the storm.
  Foreshadowing for the boss pass; each dissolves when its gate ignites.
- ☑ **Waystation springs** — each asteroid waystation keeps a glowing spring:
  stepping on it heals one full heart, once per visit.

---

## Boss / combat hooks

Entering a gate port fires `handleGate` in `main.js` before the blast begins —
a combat scene should hook exactly there (each gate has a stable id, rune,
its two port hex keys, and the two area ids it bridges). The storm wards are
the progression hook: each ward carries a `criterion` field ('shard' for this
pass) and dispels through `handleShardClaim` — a boss-tally criterion slots
into the same ward, replacing or joining the shard, with the same ignition
cutscene and storm retreat. The storm heralds pacing each boundary are the
wardens-to-be. The silent shrine altars are where combat trials land.

## Roadmap (not in v1)

- Warden combat at gates; ward criteria driven by boss tallies; shrine
  trials (hazard gauntlet first) guarding the heart containers.
- Run structure beyond death: run seeds, meta unlocks, persistence of
  `area.discovered` + ward state so a run survives a reload.
- Tide-gated hexes that exist only at high/low tide.
- Flow vectors influencing traversal cost/speed; flavor-specific rules.
- Full planetary revolution (rigid area groups + gate re-anchoring).
- Leviathan route rearrangement; leviathans detaching to swim to secrets.
- Fog-of-war cartography (areas sketch in as discovered).
- New discovery mechanics for the Hollow Moon (its rumor-rune obelisks
  retired with the pedestal purge — it currently sits open once the last
  stormfront falls).
