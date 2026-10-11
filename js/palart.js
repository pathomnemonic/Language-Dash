/**
 * palart.js — the drawings of the word pals.
 *
 * Every pal is a small flat illustration with the same navy ink outline as the rest of the game (docs/DESIGN.md),
 * drawn as inline SVG on a 64 x 64 grid. They are static strings written here (nothing from users or the network goes
 * in), so they are safe to use as innerHTML. palSvg(id) returns the markup, or '' for a pal without a drawing (the
 * caller then falls back to the pal's emoji).
 */

var INK = '#1b2a41';

function wrap(inner) {
  return '<svg class="pal-art" viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true" focusable="false" ' +
    'fill="none" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">' + inner + '</svg>';
}

function eyes(x1, x2, y, r) {
  return '<circle cx="' + x1 + '" cy="' + y + '" r="' + (r || 2) + '" fill="' + INK + '" stroke="none"/><circle cx="' + x2 + '" cy="' + y + '" r="' + (r || 2) + '" fill="' + INK + '" stroke="none"/>';
}

function cheeks(x1, x2, y) {
  return '<ellipse cx="' + x1 + '" cy="' + y + '" rx="3" ry="2" fill="#f08a8a" stroke="none" opacity="0.8"/><ellipse cx="' + x2 + '" cy="' + y + '" rx="3" ry="2" fill="#f08a8a" stroke="none" opacity="0.8"/>';
}

var ART = {
  // a snail whose shell is stamped like a parcel: it gets there, eventually
  pal_snail: wrap(
    '<path d="M5 53 C5 45 12 42 19 44 L53 44 C60 44 60 53 53 53 Z" fill="#b9c66a"/>' +
    '<path d="M12 44 L10 30" /><path d="M18 43 L20 30"/><circle cx="10" cy="28" r="3.2" fill="#fffbf2"/><circle cx="20" cy="28" r="3.2" fill="#fffbf2"/>' +
    '<circle cx="10" cy="28" r="1.2" fill="' + INK + '" stroke="none"/><circle cx="20" cy="28" r="1.2" fill="' + INK + '" stroke="none"/>' +
    '<circle cx="40" cy="31" r="15" fill="#f2b134"/><path d="M40 31 a3 3 0 1 1 3 3 a6.5 6.5 0 1 1 -9.5 -5 a10.5 10.5 0 1 1 16 8"/>' +
    '<rect x="44" y="18" width="8" height="6" rx="1" fill="#d9432c" transform="rotate(18 48 21)"/>' +
    '<path d="M9 49 Q13 52 17 49"/>'),
  // an axolotl: feathery gills, a permanent smile
  pal_axolotl: wrap(
    '<ellipse cx="32" cy="53" rx="15" ry="7" fill="#f6b3c4"/>' +
    '<path d="M17 30 L5 22 M17 34 L3 33 M18 38 L6 44" stroke-width="3"/><circle cx="5" cy="22" r="3" fill="#e8758f"/><circle cx="3" cy="33" r="3" fill="#e8758f"/><circle cx="6" cy="44" r="3" fill="#e8758f"/>' +
    '<path d="M47 30 L59 22 M47 34 L61 33 M46 38 L58 44" stroke-width="3"/><circle cx="59" cy="22" r="3" fill="#e8758f"/><circle cx="61" cy="33" r="3" fill="#e8758f"/><circle cx="58" cy="44" r="3" fill="#e8758f"/>' +
    '<circle cx="32" cy="34" r="17" fill="#f6b3c4"/>' + eyes(25, 39, 31, 2.3) + cheeks(21, 43, 38) +
    '<path d="M27 38 Q32 44 37 38"/>'),
  // a llama in a woven blanket
  pal_llama: wrap(
    '<path d="M16 54 V44 M24 54 V44 M38 54 V44 M46 54 V44"/>' +
    '<path d="M36 40 L40 18 L48 18 L47 40 Z" fill="#f1e3c4"/>' +
    '<ellipse cx="30" cy="42" rx="19" ry="11" fill="#f1e3c4"/>' +
    '<path d="M18 33 Q30 28 42 33 L42 40 Q30 35 18 40 Z" fill="#d9432c"/><path d="M18 36.5 Q30 31.5 42 36.5" stroke="#f2b134" stroke-width="2"/>' +
    '<ellipse cx="46" cy="14" rx="9" ry="7" fill="#f1e3c4"/><path d="M42 8 L41 2 L46 7 M50 8 L53 2 L52 9" fill="#f1e3c4"/>' +
    '<circle cx="51" cy="14" r="1.6" fill="' + INK + '" stroke="none"/><path d="M52 17 Q54 18 55 17"/><path d="M11 40 Q8 36 12 34"/>'),
  // a magpie with a shiny find
  pal_magpie: wrap(
    '<path d="M24 36 L4 52 L10 56 L26 46 Z" fill="#0e8c8a"/>' +
    '<ellipse cx="32" cy="38" rx="17" ry="12" fill="' + INK + '"/>' +
    '<ellipse cx="34" cy="42" rx="10" ry="7" fill="#fffbf2"/>' +
    '<path d="M18 34 Q30 26 40 34 Q30 42 18 34 Z" fill="#0e8c8a"/>' +
    '<circle cx="46" cy="24" r="9" fill="' + INK + '"/><path d="M54 22 L62 25 L54 28 Z" fill="#f2b134"/>' +
    '<circle cx="47" cy="22" r="2.2" fill="#fffbf2" stroke="none"/><circle cx="47.6" cy="22" r="1" fill="' + INK + '" stroke="none"/>' +
    '<path d="M30 49 L28 57 M37 49 L38 57"/>' +
    '<path d="M60 10 l1.5 3.5 l3.5 .3 l-2.7 2.3 l.9 3.4 l-3.2 -1.9 l-3.2 1.9 l.9 -3.4 l-2.7 -2.3 l3.5 -.3 z" fill="#f2b134" stroke-width="1.4" transform="translate(-5 -4) scale(.9)"/>'),
  // a capybara, a yuzu on its head
  pal_capybara: wrap(
    '<path d="M14 54 V50 M24 54 V50 M40 54 V50 M50 54 V50" stroke-width="4"/>' +
    '<rect x="8" y="30" width="44" height="24" rx="12" fill="#b98a5a"/>' +
    '<path d="M42 34 C42 24 58 24 60 34 C61 44 52 48 44 46 Z" fill="#b98a5a"/>' +
    '<circle cx="50" cy="33" r="1.8" fill="' + INK + '" stroke="none"/><ellipse cx="59" cy="38" rx="2.6" ry="2" fill="' + INK + '"/>' +
    '<path d="M44 26 L43 22 L47 25 Z" fill="#b98a5a"/>' +
    '<circle cx="49" cy="21" r="5" fill="#f2b134"/><path d="M49 16 Q53 12 56 15 Q52 18 49 16 Z" fill="#2e9e5b"/>' +
    '<path d="M54 41 Q56 43 58 42"/>'),
  // a steamed dumpling in its bamboo basket
  pal_dumpling: wrap(
    '<rect x="6" y="50" width="52" height="9" rx="3" fill="#d9b36b"/><path d="M17 50 V59 M29 50 V59 M41 50 V59"/>' +
    '<path d="M10 48 C8 30 20 20 32 18 C44 20 56 30 54 48 Z" fill="#fff6e6"/>' +
    '<path d="M32 18 L32 28 M26 20 Q27 26 24 29 M38 20 Q37 26 40 29 M21 24 Q23 28 19 31 M43 24 Q41 28 45 31" stroke-width="2"/>' +
    eyes(24, 40, 40, 2.2) + cheeks(19, 45, 45) + '<path d="M28 43 Q32 47 36 43"/>'),
  // a kite with a smile and a bowtie tail
  pal_kite: wrap(
    '<path d="M32 3 L50 22 L32 42 L14 22 Z" fill="#fffbf2"/>' +
    '<path d="M32 3 L50 22 L32 22 Z" fill="#d9432c"/><path d="M32 22 L50 22 L32 42 Z" fill="#f2b134"/><path d="M32 22 L14 22 L32 42 Z" fill="#0e8c8a"/><path d="M32 3 L14 22 L32 22 Z" fill="#5da9d6"/>' +
    eyes(27, 37, 19, 1.8) + '<path d="M28 25 Q32 29 36 25"/>' +
    '<path d="M32 42 C24 47 40 52 32 60"/><path d="M28 47 L34 47 L28 51 L34 51 Z" fill="#d9432c" stroke-width="1.6"/><path d="M30 54 L36 54 L30 58 L36 58 Z" fill="#0e8c8a" stroke-width="1.6"/>'),
  // a bonsai sprite in a pot
  pal_bonsai: wrap(
    '<path d="M15 46 H49 L45 60 H19 Z" fill="#c46a43"/><path d="M15 46 H49" stroke-width="3.5"/>' +
    '<path d="M32 46 C30 40 36 36 33 30 C31 26 26 26 24 22" stroke="#7a4a2a" stroke-width="3.5"/><path d="M33 34 C38 32 42 30 44 26" stroke="#7a4a2a" stroke-width="3"/>' +
    '<circle cx="19" cy="22" r="9" fill="#4aa56a"/><circle cx="33" cy="13" r="10" fill="#5cb87a"/><circle cx="46" cy="24" r="8.5" fill="#4aa56a"/>' +
    eyes(26, 38, 52, 2) + '<path d="M29 55 Q32 58 35 55"/>'),
  // a teapot that whistles in every language
  pal_teapot: wrap(
    '<path d="M25 12 q-4 -4 0 -7 M32 12 q-4 -4 0 -7 M39 12 q-4 -4 0 -7" stroke="#8a93a3" stroke-width="2"/>' +
    '<path d="M13 32 C4 30 4 46 15 46" stroke-width="3.5"/>' +
    '<path d="M46 40 C52 40 52 30 58 26 L60 29 C56 33 56 44 47 48 Z" fill="#0e8c8a"/>' +
    '<ellipse cx="30" cy="38" rx="19" ry="16" fill="#0e8c8a"/><path d="M13 32 Q30 22 47 32" stroke="#f2b134" stroke-width="2.5"/>' +
    '<ellipse cx="30" cy="22" rx="11" ry="4" fill="#0e8c8a"/><circle cx="30" cy="16" r="3" fill="#f2b134"/>' +
    eyes(23, 37, 38, 2) + cheeks(19, 41, 43) + '<path d="M27 42 Q30 46 33 42"/>'),
  // a nesting doll
  pal_matryoshka: wrap(
    '<path d="M16 26 C6 42 8 58 22 60 H42 C56 58 58 42 48 26 Z" fill="#d9432c"/>' +
    '<circle cx="32" cy="20" r="12" fill="#f2b134"/>' +
    '<circle cx="32" cy="23" r="8" fill="#f6dcc0"/>' +
    '<path d="M20 20 C20 8 44 8 44 20 C40 14 24 14 20 20 Z" fill="#d9432c"/>' +
    eyes(28.5, 35.5, 24, 1.6) + '<path d="M29 27.5 Q32 30 35 27.5"/>' +
    '<ellipse cx="32" cy="46" rx="9" ry="10" fill="#fffbf2"/>' +
    '<circle cx="32" cy="46" r="2" fill="#f2b134"/><circle cx="32" cy="41" r="2.5" fill="#0e8c8a"/><circle cx="32" cy="51" r="2.5" fill="#0e8c8a"/><circle cx="27" cy="46" r="2.5" fill="#0e8c8a"/><circle cx="37" cy="46" r="2.5" fill="#0e8c8a"/>'),
  // a hot-air balloon that can see every border
  pal_balloon: wrap(
    '<path d="M18 36 L25 50 M46 36 L39 50" stroke-width="2"/>' +
    '<ellipse cx="32" cy="22" rx="20" ry="20" fill="#d9432c"/>' +
    '<path d="M32 2 C22 10 22 34 32 42 C42 34 42 10 32 2 Z" fill="#f2b134"/>' +
    '<path d="M32 2 C27 12 27 32 32 42 C37 32 37 12 32 2" stroke-width="1.6"/>' +
    '<rect x="23" y="49" width="18" height="10" rx="2" fill="#b8793a"/><path d="M23 54 H41" stroke-width="1.6"/>' +
    eyes(28, 36, 22, 2) + '<path d="M29 27 Q32 30 35 27"/>'),
  // a mini steam train: choo-choo
  pal_train: wrap(
    '<circle cx="9" cy="20" r="4" fill="#fffbf2"/><circle cx="16" cy="14" r="5" fill="#fffbf2"/><circle cx="24" cy="8" r="4" fill="#fffbf2"/>' +
    '<path d="M14 22 H22 L24 30 H12 Z" fill="' + INK + '"/>' +
    '<rect x="6" y="28" width="36" height="20" rx="5" fill="#0e8c8a"/>' +
    '<rect x="38" y="18" width="20" height="30" rx="3" fill="#d9432c"/><rect x="42" y="22" width="12" height="9" rx="1" fill="#fffbf2"/>' +
    '<path d="M36 18 H60" stroke-width="3.5"/>' +
    '<circle cx="11" cy="37" r="3" fill="#f2b134"/>' + eyes(19, 27, 36, 1.8) + '<path d="M20 41 Q23 44 26 41"/>' +
    '<circle cx="15" cy="51" r="6.5" fill="#f2b134"/><circle cx="32" cy="51" r="6.5" fill="#f2b134"/><circle cx="50" cy="51" r="6.5" fill="#f2b134"/>' +
    '<circle cx="15" cy="51" r="1.5" fill="' + INK + '" stroke="none"/><circle cx="32" cy="51" r="1.5" fill="' + INK + '" stroke="none"/><circle cx="50" cy="51" r="1.5" fill="' + INK + '" stroke="none"/>'),
  // an ink blot with a quill
  pal_inkling: wrap(
    '<path d="M32 12 C40 24 52 30 52 43 C52 54 43 60 32 60 C21 60 12 54 12 43 C12 30 24 24 32 12 Z" fill="#2f5d8c"/>' +
    '<path d="M22 38 Q22 33 27 31" stroke="#8fb4dc" stroke-width="2.4"/>' +
    '<circle cx="25" cy="45" r="6" fill="#fffbf2"/><circle cx="39" cy="45" r="6" fill="#fffbf2"/>' +
    '<circle cx="26.5" cy="46" r="2.4" fill="' + INK + '" stroke="none"/><circle cx="40.5" cy="46" r="2.4" fill="' + INK + '" stroke="none"/>' +
    '<path d="M28 54 Q32 57 36 54"/>' +
    '<path d="M36 18 L52 3" stroke-width="2.4"/><path d="M52 3 C60 4 60 12 54 14 C52 10 50 8 46 8 C47 5 50 3 52 3 Z" fill="#f2b134"/>')
};

/** The drawing for a pal as SVG markup ('' when it has none). */
export function palSvg(id) {
  return ART[id] || '';
}

/** Ids of every pal that has a drawing (for tests and tools). */
export function palArtIds() {
  return Object.keys(ART);
}
