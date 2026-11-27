// @vitest-environment node
// The merge that builds the master vocabulary (tools/merge-extra.mjs): an entry that does not match the generated
// schema is refused, ids of concepts already in the master are preserved, and singular words ending in -s are not
// treated as plurals. (The undersized-merge refusal and the backup-then-rename write are exercised against fixture
// trees when the tool is run by hand; here the pure helpers are pinned.)
import { describe, it, expect } from 'vitest';
import { validateEntry, inflectedBases, assignIds, SINGULAR_S } from '../../tools/merge-extra.mjs';

const posSet = new Set(['noun', 'verb', 'adjective']);
const catSet = new Set(['Basics', 'Animals']);
const good = { en: 'dog', pos: 'noun', cat: 'Animals', es: 'perro', fr: 'chien' };

describe('merge-extra entry validation', () => {
  it('accepts an entry that matches the generated schema', () => {
    expect(validateEntry(good, posSet, catSet)).toBe('');
    expect(validateEntry({ ...good, sense: 'the animal' }, posSet, catSet)).toBe('');
  });
  it('refuses translations that are not plain strings (an array used to stringify into the output)', () => {
    expect(validateEntry({ ...good, es: ['perro'] }, posSet, catSet)).toMatch(/es is not/);
    expect(validateEntry({ ...good, fr: 42 }, posSet, catSet)).toMatch(/fr is not/);
    expect(validateEntry({ ...good, es: 'dos palabras' }, posSet, catSet)).toMatch(/more than one word/);
  });
  it('refuses an unknown part of speech, category or a non-string sense', () => {
    expect(validateEntry({ ...good, pos: 'thing' }, posSet, catSet)).toMatch(/part of speech/);
    expect(validateEntry({ ...good, cat: 'Nope' }, posSet, catSet)).toMatch(/category/);
    expect(validateEntry({ ...good, sense: 3 }, posSet, catSet)).toMatch(/sense/);
    expect(validateEntry(null, posSet, catSet)).toMatch(/not an object/);
  });
});

describe('merge-extra ids', () => {
  it('keeps the id a concept already has and gives new concepts the lowest free ids, sorted by id', () => {
    const prev = new Map([['zebra|', 5000]]);
    const out = assignIds([
      { en: 'apple', sense: '' }, { en: 'zebra', sense: '' }, { en: 'mango', sense: '' }
    ], prev);
    expect(out.map((e) => [e.en, e.id])).toEqual([['apple', 1001], ['mango', 1002], ['zebra', 5000]]);
  });
  it('never hands the same id out twice when a preserved id sits in the low range', () => {
    const prev = new Map([['zebra|', 1001]]);
    const out = assignIds([{ en: 'zebra', sense: '' }, { en: 'apple', sense: '' }], prev);
    expect(out.map((e) => e.id).sort()).toEqual([1001, 1002]);
    expect(out.find((e) => e.en === 'zebra').id).toBe(1001);
  });
});

describe('merge-extra inflections', () => {
  it('proposes bases from spelling, and the singular -s words are exempt', () => {
    expect(inflectedBases({ en: 'travelers', pos: 'noun' })).toContain('traveler');
    expect(inflectedBases({ en: 'walked', pos: 'verb' })).toContain('walk');
    expect(SINGULAR_S.has('news')).toBe(true);
    expect(SINGULAR_S.has('means')).toBe(true);
    // a multiword entry is never an inflection candidate
    expect(inflectedBases({ en: 'post office', pos: 'noun' })).toEqual([]);
  });
});
