import { describe, it, expect } from 'vitest';
import { isValidTipUrl, getTipUrl } from '../../js/tips.js';

describe('tip link', () => {
  it('accepts only https URLs', () => {
    expect(isValidTipUrl('https://buy.stripe.com/me')).toBe(true);
    expect(isValidTipUrl('http://buy.stripe.com/me')).toBe(false);
    expect(isValidTipUrl('javascript:alert(1)')).toBe(false);
    expect(isValidTipUrl('https://localhost')).toBe(false);
    expect(isValidTipUrl('')).toBe(false);
    expect(isValidTipUrl(null)).toBe(false);
  });

  it('shows the configured link, or nothing at all when none is set', async () => {
    const { TIP_URL } = await import('../../js/tipconfig.js');
    expect(getTipUrl()).toBe(TIP_URL);   // (no VITE_TIP_URL in tests: the constant is what is used)
  });
});

describe('the tip link is quiet and never another app\'s page', () => {
  it('refuses the Cathology Ko-fi page, however it is written', () => {
    expect(isValidTipUrl('https://ko-fi.com/pathomnemonic')).toBe(false);
    expect(isValidTipUrl('https://www.ko-fi.com/PathoMnemonic/')).toBe(false);
    expect(isValidTipUrl('https://ko-fi.com/pathomnemonic?x=1')).toBe(false);
    expect(isValidTipUrl('https://ko-fi.com/someoneelse')).toBe(true);
    expect(isValidTipUrl('https://buy.stripe.com/test_abc123')).toBe(true);
  });

  it('has no post-run prompt at all: nothing in the code can nag', async () => {
    const tips = await import('../../js/tips.js');
    expect(tips.shouldShowTipPrompt).toBeUndefined();
    const { readFileSync } = await import('node:fs');
    const main = readFileSync('js/main.js', 'utf8');
    expect(main).not.toMatch(/Leave a tip|tipPromptOff|lastTipPromptAt/);
  });

  it('is configured in one constant: empty, or a valid https link that is not the Cathology page', async () => {
    const { TIP_URL } = await import('../../js/tipconfig.js');
    expect(typeof TIP_URL).toBe('string');
    if (TIP_URL) {
      expect(isValidTipUrl(TIP_URL)).toBe(true);
      expect(TIP_URL).toMatch(/^https:\/\/buy\.stripe\.com\//);   // a Stripe payment link, as the owner specified
    }
  });
});
