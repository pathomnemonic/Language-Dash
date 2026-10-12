/**
 * mastery.js — per-language mastery: how many words of each frequency band a player has mastered, and a title for it.
 * "Mastered" = answered correctly at least 3 times with 80%+ accuracy (the same rule that widens the word pool).
 */

var BANDS = [100, 300, 600, 1000, 2500, 5000, 10000];

export var MASTERY_TITLES = Object.freeze([
  { min: 0, label: 'Tourist', icon: '🧳' },
  { min: 25, label: 'Phrasebook Pal', icon: '📒' },
  { min: 100, label: 'Wordrunner', icon: '🏃' },
  { min: 300, label: 'Conversationalist', icon: '💬' },
  { min: 700, label: 'Linguist', icon: '🎓' },
  { min: 1500, label: 'Polyglot', icon: '🌍' },
  { min: 4000, label: 'Babel Master', icon: '🗼' }
]);

function isMastered(s) { return !!s && (s.seen | 0) >= 3 && (s.correct | 0) / s.seen >= 0.8; }

/** Mastered/seen counts for one pair. `deckSize` is how many words that pair has. */
export function masteryForPair(cardStats, known, target, deckSize) {
  var prefix = known + '-' + target + '-';
  var mastered = 0, seen = 0;
  var bands = [];
  var edges = BANDS.filter(function (b) { return b < deckSize; }).concat([deckSize]);
  edges.forEach(function (to, i) { bands.push({ from: i === 0 ? 1 : edges[i - 1] + 1, to: to, mastered: 0, seen: 0, total: to - (i === 0 ? 0 : edges[i - 1]) }); });
  for (var id in cardStats) {
    if (id.indexOf(prefix) !== 0) continue;
    var rank = parseInt(id.slice(prefix.length), 10);
    var s = cardStats[id];
    if (!(rank > 0) || !s || !(s.seen > 0)) continue;
    seen++;
    var m = isMastered(s);
    if (m) mastered++;
    for (var b = 0; b < bands.length; b++) {
      if (rank >= bands[b].from && rank <= bands[b].to) { bands[b].seen++; if (m) bands[b].mastered++; break; }
    }
  }
  return { known: known, target: target, mastered: mastered, seen: seen, total: deckSize, bands: bands, title: titleFor(mastered) };
}

export function titleFor(mastered) {
  var t = MASTERY_TITLES[0];
  MASTERY_TITLES.forEach(function (x) { if (mastered >= x.min) t = x; });
  return t;
}

/** Every pair the player has any progress in, most mastered first: [{known, target, seen, mastered}] (deck sizes unknown here). */
export function pairsWithProgress(cardStats) {
  var map = {};
  for (var id in cardStats) {
    var m = /^([a-z]{2})-([a-z]{2})-\d+$/.exec(id);
    var s = cardStats[id];
    if (!m || !s || !(s.seen > 0)) continue;
    var key = m[1] + '-' + m[2];
    var rec = map[key] || (map[key] = { known: m[1], target: m[2], seen: 0, mastered: 0 });
    rec.seen++;
    if (isMastered(s)) rec.mastered++;
  }
  return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.mastered - a.mastered || b.seen - a.seen; });
}
