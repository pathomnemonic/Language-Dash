// tools/social/lib.mjs — the rules and the data lookups for the social post factory.
//
// Everything a post claims about the deck comes from buildDeck (the same code the game runs), so a post can never show a
// gate the game would not show. The rules below are the standing ones from the owner and the content review: honest rank
// wording, no pronunciation-difficulty claims, the hold list, player-facing copy only, and no multiple-choice-only hooks.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildDeck, cardId } from '../../js/lang/deck.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CONCEPTS = JSON.parse(readFileSync(resolve(ROOT, 'data/concepts.json'), 'utf8'));
const CONCEPT_ROWS = CONCEPTS.map((k) => [k.cat, k.pos]);
const wordsCache = {};

export const FOOTER_TEXT = 'Play Language Dash free. Link in bio.';
export const VERIFIED_TAGS = ['deck', 'knowledge', 'needs-check'];

function wordsFor(lang) {
  if (lang === 'en') return CONCEPTS.map((k) => [k.en, '', k.sense]);
  if (!wordsCache[lang]) wordsCache[lang] = JSON.parse(readFileSync(resolve(ROOT, 'data/words/' + lang + '.json'), 'utf8'));
  return wordsCache[lang];
}

const deckCache = {};
/** The real deck for a pair, built by the game's own code. */
export function deckFor(pair) {
  const [known, target] = String(pair).split('-');
  if (!known || !target) throw new Error('pair must look like "en-es", got "' + pair + '"');
  if (!deckCache[pair]) deckCache[pair] = buildDeck({ known, target }, CONCEPT_ROWS, wordsFor(known), wordsFor(target));
  return { known, target, deck: deckCache[pair] };
}

/** The concepts of a spec as { pair, rank } (a bare number uses the spec's own pair). */
export function normConcepts(h) {
  return (h.concepts || []).map((c) => (typeof c === 'number' ? { pair: h.pair, rank: c } : { pair: c.pair || h.pair, rank: c.rank }));
}

/** The honest way to mention a rank. Never "top N <language>": the rank is the English concept's frequency order. */
export function rankPhrase(n) { return 'word #' + n + ' of the deck (ordered by English frequency)'; }

/** The real card, gates and facts for one concept in one pair. Throws when the pair has no such card. */
export function lookupConcept(pair, rank, lane) {
  const { known, target, deck } = deckFor(pair);
  const card = deck.cards.find((c) => c.rank === rank);
  if (!card) {
    const dropped = deck.dropped.find((d) => d.id === rank);
    throw new Error('concept #' + rank + ' has no card in ' + pair + (dropped ? ' (' + dropped.reason + ')' : ''));
  }
  const correctLane = Number.isInteger(lane) ? lane : 1;
  const gates = [];
  const wrong = card.d.slice();
  const wrongRoman = (card.dRoman || []).slice();
  for (let i = 0; i < 3; i++) {
    if (i === correctLane) gates.push({ label: card.ans, roman: card.ansRoman || '', correct: true });
    else gates.push({ label: wrong.shift(), roman: wrongRoman.shift() || '', correct: false });
  }
  const concept = CONCEPTS[rank - 1];
  return {
    pair, known, target, rank, cardId: cardId(known, target, rank), concept: concept && concept.en,
    hint: card.bw[0], answer: card.ans, roman: card.ansRoman || '', gates, correctLane,
    inCore1000: rank <= 1000, rankPhrase: rankPhrase(rank)
  };
}

export function loadHolds() {
  return JSON.parse(readFileSync(resolve(ROOT, 'data/content-hold.json'), 'utf8')).holds || [];
}

// ---------------------------------------------------------------------------------------------------------------------
// the copy rules
// ---------------------------------------------------------------------------------------------------------------------

const RANK_BANNED = [
  [/\btop[\s-]*\d+/i, 'a "top N" claim: the deck ranking follows English frequency, so use {{rank:N}} for an honest rank phrase'],
  [/\b(most|more)[\s-](common|used|frequent|popular)\b[^.]*\b(words?|terms?)\b/i, 'a "most common/used words" claim about a language: the deck has no ranking of the language\'s own frequency'],
  [/\bfirst\s+\d+\s+words?\b/i, 'a "first N words" claim: use {{rank:N}}'],
  [/\b(word\s*)?#\s*\d+/i, 'a bare rank number: use {{rank:N}} so the wording stays honest'],
  [/\brank(ed|ing)?\b/i, 'the word "rank": use {{rank:N}}']
];

const PRONUNCIATION_BANNED = [
  /\b(hard|hardest|difficult|impossible|tricky|tough)\s+(word\s+)?to\s+(pronounce|say)\b/i,
  /\b(hardest|toughest|trickiest)\b[^.]*\b(pronounce|pronunciation|say)\b/i,
  /\bmispronounc/i,
  /\btongue[\s-]?twist/i,
  /\bpronunciation\b[^.]*\b(hard|difficult|tricky|tough|impossible)\b/i,
  /\b(hard|difficult|tricky|tough|impossible)\b[^.]*\bpronunciation\b/i
];

const MECHANICS_BANNED = [
  /\bgates?\b/i, /\blanes?\b/i, /\bhush\b/i, /\brunner\b/i, /\bpower-?ups?\b/i, /\bauto-?pilot\b/i, /\bfsrs\b/i,
  /\bspaced[\s-]repetition\b/i, /\balgorithm\b/i, /\bseeded?\b/i, /\bbuildDeck\b/i, /\bjson\b/i, /\bdeck\b/i, /\bcards?\b/i,
  /\bfrequency\b/i, /\bapp store\b/i, /\bcommit\b/i, /\bchangelog\b/i, /\bbuild\b/i, /\bupdate\b/i, /\bversion\b/i
];

const MULTIPLE_CHOICE = [
  /\bwhich\s+(one\s+)?of\s+(these|the\s+following|them)\b/i,
  /\bpick\s+(one|a|the\s+right)\b/i,
  /\bchoose\s+(one|a|the\s+right|between)\b/i,
  /(^|\n|\s)[A-D]\)\s+\S.*\s[A-D]\)\s+\S/s,
  /\b(left|middle|right)\s*(,|or)\s*(left|middle|right|centre|center)\b/i,
  /\bA\s*,\s*B\s*(,|or)\s*C\b/
];

// Letters outside Latin that a viewer who knows none of the language cannot read
const NON_LATIN = /\p{Script=Greek}|\p{Script=Cyrillic}|\p{Script=Hebrew}|\p{Script=Arabic}|\p{Script=Devanagari}|\p{Script=Thai}|\p{Script=Hangul}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Han}/u;

const DASHES = /[-\u2010-\u2015\u2212\u2043\uFE58\uFE63\uFF0D]/;

// ad speak and theatre: refused wherever it appears
const AD_SPEAK = [
  /\bgame[\s]?chang/i, /\bunlock(ed|s|ing)?\b/i, /\bsupercharge/i, /\blevel[\s]?up\b/i, /\bmaster(ing)?\s+(a|the|any|every)\b/i,
  /\brevolution/i, /\bultimate\b/i, /\bsecret(s)?\b/i, /\bhacks?\b/i, /\bmind[\s]?blow/i, /\bwon'?t believe\b/i, /\bamazing\b/i,
  /\bincredible\b/i, /\bmust[\s]?(see|try|have|watch)\b/i, /\bdon'?t miss\b/i, /\blimited time\b/i, /\bfluent in\b/i, /\bin just \d+/i,
  /\bshocking\b/i, /\bobsessed\b/i, /\bdownload now\b/i, /\bclick (the )?link\b/i, /\bsign up\b/i, /\bsmash\b/i, /\bnext level\b/i
];

/** Natural copy: whole sentences, plain emphasis, no ad speak. Heuristics: a person still reads every post. */
export function naturalCopyErrors(text, slide) {
  const errors = [];
  const t = String(text || '');
  if (/!/.test(t)) errors.push(slide + ': an exclamation mark (copy should sound like a person, not an advert)');
  if (/\.{2,}|\u2026/.test(t)) errors.push(slide + ': an ellipsis (theatrical)');
  if (/\b[A-Z]{3,}\b/.test(t)) errors.push(slide + ': a word in capital letters (shouting); use plain words');
  AD_SPEAK.forEach((re) => { const m = t.match(re); if (m) errors.push(slide + ': ad speak ("' + m[0] + '")'); });
  // sentences: split on . ? : and newlines; a theatrical fragment is a sentence of fewer than three words
  const sentences = t.split(/[.?\n]+/).map((x) => x.trim()).filter(Boolean);
  sentences.forEach((x) => {
    const words = (x.match(/[\p{L}\p{M}']+/gu) || []);
    if (words.length > 0 && words.length < 3) errors.push(slide + ': a very short fragment ("' + x + '"): write whole sentences');
  });
  // a word said twice in a row as its own sentence ("Burro. Burro.") is a stunt
  const repeats = t.match(/\b([\p{L}']+)[.?]\s+\1\b/giu);
  if (repeats) errors.push(slide + ': the same word repeated for effect ("' + repeats[0] + '")');
  return errors;
}

/** Expand {{rank:N}} tokens into the one honest wording. Anything else with a rank in it is refused by checkCopy. */
export function expandTokens(text) {
  return String(text || '').replace(/\{\{rank:(\d+)\}\}/g, (_, n) => rankPhrase(Number(n)));
}

/**
 * Check one piece of player-facing copy. `slide` is 'hook', 'payoff' or 'caption'.
 * Returns { errors: string[], warnings: string[] }.
 */
export function checkCopy(raw, slide, ctx) {
  const errors = [];
  const warnings = [];
  const text = String(raw || '');
  // the honest rank phrase is allowed to mention the deck and the frequency order, so test the copy without it
  const stripped = text.replace(/\{\{rank:\d+\}\}/g, '');
  RANK_BANNED.forEach(([re, why]) => { if (re.test(stripped)) errors.push(slide + ': ' + why); });
  PRONUNCIATION_BANNED.forEach((re) => { if (re.test(stripped)) errors.push(slide + ': pronunciation-difficulty claim (the data has nothing to support it)'); });
  MECHANICS_BANNED.forEach((re) => { const m = stripped.match(re); if (m) errors.push(slide + ': game mechanics or developer wording ("' + m[0] + '"): copy is player-facing curiosity only'); });
  if (MULTIPLE_CHOICE.some((re) => re.test(stripped))) errors.push(slide + ': multiple-choice style: the hook must stand on its own as a curiosity');
  // owner rule: never a hyphen or a dash in rendered copy; periods, commas and colons only
  if (DASHES.test(text)) errors.push(slide + ': a hyphen or dash in the copy (never allowed: use periods, commas or colons)');
  // owner rule: it has to read like a person wrote it
  errors.push(...naturalCopyErrors(text.replace(/\{\{rank:\d+\}\}/g, 'word number of the deck'), slide));
  if (slide === 'hook') {
    if (NON_LATIN.test(stripped)) errors.push('hook: contains non-Latin script; slide 1 must make sense to someone who knows none of the language (show the word on slide 2)');
    if (ctx && ctx.targetWords) {
      const found = (stripped.toLowerCase().match(/[\p{L}']+/gu) || []).filter((w) => ctx.targetWords.has(w) && !ctx.englishWords.has(w));
      if (found.length) warnings.push('hook: contains target-language word(s) ' + found.join(', ') + ': a viewer who knows none of the language cannot read them');
    }
    if (!/[a-z]{4}/i.test(stripped)) errors.push('hook: empty or too short');
  }
  return { errors, warnings };
}

/**
 * Does any concept in the post match a hold? A 'wrong' hold (a gloss known to be wrong) always refuses. A 'doubt' hold (an entry the
 * reviews flagged as imprecise) refuses unless the spec acknowledges it: acknowledge: [{ pair, rank, reason }], for a post that is
 * ABOUT the quirk, with a reason of at least ten characters.
 */
export function checkHolds(pair, ranks, holds, acknowledge) {
  // a post shows the word in BOTH languages of the pair: the hint in the known language and the answer in the target.
  // A hold on either side blocks the post (checking only the target used to let a held hint straight through).
  const pairLangs = [...new Set(String(pair).split('-').filter(Boolean))];
  const errors = [];
  ranks.forEach((r) => {
    holds.forEach((h) => {
      if (h.concept !== r) return;
      const held = h.langs === '*' || (h.langs || []).indexOf('*') >= 0 ? pairLangs : pairLangs.filter((l) => (h.langs || []).indexOf(l) >= 0);
      held.forEach((lang) => {
        const ack = (acknowledge || []).find((a) => a.rank === r && (!a.pair || a.pair === pair) && String(a.reason || '').trim().length >= 10);
        const kind = (h.kinds && h.kinds[lang]) || h.kind;
        if (kind === 'doubt' && ack) return;
        errors.push('hold list: concept #' + r + (h.english ? ' (' + h.english + ')' : '') + ' is on hold for ' + lang + ' (' + (kind === 'wrong' ? 'known wrong' : 'flagged as imprecise; a post about the quirk may acknowledge it') + ': ' + h.reason + ')');
      });
    });
  });
  return errors;
}

/**
 * Validate one hook spec against every standing rule. Never renders; returns the verdict and the real lookups.
 * hook: { id, hook, payoff, pair, concepts:[ranks], verified, expect?:[{rank, answer}], lane?, caption? }
 */
export function validateHook(h, holds) {
  const errors = [];
  const warnings = [];
  const out = { id: h && h.id, errors, warnings, concepts: [] };
  if (!h || typeof h !== 'object') { errors.push('spec is not an object'); return out; }
  ['id', 'hook', 'payoff', 'pair', 'verified', 'vein'].forEach((k) => { if (!h[k]) errors.push('missing field: ' + k); });
  if (h.id && !/^[a-z0-9][a-z0-9-_]*$/i.test(h.id)) errors.push('id must be a plain slug (letters, digits, hyphens, underscores): it names the post\'s output folder, so it cannot contain path separators or dots');
  if (h.vein && VEINS.indexOf(h.vein) < 0) errors.push('vein must be one of ' + VEINS.join(', '));
  if (!Array.isArray(h.concepts) || !h.concepts.length) errors.push('missing field: concepts (a list of deck ranks)');
  if (h.verified && VERIFIED_TAGS.indexOf(h.verified) < 0) errors.push('verified must be one of ' + VERIFIED_TAGS.join(', '));
  if (h.verified === 'needs-check') errors.push('verified is "needs-check": this hook is refused until a human or the panels sign it off and the tag is changed');
  if (errors.length) return out;

  // the real deck facts (a concept is a rank in the post's pair, or { pair, rank } for a word in another pair)
  const items = normConcepts(h);
  items.forEach((it, i) => {
    try {
      out.concepts.push(lookupConcept(it.pair, it.rank, Number.isInteger(h.lane) ? h.lane : (i % 3)));
    } catch (e) { errors.push(e.message); }
  });
  (h.expect || []).forEach((x) => {
    const got = out.concepts.find((c) => c.rank === x.rank && (!x.pair || c.pair === x.pair));
    if (!got) { errors.push('deck check: the spec expects concept #' + x.rank + (x.pair ? ' in ' + x.pair : '') + ', but that concept is not among the post\'s selected concepts, so the expectation checks nothing'); return; }
    if (x.answer && got.answer !== x.answer) errors.push('deck check: #' + x.rank + ' is "' + got.answer + '" in ' + got.pair + ', but the spec expects "' + x.answer + '"');
    if (x.hint && got.hint.toLowerCase().indexOf(String(x.hint).toLowerCase()) < 0) errors.push('deck check: #' + x.rank + ' is "' + got.hint + '", but the spec expects "' + x.hint + '"');
  });
  // a {{rank:N}} token must point at one of the post's own concepts and at a rank the deck actually has: an
  // out-of-range or unrelated rank would print an honest-sounding phrase about the wrong word
  const selectedRanks = new Set(items.map((it) => it.rank));
  [['hook', h.hook], ['kicker', h.kicker || ''], ['payoff', Array.isArray(h.payoff) ? h.payoff.join('\n') : String(h.payoff || '')], ['caption', h.caption || '']].forEach(([slide, text]) => {
    if (!text) return;
    for (const m of String(text).matchAll(/\{\{rank:(\d+)\}\}/g)) {
      const n = Number(m[1]);
      if (n < 1 || n > CONCEPTS.length) errors.push(slide + ': {{rank:' + n + '}} is outside the deck (ranks run 1 to ' + CONCEPTS.length + ')');
      else if (!selectedRanks.has(n)) errors.push(slide + ': {{rank:' + n + '}} does not describe any of this post\'s selected concepts (' + [...selectedRanks].join(', ') + ')');
    }
  });
  if (h.verified === 'deck' && !(h.expect && h.expect.length)) warnings.push('verified "deck" without an expect list: add the expected words so a typo cannot slip through');
  holds && items.forEach((it) => errors.push(...checkHolds(it.pair, [it.rank], holds, h.acknowledge)));

  if (h.overlay) errors.push(...checkOverlay(h.overlay.challenge).errors);

  // the copy
  const ctx = copyContext(h.pair);
  const payoffText = Array.isArray(h.payoff) ? h.payoff.join('\n') : String(h.payoff);
  out.concepts.forEach((c) => { [c.hint, c.answer, c.roman].forEach((w) => { if (w && DASHES.test(w)) errors.push('deck word "' + w + '" contains a hyphen or dash, which the copy rules forbid: choose another word'); }); });
  [['hook', h.hook], ['kicker', h.kicker || ''], ['payoff', payoffText], ['caption', h.caption || '']].forEach(([slide, text]) => {
    if (!text) return;
    const r = checkCopy(text, slide, slide === 'hook' ? ctx : null);
    errors.push(...r.errors); warnings.push(...r.warnings);
  });
  return out;
}

function copyContext(pair) {
  const { known, target } = (() => { const p = String(pair).split('-'); return { known: p[0], target: p[1] }; })();
  const tw = new Set();
  const ew = new Set();
  try {
    wordsFor(target).forEach((e) => { if (e && e[0]) tw.add(String(e[0]).toLowerCase()); });
    wordsFor(known).forEach((e) => { if (e && e[0]) ew.add(String(e[0]).toLowerCase()); });
  } catch { /* no word list: no warning */ }
  return { targetWords: tw, englishWords: ew };
}

// ---------------------------------------------------------------------------------------------------------------------
// variety: layouts, themes, maps, runners, hook veins, and the slide-3 overlay standard
// ---------------------------------------------------------------------------------------------------------------------

/** The five kinds of hook. A week mixes them; the same one never runs twice in a row. */
export const VEINS = ['false-friend', 'meaning-flip', 'etymology', 'same-word-two-meanings', 'cultural-word'];

/** Slide 1/2 compositions. The tool rotates them: never the same layout twice in a row. */
export const LAYOUTS = ['scenario', 'bold-claim', 'big-word', 'story'];

/** Colour themes (all dark with cream type; the accent changes). */
export const THEMES = [
  { id: 'navy-gold', bg: '#0c1430', panel: '#16224a', accent: '#f2b84b', ink: '#f6eedb', footInk: '#0c1430' },
  { id: 'plum-coral', bg: '#1c1030', panel: '#2b1a49', accent: '#ff7d6b', ink: '#f8eee6', footInk: '#1c1030' },
  { id: 'forest-brass', bg: '#0d2a24', panel: '#154036', accent: '#e8c35d', ink: '#f3ecd8', footInk: '#0d2a24' },
  { id: 'ink-teal', bg: '#0a1f2e', panel: '#123349', accent: '#4fd1c5', ink: '#f1efe6', footInk: '#0a1f2e' },
  { id: 'wine-rose', bg: '#2a0f1f', panel: '#411a31', accent: '#f4a6c0', ink: '#f8ece8', footInk: '#2a0f1f' }
];

/** Maps for the slide-3 capture (the game's own scenes; ids are skin ids in js/game/skins.js). `likes` are target languages the scene suits. */
export const MAPS = [
  { id: 'skin_hospital_hallway', label: 'Library Hall', likes: [] },
  { id: 'skin_operating_room', label: 'Translators Booth', likes: [] },
  { id: 'skin_ambulance_bay', label: 'Midnight Platform', likes: [] },
  { id: 'skin_neon_er', label: 'Seoul Neon Alley', likes: ['ko'] },
  { id: 'skin_cafeteria_carnival', label: 'Tokyo Night Market', likes: ['ja'] },
  { id: 'skin_skeletal_corridor', label: 'Calavera Fiesta', likes: ['es'] },
  { id: 'skin_surgical_theater', label: 'Milan Opera House', likes: ['it'] },
  { id: 'skin_neonatal_cloud_nursery', label: 'Lullaby Clouds', likes: ['hi', 'ar'] }
];

/** Runners for the capture (equipped avatar ids). */
export const RUNNERS = [
  { id: 'avatar_intern', label: 'Newcomer (fox)' }, { id: 'avatar_robot', label: 'Robot Translator' },
  { id: 'avatar_wizard', label: 'Wizard of Words' }, { id: 'avatar_zombie', label: 'Jetlagged Traveller' },
  { id: 'avatar_racecar', label: 'Race Car' }, { id: 'avatar_skeleton', label: 'Fiesta Skeleton' }
];

/**
 * Slide-3 overlay standard: the pill carries the challenge line only. The free to play and link in bio message lives only in the footer
 * band, never in the pill, so it is never said twice. Never a claim that this word is in the game.
 */
export const OVERLAY_CHALLENGES = [
  'Spot it at full speed in Language Dash.',
  'Think you could steer to it in time? Try Language Dash.',
  'Now try it with a clock running, in Language Dash.',
  'Can you still find it when the track is moving? Try Language Dash.',
  'Same kind of question, at running speed, in Language Dash.',
  'Test your eye at full speed in Language Dash.'
];

const OVERLAY_CLAIMS = [
  /\b(this|that|the|today'?s)\s+(exact\s+|very\s+)?(word|card|one)\b[^.]*\b(is|are|appears?|shows?\s+up)\s+(in|inside|on)\b/i,
  /\b(this|that)\s+(exact\s+|very\s+)?(word|card)\s+(is\s+)?(in|inside)\s+(the\s+)?(game|app|language dash)\b/i,
  /\byou('ll| will| can)\s+(see|find|meet|get|learn)\s+(this|that|it|these|those)\b/i,
  /\b(in|inside)\s+the\s+(game|app)\s*(too|as well)?\b[^.]*\b(word|card)\b/i,
  /\b(this|that)\s+(exact\s+)?(word|card|question)\s+(awaits|is waiting|is there)\b/i
];

/** Check the text of the slide-3 pill (the challenge line). */
export function checkOverlay(challenge) {
  const errors = [];
  const text = String(challenge || '');
  OVERLAY_CLAIMS.forEach((re) => { if (re.test(text)) errors.push('slide 3 pill: it claims this word is in the game; use a challenge line instead'); });
  if (/\bfree\b|link in bio|\bdownload\b|\bsign up\b/i.test(text)) errors.push('slide 3 pill: the free to play and link in bio message belongs only in the footer band, never in the pill');
  if (!/language dash/i.test(text)) errors.push('slide 3 pill: it must name Language Dash');
  if (!text.trim()) errors.push('slide 3 pill: empty');
  errors.push(...checkCopy(text, 'slide 3 pill').errors.filter((e) => !/Language Dash/.test(e)));
  return { errors: Array.from(new Set(errors)) };
}

function pickNext(options, prev, usage, preferred) {
  // an option that is not the previous one, least used so far, the preferred one winning a tie
  const candidates = options.filter((o) => o !== prev);
  const least = Math.min(...candidates.map((o) => usage[o] || 0));
  const pool = candidates.filter((o) => (usage[o] || 0) === least);
  const choice = preferred && pool.indexOf(preferred) >= 0 ? preferred : pool[0];
  usage[choice] = (usage[choice] || 0) + 1;
  return choice;
}

/**
 * Plan a week: give every post a layout, theme, map, runner and overlay line so that nothing repeats back to back, and check the
 * mix of hook veins. `specs` are in posting order. Explicit `layout` / `theme` / `map` / `runner` in a spec are kept, and an
 * explicit repeat back to back is an error. Returns { posts: [{ id, layout, theme, map, runner, challenge }], errors, warnings }.
 */
export function planWeek(specs) {
  const errors = [];
  const warnings = [];
  const posts = [];
  const use = { layout: {}, theme: {}, map: {}, runner: {}, line: {} };
  let prev = {};
  specs.forEach((h, i) => {
    const target = String(h.pair || '').split('-')[1];
    const likedMap = (MAPS.find((m) => m.likes.indexOf(target) >= 0) || {}).id;
    const p = {
      id: h.id, vein: h.vein,
      layout: h.layout || pickNext(LAYOUTS, prev.layout, use.layout),
      theme: h.theme || pickNext(THEMES.map((t) => t.id), prev.theme, use.theme),
      map: h.map || pickNext(MAPS.map((m) => m.id), prev.map, use.map, likedMap),
      runner: h.runner || pickNext(RUNNERS.map((r) => r.id), prev.runner, use.runner),
      challenge: (h.overlay && h.overlay.challenge) || pickNext(OVERLAY_CHALLENGES, prev.challenge, use.line)
    };
    if (h.layout && LAYOUTS.indexOf(h.layout) < 0) errors.push(h.id + ': unknown layout "' + h.layout + '" (use ' + LAYOUTS.join(', ') + ')');
    if (h.theme && !THEMES.some((t) => t.id === h.theme)) errors.push(h.id + ': unknown theme "' + h.theme + '"');
    if (h.map && !MAPS.some((m) => m.id === h.map)) errors.push(h.id + ': unknown map "' + h.map + '"');
    if (h.runner && !RUNNERS.some((r) => r.id === h.runner)) errors.push(h.id + ': unknown runner "' + h.runner + '"');
    ['layout', 'theme', 'map', 'runner'].forEach((k) => { if (prev[k] && p[k] === prev[k]) errors.push(p.id + ': the same ' + k + ' (' + p[k] + ') twice in a row; change it or leave it unset so the tool rotates it'); });
    if (prev.vein && p.vein && p.vein === prev.vein) errors.push(p.id + ': the same hook vein (' + p.vein + ') twice in a row; mix the week');
    posts.push(p);
    prev = p;
    void i;
  });
  const veins = new Set(posts.map((p) => p.vein).filter(Boolean));
  if (posts.length >= 5 && veins.size < 3) warnings.push('this week uses only ' + veins.size + ' kind(s) of hook; mix at least 3 of ' + VEINS.join(', '));
  if (posts.length >= 3) {
    const counts = {};
    posts.forEach((p) => { counts[p.vein] = (counts[p.vein] || 0) + 1; });
    Object.keys(counts).forEach((v) => { if (counts[v] > Math.ceil(posts.length / 2)) warnings.push('more than half of this week is the "' + v + '" vein'); });
  }
  return { posts, errors, warnings };
}
