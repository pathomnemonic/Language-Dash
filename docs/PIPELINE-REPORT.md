# Pipeline report (tutorial, card pipeline, rules, rebrand, tools)

## Done
- Tutorial: `js/tutorialrun.js` derives its practice words from the current deck (first 6 usable cards by rank from the card hub);
  `TUTORIAL_CARD_IDS` is a live array filled by `refreshTutorialCardIds()`, so `main.js` is unchanged. Tutorial and tour copy
  (`tutorial.js`, `tourdata.js`) is Language Dash: one hint word, three gates, swipe lanes, dash, jump/slide, the Hush, the
  Languages button and Word level. Steps for the speed dial, exam/subject/advanced filters were removed or point at ids that exist
  (`#langBtn`, `#langSheetBody`, `#examFilterToggle` is created by `ui.js`). `controlhints.js` no longer says "diagnosis gate".
- Pipeline: `gates.js`, `cardschema.js`, `cardleaks.js` work with the one-word card; no medical defaults remain; a one-word hint
  is never dropped; `answerKey`/`uniqueByAnswer` keep identical answers out of one deal. `importguide.js`/`ankiimport.js` target
  vocabulary decks (front = known word, back = target word) and the AI prompt asks for word pairs. `multiplayer.js` type errors fixed.
- `rules.js`: `describeRules` says "no Hush" and "pace +0.25 every 3 words"; defaults START_PACE 2, TOP_GEAR 8, +0.25 every 3 words
  (`paceAt` is covered by tests). No ramp setting exists in the UI.
- Rebrand: README rewritten, `architecture.md` (card schema, topics, speed note), docs, store listings (App Store/Google Play, within
  limits: name 26, subtitle 23, keywords under 100), legal pages, package.json, Capacitor/Android/iOS ids
  (`com.pathomnemonic.languagedash`, java dir renamed, `APP_SCHEME` in `js/native.js`), workflows, vite comment, feedback/errors/dom/remoteconfig strings,
  Pro copy, analytics catalog descriptions (docs regenerated), `secrets.js`/`sidemotion.js` (themed names and shapes, keys unchanged).
- Tools: medical-DB tools deleted, `tools/validate-deck.mjs` + `npm run validate:deck` (210 pairs), `sync-standalone.mjs` deleted, app-asset/screenshot generators reworded.
  `docs/CARD-QUALITY.md` rewritten for the word data.

## Results
`npm run lint`, `npm run typecheck`, `npx vite build` and `npm run validate:deck` pass; `npx vitest run`: 175 files, 1751 tests, all passing.

## Left over
- Storage keys (`buzzword_dash_v1`, `dxdash_ranked_cache`, `dxdash-save.json`), the service-worker cache prefix `dx-dash-`, the audio key `'Dx Dash Menu'`
  and the `dx-dash-result.png` share filename are internal and unchanged on purpose (changing them would reset saves) or belong to other owners.
- Skin names in `js/game/worlds.js` are still the old (medical) keys; the display names come from `docs/MAP-NAMES.md`.
- `public/models/medical/*.glb` assets are still in the repository (credited in the README) but unused by the new maps.
- Marketing generators (`make-ads.mjs`) still read from `docs/marketing/assets`, which no longer exists; run them only after regenerating screens.
- Some pairs of close languages fall below 1,000 cards because words are identical (es-pt 717, ja-zh 886): `validate-deck` reports them as notes.
- Playwright e2e specs were edited but not run here.
