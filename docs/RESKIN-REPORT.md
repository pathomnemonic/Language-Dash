# Paper Passport reskin: report

Implements docs/DESIGN.md for every 2D screen. Not a recolor: new composition, shapes, fonts, icons, palettes and assets.

## What changed

**CSS (rewritten, `css/arcade.css` and `css/style.css` are gone)**
- `css/tokens.css`: fonts (@font-face), the Paper and Night Train tokens, derived semantic tokens (`--bg-card`, `--text-secondary`, `--accent-*` keep working for inline styles in js/), reset, focus ring (ink ring + marigold halo), reduced motion.
- `css/base.css`: paper backdrop (grain, inline world-map line art, dotted route), drifting stamps/envelopes/passes, screens and titles, stamped-ticket buttons (press = 3px down-right, shadow drops), cards, chips, rocker toggles, ruled progress bars, forms, popups with a perforated top edge, toasts.
- `css/home.css`: Home as a passport page (rubber-stamp logo that fills the leftover room, boarding pass with route luggage-tag + filters + today/streak tear-off, slim Go Pro ticket, big notched PLAY ticket, ticket-stub mode buttons) and the paper tab bar (selected tab = raised red stamped tab).
- `css/run.css`: HUD luggage tags, flash-card hint, ticket-stub gates in lane colors (red, marigold, teal) with pronunciation in DM Sans italics, feedback tags, countdown stamp, pause/continue cards, Dash/Auto rubber-stamp buttons, tutorial, coach, tour, report/account popups.
- `css/screens.css`: Stats, Quests, Locker, Profile (passport page), Settings, word library, flashcards, results receipt, Friends/ranks, daily-reward punch card, Pro, language picker and welcome (passport cover).
- `css/extras.css`: per-script font stacks, RTL, tall scripts, dyslexia font, short-phone tightening (all one-page screens still fit at 320x568), 44px tap targets, wide screens.
- No blur, no glow, no glass, no gradient panels (the only gradients are ruler ticks on bars, perforation dots, the postage-stamp/airmail borders and the home-PLAY notches).

**Fonts**: added Fraunces 700/900, DM Sans 500/700 + 500 italic (latin and latin-ext woff2, OFL texts in `css/fonts/`). Removed Fredoka, Jersey 10 and Press Start 2P (files, licenses, CSS, credits line). OpenDyslexic kept and working. Fonts load from `'self'` so `tools/csp.mjs` and the offline manifest (vite copies them under `assets/`) needed no change.

**Palettes (`js/theme.js`)**: Paper (default), Night Train (dark), Sunset Bazaar, Harbour Blue, Matcha, Postcard Pink, plus "Surprise me" (rerolls after each run). Automatic = Paper by day, Night Train from 20:00 to 06:00 or when the phone asks for dark. Every palette derives its text-carrying colors (`--*-deep`, `--*-fill`, soft ink, lanes) by pushing lightness until contrast >= 4.5:1; tests check ink 7:1 on all surfaces, deep/fill/lane/gold 4.5:1.
- Because the default must now be Paper, I touched two files outside the listed ones, minimally: `js/storage.js` (default `uiTheme: 'auto'`; one-time migration `themePaperSeen` moves saves on an old skin look, including the old "surprise" default, to Automatic) and `js/main.js` (fallback `'auto'`, comments, theme-color fallback). Tests updated accordingly (`storage.test.js`, `regressions.test.js`). Legacy ids (classic, seasons, bold worlds) fall back to Automatic.
- `js/uisettings.js`: Colors description, "Right now" fallback, Night Shift text, credits line. The Night Shift toggle (`body.night-mode`) gives Night Train.

**Other JS**: `js/homefx.js` now drifts a few stamps, airmail envelopes and boarding passes (reduced motion: the same few, static). Inline colors replaced by CSS variables or paper values in ui.js (toasts, popups, confetti, rush frame is a hard border, power-up flash is a hard frame), errors.js, accountui.js, main.js, native.js (status bar), uibrowse/leaderboardui/discoveryui/feedui/exam/uipostrun/ankiimport/proui/feedback/uisettings (field styles), and `js/sharecard.js` (the share image is now a paper receipt with a red score stamp). `js/colorwheel.js` needed no logic change (its styling is in screens.css).

**Markup (`index.html`)**: icon sprite (flat outlined ink icons for tab bar, top bar, mode stubs, HUD, coin with compass star), SVG filter for the rough stamp edge, world-map line art in `#bgDecor`, Home restructured (stamp header, `.pass` boarding pass holding `#langBtn`, `#filtersBtn`, streak chip and goal; PLAY ticket), pause buttons wrapped in `.pause-card`, new boot splash. Every id, data-attribute, ARIA hook and class used by JS/tests is kept.

**Brand and assets**: `public/icon.svg`, `assets/icon-only.png`, `icon-foreground.png`, `icon-background.png`, `splash.png`, `splash-dark.png` (Night Train), `public/og.png`, `assets/store/feature-graphic.png` regenerated from `tools/brand.mjs` (rubber stamp on a paper disc on a teal square; letters are outlines from the real fonts in `tools/brand-glyphs.json`). Run `node tools/make-app-assets.mjs` to rebuild (sharp, no fonts needed). `public/manifest.webmanifest` colors, `public/landing/index.html` (new styling, new font files) updated; `tools/make-screenshots.mjs` captions restyled.

## Screenshots (`docs/screens/`, 420x860 unless noted)
home-paper, home-night, run-paper, run-night, stats-paper, locker-paper, quests-paper, profile-night, settings-paper, sheet-paper (Challenge popup), results-paper, flashcards-paper, home-desktop-paper (1280x800), run-desktop-night (1280x800).

## Checks
- `npx vitest run`: 1756 pass; 1 fails and is not from this work: `storagekeys.test.js` says the `glowEffects` setting is no longer read anywhere in js/ (the 3D agent removed its use in js/game/). Either drop the setting or read it again.
- `npm run lint` and `npm run typecheck` pass, `vite build --outDir /tmp/dist-skin` builds.
- Playwright against my own preview (port 4180): `fit.spec.js` at 320x568 and 360x640, 14 of 14 pass (Home fit, one-page screens, popups, 115%/130% text, folded sections, tab switching). The rest of fit/devices/home/layout/a11y were not run to completion (very slow while another run is active).

## Unfinished or worth a look
- Marketing ad generator `tools/make-ads.mjs` only had its fonts swapped (still the old dark arcade art).
- The Locker 3D preview and all in-run 3D art belong to the other agent.
- Emoji still appear inside JS-generated content (shop items, settings rows, badges); only static markup got the outlined icons.
- Not every screen was screenshot-reviewed in both palettes (Cohorts, Exam, My cards, card editor, Import/Export, Pro popups, daily reward, tutorial practice track were only checked structurally; they use the shared card/field/button styles).
- Selector coverage was done by reading the old CSS, not by an automated diff.
