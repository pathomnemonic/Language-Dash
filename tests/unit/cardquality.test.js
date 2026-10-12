import { describe, it, expect } from 'vitest';
import { loadDeck } from '../../js/cards.js';
import { wordKey } from '../../js/lang/deck.js';
import { answerKey } from '../../js/cardleaks.js';
import { validateCard } from '../../js/cardschema.js';
import { getLanguage } from '../../js/lang/languages.js';

const PAIRS = [['en', 'es'], ['es', 'fr'], ['en', 'ja'], ['ru', 'en'], ['zh', 'en'], ['en', 'ko'], ['en', 'ar'], ['en', 'hi']];

describe.each(PAIRS)('quality of the %s → %s deck', (known, target) => {
  it('every card passes the card schema (one hint, one answer, two distinct wrong gates)', async () => {
    const { CARDS } = await loadDeck({ known, target });
    const bad = [];
    CARDS.forEach((c) => { const r = validateCard(c, { strict: false }); if (!r.success) bad.push(c.id + ' ' + r.errors.map((e) => e.code).join(',')); });
    expect(bad).toEqual([]);
  });

  it('the answer differs from the hint, and wrong gates differ from the answer and the hint', async () => {
    const { CARDS } = await loadDeck({ known, target });
    const bad = CARDS.filter((c) => wordKey(c.ans) === wordKey(c.bw[0]) || c.d.some((w) => wordKey(w) === wordKey(c.ans) || wordKey(w) === wordKey(c.bw[0]))).map((c) => c.id);
    expect(bad).toEqual([]);
  });

  it('non-Latin targets always come with a pronunciation line', async () => {
    const { CARDS } = await loadDeck({ known, target });
    if (!getLanguage(target).roman) return;
    const missing = CARDS.filter((c) => !c.ansRoman || c.dRoman.some((r) => !r)).map((c) => c.id);
    expect(missing).toEqual([]);
  });

  it('most answers are unique (a repeated answer word is rare and is handled when dealing)', async () => {
    const { CARDS } = await loadDeck({ known, target });
    const keys = new Set(CARDS.map((c) => answerKey(c.ans)));
    expect(keys.size).toBeGreaterThan(CARDS.length * 0.8);
  });
});
