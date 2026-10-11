/**
 * cardleaks.js — answer keys and the (now trivial) clue-leak checks.
 *
 * In Language Dash a card's hint is ONE word in the player's language and its answer is ONE word in the language they
 * are learning, so a hint can never "contain" the answer the way a clinical vignette could. The old leak checks are kept
 * as cheap no-ops (same names, same shapes) so every caller keeps working and no one-word hint is ever dropped.
 *
 * What still matters here is answerKey / uniqueByAnswer: two cards with the same answer word (compared ignoring case,
 * accents and punctuation) must never be dealt in the same run.
 */

/** Lowercase words of 3+ letters/digits (any script), with parentheticals removed. Kept for old callers. */
export function words(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(function (w) { return w.length >= 3; });
}

/** Light stemming (plurals and common endings), kept for old callers. */
export function stem(word) {
  return word
    .replace(/(ies)$/, 'y')
    .replace(/(es|s)$/, '')
    .replace(/(ic|al)$/, '');
}

export var GENERIC_ANSWER_WORD_COUNT = 8;

/** No-op: single words have no "category words". */
export function genericWords() { return new Set(); }

/** Always false: a one-word hint never gives away a one-word answer. */
export function clueLeaksAnswer() { return false; }

/**
 * A comparison key for an answer: case, accents, punctuation and a trailing "(sense)" never make two answers different.
 * "Café", "cafe" and "CAFÉ!" share a key. Works for every script (matras and jamo are kept).
 */
export function answerKey(ans) {
  return String(ans || '')
    .replace(/\s*\([^)]*\)/g, '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')   // Latin, Cyrillic and Greek accents
    .replace(/[ً-ٰٟ]/g, '')   // Arabic vowel marks
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, '');
}

/** The cards with only the first one for each answer word (a deal should never repeat a gate word as the answer). */
export function uniqueByAnswer(cards) {
  var seen = {};
  return cards.filter(function (c) {
    var key = answerKey(c.ans);
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

// ---- the strict check, kept as no-ops so the audit/test callers still link ----------------------------------

export function strictTokens(text) { return words(text); }

export function deckGenericWords() { return new Set(); }

export function initialsOf() { return ''; }

/** @returns {string} always '' (no leak) */
export function strictClueLeak() { return ''; }

/** @returns {{leaking: Array, remaining: number}} nothing ever leaks */
export function strictLeakReport(card) {
  return { leaking: [], remaining: (card && card.bw ? card.bw.length : 0) };
}
