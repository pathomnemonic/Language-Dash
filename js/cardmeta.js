/**
 * cardmeta.js — the small, always-needed card constants.
 *
 * Kept separate from the word tables (js/lang/data) so the app can show its screens immediately and load the
 * words in the background. SUBJECTS are the 15 topics; EXAM_FILTERS are the word-frequency levels.
 */

import { TOPICS, LEVELS } from './lang/topics.js';

export const SUBJECTS = TOPICS;

/** Word levels (first 100 / 300 / 600 / all 1,000). Named EXAM_FILTERS for historical reasons. */
export const EXAM_FILTERS = Object.freeze(LEVELS.map(function (l) { return l.id; }));

export const QUESTION_TYPES = Object.freeze(['word']);

export const SOURCE_DISCIPLINES = Object.freeze(['vocabulary']);

// Content version: bump when the word tables change materially
export const CONTENT_VERSION = '1.0.0';
