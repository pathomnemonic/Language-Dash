// tools/build-heroes.mjs
// Rebuilds every hero and Hush model in public/models from the downloaded source packs (see public/models/CREDITS.md
// for the packs, authors, licenses and URLs). Source files live outside the repo, in SRC (default /home/user/src):
//   kenney-blocky/   kenney_blocky-characters_20.zip            https://kenney.nl/assets/blocky-characters (CC0)
//   Starter-Kit-3D-Platformer/                                 https://github.com/KenneyNL/Starter-Kit-3D-Platformer (CC0)
//   khr/Models/Fox                                             https://github.com/KhronosGroup/glTF-Sample-Assets (CC0 model, CC-BY 4.0 rig)
//   dl/animals/*.gltf                                          Quaternius "Farm Animals" (CC0) as shipped in three.js manual resources
//   out/{cute,monsters}/*.glb                                  Quaternius cute / animated monsters (CC0) FBX from opengameart.org,
//                                                              converted with tools/fbx-to-glb.mjs
//
//   node tools/build-heroes.mjs
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const SRC = process.env.SRC || '/home/user/src';
const BL = `${SRC}/kenney-blocky/Models/GLB format`;
const FARM = `${SRC}/dl/animals`;
const jobs = [
  [`${SRC}/khr/Models/Fox/glTF-Binary/Fox.glb`, 'heroes/fox.glb', ['--keep', 'Survey,Run']],
  [`${FARM}/Llama.gltf`, 'heroes/llama.glb'],
  [`${FARM}/Zebra.gltf`, 'heroes/zebra.glb'],
  [`${FARM}/Pug.gltf`, 'heroes/pug.glb'],
  [`${FARM}/Cow.gltf`, 'heroes/cow.glb'],
  [`${FARM}/Sheep.gltf`, 'heroes/sheep.glb'],
  [`${FARM}/Horse.gltf`, 'heroes/horse.glb', ['--rename', 'Material.003=Coat,Material.006=Mane']],
  [`${FARM}/Pig.gltf`, 'heroes/pig.glb', ['--rename', 'Material.003=Hide,Material=Hooves']],
  [`${SRC}/Starter-Kit-3D-Platformer/models/character.glb`, 'heroes/beep.glb'],
  [`${BL}/character-c.glb`, 'heroes/gamer.glb'],
  [`${BL}/character-p.glb`, 'heroes/pirate.glb'],
  [`${BL}/character-n.glb`, 'heroes/kimono.glb'],
  [`${BL}/character-i.glb`, 'heroes/professor.glb'],
  [`${BL}/character-m.glb`, 'heroes/ranger.glb'],
  [`${BL}/character-d.glb`, 'heroes/dummy.glb'],
  [`${BL}/character-e.glb`, 'heroes/vest.glb'],
  [`${SRC}/out/monsters/Slime.glb`, 'hush/blot.glb'],
  [`${SRC}/out/monsters/Bat.glb`, 'hush/flutter.glb'],
  [`${SRC}/out/cute/Cthulhu.glb`, 'hush/murmur.glb'],
  [`${SRC}/out/cute/Cyclops.glb`, 'hush/stare.glb'],
  [`${SRC}/out/cute/Cactus.glb`, 'hush/prickle.glb'],
  [`${SRC}/out/cute/Crab.glb`, 'hush/snap.glb'],
  [`${SRC}/out/cute/Bee.glb`, 'hush/drone.glb'],
  [`${SRC}/out/cute/Tree.glb`, 'hush/gnarl.glb']
];
mkdirSync('public/models/heroes', { recursive: true });
mkdirSync('public/models/hush', { recursive: true });
for (const [src, dest, extra = []] of jobs) {
  const r = spawnSync('node', ['tools/build-model.mjs', src, 'public/models/' + dest, ...extra], { stdio: ['ignore', 'pipe', 'inherit'] });
  const out = String(r.stdout).split('\n').filter((l) => l.includes(' KB')).join('');
  console.log(r.status === 0 ? out : 'FAILED ' + dest);
}
