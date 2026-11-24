// The social post factory's standing rules (tools/social): they must hold whatever a hook spec says.
import { describe, it, expect } from 'vitest';
import { validateHook, checkCopy, checkHolds, expandTokens, rankPhrase, lookupConcept, loadHolds, FOOTER_TEXT } from '../../tools/social/lib.mjs';
import { slide1Html, slide2Html, footerHtml } from '../../tools/social/template.mjs';
import { captionFor, slide3For } from '../../tools/social/build-week.mjs';
import { readFileSync } from 'node:fs';

const kal = () => JSON.parse(readFileSync('tools/social/hooks/kal.json', 'utf8'))[0];
const holds = loadHolds();

describe('the demo hook (kal)', () => {
  it('passes, with the real deck words for both days', () => {
    const v = validateHook(kal(), holds);
    expect(v.errors).toEqual([]);
    expect(v.concepts.map((c) => [c.rank, c.hint, c.answer, c.roman])).toEqual([[214, 'tomorrow', 'कल', 'kal'], [215, 'yesterday', 'कल', 'kal']]);
  });

  it('builds the slide-3 package from the game\'s own gates, three per card, with the answer in the stated lane', () => {
    const v = validateHook(kal(), holds);
    const s3 = slide3For(kal(), v.concepts);
    expect(s3.items).toHaveLength(2);
    s3.items.forEach((it) => {
      expect(it.gates).toHaveLength(3);
      expect(it.gates.filter((g) => g.correct)).toHaveLength(1);
      expect(it.gates[it.correctLane].label).toBe(it.answer);
      expect(it.cardId).toBe('en-hi-' + it.rank);
    });
  });
});

describe('verification tags', () => {
  it('refuses needs-check, and refuses an unknown tag', () => {
    expect(validateHook({ ...kal(), verified: 'needs-check' }, holds).errors.join(' ')).toMatch(/needs-check/);
    expect(validateHook({ ...kal(), verified: 'probably' }, holds).errors.join(' ')).toMatch(/verified must be/);
  });
  it('catches a deck claim that does not match the deck (a typo cannot slip through)', () => {
    const h = kal(); h.expect = [{ rank: 214, answer: 'आज' }];
    expect(validateHook(h, holds).errors.join(' ')).toMatch(/deck check/);
  });
  it('refuses a concept the pair has no card for', () => {
    expect(validateHook({ ...kal(), concepts: [9999999] }, holds).errors.join(' ')).toMatch(/no card/);
  });
});

describe('honest rank wording', () => {
  it('refuses top-N and most-common claims, bare rank numbers and the word rank', () => {
    ['The top 100 Spanish words', 'one of the most common words in Spanish', 'the first 50 words you learn', 'word #214', 'ranked 214th'].forEach((t) => {
      expect(checkCopy(t, 'payoff').errors.length, t).toBeGreaterThan(0);
    });
  });
  it('allows the one honest phrase through {{rank:N}}', () => {
    expect(checkCopy('This is {{rank:214}}.', 'payoff').errors).toEqual([]);
    expect(expandTokens('{{rank:214}}')).toBe('word #214 of the deck (English-frequency order)');
    expect(rankPhrase(5)).toBe('word #5 of the deck (English-frequency order)');
  });
});

describe('pronunciation, mechanics and multiple choice', () => {
  it('refuses pronunciation-difficulty claims', () => {
    ['The hardest word to pronounce', 'impossible to say', 'a famous tongue twister', 'its pronunciation is tricky'].forEach((t) => expect(checkCopy(t, 'hook').errors.length, t).toBeGreaterThan(0));
  });
  it('refuses game-mechanics and developer wording in copy', () => {
    ['Steer into the right gate', 'The Hush is closing in', 'our algorithm picks', 'this card is in the deck'].forEach((t) => expect(checkCopy(t, 'payoff').errors.length, t).toBeGreaterThan(0));
  });
  it('refuses multiple-choice-only hooks', () => {
    ['Which of these is Spanish for door? A) puerta B) casa C) guerra', 'Pick one: left, middle or right'].forEach((t) => expect(checkCopy(t, 'hook').errors.length, t).toBeGreaterThan(0));
  });
  it('slide 1 must work for a viewer who knows none of the language: no foreign script', () => {
    expect(checkCopy('Say कल to a friend', 'hook').errors.join(' ')).toMatch(/non-Latin/);
    expect(checkCopy('Hindi has one word for yesterday and tomorrow.', 'hook').errors).toEqual([]);
  });
});

describe('the hold list', () => {
  it('blocks a concept on hold for the pair\'s language and not for other languages', () => {
    expect(checkHolds('en-es', [14], holds).join(' ')).toMatch(/hold list/);
    expect(checkHolds('en-fr', [14], holds)).toEqual([]);
    expect(checkHolds('en-pl', [81], holds).length).toBe(1);
    expect(checkHolds('en-hi', [214, 215], holds)).toEqual([]);
  });
  it('is enforced by validateHook', () => {
    const h = kal(); h.pair = 'en-es'; h.concepts = [14]; h.expect = [];
    expect(validateHook(h, holds).errors.join(' ')).toMatch(/hold list/);
  });
});

describe('every export carries the footer band', () => {
  it('both slides contain the required footer text', () => {
    const v = validateHook(kal(), holds);
    const reveal = v.concepts.map((c) => ({ hint: c.hint, answer: c.answer, roman: c.roman }));
    [slide1Html(kal(), '/f'), slide2Html(kal(), reveal, '/f')].forEach((html) => {
      expect(html).toContain('data-footer="1"');
      expect(html).toContain(FOOTER_TEXT);
    });
    expect(footerHtml()).toContain('Play Language Dash free');
    expect(captionFor(kal())).toContain(FOOTER_TEXT);
  });
  it('the real deck lookup gives the rank phrase and never "top"', () => {
    const c = lookupConcept('en-hi', 214);
    expect(c.rankPhrase).toBe('word #214 of the deck (English-frequency order)');
    expect(c.rankPhrase).not.toMatch(/top/i);
  });
});
