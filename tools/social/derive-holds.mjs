#!/usr/bin/env node
// tools/social/derive-holds.mjs — build data/content-hold.json from the written reviews of the deck.
//
//   node tools/social/derive-holds.mjs [--write]
//
// Sources (everything in the repo that says a gloss is wrong, misleading or unverified):
//   1. docs/translation-review/<lang>.md: the "Remaining doubts" / "Entries still in doubt" list of each language's independent review of
//      the core 1,000 (entries the reviewer left as they were because no single better word exists, but flagged as imprecise).
//      Ids are read from the line ("#135/#136", "262-266", "55/636", "207/208"). Arabic and Hindi list the words, not ids: those are
//      matched against that language's own word list (data/words/<lang>.json, first 1,000).
//   2. The deck audit's §4 list (Nov 22 spot check), kept by hand below: WRONG entries (never usable) and DOUBT_EXTRA entries.
// A "doubt" hold can be acknowledged by a post that is ABOUT the quirk (spec.acknowledge, see lib.mjs); a "wrong" hold never can.
// Without --write it prints the counts only.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const concepts = JSON.parse(readFileSync(resolve(ROOT, 'data/concepts.json'), 'utf8'));
const CORE = 1000;

// Deck audit §4 (Nov 22 spot check, about 35 concepts sampled). Two kinds, decided by one question: can a learner use the word shown, on its own,
// for the concept shown? If not (wrong word, or the wrong part of speech so the shown form cannot stand alone), it is WRONG and a post may never
// use it. If it is a real word with the right core meaning but a narrower or looser sense, it is a DOUBT: a post may use it only if the post is
// about that quirk and says so (acknowledge in the spec).
// Nothing is wrong any more: the ten glosses the audit found wrong were corrected in the deck itself (data/words/*.json, see FIXED_IN_DECK below), so they are
// no longer held. A future wrong gloss goes here and can never be used by a post. The mechanism is tested with synthetic holds (tests/unit/socialpost.test.js).
const WRONG = [];

// Corrected in the deck (kept here as the record; not holds). Pinned by tests/unit/deckglosses.test.js.
//   14 es porqué -> por qué | 14 pt porquê -> por que | 81 pl uczyć -> uczyć się | 647 ru писать -> писать по буквам | 877 ru посреди -> во время
//   886 it circa -> riguardo a | 103 hi तय -> तय करना | 647 hi हिज्जे -> हिज्जे करना | 749 hi ख़र्च -> ख़र्च करना | 900 fr plupart -> le plus

const DOUBT_EXTRA = [
  { concept: 900, langs: ['es'], reason: "audit §4: mayormente means 'mostly, mainly': a real adverb, but not the general 'most'" },
  { concept: 309, langs: ['ja'], reason: "audit §4: 上 means 'above, up': a loose rendering of the noun 'top'" },
  { concept: 134, langs: ['pt'], reason: "audit §4: sala is a room of a house or a hall ('living room' in a home); the audit prefers quarto, but quarto usually means bedroom, so neither is a clean 'room'" },
  { concept: 895, langs: ['es'], reason: "audit §4: pero means 'but'; however is 'sin embargo' (a real contrast word, but the wrong register)" }
];

// lines whose ids are written in a way the parser cannot read (checked by hand)
const MANUAL = {
  pt: [
    { ids: [262, 263, 264, 265, 266], note: 'weekdays use the short forms (segunda, terça ...), not the full "segunda-feira"' }
  ],
  sv: [
    { ids: [366, 367, 368, 369], note: 'mormor / morfar / farbror / moster are maternal or paternal specific; the English words are general' }
  ]
};
const SKIP_LANG_LINES = [/Spelling note/i];   // not a gloss problem

function idsFromLine(line) {
  const m = line.match(/^-\s+#?(\d+(?:\s*[/,]\s*#?\d+)*)(?=\s|:)/);
  if (!m) return null;
  return m[1].split(/[/,]/).map((x) => parseInt(x.replace('#', ''), 10)).filter((n) => n > 0);
}

function section(text) {
  const m = text.match(/## (?:Remaining doubts|Entries still in doubt)[^\n]*\n([\s\S]*?)(?=\n## |\s*$)/);
  return m ? m[1] : '';
}

const holds = new Map();   // concept -> { kind, langs:{lang: reason} }
function add(concept, lang, reason, kind) {
  if (concept < 1 || concept > CORE) return;
  const h = holds.get(concept) || { kinds: {}, langs: {} };
  // a wrong hold is never downgraded by a doubt for the same word; reasons from several sources are joined
  if (kind === 'wrong') h.kinds[lang] = 'wrong'; else if (!h.kinds[lang]) h.kinds[lang] = 'doubt';
  h.langs[lang] = h.langs[lang] && h.langs[lang] !== reason ? h.langs[lang] + ' / ' + reason : reason;
  holds.set(concept, h);
}

const dir = resolve(ROOT, 'docs/translation-review');
const perLang = {};
const corrected = [];
const unverified = [];
for (const f of readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
  const lang = f.replace('.md', '');
  const text = readFileSync(resolve(dir, f), 'utf8');
  let n = 0;
  const wordList = (lang === 'ar' || lang === 'hi') ? JSON.parse(readFileSync(resolve(ROOT, 'data/words/' + lang + '.json'), 'utf8')) : null;
  for (const raw of section(text).split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('-') || SKIP_LANG_LINES.some((re) => re.test(line))) continue;
    const reason = line.replace(/^-\s+/, '').slice(0, 220);
    const ids = idsFromLine(line);
    if (ids) {
      // a review line that names the English word ("7 that (far): ...") must match the concept at that id; if the number is a little
      // off (the reviews were written by hand), use the nearby concept with that English word, and say so
      const tail = line.replace(/^-\s+#?[\d/,#\s]+/, '');
      const heads = tail.split(/[:(]/)[0].split(/[/,]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
      ids.forEach((id, k) => {
        const want = heads.length === ids.length ? heads[k] : (heads.length === 1 ? heads[0] : '');
        let use = id;
        if (want && /^[a-z ]+$/.test(want) && concepts[id - 1] && concepts[id - 1].en !== want) {
          let found = 0;
          for (let d = 1; d <= 4 && !found; d++) for (const j of [id - d, id + d]) if (concepts[j - 1] && concepts[j - 1].en === want) { found = j; break; }
          if (found) { corrected.push(lang + ' #' + id + ' "' + want + '" -> #' + found); use = found; } else unverified.push(lang + ' #' + id + ' "' + want + '" (concept is "' + (concepts[id - 1] && concepts[id - 1].en) + '")');
        }
        add(use, lang, reason, 'doubt'); n++;
      });
      continue;
    }
    if (wordList) {
      // the words before the first colon, matched against the language's own list
      const head = line.replace(/^-\s+/, '').split(':')[0];
      const tokens = (head.match(/[^\s,()/]+/g) || []).filter((t) => /\P{ASCII}/u.test(t));
      tokens.forEach((t) => {
        for (let i = 0; i < CORE; i++) if (wordList[i] && wordList[i][0] === t) { add(i + 1, lang, reason, 'doubt'); n++; }
      });
    }
  }
  (MANUAL[lang] || []).forEach((m) => m.ids.forEach((id) => { add(id, lang, m.note, 'doubt'); n++; }));
  perLang[lang] = n;
}
WRONG.forEach((w) => w.langs.forEach((l) => add(w.concept, l, w.reason, 'wrong')));
DOUBT_EXTRA.forEach((w) => w.langs.forEach((l) => add(w.concept, l, w.reason, 'doubt')));

const out = [];
[...holds.keys()].sort((a, b) => a - b).forEach((concept) => {
  const h = holds.get(concept);
  const langs = Object.keys(h.langs).sort();
  out.push({
    concept, kind: langs.some((l) => h.kinds[l] === 'wrong') ? 'wrong' : 'doubt', kinds: Object.fromEntries(langs.map((l) => [l, h.kinds[l]])), langs,
    english: concepts[concept - 1] && concepts[concept - 1].en,
    reason: langs.map((l) => l + ': ' + h.langs[l]).join(' | ').slice(0, 900)
  });
});

const pairs = out.reduce((n, h) => n + h.langs.length, 0);
const wrongPairs = out.reduce((n, h) => n + h.langs.filter((l) => h.kinds[l] === 'wrong').length, 0);
console.log('hold list: ' + out.length + ' concepts, ' + pairs + ' concept-language pairs (' + wrongPairs + ' wrong, ' + (pairs - wrongPairs) + ' doubts)');
if (corrected.length) console.log('ids corrected to the named English word: ' + corrected.join('; '));
if (unverified.length) console.log('ids kept but the English word does not match: ' + unverified.join('; '));
console.log('per language: ' + Object.entries(perLang).map(([l, n]) => l + ' ' + n).join(', '));
if (process.argv.includes('--write')) {
  writeFileSync(resolve(ROOT, 'data/content-hold.json'), JSON.stringify({
    note: "Concepts the social post factory must NOT use for the listed languages. 'wrong' holds are glosses known to be wrong (deck audit §4) and can never be overridden; each language has its own kind in 'kinds'. 'doubt' holds are entries the independent reviews (docs/translation-review) left as they were but flagged as imprecise or misleading; a post that is ABOUT the quirk may acknowledge one in its spec (acknowledge: [{ pair, rank, reason }]), nothing else may use it. Generated by tools/social/derive-holds.mjs: edit that file, not this one.",
    holds: out
  }, null, 1) + '\n');
  console.log('wrote data/content-hold.json');
}
