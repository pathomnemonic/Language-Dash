# App Store Connect: listing (copy and paste)

App Store Connect → your app → **iOS App → (version) → App Information / Version page**.

## Name (max 30)
```
Language Dash: Word Runner
```
## Subtitle (max 30)
```
Learn words at a sprint
```
## Promotional text (max 170, can be changed any time without a new version)
```
Pick a lane, dodge the obstacles and run through the right word. 1,000 common words in 15 languages, live head-to-head and smart reviews.
```
## Keywords (max 100, comma-separated, no spaces after commas)
```
language,vocabulary,words,learn,flashcards,spanish,french,japanese,german,spaced repetition,quiz,polyglot
```
(Do not add "Anki" or other brand names to the keywords: Apple rejects trademarks you do not own. The description may mention Anki factually.)

## Description (max 4000)
Use the same text as `store/google-play/listing.md` → Full description, but replace the bullet characters if you like. (Plain text only.)

## What's new in this version
```
First release of Language Dash: run through the right word and learn 1,000 common words.
```
## URLs
- Support URL: `https://pathomnemonic.github.io/Language-Dash/` (contact email `patho.mnemonic1@gmail.com`)
- Marketing URL: `https://pathomnemonic.github.io/Language-Dash/`
- Privacy Policy URL: `https://pathomnemonic.github.io/Language-Dash/privacy.html`

## Category
Primary: **Education**. Secondary: **Games → Trivia** (Education is the better fit).

## Copyright
`2026 <your name>`

## Screenshots
Upload the 6.9-inch set (required) from `assets/store/appstore/` (1290 × 2796). If App Store Connect also asks for 6.5-inch, use `assets/store/appstore-6.5/` (1284 × 2778). The app runs on iPad too, so also upload the iPad set: 13-inch from `assets/store/ipad-13/` (2064 × 2752); if App Store Connect asks for the 12.9-inch slot, use `assets/store/ipad-12.9/` (2048 × 2732).

## App icon
`assets/store/appstore-icon-1024.png` (1024 × 1024, no transparency). The build also embeds its own icons from `assets/`.

## Age rating (answer the questionnaire)
- Cartoon or fantasy violence: **None** (or "Infrequent/Mild" if you want to be safe). Medical or wellness topics: **None**. Messaging and chat: **No**. Advertising: **No**. User-generated content: **Yes** (display names only).
- Realistic violence, sexual content, profanity, horror, drugs, alcohol, gambling, contests: **None**.
- Unrestricted web access: **No**. User-generated content: **Yes, display names and friend requests only** (reporting and blocking exist).
Expected: **4+** (or 9+ if you chose the mild options).

## App Privacy ("nutrition label")
Data collected, **not used for tracking**:
| Data | Linked to user | Purpose |
|---|---|---|
| Contact info → Email address (only if an account is made, including with Apple, Google or Microsoft sign-in) | Yes | App functionality |
| Identifiers → User ID | Yes | App functionality |
| User content → Other user content (display name, shared run summaries, kudos) | Yes | App functionality |
| Usage data → Product interaction (scores, progress) | Yes | App functionality |
| Diagnostics → Crash data, Performance data (only if the player switches it on) | **No** | App functionality (bug fixing) |
| Purchases → Purchase history: **collected, not linked** (the store handles payment; the app learns only which products you own, plus anonymous paywall and purchase events if you opted in to statistics) | **No** | App functionality, Analytics |
| Usage data → Product interaction (anonymous usage statistics: modes, questions, screens; asked on first launch, can be switched off) | **No** (a random install ID, never the account) | Analytics |
| Identifiers → Device ID (the random install ID the app makes for itself; not the advertising identifier) | **No** | Analytics |
| Diagnostics → Performance data, Other diagnostic data (frame rate, load times, errors; same switch) | **No** | Analytics |
Tracking: **No**. Third-party advertising: **No**.

## App Review information
- Sign-in required: **No**. (Accounts are optional; reviewers can play without one. The app offers Sign in with Apple, Google and Microsoft; deleting an account revokes the Apple login.)
- Notes for the reviewer:
```
Language Dash is a language-learning game: a word in your language flashes, you run through the gate showing the same word in the language you are learning. No account is needed: tap PLAY on the Home screen. A short interactive tutorial runs the first time (the x in the corner closes it).
In-app purchases (all optional; the app is fully playable free with the 300 most common words of every language pair):
- Auto-renewable subscription group "Language Dash Pro": languagedash_pro_yearly, languagedash_pro_monthly, languagedash_pro_pass3m (auto-renewing, 3-month period). No store trial: every signed-in account gets a free 7-day Pro trial from our own server, with no payment details.
- Non-consumable: languagedash_pro_lifetime (all Pro features).
- Consumable tip jar (Settings > About & help > Leave a tip): languagedash_tip_small, languagedash_tip_medium, languagedash_tip_large. Tips unlock nothing.
- Non-consumable cosmetic Locker items (hero, map, trail and monster skins; Locker tab, the 💎 buttons): languagedash_item_hero_beep, languagedash_item_hero_zebra, languagedash_item_hero_horse, languagedash_item_hero_pirate, languagedash_item_hero_kimono, languagedash_item_hush_murmur, languagedash_item_map_aquarium_imaging_center (in the app: "Aquarium of Tongues"), languagedash_item_map_dna_helix_tunnel (in the app: "Rosetta Hall"), languagedash_item_trail_lanterns, languagedash_item_trail_fireflies, languagedash_item_trail_sakura (the list is `PREMIUM_ITEMS` in supabase/functions/_shared/premium.js; they only appear once the build is made with VITE_FEATURE_LOCKER_ITEMS=1). They are cosmetic only.
To see the paywall: Stats tab > tap any locked "Pro" section, or Settings > About & help > Language Dash Pro > See Pro. "Restore purchases" is on the paywall and in that Settings row. Subscription terms, price and renewal are shown on the paywall, with links to the Privacy Policy and Terms.
Online features (Friends, feed, groups, Versus by room code) are optional and use an anonymous guest account created automatically, or an account made with Sign in with Apple, Google, Microsoft or email (Friends > Account). Account deletion: Friends > Account > Delete my account (it cancels any web subscription, revokes the Apple sign-in and removes the account).
User safety: players can report and block other players (the flag and block icons next to a name in Friends). There is no chat and no free text between users. Reports are reviewed by the developer and abusive accounts are removed.
The app is an educational aid and says so (Settings > About, and in the Terms): a practice game, not a language course or a fluency test.
```
- Contact: your name, phone and email (required by Apple; not public).
