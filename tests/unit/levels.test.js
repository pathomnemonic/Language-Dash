import { describe, it, expect, beforeEach } from 'vitest';
import { bandsForDeck, bandRange, sampleCards, bandForRank, createPretest, PRETEST_LENGTH, getLevel, setLevel, hasLevel, LEVEL_BANDS } from '../../js/lang/levels.js';
import { masteryForPair, pairsWithProgress, titleFor } from '../../js/lang/mastery.js';
import { frontierRank } from '../../js/lang/pacing.js';

const deck = (n) => Array.from({ length: n }, (_, i) => ({ id: 'en-es-' + String(i + 1).padStart(3, '0'), rank: i + 1, bw: ['w' + (i + 1)], ans: 'a' + (i + 1), d: ['x' + (i + 1), 'y' + (i + 1)] }));

describe('levels', () => {
  beforeEach(() => localStorage.clear());
  it('a 1,000-word deck offers four levels, a 10,000-word deck all six', () => {
    expect(bandsForDeck(1000).map((b) => b.id)).toEqual(['beginner', 'basics', 'elementary', 'intermediate']);
    expect(bandsForDeck(10000).length).toBe(LEVEL_BANDS.length);
    expect(bandRange(LEVEL_BANDS[1], 1000)).toEqual([81, 250]);
  });
  it('sample words come evenly from the band', () => {
    const s = sampleCards(deck(1000), 81, 250, 5);
    expect(s.length).toBe(5);
    expect(s[0].rank).toBeGreaterThanOrEqual(81);
    expect(s[4].rank).toBeLessThanOrEqual(250);
  });
  it('the placement test climbs for a strong player and falls for a beginner', () => {
    const run = (knows) => {
      const t = createPretest(deck(1000), () => 0.5);
      let q;
      while ((q = t.next())) t.answer(knows(q.card.rank) ? q.correctIndex : -1);
      return t.estimate();
    };
    const strong = run(() => true);
    const mid = run((r) => r <= 400);
    const weak = run(() => false);
    expect(PRETEST_LENGTH).toBe(16);
    expect(strong).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(weak);
    expect(mid).toBeGreaterThan(200);
    expect(mid).toBeLessThan(900);
    expect(weak).toBeLessThanOrEqual(60);
    expect(bandForRank(weak, 1000).id).toBe('beginner');
  });
  it('the chosen level is remembered per pair', () => {
    const pair = { known: 'en', target: 'hi' };
    expect(hasLevel(pair)).toBe(false);
    setLevel(pair, { level: 'basics', frontier: 250, source: 'self' });
    expect(getLevel(pair).frontier).toBe(250);
    expect(hasLevel({ known: 'en', target: 'es' })).toBe(false);
  });
  it('the level sets where the pool starts; mastery widens it', () => {
    expect(frontierRank({}, 'en', 'hi', 250, 1000)).toBe(250);
    expect(frontierRank({}, 'en', 'hi', 0, 1000)).toBe(80);
    const m = {};
    for (let i = 1; i <= 100; i++) m['en-hi-' + String(i).padStart(3, '0')] = { seen: 4, correct: 4 };
    expect(frontierRank(m, 'en', 'hi', 250, 1000)).toBe(470);
    expect(frontierRank(m, 'en', 'hi', 250, 300)).toBe(300);
  });
});

describe('mastery', () => {
  it('counts mastered and tried words per band and per pair', () => {
    const stats = { 'en-hi-005': { seen: 5, correct: 5 }, 'en-hi-150': { seen: 3, correct: 2 }, 'en-hi-700': { seen: 1, correct: 1 }, 'en-es-010': { seen: 4, correct: 4 } };
    const m = masteryForPair(stats, 'en', 'hi', 1000);
    expect(m.mastered).toBe(1);
    expect(m.seen).toBe(3);
    expect(m.bands[0]).toMatchObject({ from: 1, to: 100, mastered: 1, seen: 1 });
    expect(pairsWithProgress(stats).map((p) => p.known + '-' + p.target).sort()).toEqual(['en-es', 'en-hi']);
    expect(titleFor(0).label).toBe('Tourist');
    expect(titleFor(5000).label).toBe('Babel Master');
  });
});
