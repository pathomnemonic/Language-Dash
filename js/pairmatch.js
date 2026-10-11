/**
 * pairmatch.js — are two players on the same language pair?
 *
 * Shared games (Versus, friend challenges, the Daily) are dealt from card ids that start with the pair ("en-es-007"),
 * so two players on different pairs hold different pools. These helpers read the pair from ids and word the message
 * shown when a friend's pool differs: "You and your friend need the same language pair (English → Spanish)."
 */

import { getLanguage } from './lang/languages.js';
import { getPairOrDefault } from './lang/pair.js';

/** The pair a card id belongs to: "en-es-007" is { known: 'en', target: 'es' }. Null for ids of any other shape (My words). */
export function pairOfCardId(id) {
  var m = /^([a-z]{2})-([a-z]{2})-\d{3,4}$/.exec(String(id || ''));
  return m && getLanguage(m[1]) && getLanguage(m[2]) ? { known: m[1], target: m[2] } : null;
}

/** The pair of a card pool (from its first built-in card), or null. */
export function pairOfCards(cards) {
  for (var i = 0; i < (cards || []).length; i++) {
    var p = pairOfCardId(cards[i].id);
    if (p) return p;
  }
  return null;
}

/** "English → Spanish" */
export function pairLabel(pair) {
  var k = pair && getLanguage(pair.known);
  var t = pair && getLanguage(pair.target);
  return k && t ? k.name + ' \u2192 ' + t.name : '';
}

/**
 * The message to show when a friend's card-pool hash differs from ours. When their pair is known and differs from
 * ours it names it; otherwise it asks both players to update the game.
 * @param {{known: string, target: string}|null} [theirPair] the pair carried by the challenge link or match config
 * @param {{known: string, target: string}|null} [myPair] defaults to the player's saved pair
 * @returns {string}
 */
export function pairMismatchMessage(theirPair, myPair) {
  var mine = myPair || getPairOrDefault();
  var label = pairLabel(theirPair);
  if (label && (!mine || theirPair.known !== mine.known || theirPair.target !== mine.target)) {
    return 'You and your friend need the same language pair (' + label + ').';
  }
  return 'You and your friend need the same language pair and the latest version of the game. Update both and try again.';
}

