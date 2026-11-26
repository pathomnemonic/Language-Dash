# iOS launch: what is ready and what still blocks a first build

Language Dash builds and signs for iOS on Codemagic's cloud Macs, the same way Dx Dash does (`codemagic.yaml`, workflow `ios-release`). No Mac is needed.
Nothing has been run: the Apple Developer account is not active yet, and the workflow has no automatic trigger (a person starts it in Codemagic).

## Ready in the repository

- `codemagic.yaml`: workflow **Language Dash iOS (TestFlight)**, `mac_mini_m2`, Node 22, latest Xcode. Steps: web build (`npx vite build`), create the iOS project
  (`cap add ios`, `cap sync ios`, `capacitor-assets generate --ios`), **app icons without an alpha channel** (new: App Store Connect rejects an icon that has one,
  and `assets/icon-only.png` carries an opaque one), orientations (iPhone upright, iPad any way), export compliance (`ITSAppUsesNonExemptEncryption` false),
  the email-link scheme, the build number, the privacy manifest, iPhone and iPad targeting, signing (`xcode-project use-profiles`), build the `.ipa`, publish to TestFlight.
- **Bundle ID `com.pathomnemonic.languagedash`**, the same in `capacitor.config.json`, the signing block, the email-link scheme (`js/native.js` `APP_SCHEME`) and the Android manifest. A test pins this.
- `ios-config/PrivacyInfo.xcprivacy`: the app's privacy manifest (no tracking, the collected data types, the two required-reason API categories), kept in step with `store/app-store/listing.md` and `public/privacy.html`.
- `assets/`: 1024 px icon sources and 2732 px splash images for `capacitor-assets`.
- Native plugins the code imports are all dependencies (`@capacitor/*`, in-app review, text to speech, `capacitor-plugin-cdv-purchase` for StoreKit). The iOS project itself is generated at build time, so there is no native sync to commit.
- `store/app-store/listing.md`: name, subtitle, description, keywords, age rating answers, App Privacy answers (now naming Sentry and PostHog), and the reviewer notes, including every in-app purchase product id.
- Server side already deployed: `ld-iap-verify`, `ld-pro-checkout`, `ld-stripe-webhook`, `ld-remove-signin` (account deletion in the app, which Apple requires).

## What still blocks a first build, once the account is active

**Apple and Codemagic (needs the account, a person)**
1. Apple Developer Program active, with the Paid Applications agreement, tax and banking done (needed for in-app purchases, not for TestFlight alone).
2. App Store Connect: register the bundle ID `com.pathomnemonic.languagedash` and create the app record named **Language Dash**.
3. An App Store Connect **API key** (issuer ID, key ID, the `.p8` file), added in Codemagic under Teams, Integrations, named exactly **PathoMnemonic App Store Connect** (the name `codemagic.yaml` uses). Role: App Manager or Admin.
4. Codemagic: add the `Language-Dash` repository (it finds `codemagic.yaml` at the root). Signing is automatic through that integration. Apple allows only a few distribution certificates per team, so if Codemagic cannot create one, reuse the certificate Dx Dash already uses (upload it once under Code signing identities).
5. Codemagic secure variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the same values as the GitHub repository variables, which Codemagic cannot read), `VITE_SUPPORT_EMAIL`, `VITE_APPSTORE_ID` (the numeric id, once the app record exists), `VITE_IAP_VERIFY=1` (once the Apple secrets below are set). Optional: `VITE_AUTH_PROVIDERS`, `VITE_FEATURE_LOCKER_ITEMS=1` only when the Locker item products exist.

**In-app purchases (App Store Connect)**
6. Create the products with exactly these ids: subscription group "Language Dash Pro" with `languagedash_pro_yearly`, `languagedash_pro_monthly`, `languagedash_pro_pass3m` (3 month period); non-consumable `languagedash_pro_lifetime`; consumable tips `languagedash_tip_small`, `_medium`, `_large`; and the Locker item products listed in the listing's reviewer notes if Locker sales are switched on. Add a review screenshot of the paywall. Prices are in `docs/PRO.md`.

**Server secrets (set by Orion through the vault, never in chat)**
7. For purchase checking: `LD_APPLE_BUNDLE_ID`, `LD_APPLE_IAP_ISSUER_ID`, `LD_APPLE_IAP_KEY_ID`, `LD_APPLE_IAP_PRIVATE_KEY` (the In-App Purchase key from App Store Connect).
8. For Sign in with Apple (required, because the app also offers Google and Microsoft sign-in): an Apple Services ID, the Apple provider switched on in Supabase, and `LD_APPLE_TEAM_ID`, `LD_APPLE_KEY_ID`, `LD_APPLE_PRIVATE_KEY`, `LD_APPLE_CLIENT_ID`. Without it the iOS build hides every third-party sign-in button (guideline 4.8, `applyIosAppleRule`), so the app still works with email or as a guest.

**Store listing assets that are missing from the repository**
9. The listing refers to screenshots in `assets/store/appstore/` (6.9 inch, 1290 x 2796) and `assets/store/appstore-6.5/`, an iPad set, and `assets/store/appstore-icon-1024.png`. None of these files exist yet (only `feature-graphic.png` does). They are needed to submit for review, not for a TestFlight build. They can be captured from the real game with the Playwright tooling at the right sizes.
10. Fill in App Privacy in App Store Connect from the table in the listing, and the age rating questionnaire.

**Things nobody has proven yet**
11. The workflow has never run, for Language Dash or for Dx Dash (its file says the same). Expect one or two small fixes on the first build; the likeliest places are the `xcodeproj` step and the signing step. Read the log when a step fails.
12. First real-phone checks once a TestFlight build exists: the deep link from a confirmation email reopens the app, purchases and Restore against the sandbox, the keyboard and safe areas on a notch phone, and text to speech voices for the 15 languages.
