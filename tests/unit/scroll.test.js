import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildTrack, updateScrollers } from '../../js/game/track.js';
import { SKINS } from '../../js/game/skins.js';

// Walls and arches were built once and never moved, so the corridor looked
// frozen while the player "ran". They now scroll by wrapping a repeating group.
describe('scrolling corridor', () => {
  it('moves walls and arches forward and wraps seamlessly', () => {
    const root = new THREE.Group();
    const refs = buildTrack(root, SKINS[0], { quality: 'low', reducedMotion: true });
    expect(refs.scrollers.length).toBeGreaterThanOrEqual(2); // walls, arches, then the merged decorations

    const wall = refs.scrollers[0];
    const start = wall.group.position.z;
    updateScrollers(refs.scrollers, 1);
    expect(wall.group.position.z).toBeCloseTo(start + 1);

    // A long run never drifts more than one period from the origin.
    for (let i = 0; i < 500; i++) updateScrollers(refs.scrollers, 0.37);
    refs.scrollers.forEach((s) => {
      expect(Math.abs(s.group.position.z)).toBeLessThan(s.spacing);
    });
  });

  it('keeps the far end covered while scrolling (no gap ahead of the player)', () => {
    const root = new THREE.Group();
    const skin = SKINS.find((s) => s.name === 'Operating Room');
    const refs = buildTrack(root, skin, { quality: 'low', reducedMotion: true });
    const wall = refs.scrollers[0];
    updateScrollers(refs.scrollers, wall.spacing * 0.99);
    let farthest = 0;
    wall.group.children.forEach((seg) => {
      const box = new THREE.Box3().setFromObject(seg);
      farthest = Math.min(farthest, box.min.z);
    });
    // The walls reach past the haze (the map's fog far distance), so the far end is never visible as a gap.
    expect(farthest + wall.group.position.z).toBeLessThan(-skin.fog.far);
  });
});
