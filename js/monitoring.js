/**
 * monitoring.js — error reporting (Sentry) and anonymous pageview and error counts (PostHog), production builds only.
 *
 * Both are third-party services, so neither starts until the player has agreed, using the two choices the game already has:
 *   - Sentry:  only when Settings → "Help fix problems" is on (it is off by default).
 *   - PostHog: only when the player said yes to anonymous usage statistics (the one-time question; analytics consent "granted").
 * Turning either off again stops it. Neither SDK is in the main bundle: each is a separate chunk that is only downloaded after consent.
 *
 * Production only: nothing here runs in a test build (vitest), in dev, or in a clip-capture build. `enabled()` is the single switch.
 *
 * Both projects are shared by the owner's apps, so every report and event carries the tag app = "language-dash".
 * Keep it light: PostHog gets pageviews and errors only (no autocapture of clicks, no session recording, no surveys, no person profiles).
 */

export var APP_TAG = 'language-dash';
export var SENTRY_DSN = 'https://60dc03d022902ccfc18561341aa98fcc@o4512486931169280.ingest.us.sentry.io/4512486942113792';
export var POSTHOG_KEY = 'phc_kWmx5oVY3FreyoD2myh2jTYZKyuDXYsLHBGkvCq3yyYY';
// The PostHog project's region is not stated with its key; US cloud is the default. Set VITE_POSTHOG_HOST at build time if the project is in the EU.
export var POSTHOG_DEFAULT_HOST = 'https://us.i.posthog.com';

/** The hosts the page must be allowed to connect to (used by tools/csp.mjs). */
export function monitoringHosts() {
  return [hostOf(SENTRY_DSN), hostOf(posthogHost())].filter(function (h, i, arr) { return h && arr.indexOf(h) === i; });
}

function hostOf(url) { try { return new URL(url).host; } catch (e) { return ''; } }

export function posthogHost() {
  /** @type {Record<string, any>} */
  var env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
  return String(env.VITE_POSTHOG_HOST || POSTHOG_DEFAULT_HOST);
}

/** The one switch: a production build, not a capture build. */
export function enabled() {
  /** @type {Record<string, any>} */
  var env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
  return env.PROD === true && env.MODE !== 'test' && env.VITE_FEATURE_CAPTURE !== '1';
}

var _sentry = null;     // the Sentry module once started
var _posthog = null;    // the posthog instance once started
var _loading = { sentry: false, posthog: false };

/** What Sentry is started with. Exported so the settings can be checked in a test. */
export function sentryOptions() {
  return {
    dsn: SENTRY_DSN,
    environment: 'production',
    sendDefaultPii: false,       // no IP address, cookies or user details
    tracesSampleRate: 0,         // errors only: no performance traces
    initialScope: { tags: { app: APP_TAG } }
  };
}

/** What PostHog is started with: pageviews and errors, nothing else. */
export function posthogOptions() {
  return {
    api_host: posthogHost(),
    autocapture: false,                       // no click or form capture
    capture_pageview: true,                   // the page load
    capture_pageleave: false,
    capture_exceptions: true,                 // errors
    disable_session_recording: true,
    disable_surveys: true,
    person_profiles: 'identified_only',       // nobody is identified, so no person profiles are created
    persistence: 'localStorage',              // no cookies
    ip: false,
    save_campaign_params: false,
    save_referrer: false
  };
}

/**
 * Bring the two services in line with the player's choices. Safe to call as often as you like.
 * deps (for tests): { enabled(), diagnosticsOn(), analyticsGranted(), loadSentry(), loadPosthog() }
 * @returns {Promise<void>}
 */
export function syncMonitoring(deps) {
  var d = deps || {};
  var on = d.enabled ? d.enabled() : enabled();
  if (!on) return Promise.resolve();
  var jobs = [];

  var wantSentry = !!(d.diagnosticsOn && d.diagnosticsOn());
  if (wantSentry && !_sentry && !_loading.sentry) {
    _loading.sentry = true;
    jobs.push((d.loadSentry || loadSentry)().then(function (S) {
      S.init(sentryOptions());
      S.setTag('app', APP_TAG);
      _sentry = S;
    }).catch(function () { /* the report service being unreachable must never affect the game */ }).then(function () { _loading.sentry = false; }));
  } else if (!wantSentry && _sentry) {
    var S = _sentry; _sentry = null;
    try { S.close(); } catch (e) { /* already closed */ }
  }

  var wantPosthog = !!(d.analyticsGranted && d.analyticsGranted());
  if (wantPosthog && !_posthog && !_loading.posthog) {
    _loading.posthog = true;
    jobs.push((d.loadPosthog || loadPosthog)().then(function (ph) {
      ph.init(POSTHOG_KEY, posthogOptions());
      ph.register({ app: APP_TAG });    // sent with every event
      _posthog = ph;
    }).catch(function () { /* ignore */ }).then(function () { _loading.posthog = false; }));
  } else if (!wantPosthog && _posthog) {
    var ph = _posthog; _posthog = null;
    try { ph.opt_out_capturing(); } catch (e) { /* ignore */ }
  }
  return Promise.all(jobs).then(function () { return undefined; });
}

function loadSentry() { return import('@sentry/browser'); }
function loadPosthog() { return import('posthog-js/dist/module.no-external').then(function (m) { return m.default || m.posthog; }); }

/** For tests. */
export function resetMonitoringForTest() { _sentry = null; _posthog = null; _loading = { sentry: false, posthog: false }; }
export function monitoringState() { return { sentry: !!_sentry, posthog: !!_posthog }; }
