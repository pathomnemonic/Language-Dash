/**
 * themes.js — Topic theme color configs (one per Language Dash topic) with night mode variants
 *
 * ARCHITECTURE CONTRACT (§23, §30):
 * - Agent 13 owns this file.
 * - Each theme defines colors for: bg, ground, wall, glow, gate, accent.
 * - Night mode variants use the ink-navy "Night Train" page; nothing glows.
 * - getTheme() is called on run start and when night mode toggles.
 * - getSubjectTheme() supports topic-specific decorations.
 * - The keys are the SUBJECTS strings (see js/lang/topics.js); anything else gets the default theme.
 * - Does not import storage directly for night mode check;
 *   caller passes nightMode flag or we read it at call time.
 */

import { storage } from '../storage.js';

// Paper Passport colours (docs/DESIGN.md): every topic is one stamp colour on warm paper by day, and the same stamp
// colour on "Night Train" ink-navy by night. Nothing neon, nothing purple by default.
var PAPER = 0xf6eedc, PAPER_DEEP = 0xebddbf, CARD = 0xfffbf2;
var INK = 0x1b2a41, NIGHT_PAGE = 0x101b2d;

var STAMP = {
  "Talking": 0x5da9d6, "Body & Health": 0xd9432c, "Shopping & Money": 0xf2b134, "Feelings & Thinking": 0xc4566a,
  "Food & Drink": 0xe08a2c, "Travel & Places": 0x0e8c8a, "Nature & Animals": 0x2e9e5b, "Work & School": 0xb5983a,
  "Colors & Describing": 0xe0607e, "Home & Things": 0xb7694a, "People & Family": 0xe27d66, "Small Words": 0x6c85a8,
  "Time & Numbers": 0x4b5870, "Actions": 0xe8642c, "Basics": 0x0e8c8a, "default": 0x5da9d6
};

function mixHex(a, b, t) {
  var r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
  var g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
  var bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
  return (r << 16) | (g << 8) | bl;
}

function makeThemes(night) {
  var out = {};
  Object.keys(STAMP).forEach(function (k) {
    var hue = STAMP[k];
    out[k] = night
      ? { bg: mixHex(NIGHT_PAGE, hue, 0.1), ground: mixHex(INK, hue, 0.12), wall: mixHex(INK, hue, 0.35), glow: mixHex(hue, PAPER, 0.15), gate: mixHex(INK, hue, 0.3), accent: mixHex(hue, PAPER, 0.25) }
      : { bg: mixHex(PAPER, hue, 0.2), ground: mixHex(PAPER_DEEP, hue, 0.16), wall: mixHex(CARD, hue, 0.4), glow: hue, gate: mixHex(CARD, hue, 0.2), accent: hue };
  });
  return out;
}

var THEMES_NORMAL = makeThemes(false);
var THEMES_NIGHT = makeThemes(true);

/**
 * Get the active theme based on selected subjects and night mode.
 * @param {string[]} selectedSubjects
 * @returns {object} Theme color config
 */
export function getTheme(selectedSubjects) {
  var isNight = storage.get('nightMode');
  var themes = isNight ? THEMES_NIGHT : THEMES_NORMAL;

  if (selectedSubjects && selectedSubjects.length > 0) {
    for (var i = 0; i < selectedSubjects.length; i++) {
      if (themes[selectedSubjects[i]]) {
        return themes[selectedSubjects[i]];
      }
    }
  }

  return themes["default"];
}

/**
 * Get theme for a specific subject name.
 * @param {string} subject
 * @returns {object} Theme color config
 */
export function getSubjectTheme(subject) {
  var isNight = storage.get('nightMode');
  var themes = isNight ? THEMES_NIGHT : THEMES_NORMAL;
  return themes[subject] || themes["default"];
}
