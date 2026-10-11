// Language Dash shares a host (github.io) with other games, so it must never read, write or delete anything that belongs to
// them: browser storage keys, cache names, backup files, room codes, auth sessions, store products. This test fails if an
// identifier from the sibling game (Dx Dash) comes back, or a storage key loses its own prefix.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(__dirname, '../..');
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name === 'data' && dir.endsWith('lang')) continue;
    if (statSync(full).isDirectory()) walk(full, out); else if (/\.(js|mjs|html|json)$/.test(name)) out.push(full);
  }
  return out;
}
const sources = [...walk(join(root, 'js')), join(root, 'public/sw.js'), join(root, 'index.html'), join(root, 'capacitor.config.json')];
const text = (f) => readFileSync(f, 'utf8');

describe('siloed from Dx Dash', () => {
  it('no sibling-game identifier is used anywhere in the app', () => {
    const forbidden = /(['"`])(dx_|dx:|dx-dash|dxdash|buzzword_|buzzword-dash)/;
    const hits = sources.filter((f) => forbidden.test(text(f))).map((f) => f.replace(root + '/', ''));
    expect(hits).toEqual([]);
  });

  it('every browser-storage key literal carries the ld_ or langdash prefix', () => {
    const bad = [];
    for (const f of sources) {
      const re = /(?:localStorage|sessionStorage|store\(\))\.(?:get|set|remove)Item\(\s*['"]([^'"]+)['"]/g;
      let m;
      while ((m = re.exec(text(f)))) if (!/^(ld_|langdash)/.test(m[1])) bad.push(f.replace(root + '/', '') + ': ' + m[1]);
    }
    expect(bad).toEqual([]);
  });

  it('the service worker only ever deletes its own caches', () => {
    const sw = text(join(root, 'public/sw.js'));
    expect(sw).toMatch(/const CACHE = 'language-dash-/);
    expect(sw).toMatch(/const ASSETS = 'language-dash-assets'/);
    expect(sw).toMatch(/indexOf\('language-dash-'\) === 0/);
  });

  it('the Supabase client keeps its session under its own key', () => {
    expect(text(join(root, 'js/leaderboard.js'))).toMatch(/storageKey: 'langdash-auth'/);
  });

  it('a backup from the other game is not accepted as ours', () => {
    expect(text(join(root, 'js/storage.js'))).toMatch(/parsed\.app === 'language-dash'/);
  });
});
