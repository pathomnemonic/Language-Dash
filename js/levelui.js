/**
 * levelui.js — "How much do you already know?": the level picker (with sample words for each level), the placement test,
 * the Languages-sheet row that changes it later, and the per-language mastery view.
 *
 * Shown the first time a language pair is used (see ensureLevel, called by main.js) and on demand from the Languages sheet.
 * Every piece of text goes in through createElement; nothing here touches innerHTML.
 */

import { createElement, clearElement } from './dom.js';
import { getLanguage } from './lang/languages.js';
import { getPairOrDefault } from './lang/pair.js';
import { CARDS, loadCards } from './cardhub.js';
import { trapFocus, releaseFocusTrap } from './uihelpers.js';
import {
  bandsForDeck, bandRange, sampleCards, bandForRank, createPretest, getLevel, setLevel, hasLevel, LEVEL_BANDS
} from './lang/levels.js';
import { masteryForPair, pairsWithProgress } from './lang/mastery.js';
import { getShowRoman } from './lang/pair.js';

function deckSize() {
  var m = 0;
  for (var i = 0; i < CARDS.length; i++) if (CARDS[i].rank > m) m = CARDS[i].rank;
  return m || 1000;
}

function langAttrs(el, code) {
  var l = getLanguage(code);
  if (l) { el.setAttribute('lang', l.code); el.setAttribute('dir', l.rtl ? 'rtl' : 'ltr'); }
}

function overlay(label) {
  var o = createElement('div', { className: 'lang-welcome level-overlay', attributes: { role: 'dialog', 'aria-modal': 'true', 'aria-label': label } });
  var card = createElement('div', { className: 'lang-welcome-card' });
  o.appendChild(card);
  document.body.appendChild(o);
  trapFocus(card);
  return { root: o, card: card, close: function () { releaseFocusTrap(); if (o.parentNode) o.parentNode.removeChild(o); } };
}

function bandLabel(id) {
  for (var i = 0; i < LEVEL_BANDS.length; i++) if (LEVEL_BANDS[i].id === id) return LEVEL_BANDS[i].label;
  return id;
}

/** One sample word chip: the word in the language being learned, with what it means. */
function sampleChip(card, pair) {
  var chip = createElement('span', { className: 'level-sample' });
  var w = createElement('b', { text: card.ans });
  langAttrs(w, pair.target);
  chip.appendChild(w);
  chip.appendChild(createElement('span', { text: ' ' + (card.bw || [])[0] }));
  return chip;
}

/**
 * The level picker.
 * @param {{onDone: function(): void, onCancel?: function(): void}} opts
 */
export function openLevelPicker(opts) {
  opts = opts || {};
  var pair = getPairOrDefault();
  var target = getLanguage(pair.target);
  var ov = overlay('Choose your level');
  var size = deckSize();
  var card = ov.card;

  card.appendChild(createElement('div', { className: 'lang-logo', text: 'Your level', attributes: { 'aria-hidden': 'true' } }));
  card.appendChild(createElement('h2', { text: 'How much ' + (target ? target.name : 'of this language') + ' do you know?' }));
  card.appendChild(createElement('p', { className: 'lang-sub', text: 'Pick the closest one. The words you see start there and get harder as you learn. You can change this any time in Languages.' }));

  var list = createElement('div', { className: 'level-list' });
  bandsForDeck(size).forEach(function (band) {
    var range = bandRange(band, size);
    var btn = createElement('button', { className: 'level-card', attributes: { type: 'button', 'data-level': band.id } });
    btn.appendChild(createElement('span', { className: 'level-name', text: band.label }));
    btn.appendChild(createElement('span', { className: 'level-blurb', text: band.blurb + ' · words ' + range[0] + '–' + range[1] }));
    var samples = createElement('span', { className: 'level-samples' });
    sampleCards(CARDS, range[0], range[1], 5).forEach(function (c) { samples.appendChild(sampleChip(c, pair)); });
    btn.appendChild(samples);
    btn.addEventListener('click', function () {
      setLevel(pair, { level: band.id, frontier: band.frontier, source: band.id === 'beginner' ? 'beginner' : 'self' });
      ov.close();
      if (opts.onDone) opts.onDone();
    });
    list.appendChild(btn);
  });
  card.appendChild(list);

  var test = createElement('button', { className: 'btn btn-primary btn-block level-test-btn', text: 'Not sure? Take a 2-minute placement test', attributes: { type: 'button', id: 'levelTestBtn' } });
  test.addEventListener('click', function () { ov.close(); runPlacementTest(opts); });
  card.appendChild(test);
  if (opts.onCancel) {
    var cancel = createElement('button', { className: 'btn btn-outline btn-block', text: 'Cancel', attributes: { type: 'button' } });
    cancel.addEventListener('click', function () { ov.close(); opts.onCancel(); });
    card.appendChild(cancel);
  }
}

/** The placement test: 16 quick questions that climb or fall with the answers. */
export function runPlacementTest(opts) {
  opts = opts || {};
  var pair = getPairOrDefault();
  var ov = overlay('Placement test');
  var test = createPretest(CARDS);
  var size = deckSize();
  var card = ov.card;

  function question() {
    clearElement(card);
    var q = test.next();
    if (!q) { result(); return; }
    var p = test.progress();
    card.appendChild(createElement('div', { className: 'lang-logo', text: 'Placement test', attributes: { 'aria-hidden': 'true' } }));
    card.appendChild(createElement('p', { className: 'lang-sub', text: 'Question ' + (p.asked + 1) + ' of ' + p.total + '. Pick the word that means:' }));
    var hint = createElement('div', { className: 'level-hint', text: q.card.bw[0] });
    langAttrs(hint, pair.known);
    card.appendChild(hint);
    var opts2 = createElement('div', { className: 'level-options' });
    q.options.forEach(function (word, i) {
      var b = createElement('button', { className: 'level-option', attributes: { type: 'button' } });
      var w = createElement('span', { className: 'level-option-word', text: word });
      langAttrs(w, pair.target);
      b.appendChild(w);
      var roman = word === q.card.ans ? q.card.ansRoman : (q.card.d[0] === word ? (q.card.dRoman || [])[0] : (q.card.dRoman || [])[1]);
      if (roman && getShowRoman()) b.appendChild(createElement('small', { className: 'level-option-roman', text: roman }));
      b.addEventListener('click', function () { test.answer(i); question(); });
      opts2.appendChild(b);
    });
    card.appendChild(opts2);
    var idk = createElement('button', { className: 'btn btn-outline btn-block', text: "I don't know", attributes: { type: 'button', id: 'levelIdk' } });
    idk.addEventListener('click', function () { test.answer(-1); question(); });
    card.appendChild(idk);
  }

  function result() {
    clearElement(card);
    var est = test.estimate();
    var band = bandForRank(est, size);
    card.appendChild(createElement('div', { className: 'lang-logo', text: 'Your result', attributes: { 'aria-hidden': 'true' } }));
    card.appendChild(createElement('h2', { text: band.label }));
    card.appendChild(createElement('p', { className: 'lang-sub', text: 'You seem comfortable up to about the ' + est + ' most common words. Runs will start around there and widen as you master more.' }));
    var ok = createElement('button', { className: 'btn btn-primary btn-block', text: 'Start here', attributes: { type: 'button', id: 'levelStartHere' } });
    ok.addEventListener('click', function () {
      setLevel(pair, { level: band.id, frontier: Math.max(80, est), source: 'test' });
      ov.close();
      if (opts.onDone) opts.onDone();
    });
    card.appendChild(ok);
    var other = createElement('button', { className: 'btn btn-outline btn-block', text: 'Choose a level myself', attributes: { type: 'button' } });
    other.addEventListener('click', function () { ov.close(); openLevelPicker(opts); });
    card.appendChild(other);
  }

  question();
}

/** First use of a pair (or after switching to a new one): ask for a level once the words are loaded, then carry on. */
export function ensureLevel(done) {
  var pair = getPairOrDefault();
  if (hasLevel(pair)) { done(); return; }
  loadCards().then(function () { openLevelPicker({ onDone: done }); }).catch(function () { done(); });
}

/** A row for the Languages sheet: the current level and a button to change it. */
export function renderLevelRow(container) {
  var pair = getPairOrDefault();
  var rec = getLevel(pair);
  var row = createElement('div', { className: 'level-row' });
  var text = createElement('span', { className: 'level-row-text' });
  text.appendChild(createElement('b', { text: 'Your level: ' }));
  text.appendChild(document.createTextNode(rec ? bandLabel(rec.level) + (rec.source === 'test' ? ' (placement test)' : '') : 'not set'));
  row.appendChild(text);
  var btn = createElement('button', { className: 'btn btn-outline btn-sm', text: 'Change', attributes: { type: 'button', id: 'levelChangeBtn' } });
  btn.addEventListener('click', function () {
    loadCards().then(function () {
      var sheet = document.getElementById('langSheet');
      if (sheet) sheet.classList.remove('active', 'open');
      openLevelPicker({ onDone: function () { renderLevelRow(container.parentNode ? container : container); }, onCancel: function () {} });
    });
  });
  row.appendChild(btn);
  clearElement(container);
  container.appendChild(row);
}

/** Per-language mastery for the Stats screen: this pair's bands, then every other pair with progress. */
export function renderMastery(container, storage) {
  var stats = storage.get('cardStats') || {};
  var pair = getPairOrDefault();
  var l1 = getLanguage(pair.known), l2 = getLanguage(pair.target);
  var box = createElement('section', { className: 'mastery-box', attributes: { 'aria-label': 'Language mastery' } });
  var m = masteryForPair(stats, pair.known, pair.target, CARDS.length ? deckSize() : 1000);
  box.appendChild(createElement('h3', { className: 'mastery-title', text: (l2 ? l2.flag + ' ' + l2.name : 'Mastery') + ' mastery' }));
  var head = createElement('div', { className: 'mastery-head' });
  head.appendChild(createElement('span', { className: 'mastery-badge', text: m.title.icon + ' ' + m.title.label }));
  head.appendChild(createElement('span', { className: 'mastery-count', text: m.mastered + ' of ' + m.total + ' words mastered' + (l1 ? ' (from ' + l1.name + ')' : '') }));
  box.appendChild(head);
  m.bands.forEach(function (b) {
    var line = createElement('div', { className: 'mastery-band' });
    line.appendChild(createElement('span', { className: 'mastery-band-label', text: 'Words ' + b.from + '–' + b.to }));
    var bar = createElement('div', { className: 'mastery-bar', attributes: { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(b.total), 'aria-valuenow': String(b.mastered) } });
    var fill = createElement('div', { className: 'mastery-fill' });
    fill.style.width = Math.min(100, Math.round(100 * b.mastered / Math.max(1, b.total))) + '%';
    var seen = createElement('div', { className: 'mastery-seen' });
    seen.style.width = Math.min(100, Math.round(100 * b.seen / Math.max(1, b.total))) + '%';
    bar.appendChild(seen); bar.appendChild(fill);
    line.appendChild(bar);
    line.appendChild(createElement('span', { className: 'mastery-band-num', text: b.mastered + '/' + b.total }));
    box.appendChild(line);
  });
  var others = pairsWithProgress(stats).filter(function (p) { return !(p.known === pair.known && p.target === pair.target); });
  if (others.length) {
    box.appendChild(createElement('h4', { className: 'mastery-sub', text: 'Your other languages' }));
    others.slice(0, 6).forEach(function (p) {
      var a = getLanguage(p.known), b = getLanguage(p.target);
      box.appendChild(createElement('div', { className: 'mastery-other', text: (a ? a.flag : '') + '→' + (b ? b.flag : '') + ' ' + (b ? b.name : p.target) + ': ' + p.mastered + ' mastered, ' + p.seen + ' tried' }));
    });
  }
  container.appendChild(box);
}
