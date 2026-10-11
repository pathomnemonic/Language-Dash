# Store listing (drafts)

> **Publishing? Start with `docs/RELEASE_GUIDE.md`.** The ready-to-paste text and policy answers are in `store/google-play/` and `store/app-store/`. This page keeps the background and the rules about what the listing may claim.

Edit freely. Keep claims honest: the game is a practice aid and does not guarantee fluency or test results.

## Name and short description

**Title:** Language Dash: Word Runner (30 characters max on Google Play; "Language Dash" alone also works)

**Tagline:** Run through the right word.

**App Store subtitle (30 chars):** Learn words at a sprint

**Short description (80 chars):** Run through the right word. Learn 1,000 words in 15 languages by playing.

## Full description

Run the words. Learn a language by playing.

Language Dash flashes a word in the language you speak and rushes three gates at you, each showing a word in the language you are learning. Run through the gate that means the same thing. Dodge the obstacles, keep your streak alive, and pick up a few words every run.

WORDS THAT STICK
• The 1,000 most common words of 15 languages, in any pair: English, Spanish, French, German, Italian, Portuguese, Dutch, Swedish, Polish, Russian, Japanese, Korean, Mandarin, Arabic and Hindi
• Hear every word, with a pronunciation line for Japanese, Korean, Mandarin, Russian, Arabic and Hindi
• Smart reviews: each word comes back just before you would forget it, scheduled with FSRS, the same algorithm Anki uses
• Pick topics (food, travel, feelings and more) and a word level: the first 100, 300, 600 or all 1,000 words
• Flashcards, a timed Word Quiz, a weekly Gauntlet and a Daily 15 for when you want to slow down and test yourself
• Make your own word lists or import vocabulary decks

SIGN IN YOUR WAY
• Play as a guest, or sign in with Google, Apple, Microsoft or email to keep your progress on every device

PLAY WITH FRIENDS
• Challenge a friend live, head to head, with a room code. No account needed
• A friends feed with kudos: share your runs with friends or keep them private
• Private study groups with a shared weekly goal

KEEP GOING
• Daily goals, streaks and quests
• Earn coins and unlock Wordrunners, pals, trails and travel-themed maps from Tokyo to Verona
• The Hush, a creeping silence, gains on you when your streak slips

SOLO PLAY NEEDS NO INTERNET. No ads.

Language Dash is a practice game, not a language course or a fluency test. Words may contain errors; check anything important with a native speaker or a dictionary. Not affiliated with or endorsed by Anki.

## What the listing may claim (and what it may not yet)

Only list a feature once it has been checked end to end. As of the last check:

**Checked, safe to list** (the list above): live multiplayer (two real browsers connected, played a match and saw each other's scores), the word list size and topics (`npm run validate:deck`), the run, the run report after a run, flashcards and the Word Quiz (automated browser tests), daily goals and the study plan (unit tests), the Hush and characters (seen in play), solo play making no network requests other than to the app itself.

**Built and tested, but not yet checked against the live online service, so do not list yet:**
- Ranked matches, trophies and leagues: built and tested but hidden for now (not mentioned in the store listings). Versus works with a room code.
- Friends, the friend feed, study groups, weekly tournaments and cloud save (database rules and the screens are tested against a fake service; they need a live Supabase project to check). The global leaderboard is hidden in the app for now (`FEATURES.globalLeaderboard`), so do not list it.
- Cohorts and cohort wars (finished and hidden on purpose; see `docs/COHORTS.md`).
- Study-buddy and public-group discovery (finished and hidden on purpose; see `docs/DISCOVERY.md`).

Do not list map events (blackouts, tremors) until you have seen them in a real session on the device.

## Categories and rating

- Category: Education (Google Play) / Education (App Store); secondary: Games, Trivia.
- Content rating questionnaire: no violence beyond cartoon monsters chasing a character, no gambling, no user-to-user free-text chat (friend requests and display names only). Expect a low rating (for example Everyone / 4+ or 9+). Answer the questionnaires truthfully.

## Privacy answers

Match these to `public/privacy.html`.

**Google Play → Data safety**
- Data collected only if the player uses online features: *Email address* (optional account), *User IDs* (account identifier), *Name* (display name), *App activity* (scores, streaks, game progress, shared run summaries and kudos).
- *Crash logs* and *Diagnostics* only if the player switches on "Help fix problems" in Settings (off by default): anonymous, not linked to the user.
- Purpose: app functionality and account management. Not used for advertising or analytics. Not sold.
- Encrypted in transit: yes. Users can request deletion: yes (in-app **Delete my account**).
- Data shared with third parties: no (Supabase acts as a processor hosting the data).

**Apple → App Privacy ("nutrition label")**
- Data linked to the user (only with online features): Contact Info (email address), Identifiers (user ID), User Content (display name), Usage Data (scores, progress and the run summaries and kudos shared with friends).
- Data not linked to the user, only if the player switches it on: Diagnostics (crash and performance reports).
- Used for: App Functionality. Not used for tracking.
- Account deletion: available in the app.

## Assets you need to make

- App icon: generated (`assets/icon-only.png`, 1024x1024; Dx monogram with a pulse line).
- Google Play feature graphic: generated (`assets/store/feature-graphic.png`, 1024x500).
- Link-preview card: generated (`public/og.png`, 1200x630).
- Screenshots: generated by `node tools/make-screenshots.mjs` into `assets/store/screenshots/` (portrait, captioned). Replace them with real-device captures before launch if you prefer.
- Privacy Policy URL: `https://pathomnemonic.github.io/Language-Dash/privacy.html`
- Support URL / contact: `https://pathomnemonic.github.io/Language-Dash/` with the contact email `patho.mnemonic1@gmail.com`.
