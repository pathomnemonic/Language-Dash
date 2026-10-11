/**
 * importguide.js — the plain-language instructions for bringing your own words in (Anki vocabulary decks, CSV, or an AI helper).
 *
 * Kept as data and one function so the screens, the tests and the docs all show the same thing. The AI prompt is
 * built from the real list of topics and the player's language pair, so it cannot drift away from what the importer accepts.
 */

import { SUBJECTS } from './cardschema.js';
import { getPairOrDefault } from './lang/pair.js';
import { getLanguage } from './lang/languages.js';

/** The ways in, shortest first. Each has a title and the numbered steps to show. */
export var IMPORT_PATHS = [
  {
    id: 'flashcards',
    title: 'Quickest: an Anki vocabulary deck as flashcards',
    steps: [
      'In Anki desktop: File › Export. Choose "Notes in Plain Text (.txt)" (or "Anki Deck Package (.apkg)"). The front should be the word you know, the back the word you are learning.',
      'Upload that file below, or paste the text. Two columns: front, then back (tab or comma separated).',
      'Tap "Import as flashcards". They appear in My words and in Flashcard mode, with your own spaced-repetition schedule.'
    ]
  },
  {
    id: 'quiz',
    title: 'Better: turn your word pairs into runner gates with an AI chat',
    steps: [
      'Tap "Copy AI prompt" below.',
      'Open any AI chat (ChatGPT, Claude, Gemini). Paste the prompt, then paste your word pairs underneath it.',
      'Copy the AI’s reply (a block of JSON) and paste it into "Paste the AI’s reply", then tap "Import as runner words".',
      'Runner words need two wrong gate words each. The AI invents them, so skim the list for mistakes before relying on it.'
    ]
  }
];

/** What a row of a plain file should look like, shown under the file picker. */
export var FORMAT_HELP = [
  'One word pair per line. The word you know, a tab (or comma), then the word you are learning.',
  'Wrap text in "quotes" when it contains the separator or spans lines.',
  'A first line of "Front,Back" is skipped automatically. Extra columns from Anki (GUID, deck, tags) are ignored.',
  'Fill-in-the-blank notes like {{c1::word}} become one card per blank.'
];

export var FORMAT_EXAMPLE = 'dog\tperro\nhouse\tcasa\nto eat\tcomer';

/** One finished runner word, as the AI should write it. */
export var QUIZ_CARD_EXAMPLE = {
  subj: 'Nature & Animals',
  bw: ['dog'],
  ans: 'perro',
  d: ['gato', 'casa'],
  tp: '“dog” is “perro”. Example: El perro corre.',
  ww: { gato: '“gato” means “cat”.', casa: '“casa” means “house”.' }
};

/**
 * The text to paste into an AI chat. The user pastes their word pairs after it.
 * @param {{known: string, target: string}} [pair] defaults to the player's language pair
 * @returns {string}
 */
export function buildAiPrompt(pair) {
  var p = pair || getPairOrDefault();
  var known = (getLanguage(p.known) || { name: 'English' }).name;
  var target = (getLanguage(p.target) || { name: 'Spanish' }).name;
  return [
    'You are converting my vocabulary list into multiple-choice word cards for a language-learning game (Language Dash). I speak ' + known + ' and I am learning ' + target + '.',
    '',
    'I will paste my word pairs after this message, one per line (a ' + known + ' word, then its ' + target + ' translation) or as free text. Turn each real word pair into ONE JSON object and reply with ONE JSON array and nothing else (no commentary, no code fences).',
    '',
    'Each object has exactly these fields:',
    '- "subj": one of ' + SUBJECTS.map(function (s) { return '"' + s + '"'; }).join(', ') + '. Use "Basics" if unsure.',
    '- "bw": an array with ONE short word in ' + known + ' (the hint). Taken from my list; do not invent words.',
    '- "ans": the correct translation: ONE word in ' + target + ' (a short phrase only if the language needs it). Plain text.',
    '- "d": exactly 2 wrong gate words in ' + target + ': real ' + target + ' words of the same kind as the answer (two other nouns for a noun, two other verbs for a verb). Never the correct answer, never a word that also means the hint, never "N/A".',
    '- "tp": a short example sentence in ' + target + ' using the answer, or a tiny memory trick.',
    '- "ww": an object whose keys are exactly the two wrong words in "d" and whose values say in a few words what each one actually means in ' + known + '.',
    '',
    'Rules:',
    '- Plain text only: no HTML, no markdown, no line breaks inside strings.',
    '- If a line is not a clear word pair (long sentences, images), skip it and keep going.',
    '- If a cloze like {{c1::word}} appears, the hidden part is the answer.',
    '- If you are unsure a translation is right, skip that word.',
    '',
    'Example of one object:',
    JSON.stringify(QUIZ_CARD_EXAMPLE),
    '',
    'My word pairs:'
  ].join('\n');
}

var SUBJECT_BY_LOWER = {};
SUBJECTS.forEach(function (s) { SUBJECT_BY_LOWER[s.toLowerCase()] = s; });

function clean(s) {
  return String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Accept the long names an AI sometimes uses (subject, hint, answer...) and tidy the values. */
export function normalizeAiCard(raw) {
  if (!raw || typeof raw !== 'object') return null;
  var bw = raw.bw || raw.buzzwords || raw.hint || raw.clues || raw.front;
  if (typeof bw === 'string') bw = [bw];
  var d = raw.d || raw.distractors || raw.wrong || raw.wrongAnswers;
  var ww = raw.ww || raw.whyWrong || {};
  var ans = clean(raw.ans || raw.answer || raw.back);
  var subj = SUBJECT_BY_LOWER[String(raw.subj || raw.subject || '').trim().toLowerCase()] || 'Basics';
  var card = {
    subj: subj,
    bw: Array.isArray(bw) ? bw.map(clean).filter(Boolean).slice(0, 1) : [],
    ans: ans,
    d: Array.isArray(d) ? d.map(clean).filter(Boolean) : [],
    tp: clean(raw.tp || raw.teachingPoint || raw.explanation || '') || '',
    ww: {}
  };
  Object.keys(ww && typeof ww === 'object' ? ww : {}).forEach(function (k) { card.ww[clean(k)] = clean(ww[k]); });
  return card;
}

/**
 * Pull the cards out of whatever the AI replied with: bare JSON, JSON inside a code fence, JSON with a sentence
 * before it, or an object like {"cards": [...]}.
 * @param {string} text
 * @returns {{cards: object[], error: string|null, skipped: number}}
 */
export function parseAiReply(text) {
  var t = String(text || '').trim();
  if (!t) return { cards: [], error: 'Paste the AI’s reply first.', skipped: 0 };
  t = t.replace(/```[a-z]*\s*/gi, '').replace(/```/g, '');
  var parsed = null;
  var tries = [t];
  var a = t.indexOf('[');
  var b = t.lastIndexOf(']');
  if (a >= 0 && b > a) tries.push(t.slice(a, b + 1));
  var o = t.indexOf('{');
  var c = t.lastIndexOf('}');
  if (o >= 0 && c > o) tries.push(t.slice(o, c + 1));
  for (var i = 0; i < tries.length && parsed === null; i++) {
    try { parsed = JSON.parse(tries[i]); } catch (e) { parsed = null; }
  }
  if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
    parsed = parsed.cards || parsed.items || parsed.data || [parsed];
  }
  if (!Array.isArray(parsed)) {
    return { cards: [], error: 'That does not look like the JSON the prompt asks for. Ask the AI: "Reply again with only the JSON array."', skipped: 0 };
  }
  var cards = [];
  var skipped = 0;
  parsed.forEach(function (raw) {
    var card = normalizeAiCard(raw);
    var ok = card && card.bw.length && card.ans && card.d.length === 2 &&
      card.d.every(function (x) { return x.toLowerCase() !== card.ans.toLowerCase() && !/^(n\/a|none of the above|all of the above)$/i.test(x); }) &&
      card.d[0].toLowerCase() !== card.d[1].toLowerCase();
    if (ok) cards.push(card); else skipped++;
  });
  if (!cards.length) return { cards: [], error: 'No usable words in that reply (each needs a hint word, an answer word and exactly two different wrong words).', skipped: skipped };
  return { cards: cards, error: null, skipped: skipped };
}
