/**
 * tts.js — speaking text aloud, in the browser and inside the phone app.
 *
 * A browser speaks with its own speech engine (window.speechSynthesis). The Android app's web view does not offer
 * that, so there the phone's built-in text-to-speech is used through a plugin. Everything that talks (the
 * hands-free flashcards, "read questions aloud", the 🔊 hear-it button) goes through here, so it works the same everywhere and says
 * "not supported" only when the device really has no voice.
 */

import { isNative } from './native.js';
import { segmentsFor } from './readaloud.js';
import { LANGUAGE_BY_CODE } from './lang/languages.js';
import { getPairOrDefault } from './lang/pair.js';

var _gen = 0; // bumped by cancelSpeech, so a multi-voice reading stops between its parts

/** The BCP-47 voice tag for a language code ('es' becomes 'es-ES'); 'en-US' for anything unknown. */
export function ttsTag(code) {
  var l = LANGUAGE_BY_CODE[code];
  return l ? l.tts : 'en-US';
}

/** The voice tags of the player's pair: {known, target}. */
export function pairVoices() {
  var p = getPairOrDefault();
  return { known: ttsTag(p.known), target: ttsTag(p.target) };
}

var _plugin = null;
var _pluginTried = false;
var _testPlugin = null;

function webSpeech() {
  return typeof window !== 'undefined' && !!window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined';
}

/** The phone's own speech plugin (only inside the app), loaded on first use. */
function loadPlugin() {
  if (_testPlugin) return Promise.resolve(_testPlugin);
  if (_plugin) return Promise.resolve(_plugin);
  if (_pluginTried || !isNative()) return Promise.resolve(null);
  _pluginTried = true;
  return import('@capacitor-community/text-to-speech').then(function (m) {
    _plugin = m.TextToSpeech || null;
    return _plugin;
  }).catch(function () { return null; });
}

/** Is there a voice to speak with? (In the app: yes, the phone's own.) */
export function canSpeak() {
  return !!_testPlugin || isNative() || webSpeech();
}

/**
 * Speak a piece of text, replacing anything being said.
 * @param {string} text
 * @param {{rate?: number, volume?: number, lang?: string, onstart?: function(): void, onend?: function(): void}} [opts]
 * @returns {Promise<void>} resolves when speaking has finished (or failed, or was cancelled)
 */
export function speak(text, opts) {
  opts = opts || {};
  var segs = opts.segments || segmentsFor(text);
  if (segs && segs.length > 1) return speakSegments(segs, opts);
  if (segs && segs.length === 1 && !opts.lang) opts = Object.assign({}, opts, { lang: segs[0].lang });
  var native = !!_testPlugin || isNative();
  if (native) {
    return loadPlugin().then(function (plugin) {
      if (!plugin) return webSpeak(text, opts);
      if (opts.onstart) opts.onstart();
      return plugin.speak({
        text: text, lang: opts.lang || 'en-US', rate: opts.rate || 1, pitch: 1,
        volume: typeof opts.volume === 'number' ? Math.min(1, Math.max(0, opts.volume)) : 1,
        category: 'ambient', queueStrategy: 0
      }).then(function () { if (opts.onend) opts.onend(); }, function () { /* a failed or cancelled utterance just ends */ });
    });
  }
  return webSpeak(text, opts);
}

/** Several parts, each in its own voice, one after the other (stops early if cancelSpeech is called). */
function speakSegments(segs, opts) {
  var gen = ++_gen;
  var last = segs.length - 1;
  var chain = Promise.resolve();
  segs.forEach(function (seg, i) {
    chain = chain.then(function () {
      if (gen !== _gen) return null;
      return speakOne(seg.text, {
        rate: opts.rate, volume: opts.volume, lang: seg.lang,
        onstart: i === 0 ? opts.onstart : undefined,
        onend: i === last ? opts.onend : undefined
      });
    });
  });
  return chain;
}

function speakOne(text, opts) {
  var native = !!_testPlugin || isNative();
  if (native) {
    return loadPlugin().then(function (plugin) {
      if (!plugin) return webSpeak(text, opts);
      if (opts.onstart) opts.onstart();
      return plugin.speak({
        text: text, lang: opts.lang || 'en-US', rate: opts.rate || 1, pitch: 1,
        volume: typeof opts.volume === 'number' ? Math.min(1, Math.max(0, opts.volume)) : 1,
        category: 'ambient', queueStrategy: 0
      }).then(function () { if (opts.onend) opts.onend(); }, function () { /* ends */ });
    });
  }
  return webSpeak(text, opts);
}

/**
 * Say a word card: the hint in the language you know, then the word in the language you are learning, each in
 * its own voice. Pass {only: 'target'} (or 'known') to say just one. Resolves when done.
 * @param {{bw?: string[], ans?: string}} card
 * @param {{only?: 'known'|'target', rate?: number}} [opts]
 */
export function speakCard(card, opts) {
  opts = opts || {};
  if (!card || !canSpeak()) return Promise.resolve();
  var v = pairVoices();
  var segs = [];
  if (opts.only !== 'target') (card.bw || []).slice(0, 1).forEach(function (t) { if (t) segs.push({ text: String(t), lang: v.known }); });
  if (opts.only !== 'known' && card.ans) segs.push({ text: String(card.ans), lang: v.target });
  if (!segs.length) return Promise.resolve();
  return speak(segs.map(function (x) { return x.text; }).join('. '), { rate: opts.rate || 0.9, segments: segs });
}

function webSpeak(text, opts) {
  return new Promise(function (resolve) {
    if (!webSpeech()) { resolve(); return; }
    var done = false;
    var finish = function () { if (!done) { done = true; if (opts.onend) opts.onend(); resolve(); } };
    var u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate || 1;
    if (opts.lang) u.lang = opts.lang;
    if (typeof opts.volume === 'number') u.volume = opts.volume;
    if (opts.onstart) u.onstart = opts.onstart;
    u.onend = finish;
    u.onerror = function () { done = true; resolve(); };
    setTimeout(finish, 25000); // some browsers never say they have finished
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  });
}

/** Stop whatever is being said. */
export function cancelSpeech() {
  _gen++;
  if (webSpeech()) window.speechSynthesis.cancel();
  if (_testPlugin || isNative()) loadPlugin().then(function (p) { if (p && p.stop) return p.stop(); return null; }).catch(function () {});
}

/** For tests: stand in for the phone's speech plugin. */
export function setNativePluginForTest(plugin) { _testPlugin = plugin; _plugin = null; _pluginTried = false; }
