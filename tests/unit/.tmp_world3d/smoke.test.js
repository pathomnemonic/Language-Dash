import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
const ctxProxy = () => new Proxy(function () {}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : ctxProxy()), apply: () => ctxProxy(), set: () => true });
HTMLCanvasElement.prototype.getContext = function () { return ctxProxy(); };
import { SKINS } from '../../../js/game/skins.js';
import { buildTrack } from '../../../js/game/track.js';
describe('smoke', () => {
  SKINS.forEach((skin) => {
    it(skin.name, () => {
      const root = new THREE.Group();
      const refs = buildTrack(root, skin, { quality: 'high', reducedMotion: false });
      expect(refs).toBeTruthy();
      let n = 0; root.traverse(() => n++);
      expect(n).toBeGreaterThan(50);
    });
  });
});
