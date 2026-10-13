# Live site check

Date: 2026-10-13. Target: the Pages preview build of `https://pathomnemonic.github.io/Language-Dash/`, reproduced locally with the same recipe as `/tmp/deploy.sh` (`VITE_BASE_PATH=/Language-Dash/ npx vite build`, served at `/Language-Dash/` by `python3 -m http.server`). The public URL itself was not fetched (no direct browser access from this sandbox), so GitHub Pages response headers are not covered here. Tool: Playwright 1.52, Chromium 1194 (headless, SwiftShader, `--ignore-gpu-blocklist --enable-unsafe-swiftshader`), `bypassCSP: true`, graphics quality set to `high` in the save so 3D models load, axe-core 4.14. Build has no Supabase, so this is the "no backend" experience. Viewports 390x780 and 320x568 (touch, mobile), 390x844 for the landing screenshots.

## Results

| Check | Result |
|---|---|
| First-run flow | Welcome dialog (I speak / I want to learn), "Pick both languages" button disabled until both chosen, same language cannot be chosen twice; then "Your level" overlay (4+ levels with real sample words, placement test link); then Home. Works. |
| Language pairs | en-es, en-ja, es-ar chosen through Home > Languages ("Switch languages"); pair and level overlay each time; flag summary updates (`🇬🇧→🇯🇵`, `🇪🇸→🇸🇦`). |
| Run en-es | Hint "move", gates `mover / traer / hacer`, `lang="es" dir="ltr"`. Pause, End Run, run report all work. |
| Run en-ja + romanization | Gates show kana/kanji with a romaji line (`女の子 onnanoko`, `人々 hitobito`), `lang="ja"`. The toggle (`#langRomanToggle`, "Show pronunciation") is on by default and persists in `langdash.roman.v1`. |
| Run es-ar + RTL | Hint "hogar", gates `كلمة kalima / حديقة hadiqa / منزل manzil` with `dir="rtl"`, `lang="ar"`, romanization under each word. Text renders correctly, no clipping; the lane labels (LEFT/CENTER/RIGHT) stay LTR as intended. |
| Settings | Home > gear: Languages, Sound, Look & performance, Keyboard, Study, Your rules, Backup & data render, no overflow. |
| Locker / Maps / Quests / Stats / Profile tabs | All render at both widths. Locker tabs: Heroes, Wardrobe, Trails, Maps, Monsters; Maps lists 4 rooms owned plus unlockable maps with real names (Tokyo Night Market, Kyoto Tea Garden, Bavarian Farmyard, ...). No Dx Dash or medical wording anywhere in visible text. With no backend there is no Friends tab and no Pro purchase UI, as designed. |
| Versus | Opens a Host/Join dialog and works without a backend (see security audit G for the missing privacy line). |
| Horizontal scroll | 0 px on every screen and every sheet, at 320 and 390 wide. |
| Console | 0 errors, 0 page errors. Warnings: SwiftShader's "GPU stall due to ReadPixels" (environment only) and `[Storage] Repaired 1 damaged field(s)` twice per load on a fresh profile (see Left). |
| Failed requests / HTTP >= 400 | 0 in normal play with all three pairs and the Maps tab (195 requests). |
| Assets under the base path | All 146 files in `offline-manifest.json` (9 MB of assets, models, portraits) return 200 at `/Language-Dash/...`; `/`, `privacy.html`, `terms.html`, `delete-account.html`, `landing/`, `sw.js`, `manifest.webmanifest`, `remote-config.json`, `icon.svg`, `og.png` all 200. Built HTML references `/Language-Dash/assets/...` correctly. One `404` appeared once in the console while browsing the legal pages with the network switched; no failing URL was recorded by the response/requestfailed hooks, so it is most likely the browser's automatic `/favicon.ico` request on `privacy.html`/`terms.html`/`delete-account.html` (they have no `<link rel="icon">`). Added to Left as Low. |
| Service worker + offline | Registered at scope `/Language-Dash/`, activated; caches `language-dash-assets` and `language-dash-<build>`. Offline reload after a prior visit: page, title and the 3D scene load (3.6 s with software GL); `privacy.html`, `terms.html`, `delete-account.html` returned 200 `fromServiceWorker`. |
| Manifest | `start_url "./"`, `scope "./"`, name Language Dash, theme `#F6EEDC`; only one icon (`icon.svg`, `any maskable`). |

## Accessibility (axe-core, wcag2a + wcag2aa + best-practice)

Before the fixes below, on every palette (paper, night, sunset, harbour, matcha, postcard: the default "Surprise me" rotates through them) and on Home, Stats, Locker, Quests, Profile:

| Page | Violations |
|---|---|
| Home (all palettes, every sheet/dialog opened from it) | `landmark-banner-is-top-level` (moderate): the logo `<header>` sat inside a region |
| Stats (all palettes) | `aria-progressbar-name` (serious, 4 nodes): the mastery bars had no label |
| privacy / terms / delete-account, light scheme | `color-contrast` (serious): `.meta` "Last updated" line `#8b94b5` on light |
| landing | `landmark-one-main`, `region` (6 nodes), `color-contrast` on the gold "Pro" note |

Color contrast on Paper and Night Train and the four other palettes: **0 violations** across all five tabs (axe found none, in light and dark). Labels and focus: every control on Home has an accessible name; first-run language chips use `aria-pressed`; dialogs have `role="dialog"` and `aria-modal`; gates are `role="group"` with a label. Keyboard Escape closes the sheets. Not tested with a screen reader.

**Fixed in this repo** (re-scanned on a rebuilt copy: Home, Stats, Locker, Quests, Profile on paper and night = clean; the three legal pages = clean in both schemes; landing re-scanned for banner/main/region after the edit):

- `index.html`: home `<header class="home-header">` changed to a `<div>` (no CSS depended on the tag).
- `js/levelui.js:201`: mastery bars get `aria-label="Words 1-100 mastered"` etc.
- `public/{privacy,terms,delete-account}.html`: `.meta` color `#4f587a` in the light scheme.
- `public/landing/index.html`: logo in a `<header>`, content in `<main>`, `.hot .note` darkened.

## Defects found

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | **Medium** | The landing page (`public/landing/*.png`) showed **Dx Dash**: hospital hallway, a nurse runner, "FEVER - TACHYCARDIA ... Sepsis" cards, "DX DASH" logo, "TO EXAM", Friends tab. Wrong brand and medical content on the page linked from the stores. | **Fixed**: four screenshots regenerated from this build (390x844 @1.5x, English to Spanish, Paper theme, real run). |
| 2 | Low | Post-run screen with 0 answers shows "0 Missed - PERFECT!" under a run report that says "Not a word caught." | **Fixed** (`js/uipostrun.js:131`): "Perfect!" only when at least one word was answered. |
| 3 | Low | Custom-card JSON import with a `null` entry threw and aborted (`js/customcards.js:392`). | **Fixed**: bad entries are rejected, the rest import. |
| 4 | Low | Axe issues listed above (banner, progress bar names, `.meta` contrast, landing landmarks/contrast). | **Fixed.** |
| 5 | Low | `[Storage] Repaired 1 damaged field(s)` console warning on every load of a fresh profile and of a good save. A default-template field and the stored shape disagree; harmless self-repair but noisy and it hides real corruption in the logs. Could not isolate the field in this pass (jsdom does not reproduce it; the saved JSON passes `checkDataSanity`). | Left |
| 6 | Low | Legal pages had no `<link rel="icon">`, so browsers request `/favicon.ico` (404 on Pages). | **Fixed** (`<link rel="icon" href="icon.svg">` added to the three pages) |
| 7 | Low | Manifest has only an SVG icon. Chrome's install prompt on Android generally wants 192 and 512 px PNGs; add `icon-192.png`, `icon-512.png` (a maskable one too) for the PWA. | Left |
| 8 | Low | At 320x568 the home logo is squeezed to a small stamp (media rule at `css/arcade.css:818-821`); legible enough but the name "Language Dash" is not readable on the smallest phones. The page still has no overflow. | Left |
| 9 | Info | The brand line says 1,000 words everywhere, but Stats shows a mastery box up to **6,800** words (`js/levelui.js:190`); see `docs/STORE-POLICY-CHECK.md` item 2. | Decision |
| 10 | Info | First-run discovery dots (red dots on every tab and tile) are on by default; they appear on the Home, Stats and Locker tabs of every screenshot. `ld_lessons_off=1` turns them off. Whether that much is wanted on a first visit is a product call. | Decision |

## Performance notes (software GL, no throttling)

- First paint is quick; the first run with `high` graphics loads the fox model, map and hush models (about 195 requests in total during a session that visits three language pairs and the Maps tab). Word data is split per language (`words-xx` chunks), so a pair downloads only its two languages.
- The main app chunk is 1.56 MB (497 KB gzip) and `three` is 649 KB (169 KB gzip). `vite build` warns but `chunkSizeWarningLimit` is raised to 3000 on purpose. Splitting Settings/Friends/Pro screens with `import()` would help slow phones.
- GitHub Pages sets `Cache-Control: max-age=600` and ignores `public/_headers`; the service worker covers repeat visits.

## Left (with severity) and decisions needed

Left: items 5, 7, 8 above (all Low). Decisions: word-count claim (item 9), discovery dots (item 10), hosting for security headers (`docs/SECURITY-AUDIT.md` C), and the Versus privacy line.

Re-run after the next deploy: the same scan on `https://pathomnemonic.github.io/Language-Dash/` (also check the response headers with `curl -I`, which this local run could not), and a real-device pass for the iOS/Android shells.
