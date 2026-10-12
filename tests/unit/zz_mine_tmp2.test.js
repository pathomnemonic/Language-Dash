import { it } from 'vitest';
import * as THREE from 'three';
import { SKINS } from '../../js/game/skins.js';
import { buildWorldBay, buildWorldArch } from '../../js/game/worlds.js';
function tr(root) { let t = 0, c = 0; root.traverse((o) => { if (!o.isMesh) return; c++; const g = o.geometry; t += ((g.index ? g.index.count : g.attributes.position.count) / 3); }); return [c, Math.round(t)]; }
it('bay counts', () => {
  const n = process.env.MAP || 'Vascular Rush';
  const skin = SKINS.find((s) => s.name === n);
  for (let k = 0; k < 4; k++) console.log('BAY', n, k, 'L', tr(buildWorldBay(skin, -1, -4 * k)).join('/'), 'R', tr(buildWorldBay(skin, 1, -4 * k)).join('/'));
  console.log('BAY arch', tr(buildWorldArch(skin, -44)).join('/'));
});
