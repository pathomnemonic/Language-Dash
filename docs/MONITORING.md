# Monitoring: Sentry and PostHog

Both are third-party services, in production builds only, and neither starts until the player agrees (`js/monitoring.js`).

| | Sentry (errors) | PostHog (pageviews and errors) |
|---|---|---|
| Starts when | Settings, "Help fix problems" is on (off by default) | the player said yes to anonymous usage statistics |
| Sends | uncaught errors with a technical trace; no IP, no account, no scores or words | page views and errors; no autocapture, no recording, no surveys, no person profiles, no cookies (localStorage only) |
| Tag | `app: language-dash` (scope tag) | `app: language-dash` (registered, sent with every event) |
| Project | the shared Sentry project, DSN in `js/monitoring.js` | the shared "PathoMnemonic Apps" project, key in `js/monitoring.js` |

- **Production only.** `enabled()` is true only in a production build that is not a test run and not a clip-capture build. A test build (vitest) never loads either SDK; `tests/unit/monitoring.test.js` checks that.
- **Not in the main bundle.** Each SDK is its own chunk (`@sentry/browser`, `posthog-js/dist/module.no-external`), downloaded only after consent. Turning the choice off stops it (Sentry closes, PostHog opts out).
- **PostHog region.** Events go to `https://us.i.posthog.com` unless the build sets `VITE_POSTHOG_HOST` (use the EU host if the project is in the EU cloud).
- **CSP.** `tools/csp.mjs` allows the Sentry ingest host and the PostHog host in `connect-src`.
- **Privacy.** `public/privacy.html` names both services and says they only run after consent. Anything that makes either start without consent needs the privacy page, the store data safety forms and the Terms updated first.
