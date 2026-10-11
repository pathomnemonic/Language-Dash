/**
 * gates.js — Gate spawning, card selection, and encounter resolution
 *
 * Owned by Agent 2 per ARCHITECTURE.md §30.
 *
 * Implements:
 * - getCardPool(options)       — canonical card-pool request
 * - pickCard(options)          — canonical card-selection contract
 * - createDailyOrder(options)  — deterministic Daily encounter order
 * - spawnGates(...)            — 3D gate mesh spawning
 * - updateGateHighlights(...)  — visual highlight updates
 * - flashGateResult(...)       — correct/wrong flash
 * - resolveStats(...)          — per-card and per-subject stat recording
 *
 * Key architectural rules (ARCHITECTURE.md):
 * - No silent filter fallback: returns structured error if pool is empty.
 * - No mutation of orderedCardIds: uses encounterIndex for lookup.
 * - No direct persistence writes: resolveStats calls storage APIs only.
 * - Deterministic RNG for Daily and multiplayer modes.
 * - Disabled cards and mode-ineligible cards never appear.
 */

import * as THREE from 'three';
import { CARDS, SUBJECTS, EXAM_FILTERS } from '../cardhub.js';
import { storage } from '../storage.js';
import { customCards } from '../customcards.js';
import { getSubjectStyle } from './subjectstyle.js';
import { PALETTE, toonMaterial } from './paper.js';
import { answerKey } from '../cardleaks.js';

// ===== CONSTANTS =====

var LANE_X = [-3, 0, 3];

// ===== CARD SCHEMA DEFAULTS =====
// Defaults for cards that come without every field (My words, older saves).

function patchCardDefaults(c) {
  if (!c) return c;
  if (c.exams === undefined) c.exams = [];
  if (c.baseDifficulty === undefined) c.baseDifficulty = 2;
  if (c.questionType === undefined) c.questionType = 'word';
  if (c.source === undefined) c.source = 'vocabulary';
  if (c.tags === undefined) c.tags = c.subj ? [c.subj.toLowerCase()] : [];
  if (c.hx === undefined) c.hx = false;
  if (c.yr === undefined) c.yr = 2;
  if (c.pearls === undefined) c.pearls = c.tp ? [c.tp.split('.')[0]] : [];
  if (c.enabledModes === undefined) c.enabledModes = ['endless', 'study', 'weakness', 'daily', 'versus', 'mp_highscore', 'mp_suddendeath', 'mp_race', 'flashcard'];
  return c;
}

// ===== DETERMINISTIC RNG =====
// Shared with multiplayer.js via identical algorithm.
// xorshift32: deterministic across browsers.

function createSeededRandom(seed) {
  var state = seed | 0;
  if (state === 0) state = 1;
  return function () {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) / 4294967296);
  };
}

function seededShuffle(items, rng) {
  var arr = items.slice();
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(rng() * (i + 1));
    var temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

// ===== DAILY SEED =====

function getDailySeed(dateKey) {
  // dateKey is 'YYYY-MM-DD'
  var parts = dateKey.split('-');
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var d = parseInt(parts[2], 10);
  return y * 10000 + m * 100 + d;
}

// ===== CARD POOL BUILDING =====

/**
 * Canonical card-pool request.
 *
 * @param {object} options
 * @param {string[]} options.subjects - empty means all canonical subjects
 * @param {object} options.filters
 * @param {string} options.mode - runner mode ID
 * @param {boolean} options.includeCustomCards - default true
 * @returns {{ cards: object[], cardIds: string[], error: null|{code:string, message:string} }}
 */
export function getCardPool(options) {
  var subjects = options.subjects;
  var filters = options.filters || {};
  var mode = options.mode || 'endless';
  var includeCustomCards = options.includeCustomCards !== false;

  // Saved choices that are not topics or levels of this game (left over from an older save, an import or another app
  // that shared the browser) cannot match any word. They are dropped rather than emptying the pool, so a run never
  // ends before the first word because of a stale filter.
  if (subjects && subjects.length) subjects = subjects.filter(function (t) { return SUBJECTS.indexOf(t) >= 0; });
  if (filters.exams && filters.exams.length) {
    var knownLevels = filters.exams.filter(function (l) { return EXAM_FILTERS.indexOf(l) >= 0; });
    filters = Object.assign({}, filters, { exams: knownLevels });
  }
  // (question type, source, year and high-yield filters do not exist in this game: nothing to match on)
  filters = Object.assign({}, filters, { questionTypes: [], sources: [], years: [], highYieldOnly: false });

  // If subjects array is empty or not provided, use ALL canonical subjects
  if (!subjects || subjects.length === 0) {
    subjects = SUBJECTS.slice();
  }

  // Gather all cards
  var allCards = CARDS.slice();
  if (includeCustomCards) {
    var customs = customCards.getAll();
    for (var ci = 0; ci < customs.length; ci++) {
      allCards.push(patchCardDefaults(customs[ci]));
    }
  }

  // Get disabled card IDs
  var disabledCardIds = [];
  try {
    disabledCardIds = storage.get('disabledCards') || [];
  } catch (_e) { /* storage unavailable; use default */ }

  var filtered = [];

  for (var i = 0; i < allCards.length; i++) {
    var c = allCards[i];

    // ── Subject filter ──
    if (subjects.indexOf(c.subj) < 0) continue;

    // ── Disabled cards ──
    if (disabledCardIds.indexOf(c.id) >= 0) continue;

    // ── Mode eligibility ──
    if (c.enabledModes && c.enabledModes.length > 0) {
      if (c.enabledModes.indexOf(mode) < 0) continue;
    }

    // ── Word level filter (top100 / top300 / top600 / all) ──
    if (filters.exams && filters.exams.length > 0) {
      if (c.exams && c.exams.length > 0) {
        var examMatch = false;
        for (var ei = 0; ei < filters.exams.length; ei++) {
          if (c.exams.indexOf(filters.exams[ei]) >= 0) {
            examMatch = true;
            break;
          }
        }
        if (!examMatch) continue;
      }
      // Cards without level tags pass through (backward compat)
    }

    // ── Question type filter ──
    if (filters.questionTypes && filters.questionTypes.length > 0) {
      if (c.questionType && filters.questionTypes.indexOf(c.questionType) < 0) continue;
    }

    // ── Source discipline filter ──
    if (filters.sources && filters.sources.length > 0) {
      if (c.source && filters.sources.indexOf(c.source) < 0) continue;
    }

    // ── Year filter ──
    if (filters.years && filters.years.length > 0) {
      if (c.yr && filters.years.indexOf(c.yr) < 0) continue;
    }

    // ── High-yield only ──
    if (filters.highYieldOnly) {
      if (c.hx !== true) continue;
    }

    filtered.push(c);
  }

  // ── NO SILENT FALLBACK ──
  if (filtered.length === 0) {
    return {
      cards: [],
      cardIds: [],
      error: {
        code: 'NO_MATCHING_CARDS',
        message: 'No words match the selected topics and filters. Adjust your filters and try again.'
      }
    };
  }

  var cardIds = [];
  for (var fi = 0; fi < filtered.length; fi++) {
    cardIds.push(filtered[fi].id);
  }

  return {
    cards: filtered,
    cardIds: cardIds,
    error: null
  };
}

// ===== DAILY ORDER =====

/**
 * Create a deterministic Daily encounter order.
 *
 * @param {object} options
 * @param {string} options.dateKey - 'YYYY-MM-DD'
 * @param {string[]} options.eligibleCardIds - ordered array of eligible IDs
 * @param {number} options.count - number of encounters
 * @returns {string[]} immutable array of card IDs (no duplicates when pool >= count)
 */
export function createDailyOrder(options) {
  var dateKey = options.dateKey;
  var eligibleCardIds = options.eligibleCardIds;
  var count = options.count || 15;

  var seed = getDailySeed(dateKey);
  var rng = createSeededRandom(seed);

  // Shuffle eligible IDs deterministically
  var shuffled = seededShuffle(eligibleCardIds, rng);

  // Take up to count (no duplicates since we shuffle the full set)
  var result = shuffled.slice(0, Math.min(count, shuffled.length));

  // Freeze to enforce immutability
  return Object.freeze(result);
}

// ===== CARD SELECTION =====

/**
 * Where a seeded run carries on after a card was dealt: just past the card that was actually used. That can be
 * later than the index asked for, when some ids in the order are not in the pool; stepping by one instead would
 * deal the same card again.
 * @param {{orderedIndex: number|null}|null} pickResult
 * @param {number} current the index that was asked for
 * @returns {number}
 */
export function nextSeededIndex(pickResult, current) {
  var used = pickResult && typeof pickResult.orderedIndex === 'number' ? pickResult.orderedIndex : current;
  return used + 1;
}


/**
 * Canonical card-selection contract.
 *
 * @param {object} options
 * @param {object[]} options.pool - eligible card objects
 * @param {string[]} options.recentIds - recently used card IDs
 * @param {string} options.mode
 * @param {number} options.encounterIndex
 * @param {string[]|null} options.orderedCardIds - immutable; uses encounterIndex, never shifted
 * @param {object} options.selectionState - { recentQuestionTypes: string[], recentSubjects: string[] }
 * @param {function} options.rng - () => number [0,1) — deterministic for competitive, Math.random for solo
 * @returns {{ card: object|null, orderedIndex: number|null, error: null|{code:string, message:string} }}
 */
export function pickCard(options) {
  var pool = options.pool;
  var recentIds = options.recentIds || [];
  var mode = options.mode || 'endless';
  var encounterIndex = options.encounterIndex || 0;
  var orderedCardIds = options.orderedCardIds || null;
  var selectionState = options.selectionState || { recentQuestionTypes: [], recentSubjects: [] };
  var rng = options.rng || Math.random;
  var retryIds = options.retryIds || [];

  if (!pool || pool.length === 0) {
    return {
      card: null,
      orderedIndex: null,
      error: {
        code: 'NO_MATCHING_CARDS',
        message: 'Card pool is empty. Cannot pick a card.'
      }
    };
  }

  // ── Ordered selection (Daily, multiplayer) ──
  if (orderedCardIds && orderedCardIds.length > 0) {
    // Use encounterIndex — NEVER shift or mutate orderedCardIds

    // Walk from encounterIndex forward to find a valid card in the pool
    for (var oi = encounterIndex; oi < orderedCardIds.length; oi++) {
      var targetId = orderedCardIds[oi];

      // Look up in pool (not outside it)
      var found = null;
      for (var pi = 0; pi < pool.length; pi++) {
        if (pool[pi].id === targetId) {
          found = pool[pi];
          break;
        }
      }

      if (found) {
        return {
          card: patchCardDefaults(found),
          orderedIndex: oi,
          error: null
        };
      }
    }

    // Ordered IDs exhausted — fall through to weighted selection
  }

  // ── Weakness mode: prefer poorly-performing cards ──
  var effectivePool = pool;
  if (mode === 'weakness') {
    var weakCards = pool.filter(function (c) {
      var s = storage.getCardStat(c.id);
      return s.wrong > 0 || (s.seen > 0 && s.correct / s.seen < 0.7);
    });
    if (weakCards.length >= 3) {
      effectivePool = weakCards;
    }
  }

  // ── Remediation: a card missed earlier in this run comes back ──
  if (retryIds.length > 0 && mode !== 'daily') {
    for (var qi = 0; qi < retryIds.length; qi++) {
      for (var qp = 0; qp < effectivePool.length; qp++) {
        if (effectivePool[qp].id === retryIds[qi]) {
          return { card: patchCardDefaults(effectivePool[qp]), orderedIndex: null, error: null, wasRetry: true };
        }
      }
    }
  }

  // ── Adaptive weighted selection ──
  var now = Date.now();

  // Answers shown recently (duplicate cards for the same answer word are
  // legitimate extra practice, but shouldn't appear back to back).
  var recentAnswers = {};
  for (var ra = 0; ra < effectivePool.length; ra++) {
    if (recentIds.indexOf(effectivePool[ra].id) >= 0) recentAnswers[answerKey(effectivePool[ra].ans)] = true;
  }

  // Configurable card freshness weight
  var freshnessWeight = 8;
  try {
    var storedWeight = storage.get('cardFreshnessWeight');
    if (storedWeight && typeof storedWeight === 'number' && storedWeight > 0) {
      freshnessWeight = storedWeight;
    }
  } catch (_e) { /* storage unavailable; use default */ }

  // Variety enforcement state
  var recentTypes = selectionState.recentQuestionTypes || [];
  var recentSubjects = selectionState.recentSubjects || [];

  // Check if last 3 were same question type
  var avoidType = null;
  if (recentTypes.length >= 3 &&
      recentTypes[0] === recentTypes[1] &&
      recentTypes[1] === recentTypes[2]) {
    avoidType = recentTypes[0];
  }

  // Check if last 3 were same subject (only when multiple subjects selected)
  var avoidSubject = null;
  var subjectCount = 0;
  var subjectsSeen = {};
  for (var si = 0; si < effectivePool.length; si++) {
    if (!subjectsSeen[effectivePool[si].subj]) {
      subjectsSeen[effectivePool[si].subj] = true;
      subjectCount++;
    }
  }
  if (subjectCount > 1 && recentSubjects.length >= 3 &&
      recentSubjects[0] === recentSubjects[1] &&
      recentSubjects[1] === recentSubjects[2]) {
    avoidSubject = recentSubjects[0];
  }

  var weighted = [];
  for (var wi = 0; wi < effectivePool.length; wi++) {
    var c = effectivePool[wi];
    var s = storage.getCardStat(c.id);
    var w = 10;

    // ── Accuracy-based weighting ──
    if (s.seen > 0) {
      var accuracy = s.correct / s.seen;
      if (accuracy < 0.3) w *= 4;
      else if (accuracy < 0.5) w *= 3;
      else if (accuracy < 0.7) w *= 1.5;
      else if (accuracy > 0.9 && s.seen > 5) w *= 0.2;
      else if (accuracy > 0.8 && s.seen > 3) w *= 0.5;
    }

    // ── Recent card penalty ──
    if (recentIds.indexOf(c.id) >= 0) {
      w *= 0.02;
    } else if (recentAnswers[answerKey(c.ans)]) {
      w *= 0.05;
    }

    // ── Spaced repetition schedule (due cards first, not-yet-due cards later) ──
    if (typeof s.due === 'number' && s.seen > 0) {
      if (now >= s.due) {
        var overdueDays = Math.min(7, (now - s.due) / (24 * 60 * 60 * 1000));
        w *= 2.5 * (1 + overdueDays * 0.3);
      } else {
        w *= 0.25;
      }
    } else if (s.lastSeen > 0) {
      var hoursSince = (now - s.lastSeen) / (1000 * 60 * 60);
      if (hoursSince < 0.5) w *= 0.3;
      else if (hoursSince < 2) w *= 0.6;
      else if (hoursSince > 168) w *= 2.5;
      else if (hoursSince > 72) w *= 1.8;
      else if (hoursSince > 24) w *= 1.3;
    } else {
      w *= 1.5;
    }

    // ── Unseen card freshness boost ──
    if (s.seen === 0) {
      w *= freshnessWeight;
    }

    // ── baseDifficulty scaling during a run ──
    if (c.baseDifficulty) {
      if (encounterIndex < 6) {
        // Early: boost easy, penalize hard
        if (c.baseDifficulty === 1) w *= 1.5;
        else if (c.baseDifficulty === 3) w *= 0.5;
      } else if (encounterIndex >= 16) {
        // Late: boost hard, slight penalty for easy
        if (c.baseDifficulty === 3) w *= 1.8;
        else if (c.baseDifficulty === 1) w *= 0.7;
      }
    }

    // ── Question type variety enforcement ──
    if (avoidType && c.questionType === avoidType) {
      w *= 0.3;
    }

    // ── Subject rotation ──
    if (avoidSubject && c.subj === avoidSubject) {
      w *= 0.4;
    }

    weighted.push({ card: c, weight: Math.max(w, 0.01) });
  }

  // ── Weighted random selection using supplied RNG ──
  var total = 0;
  for (var ti = 0; ti < weighted.length; ti++) total += weighted[ti].weight;

  var r = rng() * total;
  for (var ri = 0; ri < weighted.length; ri++) {
    r -= weighted[ri].weight;
    if (r <= 0) {
      return {
        card: patchCardDefaults(weighted[ri].card),
        orderedIndex: null,
        error: null
      };
    }
  }

  // Fallback (floating point edge)
  return {
    card: patchCardDefaults(weighted[weighted.length - 1].card),
    orderedIndex: null,
    error: null
  };
}

// ===== GATE SPAWNING =====
//
// A gate is a ticket-office arch ("Paper Passport", docs/DESIGN.md): two lane-coloured posts and a cream sign board
// with an ink outline, a perforated ticket edge and the answer word painted on it (the HTML cards above the road show
// the same word; this sign makes the gate readable as an object from far away). A painted mat on the floor marks the
// lane like a station platform. Nothing glows. On a right answer a green rubber stamp thunks onto the sign; on a wrong
// one the chosen sign gets an ink cross and shakes while the right one gets the stamp.

var LANE_HEX = [PALETTE.red, PALETTE.marigold, PALETTE.teal];
var LANE_HEX_CB = [0xe69f00, 0xf0e442, 0x0072b2]; // colour-blind friendly stand-ins for the lanes
var INK_CSS = '#1b2a41';
var CARD_CSS = '#fffbf2';
var CARD_HEX = PALETTE.card;
var BOARD_W = 2.5, BOARD_H = 0.92, BOARD_D = 0.14;
var POST_W = 0.22, POST_H = 3.3, POST_D = 0.24;
var BOARD_Y = 1.16;
var OUT = 0.045; // ink outline thickness (world units)
var FONT_STACK = '"Fraunces","Noto Serif","Noto Sans JP","Noto Sans SC","Noto Sans KR","Noto Sans Devanagari","Noto Naskh Arabic","Yu Gothic","PingFang SC","Malgun Gothic","Hiragino Sans",system-ui,sans-serif';

var _shared = null;

function sharedParts() {
  if (_shared) return _shared;
  var geo = {
    core: new THREE.BoxGeometry(BOARD_W, BOARD_H, BOARD_D),
    outline: new THREE.BoxGeometry(BOARD_W + 2 * OUT, BOARD_H + 2 * OUT, BOARD_D + 2 * OUT),
    post: new THREE.BoxGeometry(POST_W, POST_H, POST_D),
    postOutline: new THREE.BoxGeometry(POST_W + 2 * OUT, POST_H + 2 * OUT, POST_D + 2 * OUT),
    foot: new THREE.BoxGeometry(0.42, 0.14, 0.42),
    footOutline: new THREE.BoxGeometry(0.42 + 2 * OUT, 0.14 + 2 * OUT, 0.42 + 2 * OUT),
    face: new THREE.PlaneGeometry(BOARD_W - 0.08, BOARD_H - 0.08),
    mat: new THREE.PlaneGeometry(2.7, 3.2),
    stamp: new THREE.PlaneGeometry(1.0, 1.0)
  };
  Object.keys(geo).forEach(function (k) { geo[k].userData.shared = true; });
  var ink = new THREE.MeshBasicMaterial({ color: PALETTE.ink, side: THREE.BackSide, fog: false });
  ink.userData.shared = true;
  _shared = { geo: geo, ink: ink, lane: {}, mat: {}, card: toonMaterial(CARD_HEX), cardDim: toonMaterial(PALETTE.paperDeep) };
  return _shared;
}

function laneColor(j) {
  return (storage.get('colorblindMode') ? LANE_HEX_CB : LANE_HEX)[j];
}

function laneMaterial(j) {
  var sp = sharedParts();
  var hex = laneColor(j);
  return sp.lane[hex] || (sp.lane[hex] = toonMaterial(hex));
}

function makeCanvas(w, h) {
  if (typeof document === 'undefined') return null;
  var canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  var ctx = canvas.getContext && canvas.getContext('2d');
  return ctx ? { canvas: canvas, ctx: ctx } : null;
}

function cssHex(hex) { return '#' + ('000000' + hex.toString(16)).slice(-6); }

/** The sign face: cream card, lane-coloured header band, perforation and ticket notches, then the word in ink. */
function paintSignFace(label, roman, laneHex, icon) {
  var made = makeCanvas(560, 200);
  if (!made) return null;
  var ctx = made.ctx;
  var W = 560, H = 200;
  ctx.fillStyle = CARD_CSS;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = cssHex(laneHex);
  ctx.fillRect(0, 0, W, 38);
  // perforation under the band
  ctx.strokeStyle = 'rgba(27,42,65,0.65)';
  ctx.lineWidth = 3;
  ctx.setLineDash([9, 8]);
  ctx.beginPath();
  ctx.moveTo(22, 46);
  ctx.lineTo(W - 22, 46);
  ctx.stroke();
  ctx.setLineDash([]);
  // ticket notches
  ctx.fillStyle = INK_CSS;
  [0, W].forEach(function (x) { ctx.beginPath(); ctx.arc(x, 46, 15, 0, Math.PI * 2); ctx.fill(); });
  // little route dots in the band
  ctx.fillStyle = 'rgba(255,251,242,0.85)';
  for (var d = 0; d < 3; d++) { ctx.beginPath(); ctx.arc(26 + d * 22, 19, 5, 0, Math.PI * 2); ctx.fill(); }
  if (icon) {
    ctx.font = '28px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, W - 20, 21);
  }
  // the word, as large as fits
  var text = String(label == null ? '' : label);
  var size = 96;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK_CSS;
  ctx.font = '800 ' + size + 'px ' + FONT_STACK;
  var wide = ctx.measureText ? ctx.measureText(text).width : 0;
  var maxW = W - 80;
  if (wide > maxW) size = Math.max(34, Math.floor(size * maxW / wide));
  ctx.font = '800 ' + size + 'px ' + FONT_STACK;
  var line = roman ? 112 : 128;
  ctx.fillText(text, W / 2, line, maxW);
  if (roman) {
    ctx.font = 'italic 500 30px ' + FONT_STACK;
    ctx.fillStyle = 'rgba(75,88,112,0.95)';
    ctx.fillText(String(roman), W / 2, 172, maxW);
  }
  var tex = new THREE.CanvasTexture(made.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** The painted lane mat: lane colour, a dashed paper border and forward chevrons, like a platform marking. One per lane colour. */
function laneMatMaterial(j) {
  var sp = sharedParts();
  var hex = laneColor(j);
  if (sp.mat[hex]) return sp.mat[hex];
  var made = makeCanvas(128, 160);
  var tex = null;
  if (made) {
    var ctx = made.ctx;
    ctx.fillStyle = cssHex(hex);
    ctx.fillRect(0, 0, 128, 160);
    ctx.strokeStyle = CARD_CSS;
    ctx.lineWidth = 5;
    ctx.setLineDash([14, 10]);
    ctx.strokeRect(8, 8, 112, 144);
    ctx.setLineDash([]);
    ctx.lineWidth = 9;
    ctx.lineJoin = 'miter';
    ctx.strokeStyle = 'rgba(255,251,242,0.9)';
    [48, 82, 116].forEach(function (y) {
      ctx.beginPath(); ctx.moveTo(34, y + 14); ctx.lineTo(64, y - 8); ctx.lineTo(94, y + 14); ctx.stroke();
    });
    tex = new THREE.CanvasTexture(made.canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  var m = new THREE.MeshBasicMaterial({ color: tex ? 0xffffff : hex, map: tex, transparent: true, opacity: 0.88, depthWrite: false });
  m.userData.shared = true;
  sp.mat[hex] = m;
  return m;
}

var _stampTex = {};

/** A rubber-stamp decal: double ring with a tick (right) or a cross (wrong), in ink-stamp colours. */
function stampTexture(kind) {
  if (_stampTex[kind] !== undefined) return _stampTex[kind];
  var made = makeCanvas(256, 256);
  if (!made) { _stampTex[kind] = null; return null; }
  var ctx = made.ctx;
  var col = kind === 'ok' ? '#2e9e5b' : '#d9432c';
  ctx.clearRect(0, 0, 256, 256);
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 14;
  ctx.beginPath(); ctx.arc(128, 128, 112, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(128, 128, 94, 0, Math.PI * 2); ctx.stroke();
  // dashes between the rings, like the edge of a rubber stamp
  ctx.lineWidth = 3;
  for (var i = 0; i < 28; i++) {
    var a = (i / 28) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(128 + Math.cos(a) * 99, 128 + Math.sin(a) * 99); ctx.lineTo(128 + Math.cos(a) * 107, 128 + Math.sin(a) * 107); ctx.stroke();
  }
  ctx.lineWidth = 22;
  ctx.beginPath();
  if (kind === 'ok') { ctx.moveTo(78, 134); ctx.lineTo(112, 170); ctx.lineTo(182, 86); }
  else { ctx.moveTo(84, 84); ctx.lineTo(172, 172); ctx.moveTo(172, 84); ctx.lineTo(84, 172); }
  ctx.stroke();
  var tex = new THREE.CanvasTexture(made.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  _stampTex[kind] = tex;
  return tex;
}

var _scribbleTex = null;

/** A hand-scribbled ink cross that covers the whole sign. */
function scribbleTexture() {
  if (_scribbleTex !== null) return _scribbleTex;
  var made = makeCanvas(512, 192);
  if (!made) { _scribbleTex = false; return null; }
  var ctx = made.ctx;
  ctx.strokeStyle = INK_CSS;
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(40, 30); ctx.lineTo(470, 160); ctx.lineTo(60, 150); ctx.lineTo(452, 36);
  ctx.moveTo(34, 96); ctx.lineTo(480, 100);
  ctx.stroke();
  _scribbleTex = new THREE.CanvasTexture(made.canvas);
  _scribbleTex.colorSpace = THREE.SRGBColorSpace;
  return _scribbleTex;
}

function stampMesh(kind) {
  var sp = sharedParts();
  var tex = stampTexture(kind);
  var mat = new THREE.MeshBasicMaterial({ map: tex || null, color: tex ? 0xffffff : (kind === 'ok' ? PALETTE.leaf : PALETTE.red), transparent: true, depthWrite: false, fog: false });
  mat.userData.shared = true; // (the texture is shared; the little material is not worth freeing separately)
  var m = new THREE.Mesh(sp.geo.stamp, mat);
  m.visible = false;
  m.renderOrder = 5;
  return m;
}

export function spawnGates(scene, gates, currentLane, theme, subject) {
  var sp = sharedParts();
  var meshes = [];
  var icon = subject ? getSubjectStyle(subject).icon : '';
  for (var j = 0; j < 3; j++) {
    var group = new THREE.Group();
    var lane = laneMaterial(j);
    var info = gates && gates[j];

    // 0: the sign's core. (Keep it first: older code reads children[0] as "the gate's panel".)
    var core = new THREE.Mesh(sp.geo.core, sp.card);
    core.position.set(0, BOARD_Y, 0);
    group.add(core);
    var coreOutline = new THREE.Mesh(sp.geo.outline, sp.ink);
    core.add(coreOutline);

    // the painted face with the word
    var faceTex = info ? paintSignFace(info.label, info.roman, laneColor(j), icon) : null;
    var face = new THREE.Mesh(sp.geo.face, new THREE.MeshBasicMaterial({ map: faceTex, color: faceTex ? 0xffffff : CARD_HEX, fog: false }));
    face.position.set(0, 0, BOARD_D / 2 + 0.004);
    core.add(face);

    // two lane-coloured posts with ink outlines, and little feet
    for (var sx = -1; sx <= 1; sx += 2) {
      var post = new THREE.Mesh(sp.geo.post, lane);
      post.position.set(sx * (BOARD_W / 2 + POST_W / 2 - 0.02), POST_H / 2 - 1.5, -0.02); // from the floor up
      post.add(new THREE.Mesh(sp.geo.postOutline, sp.ink));
      group.add(post);
      var foot = new THREE.Mesh(sp.geo.foot, lane);
      foot.position.set(sx * (BOARD_W / 2 + POST_W / 2 - 0.02), -1.5 + 0.07, -0.02);
      foot.add(new THREE.Mesh(sp.geo.footOutline, sp.ink));
      group.add(foot);
    }

    // the platform mat on the floor
    var floor = new THREE.Mesh(sp.geo.mat, laneMatMaterial(j));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -1.48, 0);
    floor.renderOrder = 1;
    group.add(floor);

    // result decals, hidden until an answer is given
    var stampOk = stampMesh('ok');
    var stampBad = stampMesh('bad');
    stampOk.position.set(0.82, 0, BOARD_D / 2 + 0.03);
    stampBad.position.set(0.82, 0, BOARD_D / 2 + 0.03);
    core.add(stampOk);
    core.add(stampBad);
    var scribbleTex = scribbleTexture();
    var scribble = new THREE.Mesh(new THREE.PlaneGeometry(BOARD_W - 0.1, BOARD_H - 0.06), new THREE.MeshBasicMaterial({ map: scribbleTex || null, color: scribbleTex ? 0xffffff : PALETTE.ink, transparent: true, depthWrite: false, fog: false }));
    scribble.position.set(0, 0, BOARD_D / 2 + 0.02);
    scribble.visible = false;
    scribble.renderOrder = 5;
    core.add(scribble);

    group.userData.gate = { index: j, core: core, face: face, stampOk: stampOk, stampBad: stampBad, scribble: scribble, floor: floor, lane: lane };
    group.position.set(LANE_X[j], 1.5, -60);
    scene.add(group);
    meshes.push(group);
  }
  return meshes;
}

// ===== GATE HIGHLIGHTS =====

/** The lane the runner is in reads brighter; the others dim a little, like unlit ticket windows. */
export function updateGateHighlights(gateMeshes, currentLane) {
  for (var i = 0; i < gateMeshes.length; i++) {
    var info = gateMeshes[i].userData && gateMeshes[i].userData.gate;
    if (!info || info.resolved) continue;
    var on = i === currentLane;
    if (info.on === on) continue;
    info.on = on;
    var tone = on ? 0xffffff : 0xcfc6b2;
    info.face.material.color.setHex(tone);
    info.floor.material = on ? laneMatMaterial(i) : dimMat(i);
    info.core.position.y = BOARD_Y + (on ? 0.06 : 0);
  }
}

var _dimMats = {};
function dimMat(i) {
  var hex = laneColor(i);
  if (_dimMats[hex]) return _dimMats[hex];
  var base = laneMatMaterial(i);
  var m = base.clone();
  m.opacity = 0.5;
  m.userData.shared = true;
  _dimMats[hex] = m;
  return m;
}

// ===== GATE RESULT: STAMPS =====

function ease(t, overshoot) {
  // a stamp coming down: fast in, a hard stop, a small rebound
  var c = overshoot || 1.7;
  var u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

function tween(ms, step, done) {
  if (typeof requestAnimationFrame !== 'function' || typeof performance === 'undefined') { step(1); if (done) done(); return; }
  var t0 = performance.now();
  function frame(now) {
    var t = Math.min(1, (now - t0) / ms);
    step(t);
    if (t < 1) requestAnimationFrame(frame); else if (done) done();
  }
  requestAnimationFrame(frame);
}

function alive(group) { return !!group.parent; }

/** The stamp comes down on the sign: scale 2.3 -> 1 with an overshoot, a 2px-style jolt of the whole sign. */
function thunkStamp(group, kind) {
  var info = group.userData.gate;
  if (!info) return;
  var stamp = kind === 'ok' ? info.stampOk : info.stampBad;
  stamp.visible = true;
  stamp.rotation.z = kind === 'ok' ? 0.14 : -0.12;
  var baseY = BOARD_Y;
  tween(380, function (t) {
    if (!alive(group)) return;
    var k = 2.3 - 1.3 * Math.min(1, ease(Math.min(1, t * 1.15), 1.2));
    stamp.scale.setScalar(Math.max(0.85, k) * 0.78);
    stamp.material.opacity = Math.min(1, t * 6);
    info.core.position.y = baseY - (t > 0.45 && t < 0.8 ? 0.05 * Math.sin((t - 0.45) / 0.35 * Math.PI) : 0);
  });
}

/** A wrong pick: the sign shakes sideways and an ink scribble crosses it out. */
function scribbleOut(group) {
  var info = group.userData.gate;
  if (!info) return;
  info.scribble.visible = true;
  info.scribble.material.opacity = 0;
  var x0 = group.position.x;
  tween(420, function (t) {
    if (!alive(group)) return;
    info.scribble.material.opacity = Math.min(1, t * 5);
    group.position.x = x0 + Math.sin(t * Math.PI * 7) * 0.12 * (1 - t);
  }, function () { if (alive(group)) group.position.x = x0; });
}

function settle(group, tone) {
  var info = group.userData.gate;
  if (!info) return;
  info.resolved = true;
  info.face.material.color.setHex(tone);
  info.floor.material = laneMatMaterial(info.index);
}

/**
 * The runner got it right: the right sign takes a green "thunk" stamp, the others fade to paper-grey.
 * @param {THREE.Object3D[]} gateMeshes
 * @param {{correct: boolean}[]} gates
 */
export function stampGateCorrect(gateMeshes, gates) {
  for (var i = 0; i < gateMeshes.length; i++) {
    if (gates[i] && gates[i].correct) {
      settle(gateMeshes[i], 0xffffff);
      thunkStamp(gateMeshes[i], 'ok');
    } else {
      settle(gateMeshes[i], 0xb8b09c);
      gateMeshes[i].userData.gate && (gateMeshes[i].userData.gate.floor.material = dimMat(i));
    }
  }
}

/** Wrong answer: the chosen sign gets an ink cross and a shake, the right one gets the green stamp (stamped, not glowing). */
export function flashGateResult(gateMeshes, gates, currentLane) {
  for (var i = 0; i < gateMeshes.length; i++) {
    if (gates[i] && gates[i].correct) {
      settle(gateMeshes[i], 0xffffff);
      thunkStamp(gateMeshes[i], 'ok');
    } else if (i === currentLane) {
      settle(gateMeshes[i], 0xd8cfba);
      thunkStamp(gateMeshes[i], 'bad');
      scribbleOut(gateMeshes[i]);
    } else {
      settle(gateMeshes[i], 0xb8b09c);
    }
  }
}

// ===== STAT RESOLUTION =====
// This is the ONLY place per-card and per-subject stats are updated
// during gameplay. The engine calls this; it does NOT directly persist
// run-level totals (those go through storage.finalizeRun).

export function resolveStats() {
  // Deprecated no-op. Runner statistics (per-card, per-subject and totals) are
  // persisted only by storage.finalizeRun(summary), which is idempotent by runId.
}
