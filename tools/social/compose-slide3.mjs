#!/usr/bin/env node
// tools/social/compose-slide3.mjs — the posted slide 3: the captured game screen + a challenge pill + the footer band.
//
//   node tools/social/compose-slide3.mjs <slide3.json>      (run capture-gates.mjs first: it writes slide3-<cardId>.png beside the json)
//
// The overlay is the standard from lib.mjs: a challenge line and a free-play call to action, re-checked here so a hand-edited file
// cannot claim "this word is in the game". Output: slide3-final-<cardId>.png (1080x1350).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkOverlay } from './lib.mjs';
import { slide3Html, SLIDE } from './template.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2];
if (!file) { console.error('usage: node tools/social/compose-slide3.mjs <slide3.json>'); process.exit(2); }
const spec = JSON.parse(readFileSync(file, 'utf8'));
const dir = dirname(resolve(file));
const verdict = checkOverlay(spec.overlay && spec.overlay.challenge);
if (verdict.errors.length) { verdict.errors.forEach((e) => console.error('REFUSED ' + e)); process.exit(1); }

const { chromium } = await import('playwright');
const opts = process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM, args: ['--no-sandbox'] } : {};
const browser = await chromium.launch(opts);
try {
  for (const item of spec.items) {
    const shot = resolve(dir, 'slide3-' + item.cardId + '.png');
    if (!existsSync(shot)) { console.error('missing ' + shot + ': run capture-gates.mjs first'); process.exitCode = 1; continue; }
    const html = slide3Html(pathToFileURL(shot).href, spec.overlay, resolve(HERE, '../../css/fonts'), spec.theme);
    const htmlFile = resolve(dir, 'slide3-final-' + item.cardId + '.html');
    writeFileSync(htmlFile, html);
    const page = await browser.newPage({ viewport: { width: SLIDE.width, height: SLIDE.height }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(htmlFile).href);
    await page.evaluate(() => globalThis.document.fonts.ready);
    const out = resolve(dir, 'slide3-final-' + item.cardId + '.png');
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: SLIDE.width, height: SLIDE.height } });
    await page.close();
    console.log('composed ' + out);
  }
} finally { await browser.close(); }
