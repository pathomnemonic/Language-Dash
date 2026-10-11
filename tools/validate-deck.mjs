/**
 * validate-deck.mjs — builds the deck of every language pair (15 x 14 = 210) and checks it.
 *
 *   node tools/validate-deck.mjs            summary, exit 1 on any problem
 *   node tools/validate-deck.mjs --json     the same as JSON
 *   node tools/validate-deck.mjs --pair=en-es   only one pair
 *
 * For every pair it asserts: at least MIN_CARDS cards; unique ids of the form known-target-NNN; the hint, the answer and
 * the two wrong gates all present; the two wrong gates different from each other, from the answer and from the hint;
 * topics and levels valid; and a romanization on every answer and wrong gate whenever the target language is
 * not written in the Latin script.
 */
import { buildDeck, wordKey } from '../js/lang/deck.js';
import { LANGUAGES } from '../js/lang/languages.js';
import { TOPICS, LEVELS } from '../js/lang/topics.js';
import concepts from '../js/lang/data/concepts.js';

const MIN_CARDS = 950;
// Close relatives share many identical words (Spanish/Portuguese "hotel"): such a word cannot be a gate, so a pair is
// allowed to fall short of MIN_CARDS ONLY because of "same word in both languages" drops, and never below this floor.
const COGNATE_FLOOR = 700;
const only = (process.argv.find((a) => a.startsWith('--pair=')) || '').slice(7);
const asJson = process.argv.includes('--json');
const levelIds = LEVELS.map((l) => l.id);

const words = {};
for (const l of LANGUAGES) words[l.code] = (await import('../js/lang/data/' + l.code + '.js')).default;

const problems = [];
const warnings = [];
const bad = (pair, msg) => { problems.push(pair + ': ' + msg); };
let pairs = 0;
let totalCards = 0;
let minCards = Infinity;

for (const known of LANGUAGES) {
  for (const target of LANGUAGES) {
    if (known.code === target.code) continue;
    const name = known.code + '-' + target.code;
    if (only && only !== name) continue;
    pairs++;
    const { cards, dropped } = buildDeck({ known: known.code, target: target.code }, concepts, words[known.code], words[target.code]);
    totalCards += cards.length;
    minCards = Math.min(minCards, cards.length);
    if (cards.length < MIN_CARDS) {
      const other = dropped.filter((d) => d.reason !== 'same word in both languages').length;
      const missing = MIN_CARDS - cards.length;
      const sameWord = dropped.length - other;
      if (cards.length >= COGNATE_FLOOR && sameWord >= missing) {
        warnings.push(name + ': ' + cards.length + ' cards (' + sameWord + ' words are identical in both languages)');
      } else bad(name, 'only ' + cards.length + ' cards (need ' + MIN_CARDS + '; ' + other + ' dropped for other reasons)');
    }
    const ids = new Set();
    for (const c of cards) {
      const at = name + ' ' + c.id;
      if (!new RegExp('^' + name + '-\\d{3,4}$').test(c.id)) bad(name, 'bad id ' + c.id);
      if (ids.has(c.id)) bad(name, 'duplicate id ' + c.id);
      ids.add(c.id);
      if (!c.bw || c.bw.length !== 1 || !c.bw[0]) bad(name, at + ' needs exactly one hint word');
      if (!c.ans) bad(name, at + ' has no answer');
      if (!c.d || c.d.length !== 2 || !c.d[0] || !c.d[1]) { bad(name, at + ' needs two wrong gates'); continue; }
      const keys = [wordKey(c.d[0]), wordKey(c.d[1])];
      if (keys[0] === keys[1]) bad(name, at + ' wrong gates are the same word: ' + c.d[0]);
      for (const k of keys) {
        if (k === wordKey(c.ans)) bad(name, at + ' a wrong gate equals the answer: ' + c.ans);
        if (k === wordKey(c.bw[0])) bad(name, at + ' a wrong gate equals the hint: ' + c.bw[0]);
      }
      if (!TOPICS.includes(c.subj)) bad(name, at + ' unknown topic ' + c.subj);
      if (!c.exams.length || !c.exams.every((e) => levelIds.includes(e)) || !c.exams.includes('all')) bad(name, at + ' bad levels');
      if (target.roman) {
        if (!c.ansRoman) bad(name, at + ' answer has no romanization');
        if (!c.dRoman || c.dRoman.length !== 2 || !c.dRoman[0] || !c.dRoman[1]) bad(name, at + ' wrong gate has no romanization');
      }
    }
  }
}

if (asJson) {
  console.log(JSON.stringify({ pairs, minCards: pairs ? minCards : 0, totalCards, problems, warnings }, null, 2));
} else {
  console.log('Checked ' + pairs + ' language pair(s): ' + totalCards + ' cards, fewest per pair ' + (pairs ? minCards : 0) + '.');
  warnings.forEach((w) => console.log('note: ' + w));
  problems.slice(0, 60).forEach((p) => console.error('✖ ' + p));
  if (problems.length > 60) console.error('… and ' + (problems.length - 60) + ' more');
  console.log(problems.length ? problems.length + ' problem(s).' : 'All pairs OK.');
}
process.exit(problems.length ? 1 : 0);
