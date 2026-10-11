/**
 * pacing.js — how long the right answer stays on screen, and how slowly it is spoken, adapted to the player.
 *
 * Someone meeting a word for the first time (above all in a new script like Hindi, Arabic or Japanese) needs far longer
 * to take in "water = पानी" than someone who has answered it correctly five times. So the reveal after every gate is
 * longer for new and shaky words, longer after a miss, longer for a non-Latin script, and longer for the first words of
 * a brand-new learner; known words get a short reveal so confident players are not slowed down. Pure functions.
 */

export var MIN_HOLD = 1.2;
export var MAX_HOLD = 7;

/** 'new' (first meeting), 'learning' (seen, not solid), or 'known' (answered correctly many times). */
export function familiarity(stat) {
  var seen = (stat && stat.seen) | 0;
  if (seen <= 1) return 'new';
  var acc = seen > 0 ? (stat.correct | 0) / seen : 0;
  return seen >= 4 && acc >= 0.85 ? 'known' : 'learning';
}

/**
 * @param {object} card the word card just answered
 * @param {boolean} ok was the gate right
 * @param {{seen?: number, correct?: number}} stat the card's record
 * @param {{script?: boolean, wordsSeen?: number}} [opts] script: target is a non-Latin script; wordsSeen: distinct words tried so far in this language pair
 * @returns {{holdSeconds: number, speechRate: number, nextDelay: number, familiarity: string}}
 */
export function feedbackPlan(card, ok, stat, opts) {
  opts = opts || {};
  var fam = familiarity(stat);
  var hold = fam === 'new' ? 4.2 : fam === 'learning' ? 2.6 : 1.3;
  if (!ok) hold += 1.2;
  if (opts.script) hold *= 1.25;
  if ((opts.wordsSeen || 0) < 80) hold *= 1.2; // the first words of a new learner
  hold = Math.min(MAX_HOLD, Math.max(MIN_HOLD, hold));
  var rate = fam === 'new' ? 0.7 : fam === 'learning' ? 0.8 : 0.95;
  if (opts.script) rate = Math.max(0.6, rate - 0.05);
  return { holdSeconds: Math.round(hold * 10) / 10, speechRate: rate, nextDelay: Math.max(0, (hold - MIN_HOLD) * 0.5), familiarity: fam };
}

/** How many distinct words of this language pair have been tried (card ids start with "known-target-"). */
export function wordsSeenForPair(cardStats, known, target) {
  var prefix = known + '-' + target + '-';
  var n = 0;
  for (var id in cardStats) if (id.indexOf(prefix) === 0 && cardStats[id] && cardStats[id].seen > 0) n++;
  return n;
}

/**
 * The hardest word rank a learner is dealt in a normal run, so a true beginner (say, someone starting Hindi) meets the
 * most common words first and the pool widens as words are mastered. A "mastered" word is one answered correctly at least
 * 3 times with 80%+ accuracy. 0 mastered -> the 80 most common words; 100 mastered -> 300; about 420 -> everything.
 */
export function frontierRank(cardStats, known, target) {
  var prefix = known + '-' + target + '-';
  var mastered = 0;
  for (var id in cardStats) {
    var s = cardStats[id];
    if (id.indexOf(prefix) === 0 && s && s.seen >= 3 && (s.correct | 0) / s.seen >= 0.8) mastered++;
  }
  return Math.min(1000, Math.round(80 + 2.2 * mastered));
}

/** Keep the words up to the frontier, plus the occasional stretch word a little beyond it (chance `stretch`, default 15%). */
export function adaptPool(cards, frontier, rng, stretch) {
  var chance = typeof stretch === 'number' ? stretch : 0.15;
  var limit = frontier + 60;
  var inside = cards.filter(function (c) { return (c.rank || 0) <= frontier || !c.rank; });
  if (inside.length < 30) return cards; // too few to deal from: use everything rather than repeat the same few
  var beyond = cards.filter(function (c) { return c.rank > frontier && c.rank <= limit; });
  var useStretch = beyond.length > 0 && (rng || Math.random)() < chance;
  return useStretch ? beyond : inside;
}
