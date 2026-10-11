import { describe, it, expect } from 'vitest';
import { familiarity, feedbackPlan, wordsSeenForPair, MIN_HOLD, MAX_HOLD } from '../../js/lang/pacing.js';
import { compactNumber } from '../../js/ui.js';

describe('adaptive reveal of the right word', () => {
  const card = { id: 'en-hi-007' };
  it('a brand-new word stays up much longer than a known one', () => {
    const fresh = feedbackPlan(card, true, { seen: 0, correct: 0 }, { script: false, wordsSeen: 500 });
    const known = feedbackPlan(card, true, { seen: 8, correct: 8 }, { script: false, wordsSeen: 500 });
    expect(fresh.familiarity).toBe('new');
    expect(known.familiarity).toBe('known');
    expect(fresh.holdSeconds).toBeGreaterThan(known.holdSeconds * 2.5);
    expect(known.holdSeconds).toBeGreaterThanOrEqual(MIN_HOLD);
  });
  it('a miss, a new script and a brand-new learner each add time, within a cap', () => {
    const base = feedbackPlan(card, true, { seen: 3, correct: 2 }, { wordsSeen: 500 }).holdSeconds;
    expect(feedbackPlan(card, false, { seen: 3, correct: 2 }, { wordsSeen: 500 }).holdSeconds).toBeGreaterThan(base);
    expect(feedbackPlan(card, true, { seen: 3, correct: 2 }, { wordsSeen: 500, script: true }).holdSeconds).toBeGreaterThan(base);
    expect(feedbackPlan(card, true, { seen: 3, correct: 2 }, { wordsSeen: 5 }).holdSeconds).toBeGreaterThan(base);
    expect(feedbackPlan(card, false, { seen: 0 }, { wordsSeen: 0, script: true }).holdSeconds).toBeLessThanOrEqual(MAX_HOLD);
  });
  it('speaks new words more slowly, and counts only the pair\'s own words', () => {
    expect(feedbackPlan(card, true, { seen: 0 }).speechRate).toBeLessThan(feedbackPlan(card, true, { seen: 9, correct: 9 }).speechRate);
    expect(wordsSeenForPair({ 'en-hi-001': { seen: 2 }, 'en-hi-002': { seen: 0 }, 'en-es-001': { seen: 5 } }, 'en', 'hi')).toBe(1);
    expect(familiarity({ seen: 5, correct: 2 })).toBe('learning');
  });
  it('HUD numbers shorten so the tags always fit', () => {
    expect([compactNumber(0), compactNumber(9999), compactNumber(12480), compactNumber(1234567)]).toEqual(['0', '9999', '12.4k', '1.2M']);
  });
});

import { frontierRank, adaptPool } from '../../js/lang/pacing.js';
describe('the word pool adapts to the learner', () => {
  const cards = Array.from({ length: 1000 }, (_, i) => ({ id: 'en-hi-' + (i + 1), rank: i + 1 }));
  it('a beginner gets the most common words; mastery widens the pool', () => {
    expect(frontierRank({}, 'en', 'hi')).toBe(80);
    const mastered = {};
    for (let i = 1; i <= 100; i++) mastered['en-hi-' + String(i).padStart(3, '0')] = { seen: 4, correct: 4 };
    expect(frontierRank(mastered, 'en', 'hi')).toBe(300);
    expect(frontierRank(mastered, 'en', 'es')).toBe(80); // another pair has its own progress
    const pool = adaptPool(cards, 80, () => 0.99);
    expect(Math.max(...pool.map((c) => c.rank))).toBe(80);
    const stretch = adaptPool(cards, 80, () => 0.01);
    expect(Math.min(...stretch.map((c) => c.rank))).toBe(81);
  });
});
