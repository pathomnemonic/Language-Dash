/**
 * langui.js — choosing the language pair: the first-run welcome and the Languages popup on Home.
 *
 * The pair (what you speak, what you are learning) decides the whole deck, so applying a change reloads the app
 * (see lang/pair.js). Both screens build their markup with createElement; nothing here touches innerHTML.
 */

import { createElement, clearElement } from './dom.js';
import { LANGUAGES, getLanguage } from './lang/languages.js';
import { getPair, applyPair, getShowRoman, setShowRoman } from './lang/pair.js';
import { trapFocus, releaseFocusTrap } from './uihelpers.js';

function chip(lang, selected, disabled, onPick) {
  var b = createElement('button', {
    className: 'lang-chip' + (selected ? ' selected' : '') + (disabled ? ' disabled' : ''),
    attributes: { type: 'button', 'aria-pressed': selected ? 'true' : 'false', 'data-lang': lang.code, lang: lang.code }
  });
  if (disabled) b.disabled = true;
  b.appendChild(createElement('span', { className: 'lang-flag', text: lang.flag, attributes: { 'aria-hidden': 'true' } }));
  b.appendChild(createElement('span', { className: 'lang-native', text: lang.native }));
  b.appendChild(createElement('span', { className: 'lang-name', text: lang.name }));
  b.addEventListener('click', function () { if (!disabled) onPick(lang.code); });
  return b;
}

/** Short label for the Home button, e.g. "🇬🇧→🇪🇸". */
export function pairLabel() {
  var p = getPair();
  if (!p) return '🌍';
  return getLanguage(p.known).flag + '→' + getLanguage(p.target).flag;
}

/**
 * Two-step picker used by both screens. Calls onDone(known, target) when both are chosen and confirmed.
 * @param {HTMLElement} root
 * @param {{known?: string, target?: string, confirmLabel: string, onDone: function(string, string): void}} opts
 */
function renderPicker(root, opts) {
  var state = { known: opts.known || null, target: opts.target || null };
  function draw() {
    clearElement(root);
    root.appendChild(createElement('h3', { className: 'lang-step', text: '1. I speak…' }));
    var g1 = createElement('div', { className: 'lang-grid', attributes: { role: 'group', 'aria-label': 'Language I speak' } });
    LANGUAGES.forEach(function (l) {
      g1.appendChild(chip(l, state.known === l.code, false, function (code) {
        state.known = code;
        if (state.target === code) state.target = null;
        draw();
      }));
    });
    root.appendChild(g1);

    root.appendChild(createElement('h3', { className: 'lang-step', text: '2. I want to learn…' }));
    var g2 = createElement('div', { className: 'lang-grid', attributes: { role: 'group', 'aria-label': 'Language I am learning' } });
    LANGUAGES.forEach(function (l) {
      g2.appendChild(chip(l, state.target === l.code, state.known === l.code, function (code) { state.target = code; draw(); }));
    });
    root.appendChild(g2);

    var ready = !!(state.known && state.target);
    var go = createElement('button', { className: 'btn btn-primary btn-block lang-go', text: ready ? opts.confirmLabel : 'Pick both languages', attributes: { type: 'button', id: 'langGo' } });
    if (!ready) go.disabled = true;
    go.addEventListener('click', function () { if (ready) opts.onDone(state.known, state.target); });
    root.appendChild(go);
  }
  draw();
}

/** First launch: a full-screen welcome that cannot be skipped (the game needs a pair), then the app reloads. */
export function showLanguageOnboarding() {
  if (document.getElementById('langWelcome')) return;
  var overlay = createElement('div', { className: 'lang-welcome', attributes: { id: 'langWelcome', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Choose your languages' } });
  var card = createElement('div', { className: 'lang-welcome-card' });
  card.appendChild(createElement('div', { className: 'lang-logo', text: 'Language Dash', attributes: { 'aria-hidden': 'true' } }));
  card.appendChild(createElement('h2', { text: 'Welcome, Wordrunner!' }));
  card.appendChild(createElement('p', { className: 'lang-sub', text: 'A word flashes in your language. Dash through the gate with the same word in the language you are learning.' }));
  var body = createElement('div', { className: 'lang-picker' });
  card.appendChild(body);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  trapFocus(card);
  renderPicker(body, {
    confirmLabel: "Let's run!",
    onDone: function (known, target) { releaseFocusTrap(); applyPair(known, target); }
  });
}

/** The Languages popup: change the pair and the pronunciation line. Fills the given container. */
export function renderLanguageSheet(container) {
  if (!container) return;
  clearElement(container);
  var p = getPair() || {};
  container.appendChild(createElement('p', { className: 'sheet-intro', text: 'Change what you speak or what you are learning. Your progress is kept separately for each pair.' }));
  var body = createElement('div', { className: 'lang-picker' });
  container.appendChild(body);
  renderPicker(body, {
    known: p.known, target: p.target, confirmLabel: 'Switch languages',
    onDone: function (known, target) {
      if (p.known === known && p.target === target) return;
      applyPair(known, target);
    }
  });
  var target = getLanguage(p.target);
  var row = createElement('label', { className: 'lang-roman-row' });
  var cb = createElement('input', { attributes: { type: 'checkbox', id: 'langRomanToggle' } });
  cb.checked = getShowRoman();
  cb.addEventListener('change', function () { setShowRoman(cb.checked); });
  row.appendChild(cb);
  row.appendChild(createElement('span', { text: ' Show pronunciation (pinyin, romaji…) under gate words' + (target && !target.roman ? ' (only used for non-Latin scripts)' : '') }));
  container.appendChild(row);
}
