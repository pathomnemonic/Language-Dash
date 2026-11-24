// Sentry and PostHog (js/monitoring.js): production only, only after the player agreed, and every event tagged with the app.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import { buildCsp } from '../../tools/csp.mjs';
import { syncMonitoring, enabled, sentryOptions, posthogOptions, monitoringHosts, resetMonitoringForTest, monitoringState, APP_TAG, SENTRY_DSN, POSTHOG_KEY } from '../../js/monitoring.js';

function fakes() {
  const sentry = { init: vi.fn(), setTag: vi.fn(), close: vi.fn() };
  const posthog = { init: vi.fn(), register: vi.fn(), opt_out_capturing: vi.fn() };
  return { sentry, posthog, loadSentry: vi.fn(async () => sentry), loadPosthog: vi.fn(async () => posthog) };
}

beforeEach(() => resetMonitoringForTest());

describe('production only', () => {
  it('is off in a test build, so nothing is ever loaded or started', async () => {
    expect(enabled()).toBe(false);          // vitest is MODE=test and not a production build
    const f = fakes();
    await syncMonitoring({ ...f, diagnosticsOn: () => true, analyticsGranted: () => true });   // (no enabled() override: the real switch says no)
    expect(f.loadSentry).not.toHaveBeenCalled();
    expect(f.loadPosthog).not.toHaveBeenCalled();
    expect(monitoringState()).toEqual({ sentry: false, posthog: false });
  });
  it('the switch also refuses a capture build', () => {
    const src = fs.readFileSync('js/monitoring.js', 'utf8');
    expect(src).toMatch(/env\.PROD === true && env\.MODE !== 'test' && env\.VITE_FEATURE_CAPTURE !== '1'/);
  });
});

describe('only after the player agreed', () => {
  it('starts nothing without consent', async () => {
    const f = fakes();
    await syncMonitoring({ ...f, enabled: () => true, diagnosticsOn: () => false, analyticsGranted: () => false });
    expect(f.loadSentry).not.toHaveBeenCalled();
    expect(f.loadPosthog).not.toHaveBeenCalled();
  });
  it('Sentry follows "Help fix problems" and PostHog follows the usage statistics choice, independently', async () => {
    const f = fakes();
    await syncMonitoring({ ...f, enabled: () => true, diagnosticsOn: () => true, analyticsGranted: () => false });
    expect(f.sentry.init).toHaveBeenCalledTimes(1);
    expect(f.posthog.init).not.toHaveBeenCalled();
    await syncMonitoring({ ...f, enabled: () => true, diagnosticsOn: () => true, analyticsGranted: () => true });
    expect(f.posthog.init).toHaveBeenCalledTimes(1);
    expect(f.sentry.init).toHaveBeenCalledTimes(1);   // not started twice
  });
  it('stops again when the player turns it off', async () => {
    const f = fakes();
    await syncMonitoring({ ...f, enabled: () => true, diagnosticsOn: () => true, analyticsGranted: () => true });
    await syncMonitoring({ ...f, enabled: () => true, diagnosticsOn: () => false, analyticsGranted: () => false });
    expect(f.sentry.close).toHaveBeenCalled();
    expect(f.posthog.opt_out_capturing).toHaveBeenCalled();
    expect(monitoringState()).toEqual({ sentry: false, posthog: false });
  });
  it('an SDK that fails to load never breaks the game', async () => {
    const f = fakes();
    f.loadSentry.mockRejectedValue(new Error('offline'));
    await expect(syncMonitoring({ ...f, enabled: () => true, diagnosticsOn: () => true, analyticsGranted: () => false })).resolves.toBeUndefined();
  });
});

describe('every event is tagged, and it stays light', () => {
  it('Sentry carries the app tag and the DSN, with no personal data and no performance traces', async () => {
    const o = sentryOptions();
    expect(o.dsn).toBe(SENTRY_DSN);
    expect(o.initialScope.tags.app).toBe('language-dash');
    expect(o.sendDefaultPii).toBe(false);
    expect(o.tracesSampleRate).toBe(0);
    const f = fakes();
    await syncMonitoring({ ...f, enabled: () => true, diagnosticsOn: () => true, analyticsGranted: () => false });
    expect(f.sentry.setTag).toHaveBeenCalledWith('app', 'language-dash');
  });
  it('PostHog registers app = language-dash as a property on every event, with the project key', async () => {
    const f = fakes();
    await syncMonitoring({ ...f, enabled: () => true, diagnosticsOn: () => false, analyticsGranted: () => true });
    expect(f.posthog.init.mock.calls[0][0]).toBe(POSTHOG_KEY);
    expect(f.posthog.register).toHaveBeenCalledWith({ app: APP_TAG });
    expect(APP_TAG).toBe('language-dash');
  });
  it('PostHog is pageviews and errors only: no autocapture, no recording, no surveys, no person profiles, no cookies', () => {
    const o = posthogOptions();
    expect(o).toMatchObject({ autocapture: false, capture_pageview: true, capture_exceptions: true, disable_session_recording: true, disable_surveys: true, person_profiles: 'identified_only', persistence: 'localStorage', ip: false });
  });
});

describe('the SDKs are not in the main bundle, and the page may reach their hosts', () => {
  it('main.js reaches them only through monitoring.js, and monitoring.js loads each with a dynamic import', () => {
    const main = fs.readFileSync('js/main.js', 'utf8');
    expect(main).not.toMatch(/from '@sentry|from 'posthog/);
    const mon = fs.readFileSync('js/monitoring.js', 'utf8');
    expect(mon).toMatch(/import\('@sentry\/browser'\)/);
    expect(mon).toMatch(/import\('posthog-js\/dist\/module\.no-external'\)/);
    expect(mon).not.toMatch(/^import /m);
  });
  it('the policy allows the Sentry and PostHog hosts to be connected to', () => {
    const csp = buildCsp({});
    monitoringHosts().forEach((h) => expect(csp).toContain('https://' + h));
    expect(monitoringHosts().join(' ')).toMatch(/ingest\.us\.sentry\.io/);
    expect(monitoringHosts().join(' ')).toMatch(/posthog\.com/);
  });
});
