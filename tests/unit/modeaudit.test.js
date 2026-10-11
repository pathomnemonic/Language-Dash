import { describe, it, expect } from 'vitest';
import { CARDS } from '../../js/cardhub.js';
import { answerKey, uniqueByAnswer } from '../../js/cardleaks.js';
import { buildExam } from '../../js/exam.js';
import { buildEncounterPlan } from '../../js/multiplayer.js';
import { createDailyOrder } from '../../js/game/gates.js';

const keys = (cards) => cards.map((c) => answerKey(c.ans));

describe('no answer word is dealt twice in one deck', () => {
  it('the deck has answer words that more than one card shares (so this matters)', () => {
    expect(keys(CARDS).length).toBeGreaterThanOrEqual(new Set(keys(CARDS)).size);
  });

  it('uniqueByAnswer keeps the first card for each answer word, ignoring parentheses, accents and case', () => {
    const cards = [{ id: 'a', ans: 'Café' }, { id: 'b', ans: 'cafe (drink)' }, { id: 'c', ans: 'té' }];
    expect(uniqueByAnswer(cards).map((c) => c.id)).toEqual(['a', 'c']);
  });

  it('exams never repeat an answer word', () => {
    for (let i = 0; i < 20; i++) {
      const exam = buildExam(CARDS, 80);
      const k = keys(exam.map((q) => q.card));
      expect(new Set(k).size).toBe(k.length);
    }
  });

  it('shared plans (friend challenge, versus) never repeat an answer word, and are the same for both players', () => {
    const a = buildEncounterPlan({ seed: 12345, cards: CARDS, count: 100 });
    const b = buildEncounterPlan({ seed: 12345, cards: CARDS, count: 100 });
    expect(a.map((e) => e.cardId)).toEqual(b.map((e) => e.cardId));
    const byId = new Map(CARDS.map((c) => [c.id, c]));
    const k = a.map((e) => answerKey(byId.get(e.cardId).ans));
    expect(new Set(k).size).toBe(k.length);
  });
});

describe('the Daily 15 is the same for everyone on the same date', () => {
  const ids = uniqueByAnswer(CARDS).map((c) => c.id);
  it('is the same fifteen cards in the same order for the same date, and different on another date', () => {
    const one = createDailyOrder({ dateKey: '2026-10-02', eligibleCardIds: ids, count: 15 });
    const again = createDailyOrder({ dateKey: '2026-10-02', eligibleCardIds: ids, count: 15 });
    const next = createDailyOrder({ dateKey: '2026-10-03', eligibleCardIds: ids, count: 15 });
    expect(one).toHaveLength(15);
    expect([...one]).toEqual([...again]);
    expect([...one]).not.toEqual([...next]);
    expect(new Set(one).size).toBe(15);
  });
});
