import { test } from '@playwright/test';
import { openApp } from './helpers.js';
test('probe', async ({ page }) => {
  test.setTimeout(100000);
  await openApp(page, '/?debug=1');
  await page.waitForFunction(() => window.__game && window.__storage);
  await page.evaluate(() => window.__storage.set('speedRamp', { on: true, every: 1, step: 2 }));
  await page.evaluate(() => { window.__enc = []; const g = window.__game; const emit = g._emit.bind(g); g._emit = function (t, p) { window.__enc.push(t + (p && p.secondsToLock ? ':' + p.secondsToLock.toFixed(1) : '')); return emit(t, p); }; });
  await page.locator('.btn-play').click();
  for (let i = 0; i < 8; i++) { await page.waitForTimeout(8000); console.log('PR' + JSON.stringify(await page.evaluate(() => ({ speed: window.__game.speed, run: window.__game.running, ev: window.__enc.slice(-6), n: window.__enc.length })))); }
});
