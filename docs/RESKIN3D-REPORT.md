# 3D reskin report: "Paper Passport" in the run

Goal: the in-run world must be unmistakably a different product from Dx Dash (dark grape-purple, neon glow, bloom,
portal gates), and match the 2D "Paper Passport" UI (docs/DESIGN.md). Everything is a rendering, material and
geometry change: map ids and names, gate/card logic, the HTML answer overlay, engine behaviour, storage keys and
exports are unchanged.

Screenshots (real runs in headless Chromium, high tier unless noted) are in `docs/screens/3d-*.webp`:
`3d-compare-original-vs-now`, `3d-gates-approach-library`, `3d-gate-correct-stamp`, `3d-gate-wrong-scribble`,
`3d-gates-closeup-correct|wrong`, `3d-powerup-badge-run`, `3d-pin-badges`, `3d-hush-front-back`, `3d-maps-1..3`.

## The look in one paragraph

Flat colour bands instead of lighting (a four-step toon ramp), a thin navy ink outline round everything you must read
(runner, gates, obstacles, coins, badges; plus a one-pass depth outline on the high tier), warm paper haze and banded
paper skies, station-platform floor paint, brass and enamel pickups, paper confetti instead of sparks. No bloom, no
additive glow, no emissive accents, no ACES contrast curve, no violet.

## What changed, file by file

| File | Change |
|---|---|
| `js/game/paper.js` (new) | The shared look: `PALETTE` (the DESIGN.md tokens as hex), `paperize()` (violet and magenta turn to ink blue and coral, saturation ceiling, no pure black, a breath of paper over every colour; idempotent enough to apply twice), `toonRamp`/`toonMaterial`/`newToon`, `inkMaterial`/`addInkHull`/`outlineGroup` (inflated back-face hull, works on every tier, skinned meshes included), `paperizeMaterials(root)` (Standard/Lambert/Phong become toon, additive glow becomes a flat faint shape, vertex and instance colours are recoloured), `paperizeCanvas()` (recolours painted map textures pixel by pixel). |
| `gates.js` | Visuals only. A gate is a ticket-office arch: two lane-coloured posts (left red `#D9432C`, centre marigold `#F2B134`, right teal `#0E8C8A`) with ink outlines, a cream sign board (`children[0]`, toon, ink hull) with a painted face: lane-colour header band, perforation line, ticket notches, the answer word and its romanisation in ink, topic icon. A painted lane mat on the floor (dashed paper border, chevrons). `flashGateResult` (wrong): the chosen sign shakes and gets an ink scribble plus a red cross stamp, the right sign gets the green check stamp. New `stampGateCorrect` (right): the right sign takes a green rubber-stamp "thunk" (scale 2.3 to 1 with overshoot, a jolt of the sign); the others go paper-grey. Colour-blind mode swaps the lane colours. The card pool, picking, daily order and `resolveStats` code is untouched. |
| `postfx.js` | Bloom, saturation boost and vignette removed. One cheap pass: a depth outline (second difference of disparity, so flat floors and walls get no lines and only silhouettes do), a faint warm grade and paper grain. High tier only, as before (needs the multisampled target's depth texture). |
| `materials.js` | `NoToneMapping`; `upgradeMaterials` makes toon materials; env reflections turned down. |
| `track.js`, `worlds.js`, `skinbuilders.js` | Banded paper sky dome (flat sun disc, no stars or glow), paper fog, station-platform markings (`buildPlatformMarkings`: dashed cream lane dividers with ink edges, marigold safety strips, tile joints; they scroll with the walls), running lights became flat paper studs, whole track passed through `paperizeMaterials`. The old glowing lane lines were removed. |
| `skins.js`, `themes.js`, `atmosphere.js` (checked) | Every map colour, sky and light goes through `paperize` once at load; the 15 topic themes are re-derived from paper, stamp colours and the "Night Train" navy; time-of-day tints never produce violet (tested). `mapkit.js` paints every canvas texture through `paperizeCanvas`. |
| `obstacles.js` | Brass travel-token coins (flat brass disc, ink edge, raised rim, engraved 8-point compass star on both faces; still 4 instanced draw calls). Power-up orbs are enamel pin badges: ink rim, brass bezel, enamel field in the power-up's stamp colour, the icon proud of the enamel; the badge always faces the camera. Icon shapes are exactly the ones `powerupicons.test.js` pins (shield extrusion, horseshoe, `2x` sprite, wheel, stretched gem). Jump/slide arrows are flat paper arrows with ink outlines. Obstacles are paperized and outlined on spawn. |
| `powerupfx.js`, `trails.js` | Auras and rings restyled onto the palette (ink rings and wireframes, stamp-coloured fills); trail particles never use additive blending and take palette colours. |
| `enginevisuals.js` | Pickup and gate sparks became paper confetti chips, stamp dots and tiny airmail envelopes (shared geometry, they shrink instead of fading); the map-change gateway is a cream station arch with an ink outline and a pale colour wash (no pulsing glow); rush speed lines are ink. |
| `enginedefs.js` | Heart pickup: stamp-red toon heart on a cream sticker (no glow halo). |
| `exammonster.js` (the Hush) | A flat ink-navy blot (lumpy deterministic sphere), cream paper eyes with ink pupils, ink drips instead of tentacles, a red nightcap, ink question marks, and on its back a paper speech bubble with "SHHH" and the finger-over-lips mark. Same part names, same groups, same animation hooks. `monsters.js` paperizes the other Hush relatives. |
| `charactermodel.js`, `player.js` | GLB runners and monsters are cel-shaded with their own colours and textures; the runner gets an ink outline (a skinned hull sharing the skeleton, so it animates for free). Procedural stand-ins are toon too. |
| `homecharacter.js`, `preview.js` | Home hero scene and Locker preview: warm paper background and lights (no purple ambient, no cyan rim), a cream stamp-pad plinth with an ink edge and a red ring, confetti dust. |
| `scenery.js` | Loaded GLB scenery is paperized once (before merging). |
| `audio.js` | See below. |
| `engine.js`, `engineencounter.js` | Small edits needed by the above (not on the ownership list): the gate "scale and colour poking" now calls `stampGateCorrect`/`flashGateResult`; the ink pass no longer waits for the old "Glow effects" switch (see leftovers). |

## Audio (done, tests green)

Same API, events, track table shape and pattern lengths. The synth voices changed: the lead is now always plucked or
struck (marimba for `sine`, kalimba for `triangle`, a plucked string through a closing filter for `square`/`sawtooth`),
the bass is a round plucked upright with a pluck tick, pads are always soft (sine/triangle, never square/saw), and the
backbeat is a shaker with a wood-block click instead of a snare. The menu theme moved from a minor-key saw groove to a
lydian marimba tune at 104 bpm. New travel scales (hirajoshi, yo, phrygian dominant, lydian) are used by the Tokyo
and Kyoto maps, Calavera Fiesta and Algarve Sunset. SFX were already soft sine/triangle blips and were left alone.

## Quality tiers

- High: toon + hull outlines + the one-pass ink outline (multisampled target, 2 samples on phones and integrated GPUs, as before).
- Medium: toon + hull outlines (gates, runner, coins, badges, obstacles); no post pass.
- Low: toon materials only (cheaper than the old PBR); no hulls, no models, no post pass.
- Hull outlines cost one extra draw per outlined mesh and only ever cover a handful of objects.

## Tests

New: `paperlook.test.js` (paperize rules, no violet in any map/sky/atmosphere/theme, gate structure, lane colours, stamp and
scribble states, no glow in gates/Hush/icons, toon conversion, outlines), `musicvoices.test.js` (every track plays every
step with soft bass and pad). Updated for the new look: `coininstancing.test.js` (the coin has 4 instanced parts),
`worldmaps.test.js` and `hospitalhall.test.js` (the floor no longer carries its own lane lines; the platform markings in
`track.js` do).

## Leftovers and notes for other owners

- **"Glow effects" setting** (`js/uisettings.js:191`, `storage.glowEffects`): it used to switch bloom on (off by default).
  There is no glow now; the ink-outline pass runs on the high tier regardless, and the switch only makes its lines bolder (`setBold` in `postfx.js`, so the "a switch that does nothing" test stays true). The label and description are stale: the 2D
  owner may want to rename it (for example "Ink outlines") or drop it, and `engine.js` `_getPostFX` can then read the new key.
- The rush "vignette" is CSS (2D owner); the 3D side only exposes ink speed lines.
- Obstacles on the medium tier have hull outlines but scenery does not (only the high-tier pass outlines scenery).
- A few maps paint textures with hard-coded colours; `paperizeCanvas` recolours the pixels, but GLSL shader colours in some
  map effects (`ShaderMaterial`) are not touched.
- The classic Hush's cone nightcap reads a little like a Christmas hat; fine for now.
- The shush mark on the Hush's bubble is small at game distance (it reads at the Locker's close-up).
- Screenshots were taken with SwiftShader (software GL), so frame times were not meaningful; nothing here adds more than one
  full-screen pass, but a real-phone check of the medium tier is still worth doing.
