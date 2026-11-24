// tools/social/template.mjs — the two slide layouts (1080x1350) in the game's look: dark navy, cream serif, gold accents.
// Pure string building, so the footer rule can be unit-tested without a browser.

import { FOOTER_TEXT, expandTokens } from './lib.mjs';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const para = (s) => esc(expandTokens(s)).replace(/\n/g, '<br>');

export const SLIDE = { width: 1080, height: 1350 };

function css(fontsDir) {
  return `
@font-face { font-family: "Fraunces"; font-weight: 900; src: url("file://${fontsDir}/fraunces-latin-900-normal.woff2") format("woff2"); }
@font-face { font-family: "Fraunces"; font-weight: 700; src: url("file://${fontsDir}/fraunces-latin-700-normal.woff2") format("woff2"); }
@font-face { font-family: "DM Sans"; font-weight: 700; src: url("file://${fontsDir}/dm-sans-latin-700-normal.woff2") format("woff2"); }
@font-face { font-family: "DM Sans"; font-weight: 500; src: url("file://${fontsDir}/dm-sans-latin-500-normal.woff2") format("woff2"); }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${SLIDE.width}px; height: ${SLIDE.height}px; }
body { background: #0c1430; color: #f6eedb; font-family: "DM Sans", system-ui, sans-serif; position: relative; overflow: hidden; }
.frame { position: absolute; inset: 36px 36px 196px 36px; border: 3px solid #f2b84b; border-radius: 28px; padding: 72px 70px; display: flex; flex-direction: column; }
.tag { font-weight: 700; letter-spacing: 6px; font-size: 26px; color: #f2b84b; text-transform: uppercase; }
.rule { height: 3px; background: #f2b84b; opacity: .5; margin: 26px 0 0; width: 180px; }
.hook { font-family: "Fraunces", Georgia, "Times New Roman", serif; font-weight: 900; font-size: 98px; line-height: 1.08; margin: auto 0; color: #f6eedb; }
.hook em { font-style: normal; color: #f2b84b; }
.kicker { font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 44px; color: #f2b84b; margin-bottom: 30px; }
.reveal { margin: 40px 0 10px; display: flex; flex-direction: column; gap: 26px; }
.row { display: flex; align-items: baseline; gap: 26px; border-bottom: 2px solid rgba(246,238,219,.18); padding-bottom: 22px; }
.row .en { font-size: 40px; color: rgba(246,238,219,.75); min-width: 270px; }
.row .arrow { font-size: 40px; color: #f2b84b; }
.row .word { font-family: "Fraunces", "FreeSerif", "WenQuanYi Zen Hei", "Noto Sans", serif; font-weight: 900; font-size: 104px; line-height: 1; }
.row .roman { font-size: 40px; color: #f2b84b; font-style: italic; }
.body { font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 50px; line-height: 1.28; margin-top: 34px; }
.body p + p { margin-top: 26px; }
.foot { position: absolute; left: 0; right: 0; bottom: 0; height: 160px; background: #f2b84b; color: #0c1430; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: 700; font-size: 44px; letter-spacing: .5px; padding: 0 40px; }
.foot b { font-family: "Fraunces", Georgia, serif; font-weight: 900; }
`;
}

/** The footer band every export carries. */
export function footerHtml() {
  return `<div class="foot" data-footer="1"><span><b>${esc(FOOTER_TEXT)}</b></span></div>`;
}

export function slide1Html(post, fontsDir) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css(fontsDir)}</style></head><body>
<div class="frame"><div class="tag">Language Dash</div><div class="rule"></div>
<div class="hook" data-slide="1">${para(post.hook)}</div></div>${footerHtml()}</body></html>`;
}

/** reveal: [{ hint, answer, roman }] straight from the deck lookups. */
export function slide2Html(post, reveal, fontsDir) {
  const rows = reveal.map((r) => `<div class="row"><span class="en">${esc(r.hint)}</span><span class="arrow">&rarr;</span><span class="word">${esc(r.answer)}</span>${r.roman ? `<span class="roman">${esc(r.roman)}</span>` : ''}</div>`).join('');
  const lines = Array.isArray(post.payoff) ? post.payoff : [post.payoff];
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css(fontsDir)}</style></head><body>
<div class="frame"><div class="tag">Language Dash</div><div class="rule"></div>
<div class="kicker" style="margin-top:50px">${esc(post.kicker || 'Here is why')}</div>
<div class="reveal" data-slide="2">${rows}</div>
<div class="body">${lines.map((l) => `<p>${para(l)}</p>`).join('')}</div></div>${footerHtml()}</body></html>`;
}
