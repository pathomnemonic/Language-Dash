// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { LOCKER_ITEMS } from '../../js/game/shopdata.js';
import { HAT_IDS, GEAR_IDS, CLOTHING_IDS, buildHat, buildGear, buildClothing, gearSlot } from '../../js/game/cosmetics.js';
import { PALS } from '../../js/companions.js';
import { palSvg, palArtIds } from '../../js/palart.js';

const of = (type) => LOCKER_ITEMS.filter((i) => i.type === type && i.price > 0);

describe('hats, gear and clothing are drawn, one design each', () => {
  it('every item for sale has a model, and every model is for sale', () => {
    expect(of('hat').map((i) => i.id).sort()).toEqual([...HAT_IDS].sort());
    expect(of('gear').map((i) => i.id).sort()).toEqual([...GEAR_IDS].sort());
    expect(of('clothing').map((i) => i.id).sort()).toEqual([...CLOTHING_IDS].sort());
  });

  it('each one builds real, non-empty geometry, and no two look alike', () => {
    const sigs = new Set();
    const items = [...of('hat').map((i) => [buildHat, i]), ...of('gear').map((i) => [buildGear, i]), ...of('clothing').map((i) => [buildClothing, i])];
    items.forEach(([build, i]) => {
      const g = build(i.id, i.color, 1);
      expect(g, i.id).toBeTruthy();
      let verts = 0;
      g.traverse((o) => { if (o.isMesh) verts += o.geometry.attributes.position.count; });
      expect(verts, i.id).toBeGreaterThan(100);
      const box = new THREE.Box3().setFromObject(g);
      expect(box.isEmpty(), i.id).toBe(false);
      sigs.add(verts + ':' + box.getSize(new THREE.Vector3()).toArray().map((n) => n.toFixed(2)).join(','));
    });
    expect(sigs.size).toBe(items.length);
    expect(buildHat('hat_none', null)).toBeNull();
  });

  it('gear knows where it rides', () => {
    GEAR_IDS.forEach((id) => expect(['chest', 'hip']).toContain(gearSlot(id)));
  });

  it('nothing in the shop is medical', () => {
    const text = of('hat').concat(of('gear'), of('clothing')).map((i) => i.name + ' ' + i.desc).join(' ');
    expect(text).not.toMatch(/stethoscope|syringe|scrubs|lab coat|surgical|patient|doctor|nurse|medic|\bpills?\b/i);
  });
});

describe('every pal has a drawing of its own', () => {
  it('draws each pal as a distinct svg', () => {
    expect(palArtIds().sort()).toEqual(PALS.map((p) => p.id).sort());
    const all = PALS.map((p) => palSvg(p.id));
    all.forEach((s) => expect(s).toMatch(/^<svg[\s\S]*<\/svg>$/));
    expect(new Set(all).size).toBe(all.length);
    expect(palSvg('nope')).toBe('');
  });
});
