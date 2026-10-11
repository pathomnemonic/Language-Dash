import { describe, it, expect, beforeEach } from 'vitest';
import { STAMP_GLYPHS, FLYER_KINDS, randomFlight, mountFlyers } from '../../js/homefx.js';

function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

describe('postage stamps and airmail drifting behind Home', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="bgFlyers"></div>'; });

  it('only drifts stamps, envelopes and boarding passes, and each flight is a new random one', () => {
    expect(STAMP_GLYPHS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(STAMP_GLYPHS).size).toBe(STAMP_GLYPHS.length);
    expect(new Set(FLYER_KINDS)).toEqual(new Set(['stamp', 'envelope', 'pass']));
    const rand = seeded(7);
    const flights = Array.from({ length: 200 }, () => randomFlight(rand));
    expect(new Set(flights.map((f) => f.glyph)).size).toBeGreaterThan(6);
    flights.forEach((f) => {
      expect(FLYER_KINDS).toContain(f.kind);
      if (f.kind !== 'envelope') expect(STAMP_GLYPHS).toContain(f.glyph);
      expect(Math.hypot(f.dx, f.dy)).toBeLessThan(40);         // they wander a short way, they do not fly out of the middle
      expect(f.dur).toBeGreaterThanOrEqual(30);                 // slowly
      expect(f.size).toBeLessThanOrEqual(70);                   // and stay small
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.x).toBeLessThanOrEqual(100);
    });
    // they drift in every direction, not just one
    expect(flights.some((f) => f.dx > 10) && flights.some((f) => f.dx < -10)).toBe(true);
    expect(flights.some((f) => f.dy > 8) && flights.some((f) => f.dy < -8)).toBe(true);
  });

  it('fills the layer with flyers that become something else on each pass', () => {
    const layer = document.getElementById('bgFlyers');
    const handle = mountFlyers(layer, { rand: seeded(3), count: 6 });
    expect(layer.children.length).toBe(6);
    const el = layer.children[0];
    const look = () => [el.className, el.textContent, el.style.getPropertyValue('--x'), el.style.getPropertyValue('--dx'), el.style.getPropertyValue('--dy')].join('|');
    const before = look();
    for (let i = 0; i < 5; i++) el.dispatchEvent(new Event('animationiteration'));
    expect(look()).not.toBe(before);
    handle.stop();
    expect(layer.children.length).toBe(0);
  });

  it('for reduced motion the same few objects just sit still: marked static, no animation hooks', () => {
    const layer = document.getElementById('bgFlyers');
    mountFlyers(layer, { reducedMotion: true, rand: seeded(5) });
    expect(layer.classList.contains('static')).toBe(true);
    expect(layer.children.length).toBeGreaterThan(0);
    expect(layer.children.length).toBeLessThanOrEqual(6);
    [...layer.children].forEach((el) => {
      expect(el.style.animationDelay).toBe('');
      expect(el.className).toMatch(/^flyer (stamp|envelope|pass)$/);
    });
    // and coming back to motion clears that
    mountFlyers(layer, { count: 3 });
    expect(layer.classList.contains('static')).toBe(false);
  });

  it('pauses while the page is hidden', () => {
    const layer = document.getElementById('bgFlyers');
    mountFlyers(layer, { count: 2 });
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(layer.classList.contains('paused')).toBe(true);
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(layer.classList.contains('paused')).toBe(false);
  });
});

describe('where the flying objects show', () => {
  it('only on the Home screen', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync('css/base.css', 'utf8');
    expect(css).toMatch(/body:not\(\[data-screen="screenHome"\]\) #bgFlyers \{ display: none; \}/);
    // (and they never animate for someone who asked for less motion)
    expect(readFileSync('css/tokens.css', 'utf8')).toMatch(/prefers-reduced-motion: reduce/);
    expect(readFileSync('index.html', 'utf8')).toMatch(/<body data-screen="screenHome">/);
  });
});
