// @vitest-environment node
// tools/validate-deck.mjs: an unknown --pair must fail loudly (it used to print "All pairs OK." and exit 0 after
// validating nothing), and card ids may run to five digits now that the deck targets 10,000 concepts.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';

function run(args) {
  try {
    return { code: 0, out: execFileSync('node', ['tools/validate-deck.mjs', ...args], { encoding: 'utf8', stdio: 'pipe' }) };
  } catch (e) {
    return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

describe('validate-deck command line', () => {
  it('refuses an unknown pair instead of succeeding over zero pairs', { timeout: 180000 }, () => {
    const r = run(['--pair=xx-yy']);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/unknown pair/);
  });
  it('still passes a real pair', { timeout: 180000 }, () => {
    const r = run(['--pair=en-es']);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/All pairs OK/);
  });
});
