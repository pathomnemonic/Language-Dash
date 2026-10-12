import { it } from 'vitest';
import * as THREE from 'three';
import { SKINS } from '../../js/game/skins.js';
import { buildTrack } from '../../js/game/track.js';
const names = (process.env.STAT_SKINS || 'Skeletal Corridor,Cellular Matrix,DNA Helix Tunnel').split(',');
it('stats', () => {
  names.forEach((n) => {
    const skin = SKINS.find((s) => s.name === n);
    const root = new THREE.Scene();
    const refs = buildTrack(root, skin, { quality: 'medium' });
    let calls = 0, tris = 0;
    root.traverse((o) => { if (!o.isMesh) return; calls++; const g = o.geometry; tris += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1); });
    console.log('STAT', n, 'calls', calls, 'tris', Math.round(tris), 'anim', refs.animators.length);
    refs.dispose();
  });
}, 120000);
