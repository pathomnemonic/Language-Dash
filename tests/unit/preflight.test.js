import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preflight, isBundleJs } from '../../tools/preflight.mjs';

function fixture(over) {
  const root = mkdtempSync(join(tmpdir(), 'pf-'));
  const dist = join(root, 'dist');
  mkdirSync(join(dist, 'assets'), { recursive: true });
  writeFileSync(join(root, 'package.json'), '{"version":"1.0.0"}');
  const files = { 'index.html': '<script src="/assets/a-12345678.js"></script>', 'privacy.html': 'x', 'terms.html': 'x', 'delete-account.html': 'x', 'icon.svg': 'x', 'sw.js': 'const CACHE="dx-1";', 'manifest.webmanifest': '{"name":"n","icons":[{"src":"i"}]}', 'remote-config.json': '{"killed":[]}', 'assets/a-12345678.js': 'console.log(1)' };
  Object.assign(files, over || {});
  Object.keys(files).forEach((f) => { if (files[f] !== null) writeFileSync(join(dist, f), files[f]); });
  return { root, dist };
}

describe('release preflight', () => {
  it('passes a healthy build', () => { const f = fixture(); expect(preflight(f.root, f.dist).fails).toEqual([]); });
  it('fails on a missing store page, a dead reference, an unstamped service worker and a secret', () => {
    const f = fixture({ 'privacy.html': null, 'index.html': '<script src="/assets/gone.js"></script>', 'sw.js': 'const C="__BUILD_ID__"', 'assets/a-12345678.js': 'var k="sk_live_abcdefghijklmnop";' });
    const out = preflight(f.root, f.dist).fails.join('\n');
    expect(out).toMatch(/privacy\.html/); expect(out).toMatch(/gone\.js/); expect(out).toMatch(/BUILD_ID/); expect(out).toMatch(/secret/);
  });
  it('warns when a mechanic is switched off remotely', () => {
    const f = fixture({ 'remote-config.json': '{"killed":["hazards"]}' });
    expect(preflight(f.root, f.dist).warns.join()).toMatch(/hazards/);
  });
  it('recognises bundle scripts on Windows paths too', () => {
    expect(isBundleJs('C:\\app\\dist\\assets\\a-12345678.js')).toBe(true);
    expect(isBundleJs('C:\\app\\dist\\sw.js')).toBe(false);
    expect(isBundleJs('/app/dist/assets/a.js')).toBe(true);
  });
  it('checks references with query strings and single quotes', () => {
    const okF = fixture({ 'index.html': '<script src="/assets/a-12345678.js?v=2"></script>' });
    expect(preflight(okF.root, okF.dist).fails).toEqual([]);
    const badF = fixture({ 'index.html': "<script src='/assets/gone.js'></script>" });
    expect(preflight(badF.root, badF.dist).fails.join('\n')).toMatch(/gone\.js/);
  });
  it('scans secrets beyond the bundles: pages and the service worker ship too', () => {
    const inSw = fixture({ 'sw.js': 'var k="sk_live_abcdefghijklmnop";' });
    expect(preflight(inSw.root, inSw.dist).fails.join('\n')).toMatch(/secret/);
    const inHtml = fixture({ 'privacy.html': 'leaked ghp_abcdefghijklmnopqrstuvwxyz1234' });
    expect(preflight(inHtml.root, inHtml.dist).fails.join('\n')).toMatch(/secret/);
  });
  it('fails a remote config whose fields have the wrong shape (the app would silently ignore them)', () => {
    const badKilled = fixture({ 'remote-config.json': '{"killed":"hazards"}' });
    expect(preflight(badKilled.root, badKilled.dist).fails.join('\n')).toMatch(/killed/);
    const badSample = fixture({ 'remote-config.json': '{"analytics":{"sample":2}}' });
    expect(preflight(badSample.root, badSample.dist).fails.join('\n')).toMatch(/sample/);
    const goodFull = fixture({ 'remote-config.json': '{"killed":[],"analytics":{"enabled":true,"sample":1,"killed":[],"rates":{"obstacle_outcome":0.2},"experiments":{}},"pro":{"enabled":true}}' });
    expect(preflight(goodFull.root, goodFull.dist).fails).toEqual([]);
  });
});
