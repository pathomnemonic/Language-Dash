import { describe, it, expect } from 'vitest';
import { beatsBest, recordBest } from '../../js/scorebest.js';

describe('only a player\'s best run is sent', () => {
  it('sends the first run in a mode, then only higher ones', () => {
    let bests = {};
    expect(beatsBest(bests, 'endless', '2026-W40', 500)).toBe(true);
    bests = recordBest(bests, 'endless', '2026-W40', 500);
    expect(beatsBest(bests, 'endless', '2026-W40', 400)).toBe(false);
    expect(beatsBest(bests, 'endless', '2026-W40', 500)).toBe(false);
    expect(beatsBest(bests, 'endless', '2026-W40', 501)).toBe(true);
  });
  it('tracks each mode and season on its own', () => {
    const bests = recordBest({}, 'endless', '2026-W40', 900);
    expect(beatsBest(bests, 'weakness', '2026-W40', 10)).toBe(true);
    expect(beatsBest(bests, 'endless', '2026-W41', 10)).toBe(true);
  });
  it('never lowers a recorded best, and forgets old seasons', () => {
    let bests = recordBest({}, 'endless', '2026-W40', 900);
    bests = recordBest(bests, 'endless', '2026-W40', 100);
    expect(bests['endless|2026-W40']).toBe(900);
    bests = recordBest(bests, 'endless', '2026-W41', 50);
    expect(Object.keys(bests)).toEqual(['endless|2026-W41']);
  });
});

// The database side of "one best run per player, mode and season" is covered for real,
// against a live database, in tests/unit/database.test.js. A text search over schema.sql
// that used to sit here only proved the trigger's name is spelled the same in both files.
