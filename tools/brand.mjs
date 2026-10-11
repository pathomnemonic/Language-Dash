// tools/brand.mjs — the Language Dash mark, drawn as shapes (no fonts needed) in a 512 box.
export const BG = '#0b1020';
export const CYAN = '#22d3ee';
export const WHITE = '#e8f7ff';
export const TAGLINE = 'Run the words.';

/** The "LD" monogram with a speed line underneath. Centered in the 512 box. */
export const MARK = `
<g transform="translate(0 -40)" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path d="M70 150V362H200" stroke="${WHITE}" stroke-width="46"/>
  <path d="M270 150H330a106 106 0 0 1 0 212H270Z" stroke="${CYAN}" stroke-width="46"/>
  <path d="M40 440H190L230 424H300L340 440H472" stroke="${CYAN}" stroke-width="22" opacity=".95"/>
</g>`;

/** Place the mark centered in a `size` square at `fraction` of its width. */
export const mark = (size, fraction, x = size / 2, y = size / 2) => {
  const s = (size * fraction) / 512;
  return `<g transform="translate(${x - 256 * s} ${y - 256 * s}) scale(${s})">${MARK}</g>`;
};
export const glow = `<defs><filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
<radialGradient id="bgr" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#1a2550"/><stop offset="1" stop-color="${BG}"/></radialGradient></defs>`;
