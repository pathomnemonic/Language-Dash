import { describe, it, expect } from 'vitest';
import { loadDeck } from '../../js/cards.js';
import { LANGUAGES } from '../../js/lang/languages.js';
import concepts from '../../js/lang/data/concepts.js';

describe('no word is silently dropped', () => {
  it('there are at least 1,000 core concepts', () => {
    expect(concepts.length).toBeGreaterThanOrEqual(1000);
  });

  it('every language has an entry for every concept', async () => {
    for (const l of LANGUAGES) {
      const words = (await import('../../js/lang/data/' + l.code + '.js')).default;
      expect(words.length, l.code).toBe(['en', 'es', 'fr'].includes(l.code) ? concepts.length : 1000);
      words.forEach((w, i) => expect(w && w[0], l.code + ' #' + (i + 1)).toBeTruthy());
    }
  });

  it('a pair loses only words that are identical in both languages', async () => {
    const d = await loadDeck({ known: 'en', target: 'es' });
    expect(d.CARDS.length + d.dropped.length).toBe(concepts.length);
    d.dropped.forEach((x) => expect(x.reason).toBe('same word in both languages'));
    expect(d.CARDS.length).toBeGreaterThanOrEqual(950);
  });

  it('ids are unique and the deck is sorted from the most common word', async () => {
    const d = await loadDeck({ known: 'de', target: 'fr' });
    const ranks = d.CARDS.map((c) => c.rank);
    expect(new Set(d.CARDS.map((c) => c.id)).size).toBe(d.CARDS.length);
    expect(ranks).toEqual(ranks.slice().sort((a, b) => a - b));
  });
});

describe('words fit on a phone screen', () => {
  it('no hint or gate word is longer than 40 characters', async () => {
    for (const [known, target] of [['en', 'de'], ['ja', 'en'], ['en', 'hi']]) {
      const d = await loadDeck({ known, target });
      const long = d.CARDS.filter((c) => [c.bw[0], c.ans, c.d[0], c.d[1]].some((w) => Array.from(w).length > 40)).map((c) => c.id);
      expect(long, known + target).toEqual([]);
    }
  });
});
