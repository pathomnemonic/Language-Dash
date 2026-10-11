import { describe, it, expect, beforeAll } from 'vitest';
import { FREE_CARD_IDS } from '../../js/freecards.js';
import { CARDS, CARD_BY_ID, loadCards, setLibraryUnlocked, seededPool, libraryCounts, isFreeCard } from '../../js/cardhub.js';

beforeAll(async () => { await loadCards(); });

describe('the free library: the 300 most common words', () => {
  it('is the cards ranked 1 to 300, and every one exists in the deck', () => {
    expect(FREE_CARD_IDS.size).toBe(300);
    const free = Array.from(CARD_BY_ID.values()).filter((c) => FREE_CARD_IDS.has(c.id));
    expect(free.length).toBeGreaterThan(280); // (a few words can be dropped for a pair)
    free.forEach((c) => expect(c.rank).toBeLessThanOrEqual(300));
  });
  it('is the same set for every language pair (it is decided by rank)', () => {
    expect(FREE_CARD_IDS.has('en-es-001')).toBe(true);
    expect(FREE_CARD_IDS.has('ja-ko-300')).toBe(true);
    expect(FREE_CARD_IDS.has('fr-de-301')).toBe(false);
    expect(FREE_CARD_IDS.has('fr-de-1000')).toBe(false);
    expect(FREE_CARD_IDS.has('nonsense')).toBe(false);
  });
  it('is a fair taste: every topic and the easy level, no flashcard-only cards', () => {
    const topics = new Set();
    CARD_BY_ID.forEach((c) => { if (FREE_CARD_IDS.has(c.id)) { topics.add(c.subj); expect(c.baseDifficulty).toBe(1); expect(c.enabledModes).toBeUndefined(); } });
    expect(topics.size).toBeGreaterThanOrEqual(10);
  });
});

describe('the card pool follows the library lock', () => {
  it('locked: only the free cards are playable, every card is still looked up by id', () => {
    setLibraryUnlocked(false);
    expect(CARDS.length).toBeGreaterThan(280);
    expect(CARDS.length).toBeLessThanOrEqual(300);
    expect(CARDS.every((c) => isFreeCard(c.id))).toBe(true);
    expect(CARD_BY_ID.size).toBeGreaterThan(900);
    expect(libraryCounts()).toMatchObject({ total: CARD_BY_ID.size, free: 300, playable: CARDS.length });
  });
  it('unlocked: all of them, in the same array (so every module sees it)', () => {
    const ref = CARDS;
    setLibraryUnlocked(true);
    expect(CARDS).toBe(ref);
    expect(CARDS.length).toBe(CARD_BY_ID.size);
  });
  it('shared games are dealt from the free cards for everyone, locked or not', () => {
    setLibraryUnlocked(true);
    const a = seededPool().map((c) => c.id);
    setLibraryUnlocked(false);
    const b = seededPool().map((c) => c.id);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(280);
    setLibraryUnlocked(true);
  });
});
