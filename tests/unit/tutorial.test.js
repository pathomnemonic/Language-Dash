import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildSteps, startTutorial, skipTutorial, isTutorialOpen } from '../../js/tutorial.js';
import { getControlText } from '../../js/controlhints.js';
import { cornerLabel, cornerInitial } from '../../js/profilecorner.js';

describe('tutorial steps', () => {
  it('teaches every move, then a practice question, with a welcome and a close', () => {
    const ids = buildSteps(getControlText(false)).map((s) => s.id);
    expect(ids).toEqual(['welcome', 'left', 'right', 'jump', 'slide', 'answer', 'rush', 'done']);
  });

  it('every practice step asks for one action', () => {
    const actions = buildSteps(getControlText(false)).filter((s) => s.kind === 'action').map((s) => s.action);
    expect(actions).toEqual(['moveLeft', 'moveRight', 'jump', 'slide', 'rush']);
  });

  it('words the prompts for touch or keyboard', () => {
    const touch = buildSteps(getControlText(true)).find((s) => s.id === 'left').prompt;
    const keys = buildSteps(getControlText(false)).find((s) => s.id === 'left').prompt;
    expect(touch).toMatch(/swipe/i);
    expect(keys).toMatch(/press/i);
  });

  it('ends by sending the player off to the red-dotted menus, with no long list to read', () => {
    const last = buildSteps(getControlText(false)).at(-1);
    expect(last.reference).toBeUndefined();
    expect(last.text).toMatch(/red dots?/i);
    expect(last.text).toMatch(/explore|try/i);
  });
});

describe('tutorial overlay', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="tutorialOverlay"></div>';
  });
  afterEach(() => { skipTutorial(); });

  it('opens on the welcome page, and skipping closes it and reports it', () => {
    const onClose = vi.fn();
    startTutorial({ onClose });
    const overlay = document.getElementById('tutorialOverlay');
    expect(overlay.classList.contains('active')).toBe(true);
    expect(overlay.querySelector('.tut-card').getAttribute('data-step')).toBe('welcome');
    expect(isTutorialOpen()).toBe(true);
    document.getElementById('tutCloseBtn').click();
    document.getElementById('tutExitYes').click(); // the × asks first
    expect(overlay.classList.contains('active')).toBe(false);
    expect(isTutorialOpen()).toBe(false);
    expect(onClose).toHaveBeenCalledWith({ completed: false, skipped: true });
  });

  it('advances on the right key only', () => {
    startTutorial({});
    document.getElementById('tutNextBtn').click(); // to the first practice step
    const card = () => document.querySelector('.tut-card').getAttribute('data-step');
    expect(card()).toBe('left');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(card()).toBe('left');
    vi.useFakeTimers();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    vi.advanceTimersByTime(1000);
    expect(card()).toBe('right');
    vi.useRealTimers();
  });

  it('does not open twice', () => {
    startTutorial({});
    const first = document.querySelector('.tut-card');
    startTutorial({});
    expect(document.querySelector('.tut-card')).toBe(first);
  });
});

describe('profile button text', () => {
  it('invites guests to sign in and shows the account for signed-in players', () => {
    expect(cornerLabel(null, '')).toBe('Sign in');
    expect(cornerLabel({ email: '', anonymous: true }, '')).toBe('Sign in');
    expect(cornerLabel({ email: 'dr.house@example.com', anonymous: false }, '')).toBe('dr.house');
    expect(cornerLabel({ email: 'a@b.co', anonymous: false }, 'Averyveryverylongname')).toHaveLength(12);
    expect(cornerInitial({ email: 'zed@x.io', anonymous: false }, '')).toBe('Z');
    expect(cornerInitial(null, '')).toBe('👤');
  });
});

import { getTutorialCardIds, refreshTutorialCardIds, TUTORIAL_CARD_IDS } from '../../js/tutorialrun.js';
import { CARDS } from '../../js/cardhub.js';

describe('the guided run uses the easiest words of the current deck', () => {
  it('picks the first six usable cards by frequency rank', () => {
    const ids = getTutorialCardIds();
    expect(ids).toHaveLength(6);
    const ranks = ids.map((id) => CARDS.find((c) => c.id === id).rank);
    expect(ranks).toEqual(ranks.slice().sort((a, b) => a - b));
    expect(ranks[0]).toBeLessThanOrEqual(3);
    expect(ranks[5]).toBeLessThanOrEqual(12);
  });
  it('skips cards that cannot be played and sorts a shuffled list', () => {
    const cards = [
      { id: 'a-b-005', rank: 5, bw: ['x'], ans: 'y', d: ['p', 'q'] },
      { id: 'a-b-001', rank: 1, bw: [], ans: 'y', d: ['p', 'q'] },
      { id: 'a-b-002', rank: 2, bw: ['x'], ans: 'y', d: ['p'] },
      { id: 'a-b-003', rank: 3, bw: ['x'], ans: 'y', d: ['p', 'q'] },
      { id: 'a-b-004', rank: 4, bw: ['x'], ans: 'y', d: ['p', 'q'] }
    ];
    expect(getTutorialCardIds(cards)).toEqual(['a-b-003', 'a-b-004', 'a-b-005']);
  });
  it('keeps the TUTORIAL_CARD_IDS export working for main.js: a live array filled from the deck', () => {
    expect(Array.isArray(TUTORIAL_CARD_IDS)).toBe(true);
    refreshTutorialCardIds();
    expect(TUTORIAL_CARD_IDS.slice()).toEqual(getTutorialCardIds());
    expect(TUTORIAL_CARD_IDS.length).toBe(6);
  });
  it('the copy is about words, gates and the Hush, never diagnoses', () => {
    const text = buildSteps(getControlText(false)).map((s) => s.title + ' ' + s.text).join(' ');
    expect(text).toMatch(/Language Dash/);
    expect(text).toMatch(/word/);
    expect(text).toMatch(/Hush/);
    expect(text).not.toMatch(/diagnos|medical|buzzword|Dx Dash|clue/i);
  });
});
