# Heroes and Hush report

The Locker's heroes (shop type `skin`) and Hush monsters (`monster`) are entirely new 3D models. The 20 characters and
6 monsters of the old game are deleted (`public/models/characters`, `monsters`, and the unused `medical`).

## Sources and licenses
Full per-file table: `public/models/CREDITS.md` (also in the README and the in-app Settings credits).

| Pack | Author | License | Used for | Downloaded from |
|---|---|---|---|---|
| Blocky Characters 2.0 | Kenney | CC0 | 6 people heroes, plus the trolley pusher | kenney.nl/assets/blocky-characters (zip) |
| Starter Kit 3D Platformer | Kenney | CC0 | Pico Pocketbot | github KenneyNL/Starter-Kit-3D-Platformer |
| Farm Animals | Quaternius | CC0 | Llama, Zebra, Pug, Cow, Sheep, Horse, Pig | opengameart.org (FBX); glTF copies via three.js manual resources |
| Fox | PixelMannen (model, CC0), tomkranis (rig, CC-BY 4.0), @AsoboStudio and @scurest (glTF, CC-BY 4.0) | CC0 + **CC-BY 4.0** | Fika Fox (the free starter) | github KhronosGroup/glTF-Sample-Assets |
| Animated Monster Pack | Quaternius | CC0 | The Blot (Slime), The Flutter (Bat) | opengameart.org (FBX) |
| Cute Animated Monsters (Aug 2020) | Quaternius | CC0 | Murmur, Stare, Prickle, Snap, Drone, Gnarl | opengameart.org (FBX) |

All downloaded, none procedural. Checked and not used: mirada's Flamingo, Parrot, Stork and Horse (no license file), Mixamo characters
(redistribution not allowed), Quaternius Animal Pack Vol 2 (wolf, cat, dog, eagle: converted but plain grey, dropped).
Google Drive (Quaternius's own download links) was over quota, which is why OpenGameArt and GitHub were used.

## Roster
15 heroes (8 animals, 6 people, 1 gadget; the free starter keeps the stable id `avatar_intern` that saves, the leaderboard and the
database know, and is now Fika Fox) and 8 monsters (new ids `hush_*`; the free one is `hush_blot`, set as the default in storage.js).
Other ids are `hero_*`. Names, backstories (js/stories.js), voices (charactervoices.js), prices, icons, parts and palettes are in
`js/game/modelcatalog.js`. Premium (real-money) items moved to `hero_beep`, `hero_zebra`, `hero_horse`, `hero_pirate`, `hero_kimono`
and `hush_murmur` (`supabase/functions/_shared/premium.js`, docs/PRO.md table, store listing).

## Pipeline
- `tools/fbx-to-glb.mjs`: FBX (rigged, animated) to GLB with three's FBXLoader and GLTFExporter.
- `tools/build-model.mjs`: unlit stripped, normals generated (the glTF Fox has none: it rendered solid black), unused clips dropped,
  textures to 512px, meshopt compression. `tools/build-heroes.mjs` rebuilds all 24 files from the sources (default dir /home/user/src).
- Heroes total about 2.0 MB, monsters 2.3 MB; every file is under 400 KB.
- Animation: people use `sprint`/`idle`/`die`/`emote-yes` (no skeleton: node animation, so `charactermodel.js` now draws the ink
  outline on rigid meshes too); the farm animals have only `Walk`, played faster (`HERO_RUN_SCALE`) and hop (`Jump`) to celebrate
  (`HERO_CELEBRATE`); the fox runs with `Run` and celebrates with `Survey`. Pico has walk/jump/idle; no hero has a slide clip, so
  they duck the way clip-less models already did.
- Portraits regenerated with `tools/make-portraits.mjs` (animals three-quarter view, head crops per hero in `tools/portraits-page.js`).

## Checked in a browser (Playwright, quality "high")
Locker preview (kimono), in-run runner for all 15 heroes (screens viewed), the Blot, Murmur, Stare and Flutter during the catch lunge.
Wide monsters were scaled down (`scale` in the catalog) after the Blot covered the whole screen.

## Leftovers and notes
- Hero recoloring: single-texture models take one "wash" tint (light palette); animals recolor their real materials.
- Monsters are dark (the Cute Monsters textures are); they only appear on screen for the lunge, as the engine always did.
- `public/models/kaykit`, `obstacles`, `props` are scenery from other packs, kept; `scenery.js` `med_*` entries were removed.
- Old save migrations in storage.js (scrub color to `avatar_intern` pants) are harmless leftovers.
- At the end `npx vitest run` (one gatefixes test flickered while another agent was editing scenery), `npm run lint` and `npm run typecheck` pass.
