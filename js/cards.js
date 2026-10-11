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

/**
 * Load the word tables for a pair and build its deck.
 * @param {{known: string, target: string}} pair
 * @returns {Promise<{CARDS: object[], CARD_BY_ID: Map, BUILT_IN_CARD_POOL_HASH: string, dropped: object[], contentVersion: string}>}
 */
export async function loadDeck(pair) {
  var loaded = await Promise.all([
    import('./lang/data/concepts.js'),
    import('./lang/data/' + pair.known + '.js'),
    import('./lang/data/' + pair.target + '.js')
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
