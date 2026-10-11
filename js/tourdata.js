/**
 * tourdata.js — the spotlight steps of the how-to-play and of the little lessons (see tour.js).
 *
 * The how-to-play only covers the run and the Home screen (buildTourSteps). Every other menu teaches itself the first
 * time the player opens it, by its red dot: a short lesson of a few un-numbered steps (buildLessonSteps, LESSON_STEPS).
 * Every step names the element it highlights, so a change to the page that removes one just turns that step into a
 * plain card with a Next button.
 */

import { storage } from './storage.js';
import { proLive } from './pro.js';
import { LOCKER_ITEMS } from './game/shopdata.js';
import { FEATURES } from './features.js';

function q(selector) { return function () { return document.querySelector(selector); }; }

function tab(screenId) { return '#bottomNav [data-screen="' + screenId + '"]'; }

/** The Locker's trail rows, as { row, buy, equip, owned, price }. */
function trailRows() {
  var rows = document.querySelectorAll('#shopItems .shop-item');
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row.querySelector('[data-prevslot="trail"]')) continue;
    var buy = row.querySelector('.btn-gold');
    var equip = null;
    var buttons = row.querySelectorAll('button');
    for (var b = 0; b < buttons.length; b++) if (/^\s*Equip\s*$/.test(buttons[b].textContent)) equip = buttons[b];
    var price = buy ? Number(String(buy.textContent).replace(/[^0-9]/g, '')) : 0;
    out.push({ row: row, buy: buy, equip: equip, price: price });
  }
  return out;
}

/** The one trail the tour teaches with: the cheapest trail in the Locker, always the same one, so nobody spends coins on a different item each time. */
var CHEAPEST_TRAIL = LOCKER_ITEMS.filter(function (i) { return i.type === 'trail' && i.price > 0; }).sort(function (a, b) { return a.price - b.price; })[0];
export var TOUR_TRAIL_ID = CHEAPEST_TRAIL.id;
export var TOUR_TRAIL_NAME = CHEAPEST_TRAIL.name;

/** The tour trail's row in the Locker, as { row, buy, equip, eye } (any part may be null). */
function tourTrailRow() {
  var rows = trailRows();
  for (var i = 0; i < rows.length; i++) {
    var eye = rows[i].row.querySelector('[data-preview="' + TOUR_TRAIL_ID + '"]');
    if (eye) return { row: rows[i].row, buy: rows[i].buy, equip: rows[i].equip, eye: eye, price: rows[i].price };
  }
  return null;
}

function tourTrailOwned() { return storage.ownsItem(TOUR_TRAIL_ID); }

/** The buy button of the tour trail, but only while it is not yet owned and the player can pay for it. */
export function affordableTrailButton() {
  if (tourTrailOwned()) return null;
  var r = tourTrailRow();
  return r && r.buy && r.price > 0 && r.price <= (storage.get('coins') || 0) ? r.buy : null;
}

function equipTrailButton() {
  var r = tourTrailRow();
  return r && r.equip ? r.equip : null;
}

/** The tour trail's preview eye, for a player who cannot (or no longer needs to) buy it. */
function trailEyeButton() {
  var r = tourTrailRow();
  return r ? r.eye : null;
}

function trailEquipped() {
  var eq = storage.get('equipped') || {};
  return !!eq.trail && eq.trail !== 'trail_none';
}

function lockerTabButton(label) {
  return function () {
    var tabs = document.querySelectorAll('#shopItems [role="tab"]');
    for (var i = 0; i < tabs.length; i++) if (tabs[i].textContent.indexOf(label) >= 0) return tabs[i];
    return null;
  };
}


/** Close a pop-up sheet the way its own Close button does. */
function closeSheet(selector) {
  return function () {
    var btn = document.querySelector(selector + ' .sheet-close');
    if (btn) btn.click();
    else { var el = document.querySelector(selector); if (el) el.classList.remove('active'); }
  };
}

/** The Filters pop-up's folded sections, closed again (so every look starts from the same place). */
function collapseFilterSections() {
  var sections = document.querySelectorAll('#filtersSheet .collapsible-section');
  for (var i = 0; i < sections.length; i++) {
    var body = sections[i].querySelector('.collapsible-body');
    var toggle = sections[i].querySelector('.collapsible-toggle');
    if (body && toggle && !body.hidden && getComputedStyle(body).display !== 'none') toggle.click();
  }
}

function closeVersus() {
  var btn = document.getElementById('mpCloseBtn');
  if (btn) btn.click();
}


/**
 * @param {object} ctx
 * @param {object} ctx.ui the interface (for opening Home)
 * @returns {object[]} steps for startTour()
 */
export function buildAllSteps(ctx) {
  // Pro is only mentioned while it can be bought (or is owned): a quiet word on the way past, never a sales stop
  var live = proLive();
  var pro = function (text) { return live ? ' ' + text : ''; };
  return [
    { id: 'home', title: 'Welcome home', text: 'This is the Home screen. Let\'s look around. Tap each highlighted spot to go on.',
      target: null, press: 'next',
      before: function () { if (ctx && ctx.ui) ctx.ui.show('screenHome'); } },
    { id: 'coins', title: 'Coins and best score', target: '#homeCoinsDisplay', press: 'count',
      text: '🪙 Coins come from runs, quests and the daily reward. ⭐ is your best score, which climbs as you run and jumps with every right answer. You start with a balance to spend in the Locker in a minute.' },
    { id: 'menus', title: 'There is more to find', target: '#bottomNav', press: 'next',
      text: 'That is the Home screen. Everything else has a little red dot: your streak and today\'s goal, Filters, Speed, Flashcards and Challenge, Settings, and the tabs along the bottom. Each section inside Settings and the Locker gets its own dot too. Tap any of them when you feel like it and it will show you around.' },
    { id: 'filters', title: 'Word filters', target: '#filtersBtn', press: 'pass', hint: 'Tap Word filters to look inside',
      text: 'Choose which words you get. Everything is switched on to begin with, so you meet every word. Open it and we will look at each filter.' },
    { id: 'filters-subjects', title: 'Topics', target: '#subjectToggle', press: 'pass', hint: 'Tap Topics to open it',
      before: collapseFilterSections,
      text: 'Pick the topics you want to practise: food this week, travel the next. Open it.' },
    { id: 'filters-subjects-list', title: 'Switch topics on and off', target: '#subjectBody', press: 'next',
      text: 'Tap a topic to switch it on or off, or use Select All and Deselect All. Topics you have mastered get a star.' + pro('Free covers the 300 most common words; Pro opens all 1,000.') },
    { id: 'filters-exam', title: 'Word level', target: '#examFilterToggle', press: 'pass', hint: 'Tap Word level to open it',
      skipIf: function () { return !document.getElementById('examFilterToggle'); },
      text: 'New to the language? Stay with the most common words first. Open it.' },
    { id: 'filters-exam-body', title: 'Pick your level', target: '#examFilterContainer', press: 'next',
      skipIf: function () { return !document.getElementById('examFilterToggle'); },
      after: function () { collapseFilterSections(); closeSheet('#filtersSheet')(); },
      text: 'Choose the first 100, 300 or 600 words, or all 1,000. Only words from that band come up.' },
    { id: 'languages', title: 'Languages', target: '#langBtn', press: 'pass', hint: 'Tap Languages to look inside',
      text: 'This is your language pair: the one you speak and the one you are learning. Open it.' },
    { id: 'languages-body', title: 'Switch any time', target: '#langSheetBody', press: 'next',
      after: closeSheet('#langSheet'),
      text: 'Pick a different language to learn whenever you like, or change the language the hints come in. Progress is kept separately for each pair. For languages like Japanese or Russian you can show a small pronunciation line under each gate word.' },
    // Each way to play gets its own short section: press its button, see what is inside, close it
    { id: 'versus-btn', title: 'Versus', target: '#multiplayerBtn', press: 'pass', hint: 'Tap Versus to look inside',
      text: 'Race a friend live, with the same words at the same moment. Open it. You both need the same language pair.' },
    { id: 'versus', title: 'Racing a friend', target: '#mpContent', press: 'next',
      after: closeVersus,
      text: 'Host Game makes a five-letter room code; your friend types it under Join Game. Then you pick a mode: highest score, Sudden Death (first miss loses) or a race to a number of right answers.' },

    { id: 'flashcards-btn', title: 'Flashcards', target: '#homeFlashcardsBtn', press: 'pass', hint: 'Tap Flashcards to look inside',
      text: 'Calm study with no runner and no lives: flip a word, say it, check it. Open it.' },
    { id: 'flashcards', title: 'Choose your words', target: '#flashcardsList', press: 'next',
      after: closeSheet('#flashcardsSheet'),
      text: 'Study your topics, review the words that are due (timed by FSRS, the same spaced-repetition algorithm Anki uses), drill the ones you miss, or meet new ones. Flip them yourself or listen hands-free. Browse words and My words (your own pairs, or imported from an Anki vocabulary deck) are here too.' + pro('(Words I miss, Browse words, My words and importing are Pro.)') },

    { id: 'challenge-btn', title: 'Challenge', target: '#homeChallengeBtn', press: 'count',
      text: 'Every other way to play lives here: Study (relaxed, no lives lost), Weakness (drills what you miss), the Daily 15, the Weekly Gauntlet, friend challenges and the Word Quiz.' + pro('Study, Weakness and the Word Quiz are Pro, and so are two of the three Versus modes. A small gold PRO tag marks anything Pro opens up.') + ' Have a look when you are ready.' },

    { id: 'challenge-sheet', title: 'Every other way to play', target: '#challengeSheet .sheet-list', press: 'next',
      after: closeSheet('#challengeSheet'),
      text: 'Study (relaxed, no lives lost), Weakness (drills what you miss), the Daily 15, the Weekly Gauntlet, friend challenges and the Word Quiz all live here.' + pro('Study, Weakness and the Word Quiz are Pro, and so are two of the three Versus modes. A small gold PRO tag marks anything Pro opens up.') },
    { id: 'streak-sheet', title: 'Your streak', target: '#streakSheet .sheet-card', press: 'next',
      text: 'The hearth fire counts the days in a row you have practised. Reaching your daily goal keeps it alive; miss a day and it starts over. The calendar shows every day you studied so far.' },
    { id: 'today-sheet', title: 'Today', target: '#todaySheet .sheet-card', press: 'next',
      text: 'Your daily goal in words, how many reviews are due, and the weekly reward you are working toward. A few minutes a day beats one long cram session.' },
    { id: 'settings-keys', title: 'Your keys', target: '#settingsContent', press: 'next',
      text: 'On a computer you can choose the key for every action. Tap a key slot, then press the key you want. If another action already used it, the two swap. The button at the bottom brings back the standard keys.' },
    { id: 'settings-look', title: 'Look and performance', target: '#settingsContent', press: 'next',
      text: 'Colors and Night Shift, colorblind-safe colors, a dyslexia-friendly font, which side your buttons sit on, how dashing works, the camera and graphics. If the game feels slow on your device, lower Graphics or turn on 30 frames per second here.' },
    { id: 'settings-rules', title: 'Your rules', target: '#settingsContent', press: 'next',
      text: 'Switch power-ups, map hazards and the Hush on or off, or pick a relaxed pace. The line at the top says whether your runs are still ranked: change a rule and they become practice, but your coins, levels and streaks still count.' },
    { id: 'settings-study', title: 'Study settings', target: '#settingsContent', press: 'next',
      text: 'Set your daily goal, a daily reminder and the time it arrives, and how strongly words you have never seen are favored. Reaching your daily goal keeps your streak going.' },
    { id: 'locker-heroes', title: 'Heroes', target: '#shopItems', press: 'next',
      text: 'These are the characters you can run as. Tap one to see it up in the display, and tap its story to read who it is. Some can be recolored with Change colors. Heroes you do not own yet show their price.' },
    { id: 'locker-trails', title: 'Trails', target: '#shopItems', press: 'next',
      text: 'Trails stream behind your runner. Tap a row, or its eye, to see the trail up in the display before you spend coins on it. Buy it, then Equip to run with it.' },
    { id: 'locker-maps', title: 'Maps', target: '#shopItems', press: 'next',
      text: 'Maps are the worlds you run through: streets, markets, stations, ruins and more. Tap one to preview it. Each has its own music and surprises, and the ones you own come around in a rotation.' },
    { id: 'locker-monsters', title: 'The Hush', target: '#shopItems', press: 'next',
      text: 'The Hush is the creeping silence that chases you when you slip, and each one comes in its own flavour: the Mumble, the Babble, the Static. Tap one to see it, then equip your favorite.' },
    { id: 'stats-more', title: 'Reading your stats', target: '#statsContent', press: 'next',
      text: 'Scroll down for your accuracy in each topic, the words you miss most, and your recent runs. Pick a weak topic here, then drill it from Challenge so the next run fixes it.' },
    { id: 'quests-more', title: 'Working through quests', target: '#questList', press: 'next',
      text: 'Each quest shows how far along you are. When one is done, tap Claim for its coins. If a quest does not suit you today, you can swap it for a different one for a few coins.' },
    { id: 'profile-pic', title: 'Make it yours', target: '.profile-header', press: 'next',
      text: 'Tap your picture to change it: a face or whole figure of any hero you own, or one of the symbols. Your name goes next to it. Below are your level and rank, and the pinned badges you want to show off.' },

    { id: 'friends-screen', title: 'Friends', target: '#screenLeaderboard h2', press: 'next',
      text: 'Add friends, see their highlights in the feed and make private study groups with a shared weekly goal. It needs a free account.' },
    { id: 'settings-screen', title: 'Settings', target: '#screenSettings .settings-card', press: 'next',
      text: 'Sound, colors, camera, controls and game rules live here, one section at a time. You can replay the how-to-play any time from About & help.' },
    { id: 'friends', title: 'Friends', target: '#leaderboardBtn', press: 'count',
      text: 'Add friends, see their highlights in the feed and make private study groups with a shared weekly goal. It needs a free account (the profile button beside it).' },
    { id: 'settings', title: 'Settings', target: '#settingsBtn', press: 'count',
      text: 'Sound, colors, camera, controls and game rules live here. You can replay this tour any time from Settings, then About, then How to play.' },
    !live ? null : { id: 'pro', title: 'Language Dash Pro', target: '#homeProBanner', press: 'next',
      skipIf: function () { var b = document.getElementById('homeProBanner'); return !b || b.hidden; },
      text: '⚡ Playing is complete without it. Pro is for when you want more: more than 3× the words (1,000 instead of 300), every example, detailed stats, Words I miss, Browse words, My words, Anki import and offline play, plus one free Locker item of your choice. Every new account gets a free 7-day trial, so you can try it all. Tap this button any time to see what is inside.' },

    { id: 'stats-tab', title: 'Stats', target: tab('screenStats'), press: 'pass',
      text: 'Now the tabs along the bottom. Open Stats.' },
    { id: 'stats', title: 'How you are doing', target: '#screenStats .perf-hero', press: 'next',
      text: 'Your accuracy by topic, your weakest words and your recent runs. Use it to decide what to drill next.' + pro('(Topics and Weakest words are part of Pro: look for the gold 🔒.)') },

    { id: 'locker-tab', title: 'Locker', target: tab('screenShop'), press: 'pass',
      text: 'Next, the Locker, where your coins go.' },
    { id: 'locker', title: 'Your hero', target: '#characterPreviewContainer', press: 'next', interactive: true,
      text: 'Everything you pick shows up in this display: your hero, its colors, trails and the Hush. Drag it to spin your hero around. Under it are the tabs, and what you are wearing, with Change colors for heroes that can be recolored.' + pro('Paying Pro members also pick any one item free: look for the green 🎁 FREE button.') },
    { id: 'extras-tab', title: 'Trails', target: lockerTabButton('Trails'), press: 'pass',
      text: 'The Locker starts folded so it fits one screen: tap a tab to open its list, and tap it again to fold it away. Trails stream behind your runner. (Heroes are the characters, Maps are new worlds to run in, and the Hush chases you when you slip.) Open Trails.' },
    // The tour always uses the cheapest trail. It never hands out coins: a new player starts with enough for it, and a
    // player who has done the tour before (or spent the coins) is taken through the same steps in a way that fits.
    { id: 'buy', title: 'Your first trail', target: affordableTrailButton, press: 'pass', hint: 'Tap to buy it',
      skipIf: function () { return !affordableTrailButton(); },
      text: 'You started with some coins, so here is a trail to unlock: the ' + TOUR_TRAIL_NAME + '. Tap its price to buy it. (Tapping a row, or the eye, previews any trail or Hush up in the display first.)' },
    { id: 'preview', title: 'Try a trail', target: trailEyeButton, press: 'pass', hint: 'Tap the eye',
      skipIf: function () { return tourTrailOwned() || !!affordableTrailButton() || !trailEyeButton(); },
      after: function (ctx) { ctx.previewedTrail = true; },
      text: 'Trails cost coins, which you earn by running. Tap the eye to see the ' + TOUR_TRAIL_NAME + ' behind your runner before you save up for it.' },
    { id: 'equip', title: 'Wear it', target: equipTrailButton, press: 'pass', hint: 'Tap Equip',
      skipIf: function () { return !equipTrailButton(); },
      text: 'It is yours. Equip it to run with it.' },
    { id: 'look', title: 'Looking good', target: '#characterPreviewContainer', press: 'next',
      skipIf: function (ctx) { return !trailEquipped() && !(ctx && ctx.previewedTrail); },
      text: 'There it is, streaming behind your runner. Heroes and the Hush work the same way: tap them to see them here.' },

    { id: 'quests-tab', title: 'Quests', target: tab('screenQuests'), press: 'pass',
      text: 'Now Quests.' },
    { id: 'quests', title: 'Daily quests', target: '#screenQuests h2', press: 'next',
      text: 'Six small goals, new every day. Finish them as you play, then claim the coins here.' },

    { id: 'profile-tab', title: 'Profile', target: tab('screenProfile'), press: 'pass',
      text: 'And your Profile.' },
    { id: 'profile', title: 'Your profile', target: '#profileContent', press: 'next',
      text: 'Your name and picture, and your numbers. Make your profile visible so friends can find you. The rows underneath open when you tap them: Account (to save your progress with a free account), your study streak calendar and your badges.' },

    { id: 'back-home', title: 'Back to Home', target: tab('screenHome'), press: 'pass',
      text: 'That is everything. Tap Home to finish.' }
  ].filter(Boolean).filter(function (s) {
    // (Friends need the backend: a build without one has no Friends button, so the tour skips it; Versus is peer to peer and stays)
    return FEATURES.backend || s.id !== 'friends';
  }).map(function (s) {
    if (typeof s.target === 'string') s.target = q(s.target);
    return s;
  });
}

/** The how-to-play's spotlight steps: just the Home screen. Everything else teaches itself from its red dot. */
export function buildTourSteps(ctx) {
  return buildAllSteps(ctx).filter(function (s) { return s.id === 'home' || s.id === 'coins' || s.id === 'menus'; });
}

/**
 * The lesson each red-dotted thing teaches when it is first opened, as the ids of the steps to show (after the thing
 * itself has opened). The keys are the discovery ids of discoverydots.js.
 */
export var LESSON_STEPS = {
  'home:filters': ['filters-subjects', 'filters-subjects-list', 'filters-exam', 'filters-exam-body'],
  'home:languages': ['languages-body'],
  'home:versus': ['versus'],
  'home:flashcards': ['flashcards'],
  'home:challenge': ['challenge-sheet'],
  'home:friends': ['friends-screen'],
  'home:settings': ['settings-screen'],
  'home:streak': ['streak-sheet'],
  'home:today': ['today-sheet'],
  'settings:keys': ['settings-keys'],
  'settings:look': ['settings-look'],
  'settings:rules': ['settings-rules'],
  'settings:study': ['settings-study'],
  'locker:heroes': ['locker-heroes'],
  'locker:trails': ['locker-trails'],
  'locker:maps': ['locker-maps'],
  'locker:monsters': ['locker-monsters'],
  'tab:stats': ['stats', 'stats-more'],
  'tab:locker': ['locker', 'extras-tab', 'buy', 'preview', 'equip', 'look'],
  'tab:quests': ['quests', 'quests-more'],
  'tab:profile': ['profile', 'profile-pic']
};

/** The steps of one lesson (empty when that thing has none). */
export function buildLessonSteps(id, ctx) {
  var wanted = LESSON_STEPS[id];
  if (!wanted) return [];
  var all = buildAllSteps(ctx);
  return wanted.map(function (stepId) { return all.filter(function (s) { return s.id === stepId; })[0]; }).filter(Boolean);
}
