// tools/social/template.mjs — the slide layouts (1080x1350): four compositions, five colour themes, one footer band.
// Pure string building, so the rules (footer, layout rotation) can be unit-tested without a browser.

import { FOOTER_TEXT, THEMES, LAYOUTS, expandTokens } from './lib.mjs';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Plain text with {{rank:N}} expanded; **word** becomes an accent-coloured emphasis. */
const rich = (s) => esc(expandTokens(s)).replace(/\*\*([^*]+)\*\*/g, '<em>$1</em>').replace(/\n/g, '<br>');

export const SLIDE = { width: 1080, height: 1350 };
export { LAYOUTS };

export function themeOf(id) { return THEMES.find((t) => t.id === id) || THEMES[0]; }

function css(fontsDir, t) {
  return `
@font-face { font-family: "Fraunces"; font-weight: 900; src: url("file://${fontsDir}/fraunces-latin-900-normal.woff2") format("woff2"); }
@font-face { font-family: "Fraunces"; font-weight: 700; src: url("file://${fontsDir}/fraunces-latin-700-normal.woff2") format("woff2"); }
@font-face { font-family: "DM Sans"; font-weight: 700; src: url("file://${fontsDir}/dm-sans-latin-700-normal.woff2") format("woff2"); }
@font-face { font-family: "DM Sans"; font-weight: 500; src: url("file://${fontsDir}/dm-sans-latin-500-normal.woff2") format("woff2"); }
:root { --bg: ${t.bg}; --panel: ${t.panel}; --accent: ${t.accent}; --ink: ${t.ink}; --foot-ink: ${t.footInk}; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${SLIDE.width}px; height: ${SLIDE.height}px; }
body { background: var(--bg); color: var(--ink); font-family: "DM Sans", system-ui, sans-serif; position: relative; overflow: hidden; }
em { font-style: normal; color: var(--accent); }
.serif { font-family: "Fraunces", Georgia, "Times New Roman", serif; }
.tag { font-weight: 700; letter-spacing: 6px; font-size: 26px; color: var(--accent); text-transform: uppercase; }
.word { font-family: "Fraunces", "FreeSerif", "WenQuanYi Zen Hei", "Noto Sans", serif; font-weight: 900; line-height: 1; }
.roman { color: var(--accent); font-style: italic; }
.foot { position: absolute; left: 0; right: 0; bottom: 0; height: 160px; background: var(--accent); color: var(--foot-ink); display: flex; align-items: center; justify-content: center; text-align: center; font-weight: 700; font-size: 44px; padding: 0 40px; }
.foot b { font-family: "Fraunces", Georgia, serif; font-weight: 900; }
/* scenario: framed card, tag on top */
.frame { position: absolute; inset: 36px 36px 196px 36px; border: 3px solid var(--accent); border-radius: 28px; padding: 72px 70px; display: flex; flex-direction: column; }
.rule { height: 3px; background: var(--accent); opacity: .5; margin: 26px 0 0; width: 180px; }
.scn-hook { font-size: 98px; line-height: 1.08; margin: auto 0; }
/* bold claim: no frame, a thick accent bar, enormous type */
.bold { position: absolute; inset: 0 0 160px 0; padding: 90px 80px 60px 130px; display: flex; flex-direction: column; justify-content: center; }
.bold::before { content: ""; position: absolute; left: 60px; top: 90px; bottom: 60px; width: 22px; background: var(--accent); }
.bold .tag { position: absolute; top: 60px; left: 130px; }
.bold-hook { font-size: 116px; line-height: 1; letter-spacing: -1px; }
/* big word: a panel with one giant word */
.bigp { position: absolute; inset: 0 0 160px 0; padding: 90px 80px; display: flex; flex-direction: column; }
.bigp .tag { margin-bottom: 40px; }
.big-q { margin: auto 0; font-size: 70px; line-height: 1.15; }
.big-q .mark { display: block; font-size: 380px; line-height: .55; color: var(--accent); margin-bottom: 50px; }
.big-word { margin: auto 0 20px; text-align: center; }
.big-word .word { font-size: 330px; }
.big-word .roman { font-size: 72px; margin-top: 10px; }
.big-row { display: flex; justify-content: center; gap: 70px; flex-wrap: wrap; }
.big-row .lab { font-size: 38px; color: rgba(246,238,219,.72); margin-bottom: 8px; }
/* story: a note, left-aligned, with an opening quote mark and a panel */
.story { position: absolute; inset: 70px 70px 230px 70px; background: var(--panel); border-radius: 22px; padding: 70px 70px 60px 80px; display: flex; flex-direction: column; }
.story .tag { font-size: 24px; }
.story .q { font-size: 300px; line-height: .6; color: var(--accent); margin: 40px 0 10px; height: 150px; }
.story-hook { font-size: 70px; line-height: 1.2; font-style: italic; margin-top: 10px; }
.story-body { font-size: 46px; line-height: 1.35; font-weight: 700; margin-top: 28px; }
.story-body p + p { margin-top: 24px; }
/* shared slide-2 parts */
.kicker { font-size: 44px; color: var(--accent); margin: 50px 0 0; font-weight: 700; }
.reveal { margin: 38px 0 10px; display: flex; flex-direction: column; gap: 26px; }
.row { display: flex; align-items: baseline; gap: 26px; border-bottom: 2px solid rgba(246,238,219,.18); padding-bottom: 22px; }
.row .en { font-size: 40px; color: rgba(246,238,219,.75); min-width: 270px; }
.row .arrow { font-size: 40px; color: var(--accent); }
.row .word { font-size: 104px; }
.row .roman { font-size: 40px; }
.body { font-size: 50px; line-height: 1.28; margin-top: 34px; font-weight: 700; }
.body p + p { margin-top: 26px; }
`;
}

export function footerHtml() {
  return `<div class="foot" data-footer="1"><span><b>${esc(FOOTER_TEXT)}</b></span></div>`;
}

function page(fontsDir, theme, bodyHtml) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css(fontsDir, themeOf(theme))}</style></head><body>${bodyHtml}${footerHtml()}</body></html>`;
}

function revealRows(reveal) {
  return reveal.map((r) => `<div class="row"><span class="en">${esc(r.hint)}</span><span class="arrow">&rarr;</span><span class="word">${esc(r.answer)}</span>${r.roman ? `<span class="roman">${esc(r.roman)}</span>` : ''}</div>`).join('');
}
const lines = (post) => (Array.isArray(post.payoff) ? post.payoff : [post.payoff]);

/** Slide 1. plan: { layout, theme } */
export function slide1Html(post, fontsDir, plan) {
  const layout = (plan && plan.layout) || 'scenario';
  const theme = plan && plan.theme;
  let body;
  if (layout === 'bold-claim') {
    body = `<div class="bold"><div class="tag">Language Dash</div><div class="bold-hook serif" style="font-weight:900" data-slide="1" data-layout="bold-claim">${rich(post.hook)}</div></div>`;
  } else if (layout === 'big-word') {
    body = `<div class="bigp"><div class="tag">Language Dash</div><div class="big-q serif" style="font-weight:900" data-slide="1" data-layout="big-word"><span class="mark">?</span>${rich(post.hook)}</div></div>`;
  } else if (layout === 'story') {
    body = `<div class="story"><div class="tag">Language Dash</div><div class="q serif">&ldquo;</div><div class="story-hook serif" data-slide="1" data-layout="story">${rich(post.hook)}</div></div>`;
  } else {
    body = `<div class="frame"><div class="tag">Language Dash</div><div class="rule"></div><div class="scn-hook serif" style="font-weight:900" data-slide="1" data-layout="scenario">${rich(post.hook)}</div></div>`;
  }
  return page(fontsDir, theme, body);
}

/** Slide 2. reveal: [{ hint, answer, roman }] straight from the deck. */
export function slide2Html(post, reveal, fontsDir, plan) {
  const layout = (plan && plan.layout) || 'scenario';
  const theme = plan && plan.theme;
  const text = lines(post).map((l) => `<p>${rich(l)}</p>`).join('');
  let body;
  if (layout === 'bold-claim') {
    body = `<div class="bold" style="justify-content:flex-start;padding-top:170px"><div class="tag">Language Dash</div><div class="kicker serif" style="margin-top:0">${esc(post.kicker || 'Here is why')}</div><div class="reveal" data-slide="2" data-layout="bold-claim">${revealRows(reveal)}</div><div class="body serif">${text}</div></div>`;
  } else if (layout === 'big-word') {
    const words = reveal.reduce((acc, r) => (acc.some((x) => x.answer === r.answer) ? acc : acc.concat([r])), []);
    const big = words.map((r) => `<div><div class="lab">${esc(reveal.filter((x) => x.answer === r.answer).map((x) => x.hint).join(' / '))}</div><div class="word">${esc(r.answer)}</div>${r.roman ? `<div class="roman">${esc(r.roman)}</div>` : ''}</div>`).join('');
    const size = words.length > 1 ? 'style="font-size:200px"' : '';
    body = `<div class="bigp"><div class="tag">Language Dash</div><div class="big-word" data-slide="2" data-layout="big-word"><div class="big-row">${big.replace(/class="word"/g, `class="word" ${size}`)}</div></div><div class="body serif" style="font-size:44px;margin-top:20px">${text}</div></div>`;
  } else if (layout === 'story') {
    body = `<div class="story"><div class="tag">Language Dash</div><div class="reveal" data-slide="2" data-layout="story" style="margin-top:30px">${revealRows(reveal)}</div><div class="story-body serif">${text}</div></div>`;
  } else {
    body = `<div class="frame"><div class="tag">Language Dash</div><div class="rule"></div><div class="kicker serif">${esc(post.kicker || 'Here is why')}</div><div class="reveal" data-slide="2" data-layout="scenario">${revealRows(reveal)}</div><div class="body serif">${text}</div></div>`;
  }
  return page(fontsDir, theme, body);
}

/**
 * Slide 3 as posted: the real game screenshot, a challenge line and a free-play call to action, then the footer band.
 * `imageUrl` is the screenshot (file URL); the overlay text is the standard (see lib.mjs OVERLAY_CHALLENGES), never a claim about the word.
 */
export function slide3Html(imageUrl, overlay, fontsDir, theme) {
  const t = themeOf(theme);
  // the whole game screen (HUD, hint, gates, track and runner) in a phone frame on the right; the challenge and call to action on the left
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css(fontsDir, t)}
.s3 { position: absolute; inset: 0 0 160px 0; padding: 60px 50px 50px 60px; display: flex; gap: 36px; align-items: center; }
.s3 .txt { flex: 1; display: flex; flex-direction: column; justify-content: center; height: 100%; }
.s3 .ch { font-family: "Fraunces", Georgia, serif; font-weight: 900; font-size: 58px; line-height: 1.12; color: var(--ink); }
.s3 .cta { align-self: flex-start; margin-top: 34px; background: var(--accent); color: var(--foot-ink); font-weight: 700; font-size: 40px; padding: 14px 34px; border-radius: 999px; letter-spacing: .5px; }
.s3 .phone { width: 520px; height: 1124px; border-radius: 44px; border: 8px solid var(--accent); background: #000 url("${imageUrl}") center / cover no-repeat; flex: none; }
</style></head><body><div class="s3"><div class="txt" data-overlay="1"><div class="tag" style="margin-bottom:34px">Language Dash</div><div class="ch">${esc(overlay.challenge)}</div><div class="cta">${esc(overlay.cta)}</div></div><div class="phone"></div></div>${footerHtml()}</body></html>`;
}
