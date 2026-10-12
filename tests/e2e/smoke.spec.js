// tests/e2e/smoke.spec.js
// Basic E2E smoke tests

import { test, expect } from '@playwright/test';
import { openApp, closeTutorial } from './helpers.js';

test.describe('Smoke tests', () => {
  test('home screen loads with title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Language Dash/);
  });

  test('play button is visible', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('.btn-play')).toBeVisible();
  });

  test('unreleased features stay out of sight', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#cohortsBtn')).toBeHidden();
    // nothing a player can see mentions cohorts (hidden elements do not count)
    expect(await page.evaluate(() => document.body.innerText.toLowerCase().includes('cohort'))).toBe(false);
  });

  test('settings are grouped into sections, each explained', async ({ page }) => {
    await openApp(page);
    await page.locator('#settingsBtn').click();
    await expect(page.locator('.settings-card')).toHaveCount(8);
    await page.locator('.settings-card[data-section="study"]').click();
    await expect(page.getByText(/How much more often you see words you have never answered/)).toBeVisible();
    await page.locator('#screenSettings .back-btn').click();
    await expect(page.locator('.settings-card')).toHaveCount(8);
  });

  test('Settings and Home open the same tutorial, and it can be skipped', async ({ page }) => {
    await openApp(page);
    await page.locator('#settingsBtn').click();
    await page.locator('.settings-card[data-section="about"]').click();
    await page.locator('#settingsTutorialBtn').click();
    await expect(page.locator('#tutorialOverlay')).toHaveClass(/active/);
    await expect(page.locator('#tutorialOverlay .tut-card')).toHaveAttribute('data-step', 'welcome');
    await closeTutorial(page);
    await expect(page.locator('#tutorialOverlay')).not.toHaveClass(/active/);

    await page.locator('[data-screen="screenHome"]').click();
    await page.locator('#howToPlayBtn').click();
    await expect(page.locator('#tutorialOverlay')).toHaveClass(/active/);
    await expect(page.locator('#tutorialOverlay .tut-card')).toHaveAttribute('data-step', 'welcome');
    await closeTutorial(page);
    await expect(page.locator('#tutorialOverlay')).not.toHaveClass(/active/);
  });

  test('the word filters sit in one popup behind a single button on Home', async ({ page }) => {
    await openApp(page);
    // Home shows one row, not the filters themselves
    await expect(page.locator('#screenHome #filtersBtn')).toBeVisible();
    await expect(page.locator('#screenHome #subjectToggle')).toHaveCount(0);
    await expect(page.locator('#screenHome #examFilterContainer')).toHaveCount(0);
    await expect(page.locator('#filtersSummary')).toHaveText(/All topics/);

    await page.locator('#filtersBtn').click();
    await expect(page.locator('#filtersSheet')).toBeVisible();
    // topics and word level are on the page; the advanced filters are gone
    await expect(page.locator('#filtersSheet #subjectToggle')).toBeVisible();
    await expect(page.locator('#filtersSheet #examFilterToggle')).toBeVisible();
    await expect(page.locator('#filtersSheet #advancedFilterContainer')).toBeHidden();

    // picking one subject changes the summary on Home
    await page.locator('#subjectToggle').click();
    await page.locator('#deselectAllSubjects').click();
    await page.locator('#subjectScroll .subject-chip').first().click();
    await page.locator('#filtersSheet .sheet-close').click();
    await expect(page.locator('#filtersSheet')).toBeHidden();
    await expect(page.locator('#filtersSummary')).not.toHaveText(/All topics/);
  });

  test('badges live in the profile, and a new badge wears a red dot until the profile is seen', async ({ page }) => {
    await openApp(page, '/?debug=1');
    // no separate Badges button on Home any more
    await expect(page.locator('#achievementsBtn')).toHaveCount(0);

    // earn a badge: the profile buttons get a dot
    await page.evaluate(() => {
      window.__storage.unlockAchievement('ach_first_run');
      document.dispatchEvent(new CustomEvent('ld:attention-changed'));
    });
    await expect(page.locator('.nav-item[data-screen="screenProfile"] .nav-dot')).toHaveCount(1);

    // the badges are in the profile, with the new one marked
    await page.locator('.nav-item[data-screen="screenProfile"]').click(); // (the Home corner button is hidden without a backend)
    await expect(page.locator('#screenProfile')).toHaveClass(/active/);
    await expect(page.locator('#profileBadges')).toContainText(/Badges \(1\//);
    await expect(page.locator('#profileBadges .achievement-item.is-new')).toHaveCount(1);
    // tapping an earned badge pins it
    await page.locator('#profileBadges .achievement-item.unlocked').first().click();
    await expect(page.locator('#profileBadges .achievement-item.pinned')).toHaveCount(1);

    // leaving the profile clears the dot
    await page.locator('[data-screen="screenHome"]').click();
    await expect(page.locator('.nav-item[data-screen="screenProfile"] .nav-dot')).toHaveCount(0);
  });

  test('only the current tab is highlighted', async ({ page }) => {
    await openApp(page);
    await page.locator('[data-screen="screenStats"]').click();
    await expect(page.locator('.nav-item[aria-current="true"]')).toHaveCount(1);
    await expect(page.locator('.nav-item[data-screen="screenStats"]')).toHaveAttribute('aria-current', 'true');
  });

  test('the Versus close button stays on screen on a short laptop window', async ({ page }) => {
    test.skip(process.env.VITE_NO_BACKEND === '1', 'needs Versus or Friends, which the no-backend build does not have');
    await page.setViewportSize({ width: 1366, height: 560 });
    await openApp(page);
    await page.locator('#multiplayerBtn').click();
    await expect(page.locator('#mpCloseBtn')).toBeInViewport();
    await page.locator('#mpCloseBtn').click();
    await expect(page.locator('#multiplayerOverlay')).not.toHaveClass(/active/);
  });

  test('bottom navigation is visible', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#bottomNav')).toBeVisible();
  });

  test('the first run opens the tutorial once; skipping ends the first run', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tutorialOverlay')).toHaveClass(/active/);
    await closeTutorial(page);
    await expect(page.locator('#tutorialOverlay')).not.toHaveClass(/active/);
    await page.reload();
    await page.waitForTimeout(800);
    await expect(page.locator('#tutorialOverlay')).not.toHaveClass(/active/);
  });

  test('the profile button is in the top right of Home and opens the account panel', async ({ page }) => {
    await openApp(page);
    const btn = page.locator('#profileCornerBtn');
    // (the corner button and the account section need Supabase; without it the Profile tab is the way in)
    if (await btn.isVisible()) {
      const box = await btn.boundingBox();
      const vp = page.viewportSize();
      expect(box.x + box.width / 2).toBeGreaterThan(vp.width / 2);
      expect(box.y).toBeLessThan(160);
      await btn.click();
    } else {
      await page.locator('#bottomNav .nav-item[data-screen="screenProfile"]').click();
    }
    await expect(page.locator('#screenProfile')).toHaveClass(/active/);
    await expect(page.locator('#bottomNav .nav-item[aria-current="true"]')).toHaveAttribute('data-screen', 'screenProfile');
    // With accounts configured there is an email field; without, the section says accounts are not set up (or is left out).
    if (await page.locator('#profileAccount').isVisible().catch(() => false)) {
      await expect(page.locator('#profileAccount')).toContainText(/Create account|not set up|Loading|Signed in/);
    }
  });

  test('navigating to Stats screen works', async ({ page }) => {
    await openApp(page);
    await page.locator('[data-screen="screenStats"]').click();
    await expect(page.locator('#screenStats')).toBeVisible();
  });

  test('navigating to Settings screen works', async ({ page }) => {
    await openApp(page);
    await page.locator('#settingsBtn').click();
    await expect(page.locator('#screenSettings')).toBeVisible();
  });

  test('the Flashcards button opens the flashcard screen', async ({ page }) => {
    await openApp(page);
    await page.locator('#homeFlashcardsBtn').click();
    await page.locator('#flashcardBtn').click();
    await expect(page.locator('#screenFlashcard')).toBeVisible();
  });

  test('the Word Quiz button opens the quiz setup', async ({ page }) => {
    await openApp(page);
    await page.locator('#homeChallengeBtn').click();
    await page.locator('#examBtn').click();
    await expect(page.locator('#examContent')).toContainText(/timed block of words/i);
  });
});
