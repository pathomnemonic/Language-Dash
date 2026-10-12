import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { existsSync } from 'node:fs';
import { AVATARS, SHOP_ITEMS } from '../../js/game/shopdata.js';
import { CHARACTER_MODELS, RETIRED_CHARACTERS, getCharacterParts } from '../../js/game/modelcatalog.js';
import { addHairStyle } from '../../js/game/player.js';
import { findClipName } from '../../js/game/clipnames.js';

describe('the hero roster: new free models, one starter, no leftovers from the old game', () => {
  it('the starter is the fox, it is free, and every other hero costs coins or money', () => {
    const fox = AVATARS.find((a) => a.id === 'avatar_intern');
    expect(fox.name).toBe('Fika Fox');
    expect(fox.isModel).toBe(true);
    expect(fox.price).toBe(0);
    CHARACTER_MODELS.filter((m) => m.id !== 'avatar_intern').forEach((m) => {
      expect(m.price, m.name).toBeGreaterThan(0);
      expect(SHOP_ITEMS.some((i) => i.id === m.id), m.id).toBe(true);
      expect(existsSync('public/models/' + m.file), m.file).toBe(true);
    });
  });

  it('is a mix of animals and people, with a backstory voice that is never medical', () => {
    const text = CHARACTER_MODELS.map((m) => m.name + ' ' + m.desc).join(' ');
    expect(text).not.toMatch(/doctor|nurse|medic|surgeon|patient|hospital|exam|intern\b/i);
    expect(CHARACTER_MODELS.filter((m) => /heroes\/(fox|llama|zebra|pug|cow|sheep|horse|pig)\./.test(m.file)).length).toBe(8);
    expect(CHARACTER_MODELS.filter((m) => /heroes\/(dummy|professor|vest|ranger|kimono|pirate)\./.test(m.file)).length).toBe(6);
  });

  it('the retired-character table is empty: no saves from the old roster exist', () => {
    expect(Object.keys(RETIRED_CHARACTERS)).toEqual([]);
    expect(getCharacterParts('avatar_m_gone')).toEqual([]);
  });

  it('the Scout\'s animation clip names are understood by the game', () => {
    const clips = ['Running_A', 'Jump_Full_Short', 'Dodge_Forward', 'Cheer', 'Death_A', 'Idle'];
    expect(findClipName(clips, 'run')).toBe('Running_A');
    expect(findClipName(clips, 'jump')).toBe('Jump_Full_Short');
    // Dodge_Forward is a 0.4 second forward flip: looped for a whole slide it looked frantic, so the Scout has no slide
    // clip and ducks the way the models without one do (a held crouch while she keeps running)
    expect(findClipName(clips, 'slide')).toBeNull();
    expect(findClipName(clips, 'death')).toBe('Death_A');
    expect(findClipName(clips, 'idle')).toBe('Idle');
    expect(findClipName(clips, 'celebrate')).toBe('Cheer');
  });

  it('hairstyles still work for the Classic characters that use them', () => {
    ['ponytail', 'bun', 'bob', 'long', 'braids', 'puffs'].forEach((style) => {
      const g = new THREE.Group();
      addHairStyle(g, { hairStyle: style, hairColor: 0x222222 }, 0.38, 1);
      expect(g.children.length, style).toBeGreaterThan(0);
    });
  });
});
