/**
 * cards.js — builds the card deck for the player's language pair.
 *
 * The 1,000 core words live in js/lang/data (one small file per language, generated from data/ by
 * tools/build-words.mjs). Only the two languages in the pair are loaded; buildDeck (lang/deck.js) turns them into cards.
 * cardhub.js calls loadDeck() in the background after the first paint.
 */

import { buildDeck } from './lang/deck.js';
import { CONTENT_VERSION } from './cardmeta.js';
export { SUBJECTS, EXAM_FILTERS, QUESTION_TYPES, SOURCE_DISCIPLINES, CONTENT_VERSION } from './cardmeta.js';

function djb2Hash(str) {
  var hash = 5381;
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return (hash >>> 0).toString(16);
}

/**
 * Deterministic hash of the card pool, used so two players (Versus, challenges) can check they hold the same words.
 * Hashes id + answer + wrong gates for each card, sorted by id.
 */
export function computeCardPoolHash(cards) {
  var sorted = cards.slice().sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
  var segments = [];
  for (var i = 0; i < sorted.length; i++) {
    var c = sorted[i];
    segments.push(c.id + '|' + c.ans + '|' + (c.d ? c.d.join('|') : ''));
  }
  return djb2Hash(segments.join('\n'));
}

// One lazy import per language, written out so the bundler can see (and split) every table.
var WORD_TABLES = {
  en: function () { return import('./lang/data/en.js'); },
  es: function () { return import('./lang/data/es.js'); },
  fr: function () { return import('./lang/data/fr.js'); },
  de: function () { return import('./lang/data/de.js'); },
  it: function () { return import('./lang/data/it.js'); },
  pt: function () { return import('./lang/data/pt.js'); },
  nl: function () { return import('./lang/data/nl.js'); },
  sv: function () { return import('./lang/data/sv.js'); },
  pl: function () { return import('./lang/data/pl.js'); },
  ru: function () { return import('./lang/data/ru.js'); },
  ja: function () { return import('./lang/data/ja.js'); },
  ko: function () { return import('./lang/data/ko.js'); },
  zh: function () { return import('./lang/data/zh.js'); },
  ar: function () { return import('./lang/data/ar.js'); },
  hi: function () { return import('./lang/data/hi.js'); }
};

/**
 * Load the word tables for a pair and build its deck.
 * @param {{known: string, target: string}} pair
 * @returns {Promise<{CARDS: object[], CARD_BY_ID: Map, BUILT_IN_CARD_POOL_HASH: string, dropped: object[], contentVersion: string}>}
 */
export async function loadDeck(pair) {
  var loaded = await Promise.all([
    import('./lang/data/concepts.js'),
    WORD_TABLES[pair.known](),
    WORD_TABLES[pair.target]()
  ]);
  var result = buildDeck(pair, loaded[0].default, loaded[1].default, loaded[2].default);
  var byId = new Map();
  result.cards.forEach(function (c) { byId.set(c.id, c); });
  return {
    CARDS: result.cards,
    CARD_BY_ID: byId,
    BUILT_IN_CARD_POOL_HASH: computeCardPoolHash(result.cards),
    dropped: result.dropped,
    contentVersion: CONTENT_VERSION
  };
}
