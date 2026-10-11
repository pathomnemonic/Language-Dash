// tests/e2e/welcome.spec.js — the first-run language welcome: pick what you speak and what you are learning.
import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('first-run language welcome', () => {
  test('asks for both languages, then starts the game with that pair', async ({ page }) => {
    await page.goto('/');
    const welcome = page.locator('#langWelcome');
    await expect(welcome).toBeVisible({ timeout: 15000 });
    const go = page.locator('#langGo');
    await expect(go).toBeDisabled();
    await welcome.locator('.lang-grid').nth(0).locator('[data-lang="en"]').click();
    // the language you speak cannot also be the one you learn
    await expect(welcome.locator('.lang-grid').nth(1).locator('[data-lang="en"]')).toBeDisabled();
    await welcome.locator('.lang-grid').nth(1).locator('[data-lang="ja"]').click();
    await expect(go).toBeEnabled();
    await go.click();
    await expect(page.locator('#langWelcome')).toHaveCount(0, { timeout: 15000 });
    expect(await page.evaluate(() => localStorage.getItem('langdash.pair.v1'))).toBe(JSON.stringify({ known: 'en', target: 'ja' }));
  });
});
