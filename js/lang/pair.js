/**
 * pair.js — the player's language pair: the language they speak (shown as the hint at the top of the screen)
 * and the language they are learning (shown on the gates).
 *
 * Stored in localStorage on its own key, outside the save file, so the card deck can be chosen before the save is
 * loaded. Changing the pair reloads the app (see applyPair) so every screen, card id and stat starts from the new deck.
 */

import { isLanguageCode, LANGUAGES } from './languages.js';

var KEY = 'langdash.pair.v1';
var ROMAN_KEY = 'langdash.roman.v1';

/** @returns {{known: string, target: string}|null} null until the player has chosen */
export function getPair() {
  try {
    var raw = localStorage.getItem(KEY);
    if (!raw) return null;
    var p = JSON.parse(raw);
    if (p && isLanguageCode(p.known) && isLanguageCode(p.target) && p.known !== p.target) return { known: p.known, target: p.target };
  } catch (_e) { /* storage blocked or corrupt: ask again */ }
  return null;
}

export function hasPair() { return getPair() !== null; }

/** @returns {{known: string, target: string}} the saved pair, or a harmless default (used by tests and first paint) */
export function getPairOrDefault() { return getPair() || { known: 'en', target: 'es' }; }

/** Saves a pair. Returns false when it is invalid. Does not reload. */
export function setPair(known, target) {
  if (!isLanguageCode(known) || !isLanguageCode(target) || known === target) return false;
  try { localStorage.setItem(KEY, JSON.stringify({ known: known, target: target })); return true; } catch (_e) { return false; }
}

/** Saves a pair and reloads, so the whole app is rebuilt for the new deck. */
export function applyPair(known, target) {
  if (!setPair(known, target)) return false;
  try { window.location.reload(); } catch (_e) { /* not in a browser */ }
  return true;
}

/** Show the pronunciation line (pinyin, romaji, ...) under non-Latin gate words. On by default. */
export function getShowRoman() {
  try { return localStorage.getItem(ROMAN_KEY) !== '0'; } catch (_e) { return true; }
}

export function setShowRoman(on) {
  try { localStorage.setItem(ROMAN_KEY, on ? '1' : '0'); } catch (_e) { /* ignore */ }
}

export { LANGUAGES };
