// The social post factory's standing rules (tools/social): they must hold whatever a hook spec says.
import { describe, it, expect } from 'vitest';
import { validateHook, checkCopy, checkHolds, expandTokens, rankPhrase, lookupConcept, loadHolds, FOOTER_TEXT, planWeek, checkOverlay, VEINS, LAYOUTS, THEMES, MAPS, RUNNERS, OVERLAY_CHALLENGES, naturalCopyErrors } from '../../tools/social/lib.mjs';
import { slide1Html, slide2Html, slide3Html, footerHtml } from '../../tools/social/template.mjs';
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
    expect(expandTokens('{{rank:214}}')).toBe('word #214 of the deck (ordered by English frequency)');
    expect(rankPhrase(5)).toBe('word #5 of the deck (ordered by English frequency)');
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
  it('a wrong hold refuses for its language only and can never be acknowledged (tested with synthetic holds: none is left in the real list)', () => {
    const fake = [{ concept: 14, kind: 'wrong', kinds: { es: 'wrong' }, langs: ['es'], english: 'why', reason: 'test' }];
    expect(checkHolds('en-es', [14], fake).join(' ')).toMatch(/known wrong/);
    expect(checkHolds('en-fr', [14], fake)).toEqual([]);
    expect(checkHolds('en-es', [14], fake, [{ pair: 'en-es', rank: 14, reason: 'a long enough reason to try' }]).length).toBe(1);
  });
  it('the ten glosses the audit found wrong were fixed in the deck, so they are no longer held', () => {
    [['en-es', 14], ['en-pt', 14], ['en-pl', 81], ['en-ru', 647], ['en-ru', 877], ['en-it', 886], ['en-hi', 103], ['en-hi', 647], ['en-hi', 749], ['en-fr', 900]].forEach(([pair, r]) => {
      expect(checkHolds(pair, [r], holds).filter((e) => /known wrong/.test(e)), pair + ' #' + r).toEqual([]);
    });
  });
  it('blocks a flagged doubt unless the spec acknowledges it with a reason', () => {
    expect(checkHolds('en-hi', [214], holds).join(' ')).toMatch(/flagged as imprecise/);
    expect(checkHolds('en-hi', [214], holds, [{ pair: 'en-hi', rank: 214, reason: 'the post is about this quirk' }])).toEqual([]);
    expect(checkHolds('en-hi', [214], holds, [{ pair: 'en-hi', rank: 214, reason: 'short' }]).length).toBe(1);
  });
  it('is enforced by validateHook', () => {
    const h = kal(); h.pair = 'en-es'; h.concepts = [14]; h.expect = []; delete h.acknowledge;
    expect(validateHook(h, holds).errors.join(' ')).toMatch(/hold list/);
    const k = kal(); delete k.acknowledge;
    expect(validateHook(k, holds).errors.join(' ')).toMatch(/hold list/);   // the kal hook needs its acknowledgement
  });
  it('is the full list derived from the deck reviews: the B-04 entries plus every review doubt, ids checked against the English word', () => {
    const wrong = holds.flatMap((h) => h.langs.filter((l) => h.kinds[l] === 'wrong').map((l) => h.concept + '/' + l)).sort();
    expect(wrong).toEqual([]);   // the audit's ten wrong glosses were corrected in the deck
    expect(holds.length).toBeGreaterThanOrEqual(150);
    expect(holds.every((h) => h.concept >= 1 && h.concept <= 1000 && Array.isArray(h.langs) && h.langs.length && h.reason && h.english)).toBe(true);
    // every language with a review is represented, and a hand-numbered review line was corrected to the English word it names
    const langs = new Set(holds.flatMap((h) => h.langs));
    ['ar', 'de', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'sv', 'zh'].forEach((l) => expect(langs.has(l), l).toBe(true));
    expect(holds.find((h) => h.concept === 8 && h.langs.includes('de')).english).toBe('that');
    // the kind is per language: concept 900 is wrong for French (a noun fragment) but only a doubt for Spanish (mayormente)
    expect(holds.find((h) => h.concept === 900).kinds).toEqual({ es: 'doubt' });   // fr was fixed, es mayormente stays a doubt
  });
});

describe('every export carries the footer band', () => {
  it('both slides contain the required footer text', () => {
    const v = validateHook(kal(), holds);
    const reveal = v.concepts.map((c) => ({ hint: c.hint, answer: c.answer, roman: c.roman }));
    [slide1Html(kal(), '/f', {}), slide2Html(kal(), reveal, '/f', {})].forEach((html) => {
      expect(html).toContain('data-footer="1"');
      expect(html).toContain(FOOTER_TEXT);
    });
    expect(footerHtml()).toContain('Play Language Dash free');
    expect(captionFor(kal())).toContain(FOOTER_TEXT);
  });
  it('the real deck lookup gives the rank phrase and never "top"', () => {
    const c = lookupConcept('en-hi', 214);
    expect(c.rankPhrase).toBe('word #214 of the deck (ordered by English frequency)');
    expect(c.rankPhrase).not.toMatch(/top/i);
  });
});

describe('variety: layouts, themes, maps, runners and hook veins', () => {
  const specs = (veins) => veins.map((v, i) => ({ id: 'p' + i, pair: 'en-es', vein: v }));
  const mixed = ['same-word-two-meanings', 'false-friend', 'etymology', 'same-word-two-meanings', 'cultural-word', 'false-friend', 'meaning-flip'];

  it('has at least four layouts, five themes, and plans a week with nothing repeated back to back', () => {
    expect(LAYOUTS.length).toBeGreaterThanOrEqual(4);
    expect(THEMES.length).toBeGreaterThanOrEqual(4);
    const w = planWeek(specs(mixed));
    expect(w.errors).toEqual([]);
    ['layout', 'theme', 'map', 'runner', 'challenge'].forEach((k) => {
      for (let i = 1; i < w.posts.length; i++) expect(w.posts[i][k], k + ' at ' + i).not.toBe(w.posts[i - 1][k]);
    });
    // and it uses every layout in a seven-post week
    expect(new Set(w.posts.map((p) => p.layout)).size).toBe(LAYOUTS.length);
  });

  it('refuses the same hook vein twice in a row, and an explicit repeat of a layout', () => {
    const w1 = planWeek(specs(['etymology', 'etymology']));
    expect(w1.errors.join(' ')).toMatch(/same hook vein/);
    const w2 = planWeek([{ id: 'a', pair: 'en-es', vein: 'etymology', layout: 'story' }, { id: 'b', pair: 'en-es', vein: 'false-friend', layout: 'story' }]);
    expect(w2.errors.join(' ')).toMatch(/same layout/);
  });

  it('warns when a week of five or more uses fewer than three kinds of hook', () => {
    const w = planWeek(specs(['etymology', 'false-friend', 'etymology', 'false-friend', 'etymology']));
    expect(w.warnings.join(' ')).toMatch(/only 2 kind/);
  });

  it('a spec must name a known vein', () => {
    const h = kal(); delete h.vein;
    expect(validateHook(h, holds).errors.join(' ')).toMatch(/missing field: vein/);
    expect(validateHook({ ...kal(), vein: 'gossip' }, holds).errors.join(' ')).toMatch(/vein must be one of/);
    VEINS.forEach((v) => expect(validateHook({ ...kal(), vein: v }, holds).errors).toEqual([]));
  });

  it('each layout draws a different composition, each with the footer', () => {
    const v = validateHook(kal(), holds);
    const reveal = v.concepts.map((c) => ({ hint: c.hint, answer: c.answer, roman: c.roman }));
    const htmls = LAYOUTS.map((layout) => slide1Html(kal(), '/f', { layout, theme: 'plum-coral' }));
    expect(new Set(htmls).size).toBe(LAYOUTS.length);
    LAYOUTS.forEach((layout, i) => {
      expect(htmls[i]).toContain('data-layout="' + layout + '"');
      expect(htmls[i]).toContain('data-footer="1"');
      const two = slide2Html(kal(), reveal, '/f', { layout, theme: 'ink-teal' });
      expect(two).toContain('data-layout="' + layout + '"');
      expect(two).toContain(FOOTER_TEXT);
    });
  });

  it('plans maps and runners for the slide-3 capture, and puts them in the package', () => {
    const w = planWeek(specs(mixed));
    const v = validateHook(kal(), holds);
    const s3 = slide3For(kal(), v.concepts, w.posts[0]);
    expect(MAPS.map((m) => m.id)).toContain(s3.capture.map);
    expect(RUNNERS.map((r) => r.id)).toContain(s3.capture.runner);
    expect(s3.overlay.challenge).toBeTruthy();
    expect(s3.overlay.cta).toBeUndefined();   // the pill has the challenge only
  });
});

describe('the slide-3 pill carries the challenge only', () => {
  it('accepts every standard challenge line, which never mention free or the link', () => {
    OVERLAY_CHALLENGES.forEach((c) => { expect(checkOverlay(c).errors, c).toEqual([]); expect(c).not.toMatch(/free|link in bio/i); });
  });
  it('refuses the free to play or link in bio message in the pill (that is the footer band only)', () => {
    ['Spot it in Language Dash. Free to play.', 'Try Language Dash, link in bio.', 'Try Language Dash for free.'].forEach((c) => expect(checkOverlay(c).errors.join(' '), c).toMatch(/footer band/));
  });
  it('refuses any claim that this word is in the game', () => {
    ['This exact word is in the game', 'This word is in Language Dash', 'You will find this word in the app', 'That card is inside the game'].forEach((c) => {
      expect(checkOverlay(c + ' Language Dash').errors.length, c).toBeGreaterThan(0);
    });
  });
  it('must name the game, and a bad hand written overlay in a spec is refused', () => {
    expect(checkOverlay('Try it at full speed.').errors.join(' ')).toMatch(/name Language Dash/);
    const bad = { ...kal(), overlay: { challenge: 'This exact word is in the game: Language Dash' } };
    expect(validateHook(bad, holds).errors.join(' ')).toMatch(/pill/);
  });
  it('slide 3 as posted has the challenge in the pill and the message only in the footer band', () => {
    const html = slide3Html('file:///x.png', { challenge: OVERLAY_CHALLENGES[0] }, '/f', 'ink-teal');
    expect(html).toContain('data-pill="1"');
    expect(html).toContain(OVERLAY_CHALLENGES[0]);
    expect(html).toContain('data-footer="1"');
    const pillPart = html.split('data-pill="1"')[1].split('</div>')[0];
    expect(pillPart).not.toMatch(/free|link in bio/i);
    expect(html.match(/Link in bio/g).length).toBe(1);   // once: the footer band
  });
});

describe('audit fixes: holds cover both languages, expectations and rank tokens must match the post', () => {
  it('a hold on the known language blocks too: the hint is shown in it', () => {
    const fake = [{ concept: 14, kind: 'wrong', kinds: { es: 'wrong' }, langs: ['es'], english: 'why', reason: 'test' }];
    expect(checkHolds('es-en', [14], fake).join(' ')).toMatch(/known wrong/);
    expect(checkHolds('en-fr', [14], fake)).toEqual([]);
  });
  it('an expect entry for a concept the post does not select is an error, not silently ignored', () => {
    const h = kal(); h.expect = [{ rank: 999, answer: 'x' }];
    expect(validateHook(h, holds).errors.join(' ')).toMatch(/not among the post/);
  });
  it('a rank token must describe one of the selected concepts and be inside the deck', () => {
    const off = kal(); off.payoff = ['It is one word. See {{rank:300}} for the idea in full.'];
    expect(validateHook(off, holds).errors.join(' ')).toMatch(/\{\{rank:300\}\}/);
    const out = kal(); out.payoff = ['It is one word. See {{rank:99999}} for the idea in full.'];
    expect(validateHook(out, holds).errors.join(' ')).toMatch(/outside the deck/);
    const on = kal(); on.payoff = ['It is one word, and it is {{rank:214}} in the deck order we use.'];
    expect(validateHook(on, holds).errors.join(' ')).not.toMatch(/\{\{rank/);
  });
  it('a post id must be a plain slug: it names the output folder', () => {
    expect(validateHook({ ...kal(), id: '../escape' }, holds).errors.join(' ')).toMatch(/plain slug/);
    expect(validateHook({ ...kal(), id: 'a/b' }, holds).errors.join(' ')).toMatch(/plain slug/);
  });
  it('slide 2 expands rank tokens in the kicker instead of printing them literally', () => {
    const v = validateHook(kal(), holds);
    const reveal = v.concepts.map((c) => ({ hint: c.hint, answer: c.answer, roman: c.roman }));
    const html = slide2Html({ ...kal(), kicker: 'It is {{rank:214}} in the order.' }, reveal, '/f', { layout: 'bold-claim', theme: 'ink-teal' });
    expect(html).toContain('word #214 of the deck');
    expect(html).not.toContain('{{rank:');
  });
});

describe('owner copy rules: natural, and never a hyphen or a dash', () => {
  it('refuses hyphens and every kind of dash in any copy field', () => {
    ['a well-known word', 'Venetian s-ciào', 'one word \u2014 two days', 'a range 1\u20132', 'a minus \u2212 sign'].forEach((t) => {
      ['hook', 'payoff', 'caption'].forEach((slide) => expect(checkCopy(t, slide).errors.join(' '), t + ' / ' + slide).toMatch(/hyphen or dash/));
    });
    const h = { ...kal(), kicker: 'A long-held view.' };
    expect(validateHook(h, holds).errors.join(' ')).toMatch(/hyphen or dash/);
    expect(checkCopy('Periods, commas and colons are fine: all of them.', 'payoff').errors).toEqual([]);
  });
  it('the footer text and the honest rank phrase contain no hyphen or dash either', () => {
    expect(FOOTER_TEXT).toBe('Play Language Dash free. Link in bio.');
    expect(FOOTER_TEXT).not.toMatch(/[-\u2010-\u2015\u2212]/);
    expect(rankPhrase(7)).not.toMatch(/[-\u2010-\u2015\u2212]/);
    OVERLAY_CHALLENGES.forEach((c) => expect(c).not.toMatch(/[-\u2010-\u2015\u2212]/));
  });
  it('a hyphen in a deck word cannot be shown (the copy rule covers the reveal)', () => {
    const v = validateHook(kal(), holds);
    expect(v.errors).toEqual([]);   // the kal words carry none
  });
  it('refuses ad speak, exclamation marks, shouting, ellipses and theatrical fragments', () => {
    ['You will not believe this!', 'Unlock every word', 'A total game changer', 'Hindi has ONE word for both', 'Wait for it...', 'Same word. Two days.', 'Burro. Burro.', 'Level up your Spanish', 'The ultimate trick'].forEach((t) => {
      expect(naturalCopyErrors(t, 'hook').length, t).toBeGreaterThan(0);
    });
  });
  it('accepts plain, whole sentences that sound like a person', () => {
    ['Hindi has one word for both yesterday and tomorrow.', 'In Italian, burro is butter. In Spanish, it is a donkey.', 'It is the same word both times.', 'Context sorts it out, so nobody confuses the two for long.'].forEach((t) => {
      expect(naturalCopyErrors(t, 'payoff'), t).toEqual([]);
    });
  });
  it('the kicker is held to the same rules', () => {
    expect(validateHook({ ...kal(), kicker: 'Same word. Two days.' }, holds).errors.join(' ')).toMatch(/fragment/);
  });
});
