// tools/brand.mjs — the Language Dash mark, drawn as shapes (no fonts needed): "Paper Passport", docs/DESIGN.md.
//
// The logo is a circular rubber stamp: a double ring and a ring of dashes in stamp red, "Language Dash" in Fraunces Black,
// and a small speech bubble with "A あ". The app icon is that stamp, on a paper disc, on a teal square.
// Letters are outlines taken from the self-hosted fonts (tools/brand-glyphs.json: Fraunces 900, DM Sans italic, IPAGothic for あ),
// so the art renders the same everywhere.

import fs from 'node:fs';

const glyphs = JSON.parse(fs.readFileSync(new URL('./brand-glyphs.json', import.meta.url), 'utf8'));

export const PAPER = '#F6EEDC';
export const PAPER_DEEP = '#EBDDBF';
export const CARD = '#FFFBF2';
export const INK = '#1B2A41';
export const RED = '#D9432C';
export const RED_DEEP = '#B5341F';
export const TEAL = '#0E8C8A';
export const TEAL_DEEP = '#0A7A78';
export const GOLD = '#F2B134';
export const NIGHT = '#101B2D';
export const TAGLINE = 'Run the lexicon.';
// (the store-screenshot tool still imports these two names)
export const BG = PAPER;
export const CYAN = TEAL_DEEP;

/** A line of text as outlines: its left edge at x (or centered on x), its baseline at y, `size` tall. */
export function text(key, size, x, y, fill, { anchor = 'middle', extra = '' } = {}) {
  const g = glyphs[key];
  const s = size / 100;
  const left = anchor === 'middle' ? x - (g.w * s) / 2 : anchor === 'end' ? x - g.w * s : x;
  return `<path transform="translate(${left.toFixed(1)} ${y}) scale(${s})" d="${g.d}" fill="${fill}" ${extra}/>`;
}
export const textWidth = (key, size) => (glyphs[key].w * size) / 100;

/**
 * The rubber stamp, centered on 0,0 in a box 420 across: double ring, dashes, wordmark, speech bubble. `ink` is the stamp
 * ink, `fill` is what is inside it (the paper under the stamp, so the bubble is not see-through).
 */
export function stamp({ ink = RED, text: tcolor = RED_DEEP, fill = PAPER, rotate = -8 } = {}) {
  const ring = (r, w, dash = '') => `<circle r="${r}" fill="none" stroke="${ink}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  return `<g transform="rotate(${rotate})">
    ${ring(196, 15)}${ring(172, 5)}${ring(142, 5, '15 12')}
    ${text('Language', 53, 0, -6, tcolor)}${text('Dash', 53, 0, 52, tcolor)}
    <g transform="translate(0 104)">
      <path d="M-62 -26h124a14 14 0 0 1 14 14v22a14 14 0 0 1-14 14H-14l-18 18v-18h-30a14 14 0 0 1-14-14v-22a14 14 0 0 1 14-14z" fill="${fill}" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>
      ${text('A', 36, -26, 10, tcolor)}${text('a_hira', 32, 20, 9, tcolor)}
    </g>
  </g>`;
}

/** The mark at `fraction` of a `size` square, centered at x, y: the stamp on a paper disc with a hard shadow. */
export function mark(size, fraction, x = size / 2, y = size / 2, { shadow = INK, ink = RED, text: tc = RED_DEEP, paper = PAPER, ringInk = INK } = {}) {
  const s = (size * fraction) / 460;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <circle cx="12" cy="14" r="226" fill="${shadow}"/>
    <circle r="226" fill="${paper}" stroke="${ringInk}" stroke-width="9"/>
    ${stamp({ ink, text: tc, fill: paper })}
  </g>`;
}

/** A dotted flight route with a paper plane, for backgrounds. */
export function route(w, h, color = INK, opacity = 0.28) {
  return `<g fill="none" stroke="${color}" stroke-width="${Math.max(4, w / 260)}" stroke-linecap="round" stroke-dasharray="1 ${Math.max(16, w / 55)}" opacity="${opacity}">
    <path d="M${-w * 0.05} ${h * 0.78} Q${w * 0.3} ${h * 0.2} ${w * 0.55} ${h * 0.62} T${w * 1.05} ${h * 0.3}"/>
    <path d="M${-w * 0.05} ${h * 0.34} Q${w * 0.28} ${h * 0.58} ${w * 0.7} ${h * 0.12}"/>
  </g>`;
}
