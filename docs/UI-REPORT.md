# UI report (UI/copy pass)

## What changed (files I own)
- Vocabulary: "Dx Dash" is now "Language Dash" everywhere in my files, tests, landing page, manifest, boot splash (LANGUAGE DASH, "Run the lexicon."), meta/og/title, share text (`💊 Speed` line replaced by the pair flags and "Words right"), share image ("Run the lexicon.", "A new Wordrunner"), reminders ("Time for a few words. Keep the hearth lit!"), prompts, analytics consent, settings copy, disclaimer ("a practice game, not a language course or a fluency test"), index.html sheets/popups/aria labels/empty states. Cards became words, subjects became topics, exam became Word level / Word Quiz, "Case Review" became "Run Report", "Weakness" button became "Tricky words", "teaching point" became "word card", "why wrong" became what the gate means. Internal ids and storage keys are unchanged.
- Home Filters popup is "Word filters": topic chips plus a "Word level" picker (First 100/300/600/All 1,000, stored in `selectedExams`, chips use `data-level`). The advanced group (question type, year, high-yield) is gone: `#advancedFilterContainer` is `hidden`, `renderAdvancedFilters()` only clears it and resets any old saved values.
- Ranks (progress.js) and leagues (leagues.js, ids and thresholds kept): Tourist, Phrasebook Pal, Wordrunner, Linguist, Polyglot, Babel Master (+ Legend).
- Stats view: Topics, Trickiest words, goal date ("To goal"), by-question-type block removed, mastery note says it is a practice signal from this game's own word list, not a fluency test (readiness.js, exam.js band labels too: Strong / On track / Warming up / Just starting).
- Post-answer feedback shows the correct pair ("hint = word"), the pronunciation line (`card.ansRoman`, honoring `getShowRoman()`), and a 🔊 "hear it" button. Same in the run report cards, Quick Review, Phrasebook list, Word Quiz review.
- Flashcards: front = hint word (lang/dir set), back = word + pronunciation + 🔊. Hands-free says the hint in the known voice, then the word twice in the target voice.
- TTS: `tts.js` gained `ttsTag`, `pairVoices`, `speakCard` and multi-voice `speak` (segments). `readaloud.js` gained `setReadLangs`/`segmentsFor`; plans carry `segments` and drop English lane words when voices are set. `main.js` sets the voices per question, so the existing `audio.speakQuestion` (audio.js, not mine, still passes `lang: 'en-US'`) now speaks the hint in the known language and the gates in the target language through `segmentsFor(text)` in `speak`. No audio.js change needed.
- Settings: hub card "Languages 🇬🇧→🇪🇸 · Change ..." opens `#langSheet` via `renderLanguageSheet`.
- CSS (arcade.css, end of file): font stacks per `[lang]`, line-height for ja/zh/ko/ar/hi/ru in `#buzzText` and `#answerRow`, no uppercase for those scripts, wrapping, RTL isolation, roman line always LTR, `.hear-btn`.
- Landing page rewritten; icon.svg and boot splash logo redrawn (speech bubble with chevrons).
- Map names (coordinator request): `skinTitle()` used in postrun, share text, share image track name and Favorite map dropdown (value stays `skin.name`). `storage.js` favorite-map migration goes through `getSkinByName`. `SUBJECT_MASTERY_KEYS` now keys on the 15 topics in order (achievements test updated).
- Discovery: "exam" values are now "Learning <language>" (fits the server's 30-character column), labels reworded.
- Tests updated: unit (ranks, leagues, statsview, studyreport, newplayer, discovery*, maps, companions, sharing, growth, friendsui, extras, locker, todaysheet, mycards, ads landing check, features, achievements, prompt tests) and e2e text/selectors (speed -> languages, Word Quiz, filters).

## Still medical / unthemed in files I do not own
- js/pro.js:74 'Exam Sim' Pro feature title; js/proui.js and js/tourdata.js "10× more cards" copy (tests/unit/proui.test.js:179, tourdata.test.js:75 expect it).
- js/tour.js, js/tourdata.js: filter tour still walks question type / year / high-yield and the speed dial (tests/unit/tourdata.test.js and tour.test.js fail for that reason).
- js/feedback.js:34,59 "Dx Dash" (tests/unit/review.test.js:122 expects it); js/errors.js:31; js/dom.js:2; js/remoteconfig.js:47; js/audio.js:81,731 ('Dx Dash Menu' is a key).
- js/tutorial.js:37 still patches "diagnosis gate" (controlhints.js is mine and already says gate).
- js/analytics/catalog.js:136-137 descriptions mention the exam simulator.
- public/privacy.html, terms.html, delete-account.html: still "Dx Dash", medical board study game text (not on my list).
- js/audio.js:1604 still passes `lang: 'en-US'` (harmless: segments override it).
- js/homefx.js `mountFlyers` still flies medical odds and ends; js/cardreport.js / js/customcards.js error texts not reviewed.
- js/rules.js describeRules: "no exam monster", "speed +N every N questions"; tests/unit/rules.test.js and accessibilitymodes.test.js failures there belong to rules.js.
- js/game/exammonster.js identifiers, cardschema.js lint warning, tools/build-words.mjs lint error (`no-useless-escape`, line 47).

## Test status
`npx vite build` passes. `npx eslint .` reports only cardschema.js:137 (warning) and tools/build-words.mjs:47 (error), both not mine. `tsc --noEmit` errors only in js/multiplayer.js (not mine). Last full `vitest run`: 29 failing files before my final fixes, most not mine: cards/cardleaks/cardquality/cardcount/freelibrary/selection/langdeck (deck owners), importflow (ankiimport/importguide), tourdata/tour, rules/accessibilitymodes (rules.js), modeaudit, storebuilds (android scheme), backup, progression "flashcard sessions", features "challenge round-trip" (challenge.js token fields), ads "every concept" (marketing assets), proui. I fixed all failures that were text or selector expectations in my files; the rest need their owners. E2E (Playwright) specs were edited but not run here.
