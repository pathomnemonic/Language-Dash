# Security and dependency audit

Date: 2026-10-13. Scope: npm dependencies, secrets (tree and git history), CSP, service worker, XSS paths, browser storage and imports, multiplayer with the backend off, Supabase edge functions, leftovers from Dx Dash. Complements `docs/SECURITY.md` (standing guarantees) and `docs/SILO.md`.

## Summary

- **Shipped code is clean: `npm audit --omit=dev` reports 0 vulnerabilities.** The remaining 14 advisories are build/test tooling only.
- Safe bumps applied (below). After them: `npx vitest run` 181 files / 1805 tests pass, `npm run lint` and `npm run typecheck` clean, `vite build` works.
- No exploitable XSS, secret leak or storage-poisoning path found. Two small robustness bugs and one hardening item were fixed; the rest are low-severity or owner decisions.

## A. Dependencies

### Upgraded (patch/minor, same majors)

| Package | From | To | Why |
|---|---|---|---|
| vite | 6.3.5 | 6.4.4 | Clears 7 advisories (dev-server file read, `server.fs` bypasses, `.map` path traversal). Dev server only. Build output unchanged. |
| @capacitor/core, cli, android | 8.5.2 | 8.5.3 | Patch; kept in lockstep |
| @capacitor/app | 8.1.1 | 8.1.2 | Patch |
| @capacitor/keyboard | 8.0.5 | 8.0.6 | Patch |
| @capacitor/status-bar | 8.0.3 | 8.0.4 | Patch |
| @supabase/supabase-js | 2.117.2 | 2.117.3 | Patch (kept pinned exact) |
| jszip | 3.10.1 | 3.10.2 | Patch (Anki importer) |
| axe-core | 4.13.0 | 4.14.0 | Dev-only a11y scanner |

Also pinned: the three edge functions imported `https://esm.sh/@supabase/supabase-js@2` (floating major, resolved at each cold start, so an upstream release would reach the payment code unreviewed). They now import `@2.117.3` (`supabase/functions/*/index.js`, `tests/unit/edgefunctions.test.js` updated). Redeploy the functions to pick this up. Run `npx cap sync` before the next native build (not done here: touches native projects).

### Not upgraded

| Package | Now | Latest | Why not |
|---|---|---|---|
| three | 0.160.0 | 0.186.1 | No semver; 26 releases of renderer/colour/loader changes. Needs its own task with screenshot checks (the whole look is 3D). No advisory applies (no untrusted models loaded). |
| sql.js | 1.8.0 | 1.14.2 | Ships WASM; Anki import needs a test with a real `.apkg`. Only opens decks the player picks. |
| peerjs | 1.5.4 | 1.5.5 | Needs a two-device multiplayer test. |
| capacitor-plugin-cdv-purchase | ^13.18.0 | in range | Handles money; update only with sandbox purchase + restore on both stores. |
| @playwright/test + playwright | 1.52.0 | 1.64.0 | Fixes GHSA (browser download without TLS check; only on `playwright install`). Changes bundled Chromium and CI cache; deliberate tooling bump. |
| vitest + @vitest/coverage-v8 | 3.2.1 | 5.0.4 | Two majors. 3.2.7 clears the `tinypool` advisory (test runner only) but needs a full re-run (4 min here). |
| eslint, @eslint/js, globals, jsdom, typescript | pinned | 10 / 10 / 17 / 29 / 7 | Majors, no security reason. |

### Remaining `npm audit` (14: 4 moderate, 6 high, 4 critical), all dev-only

Reached only through `@capacitor/assets` (sharp, tar, uuid via `@trapezedev/project`/`xcode`; used by `npm run app:assets` on a developer machine with our own icons), `tinypool` (vitest) and `playwright` (installer). None runs in the browser or on the server. `npm audit fix --force` would downgrade or break things; wait for a fixed `@capacitor/assets`.

## B. Secrets

- Tree scan (Stripe live/test keys, `service_role`, PEM blocks, AWS, GitHub, Google API keys, JWT-shaped strings): the only hits are the preflight scanner's own regexes, test fixtures (`sk_test_x`, `sk_live_abcdefghijklmnop` in `tests/unit/preflight.test.js`) and a usage comment in `tools/reconcile-stripe.mjs:6`.
- Git history (48 commits, all branches): same patterns on every added line, same hits only. No keystore, `.env`, `.p8`, `.pem`, `google-services.json` or service-account file was ever committed.
- `js/leaderboard.js:41-42` holds placeholders (`YOUR_SUPABASE_URL`); real values come from `VITE_*` build variables. The anon key is public by design.
- **Low, fixed:** `.gitignore` only covered `.env` and `.env.local`. Added `.env.*`, `*.pem`, `*.p8`, `*.p12` (Apple Sign-In and signing keys).

## C. Content-Security-Policy (`tools/csp.mjs`, injected by `vite.config.js`)

Built policy: `default-src 'self'`; `script-src 'self' 'wasm-unsafe-eval'` plus one sha256 for the inline boot script; `style-src 'self' 'unsafe-inline'`; `img/media/font-src 'self' data: blob:`; `connect-src 'self' blob: data:` + Supabase host (only if `VITE_SUPABASE_URL` is set at build) + `0.peerjs.com`; `worker-src 'self' blob:`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`.

- **No `unsafe-eval`, no `unsafe-inline` for scripts.** `wasm-unsafe-eval` is needed for sql.js only.
- (Low) `connect-src` always allows `0.peerjs.com` even in a build with no backend. That is needed for Versus (room-code play works without Supabase), so keep it, but it is the one third-party host the preview contacts, and only after the player taps Host or Join.
- (Low) `style-src 'unsafe-inline'` is needed by inline styles (`js/errors.js:158`, `js/main.js` multiplayer panel); accepted.
- (Medium, owner) GitHub Pages ignores `public/_headers`: no `frame-ancestors`/`X-Frame-Options`, nosniff, Referrer-Policy, Permissions-Policy. A meta CSP cannot set `frame-ancestors`, so the page can be framed. Also `_headers` sets `Cross-Origin-Embedder-Policy: require-corp`; if the site ever moves to Netlify/Cloudflare, check that fonts, models and PeerJS still load under COEP before enabling it. Low practical risk because the preview has no accounts or payments.
- (Low) `privacy.html`, `terms.html`, `delete-account.html`, `landing/` carry no CSP meta. They are static; the landing page has one inline campaign-tag script.
- The live Pages build was previewed with CSP bypassed for the audit; `tests/e2e/csp.spec.js` is the place that proves the shipped policy blocks nothing needed. Re-run it (`npm run test:e2e`) after the next dependency bump.

## D. Service worker (`public/sw.js`, `js/swregister.js`)

- Registered as `sw.js` relative to the page, so scope is `/Language-Dash/` only (verified: scope `https://.../Language-Dash/`). It cannot see Dx Dash paths.
- Caches `language-dash-<build>` and `language-dash-assets`; `activate` deletes only caches starting `language-dash-` (so Dx Dash's `dx-*` caches are untouched). `caches.match(req)` searches all origin caches, but keys are full URLs, so there is no cross-game collision.
- Same-origin GET only; never caches non-OK responses; never touches Supabase/PeerJS (cross-origin return). Navigations are network-first (`no-cache`) with cache fallback; hashed assets cache-first, capped at 150 entries.
- (Low) Non-hashed same-origin files (`remote-config.json`, `models/*`, `offline-manifest.json`) are cache-first until the next deploy replaces the build cache, so a remote kill-switch change in `remote-config.json` can be stale for returning offline-capable users until the next deploy or until the file is fetched uncached by `js/remoteconfig.js`. Make `remote-config.json` network-first if the kill switch matters.
- Offline reload verified in the live check (works, privacy/terms/delete pages served from the SW).

## E. XSS review

`innerHTML` appears in 6 places and **none interpolates user-supplied, imported or shared text**:

| File:line | Content | Verdict |
|---|---|---|
| `js/main.js:1871`, `:1893`, `:1895` | Versus panel: constant strings; the room code is inserted with `textContent` (`:1897`) | Safe |
| `js/errors.js:170` | toast; title and message go through `escapeText` | Safe |
| `js/palui.js:66`, `js/uisettings.js:816` | SVG from `palart.js`, static drawings keyed by internal id | Safe |

Everything player-controlled uses `createElement({text})`/`textContent` (`js/dom.js:101` documents the rule): custom card front/back/hint (`js/ui.js:1752-1776`, `js/customcards.js`), Anki/CSV imports (`js/ankiimport.js`), language-pair names (taken from the fixed list in `js/lang/languages.js`; a pair in `langdash.pair.v1` is validated with `isLanguageCode`), challenge links (`js/challenge.js:76` validates version, ranges, card-id regex, 30-char name, and the name is shown as text), share image/QR text (`js/sharecard.js`), feed posts (`js/sharing.js`: structured numbers plus a 30-char name), Versus opponent names. No `eval`, `new Function`, `document.write`, `srcdoc`, inline `on*` attributes. The only `href` set from data is a Blob URL for downloads (`js/platform.js:121`). Query/hash parameters read: `debug`, `webgl`, `?pro=` return flags and the validated `#c=` challenge token.

## F. Browser storage and untrusted JSON

- Save: `Storage.load` (`js/storage.js:640`) parses defensively, `deepMerge` iterates the **defaults'** keys only (no `__proto__`/prototype pollution), `repairData` and `sanitizeCollections` (`js/sanity.js`) fix wrong types, NaN, negative counts, non-string ids; corrupt saves are kept aside (`_damaged`) rather than overwritten; newer schema versions are never overwritten.
- Backup import (`importBackup`, `js/storage.js:2416`): requires `app === 'language-dash'` (a Dx Dash backup is refused) and a numeric `schemaVersion`, then goes through the same load/repair path.
- Siloing holds: every key is `ld_*`, `langdash_*` or `langdash.*`; the Supabase session uses `storageKey: 'langdash-auth'` (`js/leaderboard.js:220`); a grep of all `localStorage` calls found no unprefixed key. `tests/unit/silo.test.js` guards this.
- **Fixed (Low): custom-card JSON import crashed on a `null` array entry** (`js/customcards.js:392`, `raw.id` on null threw an uncaught TypeError and aborted the import). A non-object entry is now rejected with `NOT_OBJECT` and the rest import. Self-inflicted only (the file is the player's own).
- (Low) Anki `.apkg` import caps the compressed file at 100 MB and 5000 cards (`js/ankiimport.js:32-34`) but does not cap the decompressed size of the zip entry (`:435`). A crafted zip bomb the player chose to open could exhaust memory in their own tab. Add a check on `dbFile._data.uncompressedSize` before `.async()`.
- (Low, info) On a fresh profile the console shows `[Storage] Repaired 1 damaged field(s)` twice per load (reproduced on every fresh run in the live check). It is a self-repair of one default field, harmless, but it means a template field and the default disagree; track it down with `checkDataSanity`.
- With the backend off, `js/analytics/*` still creates local ids (`ld_an_id`, `ld_an_first`, ...) but nothing is sent (no Supabase URL, no endpoint). Fine; the privacy policy describes the identifier.

## G. Multiplayer (PeerJS) with the backend off

- Versus is **not** gated by `FEATURES.backend`: it works with room codes alone. Tapping Host or Join loads `peerjs` and connects to the public `0.peerjs.com` broker; the opponent can see the player's IP (WebRTC) and display name. The privacy policy says so ("Multiplayer"). The panel itself shows no notice before connecting. **Low/Medium (privacy transparency):** add one line under the Host/Join buttons ("Connects directly to your friend. Your IP address is visible to them and to the free PeerJS server.").
- Room ids are `languagedash1-<5 chars>` (32^5 = 33.5 M codes, `js/multiplayer.js:45`, `:399`), distinct from Dx Dash. Codes are guessable by brute force only at the cost of one broker request each; a stranger who guesses a live code can join the lobby. Impact is limited to a game of word-running (no accounts, no data); a longer code or a host-approval step would close it.
- Inbound messages: `validateMultiplayerMessage` checks version, type allow-list, sender id, sequence, payload type, plus per-type state checks and card-pool hash. Opponent text is only ever shown via `textContent`.

## H. Supabase functions (`supabase/functions`)

Only relevant when a backend is configured; with no Supabase project none of this is reachable (the preview has none).

- `stripe-webhook`: signature verified first (constant-time compare, 300 s window); refunds use idempotency keys (`languagedash-duplicate-<pi>`).
- `pro-checkout`: price from server; identity from bearer token via `admin.auth.getUser`; anonymous/email-less users refused for money flows (`:~104`); item ids allow-listed (`isPremiumItem`); `plan` through `productFor`; item display name capped at 80 chars (`_shared/billing.js:195`); Apple token length 10-4000; delete-account cancels Stripe subscriptions and revokes Apple first. `Access-Control-Allow-Origin: *` is acceptable (bearer token, no cookies).
- `iap-verify`: platform/product allow-list, token length limits, store verified server-side, one purchase to one account.
- All three use `verify_jwt = false` on purpose (`supabase/config.toml`); each does its own check.
- (Low) **No rate limiting** in the functions. The unauthenticated `prices` action is cached 5 minutes, but `checkout`/`item`/`sync` create Stripe calls per request from any real account. Add a per-user throttle (a small table or Supabase's built-in function rate limits) before launch with real traffic.
- (Low) The catch-all returns `e.message` to the client with status 400 (`pro-checkout/index.js:264`), which can pass Stripe error text through. Return a generic message and log the detail.
- (Info) `iap-verify` decodes the Apple JWS without verifying the signature; safe only because the JWS is fetched from Apple over TLS. If it ever accepts a client-sent JWS, add x5c chain verification first.
- Database SQL (`database/*.sql`) was inherited unchanged from Dx Dash and not re-audited here; run `database/audit.sql` (must return no rows) on the new Language Dash project, as `docs/SECURITY.md` says. `database/schema.sql`, `policies.sql`, `pro.sql`, `analytics.sql`, `lockdown.sql`, `audit.sql` still mention "buzzword/dx" in comments or identifiers; harmless.

## I. Android

- `android:allowBackup="true"` (`android/app/src/main/AndroidManifest.xml:6`): Android auto-backup copies the WebView storage (save, Supabase session) to the user's Google account and can restore a stale save over a newer one. Low. Owner decision: `allowBackup="false"` or `dataExtractionRules`. The app has its own backup (`js/nativebackup.js`).
- Permissions: INTERNET, VIBRATE, POST_NOTIFICATIONS only. `allowMixedContent: false`. Custom URL scheme `com.pathomnemonic.languagedash://auth` for sign-in links only. `FileProvider` not exported.

## J. Inherited from Dx Dash and no longer sensible

| Item | Where | Severity | Action |
|---|---|---|---|
| Audio track names `'Dx Dash Menu'` | `js/audio.js:87`, `:790` | Info (internal) | Rename when convenient |
| Header comment `window.__BUZZWORD_CARDS`, "Owner: Agent 11" | `js/multiplayer.js:5`, `:29` | Info | Clean comment |
| Hospital identifiers (`hospitalhall.js`, `medical_waste_bin`, `ach_golden_doctor`, `avatar_intern`, `spilled_supplies`) | `js/game/*`, `js/uipostrun.js:91` | Info: internal ids only, visible text is already themed | Renaming would break saved ids; leave |
| AI conversion client (`convertWithBackend`, "Section 28.4 contract") posts the player's cards to a configurable URL with a bearer token | `js/ankiimport.js:602-650` | Low: dead code (no UI passes `backendUrl`; CSP would block an unknown host anyway) | Delete |
| `QR/buzzwords` DOM ids, `bw` card field | `index.html`, `js/uipostrun.js:296` | Info | Internal naming |
| Landing screenshots were Dx Dash (hospital, "DX DASH", "TO EXAM") | `public/landing/*.png` | **Medium (branding/store)** | **Fixed**: regenerated from this build |

## Needs the owner

1. Hosting: Pages cannot set security headers (C). Accept framing or move behind Cloudflare/Netlify.
2. `allowBackup` (I).
3. Rate limiting and generic errors in `pro-checkout` before real traffic (H).
4. Schedule the risky upgrades: three, sql.js, peerjs, playwright, vitest 3.2.7.
5. Redeploy the three edge functions and run `npx cap sync` after merging; run `database/audit.sql` on the new project.
6. Add the Versus privacy line (G) and decide whether to lengthen room codes.
