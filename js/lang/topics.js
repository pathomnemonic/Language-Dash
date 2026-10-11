/**
 * topics.js — the 15 TOPICS (internal name: SUBJECTS) that group the core words, and the word-frequency levels
 * (internal name: EXAM_FILTERS) the player can limit a run to.
 *
 * The master concept list (data/concepts.json) tags each word with one of 24 fine categories; they fold into 15 topics here.
 */

export var TOPICS = Object.freeze([
  'Basics', 'People & Family', 'Body & Health', 'Food & Drink', 'Home & Things', 'Nature & Animals',
  'Travel & Places', 'Time & Numbers', 'Colors & Describing', 'Actions', 'Feelings & Thinking',
  'Talking', 'Work & School', 'Shopping & Money', 'Small Words'
]);

var CAT_TO_TOPIC = {
  basics: 'Basics',
  people: 'People & Family', family: 'People & Family',
  body: 'Body & Health', health: 'Body & Health',
  food: 'Food & Drink',
  home: 'Home & Things', things: 'Home & Things',
  nature: 'Nature & Animals', animals: 'Nature & Animals',
  travel: 'Travel & Places', places: 'Travel & Places',
  time: 'Time & Numbers', numbers: 'Time & Numbers',
  colors: 'Colors & Describing', describing: 'Colors & Describing',
  actions: 'Actions',
  feelings: 'Feelings & Thinking', thinking: 'Feelings & Thinking',
  communication: 'Talking',
  work: 'Work & School', school: 'Work & School',
  shopping: 'Shopping & Money',
  'small-words': 'Small Words'
};

/** @param {string} cat fine category slug @returns {string} one of TOPICS */
export function topicForCategory(cat) { return CAT_TO_TOPIC[cat] || 'Basics'; }

/** Frequency levels: a card carries every level it belongs to (rank 50 is in top100, top300, top600 and all). */
export var LEVELS = Object.freeze([
  { id: 'top100', label: 'First 100', max: 100 },
  { id: 'top300', label: 'First 300', max: 300 },
  { id: 'top600', label: 'First 600', max: 600 },
  { id: 'all', label: 'All 1,000', max: 1000 }
]);

/** @param {number} rank 1-based frequency rank @returns {string[]} level ids this rank belongs to */
export function levelsForRank(rank) {
  return LEVELS.filter(function (l) { return rank <= l.max; }).map(function (l) { return l.id; });
}

/** @param {number} rank @returns {1|2|3} */
export function difficultyForRank(rank) { return rank <= 300 ? 1 : rank <= 700 ? 2 : 3; }
