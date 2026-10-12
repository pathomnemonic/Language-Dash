# Model credits

Every hero and Hush monster in Language Dash is a free download. Nothing from the earlier game (Dx Dash) is left in
`heroes/` or `hush/`. Files were shrunk (clips the game never plays dropped, textures cut to 512px, meshopt
compression) with `tools/build-model.mjs`; `tools/build-heroes.mjs` lists every source file. FBX sources from
OpenGameArt were first converted with `tools/fbx-to-glb.mjs`.

## Heroes (`heroes/`)

| File | Hero | Author | License | Source |
| --- | --- | --- | --- | --- |
| fox.glb | Fika Fox | Fox model by PixelMannen (CC0), rigging and animation by tomkranis (CC-BY 4.0); glTF conversion by @AsoboStudio and @scurest (CC-BY 4.0) | CC0 1.0 (model) + **CC-BY 4.0 (rig, animation, conversion: credit required)** | https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox |
| llama.glb, zebra.glb, pug.glb, cow.glb, sheep.glb, horse.glb, pig.glb | Lola Llama, Zola Zebra-Crossing, Percy Pug, Clara Cowbell, Merino Mateo, Sagaan the Steppe Horse, Truffle Tonio | Quaternius, "Farm Animals" pack | CC0 1.0 | https://opengameart.org/content/lowpoly-animated-farm-animal-pack and https://quaternius.com/packs/farmanimal.html (glTF copies as shipped in the three.js manual resources) |
| dummy.glb, professor.glb, vest.glb, ranger.glb, kimono.glb, pirate.glb (gamer.glb is a trolley pusher in the run) | Crash-Test Kuba, Nonno Nico, Viennese Vera, Ranger Ravi, Kaede of Kyoto, Port-Side Nuno | Kenney (www.kenney.nl), "Blocky Characters 2.0" (characters d, i, e, m, n, p, c) | CC0 1.0 | https://kenney.nl/assets/blocky-characters |
| beep.glb | Pico Pocketbot | Kenney, "Starter Kit 3D Platformer" character | CC0 1.0 | https://github.com/KenneyNL/Starter-Kit-3D-Platformer |

## Hush monsters (`hush/`)

| File | Monster | Author | License | Source |
| --- | --- | --- | --- | --- |
| blot.glb (Slime), flutter.glb (Bat) | The Blot, The Flutter | Quaternius, "Animated Monster Pack" | CC0 1.0 | https://opengameart.org/content/lowpoly-animated-monsters |
| murmur.glb (Cthulhu), stare.glb (Cyclops), prickle.glb (Cactus), snap.glb (Crab), drone.glb (Bee), gnarl.glb (Tree) | The Murmur, The Stare, The Prickle, The Snap, The Drone, The Gnarl | Quaternius, "Cute Animated Monsters" (Aug 2020) | CC0 1.0 | https://opengameart.org/content/textured-cute-monster-pack |

CC0 needs no credit; we credit Kenney and Quaternius anyway. The Fox rigging is CC-BY 4.0 (https://creativecommons.org/licenses/by/4.0/):
credit "Fox: model PixelMannen (CC0); rigging and animation tomkranis, glTF conversion @AsoboStudio and @scurest (CC-BY 4.0); via Khronos glTF-Sample-Assets".

Not used, because the license could not be verified: the mirada animals (Flamingo, Parrot, Stork, Horse) in the three.js examples,
and anything from Mixamo (Soldier, Xbot, Michelle).

## Other models still in `public/models`

`obstacles/`, `props/` and `kaykit/` are scenery, credited in the README (Quaternius, Kenney, KayKit; CC0 unless noted there).

## Cosmetics

Hats, gear, clothing, trails and pals are all original work for this project; nothing was downloaded.

- Hats, gear and clothing (`js/game/cosmetics.js`): procedural three.js geometry (lathes, cylinders, spheres, boxes), flat-toon material and ink outline, built in code. No model files.
- Trails (`js/game/trailshapes.js`): procedural flat shapes; the speech-bubble letters (A, あ, Я, ع, 한) are drawn at run time on a canvas with the system fonts. No files.
- Pals (`js/palart.js`): hand-written inline SVG drawings. No files.
- Author: this project. License: same as the project (no third-party assets, so no attribution is required).
