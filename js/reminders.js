/**
 * reminders.js — the daily word reminder, in the browser and inside the phone app.
 *
 * A browser can show a notification while the page is open (the Notification API). The Android app's web view has
 * no such API, so inside the app the reminder is a real scheduled notification from the phone itself, which also
 * arrives when the app is closed. The next one is always scheduled for the chosen hour: today if it is still
 * ahead and today's goal is not met yet, otherwise tomorrow.
 */

import { isNative } from './native.js';

var NOTIFICATION_ID = 4101;
var _testPlugin = null;
var _plugin = null;

export var REMINDER_TITLE = 'Language Dash';
export var REMINDER_BODY = 'Time for a few words. Keep the hearth lit! 🔥';

function loadPlugin() {
  if (_testPlugin) return Promise.resolve(_testPlugin);
  if (_plugin) return Promise.resolve(_plugin);
  if (!isNative()) return Promise.resolve(null);
  return import('@capacitor/local-notifications').then(function (m) { _plugin = m.LocalNotifications || null; return _plugin; }).catch(function () { return null; });
}

/** Can this device show reminders at all? */
export function canRemind() {
  return !!_testPlugin || isNative() || (typeof window !== 'undefined' && 'Notification' in window);
}

/**
 * The next time a reminder should go off.
 * @param {number} now ms
 * @param {number} hour 0 to 23
 * @param {boolean} goalMetToday
 * @returns {Date}
 */
export function nextReminderTime(now, hour, goalMetToday) {
  var d = new Date(now);
  var at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.max(0, Math.min(23, Math.floor(hour))), 0, 0, 0);
  if (goalMetToday || at.getTime() <= now) at = new Date(at.getFullYear(), at.getMonth(), at.getDate() + 1, at.getHours(), 0, 0, 0);
  return at;
}

/**
 * Ask permission (called when the player turns reminders on).
 * @returns {Promise<{ok: boolean, reason?: 'unsupported'|'blocked'}>}
 */
export function requestReminderPermission() {
  if (_testPlugin || isNative()) {
    return loadPlugin().then(function (p) {
      if (!p) return { ok: false, reason: 'unsupported' };
      return p.requestPermissions().then(function (r) { return r.display === 'granted' ? { ok: true } : { ok: false, reason: 'blocked' }; });
    }).catch(function () { return { ok: false, reason: 'unsupported' }; });
  }
  if (typeof window === 'undefined' || !('Notification' in window)) return Promise.resolve({ ok: false, reason: 'unsupported' });
  return Notification.requestPermission().then(function (perm) { return perm === 'granted' ? { ok: true } : { ok: false, reason: 'blocked' }; });
}

var _lastScheduled = 0;
var _lastBody = '';

/**
 * Inside the app: make sure the phone has the next reminder scheduled (or none, when reminders are off).
 * Safe to call as often as you like; it only talks to the phone when the time changes.
 * @param {{enabled: boolean, hour: number, goalMetToday: boolean, now?: number, body?: string}} s  (`body` is the study buddy's own words, when there is one)
 * @returns {Promise<void>}
 */
export function syncNativeReminder(s) {
  if (!_testPlugin && !isNative()) return Promise.resolve();
  var now = s.now || Date.now();
  return loadPlugin().then(function (p) {
    if (!p) return null;
    if (!s.enabled) {
      if (_lastScheduled === 0) return null;
      _lastScheduled = 0;
      return p.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
    }
    var at = nextReminderTime(now, s.hour, s.goalMetToday);
    var body = typeof s.body === 'string' && s.body.trim() ? s.body.trim().slice(0, 140) : REMINDER_BODY;
    if (at.getTime() === _lastScheduled && body === _lastBody) return null;
    return p.checkPermissions().then(function (perm) {
      if (perm.display !== 'granted') return null;
      return p.schedule({
        notifications: [{
          id: NOTIFICATION_ID, title: REMINDER_TITLE, body: body,
          schedule: { at: at, allowWhileIdle: true }, isExactNotification: false
        }]
      }).then(function () { _lastScheduled = at.getTime(); _lastBody = body; });
    });
  }).catch(function () { /* a reminder that cannot be scheduled must never break the app */ });
}

var STREAK_NOTIFICATION_ID = 4102;
export var STREAK_RISK_HOUR = 21;
var _lastStreakAt = 0;
var _lastStreakBody = '';

/** The words of the streak-at-risk nudge. */
export function streakRiskBody(streak) {
  return 'Your ' + streak + '-day streak ends tonight. A few words keep it alive! 🔥';
}

/**
 * The evening "your streak is about to end" nudge: a second, later notification on top of the daily reminder. It is
 * only for a player who has a streak to lose. Tonight at 21:00 while that is still ahead and they have not practised
 * today, otherwise tomorrow at 21:00 (opening the app after practising moves it on, so it never fires for someone who
 * has already played). No streak, or reminders off: nothing is scheduled and any pending nudge is cancelled.
 * @param {number} now ms
 * @param {number} streak
 * @param {boolean} playedToday
 * @returns {Date|null}
 */
export function nextStreakRiskTime(now, streak, playedToday) {
  if (!(streak > 0)) return null;
  var d = new Date(now);
  var at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), STREAK_RISK_HOUR, 0, 0, 0);
  if (playedToday || at.getTime() <= now) at = new Date(at.getFullYear(), at.getMonth(), at.getDate() + 1, STREAK_RISK_HOUR, 0, 0, 0);
  return at;
}

/**
 * Inside the app: keep the streak-at-risk nudge scheduled (or cancelled). Same rules as syncNativeReminder: safe to call
 * often, only talks to the phone when something changes, and never throws.
 * @param {{enabled: boolean, streak: number, playedToday: boolean, now?: number}} s
 * @returns {Promise<void>}
 */
export function syncStreakRiskReminder(s) {
  if (!_testPlugin && !isNative()) return Promise.resolve();
  var now = s.now || Date.now();
  return loadPlugin().then(function (p) {
    if (!p) return null;
    var at = s.enabled ? nextStreakRiskTime(now, s.streak, s.playedToday) : null;
    if (!at) {
      if (_lastStreakAt === 0) return null;
      _lastStreakAt = 0;
      return p.cancel({ notifications: [{ id: STREAK_NOTIFICATION_ID }] });
    }
    var body = streakRiskBody(s.streak);
    if (at.getTime() === _lastStreakAt && body === _lastStreakBody) return null;
    return p.checkPermissions().then(function (perm) {
      if (perm.display !== 'granted') return null;
      return p.schedule({
        notifications: [{
          id: STREAK_NOTIFICATION_ID, title: REMINDER_TITLE, body: body,
          schedule: { at: at, allowWhileIdle: true }, isExactNotification: false
        }]
      }).then(function () { _lastStreakAt = at.getTime(); _lastStreakBody = body; });
    });
  }).catch(function () { /* never break the app over a notification */ });
}

/** For tests. */
export function setReminderPluginForTest(plugin) { _testPlugin = plugin; _plugin = null; _lastScheduled = 0; _lastBody = ''; _lastStreakAt = 0; _lastStreakBody = ''; }
