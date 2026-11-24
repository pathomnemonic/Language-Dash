// The ten glosses the deck audit (§4) found wrong are fixed in the deck itself, and the only multi-word core entries are the ones listed here.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const FIXED = [
  ['es', 14, 'porqué', 'por qué'], ['pt', 14, 'porquê', 'por que'], ['pl', 81, 'uczyć', 'uczyć się'],
  ['ru', 647, 'писать', 'писать по буквам'], ['ru', 877, 'посреди', 'во время'], ['it', 886, 'circa', 'riguardo a'],
  ['hi', 103, 'तय', 'तय करना'], ['hi', 647, 'हिज्जे', 'हिज्जे करना'], ['hi', 749, 'ख़र्च', 'ख़र्च करना'], ['fr', 900, 'plupart', 'la plupart']
];
const words = (lang) => JSON.parse(fs.readFileSync('data/words/' + lang + '.json', 'utf8'));

describe('the audit glosses are fixed in the deck', () => {
  FIXED.forEach(([lang, id, oldWord, newWord]) => {
    it(lang + ' #' + id + ': ' + oldWord + ' is now ' + newWord, () => {
      const w = words(lang)[id - 1][0];
      expect(w).toBe(newWord);
      expect(w).not.toBe(oldWord);
      const built = fs.readFileSync('js/lang/data/' + lang + '.js', 'utf8');
      expect(built, 'the built table has the new word').toContain(newWord);
    });
  });

  it('every other core entry is still a single word: the only phrases are these ten, none by accident', () => {
    const allowed = new Set(FIXED.map(([l, i]) => l + ':' + i));
    const found = [];
    fs.readdirSync('data/words').filter((f) => f.endsWith('.json')).forEach((f) => {
      const lang = f.replace('.json', '');
      words(lang).slice(0, 1000).forEach((e, i) => { if (/\s/.test(e[0])) found.push(lang + ':' + (i + 1)); });
    });
    expect(found.sort()).toEqual([...allowed].sort());
  });
});
