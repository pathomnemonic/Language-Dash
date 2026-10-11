/**
 * theme.js — the look of the menus: "Paper Passport" (docs/DESIGN.md).
 *
 * Warm paper, navy ink, rubber-stamp colors. Paper is the default; Night Train is the dark one. Four more
 * palettes (Sunset Bazaar, Harbour Blue, Matcha, Postcard Pink) keep the same shapes and change the paper and the stamps.
 *
 * On Automatic the menus are Paper by day and Night Train after dark (or when the phone itself asks for dark).
 * Players can also pick any palette by hand in Settings -> Colors, or ask for a new one after every run (Surprise me).
 *
 * Every palette is derived from a handful of base colors, and the colors that carry text are pushed (a little at a
 * time) until they reach the contrast WCAG asks for, so every palette stays readable (tests check it).
 *
 * Pure functions here; applyTheme writes CSS variables on the page root.
 */

// ---------- color helpers ----------

function toRgb(c) {
  return [1, 3, 5].map(function (i) { return parseInt(c.slice(i, i + 2), 16); });
}
function toHex(rgb) {
  return '#' + rgb.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join('');
}
function toHsl(c) {
  var v = toRgb(c).map(function (x) { return x / 255; });
  var max = Math.max(v[0], v[1], v[2]), min = Math.min(v[0], v[1], v[2]);
  var l = (max + min) / 2, d = max - min, h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === v[0]) h = ((v[1] - v[2]) / d) % 6; else if (max === v[1]) h = (v[2] - v[0]) / d + 2; else h = (v[0] - v[1]) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h: h, s: s, l: l };
}
function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  var c = (1 - Math.abs(2 * l - 1)) * s;
  var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  var m = l - c / 2;
  var r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return toHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}

/** Blend color a toward color b by t (0..1). */
function mix(a, b, t) {
  var x = toRgb(a), y = toRgb(b);
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

/** WCAG contrast ratio between two #rrggbb colors (exported for tests). */
export function contrast(c1, c2) {
  function lum(c) {
    var v = [1, 3, 5].map(function (i) {
      var x = parseInt(c.slice(i, i + 2), 16) / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  var a = lum(c1), b = lum(c2);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function worst(color, backgrounds) {
  return Math.min.apply(null, backgrounds.map(function (bg) { return contrast(color, bg); }));
}

/**
 * The same hue as `color`, moved darker (or lighter, for dark palettes) a little at a time until it reaches
 * `min` contrast on every one of `backgrounds`. This is how a stamp color becomes a text color.
 */
function pushUntil(color, backgrounds, min, dir) {
  var p = toHsl(color);
  var l = p.l;
  var c = color;
  for (var i = 0; i < 90 && worst(c, backgrounds) < min; i++) {
    l += dir * 0.01;
    c = hsl(p.h, p.s, l);
  }
  return c;
}

/** A fill that paper-colored text can sit on: darkened until `text` reaches `min` contrast on it. */
function fillFor(color, text, min) {
  var p = toHsl(color);
  var l = p.l;
  var c = color;
  for (var i = 0; i < 90 && contrast(text, c) < min; i++) {
    l -= 0.01;
    c = hsl(p.h, p.s, l);
  }
  return c;
}

// ---------- the palettes ----------

/**
 * The base colors of each palette. `dark` palettes lift their stamp colors and use paper-colored text.
 * Everything else (the deep text partners, fills, lanes, soft ink) is derived below.
 */
var PALETTES = {
  paper: {
    name: 'Paper', dark: false,
    paper: '#F6EEDC', deep: '#EBDDBF', card: '#FFFBF2', ink: '#1B2A41', soft: '#4B5870', faint: '#8A93A3',
    red: '#D9432C', teal: '#0E8C8A', gold: '#F2B134', sky: '#5DA9D6', green: '#2E9E5B', plum: '#7B3F6E'
  },
  night: {
    name: 'Night Train', dark: true,
    paper: '#101B2D', deep: '#0A1424', card: '#1B2A41', ink: '#F6EEDC', soft: '#B7C0D1', faint: '#6F7E96',
    red: '#F0654D', teal: '#2FB5B0', gold: '#F5BF4F', sky: '#7CBDE6', green: '#4CC27C', plum: '#B06A9E'
  },
  sunset: {
    name: 'Sunset Bazaar', dark: false,
    paper: '#F8E6D0', deep: '#EDCDA7', card: '#FFF8EC', ink: '#3A1E2E',
    red: '#D6502A', teal: '#127E86', gold: '#F4A52B', sky: '#6AA2CF', green: '#3E9B50', plum: '#8E3B5E'
  },
  harbour: {
    name: 'Harbour Blue', dark: false,
    paper: '#E4EDF3', deep: '#C9DAE6', card: '#F7FBFD', ink: '#12304A',
    red: '#D8503A', teal: '#0C8798', gold: '#F0B23A', sky: '#4F9CD0', green: '#2F9D63', plum: '#6C4A86'
  },
  matcha: {
    name: 'Matcha', dark: false,
    paper: '#E9EFD6', deep: '#D2DDB1', card: '#F8FBEE', ink: '#1E3A2A',
    red: '#CF4A2F', teal: '#0F8A7A', gold: '#E9AE30', sky: '#5FA3C4', green: '#3A9A4E', plum: '#7A4568'
  },
  postcard: {
    name: 'Postcard Pink', dark: false,
    paper: '#F9E3E4', deep: '#F0C7CB', card: '#FFF7F5', ink: '#38213F',
    red: '#D43F4F', teal: '#13868C', gold: '#F2AE3C', sky: '#6BA6D8', green: '#379A5A', plum: '#8A3F78'
  }
};

/** Every CSS variable the theme sets (so a change can clear the old ones). */
var MANAGED = [
  '--paper', '--paper-deep', '--card', '--ink', '--ink-soft', '--ink-faint',
  '--red', '--teal', '--gold', '--sky', '--green', '--plum',
  '--red-deep', '--teal-deep', '--green-deep', '--sky-deep', '--gold-deep',
  '--red-fill', '--teal-fill', '--green-fill', '--on-fill', '--on-gold',
  '--line', '--shadow-c', '--field', '--scrim', '--grain-alpha', '--map-line', '--bg-fallback',
  '--lane-1', '--lane-2', '--lane-3', '--lane-1-ink', '--lane-2-ink', '--lane-3-ink'
];

/**
 * All the variables for one palette.
 * @param {string} id a palette id (see paletteIds)
 * @returns {Object<string,string>}
 */
export function paletteFor(id) {
  var p = PALETTES[id] || PALETTES.paper;
  var dark = p.dark;
  var surfaces = [p.paper, p.deep, p.card];
  var dir = dark ? 1 : -1;
  var onFill = dark ? '#FFFBF2' : '#FFFBF2';
  var onGold = dark ? '#101B2D' : p.ink;

  // secondary text: the ink, eased toward the paper while it still reads well on every surface
  var soft = p.soft || p.ink;
  if (!p.soft) {
    for (var t = 0.42; t > 0.05; t -= 0.03) {
      soft = mix(p.ink, p.paper, t);
      if (worst(soft, surfaces) >= 5) break;
    }
  }
  var faint = p.faint || mix(p.ink, p.paper, 0.62);

  var redFill = fillFor(p.red, onFill, 4.5);
  var tealFill = fillFor(p.teal, onFill, 4.5);
  var greenFill = fillFor(p.green, onFill, 4.5);
  var goldInk = worst(onGold, [p.gold]) >= 4.5 ? onGold : (dark ? '#101B2D' : '#1B2A41');

  var vars = {
    '--paper': p.paper, '--paper-deep': p.deep, '--card': p.card,
    '--ink': p.ink, '--ink-soft': soft, '--ink-faint': faint,
    '--red': p.red, '--teal': p.teal, '--gold': p.gold, '--sky': p.sky, '--green': p.green, '--plum': p.plum,
    '--red-deep': pushUntil(p.red, surfaces, 4.6, dir),
    '--teal-deep': pushUntil(p.teal, surfaces, 4.6, dir),
    '--green-deep': pushUntil(p.green, surfaces, 4.6, dir),
    '--sky-deep': pushUntil(p.sky, surfaces, 4.6, dir),
    '--gold-deep': dark ? p.gold : pushUntil(p.gold, surfaces, 4.6, -1),
    '--red-fill': redFill, '--teal-fill': tealFill, '--green-fill': greenFill,
    '--on-fill': onFill, '--on-gold': goldInk,
    '--line': p.ink,
    '--field': dark ? '#0F1A2B' : '#FFFFFF',
    '--scrim': dark ? 'rgba(5, 10, 20, 0.7)' : 'rgba(' + toRgb(p.ink).join(', ') + ', 0.62)',
    '--grain-alpha': dark ? '0.28' : '0.5',
    '--map-line': dark ? 'rgba(246, 238, 220, 0.12)' : 'rgba(' + toRgb(p.ink).join(', ') + ', 0.16)',
    '--bg-fallback': p.paper,
    '--lane-1': redFill, '--lane-2': p.gold, '--lane-3': tealFill,
    '--lane-1-ink': onFill, '--lane-2-ink': goldInk, '--lane-3-ink': onFill
  };
  if (dark) vars['--shadow-c'] = '#04080F';
  return vars;
}

/** The palette ids, in the order Settings lists them. */
export function worldIds() {
  return Object.keys(PALETTES);
}
export var paletteIds = worldIds;

/** Is this palette a dark one? */
export function isDark(id) {
  return !!(PALETTES[id] && PALETTES[id].dark);
}

// ---------- time of day ----------

export function daypartOf(hour) {
  if (hour >= 6 && hour < 9) return 'dawn';
  if (hour >= 9 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

/** The choices for Settings -> Colors: [id, label]. */
export var THEME_CHOICES = [
  ['auto', 'Automatic (Paper by day, Night Train after dark)'],
  ['paper', 'Paper'],
  ['night', 'Night Train (dark)'],
  ['sunset', 'Sunset Bazaar'],
  ['harbour', 'Harbour Blue'],
  ['matcha', 'Matcha'],
  ['postcard', 'Postcard Pink'],
  ['surprise', 'Surprise me (a new look after each run)']
];

/** A random palette other than `exclude` (so a reroll always looks different). */
export function rollWorld(exclude, rand) {
  var r = rand || Math.random;
  var ids = worldIds().filter(function (id) { return id !== exclude; });
  return ids[Math.min(ids.length - 1, Math.floor(r() * ids.length))];
}

/** A new look after every run (or whenever Home is shown after a few minutes). */
export var REROLL_EVERY_RUNS = 1;
export var REROLL_EVERY_MS = 4 * 60 * 1000;
export function rerollDue(runsSinceRoll, lastRollAt, now) {
  return runsSinceRoll >= REROLL_EVERY_RUNS || (now - lastRollAt) >= REROLL_EVERY_MS;
}

function phoneWantsDark() {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch { return false; }
}

/**
 * @param {Date} date
 * @param {string} mode 'auto' (Paper by day, Night Train after dark), 'surprise' (a rolled palette, passed as `rolled`), or a palette id to pick by hand.
 *   Anything else (a look from the earlier skin) means Automatic.
 * @param {string} [rolled] the palette a 'surprise' look currently uses
 * @param {boolean} [prefersDark] does the phone ask for dark? (read from the browser when left out)
 * @returns {{mode: string, world: string, daypart: string, dark: boolean, name: string, vars: Object<string,string>}}
 */
export function pickTheme(date, mode, rolled, prefersDark) {
  var d = date || new Date();
  var daypart = daypartOf(d.getHours());
  var id;
  var kept;
  if (PALETTES[mode]) {
    id = mode; kept = mode;
  } else if (mode === 'surprise') {
    id = PALETTES[rolled] ? rolled : 'paper'; kept = 'surprise';
  } else {
    var dark = daypart === 'night' || (prefersDark === undefined ? phoneWantsDark() : !!prefersDark);
    id = dark ? 'night' : 'paper'; kept = 'auto';
  }
  return {
    mode: kept,
    world: id,
    daypart: daypart,
    dark: PALETTES[id].dark,
    name: PALETTES[id].name,
    vars: paletteFor(id)
  };
}

/** Write the theme onto the page: CSS variables and data attributes. */
export function applyTheme(root, theme) {
  MANAGED.forEach(function (k) { root.style.removeProperty(k); });
  Object.keys(theme.vars).forEach(function (k) { root.style.setProperty(k, theme.vars[k]); });
  root.setAttribute('data-daypart', theme.daypart);
  root.setAttribute('data-world', theme.world);
  root.setAttribute('data-mode', theme.dark ? 'dark' : 'light');
  root.removeAttribute('data-season');
  root.removeAttribute('data-holiday');
}

/** The managed variable names (for tests). */
export function managedVariables() {
  return MANAGED.slice();
}
