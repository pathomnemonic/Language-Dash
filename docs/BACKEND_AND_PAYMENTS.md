# Backend and payments: one shared Supabase project

Language Dash does not have a Supabase project of its own. All of the owner's apps share **one** Supabase project and one pool of
sign-ins. This page is the reference for how Language Dash lives inside it. (`docs/SILO.md` covers the browser side: storage keys,
caches, the service worker. `docs/PRO.md` covers the Pro product itself. `docs/SHARED-PROJECT-MIGRATION.md` covers the SQL migration.)

## The model

| | Shared by every app | Language Dash only |
|---|---|---|
| Supabase project | yes (one URL, one anon key) | |
| Sign-in (`auth.users`) | yes: one login per email or Google identity | |
| Database schema | Dx Dash lives in `public` | **`language_dash`** (nothing of ours is in `public`) |
| Membership | | `language_dash.members(user_id, joined_at)`: one row per login that created a Language Dash account |
| Profile, scores, friends, groups, cloud save | | `language_dash` tables |
| Pro, Locker items, Stripe customer link | | `language_dash` tables |
| Edge functions | | `ld-pro-checkout`, `ld-stripe-webhook`, `ld-iap-verify`, `ld-remove-signin` |
| Function secrets | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (provided by the platform) | every `LD_*` secret |
| Browser session copy | | `localStorage` key `langdash-auth` |

Rules this gives, all tested:

1. **One sign-in, deliberate membership.** Signing in (password, email link, Google) only proves who you are. Language Dash creates
   nothing for you until you choose **Create my Language Dash account** (the app calls `join_language_dash()`). Signing in through
   another app creates nothing in Language Dash.
2. **Until a login is a member, every backend feature is off, exactly as for a guest**: friends, leaderboards, profile sync, cloud
   save, Pro server sync and purchases. In the app this is one notion, `leaderboard.isMember()` (`isAuthenticated()` means "signed in
   and a member"; `isSignedIn()` is the plain sign-in). Guests (anonymous sessions) are never members and are never asked.
3. **A gated call that finds the login is not a member** gets error code `42501` with message `not_a_member`. The client then
   re-checks membership, switches the features off and shows the same "Create your Language Dash account" step.
4. **Everything per app is separate**: data, Pro subscriptions, Locker items, deletion.

## What the client does

- `createClient(url, anonKey, { db: { schema: 'language_dash' }, auth: { storageKey: 'langdash-auth' } })`. Every `.from()` and
  `.rpc()` therefore targets `language_dash`; realtime `postgres_changes` filters name `schema: 'language_dash'`.
- Plain REST calls (anonymous analytics, `js/analytics/core.js`) send `Content-Profile: language_dash` and `Accept-Profile: language_dash`.
  The same headers are used by `tools/analytics-report.mjs`, `tools/reconcile-stripe.mjs`, `tools/smoke-webhook.mjs` and the keep-alive workflow.
- After a sign-in (restored session, password, email link, OAuth return) it calls `my_membership()` -> `{ member, joined_at }`.
  Not a member: the Account screen shows **Create your Language Dash account with <email>**, one line of explanation ("You are signed
  in with a login that other apps may also use. Your Language Dash data, progress and subscription are separate."), a primary button
  (`join_language_dash()`) and **Not now, keep playing as a guest**.
- A Sign in with Apple token is kept in memory until the login is a member, and only then handed to the server.

## The two deletion actions

Both are in the app, under **Friends -> Account** (Apple guideline 5.1.1(v): the path is real and needs no email to support). Both
are described on `public/delete-account.html`, in the privacy policy and in the terms.

| Action | What it does | Where |
|---|---|---|
| **Delete my Language Dash account** | Confirm dialog. Cancels a subscription that is still billing (`ld-pro-checkout`, action `cancel_subscription`), then calls `language_dash.delete_my_ld_data()`: removes only Language Dash rows and the membership. **The login stays** (other apps may use it); the app says so. | database function |
| **Remove my sign-in (all apps)** | A separate danger action with a plain warning that it removes the login every app uses and that each app's data for this login may be deleted as a result. Requires typing `REMOVE MY SIGN-IN`. Calls `ld-remove-signin`. | edge function |

`ld-remove-signin` (body `{ confirm: 'REMOVE MY SIGN-IN' }`, caller's JWT, real logins only, never guests), in this order and stopping
at the first failure so nothing is half done:

1. verify the JWT and the confirmation phrase;
2. cancel any Stripe subscription still billing (fails closed: nothing is removed if it cannot be cancelled);
3. revoke the Sign in with Apple token for an Apple login (fails closed);
4. `delete_my_ld_data()` through the caller's own context (best effort), `pro_forget_user`, then `purge_user_data(uuid)` as the service role (required: the pro_* tables have no foreign key, so the login deletion would orphan them; a failure stops here and keeps the login);
5. delete the auth user with the admin API.

The old `delete_my_account` RPC (which deleted the auth user) no longer exists.

## Edge functions

| Function | Purpose | Deploy |
|---|---|---|
| `ld-pro-checkout` | prices, checkout, items, portal, subscription status, sync, `cancel_subscription`, `apple_token`. Requires a member (except the public price list). | `supabase functions deploy ld-pro-checkout --use-api` |
| `ld-stripe-webhook` | Stripe events -> Pro. Verifies the signature with `LD_STRIPE_WEBHOOK_SECRET` and ignores any event whose `metadata.app` is not `language_dash`. | `... deploy ld-stripe-webhook --no-verify-jwt` |
| `ld-iap-verify` | checks a Google Play / App Store purchase. Requires a member. | `... deploy ld-iap-verify --use-api` |
| `ld-remove-signin` | removes the sign-in (above). | `... deploy ld-remove-signin --use-api` |

All four use `verify_jwt = false` (`supabase/config.toml`) and check the caller themselves. Every service-role client is created with
`{ db: { schema: 'language_dash' } }`.

## Secrets (names only, never values)

Functions read **only** `LD_`-prefixed names and have **no fallback** to an unprefixed name: an unprefixed fallback would silently
pick up another app's value in this shared project. A unit test fails if any function reads a name that is not `LD_*` or one of the
platform's `SUPABASE_*`.

| Secret | What it is for |
|---|---|
| `LD_SITE_URL` | the game's public address, no trailing slash (`https://pathomnemonic.github.io/Language-Dash`); Stripe return links |
| `LD_STRIPE_SECRET_KEY` | Stripe API key (a restricted key is best, see `docs/SECURITY.md`) |
| `LD_STRIPE_WEBHOOK_SECRET` | signing secret of **Language Dash's** webhook endpoint |
| `LD_STRIPE_PRICE_YEARLY` | Price id of the yearly plan |
| `LD_STRIPE_PRICE_PASS3M` | Price id of the 3-month pass |
| `LD_STRIPE_PRICE_MONTHLY` | Price id of the monthly plan |
| `LD_STRIPE_PRICE_LIFETIME` | Price id of Lifetime (one time) |
| `LD_APPLE_TEAM_ID`, `LD_APPLE_KEY_ID`, `LD_APPLE_PRIVATE_KEY`, `LD_APPLE_CLIENT_ID` | revoking a Sign in with Apple login when the sign-in is removed |
| `LD_GOOGLE_PLAY_PACKAGE`, `LD_GOOGLE_SA_EMAIL`, `LD_GOOGLE_SA_PRIVATE_KEY` | Google Play purchase checks (`ld-iap-verify`) |
| `LD_APPLE_BUNDLE_ID`, `LD_APPLE_IAP_ISSUER_ID`, `LD_APPLE_IAP_KEY_ID`, `LD_APPLE_IAP_PRIVATE_KEY` | App Store purchase checks (`ld-iap-verify`) |

Platform-provided and unchanged: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Set any you do not use to nothing
(leave it out); the function says plainly what is not set up.

## Stripe, per app

The Stripe account may be shared, but each app has its **own** Products and Prices and its **own webhook endpoint** (and signing secret).
Everything Language Dash creates (Checkout Session, subscription, payment) carries `metadata.app = language_dash`. The webhook ignores
any event without it, so another app's events (or its own endpoint receiving ours) never grant or take back anything here.
Setup steps: `docs/PRO.md` ("Web payments").

## Sign-in providers

- **Email and password / emailed sign-in link** work at the project level.
- **Google**: the provider is configured once, at the project level, by the owner (Authentication -> Providers). The client only shows
  the button when the build's `VITE_AUTH_PROVIDERS` includes `google`, and only when Supabase reports the provider as enabled.
- **Sign in with Apple (App Store guideline 4.8)**: if Google sign-in is offered in the iOS app, Sign in with Apple must be offered too.
  Until Apple is configured (Services ID, key, the `LD_APPLE_*` secrets), keep Google off in the **iOS build** (`VITE_AUTH_PROVIDERS`
  without `google`, for example `apple` or `none`). The default list `google,apple,azure` is only safe once Apple works.
- **Redirect URLs to allow** (Authentication -> URL Configuration; no other wildcard): `https://pathomnemonic.github.io/Language-Dash/`,
  `https://pathomnemonic.github.io/Language-Dash/**` and `com.pathomnemonic.languagedash://auth`. (`http://localhost:5173` for development.)
  The list is project-wide, so it also holds the other apps' addresses.

## Email launch gate

The project's built-in email sender is limited to **2 emails per hour for the whole project** (all apps together). The owner's SMTP
provider is pending. **Password sign-up and the emailed sign-in link (OTP) must not ship until SMTP is verified** (Authentication ->
SMTP Settings, then send a real test through each flow). Until then ship with Google only (iOS: see the Apple rule above) or with the
account screen off. Do not turn the email options on in a release because they "work in testing": the limit is shared, so a handful of
players would lock every app out of sign-in emails.

## Deployment order

1. **Scratch project first.** Create a throwaway Supabase project, apply the migration (`supabase/migrations/`), deploy the four
   functions with test-mode `LD_*` secrets, and run the unit tests plus a manual pass: sign up, create the Language Dash account, delete
   the account, remove the sign-in.
2. **Review the migration diff.** Diff what the migration changes in the shared project against what is live (Dx Dash's `public` must be
   untouched: only the new `language_dash` schema, its grants and the new functions). See `docs/SHARED-PROJECT-MIGRATION.md`.
3. **Then the shared project.** Apply the migration, add the `LD_*` secrets, deploy the functions, add Language Dash's own Stripe
   webhook endpoint, add the redirect URLs, set the repository variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` to the shared
   project, and only then ship a build. In the dashboard, **Settings -> API -> Exposed schemas** must list `language_dash` (PostgREST only
   serves exposed schemas).
4. Switch on `VITE_PRO_WEB_CHECKOUT` last, once a test-mode purchase works end to end.

## Contract the app and functions rely on (checked against the migration)

- Table `language_dash.members(user_id, joined_at)`; the functions read it with the service role (`ld-pro-checkout`, `ld-iap-verify`).
- RPCs in `language_dash`: `my_membership()` -> jsonb `{ member: boolean, joined_at }`; `join_language_dash()` (idempotent,
  authenticated, creates the membership, returns the same jsonb); `is_member()`; `delete_my_ld_data()` -> jsonb counts (deletes only
  Language Dash rows and the membership, never the auth user).
- Every other RPC and table keeps its old name, only the schema changed. Gated RPCs raise `42501` / `not_a_member` for a signed-in non-member.
- Existing function-side RPCs still used: `pro_user_customer`, `pro_customer_user`, `pro_link_customer`, `pro_grant_until`,
  `pro_grant_item`, `pro_revoke_*`, `pro_has_item`, `pro_event_once`, `pro_store_claim`, `apple_token_save`, `apple_token_get`,
  `pro_forget_user` (payment records; should also be part of what `delete_my_ld_data` removes).
