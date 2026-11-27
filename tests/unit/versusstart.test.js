import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Versus rematch timing (js/main.js). main.js boots the whole app when imported, so — like contracts.test.js —
// these checks read the source. The bug: onRunEnd cleared multiplayerMatchStarted only in a 5 second timer while
// scheduleVersusStart returned early whenever the flag was set, so a rematch arranged inside those 5 seconds
// never started; and the stale timer could later clear the flag of the match that replaced it.

const src = readFileSync('js/main.js', 'utf8');

function bodyOf(marker, length) {
  const at = src.indexOf(marker);
  expect(at, marker + ' not found').toBeGreaterThan(-1);
  return src.slice(at, at + length);
}

describe('scheduleVersusStart', () => {
  it('ignores only a duplicate call for the same match (same startAt), not a new match', () => {
    const body = bodyOf('function scheduleVersusStart(config) {', 700);
    expect(body).toMatch(/multiplayerMatchStarted && config\.startAt && config\.startAt === multiplayerMatchStartAt/);
    expect(body).toMatch(/multiplayerMatchSeq\+\+/);
  });
});

describe('the post-run timer', () => {
  it('clears the started flag only when no newer match has been scheduled since the run ended', () => {
    const body = bodyOf('// Hide opponent HUD after delay', 500);
    expect(body).toMatch(/var seqAtRunEnd = multiplayerMatchSeq;/);
    expect(body).toMatch(/if \(multiplayerMatchSeq === seqAtRunEnd\) \{ multiplayerMatchStarted = false;/);
  });
});
