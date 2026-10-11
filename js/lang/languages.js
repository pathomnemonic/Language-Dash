/**
 * languages.js — the 15 languages Language Dash teaches and speaks.
 *
 * `code` is the key used everywhere (data files, saves, card ids). `tts` is the BCP-47 tag for speech synthesis.
 * `roman` is true when the language is written in a non-Latin script, so gates can show a small pronunciation
 * line (pinyin, romaji, ...) under the word. `rtl` marks right-to-left scripts.
 */

export var LANGUAGES = Object.freeze([
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧', tts: 'en-US', roman: false, rtl: false },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', tts: 'es-ES', roman: false, rtl: false },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', tts: 'fr-FR', roman: false, rtl: false },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪', tts: 'de-DE', roman: false, rtl: false },
  { code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹', tts: 'it-IT', roman: false, rtl: false },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇧🇷', tts: 'pt-BR', roman: false, rtl: false },
  { code: 'nl', name: 'Dutch', native: 'Nederlands', flag: '🇳🇱', tts: 'nl-NL', roman: false, rtl: false },
  { code: 'sv', name: 'Swedish', native: 'Svenska', flag: '🇸🇪', tts: 'sv-SE', roman: false, rtl: false },
  { code: 'pl', name: 'Polish', native: 'Polski', flag: '🇵🇱', tts: 'pl-PL', roman: false, rtl: false },
  { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺', tts: 'ru-RU', roman: true, rtl: false },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵', tts: 'ja-JP', roman: true, rtl: false },
  { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷', tts: 'ko-KR', roman: true, rtl: false },
  { code: 'zh', name: 'Mandarin Chinese', native: '中文', flag: '🇨🇳', tts: 'zh-CN', roman: true, rtl: false },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦', tts: 'ar-SA', roman: true, rtl: true },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳', tts: 'hi-IN', roman: true, rtl: false }
]);

export var LANGUAGE_BY_CODE = Object.freeze(LANGUAGES.reduce(function (m, l) { m[l.code] = l; return m; }, {}));

/** @param {string} code @returns {boolean} */
export function isLanguageCode(code) { return typeof code === 'string' && Object.prototype.hasOwnProperty.call(LANGUAGE_BY_CODE, code); }

/** @param {string} code @returns {object|null} */
export function getLanguage(code) { return isLanguageCode(code) ? LANGUAGE_BY_CODE[code] : null; }
