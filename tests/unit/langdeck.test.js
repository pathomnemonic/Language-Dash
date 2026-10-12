import { describe, it, expect, beforeEach } from 'vitest';
import { buildDeck, cardId, wordKey } from '../../js/lang/deck.js';
import { loadDeck, computeCardPoolHash } from '../../js/cards.js';
import { getPair, setPair, hasPair, getPairOrDefault, getShowRoman, setShowRoman } from '../../js/lang/pair.js';
import { TOPICS, LEVELS, levelsForRank, difficultyForRank, topicForCategory } from '../../js/lang/topics.js';
import { LANGUAGES, isLanguageCode, getLanguage } from '../../js/lang/languages.js';
import concepts from '../../js/lang/data/concepts.js';

// the pairs the suite exercises (all 15 languages exist; the rest are covered by tools/validate-deck.mjs)
const TEST_CODES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'sv', 'pl', 'ru', 'ja', 'ko', 'zh'];
const PAIRS = [['en', 'es'], ['es', 'en'], ['en', 'fr'], ['de', 'it'], ['pt', 'nl'], ['sv', 'pl'], ['en', 'ru'], ['en', 'ja'], ['ko', 'zh'], ['zh', 'ja'], ['ru', 'en'], ['en', 'ko']];

async function deck(known, target) { return (await loadDeck({ known, target })); }

describe('lang/languages.js', () => {
  it('lists the 15 languages with unique codes', () => {
    expect(LANGUAGES).toHaveLength(15);
    expect(new Set(LANGUAGES.map((l) => l.code)).size).toBe(15);
    TEST_CODES.forEach((c) => expect(isLanguageCode(c)).toBe(true));
    expect(isLanguageCode('xx')).toBe(false);
    expect(isLanguageCode(undefined)).toBe(false);
    expect(getLanguage('ja').roman).toBe(true);
    expect(getLanguage('es').roman).toBe(false);
    expect(getLanguage('nope')).toBeNull();
  });
});

describe('lang/topics.js', () => {
  it('has the 15 topics from the world bible, in order', () => {
    expect(TOPICS).toEqual(['Basics', 'People & Family', 'Body & Health', 'Food & Drink', 'Home & Things', 'Nature & Animals', 'Travel & Places', 'Time & Numbers', 'Colors & Describing', 'Actions', 'Feelings & Thinking', 'Talking', 'Work & School', 'Shopping & Money', 'Small Words']);
  });
  it('folds every category of the concept list into one of the topics', () => {
    const cats = new Set(concepts.map((c) => c[0]));
    cats.forEach((cat) => expect(TOPICS, cat).toContain(topicForCategory(cat)));
    expect(topicForCategory('no-such-category')).toBe('Basics');
  });
  it('levels are nested frequency bands', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(['top100', 'top300', 'top600', 'top1000', 'top3000', 'all']);
    expect(levelsForRank(1)).toEqual(['top100', 'top300', 'top600', 'top1000', 'top3000', 'all']);
    expect(levelsForRank(100)).toEqual(['top100', 'top300', 'top600', 'top1000', 'top3000', 'all']);
    expect(levelsForRank(101)).toEqual(['top300', 'top600', 'top1000', 'top3000', 'all']);
    expect(levelsForRank(301)).toEqual(['top600', 'top1000', 'top3000', 'all']);
    expect(levelsForRank(601)).toEqual(['top1000', 'top3000', 'all']);
    expect(levelsForRank(1000)).toEqual(['top1000', 'top3000', 'all']);
  });
  it('difficulty is 1 up to rank 300, 2 up to 700, then 3', () => {
    expect([1, 300, 301, 700, 701, 1000].map(difficultyForRank)).toEqual([1, 1, 2, 2, 3, 3]);
  });
});

describe('lang/pair.js', () => {
  beforeEach(() => localStorage.clear());
  it('has no pair until one is chosen, then falls back to English → Spanish for first paint', () => {
    expect(getPair()).toBeNull();
    expect(hasPair()).toBe(false);
    expect(getPairOrDefault()).toEqual({ known: 'en', target: 'es' });
  });
  it('saves and reads a valid pair', () => {
    expect(setPair('fr', 'ja')).toBe(true);
    expect(getPair()).toEqual({ known: 'fr', target: 'ja' });
    expect(hasPair()).toBe(true);
  });
  it('refuses an invalid pair and leaves the saved one alone', () => {
    setPair('en', 'de');
    expect(setPair('en', 'en')).toBe(false);
    expect(setPair('xx', 'de')).toBe(false);
    expect(setPair('en', undefined)).toBe(false);
    expect(getPair()).toEqual({ known: 'en', target: 'de' });
  });
  it('ignores corrupt or tampered storage', () => {
    ['not json', '{"known":"en","target":"en"}', '{"known":"zz","target":"en"}', 'null', '[]'].forEach((raw) => {
      localStorage.setItem('langdash.pair.v1', raw);
      expect(getPair()).toBeNull();
    });
  });
  it('remembers the pronunciation-line switch (on by default)', () => {
    expect(getShowRoman()).toBe(true);
    setShowRoman(false);
    expect(getShowRoman()).toBe(false);
    setShowRoman(true);
    expect(getShowRoman()).toBe(true);
  });
});

describe('lang/deck.js', () => {
  it('card ids are known-target-rank, with the rank zero-padded to three digits', () => {
    expect(cardId('en', 'es', 7)).toBe('en-es-007');
    expect(cardId('en', 'es', 120)).toBe('en-es-120');
    expect(cardId('es', 'en', 1000)).toBe('es-en-1000');
  });

  it('wordKey ignores case, spaces and punctuation but keeps accents (él and el are different words)', () => {
    expect(wordKey('Café!')).toBe(wordKey('café'));
    expect(wordKey('  É l ')).toBe('él');
    expect(wordKey('él')).not.toBe(wordKey('el'));
  });

  it('is deterministic: the same pair always produces the same deck, wrong gates included', async () => {
    const a = await deck('en', 'es');
    const b = await deck('en', 'es');
    expect(a.CARDS.map((c) => [c.id, c.ans, c.d[0], c.d[1]])).toEqual(b.CARDS.map((c) => [c.id, c.ans, c.d[0], c.d[1]]));
    expect(a.BUILT_IN_CARD_POOL_HASH).toBe(b.BUILT_IN_CARD_POOL_HASH);
  });

  it('different pairs give different pool hashes (so a friend on another pair is noticed)', async () => {
    const hashes = new Set();
    for (const [k, t] of PAIRS) hashes.add((await deck(k, t)).BUILT_IN_CARD_POOL_HASH);
    expect(hashes.size).toBe(PAIRS.length);
  });

  describe.each(PAIRS)('%s → %s', (known, target) => {
    let cards;
    let byId;
    beforeEach(async () => {
      const d = await deck(known, target);
      cards = d.CARDS;
      byId = d.CARD_BY_ID;
    });

    it('has most of the 1,000 words, with unique ids of the right shape and a matching rank', () => {
      expect(cards.length).toBeGreaterThanOrEqual(700);
      expect(cards.length).toBeLessThanOrEqual(10000);
      expect(byId.size).toBe(cards.length);
      cards.forEach((c) => {
        expect(c.id).toMatch(new RegExp('^' + known + '-' + target + '-\\d{3,5}$'));
        expect(parseInt(c.id.split('-')[2], 10)).toBe(c.rank);
        expect(c.rank).toBeGreaterThanOrEqual(1);
        expect(c.rank).toBeLessThanOrEqual(10000);
      });
    });

    it('is one hint word, one answer and two different wrong gates, none equal to the answer or the hint', () => {
      cards.forEach((c) => {
        expect(c.bw).toHaveLength(1);
        expect(c.bw[0]).toBeTruthy();
        expect(c.ans).toBeTruthy();
        expect(c.d).toHaveLength(2);
        expect(wordKey(c.d[0])).not.toBe(wordKey(c.d[1]));
        c.d.forEach((w) => {
          expect(w).toBeTruthy();
          expect(wordKey(w)).not.toBe(wordKey(c.ans));
          expect(wordKey(w)).not.toBe(wordKey(c.bw[0]));
        });
        expect(wordKey(c.ans)).not.toBe(wordKey(c.bw[0]));
      });
    });

    it('wrong gates explain themselves (ww) and the answer is taught (tp)', () => {
      cards.forEach((c) => {
        expect(Object.keys(c.ww).sort()).toEqual(c.d.slice().sort());
        expect(c.tp).toContain(c.ans);
      });
    });

    it('uses only the 15 topics and nested levels, with the right difficulty', () => {
      cards.forEach((c) => {
        expect(TOPICS).toContain(c.subj);
        expect(c.exams).toEqual(levelsForRank(c.rank));
        expect(c.exams).toContain('all');
        expect(c.baseDifficulty).toBe(difficultyForRank(c.rank));
        expect(c.questionType).toBe('word');
        expect(c.source).toBe('vocabulary');
      });
    });

    it('carries romanization for non-Latin targets, and an empty string otherwise', () => {
      const roman = getLanguage(target).roman;
      cards.forEach((c) => {
        expect(typeof c.ansRoman).toBe('string');
        expect(c.dRoman).toHaveLength(2);
        if (roman) {
          expect(c.ansRoman, c.id).toBeTruthy();
          c.dRoman.forEach((r) => expect(r, c.id).toBeTruthy());
        } else {
          expect(c.ansRoman).toBe('');
        }
      });
    });
  });

  it('drops a concept that is the same word in both languages, and reports why', () => {
    const cs = [['basics', 'pron'], ['basics', 'pron'], ['food', 'noun'], ['food', 'noun'], ['food', 'noun']];
    const known = [['a'], ['b'], ['hotel'], ['bread'], ['milk']];
    const target = [['x'], ['y'], ['hotel'], ['pan'], ['leche']];
    const { cards, dropped } = buildDeck({ known: 'en', target: 'es' }, cs, known, target);
    expect(dropped.map((d) => d.id)).toContain(3);
    expect(dropped.find((d) => d.id === 3).reason).toMatch(/same word/);
    expect(cards.map((c) => c.id)).not.toContain('en-es-003');
  });

  it('pool hash only depends on ids, answers and gates', () => {
    const base = [{ id: 'en-es-001', ans: 'a', d: ['b', 'c'] }];
    expect(computeCardPoolHash(base)).toBe(computeCardPoolHash([{ id: 'en-es-001', ans: 'a', d: ['b', 'c'], extra: 1 }]));
    expect(computeCardPoolHash(base)).not.toBe(computeCardPoolHash([{ id: 'en-es-001', ans: 'z', d: ['b', 'c'] }]));
  });
});

import { hashCardPool, pairOfCardId, pairOfCards, pairLabel, pairMismatchMessage } from '../../js/multiplayer.js';

describe('competitive fairness: the language pair is part of the shared-pool hash', () => {
  it('reads the pair from card ids', () => {
    expect(pairOfCardId('en-es-007')).toEqual({ known: 'en', target: 'es' });
    expect(pairOfCardId('ja-ko-1000')).toEqual({ known: 'ja', target: 'ko' });
    expect(pairOfCardId('custom_123_0_0')).toBeNull();
    expect(pairOfCardId('xx-yy-001')).toBeNull();
    expect(pairOfCards([{ id: 'custom_1' }, { id: 'fr-de-002' }])).toEqual({ known: 'fr', target: 'de' });
    expect(pairLabel({ known: 'en', target: 'es' })).toBe('English → Spanish');
  });
  it('the same gates for two different pairs never share a hash', () => {
    const a = [{ id: 'en-es-001', ans: 'yo', d: ['tú', 'él'] }];
    const b = [{ id: 'en-fr-001', ans: 'yo', d: ['tú', 'él'] }];
    expect(hashCardPool(a)).not.toBe(hashCardPool(b));
    expect(hashCardPool(a)).toBe(hashCardPool(a.slice()));
  });
  it('says clearly which pair is needed', () => {
    expect(pairMismatchMessage({ known: 'en', target: 'es' }, { known: 'en', target: 'fr' })).toBe('You and your friend need the same language pair (English → Spanish).');
    expect(pairMismatchMessage(null, { known: 'en', target: 'fr' })).toMatch(/same language pair/);
  });
});
