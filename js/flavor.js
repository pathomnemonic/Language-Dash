/**
 * flavor.js — the small lines of copy that give Language Dash its voice
 * (streak callouts, the verdict on the results screen, loading lines).
 * Pure functions: pass `rand` (a 0..1 function) for predictable tests.
 */

var STREAK_LINES = {
  5: 'Word on the street!',
  10: 'Fluent in momentum!',
  15: 'Native reflexes!',
  20: 'Polyglot spotted!',
  30: 'Guildmaster level!'
};

var LOADING_LINES = [
  'Unpacking the phrasebook…',
  'Chasing stray words…',
  'Asking for directions…',
  'Packing the passport…',
  'Waking the Guild…'
];

function pick(list, rand) {
  var r = typeof rand === 'function' ? rand() : Math.random();
  return list[Math.min(list.length - 1, Math.floor(r * list.length))];
}

/** A callout for a streak milestone, or '' when there is none for that streak. */
export function streakCallout(streak) {
  var keys = Object.keys(STREAK_LINES).map(Number).sort(function (a, b) { return b - a; });
  for (var i = 0; i < keys.length; i++) {
    if (streak === keys[i]) return STREAK_LINES[keys[i]];
  }
  return '';
}

/** A short verdict for the results screen from accuracy and how many were answered. */
export function runVerdict(correct, wrong) {
  var total = (correct || 0) + (wrong || 0);
  if (total === 0) return 'Not a word caught.';
  var acc = Math.round((correct / total) * 100);
  if (total >= 5 && acc === 100) return 'Word perfect.';
  if (acc >= 85) return 'Fluent and fast.';
  if (acc >= 65) return 'Getting the hang of it.';
  if (acc >= 40) return 'A few words got away.';
  return 'The Hush won this one. Try again.';
}

/** A light loading line. */
export function loadingLine(rand) {
  return pick(LOADING_LINES, rand);
}
