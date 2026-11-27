#!/usr/bin/env node
// tools/social/capture-gates.mjs — capture the game's real screen for slide 3.
//
//   node tools/social/capture-gates.mjs <slide3.json> [--url http://localhost:4173] [--out <dir>]
//
// Serve the built app first (npm run build && npx vite preview --port 4173). For each item in the slide-3 file it opens the
// app on that language pair, starts a run, puts that exact card on the track with the correct gate in the stated lane (using
// the debug hook the e2e tests use), waits for the three gates, CHECKS that the screen shows the expected hint and gates, and
// screenshots it. If the screen does not match the deck's own gates it stops with an error rather than saving a wrong picture.
// Needs WebGL: it uses PW_CHROMIUM if set.

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { openApp } from '../../tests/e2e/helpers.js';   // (clears the first-run tutorial and the daily reward, as the e2e tests do)

const args = process.argv.slice(2);
let file = '';
let url = 'http://localhost:4173';
let outArg = '';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url') url = args[++i];
  else if (args[i] === '--out') outArg = args[++i];
  else if (!file) file = args[i];
}
const outDir = outArg ? resolve(outArg) : (file ? resolve(file, '..') : '.');
if (!file) { console.error('usage: node tools/social/capture-gates.mjs <slide3.json> [--url ...] [--out dir]'); process.exit(2); }

const spec = JSON.parse(readFileSync(file, 'utf8'));
const { chromium } = await import('playwright');
const opts = process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM, args: ['--no-sandbox'] } : {};
const browser = await chromium.launch(opts);
mkdirSync(outDir, { recursive: true });
let failed = 0;
try {
  for (const item of spec.items) {
    const origin = new URL(url).origin;
    const ctx = await browser.newContext({
      viewport: { width: spec.viewport.width, height: spec.viewport.height }, deviceScaleFactor: spec.viewport.deviceScaleFactor, bypassCSP: true,
      storageState: { cookies: [], origins: [{ origin, localStorage: [
        { name: 'langdash.pair.v1', value: JSON.stringify(item.storage['langdash.pair.v1']) },
        { name: 'ld_levels', value: JSON.stringify({ [item.pair]: { level: 'beginner', frontier: 80, source: 'beginner', at: 0 } }) }
      ] }] }
    });
    const page = await ctx.newPage();
    await page.goto(url + '/');
    await openApp(page, url + '/?debug=1');
    // the map and the runner for this post (the debug page exposes the save: own the map, equip the runner, favour the map)
    if (spec.capture) {
      await page.evaluate((c) => {
        const st = globalThis.__storage;
        if (!st) return;
        const owned = st.data.progression.ownedItems;
        ['map_' + c.map.replace(/^skin_/, ''), c.runner].forEach((id) => { if (owned.indexOf(id) < 0) owned.push(id); });
        st.data.progression.equipped.skin = c.runner;
        st.set('preferredMap', c.map);
      }, spec.capture);
    }
    await page.locator('.btn-play').click();
    await page.waitForFunction(() => globalThis.__game && globalThis.__game.gatesActive, null, { timeout: 45000 });
    // Put the card on the track with the correct gate in the stated lane. The game picks that lane with floor(random * 3), so
    // random is held at the lane's value while the card is dealt, then the screen is READ BACK (the gate labels in the page,
    // not the engine's own list) and compared with the deck. It retries, and refuses to save a picture that does not match.
    const dealt = () => page.evaluate((it) => {
      const g = globalThis.__game;
      // random is held at the lane's value only while this card is dealt, then the page's own random is restored:
      // leaving the stub in place would quietly rig every later roll in the page
      const realRandom = Math.random;
      Math.random = () => (it.correctLane + 0.5) / 3;
      try {
        g.seededCardOrder = [it.cardId]; g._seededCardIndex = 0;
        g._clearGates(); g._spawnEncounter();
        g.paused = true;
        return {
          card: g.card && g.card.id,
          engine: g.gates.map((x) => x.label),
          screen: [0, 1, 2].map((i) => { const el = globalThis.document.getElementById('ansText' + i); return el ? (el.firstChild ? el.firstChild.textContent : el.textContent).trim() : ''; }),
          hint: (globalThis.document.getElementById('buzzText') || {}).textContent
        };
      } finally { Math.random = realRandom; }
    }, item);
    const expectedGates = item.gates.map((x) => x.label);
    let shown = null;
    let same = false;
    for (let attempt = 0; attempt < 6 && !same; attempt++) {
      shown = await dealt();
      await page.waitForTimeout(700);
      // read the screen back AFTER it has settled, hint included (the hint used to be read before the wait, from the
      // previous card), and require the hint to be exactly the deck's hint (or its form without the bracketed sense),
      // not merely to contain its first words
      shown.screen = await page.evaluate(() => [0, 1, 2].map((i) => { const el = globalThis.document.getElementById('ansText' + i); return el ? (el.firstChild ? el.firstChild.textContent : el.textContent).trim() : ''; }));
      shown.hint = await page.evaluate(() => (globalThis.document.getElementById('buzzText') || {}).textContent);
      const hintShown = String(shown.hint || '').trim();
      const hintOk = hintShown === item.hint.trim() || hintShown === item.hint.split(' (')[0].trim();
      same = shown.card === item.cardId && JSON.stringify(shown.screen) === JSON.stringify(expectedGates) && hintOk;
    }
    const png = resolve(outDir, 'slide3-' + item.cardId + '.png');
    if (!same) {
      failed++;
      // a failed capture must not leave an older screenshot behind for compose-slide3.mjs to pick up as if it were new
      if (existsSync(png)) unlinkSync(png);
      console.error('MISMATCH ' + item.cardId + ': the screen shows ' + JSON.stringify(shown) + ', the deck says ' + JSON.stringify({ card: item.cardId, gates: expectedGates }));
    } else {
      await page.screenshot({ path: png });
      // record what this screenshot was captured for, so compose-slide3.mjs can refuse a stale or foreign capture
      const manifestFile = resolve(outDir, 'slide3-captures.json');
      const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {};
      manifest[item.cardId] = { map: spec.capture && spec.capture.map, theme: spec.theme, at: new Date().toISOString() };
      writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
      console.log('captured ' + png + ' (screen gates ' + JSON.stringify(shown.screen) + ' match the deck)');
    }
    await ctx.close();
  }
} finally { await browser.close(); }
if (failed) process.exit(1);
