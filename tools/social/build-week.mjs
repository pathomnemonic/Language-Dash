#!/usr/bin/env node
// tools/social/build-week.mjs — the Language Dash social post factory.
//
//   node tools/social/build-week.mjs <hooks.json> [--out <dir>] [--final] [--check]
//
// Reads a list of hook specs, refuses any that break the standing rules (see lib.mjs), and for each one that passes writes:
//   slide1.png      the hook (1080x1350)
//   slide2.png      the payoff, with the real words from the deck (1080x1350)
//   slide3.json     the real gates and the exact capture parameters for the game screenshot (see capture-gates.mjs)
//   caption.txt     a caption (the spec's own, or a plain one), with the footer line
//   report.json     the checks that ran, any warnings, the rank phrase for each word
// The tool plans the whole list as one week: every post gets a layout (scenario, bold-claim, big-word, story), a colour theme,
// a map and a runner for the slide-3 capture, and a challenge line, and none repeats back to back. Every spec names its hook
// vein (false-friend, meaning-flip, etymology, same-word-two-meanings, cultural-word); the same vein twice in a row is refused.
// Slide 3 is composed afterwards by compose-slide3.mjs (screenshot + challenge line + "Free to play" + footer).
// --check validates only (no rendering). --final also refuses a post with warnings and writes into <out>/final.
// Needs Chromium for rendering: it uses PW_CHROMIUM if set, otherwise Playwright's own browser.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateHook, loadHolds, FOOTER_TEXT, expandTokens, planWeek, MAPS, RUNNERS } from './lib.mjs';
import { slide1Html, slide2Html, SLIDE } from './template.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FONTS = resolve(HERE, '../../css/fonts');

function parseArgs(argv) {
  const a = { file: '', out: resolve(HERE, '../../out/social'), final: false, check: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') a.out = resolve(argv[++i]);
    else if (argv[i] === '--final') a.final = true;
    else if (argv[i] === '--check') a.check = true;
    else if (!a.file) a.file = argv[i];
  }
  return a;
}

export function captionFor(h) {
  const body = h.caption ? expandTokens(h.caption) : expandTokens(h.hook) + '\n\n' + (Array.isArray(h.payoff) ? h.payoff.map(expandTokens).join('\n') : expandTokens(h.payoff));
  return body.trim() + '\n\n' + FOOTER_TEXT + '\n';
}

/** The slide-3 package: real gates, the capture parameters (map and runner), and the overlay standard. */
export function slide3For(h, lookups, plan) {
  const map = MAPS.find((m) => m.id === (plan && plan.map)) || MAPS[0];
  const runner = RUNNERS.find((r) => r.id === (plan && plan.runner)) || RUNNERS[0];
  return {
    id: h.id,
    note: 'Capture the real game screen for each item with: node tools/social/capture-gates.mjs <this file>, then compose the posted slide with: node tools/social/compose-slide3.mjs <this file>. The gates below are what the game itself deals for this pair (buildDeck); the capture script checks the screen against them. The overlay is the standard: a challenge line and a free-play call to action, never a claim that this word is in the game.',
    viewport: { width: 390, height: 844, deviceScaleFactor: 3 },
    theme: plan && plan.theme,
    capture: { map: map.id, mapLabel: map.label, runner: runner.id, runnerLabel: runner.label },
    overlay: { challenge: plan && plan.challenge, cta: plan && plan.cta },
    items: lookups.map((c) => ({
      pair: c.pair, rank: c.rank, cardId: c.cardId, hint: c.hint, answer: c.answer, roman: c.roman,
      gates: c.gates, correctLane: c.correctLane,
      rankPhrase: c.rankPhrase,
      storage: { 'langdash.pair.v1': { known: c.known, target: c.target } },
      steps: [
        'serve the built app (npm run build && npx vite preview --port 4173)',
        'open /?debug=1 with the storage above set, set the map and runner above, start a run, wait for the first gate',
        'seed this card and lane: __game.seededCardOrder=[cardId]; __game._seededCardIndex=0; __game._clearGates(); (Math.random fixed to the lane) __game._spawnEncounter()',
        'screenshot the page once the three gates are on the track'
      ]
    }))
  };
}

async function render(html, file, png) {
  const { chromium } = await import('playwright');
  const opts = process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM, args: ['--no-sandbox'] } : {};
  const browser = await chromium.launch(opts);
  try {
    const page = await browser.newPage({ viewport: { width: SLIDE.width, height: SLIDE.height }, deviceScaleFactor: 1 });
    writeFileSync(file, html);
    await page.goto(pathToFileURL(file).href);
    await page.evaluate(() => globalThis.document.fonts.ready);
    await page.screenshot({ path: png, clip: { x: 0, y: 0, width: SLIDE.width, height: SLIDE.height } });
  } finally { await browser.close(); }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) { console.error('usage: node tools/social/build-week.mjs <hooks.json> [--out dir] [--final] [--check]'); process.exit(2); }
  const specs = JSON.parse(readFileSync(args.file, 'utf8'));
  const list = Array.isArray(specs) ? specs : (specs.hooks || []);
  const holds = loadHolds();
  let refused = 0;
  const verdicts = list.map((h) => ({ h, v: validateHook(h, holds) }));
  const passing = verdicts.filter((x) => x.v.errors.length === 0).map((x) => x.h);
  const week = planWeek(passing);
  week.errors.forEach((e) => { console.error('WEEK ' + e); });
  week.warnings.forEach((w) => { console.warn('week warning: ' + w + (args.final ? ' (blocks --final)' : '')); });
  if (week.errors.length || (args.final && week.warnings.length)) { console.error('the week plan is refused: fix the repeats above (or leave layout/theme/map/runner unset so the tool rotates them)'); refused++; }
  const planOf = (id) => week.posts.find((p) => p.id === id);
  if (!args.check && !refused) {
    mkdirSync(resolve(args.out, args.final ? 'final' : 'draft'), { recursive: true });
    writeFileSync(resolve(args.out, args.final ? 'final' : 'draft', 'week-plan.json'), JSON.stringify(week.posts, null, 2));
  }
  for (const { h, v } of verdicts) {
    const label = (h && h.id) || '(no id)';
    const blocked = v.errors.length > 0 || (args.final && v.warnings.length > 0) || week.errors.length > 0 || (args.final && week.warnings.length > 0);
    if (blocked) {
      if (v.errors.length || (args.final && v.warnings.length)) {
        refused++;
        console.error('REFUSED ' + label);
        v.errors.forEach((e) => console.error('  - ' + e));
        if (args.final) v.warnings.forEach((w) => console.error('  - (warning, blocks --final) ' + w));
      }
      continue;
    }
    v.warnings.forEach((w) => console.warn('warning ' + label + ': ' + w));
    const plan = planOf(h.id);
    if (args.check) { console.log('ok      ' + label + '  [' + [plan.layout, plan.theme, h.vein].join(' / ') + ']'); continue; }
    const dir = resolve(args.out, args.final ? 'final' : 'draft', h.id);
    mkdirSync(dir, { recursive: true });
    const reveal = v.concepts.map((c) => ({ hint: c.hint, answer: c.answer, roman: c.roman }));
    await render(slide1Html(h, FONTS, plan), resolve(dir, 'slide1.html'), resolve(dir, 'slide1.png'));
    await render(slide2Html(h, reveal, FONTS, plan), resolve(dir, 'slide2.html'), resolve(dir, 'slide2.png'));
    writeFileSync(resolve(dir, 'slide3.json'), JSON.stringify(slide3For(h, v.concepts, plan), null, 2));
    writeFileSync(resolve(dir, 'caption.txt'), captionFor(h));
    writeFileSync(resolve(dir, 'report.json'), JSON.stringify({ id: h.id, verified: h.verified, vein: h.vein, plan, pair: h.pair, warnings: v.warnings, concepts: v.concepts.map((c) => ({ pair: c.pair, rank: c.rank, cardId: c.cardId, hint: c.hint, answer: c.answer, inCore1000: c.inCore1000, rankPhrase: c.rankPhrase })) }, null, 2));
    console.log('wrote   ' + label + ' -> ' + dir + '  [' + [plan.layout, plan.theme, plan.map.replace('skin_', ''), plan.runner.replace('avatar_', '')].join(' / ') + ']');
  }
  if (refused) { console.error(refused + ' hook(s) refused'); process.exit(1); }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main().catch((e) => { console.error(e); process.exit(1); });
