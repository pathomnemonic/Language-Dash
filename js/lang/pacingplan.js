/**
 * pacingplan.js — pacing.js wired to the player's own record (the card stats and the language pair).
 */

import { feedbackPlan, wordsSeenForPair } from './pacing.js';
import { getPairOrDefault } from './pair.js';
import { LANGUAGE_BY_CODE } from './languages.js';

/** The reveal plan for a word just answered, from storage's card stats. */
export function planFeedback(card, ok, storage) {
  var pair = getPairOrDefault();
  var target = LANGUAGE_BY_CODE[pair.target];
  var stat = storage.getCardStat(card.id);
  var all = storage.get('cardStats') || {};
  return feedbackPlan(card, ok, stat, { script: !!(target && target.roman), wordsSeen: wordsSeenForPair(all, pair.known, pair.target) });
}
