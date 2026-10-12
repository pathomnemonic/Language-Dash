// tools/fbx-to-glb.mjs
// Converts a rigged, animated FBX (Quaternius packs on OpenGameArt ship FBX/OBJ/Blend only) into a GLB, using three's
// FBXLoader + GLTFExporter under Node. Optional texture: attached to every material after export.
//
//   node tools/fbx-to-glb.mjs <in.fbx> <out.glb> [texture.png]
import fs from 'node:fs';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { NodeIO } from '@gltf-transform/core';

const [src, dest, tex] = process.argv.slice(2);
if (!src || !dest) { console.error('usage: node tools/fbx-to-glb.mjs <in.fbx> <out.glb> [texture.png]'); process.exit(1); }

globalThis.FileReader = class { readAsArrayBuffer(b) { b.arrayBuffer().then((r) => { this.result = r; this.onloadend && this.onloadend(); }); } readAsDataURL(b) { b.arrayBuffer().then((r) => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); this.onloadend && this.onloadend(); }); } };
globalThis.document = { createElementNS: () => ({ style: {}, addEventListener() {}, removeEventListener() {}, set src(v) {}, width: 1, height: 1 }) };

const buf = fs.readFileSync(src);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const obj = new FBXLoader().parse(ab, '');
// textures can't load in Node: drop the map references (the pack's colors live in the materials or the one texture)
obj.traverse((o) => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.map = null; }); } });
const clips = obj.animations || [];
const out = await new GLTFExporter().parseAsync(obj, { binary: true, animations: clips, onlyVisible: false });
fs.writeFileSync(dest, Buffer.from(out));
if (tex) {
  const io = new NodeIO();
  const doc = await io.read(dest);
  const t = doc.createTexture('base').setImage(new Uint8Array(fs.readFileSync(tex))).setMimeType('image/png');
  for (const m of doc.getRoot().listMaterials()) m.setBaseColorTexture(t).setBaseColorFactor([1, 1, 1, 1]);
  await io.write(dest, doc);
}
console.log('wrote', dest, fs.statSync(dest).size, 'clips:', clips.map((c) => c.name).join(','));
