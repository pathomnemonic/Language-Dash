// tests/unit/cards.test.js
// The built-in deck of the default pair (English → Spanish): shape checks on every card the game can deal.

import { describe, it, expect } from 'vitest';
import { CARDS, SUBJECTS } from '../../js/cardhub.js';

describe('Card collection — imports', () => {
  it('has a non-empty deck once loaded', () => {
    expect(Array.isArray(CARDS)).toBe(true);
    expect(CARDS.length).toBeGreaterThan(900);
  });

  it('SUBJECTS are the 15 topics', () => {
    expect(SUBJECTS).toHaveLength(15);
  });
});

describe('Card collection — unique IDs', () => {
  it('has no duplicate card IDs', () => {
    const ids = CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Card collection — canonical topics', () => {
  it('every card has one of the 15 topics', () => {
    for (const card of CARDS) expect(SUBJECTS).toContain(card.subj);
  });
});

describe('Card collection — required fields', () => {
  it('every card has an id, one hint word, an answer, two wrong gates and a teaching line', () => {
    for (const card of CARDS) {
      expect(card.id).toBeTruthy();
      expect(card.bw).toHaveLength(1);
      expect(card.bw[0]).toBeTruthy();
      expect(card.ans).toBeTruthy();
      expect(card.d).toHaveLength(2);
      expect(card.tp).toBeTruthy();
    }
  });
});

describe('Card collection — two different wrong gates', () => {
  it('wrong gates differ from each other and from the answer', () => {
    for (const card of CARDS) {
      expect(card.d[0]).not.toBe(card.d[1]);
      expect(card.d).not.toContain(card.ans);
    }
  });

  it('ww keys only reference actual wrong gates', () => {
    for (const card of CARDS) {
      Object.keys(card.ww).forEach((k) => expect(card.d).toContain(k));
    }
  });
});

describe('Card collection — safe text', () => {
  it('no card field contains HTML tags', () => {
    const tag = /<[a-z][^>]*>/i;
    for (const card of CARDS) {
      const text = [card.bw.join(' '), card.ans, card.d.join(' '), card.tp, Object.values(card.ww).join(' ')].join(' ');
      expect(tag.test(text), card.id).toBe(false);
    }
  });
});
