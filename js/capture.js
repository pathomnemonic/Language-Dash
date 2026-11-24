/**
 * capture.js: deterministic clip capture, for marketing assets (social video). Not a player feature.
 *
 * Never shipped: it exists only in a build made with VITE_FEATURE_CAPTURE=1 (js/features.js), and only does anything on a page opened
 * with ?clip=1. A normal build does not even contain this file (tests/unit/capture.test.js builds one and checks).
 *
 *   /?clip=1&pair=en-hi&concept=214&lane=1&outcome=hit&map=skin_neon_er&hero=avatar_robot&approach=3&duration=6&seed=7
 *
 *   clip       1 (required)
 *   pair       known-target language pair, e.g. en-hi (the page reloads once if the saved pair differs)
 *   concept    the deck rank(s) to ask, in order, e.g. 214 or 214,215 (the number in the card id, en-hi-214); any rank, free or not
 *   lane       0, 1 or 2: where the correct gate stands, per concept (a single value applies to all). Default 1
 *   outcome    hit (steer through the correct gate) or miss (steer into a wrong gate), per concept. Default hit
 *   steer      explicit steering instead of the automatic kind, seconds from GO: "0.8:0,2.4:2" (applies to the whole clip)
 *   lead       seconds before a gate at which the automatic steering starts (default 1.1)
 *   approach   seconds from GO (and between questions) until the runner reaches the gate (default 3.2)
 *   map        a map id or name from js/game/skins.js (counts as owned); default: the game's own choice
 *   hero       a hero id from js/game/shopdata.js (counts as owned); default: the equipped one
 *   seed       the seed for every random choice in the run (default 1)
 *   duration   seconds the clip lasts, from GO (default 6): the tool steps this many frames
 *   start      run (default: the clip starts at GO) or intro (the clip includes the countdown fly-in)
 *   hush       on (default) or off: the monster behind the runner
 *   obstacles  off (default) or on: gurneys and signs on the track (off keeps a scripted answer from being spoiled by a collision)
 *   hazards    off (default) or on: the map's own weather and hazards
 *
 * How it stays smooth: the game's clock is replaced by a virtual one. Nothing runs in real time. window.__clip.step() advances the
 * clock by exactly 1/30 s (two 1/60 s game steps), fires every timer and animation that falls in that time, renders, and returns; the
 * caller (tools/clip/capture-clip.mjs) takes one picture per step. A slow computer therefore makes the capture take longer, never
 * choppier, and the same URL gives the same frames.
 */

import { getPair, setPair } from './lang/pair.js';
import { cardId } from './lang/deck.js';
import { SKINS, mapItemId } from './game/skins.js';
import { VISUAL_SPEED, removeAndDispose } from './game/enginedefs.js';

var FPS = 30;
var STEP_MS = 1000 / FPS;
var SUB_MS = STEP_MS / 2;

function params() { return new URLSearchParams(window.location.search); }
function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
function list(v) { return v ? String(v).split(',').map(function (s) { return s.trim(); }).filter(Boolean) : []; }

// ---------------------------------------------------------------------------------------------------------------------
// the virtual clock
// ---------------------------------------------------------------------------------------------------------------------

var clock = null;

function installClock(seed) {
  var EPOCH = 1700000000000;
  var vnow = 10000;
  var nextId = 1;
  var timers = [];
  var rafs = [];
  var animStart = new Map();
  var RealDate = Date;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rng = mulberry32(seed);
  Math.random = function () { return rng(); };
  var forced = null;
  var seeded = Math.random;
  Math.random = function () { if (forced !== null) return forced; return seeded(); };

  window.performance.now = function () { return vnow; };
  class VDate extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(EPOCH + vnow); }
    static now() { return EPOCH + vnow; }
  }
  window.Date = VDate;

  function addTimer(fn, ms, repeat, args) {
    var id = nextId++;
    timers.push({ id: id, at: vnow + Math.max(0, +ms || 0), every: repeat ? Math.max(1, +ms || 1) : 0, fn: fn, args: args });
    return id;
  }
  window.setTimeout = function (fn, ms) { return addTimer(fn, ms, false, Array.prototype.slice.call(arguments, 2)); };
  window.setInterval = function (fn, ms) { return addTimer(fn, ms, true, Array.prototype.slice.call(arguments, 2)); };
  window.clearTimeout = window.clearInterval = function (id) { timers = timers.filter(function (t) { return t.id !== id; }); };
  window.requestAnimationFrame = function (cb) { var id = nextId++; rafs.push({ id: id, cb: cb }); return id; };
  window.cancelAnimationFrame = function (id) { rafs = rafs.filter(function (r) { return r.id !== id; }); };

  /** CSS animations and transitions follow the virtual clock too, so a HUD flash lasts the same number of frames every time. */
  function syncAnimations() {
    if (!document.getAnimations) return;
    document.getAnimations().forEach(function (a) {
      try {
        if (a.playState === 'finished' || a.playState === 'idle') return;
        if (!animStart.has(a)) animStart.set(a, vnow - (Number(a.currentTime) || 0));
        a.pause();
        a.currentTime = vnow - animStart.get(a);
      } catch (e) { /* an animation that cannot be set stays as it is */ }
    });
  }

  clock = {
    now: function () { return vnow; },
    force: function (v) { forced = v; },
    /** Move the clock forward, firing timers in order. */
    advance: function (ms) {
      var target = vnow + ms;
      for (;;) {
        var due = null;
        for (var i = 0; i < timers.length; i++) if (timers[i].at <= target && (!due || timers[i].at < due.at || (timers[i].at === due.at && timers[i].id < due.id))) due = timers[i];
        if (!due) break;
        vnow = Math.max(vnow, due.at);
        if (due.every) due.at += due.every; else timers = timers.filter(function (t) { return t !== due; });
        try { due.fn.apply(window, due.args || []); } catch (e) { /* a timer that throws does not stop the clip */ }
      }
      vnow = target;
      var run = rafs; rafs = [];
      run.forEach(function (r) { try { r.cb(vnow); } catch (e) { /* ignore */ } });
      syncAnimations();
    }
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// page preparation (before the game starts) and the scripted run
// ---------------------------------------------------------------------------------------------------------------------

var STYLE = [
  // everything that is not the game: pop-ups, navigation and developer chrome
  '#dailyReward, #tutorialOverlay, #bottomNav, #noticeDock, #pauseBtn, #dashBtn, #autoBtn, #sideRun, #sideKeys, #opponentHud,',
  '#feedbackToast, .toast, .notice-chip, .update-banner, #updateBanner, .new-dot, .lesson-dot, .install-banner, #analyticsConsent { display: none !important; }',
  '* { caret-color: transparent !important; }'
].join('\n');

/** Called right after the save is loaded, before anything is drawn: full graphics, no tutorial, no pop-ups, the map and the hero. */
export function prepareClip(storage) {
  var p = params();
  storage.data.firstRunComplete = true;
  storage.data.settings.quality = 'high';
  storage.data.settings.reducedMotion = false;
  storage.data.settings.batterySaver = false;
  storage.set('hazardsOff', p.get('hazards') !== 'on');
  storage.set('monsterOff', p.get('hush') === 'off');
  var owned = storage.data.progression.ownedItems;
  var mapWanted = p.get('map');
  if (mapWanted) {
    var skin = SKINS.filter(function (s) { return s.id === mapWanted || s.name === mapWanted; })[0];
    if (skin) {
      if (owned.indexOf(mapItemId(skin)) < 0) owned.push(mapItemId(skin));
      storage.set('preferredMap', skin.id);
    }
  }
  var hero = p.get('hero');
  if (hero) {
    if (owned.indexOf(hero) < 0) owned.push(hero);
    storage.data.progression.equipped.skin = hero;
  }
  var style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);
}

/** @returns {{lane:number,outcome:string}} */
function plan(i, lanes, outcomes) {
  var lane = parseInt(lanes[Math.min(i, lanes.length - 1)], 10);
  return { lane: lane >= 0 && lane <= 2 ? lane : 1, outcome: (outcomes[Math.min(i, outcomes.length - 1)] || 'hit') === 'miss' ? 'miss' : 'hit' };
}

/**
 * Start the scripted run. deps: { game, ui, storage, launchRun, frame, cardById, setLibraryUnlocked }.
 * `frame(nowMs)` is main.js's own per-frame function (update + render), so a captured frame is exactly a played frame.
 */
export function startClip(deps) {
  var p = params();
  var game = deps.game;
  var api = { ready: false, error: '', fps: FPS, frame: 0, t: 0, info: null, events: [] };
  window.__clip = api;
  try {
    var pair = (p.get('pair') || '').split('-');
    var saved = getPair();
    if (pair.length === 2 && (!saved || saved.known !== pair[0] || saved.target !== pair[1])) {
      if (window.sessionStorage.getItem('ld_clipPairSet') === p.get('pair')) throw new Error('the pair ' + p.get('pair') + ' could not be applied');
      setPair(pair[0], pair[1]);
      window.sessionStorage.setItem('ld_clipPairSet', p.get('pair'));
      window.location.reload();
      return;
    }
    var now = getPair() || { known: 'en', target: 'es' };
    var ranks = list(p.get('concept')).map(function (r) { return parseInt(r, 10); }).filter(function (r) { return r > 0; });
    if (!ranks.length) throw new Error('concept= is required (one or more deck ranks)');
    var ids = ranks.map(function (r) { return cardId(now.known, now.target, r); });
    ids.forEach(function (id) { if (!deps.cardById(id)) throw new Error('no card ' + id + ' in this pair'); });
    var lanes = list(p.get('lane')).length ? list(p.get('lane')) : ['1'];
    var outcomes = list(p.get('outcome'));
    var approach = num(p.get('approach'), 3.2);
    var lead = num(p.get('lead'), 1.1);
    var duration = num(p.get('duration'), 6);
    var steer = list(p.get('steer')).map(function (s) { var a = s.split(':'); return { t: num(a[0], 0), lane: parseInt(a[1], 10) }; });
    var obstaclesOn = p.get('obstacles') === 'on';
    var intro = p.get('start') === 'intro';

    installClock(Math.floor(num(p.get('seed'), 1)));
    deps.ui.showAchievementNotification = function () { /* no badge pop-ups in a clip */ };
    deps.setLibraryUnlocked(true);

    api.info = { pair: now.known + '-' + now.target, cards: ids, lanes: lanes, outcomes: outcomes, approach: approach, duration: duration, frames: Math.round(duration * FPS), fps: FPS, seed: num(p.get('seed'), 1) };

    // start the run on the first card (the engine deals the listed cards in order)
    deps.launchRun('endless', ids);
    var goAt = null;
    var asked = -1;          // how many questions have been dealt so far
    var lastGates = null;

    function frameAt(ms) { deps.frame(ms); }

    /** Put the question on the track as scripted: the correct gate in its lane, and the gate reaching the runner in `approach` seconds. */
    function arrange(index) {
      var want = plan(index, lanes, outcomes);
      var correctNow = -1;
      game.gates.forEach(function (g, i) { if (g.correct) correctNow = i; });
      if (correctNow !== want.lane) {
        // deal the same card again with the correct gate where the script says (the engine chooses that lane with floor(random * 3))
        clock.force((want.lane + 0.5) / 3);
        game._clearGates();
        game.seededCardOrder = ids.slice(index).concat(ids.slice(0, index));
        game._seededCardIndex = 0;
        game._spawnEncounter();
        game.seededCardOrder = ids.slice();
        game._seededCardIndex = index + 1;
        clock.force(null);
      }
      var z = -(game.speed * approach) * VISUAL_SPEED;
      game.gateZ = z;
      for (var i = 0; i < game.gateMeshes.length; i++) game.gateMeshes[i].position.z = z;
      api.events.push({ t: api.t, event: 'question', index: index, card: ids[index], lane: want.lane, outcome: want.outcome });
      return want;
    }

    var current = null;

    /** One frame: advance the clock 1/30 s in two game steps, steer, drop what the script does not want, render. */
    api.step = function () {
      if (!api.ready) return { frame: api.frame, waiting: true };
      var out = { frame: api.frame };
      for (var s = 0; s < 2; s++) {
        clock.advance(SUB_MS);
        if (game._state === 'playing') {
          if (goAt === null) goAt = clock.now() - SUB_MS;
          // a new question appeared: arrange it
          if (game.gatesActive && game.gates !== lastGates) {
            lastGates = game.gates;
            asked++;
            if (asked < ids.length) current = arrange(asked); else current = null;
            lastGates = game.gates;   // (arranging may deal the card again: that new list is the same question)
          }
          // steering
          if (steer.length) {
            var tt = (clock.now() - goAt) / 1000;
            steer.forEach(function (st) { if (tt >= st.t && st.lane >= 0 && st.lane <= 2) game.targetLane = st.lane; });
          } else if (current && game.gatesActive) {
            var remaining = -game.gateZ / (game.speed * VISUAL_SPEED);
            if (remaining <= lead) {
              var lane = current.lane;
              if (current.outcome === 'miss') lane = [0, 1, 2].filter(function (l) { return l !== current.lane; })[asked % 2 === 0 ? 0 : 1];
              game.targetLane = lane;
            }
          }
          if (!obstaclesOn) { while (game.obstacleMeshes.length) removeAndDispose(game.scene, game.obstacleMeshes.pop()); }
        }
        frameAt(clock.now());
      }
      api.frame++;
      api.t = goAt === null ? 0 : (clock.now() - goAt) / 1000;
      out.t = api.t; out.state = game._state; out.lane = game.currentLane; out.asked = asked; out.gateZ = game.gateZ; out.score = game.score;
      return out;
    };

    // the run is in its countdown now (launchRun started it on the virtual clock): skip to GO unless the clip should show the fly-in.
    // Only timers run here, no frames are drawn, so skipping costs nothing.
    if (!intro) clock.advance(3700);
    api.ready = true;
  } catch (e) {
    api.error = String(e && e.message || e);
  }
}
