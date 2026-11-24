// tools/social/lib.mjs — the rules and the data lookups for the social post factory.
//
// Everything a post claims about the deck comes from buildDeck (the same code the game runs), so a post can never show a
// gate the game would not show. The rules below are the standing ones from the owner and the content review: honest rank
// wording, no pronunciation-difficulty claims, the hold list, player-facing copy only, and no multiple-choice-only hooks.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildDeck, cardId } from '../../js/lang/deck.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CONCEPTS = JSON.parse(readFileSync(resolve(ROOT, 'data/concepts.json'), 'utf8'));
const CONCEPT_ROWS = CONCEPTS.map((k) => [k.cat, k.pos]);
const wordsCache = {};

export const FOOTER_TEXT = 'Play Language Dash free — link in bio';
export const VERIFIED_TAGS = ['deck', 'knowledge', 'needs-check'];

function wordsFor(lang) {
  if (lang === 'en') return CONCEPTS.map((k) => [k.en, '', k.sense]);
  if (!wordsCache[lang]) wordsCache[lang] = JSON.parse(readFileSync(resolve(ROOT, 'data/words/' + lang + '.json'), 'utf8'));
  return wordsCache[lang];
}

const deckCache = {};
/** The real deck for a pair, built by the game's own code. */
export function deckFor(pair) {
  const [known, target] = String(pair).split('-');
  if (!known || !target) throw new Error('pair must look like "en-es", got "' + pair + '"');
  if (!deckCache[pair]) deckCache[pair] = buildDeck({ known, target }, CONCEPT_ROWS, wordsFor(known), wordsFor(target));
  return { known, target, deck: deckCache[pair] };
}

/** The honest way to mention a rank. Never "top N <language>": the rank is the English concept's frequency order. */
export function rankPhrase(n) { return 'word #' + n + ' of the deck (English-frequency order)'; }

/** The real card, gates and facts for one concept in one pair. Throws when the pair has no such card. */
export function lookupConcept(pair, rank, lane) {
  const { known, target, deck } = deckFor(pair);
  const card = deck.cards.find((c) => c.rank === rank);
  if (!card) {
    const dropped = deck.dropped.find((d) => d.id === rank);
    throw new Error('concept #' + rank + ' has no card in ' + pair + (dropped ? ' (' + dropped.reason + ')' : ''));
  }
  const correctLane = Number.isInteger(lane) ? lane : 1;
  const gates = [];
  const wrong = card.d.slice();
  const wrongRoman = (card.dRoman || []).slice();
  for (let i = 0; i < 3; i++) {
    if (i === correctLane) gates.push({ label: card.ans, roman: card.ansRoman || '', correct: true });
    else gates.push({ label: wrong.shift(), roman: wrongRoman.shift() || '', correct: false });
  }
  const concept = CONCEPTS[rank - 1];
  return {
    pair, known, target, rank, cardId: cardId(known, target, rank), concept: concept && concept.en,
    hint: card.bw[0], answer: card.ans, roman: card.ansRoman || '', gates, correctLane,
    inCore1000: rank <= 1000, rankPhrase: rankPhrase(rank)
  };
}

export function loadHolds() {
  return JSON.parse(readFileSync(resolve(ROOT, 'data/content-hold.json'), 'utf8')).holds || [];
}

// ---------------------------------------------------------------------------------------------------------------------
// the copy rules
// ---------------------------------------------------------------------------------------------------------------------

const RANK_BANNED = [
  [/\btop[\s-]*\d+/i, 'a "top N" claim: the deck ranking is English-frequency order, so use {{rank:N}} for an honest rank phrase'],
  [/\b(most|more)[\s-](common|used|frequent|popular)\b[^.]*\b(words?|terms?)\b/i, 'a "most common/used words" claim about a language: the deck has no ranking of the language\'s own frequency'],
  [/\bfirst\s+\d+\s+words?\b/i, 'a "first N words" claim: use {{rank:N}}'],
  [/\b(word\s*)?#\s*\d+/i, 'a bare rank number: use {{rank:N}} so the wording stays honest'],
  [/\brank(ed|ing)?\b/i, 'the word "rank": use {{rank:N}}']
];

const PRONUNCIATION_BANNED = [
  /\b(hard|hardest|difficult|impossible|tricky|tough)\s+(word\s+)?to\s+(pronounce|say)\b/i,
  /\b(hardest|toughest|trickiest)\b[^.]*\b(pronounce|pronunciation|say)\b/i,
  /\bmispronounc/i,
  /\btongue[\s-]?twist/i,
  /\bpronunciation\b[^.]*\b(hard|difficult|tricky|tough|impossible)\b/i,
  /\b(hard|difficult|tricky|tough|impossible)\b[^.]*\bpronunciation\b/i
];

const MECHANICS_BANNED = [
  /\bgates?\b/i, /\blanes?\b/i, /\bhush\b/i, /\brunner\b/i, /\bpower-?ups?\b/i, /\bauto-?pilot\b/i, /\bfsrs\b/i,
  /\bspaced[\s-]repetition\b/i, /\balgorithm\b/i, /\bseeded?\b/i, /\bbuildDeck\b/i, /\bjson\b/i, /\bdeck\b/i, /\bcards?\b/i,
  /\bfrequency\b/i, /\bapp store\b/i, /\bcommit\b/i, /\bchangelog\b/i, /\bbuild\b/i, /\bupdate\b/i, /\bversion\b/i
];

const MULTIPLE_CHOICE = [
  /\bwhich\s+(one\s+)?of\s+(these|the\s+following|them)\b/i,
  /\bpick\s+(one|a|the\s+right)\b/i,
  /\bchoose\s+(one|a|the\s+right|between)\b/i,
  /(^|\n|\s)[A-D]\)\s+\S.*\s[A-D]\)\s+\S/s,
  /\b(left|middle|right)\s*(,|or)\s*(left|middle|right|centre|center)\b/i,
  /\bA\s*,\s*B\s*(,|or)\s*C\b/
];

// Letters outside Latin that a viewer who knows none of the language cannot read
const NON_LATIN = /\p{Script=Greek}|\p{Script=Cyrillic}|\p{Script=Hebrew}|\p{Script=Arabic}|\p{Script=Devanagari}|\p{Script=Thai}|\p{Script=Hangul}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Han}/u;

/** Expand {{rank:N}} tokens into the one honest wording. Anything else with a rank in it is refused by checkCopy. */
export function expandTokens(text) {
  return String(text || '').replace(/\{\{rank:(\d+)\}\}/g, (_, n) => rankPhrase(Number(n)));
}

/**
 * Check one piece of player-facing copy. `slide` is 'hook', 'payoff' or 'caption'.
 * Returns { errors: string[], warnings: string[] }.
 */
export function checkCopy(raw, slide, ctx) {
  const errors = [];
  const warnings = [];
  const text = String(raw || '');
  // the honest rank phrase is allowed to mention the deck and the frequency order, so test the copy without it
  const stripped = text.replace(/\{\{rank:\d+\}\}/g, '');
  RANK_BANNED.forEach(([re, why]) => { if (re.test(stripped)) errors.push(slide + ': ' + why); });
  PRONUNCIATION_BANNED.forEach((re) => { if (re.test(stripped)) errors.push(slide + ': pronunciation-difficulty claim (the data has nothing to support it)'); });
  MECHANICS_BANNED.forEach((re) => { const m = stripped.match(re); if (m) errors.push(slide + ': game mechanics or developer wording ("' + m[0] + '"): copy is player-facing curiosity only'); });
  if (MULTIPLE_CHOICE.some((re) => re.test(stripped))) errors.push(slide + ': multiple-choice style: the hook must stand on its own as a curiosity');
  if (slide === 'hook') {
    if (NON_LATIN.test(stripped)) errors.push('hook: contains non-Latin script; slide 1 must make sense to someone who knows none of the language (show the word on slide 2)');
    if (ctx && ctx.targetWords) {
      const found = (stripped.toLowerCase().match(/[\p{L}']+/gu) || []).filter((w) => ctx.targetWords.has(w) && !ctx.englishWords.has(w));
      if (found.length) warnings.push('hook: contains target-language word(s) ' + found.join(', ') + ': a viewer who knows none of the language cannot read them');
    }
    if (!/[a-z]{4}/i.test(stripped)) errors.push('hook: empty or too short');
  }
  return { errors, warnings };
}

/** Does any concept in the post match a hold? */
export function checkHolds(pair, ranks, holds) {
  const target = String(pair).split('-')[1];
  const errors = [];
  ranks.forEach((r) => {
    holds.forEach((h) => {
      if (h.concept === r && (h.langs === '*' || (h.langs || []).indexOf(target) >= 0 || (h.langs || []).indexOf('*') >= 0)) {
        errors.push('hold list: concept #' + r + ' is on hold for ' + target + ' (' + h.reason + ')');
      }
    });
  });
  return errors;
}

/**
 * Validate one hook spec against every standing rule. Never renders; returns the verdict and the real lookups.
 * hook: { id, hook, payoff, pair, concepts:[ranks], verified, expect?:[{rank, answer}], lane?, caption? }
 */
export function validateHook(h, holds) {
  const errors = [];
  const warnings = [];
  const out = { id: h && h.id, errors, warnings, concepts: [] };
  if (!h || typeof h !== 'object') { errors.push('spec is not an object'); return out; }
  ['id', 'hook', 'payoff', 'pair', 'verified'].forEach((k) => { if (!h[k]) errors.push('missing field: ' + k); });
  if (!Array.isArray(h.concepts) || !h.concepts.length) errors.push('missing field: concepts (a list of deck ranks)');
  if (h.verified && VERIFIED_TAGS.indexOf(h.verified) < 0) errors.push('verified must be one of ' + VERIFIED_TAGS.join(', '));
  if (h.verified === 'needs-check') errors.push('verified is "needs-check": this hook is refused until a human or the panels sign it off and the tag is changed');
  if (errors.length) return out;

  // the real deck facts
  const ranks = h.concepts.slice();
  ranks.forEach((r, i) => {
    try {
      out.concepts.push(lookupConcept(h.pair, r, Number.isInteger(h.lane) ? h.lane : (i % 3)));
    } catch (e) { errors.push(e.message); }
  });
  (h.expect || []).forEach((x) => {
    const got = out.concepts.find((c) => c.rank === x.rank);
    if (!got) return;
    if (x.answer && got.answer !== x.answer) errors.push('deck check: #' + x.rank + ' is "' + got.answer + '" in ' + h.pair + ', but the spec expects "' + x.answer + '"');
    if (x.hint && got.hint.toLowerCase().indexOf(String(x.hint).toLowerCase()) < 0) errors.push('deck check: #' + x.rank + ' is "' + got.hint + '", but the spec expects "' + x.hint + '"');
  });
  if (h.verified === 'deck' && !(h.expect && h.expect.length)) warnings.push('verified "deck" without an expect list: add the expected words so a typo cannot slip through');
  holds && errors.push(...checkHolds(h.pair, ranks, holds));

  // the copy
  const ctx = copyContext(h.pair);
  const payoffText = Array.isArray(h.payoff) ? h.payoff.join('\n') : String(h.payoff);
  [['hook', h.hook], ['payoff', payoffText], ['caption', h.caption || '']].forEach(([slide, text]) => {
    if (!text) return;
    const r = checkCopy(text, slide, slide === 'hook' ? ctx : null);
    errors.push(...r.errors); warnings.push(...r.warnings);
  });
  return out;
}

function copyContext(pair) {
  const { known, target } = (() => { const p = String(pair).split('-'); return { known: p[0], target: p[1] }; })();
  const tw = new Set();
  const ew = new Set();
  try {
    wordsFor(target).forEach((e) => { if (e && e[0]) tw.add(String(e[0]).toLowerCase()); });
    wordsFor(known).forEach((e) => { if (e && e[0]) ew.add(String(e[0]).toLowerCase()); });
  } catch { /* no word list: no warning */ }
  return { targetWords: tw, englishWords: ew };
}
