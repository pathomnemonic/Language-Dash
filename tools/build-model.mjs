// tools/build-model.mjs
// Prepares one third-party animated model for the game (heroes and Hush monsters):
//   - reads .glb or .gltf, drops KHR_materials_unlit (the game prints its own cel-shaded look),
//   - drops animation clips the game never plays, resamples keyframes,
//   - shrinks textures to <= 512px, then compresses meshes with EXT_meshopt_compression.
//
//   node tools/build-model.mjs <source.glb|gltf> <dest.glb> [--keep Clip1,Clip2] [--tex 512] [--scale 1]
//
// FBX sources are first converted with tools/fbx-to-glb.mjs.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRMaterialsUnlit } from '@gltf-transform/extensions';
import { dedup, prune, quantize, meshopt, resample, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { statSync } from 'node:fs';
import { resolveClipName } from '../js/game/clipnames.js';

const argv = process.argv.slice(2);
const opt = (name, d) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : d; };
const [src, dest] = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
if (!src || !dest) { console.error('usage: node tools/build-model.mjs <src> <dest.glb> [--keep a,b] [--tex 512]'); process.exit(1); }
const texMax = Number(opt('tex', 512));
const keepList = opt('keep', '') ? opt('keep', '').split(',') : null;

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(src);
const root = doc.getRoot();

for (const ext of root.listExtensionsUsed()) if (ext instanceof KHRMaterialsUnlit) ext.dispose();

const names = root.listAnimations().map((a) => a.getName());
const keep = new Set(keepList || []);
if (!keepList) {
  for (const state of ['run', 'jump', 'slide', 'celebrate', 'death', 'idle', 'wave', 'attack']) {
    const found = resolveClipName(names, state);
    if (found) keep.add(found.clip);
  }
}
let dropped = 0;
for (const anim of root.listAnimations()) if (!keep.has(anim.getName())) { anim.dispose(); dropped++; }

await doc.transform(
  resample(), dedup({ keepUniqueNames: true }), prune(),
  textureCompress({ encoder: sharp, resize: [texMax, texMax] }),
  quantize(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' })
);
for (const accessor of root.listAccessors()) {
  if (accessor.listParents().every((p) => p.propertyType === 'Root' || p.propertyType === 'Buffer')) accessor.dispose();
}
await io.write(dest, doc);
console.log(`${dest}: ${Math.round(statSync(dest).size / 1024)} KB, clips [${[...keep].join(', ')}], dropped ${dropped}`);
