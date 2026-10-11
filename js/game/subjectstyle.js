/**
 * subjectstyle.js — icon and accent color for each topic.
 *
 * Used for gate art in the runner, the weak-spot dashboard and the run
 * report. Every topic has both an icon and a color so the cue never depends
 * on color alone (colorblind-safe). The 15 topics are listed in docs/WORLD.md.
 */

var STYLES = {
  'Basics': { icon: '👋', color: 0x4cc9f0 },
  'People & Family': { icon: '👪', color: 0xff8fab },
  'Body & Health': { icon: '🖐️', color: 0xff4d6d },
  'Food & Drink': { icon: '🍜', color: 0xffb703 },
  'Home & Things': { icon: '🏠', color: 0xf4a261 },
  'Nature & Animals': { icon: '🦜', color: 0x80ed99 },
  'Travel & Places': { icon: '🧳', color: 0xff6b35 },
  'Time & Numbers': { icon: '⏰', color: 0x9d8cff },
  'Colors & Describing': { icon: '🎨', color: 0xf72585 },
  'Actions': { icon: '🏃', color: 0x9ef01a },
  'Feelings & Thinking': { icon: '💭', color: 0xc77dff },
  'Talking': { icon: '💬', color: 0xffd166 },
  'Work & School': { icon: '🎒', color: 0xadb5bd },
  'Shopping & Money': { icon: '🛍️', color: 0xe63946 },
  'Small Words': { icon: '🔗', color: 0x18ffff }
};

var FALLBACK = { icon: '📖', color: 0x18ffff };

/**
 * @param {string} subject the topic name
 * @returns {{icon: string, color: number}}
 */
export function getSubjectStyle(subject) {
  return STYLES[subject] || FALLBACK;
}

/** CSS hex string (#rrggbb) for a topic color. */
export function getSubjectCssColor(subject) {
  var hex = getSubjectStyle(subject).color;
  return '#' + ('000000' + hex.toString(16)).slice(-6);
}

export var SUBJECT_STYLES = STYLES;
