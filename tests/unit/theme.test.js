import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  rollWorld, rerollDue, daypartOf, pickTheme, applyTheme, managedVariables, paletteFor, contrast, worldIds, isDark, THEME_CHOICES
} from '../../js/theme.js';

const IDS = ['paper', 'night', 'sunset', 'harbour', 'matcha', 'postcard'];
const SURFACES = ['--paper', '--paper-deep', '--card'];

describe('theme by time of day', () => {
  it('knows the time of day', () => {
    expect([4, 5, 6, 8, 9, 16, 17, 19, 20, 23, 0].map(daypartOf)).toEqual(
      ['night', 'night', 'dawn', 'dawn', 'day', 'day', 'dusk', 'dusk', 'night', 'night', 'night']);
  });

  it('Paper is the default look: by day, in the evening, and for a phone that asks for light', () => {
    expect(pickTheme(new Date(2026, 6, 10, 12), 'auto', null, false).world).toBe('paper');
    expect(pickTheme(new Date(2026, 6, 10, 12), 'auto', null, false).name).toBe('Paper');
    expect(pickTheme(new Date(2026, 6, 10, 18), 'auto', null, false).world).toBe('paper');
    expect(pickTheme(new Date(2026, 6, 10, 7), 'auto', null, false).world).toBe('paper');
  });

  it('Automatic switches to Night Train after dark, or when the phone asks for dark', () => {
    expect(pickTheme(new Date(2026, 6, 10, 22), 'auto', null, false).world).toBe('night');
    expect(pickTheme(new Date(2026, 6, 10, 2), 'auto', null, false).world).toBe('night');
    expect(pickTheme(new Date(2026, 6, 10, 13), 'auto', null, true).world).toBe('night');
    expect(pickTheme(new Date(2026, 6, 10, 22), 'auto', null, false).dark).toBe(true);
  });

  it('a look picked by hand stays, night or day', () => {
    ['paper', 'sunset', 'harbour', 'matcha', 'postcard', 'night'].forEach((id) => {
      expect(pickTheme(new Date(2026, 6, 10, 23), id, null, true).world).toBe(id);
      expect(pickTheme(new Date(2026, 6, 10, 12), id, null, false).world).toBe(id);
    });
    expect(pickTheme(new Date(2026, 6, 10, 12), 'night').dark).toBe(true);
    expect(pickTheme(new Date(2026, 6, 10, 12), 'sunset').dark).toBe(false);
  });

  it('a look left over from the earlier skin (Classic, the seasons, the bold worlds) just means Automatic', () => {
    ['classic', 'winter', 'summer', 'ocean', 'ember', 'halloween', '', undefined].forEach((old) => {
      const t = pickTheme(new Date(2026, 6, 10, 12), old, null, false);
      expect(t.mode).toBe('auto');
      expect(t.world).toBe('paper');
    });
  });

  it('lists the choices for Settings -> Colors, Automatic first', () => {
    expect(THEME_CHOICES.map((x) => x[0])).toEqual(['auto', 'paper', 'night', 'sunset', 'harbour', 'matcha', 'postcard', 'surprise']);
    expect(worldIds()).toEqual(IDS);
    THEME_CHOICES.forEach((c) => expect(c[1].length).toBeGreaterThan(3));
    expect(THEME_CHOICES.map((x) => x[1]).join(' ')).toMatch(/Night Train/);
    expect(THEME_CHOICES.map((x) => x[1]).join(' ')).toMatch(/Sunset Bazaar/);
  });
});

describe('the palettes: paper, ink and rubber-stamp colors, readable everywhere', () => {
  it('Paper uses the exact tokens from docs/DESIGN.md, and Night Train its dark ones', () => {
    const p = paletteFor('paper');
    expect(p['--paper'].toLowerCase()).toBe('#f6eedc');
    expect(p['--paper-deep'].toLowerCase()).toBe('#ebddbf');
    expect(p['--card'].toLowerCase()).toBe('#fffbf2');
    expect(p['--ink'].toLowerCase()).toBe('#1b2a41');
    expect(p['--red'].toLowerCase()).toBe('#d9432c');
    expect(p['--teal'].toLowerCase()).toBe('#0e8c8a');
    expect(p['--gold'].toLowerCase()).toBe('#f2b134');
    expect(p['--sky'].toLowerCase()).toBe('#5da9d6');
    expect(p['--green'].toLowerCase()).toBe('#2e9e5b');
    expect(p['--plum'].toLowerCase()).toBe('#7b3f6e');
    const n = paletteFor('night');
    expect(n['--paper'].toLowerCase()).toBe('#101b2d');
    expect(n['--card'].toLowerCase()).toBe('#1b2a41');
    expect(n['--ink'].toLowerCase()).toBe('#f6eedc');
    expect(isDark('night')).toBe(true);
    expect(isDark('paper')).toBe(false);
  });

  it('the tokens in css/tokens.css are the same as the Paper and Night Train palettes', () => {
    const css = readFileSync('css/tokens.css', 'utf8');
    const root = css.slice(css.indexOf(':root {'), css.indexOf(':root[data-mode="dark"]'));
    const dark = css.slice(css.indexOf(':root[data-mode="dark"]'), css.indexOf('/* semantic tokens'));
    const p = paletteFor('paper');
    const n = paletteFor('night');
    ['--paper', '--paper-deep', '--card', '--ink', '--ink-soft', '--ink-faint', '--red', '--teal', '--gold', '--sky', '--green', '--plum'].forEach((k) => {
      expect(root.toLowerCase(), k).toContain(k + ': ' + p[k].toLowerCase());
    });
    ['--paper', '--paper-deep', '--card', '--ink', '--ink-soft', '--ink-faint', '--red', '--teal', '--gold', '--sky', '--green', '--plum'].forEach((k) => {
      expect(dark.toLowerCase(), k).toContain(k + ': ' + n[k].toLowerCase());
    });
  });

  it('every palette is a different look', () => {
    expect(new Set(IDS.map((id) => paletteFor(id)['--paper'])).size).toBe(IDS.length);
    expect(new Set(IDS.map((id) => paletteFor(id)['--card'])).size).toBe(IDS.length);
  });

  it('keeps ink readable (7:1) on the paper, the deeper paper and the cards, and soft ink at 4.5:1', () => {
    const failures = [];
    IDS.forEach((id) => {
      const p = paletteFor(id);
      SURFACES.forEach((s) => {
        const ratio = contrast(p['--ink'], p[s]);
        if (ratio < 7) failures.push(id + ' ink on ' + s + ' ' + ratio.toFixed(2));
        const soft = contrast(p['--ink-soft'], p[s]);
        if (soft < 4.5) failures.push(id + ' soft ink on ' + s + ' ' + soft.toFixed(2));
      });
    });
    expect(failures).toEqual([]);
  });

  it('the deep stamp colors that carry text reach 4.5:1 on every surface', () => {
    const failures = [];
    IDS.forEach((id) => {
      const p = paletteFor(id);
      ['--red-deep', '--teal-deep', '--green-deep', '--sky-deep', '--gold-deep'].forEach((k) => {
        SURFACES.forEach((s) => {
          const ratio = contrast(p[k], p[s]);
          if (ratio < 4.5) failures.push(id + ' ' + k + ' on ' + s + ' ' + ratio.toFixed(2));
        });
      });
    });
    expect(failures).toEqual([]);
  });

  it('paper-colored text on the red, teal and green fills, and ink on marigold, reach 4.5:1', () => {
    const failures = [];
    IDS.forEach((id) => {
      const p = paletteFor(id);
      ['--red-fill', '--teal-fill', '--green-fill'].forEach((k) => {
        const ratio = contrast(p['--on-fill'], p[k]);
        if (ratio < 4.5) failures.push(id + ' ' + k + ' ' + ratio.toFixed(2));
      });
      const gold = contrast(p['--on-gold'], p['--gold']);
      if (gold < 4.5) failures.push(id + ' gold ' + gold.toFixed(2));
    });
    expect(failures).toEqual([]);
  });

  it('the three gates are red, marigold and teal, each readable (4.5:1) with its own text color', () => {
    const failures = [];
    IDS.forEach((id) => {
      const p = paletteFor(id);
      [1, 2, 3].forEach((n) => {
        const ratio = contrast(p['--lane-' + n + '-ink'], p['--lane-' + n]);
        if (ratio < 4.5) failures.push(id + ' lane ' + n + ' ' + ratio.toFixed(2));
      });
      expect(p['--lane-2']).toBe(p['--gold']);
    });
    expect(failures).toEqual([]);
  });

  it('the dark palette is dark, and the others are light', () => {
    const lum = (hex) => contrast(hex, '#000000');
    expect(lum(paletteFor('night')['--paper'])).toBeLessThan(2);
    IDS.filter((id) => id !== 'night').forEach((id) => expect(lum(paletteFor(id)['--paper'])).toBeGreaterThan(10));
  });

  it('applying a theme sets variables and attributes, clears them again, and leaves the drifting stamps alone', () => {
    document.body.innerHTML = '<div id="bgDecor"><div id="bgFlyers"><span class="flyer stamp">A</span></div></div>';
    const root = document.documentElement;
    applyTheme(root, pickTheme(new Date(2026, 0, 10, 12), 'auto', null, false));
    expect(root.style.getPropertyValue('--paper')).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(root.getAttribute('data-world')).toBe('paper');
    expect(root.getAttribute('data-mode')).toBe('light');
    const flyers = document.getElementById('bgFlyers');
    expect(flyers.children.length).toBe(1);
    applyTheme(root, pickTheme(new Date(2026, 0, 10, 23), 'auto', null, false));
    expect(root.getAttribute('data-world')).toBe('night');
    expect(root.getAttribute('data-mode')).toBe('dark');
    expect(root.style.getPropertyValue('--shadow-c').toLowerCase()).toBe('#04080f');
    applyTheme(root, pickTheme(new Date(2026, 0, 10, 12), 'sunset'));
    expect(root.style.getPropertyValue('--shadow-c')).toBe('');   // only the dark palette has one
    expect(flyers.children.length).toBe(1);
    managedVariables().forEach((k) => expect(typeof k).toBe('string'));
    expect(managedVariables()).toContain('--lane-1');
  });
});

describe('Surprise me', () => {
  it('uses the rolled palette, and falls back to Paper', () => {
    const t = pickTheme(new Date(2026, 6, 10, 22), 'surprise', 'matcha', false);
    expect(t.mode).toBe('surprise');
    expect(t.world).toBe('matcha');
    expect(pickTheme(new Date(2026, 6, 10, 12), 'surprise').world).toBe('paper');
  });

  it('a reroll always lands on a different palette', () => {
    for (const w of worldIds()) {
      for (let i = 0; i < 20; i++) expect(rollWorld(w)).not.toBe(w);
    }
    expect(worldIds()).toContain(rollWorld(null));
    const others = worldIds().filter((w) => w !== 'paper');
    expect(rollWorld('paper', () => 0.999)).toBe(others[others.length - 1]);
    expect(rollWorld('paper', () => 0)).toBe(others[0]);
  });

  it('a reroll is due after each run, or after a good while', () => {
    const t0 = 1_000_000;
    expect(rerollDue(0, t0, t0 + 60_000)).toBe(false);
    expect(rerollDue(1, t0, t0 + 60_000)).toBe(true);   // after every run
    expect(rerollDue(0, t0, t0 + 21 * 60_000)).toBe(true);
  });
});
