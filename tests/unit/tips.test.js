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

  it('shows nothing when no tip page is configured', () => {
    expect(getTipUrl()).toBe('');
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

  it('is configured in one constant that ships empty (no row until a link is set)', async () => {
    const { TIP_URL } = await import('../../js/tipconfig.js');
    expect(TIP_URL).toBe('');
    expect(getTipUrl()).toBe('');
  });
});
