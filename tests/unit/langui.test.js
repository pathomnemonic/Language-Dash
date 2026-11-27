import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// First-run language onboarding (js/langui.js): when the chosen pair cannot be saved (storage blocked),
// the welcome must say so and stay up. Before the fix it released the focus trap, saved nothing and left
// the overlay on screen with no error and no way forward.

beforeEach(() => { vi.resetModules(); document.body.innerHTML = ''; localStorage.clear(); });
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

function chip(code, groupIndex) {
  const groups = document.querySelectorAll('.lang-grid');
  return groups[groupIndex].querySelector('[data-lang="' + code + '"]');
}

async function pickPair() {
  const { showLanguageOnboarding } = await import('../../js/langui.js');
  showLanguageOnboarding();
  chip('en', 0).click();
  chip('es', 1).click();
  document.getElementById('langGo').click();
}

describe('showLanguageOnboarding', () => {
  it('keeps the welcome up with an error when the pair cannot be saved', async () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('storage blocked'); });
    await pickPair();
    expect(document.getElementById('langWelcome')).toBeTruthy();
    const note = document.querySelector('.lang-error');
    expect(note).toBeTruthy();
    expect(note.textContent).toMatch(/could not be saved/);
  });

  it('saves the pair and leaves the welcome flow when storage works', async () => {
    await pickPair();
    expect(JSON.parse(localStorage.getItem('langdash.pair.v1'))).toEqual({ known: 'en', target: 'es' });
    expect(document.querySelector('.lang-error')).toBeNull();
  });
});
