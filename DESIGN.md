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

# Round 9 — The Trap Atlas, Rock-Hop Chains & the Wandering Kindnesses

Chosen by poll. Direct notes implemented alongside: chomper (maw) traps are
sharply reduced in rings 1-2 and personalised per biome; ~40% of regions
grow floating rock-hop attachments off their rims; the shrine platforms'
teleport stones are replaced by trigger-revealed hop chains; and hops may
only begin from a chain hex (launch springboard, hop-rock, dock, or pad) —
never from open ground.

## Poll 25 — Land-trap rework

- ☑ **Full bespoke atlas** — six chomper archetypes mapped across the biomes
  (`TRAPS` in config.js → `makeChomper` in structures.js): tooth-maw (Maw
  Shallows only, boosted at home), Venus **flytrap** (Thornlight / Sporelight
  / Silent Orchard), giant **clamshell** (Meridian / Grave of Anchors /
  Unblinking), snapping **gear-press** (Cog Strand), buried **bone-jaw**
  (Bleached Choir / Whisperdune / Umbral), biting **lure-lantern** (Lantern
  Fen / Frostveil / Storm Aviary). Chimewood, Cinder, Echo Verge and the
  secrets carry no chompers at all. Rings 1-2 place them at ~30% density.
- ☐ Only maw + plant biomes · ☐ Minimal rework.

## Poll 26 — Shrine access

- ☑ **Chains replace stones** — the teleportation stone islets are gone.
  Each shrine region hides a rock-hop chain helixing up around the
  platform's column from a launch springboard on the rim (blocked + hidden
  until revealed, so nothing can path onto it early).
- ☐ Chain up, teleport down · ☐ Keep both.

## Poll 27 — Market trade

- ☑ **Gift stalls for now** — one free boon per market per run (a mend if
  hurt, else a ward-charm); the true economy arrives designed alongside
  combat. Bounty vouchers also redeem here.
- ☐ Stardust economy · ☐ Heart barter.

## Poll 28 — Event bodies

- ☑ **Lore hermits for now** — six hermits (`HERMITS` in config.js), two
  dialogue lines each through the cutscene system, a small gift on first
  visit. Mechanical events wait for the combat pass.
- ☐ Choice omens · ☐ Blessing/curse roulette.

## Poll 29 — Chain trigger item

- ☑ **Starlit lodestone** — a humming magnetic stone on a rim perch directly
  ACROSS the region from the platform. Claiming it streaks it over the sea
  to the launch hex while the drowned rocks heave up one by one (staggered
  easeOutBack, launch-side first), watched by a cutscene (`LODE_LINES`).
- ☐ Song shell · ☐ Kite-thread spool.

## Poll 30 — Hop & launch

- ☑ **Springboard leaps** — a cracked stone springboard ringed with pointing
  cairns marks each launch hex. Hops reuse the blast arc at short range
  (~0.5s squash-and-tumble). Clicking ANY rock of the chain hops the wisp
  rock-to-rock toward it; hops refuse to start anywhere off-chain.
- ☐ Sling stones · ☐ Dandelion drift.

## Poll 31 — Marketkeeper

- ☑ **The Curio Peddler** — a hooded, lantern-eyed cousin of the wisp behind
  paper crates and a patched awning; the free boon floats above a pedestal
  hex, taken by stepping up.
- ☐ The slumped automaton · ☐ Offering stones.

## Poll 32 — Extra run events (all four selected)

- ☑ **Falling stars** — every couple of minutes a star falls onto a
  discovered region; its crash-light burns for a minute. Reach it for half a
  heart — or, in the dread rings, a ward-charm.
- ☑ **Storm surges** — while a stormfront still stands, it occasionally
  surges into the frontier ring: a warning, then ten seconds of quickened
  strikes wherever the wisp sails.
- ☑ **Merchant leviathan** — a fourth serpent with a gift-stall howdah
  roams the void, occasionally coiling alongside a discovered region's rim
  (a horn announces it); step onto its lamp-lit hex for a boon.
- ☑ **Cartographer bounties** — one landmark errand per unlocked ring,
  shown under the location line; honoring it banks a boon redeemable at any
  market.

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

---

## Round 11 — Combat, beasts, stats, the item pool, warden causeways

No polls this round; one spec, written as one piece (as the roadmap always
intended for combat).

### The shape of a fight

- **Trigger**: sharing a tile with a roaming paper beast starts combat
  outright; an **Elder** (challenger) beast sits still and asks first via a
  floating dialogue choice — opting in is always the player's. Wardens
  trigger by crossing their causeway threshold.
- **Stage**: a zoomed papercraft **diorama** floating over the encounter
  hex, dressed in the biome's own colors (torn disc, cut-paper peaks). Two
  3x3 boards face each other; the camera drops to over-the-shoulder.
- **Scheduling**: both sides fill an initiative meter at their **speed**
  stat; whoever brims acts. Speed items visibly buy more turns; freeze
  makes the foe forget one; slow drags its meter.
- **Player attack** (three-step challenge): pick a target square on the
  foe's board (attack-pattern items widen the footprint: twin / pierce /
  sweep / cross / scatter) → **spell the magical word** against a draining
  clock (mistakes cost breath; fizzled words still fire, weakly) → land the
  **timing bar** (perfect strikes hit 1.6x and shatter lane-hexes).
- **Enemy movement is planned and periodic**: every beast walks a fixed
  patrol of its nine squares, one step per turn; dodgers take one extra
  step the instant your strike commits. **Foresight** reads it back to you
  (level 1: next square; 2: the square after; 3: the whole patrol).
- **Enemy attack**: a telegraphed timeline. Danger squares TRACK the player
  in amber (earlier with **sight**), lock red, then bite after a react
  window of 0.8s (ring 0) down to 0.3s (the deep rings). Melee dashes into
  a lane for one square; ranged shots take two squares rolling toward the
  camera; wardens add row-sweeps and cross-bursts. The player moves freely
  the whole turn.
- **Control-hexes** (enemy debuffs, deep rings + wardens): reversed keys,
  scrambled keys (reshuffled every beat), and a **locked lane** that only a
  perfect strike reopens. `calmMind` halves them, `mirrorWard` rebounds
  lane-locks, the Salt Circle relic purges them.
- **Statuses** (player imbues): burn (stacking damage at the foe's turn),
  freeze (skipped turns), slow (dragged meter).

### Player-board effect candidates (for a later round)

The 3x3 the player dances on is deliberately plain this round. Candidates
to season it, roughly in the order they'd earn their keep:

1. **Ember squares** — a tile smoulders for a few beats; standing on it
   ticks half-heart damage. The cheapest pressure: shrinks the safe set.
2. **Mire squares** — stepping ON one is fine, stepping OFF costs a beat
   (movement delay). Punishes lazy center-camping without hard denial.
3. **Gale rows** — a wind arrow telegraphs, then the whole board shoves one
   square sideways at the next beat. Dodging becomes prediction.
4. **Crumbling tiles** — a tile cracks on second visit and falls to void for
   the rest of the turn (standing there when it falls = a hit). Makes
   footwork a resource.
5. **Sanctuary tile** — one glowing square eats the next hit outright, then
   shatters. A reward square the enemy AI can deliberately aim at.
6. **Mending sparkle** — blooms on a far square for ~2s; standing on it when
   it pops mends half a heart. Bait: usually blooms inside danger.
7. **Rift pads** — two paired squares; stepping on one snaps you to the
   other. Free escape hatch AND a mis-input trap under scrambled keys.
8. **Static squares** — touching one scrambles your keys for 2s (a tile-borne
   version of the debuff, dodgeable by geometry instead of luck).
9. **Lodestone square** — for two beats everything drifts one step toward
   it unless the player inputs against the pull. Pairs cruelly with lanes.
10. **Echo tiles** — remember the last strike's danger squares and repeat
    them one beat later, fainter. Rewards remembering, not just reacting.
11. **Mirror lane** — while standing in the marked column, left/right are
    mirrored (a spatial, self-inflicted, always-readable reverse).
12. **Tidal board** — the whole 3x3 slides one row toward the foe every N
    beats and a new back row surfaces; melee reach effectively grows.

### Beasts & wardens

- One archetype per biome (17 ring biomes + waystation vermin + secret
  hollows), drawn as parameterized paper cutouts from ~18 silhouette
  families with the biome's own palette and glowing eyes; stats seasoned by
  ring and dread. Elders are tinted, half again as strong, and always carry
  an item.
- The four **wardens** bar the ascension gates bodily. Each boundary gate's
  platform became a ~20-tile **causeway** (threshold boss-gate at row 2, a
  3-wide arena flat mid-span, the grand dolmen + stormheart perch at the far
  end; everything past the threshold BLOCKED until the warden falls).
  Crossing the threshold pans the camera to the arena, a burst of light
  reveals the warden and its name, then combat begins. The orbits were
  widened (350/700/1050/1400, storm boundaries 222/572/922/1272) so a
  worst-case rim + causeway still clears every storm line and the facing
  region — re-derive BOTH if either changes again.

### Items, relics, meta

- **512-piece pool**: 200 commons (one small stat nudge), 150 rares (the
  last three of each line *cracked*: stronger + a trade-off), 100
  super-rares (playstyle benders), 50 hand-cut legendaries (flags like
  autoSpell / minGood / echoVision / gambler), 12 relics. Every piece
  renders a 2D card sprite (tier frame + kind glyph + tint).
- Drops are **always optional** (card with take/leave), rolled from the
  unlocked pool minus everything already taken this run; luck tilts the
  table, wardens floor it at super-rare.
- **One relic slot**: active on Q, cooldown counted in kills, voltsparks
  refill it early. Wardens offer a relic before their item.
- **Meta** (localStorage, the only survivor of death): kills, wardens
  felled, best ring, items taken, perfect strikes, swift casts, and ~15
  achievements. Super-rares unlock at 15 kills or the first warden;
  legendaries at the first warden or 40 kills; the weirdest pieces sit
  behind specific achievements.

### Stats vocabulary

atk / spd (turn frequency) / sight (telegraph reveal time) / foresight
(patrol prediction) / spellTime / barWidth / dodge (react window) / crit /
luck / stepSpeed (overworld sailing) / hopRange (spring-stone leaps) /
hazardGuard / burn / freeze / slow / thorns / shield / lifesteal /
relicRate — folded from item mods by `computeStats` into `run.stats`.

---

## Round 12 — Polls 33–43: annex courts, the bazaar economy, hunting roamers, commit-step combat, attack FX

A mixed pass: small artifact fixes, two structure reworks onto dedicated
7-hex platforms, markets made a real economy, roamers made hunters, and the
combat turn re-ordered so aiming is a prediction. All chosen by poll.

## Poll 33 — The player's ring

- ☑ **Delete it entirely** — the spinning torus halo over the magician's
  head was an artifact of the old wisp model. Gone from `player.js`; the
  paper figure keeps only its sprite glow and warm point light.
- ☐ Ground glow decal · ☐ Fade in at far zoom.

## Poll 34 — Temple platform

- ☑ **Annex pad off the rim** — every teleport concourse stamps a level
  7-hex **ANNEX COURT** (a heart hex + six petals, `placeCourt` in
  worldgen) on the rim side whose bearing bisects its two gate islets,
  stone-paved back to the knot exactly like a gate islet. The teleporter
  hex moved from the knot's heart to the court's; `makeTemple` grew from a
  pillared hut into a true Parthenon (~2.2× — three-step stylobate,
  five-column flanks, pediment gables, votive braziers, forecourt steps)
  whose front faces the island between the gates.
- ☐ Whole concourse = 7-hex flower · ☐ Carve a clearing inside the knot.

## Poll 35 — Spring court + fountain

- ☑ **Statue fountain, re-arms** — spring waystations stamp the same 7-hex
  court at a free bearing. New `makeFountain`: a tiered marble fountain
  (twin water sheets, crown jet, four spill jets, drifting mist) with a
  robed **GUARDIAN STATUE** pouring from an ewer on a plinth at the back.
  Drinking heals as before and **EXHAUSTS** the fountain — water drains
  dark, jets die, the pour stops, the guardian's lantern eyes go out and
  its head bows (`built.exhaustSpring(areaId, on)`). Both the heal and the
  look re-arm when the pilgrim next re-enters the region.
- ☐ Once per run, permanent · ☐ 2D papercraft statue.

## Poll 36 — Market shape

- ☑ **Stamped 12-hex bazaar** — market chains end in a hand-authored
  12-cell stamp instead of the old 5-cell islet: a dock stone facing home,
  a 3-wide walkable aisle, a 5-wide pedestal row (three **SALE PEDESTALS**
  at lateral offsets −2/0/+2 — one walkable gap hex between each pair,
  pedestal hexes `blocked`), and a 3-wide tent row whose heart holds the
  trader (also blocked). `makeMarketStall` became a broad patched pavilion
  (four poles, valance, canvas back wall, crates, a rolled carpet, a
  swinging lantern) — and the cone-peddler was retired for a **2D
  paper-cutout trader** (`drawTrader`/`traderCanvas` in sprites.js).
  Hermit chains keep the old organic 5-cell islet.
- ☐ Grown islet + placed set · ☐ Tent isle + floating pedestal spurs.

## Poll 37 — Sale terms

- ☑ **Stardust coins** — the run's first currency. Every felled foe shakes
  loose `2 + ring (+2 elite, +8 warden)` stardust (counter beside the
  hearts). Each bazaar's three pedestals stock items rolled from the run's
  pool at world-wake (no duplicates across markets), priced by tier:
  common 8 · rare 14 · super-rare 22 · legendary 30. Bounty vouchers
  redeem any one pedestal ware free.
- ☐ Heart-price devil deals · ☐ Free pick-one-of-three.

## Poll 38 — Sale prompt

- ☑ **Item card + trader line** — clicking a stocked pedestal from an
  ADJACENT tile opens the familiar item card with a `#item-note` row: a
  line of peddler patter plus the price (or "your bounty voucher covers
  it"), and a buy/walk-away choice. Buying deducts, bursts the ware off
  its pedestal, and applies the item like any drop. Standing anywhere
  farther refuses with a flash; the pedestal tiles themselves are
  unwalkable by construction.
- ☐ Floating runic choice · ☐ Speech-bubble scene.

## Poll 39 — Roamer pursuit (custom answer)

- ☑ **Sight-radius chase, ring-scaled — and early beasts never set foot on
  land** (user-written option). A roamer that sees the pilgrim within 6
  hexes on its island steps toward them (BFS next-hop over cells it may
  walk; failing a road, it paces the legal cell that closes the gap —
  water-bound beasts circle the shoreline). Hunt cadence starts far below
  sail speed (a step per 1.6s at ring 0) and quickens with depth (0.55s
  floor). Elders still stand their ground and challenge by dialogue;
  battle still triggers ONLY by sharing a tile.
- ☐ Chase + retire elder prompts · ☐ Territorial lunge.

## Poll 40 — Water-bound boundary

- ☑ **Rings 0-1 water-only** — beasts of the first two rings spawn on and
  chase across water hexes only; isles are safe ground early. From ring 2
  outward they cross land too (never onto special/trigger hexes).
- ☐ Ring 0 only · ☐ Water-only until ring 3.

## Poll 41 — When the combat foe steps

- ☑ **All foes step on commit** — every enemy advances its patrol exactly
  one step the moment the player LOCKS a target square (frozen foes hold
  still), easing visibly while the spell and bar play out; the strike then
  lands on whatever square the prediction earned. The old end-of-turn
  patrol shuffle is gone, and the dodger special-case with it — aiming is
  now a prediction for every foe, with foresight ghosts previewing the
  step.
- ☐ Step at the strike (after spell + bar) · ☐ Commit-step gated by
  statuses/temperament.

## Poll 42 — Telegraph wind-up

- ☑ **0.5s base, ring-nudged** — the lock-to-impact react window became
  `max(0.42, 0.55 − 0.03·ring)`: 0.55s at the sun easing to ~0.43s in the
  deep rings (dodge items and the clarity relic still add). The amber
  tracking lead is unchanged.
- ☐ Flat 0.5s everywhere · ☐ Whole telegraph (amber + red) in 0.5s.

## Poll 43 — Attack FX

- ☑ **Mesh FX kit + impact bursts** — a pooled effect kit in combat.js,
  all stage-local children torn down with the diorama: **SPIKES** (tinted
  cones snapping out of struck tiles), **SHOTS** (glowing orb + halo
  arcing caster → square), **SWINGS** (an additive arc slashing over the
  bitten cell), **FALLS** (stone bolts dropping with a squash). Mapping —
  player strike: a staff bolt flies to the marked square and the strike
  lands where it bursts (spikes through every covered cell, a slash arc
  for wide patterns); enemy melee: lunge + swing; ranged: the bolt is
  visible for the whole react window and lands exactly as the red square
  bites, then rolls on toward the camera; sweep: a spike row; cross:
  falling bolts. Tile overlay flashes stay as the impact underlay.
- ☐ Paper-cutout FX sprites · ☐ Hybrid mesh + paper.
