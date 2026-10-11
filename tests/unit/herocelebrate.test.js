import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { HERO_CELEBRATE, HERO_RUN_SCALE, heroKeyFor, resolveClipName } from '../../js/game/clipnames.js';
import { CHARACTER_MODELS } from '../../js/game/modelcatalog.js';

function clipsOf(file) {
  const b = readFileSync('public/models/heroes/' + file + '.glb');
  const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
  return (json.animations || []).map((a) => a.name);
}

describe('each hero celebrates in its own way', () => {
  it('finds the model file from a catalog path', () => {
    expect(heroKeyFor('heroes/fox.glb')).toBe('fox');
    expect(heroKeyFor('/base/models/heroes/Llama.glb?v=2')).toBe('llama');
    expect(heroKeyFor('')).toBe('');
  });

  it('every signature and run speed belongs to a real hero, and the signature finds a real clip in its model', () => {
    const files = readdirSync('public/models/heroes').map((f) => f.replace('.glb', ''));
    Object.keys(HERO_RUN_SCALE).forEach((key) => expect(files, key).toContain(key));
    Object.keys(HERO_CELEBRATE).forEach((key) => {
      expect(files, key).toContain(key);
      const r = resolveClipName(clipsOf(key), 'celebrate', key);
      expect(r.state, key).toBe('celebrate');
      expect(HERO_CELEBRATE[key].some((re) => re.test(r.clip.split('|').pop())), key).toBe(true);
    });
  });

  it('the people use the pack emote, the animals hop for joy', () => {
    expect(resolveClipName(clipsOf('gamer'), 'celebrate', 'gamer').clip).toMatch(/emote-yes/);
    expect(resolveClipName(clipsOf('llama'), 'celebrate', 'llama').clip).toMatch(/jump/i);
  });

  it('every hero in the catalog has a celebration of some kind', () => {
    CHARACTER_MODELS.forEach((m) => {
      const key = heroKeyFor(m.file);
      const r = resolveClipName(clipsOf(key), 'celebrate', key);
      expect(r && r.state, m.name).toBe('celebrate');
    });
  });
});
