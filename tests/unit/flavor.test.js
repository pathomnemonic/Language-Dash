import { describe, it, expect } from 'vitest';
import { streakCallout, runVerdict, loadingLine } from '../../js/flavor.js';

describe('flavor copy', () => {
  it('gives callouts only on milestone streaks', () => {
    expect(streakCallout(5)).toBe('Word on the street!');
    expect(streakCallout(6)).toBe('');
    expect(streakCallout(20)).toBe('Polyglot spotted!');
  });

  it('gives a verdict for every accuracy band', () => {
    expect(runVerdict(0, 0)).toBe('Not a word caught.');
    expect(runVerdict(8, 0)).toBe('Word perfect.');
    expect(runVerdict(2, 0)).toBe('Fluent and fast.');
    expect(runVerdict(9, 1)).toBe('Fluent and fast.');
    expect(runVerdict(7, 3)).toBe('Getting the hang of it.');
    expect(runVerdict(5, 5)).toBe('A few words got away.');
    expect(runVerdict(1, 9)).toBe('The Hush won this one. Try again.');
  });

  it('picks a loading line in range', () => {
    expect(loadingLine(() => 0)).toBe('Unpacking the phrasebook…');
    expect(loadingLine(() => 0.999999)).toBe('Waking the Guild…');
    expect(typeof loadingLine()).toBe('string');
  });
});
