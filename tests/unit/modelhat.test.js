// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { storage } from '../../js/storage.js';
import { parseCharacterModel } from '../../js/game/charactermodel.js';
import { buildPlayer } from '../../js/game/player.js';
import { CHARACTER_MODELS } from '../../js/game/modelcatalog.js';

globalThis.self = globalThis;
globalThis.createImageBitmap = undefined;
globalThis.document = { createElementNS: () => ({ addEventListener(t, f) { if (t === 'load') setTimeout(f, 0); }, removeEventListener() {}, set src(v) {} }) };

describe('hats, gear and clothing on the animated heroes', () => {
  it('a hero wears the hat, gear and clothing that are equipped, on its own bones, and nothing when none is', async () => {
    storage.set('quality', 'high');
    const file = CHARACTER_MODELS.find((m) => m.id === 'avatar_intern').file;
    const url = '/models/' + file;
    const buf = readFileSync('public/models/' + file);
    await parseCharacterModel(url, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    const count = (pg) => { let n = 0; pg.traverse((o) => { if (o.isMesh) n++; }); return n; };

    const eq = storage.get('equipped');
    storage.set('equipped', { ...eq, skin: 'avatar_intern', hat: 'hat_beret', gear: 'gear_none', clothing: 'cloth_none' });
    const hatted = buildPlayer();
    expect(hatted.userData.isModel).toBe(true);
    storage.set('equipped', { ...eq, skin: 'avatar_intern', hat: 'hat_none', gear: 'gear_none', clothing: 'cloth_none' });
    const bare = buildPlayer();
    expect(count(hatted)).toBeGreaterThan(count(bare));
    let hat = null;
    hatted.traverse((o) => { if (o.name === 'hat_beret') hat = o; });
    expect(hat).not.toBeNull();
    expect(hat.parent).not.toBe(hatted); // it hangs on the head bone, so it moves with the hero

    storage.set('equipped', { ...eq, skin: 'avatar_intern', hat: 'hat_none', gear: 'gear_camera', clothing: 'cloth_scarf' });
    const dressed = buildPlayer();
    expect(count(dressed)).toBeGreaterThan(count(bare));
    expect(hatted instanceof THREE.Group).toBe(true);
  });
});
