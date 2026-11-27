// tests/unit/setup.js
// Global test setup for Vitest unit tests

// Run from the repo root, whatever directory vitest was launched in: many suites read
// repo files by root relative paths (js/..., database/...), which only resolve from here.
// (__dirname is the one anchor vitest gives every file it runs; import.meta.url is
// rewritten to a /@fs/ URL in the browser-like environments and cannot be used.)
process.chdir(resolve(__dirname, '../..'));

// The app loads its card database lazily; tests want it present from the start
import { resolve } from 'node:path';
import { loadCards } from '../../js/cardhub.js';
await loadCards();

// Mock Web Audio API for audio.js tests
globalThis.AudioContext = class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = { channelCount: 2 };
  }
  createGain() {
    return {
      gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
      disconnect() {}
    };
  }
  createOscillator() {
    return {
      type: 'sine',
      frequency: { value: 440, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} },
      detune: { value: 0, setValueAtTime() {} },
      connect() {},
      start() {},
      stop() {},
      disconnect() {}
    };
  }
  createBiquadFilter() {
    return {
      type: 'lowpass',
      frequency: { value: 350, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      Q: { value: 1 },
      connect() {},
      disconnect() {}
    };
  }
  createBuffer(channels, length, sampleRate) {
    return {
      getChannelData() { return new Float32Array(length); }
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      connect() {},
      start() {},
      stop() {},
      disconnect() {}
    };
  }
  createStereoPanner() {
    return {
      pan: { value: 0, setValueAtTime() {} },
      connect() {},
      disconnect() {}
    };
  }
  createWaveShaper() {
    return {
      curve: null,
      connect() {},
      disconnect() {}
    };
  }
  createDynamicsCompressor() {
    return {
      threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 1 }, attack: { value: 0 }, release: { value: 0 },
      connect() {},
      disconnect() {}
    };
  }
  resume() { return Promise.resolve(); }
};

globalThis.webkitAudioContext = globalThis.AudioContext;

// Mock speechSynthesis
globalThis.speechSynthesis = {
  speak() {},
  cancel() {}
};

globalThis.SpeechSynthesisUtterance = class {
  constructor(text) { this.text = text; }
};

// Mock navigator.vibrate
if (!navigator.vibrate) {
  navigator.vibrate = () => true;
}

// Mock localStorage for storage.js tests. The backing store has no prototype:
// on a plain object, getItem('constructor') would answer the inherited constructor
// instead of null, which no real localStorage ever does.
const localStorageMock = (() => {
  let store = Object.create(null);
  return {
    getItem(key) { return store[key] ?? null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; },
    clear() { store = Object.create(null); },
    get length() { return Object.keys(store).length; },
    key(i) { return Object.keys(store)[i] ?? null; }
  };
})();

// configurable and writable, so a suite may replace this mock with its own
// (vi.stubGlobal refuses to stub a property that is neither)
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true, writable: true });
