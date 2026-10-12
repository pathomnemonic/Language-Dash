/**
 * levels.js — how much of a language the player already knows: self-chosen levels, a placement test, and the
 * per-pair record of both. Pure logic (no DOM) except the small localStorage record.
 *
 * A level is just a starting point on the word-frequency list: the pool a run draws from begins at `frontier` (the
 * most common `frontier` words) and widens as words are mastered (see pacing.js frontierRank). It can be changed at
 * any time. Words are ranked 1..N by how common they are; N is 1,000 for most languages and 10,000 for the three
 * expanded ones.
 */

/** The self-assessment levels, easiest first. `frontier` = the hardest word rank dealt at the start. */
export var LEVEL_BANDS = Object.freeze([
  { id: 'beginner', label: 'Complete beginner', blurb: 'I am starting from zero', frontier: 80 },
  { id: 'basics', label: 'I know a few words', blurb: 'Greetings, numbers, food and simple things', frontier: 250 },
  { id: 'elementary', label: 'I can get by in simple situations', blurb: 'Ordering, asking, short sentences', frontier: 500 },
  { id: 'intermediate', label: 'I can talk about everyday life', blurb: 'Most common words feel familiar', frontier: 1000 },
  { id: 'upper', label: 'I read and chat with confidence', blurb: 'Only the less common words are new', frontier: 2500 },
  { id: 'advanced', label: 'I am advanced', blurb: 'Rare and specialised words', frontier: 5000 }
]);

/** The bands that make sense for a deck of `deckSize` words (every band must start inside the deck). */
export function bandsForDeck(deckSize) {
  var out = LEVEL_BANDS.filter(function (b, i) {
    var start = i === 0 ? 1 : LEVEL_BANDS[i - 1].frontier + 1;
    return start <= deckSize;
  });
  return out.length ? out : [LEVEL_BANDS[0]];
}

/** The rank range [from, to] a band's sample words come from. */
export function bandRange(band, deckSize) {
  var i = LEVEL_BANDS.indexOf(band);
  var from = i <= 0 ? 1 : LEVEL_BANDS[i - 1].frontier + 1;
  return [from, Math.min(deckSize, band.frontier)];
}

/** Evenly spread sample cards from a rank range (the words someone at this level is working on). */
export function sampleCards(cards, from, to, count) {
  var inRange = cards.filter(function (c) { return c.rank >= from && c.rank <= to; }).sort(function (a, b) { return a.rank - b.rank; });
  if (inRange.length <= count) return inRange;
  var out = [];
  for (var i = 0; i < count; i++) out.push(inRange[Math.floor((i + 0.5) * inRange.length / count)]);
  return out;
}

/** The band whose frontier is closest to (and not above) an estimated rank. */
export function bandForRank(rank, deckSize) {
  var bands = bandsForDeck(deckSize);
  var best = bands[0];
  bands.forEach(function (b) { if (b.frontier <= Math.max(rank, bands[0].frontier)) best = b; });
  return best;
}

// ---------- the placement test: a staircase over word rank ----------

export var PRETEST_LENGTH = 16;
var START_RANK = 250;

/**
 * An adaptive placement test. Each question is a word near the current rank; a right answer steps the rank up by half again,
 * a wrong one (or "I don't know") steps it down. The estimate is the geometric mean of the last questions' ranks, which settles
 * near the rank the player gets right about half the time.
 * @param {object[]} cards the deck (each has rank, bw, ans, d)
 * @param {function(): number} [rng]
 */
export function createPretest(cards, rng) {
  rng = rng || Math.random;
  var usable = cards.filter(function (c) { return c && c.rank && c.ans && c.d && c.d.length >= 2; }).sort(function (a, b) { return a.rank - b.rank; });
  var maxRank = usable.length ? usable[usable.length - 1].rank : 1000;
  var rank = Math.min(START_RANK, maxRank);
  var asked = [];
  var used = {};
  var current = null;

  function pick() {
    var span = Math.max(4, Math.round(rank * 0.15));
    var near = usable.filter(function (c) { return !used[c.id] && Math.abs(c.rank - rank) <= span; });
    if (!near.length) near = usable.filter(function (c) { return !used[c.id]; }).sort(function (a, b) { return Math.abs(a.rank - rank) - Math.abs(b.rank - rank); }).slice(0, 8);
    return near[Math.floor(rng() * near.length)] || null;
  }

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  return {
    /** The next question {card, options, correctIndex}, or null when the test is over. */
    next: function () {
      if (asked.length >= PRETEST_LENGTH) return null;
      var card = pick();
      if (!card) return null;
      used[card.id] = true;
      var options = shuffle([card.ans, card.d[0], card.d[1]]);
      current = { card: card, options: options, correctIndex: options.indexOf(card.ans) };
      return current;
    },
    /** Record the answer to the current question (choice = option index, or -1 for "I don't know"). */
    answer: function (choice) {
      if (!current) return;
      var right = choice === current.correctIndex;
      asked.push({ rank: current.card.rank, right: right });
      rank = right ? Math.min(maxRank, Math.round(rank * 1.5)) : Math.max(20, Math.round(rank / 1.6));
      current = null;
      return right;
    },
    done: function () { return asked.length >= PRETEST_LENGTH || !usable.length; },
    progress: function () { return { asked: asked.length, total: PRETEST_LENGTH }; },
    /** The estimated rank the player is comfortable up to (never below 40). */
    estimate: function () {
      var recent = asked.slice(-8);
      if (!recent.length) return 40;
      var logSum = 0;
      recent.forEach(function (a) { logSum += Math.log(a.rank); });
      var geo = Math.exp(logSum / recent.length);
      var right = recent.filter(function (a) { return a.right; }).length;
      // all wrong: they are below the easiest words asked; all right: at least the hardest asked
      if (right === 0) return 40;
      if (right === recent.length) return Math.min(maxRank, Math.round(Math.max.apply(null, recent.map(function (a) { return a.rank; })) * 1.1));
      return Math.max(40, Math.round(geo));
    }
  };
}

// ---------- the saved choice, one per language pair ----------

var KEY = 'ld_levels';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_e) { return {}; }
}

export function pairKey(pair) { return pair.known + '-' + pair.target; }

/** @returns {{level: string, frontier: number, source: string, at: number}|null} */
export function getLevel(pair) {
  var rec = readAll()[pairKey(pair)];
  return rec && typeof rec.frontier === 'number' ? rec : null;
}

export function hasLevel(pair) { return getLevel(pair) !== null; }

/** @param {{known: string, target: string}} pair @param {{level: string, frontier: number, source: 'self'|'test'|'beginner'}} rec */
export function setLevel(pair, rec) {
  var all = readAll();
  all[pairKey(pair)] = { level: rec.level, frontier: Math.max(40, Math.round(rec.frontier)), source: rec.source, at: Date.now() };
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (_e) { /* storage blocked: the choice just is not kept */ }
}
