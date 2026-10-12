# Cosmetics report

Hats, gear, clothing, trails and pals are new designs (new silhouette, geometry, colours, name, story), not the old
Dx Dash items renamed. Everything is procedural (no downloads); see the Cosmetics section of public/models/CREDITS.md.

## What changed in how they work
- **Hats, gear and clothing were unreachable** (the Locker had no tab for them; only the archived blocky runner could
  wear them). There is now a **Wardrobe** tab (Hats, Gear, Clothing) and every animated hero can wear them.
  `js/game/cosmetfit.js` measures each hero's head and torso (vertices weighted to the head / torso bones, or the meshes
  of plain-node rigs) so a hat sits on that head, scaled to its width, and gear/clothing are scaled and centred on the
  torso. Items ride on the head / chest / hip bone, so they crouch and bob with the runner. Works on the blocky humans,
  the fox and the quadrupeds (llama, pug, cow, sheep...); the preview turns the hero round to show back-worn gear.
- Geometry: `js/game/cosmetics.js` (lathes, cylinders, spheres, boxes, flat toon + ink outline). Attached by
  `attachCosmetics` in `js/game/player.js`.
- Trails: `js/game/trailshapes.js` (12 new flat shapes, a speech bubble with five lettered variants painted on a
  canvas) and `js/game/trails.js` (each trail has its own motion: gliding, fluttering, blinking, tumbling, thunk, splat,
  ground prints).
- Pals: `js/palart.js` holds 13 hand-drawn SVG pals; Home (`js/palui.js`) and the Locker draw them (emoji only as fallback).
  The Pals tab still needs `VITE_FEATURE_STUDY_BUDDIES` (shelved in `js/features.js`; unchanged).

## Old item -> new item
Trails (ids renamed; the three premium trails keep the premium slots)

| old | new |
|---|---|
| trail_ekg Sound Wave | trail_planes Paper Planes |
| trail_neural Idea Sparks (premium) | trail_fireflies Fireflies (premium) |
| trail_blood Rose Petals (premium) | trail_sakura Cherry Blossoms (premium) |
| trail_dna Twisting Ribbon | trail_streamers Party Streamers |
| trail_fire Fire Trail (premium) | trail_lanterns Sky Lanterns (premium) |
| trail_rainbow Rainbow | trail_glyphs Say-It Bubbles (speech bubbles: A あ Я ع 한) |
| trail_confetti Confetti | trail_stamps Passport Stamps |
| trail_hearts Hearts | trail_postcards Postcards |
| trail_lightning Lightning | trail_snow Snowflakes |
| trail_bubbles Bubbles | trail_footprints Sandy Footprints (left/right, on the ground) |
| trail_music Music Notes | trail_ink Ink Splatter |
| trail_pills Message Capsules | trail_leaves Maple Leaves |

Hats: Sailor Cap, Headlamp, Golden Crown, Halo, Viking Helmet, Party Hat, Chef Hat, Scholar Cap, Monocle, Bandana, Top Hat,
Beanie, Cowboy Hat, Tiara, Propeller Hat, Cat Ears, Sunglasses ->
Paper Boat Hat, Parisian Beret, Bucket Hat, Flat Cap, Tam o' Shanter, Gondolier's Boater, Panama Hat, Bowler Hat,
Rice-Field Hat, Marrakech Fez, Pith Helmet, Ushanka, Aviator Cap, Laurel Wreath, Chullo, Wide Sombrero (ids hat_paperboat,
hat_beret, hat_bucket, hat_flatcap, hat_tam, hat_boater, hat_panama, hat_bowler, hat_ricehat, hat_fez, hat_pith,
hat_ushanka, hat_aviator, hat_laurel, hat_chullo, hat_sombrero; 16 for sale + No Hat).

Gear: Headphones, Phrasebook, Fountain Pen, Megaphone, Gavel, Festival Mask, Espresso Cup, Pocket Dictionary, Guild Badge,
Angel Wings, Backpack, Shield, Silver Quill, Travel Radio, Souvenir Backpack ->
Airmail Satchel, Brass Compass, Binoculars, Map Tube, Pocket Camera, Travel Pillow, Furled Umbrella, Hand Lantern, Brass
Spyglass, Travelling Ukulele, Folding Fan, Street Accordion, Sticker Suitcase, Festival Kite, Pocket Globe (15).

Clothing: Traveller's Jacket, Trench Coat, Explorer's Cloak, Hawaiian Shirt, Tuxedo, Sports Jersey, Body Armor, Red Cape,
Rainbow Cape ->
Tartan Scarf, Linen Shirt, Denim Jacket, Rain Slicker, Tracksuit, Festival Happi, Alpine Vest, Expedition Parka, Striped
Poncho (9). Prices roughly follow the old price ladders (cheapest trail is still 300, which the tour and economy tests rely on).

Pals (default pal is now free Snail Mail, `pal_snail`): Maneki, Fetch, Lapin, Raposa, Mochi, Buho, Kaeru, Octo-Lingo, Long,
Polly Glot, Tortuga, Origami, Pocket Dictionary -> Snail Mail, Axo (axolotl), Baozi (dumpling), Llama Drama, Magpie, Kite,
Capy (capybara), Bonsai, Chai (teapot), Babushka (nesting doll), Montgolfier (hot-air balloon), Choo-Choo (mini train),
Inkling (ink blot with a quill).

Maps: names, descriptions and prices were already travel-themed and non-medical (docs/MAP-NAMES.md); left as they were.
Their ids / skin ids (e.g. map_neural_highway, skin_cardiac_pulse) are still the old internal keys, owned by worlds.js.

## References updated
shopdata.js, trails.js, trailshapes.js, companions.js, palui.js, palart.js, player.js, preview.js, storage.js (default pal),
uisettings.js (Wardrobe tab, pal drawings), css/screens.css + arcade.css + home.css, supabase/functions/_shared/premium.js,
docs/PRO.md and store/app-store/listing.md (premium product ids), and the tests that named old items (billing, premium,
paymentflow, edgefunctions, storeverify, iapverify, reconcile, refundeditems, prosql, dbprivileges, analyticssql, growth,
proui, deatheffects, savetorture, e2e premium, tools/smoke-webhook, companions, locker, trailshapes, modelhat, sanity,
achievements). New: tests/unit/cosmetics.test.js.

## Leftovers
- The Pals tab and Home buddy stay off unless the study-buddies flag is built in (shelved before this job).
- Maps keep their internal medical-sounding ids; only their player-facing text is clean.
- Quadruped heroes face away from the Locker camera (the heroes agent's orientation); hats/gear fit them, but gear worn
  "on the chest" sits toward the head end of the animal.
- The old blocky runner / vehicles are still archived; they use the same new cosmetics if `ARCHIVE_CLASSIC` is turned off.
- Failures in hero/monster roster tests (locker hero names, economy hero-vs-monster averages, heropicture, herocelebrate...)
  belong to the heroes agent's in-progress migration; `npm run lint` currently fails on two files of theirs
  (tests/unit/heroroster.test.js, tools/merge-extra.mjs).
