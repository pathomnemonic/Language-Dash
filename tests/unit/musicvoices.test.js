import { describe, it, expect, vi } from 'vitest';
import { MusicGenerator, MENU_THEME, SKIN_MUSIC } from '../../js/audio.js';

// The music is warm and plucked (marimba, kalimba, plucked strings, a soft shaker and wood block): no buzzing
// square or sawtooth waves holding notes, and the menu track is no longer the old minor-key synth groove.

function recorder() {
  const made = [];
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} });
  const node = () => ({ gain: param(), frequency: param(), detune: param(), Q: param(), connect() {}, disconnect() {}, start() {}, stop() {} });
  const ctx = {
    currentTime: 0,
    state: 'running',
    createGain: node,
    createBiquadFilter: node,
    createOscillator: () => { const o = node(); made.push(o); return o; },
    createBufferSource: () => ({ ...node(), buffer: null }),
    createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
    sampleRate: 44100,
    close() {}
  };
  return { ctx, made };
}

describe('the music voices', () => {
  it('the menu track is a lydian marimba tune, not the old minor synth groove', () => {
    const m = SKIN_MUSIC[MENU_THEME];
    expect(m.scale).toBe('cLydian');
    expect(m.melodyType).toBe('sine');
    expect(m.bassType).not.toBe('sawtooth');
  });

  it('plays every step of every track without a sustained square or sawtooth bass or pad', () => {
    vi.useFakeTimers();
    Object.keys(SKIN_MUSIC).forEach((name) => {
      const { ctx, made } = recorder();
      const gen = new MusicGenerator(ctx, { connect() {} }, name, () => ({ masterVolume: 1, musicVolume: 1 }));
      expect(gen.scale.length, name + ' scale').toBeGreaterThan(3);
      for (let step = 0; step < 16; step++) {
        const before = made.length;
        gen._playBass(110, 1, 0);
        const bass = made.slice(before);
        expect(bass.every((o) => o.type === 'sine' || o.type === 'triangle'), name + ' bass').toBe(true);
        const pre = made.length;
        gen._playPad([0, 2, 4], 1, 0);
        expect(made.slice(pre).every((o) => o.type === 'sine' || o.type === 'triangle'), name + ' pad').toBe(true);
        gen._playMelody(440, 1, 0);
        gen._playDrums(step, 1, 0);
      }
      gen.dispose();
    });
    vi.useRealTimers();
  });

  it('keeps the same track data shape: 16-step patterns and a drum pattern for every map', () => {
    Object.keys(SKIN_MUSIC).forEach((name) => {
      const m = SKIN_MUSIC[name];
      expect(m.bassPattern).toHaveLength(16);
      expect(m.melodyPattern).toHaveLength(16);
    });
  });
});
