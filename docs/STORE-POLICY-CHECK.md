# Store policy check (Google Play and Apple App Store)

Date: 2026-10-13. Written from the current policy structure as used in the Dx Dash check of 2026-10-11 (Apple App Review Guidelines, Google Play User Data, User Generated Content, Payments, Families, Target API pages); policy pages were not re-fetched for this document, so re-read the cited sections at submission time. Compared with `store/**`, `public/{privacy,terms,delete-account}.html`, `public/landing/`, `ios-config/PrivacyInfo.xcprivacy`, `capacitor.config.json`, `android/**`, `codemagic.yaml`, and the code paths for purchases, tips, codes, text-to-speech and accounts.

## Result at a glance

| Area | Status |
|---|---|
| App name and branding in legal pages, listings, manifest, Capacitor | **Pass.** Everything says Language Dash; no Dx Dash, no medical wording in `public/*.html`, `store/**`, `capacitor.config.json`, Android strings. |
| Landing page screenshots | **Gap, fixed.** `public/landing/{run,home,locker,stats}.png` were Dx Dash (hospital hallway, "DX DASH", "62d TO EXAM", sepsis/anaphylaxis cards). Regenerated from the Language Dash build. |
| Medical disclaimer | Not applicable (no health content). `terms.html` only warns not to rely on it for legal, medical or safety translations. Play "Health apps" answer: not a health app (already in `policy-answers.md`). |
| Google target API | **Pass.** `targetSdkVersion = 36`, `compileSdkVersion = 36`, `minSdkVersion = 24` (`android/variables.gradle`). Next bump due 31 Aug 2027. |
| Data safety / privacy labels | **Pass with one wording gap** (below). Nothing is collected unless a Supabase backend is configured; the Pages preview collects nothing. |
| Privacy policy / terms / deletion page reachable and accurate | **Pass**, minor edits suggested (below). |
| Children / Families | **Decision needed.** Target-age answers disagree between documents. |
| User-generated content | **Partial** (same as Dx Dash): report/block/contact exist; no automatic name filter; terms acceptance on sign-up not verified here. |
| In-app purchase / external payment links | **Pass on native; two risks** (redeem codes on iOS; web Stripe is web only). |
| Permissions (Android/iOS), text-to-speech, microphone | **Pass.** No microphone, camera, location, contacts or photo permission. |
| Content claims | **Gap: "1,000 words" vs 6,800 in the app**, fluency claims otherwise avoided. |
| Store assets referenced in listings | **Gap: the screenshot/icon folders named in `store/**` do not exist in the repo.** |

## What the app collects (for the labels)

- **No backend configured (the preview, and any build without `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`):** nothing leaves the device. Accounts, friends, leaderboards, Pro and paid Locker items are hidden (`js/features.js:48`, `FEATURES.backend`). Progress, settings and custom cards are in local storage. Versus (room code) still works: it connects the two devices through the public PeerJS broker, which sees both IP addresses (and the opponent sees the IP and display name).
- **Backend configured:** account id (guests get an anonymous one), email (only if the player creates an account, or via Google/Apple/Microsoft), display name/avatar/scores, friend/group/feed records, a cloud save, reports and feedback, optional anonymous usage statistics (random install id, asked on first launch, off for DNT/GPC), optional crash reports (off by default).
- Text-to-speech uses the device's own engine (`window.speechSynthesis` or the Capacitor TTS plugin). No audio is recorded or uploaded. No microphone.

`store/google-play/policy-answers.md` and `store/app-store/listing.md` (App Privacy table) match this and `public/privacy.html`.

**Wording gap:** the Play form row for network address says "Shared: Yes (PeerJS connection service and the opponent)". That row applies to the web and native builds even with no backend, so in a build with no Supabase the Data safety answer is still "Yes, collects (network address shared during live Versus)" and cannot be "No data collected". If you would rather declare "No data collected" for a first release, disable Versus in that build (hide `#multiplayerBtn`).

## Required changes before submission

1. **Child/age decision (must be consistent).** `store/google-play/policy-answers.md` says target age **18+**; `public/privacy.html` says "intended for adults and older teenagers and not directed at children under 13"; `public/terms.html` has no age rule; the App Store listing expects **4+**. A language-learning game in the Education category plausibly attracts children, which can pull it into Play's Families policy and (if under-13 is a target) COPPA. Recommended: declare **13 and over** (Play "target audience" 13-15, 16-17, 18+; not primarily child-directed), keep the privacy sentence, add a matching line to the terms ("You must be 13 or older"), and keep the Apple rating tier chosen from the questionnaire (4+ is allowed for content; the 13+ limit is a policy statement, not an Apple rating). Do not tick "Designed for Families" and do not use the Apple Kids category. If you want under-13 players, the app needs a children's privacy flow (no accounts, no analytics prompt, no Friends/Versus) first.
2. **Fix the word-count claim.** Listings, landing page and terms say "the 1,000 most common words of 15 languages", but the Stats screen shows a mastery box of **6,800 words** (bands 1-100 ... 5001-6800; `js/levelui.js:190`), and the free tier is "300 words". Either say "up to 6,800 words" / "the most common words" or trim the bands. A mismatch between the listing and what the app shows is the usual route to a metadata rejection (Apple 2.3.1, Play Metadata policy). Files: `store/google-play/listing.md`, `store/app-store/listing.md`, `public/landing/index.html:72,92`, `public/terms.html`, `package.json` description.
3. **Create or point to the store graphics.** The listings reference `assets/store/screenshots/`, `play-icon-512.png`, `play-tablet-7/`, `play-tablet-10/`, `appstore/`, `appstore-6.5/`, `ipad-13/`, `ipad-12.9/`, `appstore-icon-1024.png`. Only `assets/store/feature-graphic.png` exists (checked: shows "Language Dash", no Dx Dash). Generate the rest from this build (the landing screenshots now come from it; `tools/make-screenshots.mjs` / `tools/make-app-screens.mjs` exist) and check they show Language Dash with a real language pair, no "exam" wording, no clinical imagery.
4. **iOS redeem-code row** (Apple 3.1.1). `js/proui.js:309-330` ("Have a redeem code?", grants free Pro) is shown whenever Pro is live (`proLive()`), including iOS. It is folded and meant for testers, but Apple forbids own license-key mechanisms to unlock content. Hide it when `isNative()` on iOS (use Apple Offer Codes), or keep it web/Android only. Not changed: product decision and needs an on-device check. `docs/PRO.md` has the code rules.
5. **Name filter for UGC** (Apple 1.2). Report, block and contact exist; add a server-side blocklist check on display names in the profile function, and say so in the review notes. Only needed when the backend is configured.
6. **Terms acceptance before creating UGC** (Play UGC policy). The Dx Dash fix added "By continuing you agree to the Terms and Privacy Policy" to `js/accountui.js`; confirm the same line exists in this fork before enabling accounts.
7. **Apple privacy manifest.** `ios-config/PrivacyInfo.xcprivacy` matches the labels (tracking false; email, user id, other user content, product interaction, device id, purchase history, crash, performance, other diagnostics). Re-check after `npx cap sync` for "ITMS-91053" and add any API category it names. In a no-backend build all collected-data entries are simply unused; that is allowed.
8. **Play/Apple console tasks (owner):** Data safety form, content rating (UGC yes, purchases yes), target audience (item 1), Apple age-rating questionnaire (Medical/Wellness: none; Messaging: no; Advertising: no; UGC: yes; fantasy violence: none or mild), trader/DSA status (EU), account-deletion URL (`https://pathomnemonic.github.io/Language-Dash/delete-account.html`) in both consoles, subscription products from `policy-answers.md`.
9. **Support/marketing URL and email.** Both listings use the GitHub Pages URL and `patho.mnemonic1@gmail.com`, shown publicly. Apple also wants a real support page, which the landing page plus the mailto satisfy; decide whether you want a role address instead of a personal gmail.
10. **Copyright line** in the App Store listing is still `2026 <your name>`.

## Payments (Apple 3.1.1 / 3.1.3, Google Payments)

- **Native apps** sell Pro, the library unlock, tips and (if enabled) Locker items only through store billing (`capacitor-plugin-cdv-purchase`, `js/iap.js`, `js/proui.js:153`, `:231`). On native, the web Stripe path is off (`webCheckoutEnabled()` requires `!isNative()`, `js/pro.js:541`), the web payment link `proWebUrl` is only used in the web branch (`js/proui.js:217`) and the tip link is blanked in the native app (`js/tips.js:36`). So there is **no external purchase link inside the store apps**: pass.
- **Web build** sells through Stripe or a payment link when `VITE_PRO_WEB_CHECKOUT=1` / `VITE_PRO_WEB_URL` is set; the Pages preview has neither, so it shows "Pro is available in the Language Dash app on Android and iPhone" and no link.
- Cross-platform entitlement (buy on web, use in the iOS app) is allowed as a multiplatform service only because the same products are also sold in the iOS app (3.1.3(b)). Keep it that way: do not ship an iOS build where Pro cannot be bought in-app but can be bought on the web.
- Apple 3.1.2 subscriptions: the paywall shows price, period, trial text and "cancel any time in your store account", links to Terms and Privacy, and has Restore. Verify on a sandbox build after launch.
- **Free trial:** the 7-day trial is granted by your own server to a new account (no card), not by a store introductory offer. That is allowed, but Apple reviewers sometimes ask; the review notes in `store/app-store/listing.md` already explain it. In a no-backend build there is no trial and no Pro.
- Review notes IDs were stale (they listed `avatar_m_alien`, `monster_m_dragon`, ... from Dx Dash). **Fixed:** `store/app-store/listing.md` now lists the real `PREMIUM_ITEMS` ids from `supabase/functions/_shared/premium.js`, and `store/google-play/policy-answers.md` mentions them (only when `VITE_FEATURE_LOCKER_ITEMS=1`).

## Capacitor / native config

- `capacitor.config.json`: `appId com.pathomnemonic.languagedash`, `appName Language Dash`, `webDir dist`, `androidScheme https`, `allowMixedContent false`. Pass.
- Android: namespace/applicationId match; `versionCode 5`, `versionName 1.0.4` (check against what is already on Play: a first release should not skip, and the listing says "version 1.0"); permissions INTERNET, VIBRATE, POST_NOTIFICATIONS only; TTS `<queries>` present; `resizeableActivity`, no portrait lock requirement, touchscreen not required; URL scheme `com.pathomnemonic.languagedash://auth`. `allowBackup="true"` (see security audit).
- iOS: generated at build time by `codemagic.yaml` (`bundle_identifier com.pathomnemonic.languagedash`; Info.plist edited at `ios/App/App/Info.plist`). There is **no `ios/` folder in the repo**, so Info.plist keys cannot be reviewed here. The app needs no usage-description strings (no mic, camera, photos, location, contacts, speech recognition). Check the generated plist once after `cap add ios` for any plugin-added strings.
- `capacitor-assets`: icons and splash (`assets/icon-only.png`, `splash.png`) were viewed; `splash-dark.png` and `icon-foreground.png` were not opened, give them a glance: Language Dash stamp, no Dx Dash, no medical imagery.

## Listing text review

- `store/google-play/listing.md`: name "Language Dash: Word Runner" (26/30), short description 77/80, full description well under 4000. No medical or exam wording, no fluency or test-score promise (it says "practice game, not a language course or a fluency test"). Claims to adjust: "1,000 words" (item 2), "the same algorithm Anki uses" (FSRS is available in Anki but is not Anki's only/default algorithm: say "FSRS, the modern spaced-repetition algorithm"), "Hear every word" (depends on the device having a voice for the language; say "Hear words read aloud where your device has a voice"). "Not affiliated with or endorsed by Anki" is present and good.
- `store/app-store/listing.md`: keywords do not include trademarks; the description is a reuse of the Play text. Subtitle "Learn words at a sprint" fine.
- Category: Education (App). Fine.
- Release notes say "version 1.0" but `versionName` is 1.0.4: harmless.

## Privacy policy, terms, deletion page

- All three say Language Dash; links between them work; the mailto is the only external link. Dates: privacy 9 Oct 2026, terms 9 Oct 2026, delete-account 2 Oct 2026 (bump if edited).
- Accurate for a backend build. For a no-backend build it is still true (it says nothing leaves the device unless online features are used), but it describes Pro/Stripe/Supabase/Apple sign-in features that the build will not show. Acceptable; Play wants the policy to cover everything the app might do.
- Missing: an age statement in the terms (item 1), a line that text-to-speech uses the device's speech engine (no audio sent), and that notification reminders are local. Add three sentences.
- Contrast on the three pages in light mode was failing axe (`.meta` line); fixed in this pass (`#4f587a`).
- Delete-account page matches the in-app path (Friends > Account) and offers an email route; required by both stores once accounts exist. In a no-backend build there is no account to delete; Play still wants the URL if the app declares accounts, so keep the page live.

## Fixed in this pass

- `public/landing/*.png` replaced with Language Dash screenshots (they were Dx Dash with medical imagery).
- `store/app-store/listing.md`: reviewer-note product ids corrected; age questionnaire lines added.
- `store/google-play/policy-answers.md`: Locker item product ids noted.
- Legal-page and landing accessibility fixes (see `docs/LIVE-SITE-CHECK.md`).

## Owner checklist

1. Decide target age (13+ recommended) and align policy, terms and both consoles.
2. Resolve the 1,000 vs 6,800 words claim and edit listings/landing/terms.
3. Produce the store screenshots/icons referenced in the listings.
4. Hide the redeem row on iOS (or accept the 3.1.1 risk).
5. Complete the Play Data safety, content rating, target audience, and the Apple privacy/age/trader questions.
6. Add the name filter and terms-acceptance line before enabling accounts.
7. Confirm `versionCode`/`versionName` against Play before the first upload.
