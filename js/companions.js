/**
 * companions.js — the travel buddy ("Pal"): a small companion that lives on the Home screen.
 *
 * A pal reacts to how you are practising: it cheers at streak milestones and new bests, is happy when you have studied
 * today, naps when you have been away for a couple of days, and gets sleepy late at night. It speaks in a few short,
 * kind lines (its own personality each) and lends its voice to the daily reminder. It never scolds and never blocks
 * anything. Pure data and rules; palui.js draws it and the Locker sells it.
 */

export var NO_PAL = 'pal_none';
export var DEFAULT_PAL = 'pal_snail';

/**
 * Tones: how a buddy talks. Each tone has lines for every mood. {name} is the buddy's name, {n} the study streak.
 */
var TONES = {
  cheery: {
    greet: ['Hi hi! Ready to learn something?', 'You came back! Yay!', 'Let\'s go, {n} days strong!'],
    happy: ['{n} days in a row. I\'m so proud!', 'You\'re on a roll today!', 'Studying looks good on you.'],
    cheer: ['WOW! Look at you go!', 'That was amazing!', 'Best. Run. Ever. (So far!)'],
    nap: ['Zzz... oh! You\'re back!', '*yawn* I missed you!', 'I fell asleep waiting. Hi!'],
    sleepy: ['It\'s late... one more word?', 'Getting sleepy, but I\'m with you.', 'A short run, then bed?'],
    remind: ['{name} here! A few words today keeps the {n}-day streak glowing.', 'Hi! {name} is waiting. Five minutes?']
  },
  sleepy: {
    greet: ['Mmm... hi. Let\'s study slowly.', 'Oh. You\'re here. Good.', 'Cozy day for words.'],
    happy: ['{n} days. Not bad at all.', 'Nice and steady. I like it.', 'Good pace. Keep it gentle.'],
    cheer: ['Oh! That was pretty great.', 'Whoa. Okay, I\'m awake now.', 'Impressive, even for a nap-lover.'],
    nap: ['Zzz... huh? You\'re back.', '*stretches* Hello again.', 'Slept in. Missed you though.'],
    sleepy: ['Eyes heavy... you do you.', 'Late already. I\'m with you.', 'Maybe one more, then rest.'],
    remind: ['{name}: whenever you\'re ready, a couple of words keeps your {n}-day streak cozy.', '{name} is awake just for you. A quick run?']
  },
  sassy: {
    greet: ['Oh, look who showed up.', 'Ready to be brilliant?', 'Let\'s make those words nervous.'],
    happy: ['{n} days. Okay, I\'m impressed.', 'Look at you being consistent.', 'I knew you had it in you.'],
    cheer: ['Okay, show-off. I see you.', 'THAT is how it\'s done.', 'Tell the other words to run.'],
    nap: ['I was napping, not worried. Hi.', 'Took your time, huh? Welcome back.', 'Zzz... fine, I missed you.'],
    sleepy: ['Studying at this hour? Bold.', 'Late-night genius mode, I respect it.', 'One more, then sleep. Deal?'],
    remind: ['{name}: your {n}-day streak isn\'t going to feed itself.', '{name} says: words. You. Five minutes. Go.']
  },
  wise: {
    greet: ['Small steps, every day. Welcome.', 'Let\'s learn something true today.', 'The mind grows with practice.'],
    happy: ['{n} days of practice. Well done.', 'Steady work beats rushing.', 'You are building something lasting.'],
    cheer: ['Remarkable. Remember this feeling.', 'A fine run. Learn from it.', 'Excellence is a habit, and you have it.'],
    nap: ['I rested while you were away. Welcome back.', 'No shame in a pause. Shall we continue?', 'The path was waiting for you.'],
    sleepy: ['Rest is part of learning too.', 'A tired mind forgets. One more, then sleep.', 'The night is for consolidating memories.'],
    remind: ['{name}: a little practice today keeps your {n}-day streak alive.', '{name} suggests a short study session.']
  },
  bold: {
    greet: ['Let\'s crush some words!', 'Time to run!', 'Today we level up!'],
    happy: ['{n} days! Unstoppable!', 'You\'re in beast mode!', 'Keep that fire burning!'],
    cheer: ['BOOM! Unreal!', 'LEGENDARY!', 'Absolutely crushed it!'],
    nap: ['*snort* I\'m awake! Let\'s go!', 'Back at last! Let\'s run!', 'I rested up for this. You ready?'],
    sleepy: ['Even heroes get sleepy. One more!', 'Night run? I\'m in.', 'A last sprint before bed!'],
    remind: ['{name}: {n} days strong! Don\'t let the streak slip. Let\'s run!', '{name} is ready to run. Are you?']
  }
};

/** The buddies. `tone` picks how they talk. */
export var PALS = [
  { id: 'pal_snail', name: 'Snail Mail', emoji: '🐌', tone: 'sleepy', price: 0, color: 0xf2b134, desc: 'Carries every word to you in its own time. It always gets there.' },
  { id: 'pal_axolotl', name: 'Axo', emoji: '🦎', tone: 'cheery', price: 400, color: 0xf6b3c4, desc: 'Smiles like it knows the subjunctive. Mexico City water-baby.' },
  { id: 'pal_dumpling', name: 'Baozi', emoji: '🥟', tone: 'cheery', price: 700, color: 0xfff6e6, desc: 'Steamed, soft and stuffed with vocabulary.' },
  { id: 'pal_llama', name: 'Llama Drama', emoji: '🦙', tone: 'sassy', price: 600, color: 0xf1e3c4, desc: 'Carried a phrasebook over the Andes and has opinions about it.' },
  { id: 'pal_magpie', name: 'Magpie', emoji: '🐦', tone: 'sassy', price: 800, color: 0x1b2a41, desc: 'Collects shiny words and hides the best ones in your pockets.' },
  { id: 'pal_kite', name: 'Kite', emoji: '🪁', tone: 'cheery', price: 900, color: 0xd9432c, desc: 'Rides every breeze to a new word, string and all.' },
  { id: 'pal_capybara', name: 'Capy', emoji: '🦫', tone: 'sleepy', price: 1000, color: 0xb98a5a, desc: 'Sits in the hot spring, unbothered by irregular verbs.' },
  { id: 'pal_bonsai', name: 'Bonsai', emoji: '🎍', tone: 'wise', price: 1300, color: 0x5cb87a, desc: 'A tiny tree that grows one leaf per word you learn.' },
  { id: 'pal_teapot', name: 'Chai', emoji: '☕', tone: 'wise', price: 1500, color: 0x0e8c8a, desc: 'A teapot that whistles hello in every language it has ever steeped.' },
  { id: 'pal_matryoshka', name: 'Babushka', emoji: '🪆', tone: 'wise', price: 1800, color: 0xd9432c, desc: 'A nesting doll: every word has a smaller word inside.' },
  { id: 'pal_balloon', name: 'Montgolfier', emoji: '🎈', tone: 'bold', price: 2200, color: 0xf2b134, desc: 'A hot-air balloon who has seen every border from above.' },
  { id: 'pal_train', name: 'Choo-Choo', emoji: '🚂', tone: 'bold', price: 2800, color: 0x0e8c8a, desc: 'A mini steam train that stops at every station you know.' },
  { id: 'pal_inkling', name: 'Inkling', emoji: '✒️', tone: 'bold', price: 3500, color: 0x2f5d8c, desc: 'A blot of ink with big eyes, a quill and bigger plans.' }
];

export function getPal(id) {
  for (var i = 0; i < PALS.length; i++) if (PALS[i].id === id) return PALS[i];
  return null;
}

/** Whole days between two YYYY-MM-DD dates (b minus a); 0 when either is missing. */
function daysBetweenKeys(a, b) {
  if (!a || !b) return 0;
  var da = new Date(a + 'T12:00:00');
  var db = new Date(b + 'T12:00:00');
  if (isNaN(da) || isNaN(db)) return 0;
  return Math.round((db - da) / 86400000);
}

/**
 * How the buddy is feeling.
 * @param {{studiedToday: boolean, streak: number, lastStudyDate: string|null, today: string, hour: number, event?: string}} s
 *   event: 'milestone' | 'best' | 'levelup' for a moment worth cheering
 * @returns {'cheer'|'nap'|'sleepy'|'happy'|'greet'}
 */
export function palMood(s) {
  if (s.event === 'milestone' || s.event === 'best' || s.event === 'levelup') return 'cheer';
  var away = s.lastStudyDate ? daysBetweenKeys(s.lastStudyDate, s.today) : 0;
  if (!s.studiedToday && away >= 2) return 'nap';
  if (s.hour >= 22 || s.hour < 5) return 'sleepy';
  if (s.studiedToday && s.streak >= 1) return 'happy';
  return 'greet';
}

/** Is this streak one the buddy celebrates? */
export function isPalMilestone(streak) {
  return streak === 3 || streak === 7 || streak === 14 || streak === 30 || streak === 50 || streak === 100 || (streak > 100 && streak % 100 === 0);
}

function fill(text, pal, streak) {
  return text.replace(/\{name\}/g, pal.name).replace(/\{n\}/g, String(Math.max(0, streak || 0)));
}

/**
 * A short line for the buddy to say.
 * @param {object} pal
 * @param {string} mood greet | happy | cheer | nap | sleepy
 * @param {number} streak
 * @param {function(): number} [rand]
 */
export function palLine(pal, mood, streak, rand) {
  var tone = TONES[pal.tone] || TONES.cheery;
  var list = tone[mood] || tone.greet;
  return fill(list[Math.floor((rand || Math.random)() * list.length) % list.length], pal, streak);
}

/** The daily reminder in the buddy's voice. */
export function palReminder(pal, streak, rand) {
  var tone = TONES[pal.tone] || TONES.cheery;
  var list = streak >= 1 ? tone.remind : [pal.name + ' is waiting. A few words today?'];
  return fill(list[Math.floor((rand || Math.random)() * list.length) % list.length], pal, streak);
}

/** For tests: every line a tone can say. */
export function allLines() {
  var out = [];
  Object.keys(TONES).forEach(function (t) { Object.keys(TONES[t]).forEach(function (m) { TONES[t][m].forEach(function (l) { out.push({ tone: t, mood: m, line: l }); }); }); });
  return out;
}
