/**
 * deck.js — turns the 1,000 core concepts into the cards the engine plays, for one language pair.
 *
 * A card is one concept: the hint is the word in the player's own language, `ans` is the word in the language
 * they are learning, and `d` holds two wrong gates (other words in the learning language). Everything else on the
 * card (subj, exams, baseDifficulty ...) is filled so the existing selection, stats and review code work unchanged:
 *   subj  -> the topic (see topics.js)       exams -> the frequency levels the word belongs to
 *   tp    -> "dog = perro" teaching line     ww    -> what each wrong gate actually means
 *
 * Wrong gates are chosen deterministically (seeded by the concept and the target language), so Daily, challenges and
 * Versus deal identical gates to everyone with the same pair.
 */

import { topicForCategory, levelsForRank, difficultyForRank } from './topics.js';

var CANDIDATE_WINDOW = 160;   // how far away in frequency rank a wrong gate may be
var PICK_FROM = 10;           // pick the two wrong gates from the best N candidates

function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s) {
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Comparison key: case and punctuation never make two words "different". */
export function wordKey(s) {
  return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function pad(n) { return n < 10 ? '00' + n : n < 100 ? '0' + n : String(n); }

/** The id of a card: language pair plus concept number, so progress for es->en never mixes with fr->en. */
export function cardId(known, target, conceptId) { return known + '-' + target + '-' + pad(conceptId); }

/** The text shown as the hint: the English entry carries a sense ("right (direction)") only when the word is ambiguous. */
function hintText(entry) {
  var w = entry[0];
  var sense = entry[2];
  return sense ? w + ' (' + sense + ')' : w;
}

/**
 * Build the deck for one pair.
 * @param {{known: string, target: string}} pair
 * @param {Array<[string,string]>} concepts [cat, pos] per concept, index = id - 1
 * @param {Array<Array>} knownWords entries [word, roman?, sense?] aligned with concepts
 * @param {Array<Array>} targetWords entries [word, roman?] aligned with concepts
 * @returns {{cards: object[], dropped: {id: number, reason: string}[]}}
 */
export function buildDeck(pair, concepts, knownWords, targetWords) {
  var n = Math.min(concepts.length, knownWords.length, targetWords.length);
  var cards = [];
  var dropped = [];

  // Which concepts can be a card at all (a missing or identical word cannot)
  var usable = [];
  for (var i = 0; i < n; i++) {
    var kw = knownWords[i] && knownWords[i][0];
    var tw = targetWords[i] && targetWords[i][0];
    if (!kw || !tw) { dropped.push({ id: i + 1, reason: 'missing word' }); usable.push(false); continue; }
    if (wordKey(kw) === wordKey(tw)) { dropped.push({ id: i + 1, reason: 'same word in both languages' }); usable.push(false); continue; }
    usable.push(true);
  }

  // Wrong gates must be real, usable target words that are not the answer and not the hint itself
  var targetKeys = targetWords.map(function (e) { return wordKey(e && e[0]); });
  var knownKeys = knownWords.map(function (e) { return wordKey(e && e[0]); });

  for (var c = 0; c < n; c++) {
    if (!usable[c]) continue;
    var cat = concepts[c][0];
    var pos = concepts[c][1];
    var ansEntry = targetWords[c];
    var ansLen = Array.from(ansEntry[0]).length;

    var scored = [];
    for (var j = Math.max(0, c - CANDIDATE_WINDOW); j < Math.min(n, c + CANDIDATE_WINDOW + 1); j++) {
      if (j === c || !targetWords[j] || !targetWords[j][0]) continue;
      if (targetKeys[j] === targetKeys[c] || targetKeys[j] === knownKeys[c]) continue;
      var score = 0;
      if (concepts[j][1] === pos) score += 4;
      if (concepts[j][0] === cat) score += 2;
      score -= Math.min(3, Math.abs(Array.from(targetWords[j][0]).length - ansLen)) * 0.5;
      score -= Math.abs(j - c) / CANDIDATE_WINDOW;
      scored.push({ j: j, score: score });
    }
    if (scored.length < 2) { dropped.push({ id: c + 1, reason: 'not enough wrong gates' }); continue; }
    scored.sort(function (a, b) { return b.score - a.score || a.j - b.j; });
    var top = scored.slice(0, PICK_FROM);
    var rng = mulberry32(hashString(pair.target + ':' + (c + 1)));
    var firstIdx = Math.floor(rng() * top.length);
    var first = top.splice(firstIdx, 1)[0];
    var second = null;
    while (top.length && !second) {
      var cand = top.splice(Math.floor(rng() * top.length), 1)[0];
      if (targetKeys[cand.j] !== targetKeys[first.j]) second = cand;
    }
    if (!second) { dropped.push({ id: c + 1, reason: 'not enough distinct wrong gates' }); continue; }

    var hint = hintText(knownWords[c]);
    var wrong = [targetWords[first.j], targetWords[second.j]];
    var ww = {};
    wrong.forEach(function (e, k) {
      var idx = k === 0 ? first.j : second.j;
      ww[e[0]] = '“' + e[0] + '” means “' + hintText(knownWords[idx]) + '”.';
    });
    var rank = c + 1;
    var topic = topicForCategory(cat);
    cards.push({
      id: cardId(pair.known, pair.target, rank),
      subj: topic,
      bw: [hint],
      ans: ansEntry[0],
      d: [wrong[0][0], wrong[1][0]],
      tp: '“' + hint + '” is “' + ansEntry[0] + '”' + (ansEntry[1] ? ' (' + ansEntry[1] + ')' : '') + '. Word #' + rank + ' of the 1,000 most common.',
      ww: ww,
      ansRoman: ansEntry[1] || '',
      dRoman: [wrong[0][1] || '', wrong[1][1] || ''],
      rank: rank,
      pos: pos,
      exams: levelsForRank(rank),
      baseDifficulty: difficultyForRank(rank),
      questionType: 'word',
      source: 'vocabulary',
      tags: [topic.toLowerCase(), pos],
      hx: rank <= 300,
      yr: rank <= 300 ? 1 : rank <= 600 ? 2 : rank <= 850 ? 3 : 4,
      pearls: [],
      contentVersion: '1.0.0',
      reviewedAt: null
    });
  }
  return { cards: cards, dropped: dropped };
}
