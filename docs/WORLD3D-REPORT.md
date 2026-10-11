# World 3D re-theme report

Scope: maps, obstacles, props, scenery, home scene, Hush visuals. All ids, module exports and file names are unchanged.
Display names and one-line scenes follow `docs/MAP-NAMES.md` (written by the cast/shop agent; not overwritten).

## Important naming decision: `skin.name` is a stable KEY, `skin.title` is the display name

`skin.name` (e.g. "Hospital Hallway") is used as a lookup key by saves (`settings.preferredMap`), `js/audio.js`
(SKIN_MUSIC), `js/game/secrets.js`, `js/game/sidemotion.js`, `hazards.js`, analytics and many tests. Renaming it would
silently break music, secrets and saved favourites, so it is NOT renamed. `js/game/skins.js` now has, per skin:
`title` (the Lexicon Guild name from MAP-NAMES.md), a new `desc`, and an exported `skinTitle(skin)` helper.
`getSkinByName()` accepts either the key or the title.

## Needs other owners (file + line)

- Anything that shows a map name to the player must use `skinTitle(skin)` (import from `js/game/skins.js`) instead of
  `skin.name`: `js/uipostrun.js:45`, `js/ui.js:1176`, `js/ui.js:2345`, `js/uisettings.js:1115-1153` (Favorite map
  dropdown text), `js/main.js:809`, sidecards (`ui.updateSideCards`, test `tests/unit/sidecards.test.js:20`).
  Keep using `skin.name` for keys (music, secrets, analytics, `preferredMap`).
- `js/storage.js:959`: `LOCKER_ITEMS...i.name === fav` compares the shop item name to `preferredMap` (a skin key). The
  shop names are now the new titles, so a saved favourite no longer unlocks its map. Match through the skin instead
  (find the skin whose `name === fav` or `title === fav`, then the item whose `skinId` equals that skin's id).
  Failing today: `tests/unit/maps.test.js` "someone who already had an outdoor map as their favorite keeps it".
- `js/audio.js` (SKIN_MUSIC keys + comments, lines ~97-400), `js/game/secrets.js:20-43` (secret names such as "a squeaky
  pill bottle", "a bone with a secret", "a surgical star", "a cheeky neuron"), `js/game/sidemotion.js:43-58` (shapes
  'heart', 'plus', 'capsule', colours) still carry medical flavour; keys must stay.
- `js/game/clipnames.js`: not touched (animation clip names only).
- `public/models/**`: kept as is. The leftover medical GLBs (`medical/*`, `props/heart|firstaid|bone|skull`,
  `obstacles/bed`) are no longer used by obstacles, rooms or floating props (only `props/bone` and `props/skull` remain
  as the giant sugar skull on the Calavera Fiesta side scenery, and `characters/doctor|nurse|paramedic` are other agents'
  cast assets). Deleting them needs `SCENERY_FILES` (scenery.js) and `tests/unit/scenery.test.js` to change together; I
  left them to stay safe.
- Test infrastructure: `tests/unit/setup.js` imported `./lang/data/es.js` (another agent's in-progress data) and failed to
  load while I worked, so I verified with a copy of the setup that skips `loadCards()`. With that file in place the
  normal `npx vitest run` setup works again.

## Free Great Library rooms (js/game/hospitalhall.js, skins.js colours)

| key | title | what it is now |
|---|---|---|
| Hospital Hallway | Library Hall | parchment and wood palette; arched wood doors, floor-to-ceiling bookcases, book carts, globes, a lectern with an open book, reading table with an atlas, brass "open book" sign, green hanging library sign |
| Operating Room | Translators Booth | cool blue glass booths with desk, mic and headset; headset pigeonholes; wall screen with a sound wave; "ON AIR" glass door; pendant booth lamps |
| Research Lab | Codebreakers Lab | warm stone palette; benches with stone tablets, scrolls, ink pots and quills; a Rosetta-style three-script stone; giant cipher wheels; bubbling inkwell; hanging scroll banners |
| Ambulance Bay | Midnight Platform | dark night platform; train carriage doors, a DEPARTURES board, benches, suitcase pile, rubber duck on night duty, station clock, green signal lamp |

Removed: gurneys, IV stands, wheelchairs, doctor models, wet-floor sign model, red crosses, OR lamps/scrub sink, heartbeat
monitor, lab flasks/microscope/periodic table/fume hood, ambulance. `isHospitalHall` and `wallType` ids are unchanged.

## World maps (title: scene; the main changes)

- Verona Balcony Carnival (cardiac): hearts kept (love, not medicine); the heartbeat line is now a ribbon of "I love you" in 8
  languages, the ECG screen is scrolling love letters, signs TI AMO / BALCONY HOUSE / SERENADE! / ROSE BALCONIES.
- Shanghai Night Highway (neural): brain-fold wall is a lit skyline; neuron becomes a big smiling lantern with a string of
  lanterns (NI HAO!), synapse station is RELAY, brain lobes are four dim-sum steamers (DIM SUM BAR) with a bun in
  sunglasses, brain rider is a lantern in sunglasses, EEG ceiling trace is a ribbon of light.
- Monsoon Slide Park (vascular): blood cells are pool floats, white blood cell is a rain-poncho lifeguard (RAIN GUARD),
  O2 EXPRESS to SPLASH EXPRESS, CLOT CONES to SHAVED ICE, raindrops on the walls.
- Seoul Neon Alley (neoner): triage counter is a 24H MINI MART, gurney+heart monitor+IV pole is a RAMEN cart under a
  scrolling neon menu, ambulance nose is a yellow TAXI with checker band, bed race is a CART RACE.
- Milan Opera House (theater): scrubs are opera-goers (LA SCALA BOX, BRAVO!), GOLDEN SCALPEL is GOLDEN QUILL.
- Sweet Shop of Words (candylab): SUGAR RUSH is WORD JARS; header re-themed.
- Algarve Sunset (sunset): Rx signs are FARO / SURF SHOP / GELADOS, pill-bottle and capsule wording removed.
- Calavera Fiesta (skeletal): friendly skeleton party kept; DJ CALAVERA, DULCES!, FOTO!, MARIMBA, marigold wording.
- Taipei Bubble Tea Plaza (cellular): nucleus is a giant boba cup with pearls and a fat straw (BOBA HQ), mitochondria are
  PEARL POWER bouncy castles, golgi is a PANCAKE GRILL, ER coaster is a BOBA COASTER, wall has pearls and straws.
- Rosetta Hall (dna): base pairs are letters A / あ / Я / 한 (blocks, claw, slide, pretzels: LETTER BLOCKS, WORD CLAW,
  SPIRAL SLIDE, PRETZEL LETTERS).
- Berlin Disco Cellar (xray): x-ray films are lit posters (vinyl record, HALLO bubble, music note and heart), light boxes
  are POSTER WALL, KELLER DISCO, LASER LANES, FOTO! booth with coat rack, VOLUME: MAX, waving white gloves, side models are
  stage spotlights and chandeliers (no skulls).
- Warsaw Spark Park (defib): CLEAR! is SPARK!, paddles are spark plates, 200 J is MAX!, charge-o-meter.
- Stroopwafel Factory (pharmacy): pills and capsules are stroopwafels (wall, belt riders, flags), syrup jars, STROOP sign.
- Lullaby Clouds (nursery): crib is a giant music box with floating notes.
- Vienna Prater Fair (amusement): heart signs and wheel hub are stars, drop-tower spiral.
- Bavarian Farmyard (farm): the green-cross clinic tent is a blue-and-white diamond milk stand with churns and cheese wheels.
- Paris Rooftop (rooftop): helipad is a round flower bed; helicopters are airships.
- Tokyo Night Market (cafeteria): paper lanterns (caps) hang across the street; header re-themed.
- Kyoto Tea Garden (garden): parallel bars are a red tea-house gate with stepping stones.
- Aquarium of Tongues (aquarium): MRI scanner screen is chattering speech bubbles.
- Festival of Seasons (holiday), Alphabet Playroom (playland): headers only (already on theme).

## Obstacles (js/game/obstacles.js; ids kept so saved/shared challenge plans still resolve)

Jump (orange arrow): `gurney` luggage trolley, `wet_floor_sign` yellow "mind the gap" A-frame, `crate` market crate of
oranges, `spilled_supplies` spilled market crates and oranges, `fallen_stretcher` toppled bicycle, `medical_waste_bin`
kick scooter, `orderly_gurney` porter (explorer/scout/adventurer models) pushing a luggage trolley.
Slide (blue arrow): `hanging_traffic_light` customs gate (stamped header, green/red lamps), `hanging_chandelier` metro tunnel
(tiled arch, roundel, rails), `hanging_sign` festival bunting, `hanging_spotlight` overhead baggage scanner.
Old aliases (`wheelchair`, `or_doors`, `mri_tunnel`, `caution_tape`, `xray_arm`) still resolve. Coins now carry a compass-rose
star instead of a cross. The 3D GLB models for `bed`, `cone`, `barrier`, `bin` are no longer used by obstacles
(trolley, sign, bicycle and scooter are always the procedural versions); `crate`, `boxes` and the four hanging models are
kept. Bounds, jump/slide semantics and fairness tests are unchanged.

## Other files

- `homefx.js`: flying menu objects are now passports, suitcases, speech bubbles, paper planes, globes, letters, postcards,
  a lantern, a tower, and glyphs A あ Я ع 한 ñ ß 字 अ é. Reduced-motion and pause behaviour untouched.
- `exammonster.js` (the Hush): "EXAM" back brand is "SHHH", the mortarboard is a droopy nightcap; question marks stay.
  Identifiers and exports unchanged.
- `props.js`: replaced the 18 medical floating props with 16 travel/language props (suitcase, passport, globe, signpost,
  lighthouse, hot-air balloon, compass, postcard, speech bubble, letter blocks, book stack, paper plane, lantern, flag
  string, teacup, bread basket). `SPECIALTY_PROPS` is keyed by the 15 Language Dash topics; same exports.
- `themes.js`: the 15 colour themes are re-keyed by the 15 topics (same colours).
- `scenery.js`: `PROP_KEYS` no longer includes heart/firstaid/bone/skull; side scenery for the Berlin Disco Cellar uses
  spotlights and chandeliers.
- `homecharacter.js`: gesture constants renamed (phrasebook, point-at-map, cup-ear); header re-themed; floating props are
  the new travel props.
- `hazards.js`: "Neural blackout!" is now "Lights out!". `cinematics.js`, `atmosphere.js`, `worlds.js`, `mapkit.js`,
  `mapunlocks.js`, `skinbuilders.js` (comments of legacy styles): wording only.
- Tests updated: `maps.test.js` (shop name vs `skin.title`; wording), `scenery.test.js` (obstacle models that still
  exist), `obstaclefairness.test.js`, `homefx.test.js`, `hospitalhall.test.js` (describe text).

## Verification

- Owned tests (maps, worldmaps, obstaclefairness, homefx, scenerytrim, glbmodel, cinematics, mapsequence, trailpreview,
  hospitalhall, scenery, atmosphere) plus extras, scroll, mapmusic and noticks: all green except the storage.js item
  above (`maps.test.js` favourite test).
- A throwaway smoke test (deleted) built every skin with a fake canvas context and every obstacle variant and prop.
- `npx vite build` succeeds.
- Not verified visually in a browser (no screenshots taken); new scenery is built from the same mapkit primitives and stays
  clear of the lanes (`keepLanesClear` and the hospitalhall lane test).
