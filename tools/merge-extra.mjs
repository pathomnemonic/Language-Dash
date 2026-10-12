// Merges the extra vocabulary blocks (data/extra/block-N.json: ranks 1001..10000 for en/es/fr) into the master tables.
//   node tools/merge-extra.mjs
// The first 1,000 concepts are never touched (read back from concepts.json, ids <= 1000). The extra entries are ordered by
// real word frequency using data/extra/freq-20k.txt (the 20,000 most common English words, Google Trillion Word Corpus, from
// Peter Norvig's list as published at github.com/first20hours/google-10000-english): an entry takes the rank of the first form
// of its lemma (plural, -ed, -ing, -er, -ly ...) found in that list; entries not found keep their written order after the
// matched ones. Then build-words.mjs turns the result into js/lang/data/*.js.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 1000;
const TOTAL = 10000;
const concepts = JSON.parse(readFileSync(resolve(root, 'data/concepts.json'), 'utf8')).filter((c) => c.id <= BASE);
const es = JSON.parse(readFileSync(resolve(root, 'data/words/es.json'), 'utf8')).slice(0, BASE);
const fr = JSON.parse(readFileSync(resolve(root, 'data/words/fr.json'), 'utf8')).slice(0, BASE);
if (concepts.length !== BASE || es.length !== BASE || fr.length !== BASE) throw new Error('base tables must have 1000 entries');

const freq = new Map();
readFileSync(resolve(root, 'data/extra/freq-20k.txt'), 'utf8').split('\n').forEach((w, i) => { w = w.trim(); if (w && !freq.has(w)) freq.set(w, i + 1); });
function formsOf(w) {
  const f = [w, w + 's', w + 'es', w + 'ed', w + 'd', w + 'ing', w + 'er', w + 'ly', w + 'ness'];
  if (w.endsWith('e')) f.push(w.slice(0, -1) + 'ing');
  if (w.endsWith('y')) f.push(w.slice(0, -1) + 'ies', w.slice(0, -1) + 'ied', w.slice(0, -1) + 'ier', w.slice(0, -1) + 'ily');
  if (/[^aeiou][aeiou][^aeiouwxy]$/.test(w)) f.push(w + w.slice(-1) + 'ing', w + w.slice(-1) + 'ed');
  return f;
}
function rankOf(w) {
  let best = Infinity;
  for (const f of formsOf(w)) { const r = freq.get(f); if (r && r < best) best = r; }
  return best;
}

const seen = new Set(concepts.map((c) => c.en + '|' + (c.sense || '')));
const cands = [];
let order = 0;
const files = readdirSync(resolve(root, 'data/extra')).filter((f) => /^block-\d+\.json$/.test(f)).sort((a, b) => parseInt(a.slice(6), 10) - parseInt(b.slice(6), 10));
let dropped = 0;
for (const f of files) {
  for (const e of JSON.parse(readFileSync(resolve(root, 'data/extra', f), 'utf8'))) {
    const key = e.en + '|' + (e.sense || '');
    if (seen.has(key) || !e.es || !e.fr) { dropped++; continue; }
    seen.add(key);
    cands.push({ ...e, rank: rankOf(e.en), order: order++ });
  }
}
cands.sort((a, b) => (a.rank === b.rank ? a.order - b.order : a.rank - b.rank));
const extras = cands.slice(0, TOTAL - BASE);
const matched = extras.filter((e) => e.rank !== Infinity).length;

const outConcepts = concepts.concat(extras.map((e, i) => ({ id: BASE + 1 + i, en: e.en, pos: e.pos, cat: e.cat, sense: e.sense || '' })));
writeFileSync(resolve(root, 'data/concepts.json'), '[\n' + outConcepts.map((c) => JSON.stringify(c)).join(',\n') + '\n]\n');
writeFileSync(resolve(root, 'data/words/es.json'), '[\n' + es.concat(extras.map((e) => [e.es])).map((x) => JSON.stringify(x)).join(',\n') + '\n]\n');
writeFileSync(resolve(root, 'data/words/fr.json'), '[\n' + fr.concat(extras.map((e) => [e.fr])).map((x) => JSON.stringify(x)).join(',\n') + '\n]\n');
console.log(`merged ${extras.length} extra concepts (${matched} placed by real frequency, ${extras.length - matched} unmatched kept in written order, ${dropped} duplicates/empty dropped, ${cands.length - extras.length} over the cap) -> ${outConcepts.length} concepts`);
