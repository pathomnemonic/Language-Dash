// Merges the extra vocabulary blocks (data/extra/block-N.json: ranks 1001..10000 for en/es/fr) into the master tables.
//   node tools/merge-extra.mjs
// The first 1,000 concepts are never touched (read back from concepts.json, ids <= 1000). The extra entries are ordered by
// real word frequency using data/extra/freq-subtitles.txt (the 40,000 most common English words in film and TV subtitles (OpenSubtitles via hermitdave/FrequencyWords, CC BY-SA 4.0), from
// Peter Norvig's list as published at github.com/first20hours/google-10000-english): an entry takes the rank of the first form
// of its lemma (plural, -ed, -ing, -er, -ly ...) found in that list; entries not found keep their written order after the
// matched ones. Then build-words.mjs turns the result into js/lang/data/*.js.
//
// Safety rules (the master tables are the vocabulary every deck is built from, so a bad merge must never land):
//   - an entry is accepted only if it matches the generated schema exactly (string en/es/fr, a known part of speech and
//     category, a string sense): an array or number where a word belongs is refused, never stringified into the output;
//   - a merge that cannot fill all 10,000 concepts is refused outright: the master files are left untouched rather than
//     overwritten with an undersized result;
//   - a concept that already has an id above 1000 keeps it, so editing a block never renumbers the words after it;
//   - the three outputs are written to temporary files first, the previous masters are copied into a backup folder, and
//     only then are the new files renamed into place, so an interrupted run leaves a recoverable state.
import { readFileSync, writeFileSync, readdirSync, renameSync, copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const BASE = 1000;
export const TOTAL = 10000;

// English words that end in -s but are singular: stripping the -s does not produce their base form.
export const SINGULAR_S = new Set(['news', 'means', 'series', 'species', 'chaos', 'lens', 'status', 'analysis', 'basis', 'crisis', 'thesis', 'diagnosis', 'emphasis', 'oasis', 'canvas', 'bus', 'gas', 'plus', 'yes']);

/**
 * Does an extra-block entry match the schema the master tables are generated in?
 * Returns '' when it does, or the reason it does not. posSet and catSet come from the base concepts, so a new part of
 * speech or category has to be added to the base table deliberately before a block may use it.
 */
export function validateEntry(e, posSet, catSet) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return 'not an object';
  if (typeof e.en !== 'string' || !e.en.trim()) return 'en is not a non-empty string';
  if (typeof e.es !== 'string' || !e.es.trim()) return 'es is not a non-empty string';
  if (typeof e.fr !== 'string' || !e.fr.trim()) return 'fr is not a non-empty string';
  if (/\s/.test(e.es.trim())) return 'es is more than one word';
  if (/\s/.test(e.fr.trim())) return 'fr is more than one word';
  if (!posSet.has(e.pos)) return 'unknown part of speech "' + e.pos + '"';
  if (!catSet.has(e.cat)) return 'unknown category "' + e.cat + '"';
  if (e.sense !== undefined && typeof e.sense !== 'string') return 'sense is not a string';
  return '';
}

/** The base spellings an entry's spelling suggests, from spelling alone (see the removal loop for the checks applied). */
export function inflectedBases(e) {
  const w = e.en;
  if (/\s/.test(w)) return [];
  const out = [];
  if (e.pos === 'noun') {
    if (/ies$/.test(w)) out.push(w.slice(0, -3) + 'y');
    if (/(ses|xes|zes|ches|shes)$/.test(w)) out.push(w.slice(0, -2));
    if (/[^s]s$/.test(w)) out.push(w.slice(0, -1));
  }
  if (e.pos === 'verb') {
    if (/ied$/.test(w)) out.push(w.slice(0, -3) + 'y');
    if (/ed$/.test(w)) out.push(w.slice(0, -2), w.slice(0, -1), w.slice(0, -3));
    if (/ing$/.test(w)) out.push(w.slice(0, -3), w.slice(0, -3) + 'e', w.slice(0, -4));
    if (/[^s]s$/.test(w)) out.push(w.slice(0, -1));
  }
  return out;
}

/**
 * Give every extra an id. A concept that already had an id above BASE (same en + sense in the current master) keeps it;
 * new concepts take the lowest free ids, so ids are stable across merges and never exceed TOTAL.
 */
export function assignIds(extras, prevIds) {
  const used = new Set();
  for (let i = 1; i <= BASE; i++) used.add(i);
  const out = extras.map((e) => ({ ...e }));
  let next = BASE + 1;
  for (const e of out) {
    const prev = prevIds.get(e.en + '|' + (e.sense || ''));
    if (prev && prev > BASE && prev <= TOTAL && !used.has(prev)) { e.id = prev; used.add(prev); }
  }
  for (const e of out) {
    if (e.id) continue;
    while (used.has(next)) next++;
    if (next > TOTAL) throw new Error('more extra concepts than the ' + TOTAL + ' cap');
    e.id = next; used.add(next);
  }
  return out.sort((a, b) => a.id - b.id);
}

function formsOf(w) {
  const f = [w, w + 's', w + 'es', w + 'ed', w + 'd', w + 'ing', w + 'er', w + 'ly', w + 'ness'];
  if (w.endsWith('e')) f.push(w.slice(0, -1) + 'ing');
  if (w.endsWith('y')) f.push(w.slice(0, -1) + 'ies', w.slice(0, -1) + 'ied', w.slice(0, -1) + 'ier', w.slice(0, -1) + 'ily');
  if (/[^aeiou][aeiou][^aeiouwxy]$/.test(w)) f.push(w + w.slice(-1) + 'ing', w + w.slice(-1) + 'ed');
  return f;
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const master = JSON.parse(readFileSync(resolve(root, 'data/concepts.json'), 'utf8'));
  const concepts = master.filter((c) => c.id <= BASE);
  const es = JSON.parse(readFileSync(resolve(root, 'data/words/es.json'), 'utf8')).slice(0, BASE);
  const fr = JSON.parse(readFileSync(resolve(root, 'data/words/fr.json'), 'utf8')).slice(0, BASE);
  if (concepts.length !== BASE || es.length !== BASE || fr.length !== BASE) throw new Error('base tables must have 1000 entries');
  const posSet = new Set(master.map((c) => c.pos));
  const catSet = new Set(master.map((c) => c.cat));
  // the ids the extras already have, so a merge never renumbers a word that is already in the master
  const prevIds = new Map(master.filter((c) => c.id > BASE).map((c) => [c.en + '|' + (c.sense || ''), c.id]));

  const freq = new Map();
  readFileSync(resolve(root, 'data/extra/freq-subtitles.txt'), 'utf8').split('\n').forEach((w, i) => { w = w.trim(); if (w && !freq.has(w)) freq.set(w, i + 1); });
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
  const invalid = {};
  for (const f of files) {
    for (const e of JSON.parse(readFileSync(resolve(root, 'data/extra', f), 'utf8'))) {
      const key = e && typeof e === 'object' ? e.en + '|' + (e.sense || '') : '';
      if (key && seen.has(key)) { dropped++; continue; }
      const why = validateEntry(e, posSet, catSet);
      if (why) { invalid[why] = (invalid[why] || 0) + 1; dropped++; continue; }
      seen.add(key);
      cands.push({ ...e, rank: rankOf(e.en), order: order++ });
    }
  }
  // Drop inflected forms whose base word is already a concept: plurals of nouns, and -ed / -ing forms tagged as verbs
  // (a learner meets 'traveler' and 'alternative' once, not again as 'travelers' and 'alternatives'). Spelling alone is
  // not enough: the proposed base must be a concept with the same part of speech (so "news" is not the plural of the
  // adjective "new"), and known singular words ending in -s are never treated as inflections.
  const posOf = new Map();
  concepts.concat(cands).forEach((c) => { if (!posOf.has(c.en)) posOf.set(c.en, new Set()); posOf.get(c.en).add(c.pos); });
  let inflected = 0;
  for (let i = cands.length - 1; i >= 0; i--) {
    const e = cands[i];
    if (SINGULAR_S.has(e.en)) continue;
    const isInflected = inflectedBases(e).some((b) => b !== e.en && posOf.has(b) && posOf.get(b).has(e.pos));
    if (isInflected) { cands.splice(i, 1); inflected++; }
  }
  cands.sort((a, b) => (a.rank === b.rank ? a.order - b.order : a.rank - b.rank));
  const extras = cands.slice(0, TOTAL - BASE);
  if (extras.length < TOTAL - BASE) {
    throw new Error('only ' + extras.length + ' usable extra concepts, but the master must hold ' + (TOTAL - BASE) + ': refusing to overwrite the master vocabulary with an undersized result (master files left untouched)');
  }
  const matched = extras.filter((e) => e.rank !== Infinity).length;
  const withIds = assignIds(extras, prevIds);

  const outConcepts = concepts.concat(withIds.map((e) => ({ id: e.id, en: e.en, pos: e.pos, cat: e.cat, sense: e.sense || '' })));
  if (outConcepts.length !== TOTAL) throw new Error('the merged table would hold ' + outConcepts.length + ' concepts, not ' + TOTAL + ': refusing to write');
  const outputs = [
    [resolve(root, 'data/concepts.json'), '[\n' + outConcepts.map((c) => JSON.stringify(c)).join(',\n') + '\n]\n'],
    [resolve(root, 'data/words/es.json'), '[\n' + es.concat(withIds.map((e) => [e.es])).map((x) => JSON.stringify(x)).join(',\n') + '\n]\n'],
    [resolve(root, 'data/words/fr.json'), '[\n' + fr.concat(withIds.map((e) => [e.fr])).map((x) => JSON.stringify(x)).join(',\n') + '\n]\n']
  ];
  // write everything to temporary files first, back the current masters up, then rename into place
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = resolve(root, 'data', '.merge-backup-' + stamp);
  const temps = outputs.map(([path], i) => path + '.tmp-' + process.pid + '-' + i);
  try {
    outputs.forEach(([, text], i) => writeFileSync(temps[i], text));
    mkdirSync(backupDir, { recursive: true });
    outputs.forEach(([path]) => copyFileSync(path, resolve(backupDir, basename(path))));
    outputs.forEach(([path], i) => renameSync(temps[i], path));
  } catch (err) {
    temps.forEach((t) => { try { rmSync(t, { force: true }); } catch { /* already gone */ } });
    throw new Error('merge failed while writing (' + err.message + '); the previous masters are backed up in ' + backupDir);
  }
  const invalidNote = Object.keys(invalid).length ? ', invalid dropped: ' + Object.entries(invalid).map(([k, n]) => n + 'x ' + k).join('; ') : '';
  console.log(`merged ${extras.length} extra concepts (${matched} placed by real frequency, ${extras.length - matched} unmatched kept in written order, ${dropped} duplicates/invalid and ${inflected} inflected forms dropped, ${cands.length - extras.length} over the cap${invalidNote}) -> ${outConcepts.length} concepts; previous masters backed up in data/.merge-backup-${stamp}`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
