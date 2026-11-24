// The clip capture mode (js/capture.js, tools/clip) is for marketing video only: it must never reach players.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { FEATURES } from '../../js/features.js';

function files(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) files(p, out); else out.push(p);
  }
  return out;
}

describe('the clip capture mode never reaches players', () => {
  it('is off unless a build asks for it', () => {
    expect(FEATURES.capture).toBe(false);
  });

  it('is only loaded behind the feature flag and a ?clip= page, with one dynamic import and no static one', () => {
    const main = fs.readFileSync('js/main.js', 'utf8');
    expect(main).toMatch(/import\.meta\.env\.VITE_FEATURE_CAPTURE === '1' && \/\[\?&\]clip=\//);
    expect(main.match(/import\('\.\/capture\.js'\)/g).length).toBe(1);
    expect(main).not.toMatch(/^import .* from '\.\/capture\.js'/m);
  });

  it('the deploy, CI and Android workflows do not set the flag', () => {
    for (const f of fs.readdirSync('.github/workflows')) expect(fs.readFileSync('.github/workflows/' + f, 'utf8'), f).not.toMatch(/VITE_FEATURE_CAPTURE/);
  });

  it('a default build contains none of it: no capture chunk, none of its code, none of its parameters', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ld-default-build-'));
    // a real build in a separate process, with the capture flag absent from its environment
    const env = { ...process.env };
    delete env.VITE_FEATURE_CAPTURE;
    try {
      execFileSync('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'], { env, stdio: 'pipe' });
      const all = files(outDir);
      expect(all.filter((f) => /capture/i.test(path.basename(f))), 'a capture chunk was emitted').toEqual([]);
      const text = all.filter((f) => /\.(js|html|css|json)$/.test(f)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
      ['__clip', 'prepareClip', 'startClip', 'no badge pop-ups in a clip', 'ld_clipPairSet', 'installClock'].forEach((marker) => {
        expect(text.includes(marker), 'the default build contains "' + marker + '"').toBe(false);
      });
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  }, 180000);
});
