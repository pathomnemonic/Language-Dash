/**
 * freecards.js — the shared word pool: the 300 most common words.
 *
 * Shared games (the Daily, the Weekly Gauntlet, friend challenges and Versus) are dealt from this pool so everyone
 * with the same language pair gets the same words, and so beginners and advanced players meet on common ground.
 * It is the same set the free library uses if the library is ever limited (see pro.js). A card's rank is the number
 * at the end of its id (es-en-007 is word 7), so the set holds for every language pair.
 */

var SHARED_MAX_RANK = 300;

/** Ids end in the rank, so membership is a number check; this object quacks like a Set for the callers that use .has / .size. */
export var FREE_CARD_IDS = {
  has: function (id) {
    var m = /-(\d+)$/.exec(String(id || ''));
    return !!m && parseInt(m[1], 10) <= SHARED_MAX_RANK;
  },
  size: SHARED_MAX_RANK
};
