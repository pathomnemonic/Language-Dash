import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildAllSteps, buildTourSteps, buildLessonSteps, LESSON_STEPS } from '../../js/tourdata.js';

describe('the tour steps', () => {
  let steps;
  beforeEach(() => {
    const html = readFileSync('index.html', 'utf8');
    document.body.innerHTML = html.slice(html.indexOf('<body'), html.indexOf('</body>')).replace(/<script[\s\S]*?<\/script>/g, '');
    steps = buildAllSteps({ ui: { show() {} } });
  });
  const ids = () => steps.map((s) => s.id);

  it.skipIf(process.env.VITE_NO_BACKEND === '1')('walks Home first, with a section each for Versus and Flashcards, one line on Challenge (no PLAY lesson, no mode-by-mode walk), then the tabs', () => {
    const order = ids();
    ['coins', 'filters', 'languages', 'languages-body', 'versus-btn', 'versus', 'flashcards-btn', 'flashcards', 'challenge-btn', 'friends', 'settings', 'stats-tab', 'locker-tab', 'quests-tab', 'profile-tab', 'back-home'].forEach((id) => expect(order, id).toContain(id));
    expect(order.indexOf('versus-btn')).toBeLessThan(order.indexOf('flashcards-btn'));
    expect(order.indexOf('flashcards-btn')).toBeLessThan(order.indexOf('challenge-btn'));
    ['play', 'ch-study', 'ch-weakness', 'ch-daily', 'ch-gauntlet', 'ch-friend', 'ch-exam'].forEach((id) => expect(order, id).not.toContain(id));
    expect(order.indexOf('challenge-btn')).toBeLessThan(order.indexOf('stats-tab'));
  });

  it.skipIf(process.env.VITE_NO_BACKEND === '1')('every pop-up section is opened by pressing its real button, and closed again when it is left', () => {
    const byId = Object.fromEntries(steps.map((s) => [s.id, s]));
    ['versus-btn', 'flashcards-btn'].forEach((id) => expect(byId[id].press, id).toBe('pass'));
    expect(byId['challenge-btn'].press).toBe('count'); // it is only pointed at, not opened
    expect(typeof byId.versus.after).toBe('function');
    expect(typeof byId.flashcards.after).toBe('function');
    // closing really closes
    const sheet = document.getElementById('flashcardsSheet');
    sheet.classList.add('active');
    sheet.querySelector('.sheet-close').addEventListener('click', () => sheet.classList.remove('active'));
    byId.flashcards.after();
    expect(sheet.classList.contains('active')).toBe(false);
  });

  it('every fixed target exists on the page, so no step falls back to a plain card by mistake', () => {
    const missing = steps.filter((s) => typeof s.target === 'function').filter((s) => {
      // the Locker's rows and tab buttons are drawn later; everything else is in the page already
      return !['extras-tab', 'buy', 'equip', 'filters-advanced', 'filters-exam'].includes(s.id) && !s.target();
    }).map((s) => s.id);
    // screens drawn on demand (the multiplayer panel, the profile body) are empty until opened
    expect(missing.filter((id) => !['versus', 'profile', 'stats', 'preview', 'settings-screen', 'friends-screen', 'profile-pic'].includes(id))).toEqual([]);
  });

  it('the tour walks through the word filters, one section at a time, opening each by its real button', () => {
    const byId = Object.fromEntries(steps.map((s) => [s.id, s]));
    const order = ids();
    ['filters', 'filters-subjects', 'filters-subjects-list', 'filters-exam', 'filters-exam-body'].forEach((id) => expect(order, id).toContain(id));
    expect(order.indexOf('filters')).toBeLessThan(order.indexOf('filters-subjects'));
    expect(order.indexOf('filters-exam-body')).toBeLessThan(order.indexOf('languages'));
    ['filters', 'filters-subjects', 'filters-exam'].forEach((id) => expect(byId[id].press, id).toBe('pass'));
    ['filters-subjects-list', 'filters-exam-body'].forEach((id) => expect(byId[id].press, id).toBe('next'));
    expect(typeof byId['filters-exam-body'].after).toBe('function'); // it tidies up and closes the pop-up
    // Language Dash has no advanced filters (question type, year, high-yield) and no speed dial
    expect(order.some((id) => /advanced|speed/.test(id))).toBe(false);
  });

  it('the tour teaches the Languages button: opens the sheet, then closes it', () => {
    const byId = Object.fromEntries(steps.map((s) => [s.id, s]));
    expect(byId.languages.press).toBe('pass');
    expect(byId.languages.target()).toBe(document.getElementById('langBtn'));
    expect(byId['languages-body'].text).toMatch(/pair/i);
    expect(typeof byId['languages-body'].after).toBe('function');
    expect(ids().indexOf('languages-body')).toBe(ids().indexOf('languages') + 1);
  });

  it('every lesson names steps that exist, and no copy is medical', () => {
    const have = new Set(ids());
    Object.values(LESSON_STEPS).flat().forEach((id) => expect(have.has(id), id).toBe(true));
    const copy = steps.map((s) => s.title + ' ' + s.text).join(' ');
    expect(copy).not.toMatch(/diagnos|USMLE|COMLEX|exam sim|medical|patient|cardiolog|Dx Dash/i);
  });

  it.skipIf(process.env.VITE_NO_BACKEND === '1')('Pro is mentioned only while it can be bought, and then only quietly', async () => {
    const { setSellableForTest } = await import('../../js/pro.js');
    const { setProConfigForTest } = await import('../../js/remoteconfig.js');
    setProConfigForTest({ enabled: false });
    let off = buildAllSteps({ ui: { show() {} } });
    expect(off.map((s) => s.text).join(' ')).not.toMatch(/Pro\b/);
    setProConfigForTest({ enabled: true, gates: { exam_sim: { limit: 1, per: 'week' } } });
    setSellableForTest(true);
    const on = buildAllSteps({ ui: { show() {} } });
    expect(on.find((s) => s.id === 'pro').text).toMatch(/1,000 instead of 300/);
    expect(on.find((s) => s.id === 'challenge-btn').text).toMatch(/PRO tag/);
    expect(on.find((s) => s.id === 'filters-subjects-list').text).toMatch(/Pro opens all 1,000/);
    expect(off.find((s) => s.id === 'filters-subjects-list').text).not.toMatch(/Pro/);
    setSellableForTest(false);
    setProConfigForTest(null);
  });

  it('each step says what it is: a title and some text', () => {
    steps.forEach((s) => { expect(s.title.length, s.id).toBeGreaterThan(2); expect(s.text.length, s.id).toBeGreaterThan(8); });
  });
});

import * as shopdata from '../../js/game/shopdata.js';
const require_items = () => shopdata;
const TOUR_NAME = () => require_items().LOCKER_ITEMS.filter((i) => i.type === 'trail' && i.price > 0).sort((a, b) => a.price - b.price)[0];

describe('the tour always teaches with the cheapest trail, and never hands out coins', () => {
  let storage, ui, steps;
  beforeEach(async () => {
    localStorage.clear();
    const html = readFileSync('index.html', 'utf8');
    document.body.innerHTML = html.slice(html.indexOf('<body'), html.indexOf('</body>')).replace(/<script[\s\S]*?<\/script>/g, '');
    ({ storage } = await import('../../js/storage.js'));
    storage.load();
    ({ ui } = await import('../../js/ui.js'));
    steps = buildAllSteps({ ui: { show() {} } });
    ui._lockerTab = 'trails';
    ui.renderShop();
  });
  const step = (id) => steps.find((s) => s.id === id);
  const applies = (id, ctx = {}) => !(step(id).skipIf && step(id).skipIf(ctx));
  const rowOf = (el) => el.closest('.shop-item').textContent;

  it('a new player is walked through buying the cheapest trail (not whatever they can afford)', () => {
    expect(storage.get('coins')).toBe(300);
    expect(applies('buy')).toBe(true);
    expect(rowOf(step('buy').target())).toContain(TOUR_NAME().name);
    expect(applies('preview')).toBe(false);
    // it is the cheapest trail in the Locker: nothing cheaper is passed over
    const { LOCKER_ITEMS } = require_items();
    const cheapest = Math.min(...LOCKER_ITEMS.filter((i) => i.type === 'trail' && i.price > 0).map((i) => i.price));
    expect(storage.get('coins')).toBe(cheapest);
  });

  it('having bought it, the tour moves on to wearing it, and a second run buys nothing more', () => {
    step('buy').target().click();
    expect(storage.ownsItem(TOUR_NAME().id)).toBe(true);
    const coinsAfter = storage.get('coins');
    ui.renderShop();
    expect(applies('buy')).toBe(false);
    // buying wears it at once, so there is nothing left to equip
    expect(storage.get('equipped').trail).toBe(TOUR_NAME().id);
    expect(applies('equip')).toBe(false);
    ui.renderShop();
    // the tour again: nothing to buy, nothing to equip, the display step still makes sense, and no coins appear or go
    expect(applies('buy')).toBe(false);
    expect(applies('equip')).toBe(false);
    expect(applies('preview')).toBe(false);
    expect(applies('look')).toBe(true);
    expect(storage.get('coins')).toBe(coinsAfter);
  });

  it('someone who owns it but wears something else is not pushed to equip or buy again', () => {
    storage.data.progression.ownedItems.push(TOUR_NAME().id);
    ui.renderShop();
    expect(applies('buy')).toBe(false);
    expect(applies('preview')).toBe(false);
    expect(applies('equip')).toBe(true); // it can be worn, and the step offers exactly that
    expect(applies('look')).toBe(false);  // but with nothing worn there is nothing to look at
  });

  it('a player who cannot afford it is shown how to preview it instead, and gets no coins', () => {
    storage.set('coins', 50);
    ui.renderShop();
    expect(applies('buy')).toBe(false);
    expect(applies('preview')).toBe(true);
    expect(step('preview').target().getAttribute('aria-label')).toContain(TOUR_NAME().name);
    expect(applies('look', {})).toBe(false);
    expect(applies('look', { previewedTrail: true })).toBe(true);
    expect(storage.get('coins')).toBe(50);
  });

  it('the tour code never adds coins', () => {
    const src = readFileSync('js/tourdata.js', 'utf8') + readFileSync('js/tour.js', 'utf8') + readFileSync('js/tutorialrun.js', 'utf8');
    expect(src).not.toMatch(/addCoins|\.coins\s*\+=|set\('coins'/);
  });
});
