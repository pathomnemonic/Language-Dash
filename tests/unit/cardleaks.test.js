import { describe, it, expect } from 'vitest';
import { clueLeaksAnswer, genericWords, words, stem, answerKey, uniqueByAnswer, strictClueLeak, strictLeakReport, deckGenericWords, strictTokens, initialsOf } from '../../js/cardleaks.js';
import { loadDeck } from '../../js/cards.js';

describe('single-word hints never leak, so the leak checks never drop a card', () => {
  it('clueLeaksAnswer and strictClueLeak are no-ops', () => {
    expect(clueLeaksAnswer('dog', 'perro', ['gato', 'casa'], new Set())).toBe(false);
    expect(clueLeaksAnswer('hotel', 'hotel', [], new Set())).toBe(false);
    expect(strictClueLeak('dog', { ans: 'dog', d: ['a', 'b'] }, new Set())).toBe('');
    expect(strictLeakReport({ bw: ['dog'], ans: 'perro', d: ['x', 'y'] }, new Set())).toEqual({ leaking: [], remaining: 1 });
    expect(genericWords(['a', 'b']).size).toBe(0);
    expect(deckGenericWords(['a', 'b']).size).toBe(0);
    expect(initialsOf('Disseminated Intravascular Coagulation')).toBe('');
  });

  it('the old helpers still work on any script', () => {
    expect(words('Le chat (animal) noir')).toEqual(['chat', 'noir']);
    expect(words('猫 と 犬')).toEqual([]);
    expect(words('привет мир')).toEqual(['привет', 'мир']);
    expect(strictTokens('a big dog')).toEqual(['big', 'dog']);
    expect(stem('dogs')).toBe('dog');
  });
});

describe('answerKey: answers are compared ignoring case, accents and punctuation', () => {
  it('treats the same Latin word written differently as one answer', () => {
    expect(answerKey('Café')).toBe(answerKey('cafe'));
    expect(answerKey('CAFÉ!')).toBe(answerKey('café'));
    expect(answerKey('Straße')).toBe(answerKey('STRASSE'.toLowerCase().replace('ss', 'ß')));
    expect(answerKey('perro (animal)')).toBe(answerKey('Perro'));
  });
  it('keeps different words apart, in every script', () => {
    expect(answerKey('perro')).not.toBe(answerKey('gato'));
    expect(answerKey('犬')).not.toBe(answerKey('猫'));
    expect(answerKey('कुत्ता')).not.toBe(answerKey('कुत्ती'));
    expect(answerKey('كلب')).not.toBe(answerKey('قطة'));
    expect(answerKey('собака')).toBe(answerKey('Собака'));
    expect(answerKey('개')).toBe('개'.normalize('NFKD').toLowerCase());
  });
  it('is never empty for a real word, and empty for nothing', () => {
    ['犬', 'كلب', 'कुत्ता', 'собака', '개', 'perro'].forEach((w) => expect(answerKey(w).length).toBeGreaterThan(0));
    expect(answerKey('')).toBe('');
    expect(answerKey(null)).toBe('');
  });
});

describe('uniqueByAnswer: the same answer word never appears twice in one deal', () => {
  it('keeps the first of each answer', () => {
    const cards = [{ id: 'a', ans: 'Café' }, { id: 'b', ans: 'cafe' }, { id: 'c', ans: 'té' }, { id: 'd', ans: 'CAFÉ' }];
    expect(uniqueByAnswer(cards).map((c) => c.id)).toEqual(['a', 'c']);
  });
  it('a real deck has few repeated answers, and uniqueByAnswer removes every one', async () => {
    const { CARDS } = await loadDeck({ known: 'en', target: 'es' });
    const unique = uniqueByAnswer(CARDS);
    expect(unique.length).toBeLessThanOrEqual(CARDS.length);
    expect(unique.length).toBeGreaterThan(CARDS.length * 0.8);
    expect(new Set(unique.map((c) => answerKey(c.ans))).size).toBe(unique.length);
  });
});
