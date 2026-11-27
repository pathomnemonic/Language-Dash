# Language Dash in a shared Supabase project

Decision (final): all of the owner's apps share ONE Supabase project. Dx Dash already lives in its `public` schema, with table and
function names identical to this repo's `database/*.sql` template (`player_profiles`, `scores`, `friends`, `pro_entitlements`,
`analytics_events` ...). **Nothing from `database/*.sql` may be run against `public`.** Language Dash lives entirely in its own schema,
`language_dash`, created by one generated migration.

* Migration: `supabase/migrations/20261201000000_language_dash.sql` (generated, do not edit by hand)
* Generator: `tools/ld-migrate/generate.mjs` (+ `lib.mjs`)
* Local Postgres proof: `tools/ld-migrate/test-local.mjs` (`npm run test:migration`)
* Owner queries: `tools/ld-migrate/out/verify-language-dash.sql`, `out/audit-language-dash.sql`, `public-fingerprint.sql`, `rollback.sql`

The original `database/*.sql` files are unchanged and stay the single-tenant template (for a standalone Language Dash project).

## 1. Account model

| Thing | Where it lives | Created by |
| --- | --- | --- |
| Sign-in (email, Google, Apple, anonymous) | shared `auth.users`, one row per person | the first app they sign in through |
| Language Dash membership | `language_dash.members(user_id, joined_at)` | **only** `language_dash.join_language_dash()`, called deliberately inside Language Dash |
| Language Dash data, Pro, saves, friends | `language_dash.*`, keyed by the same user id | gated RPCs and policies, only for members |
| Dx Dash (or any other app) data | its own schema / `public` | that app |

* Signing in through another app creates **nothing** in `language_dash` (tested: no membership row, no row in any of the 45 tables).
* "Delete my Language Dash account" is `language_dash.delete_my_ld_data()`: it removes only Language Dash rows and the membership. It never
  touches `auth.users` (tested: the sign-in and the fake Dx Dash rows are untouched).
* The sign-in itself is removed only by a separate, explicit action done by an edge function with the service role. That function should
  call `language_dash.purge_user_data(uuid)` first (service role only; the same wipe for a given user id) and then delete the auth user.
  Deleting an auth user alone also cascades through `members` into every table that references it, but the Pro tables hold a bare user id
  (like the template, so payment records outlive a login) and need `purge_user_data` to be cleared.
* Pro subscriptions are per app: `language_dash.pro_*` never mixes with Dx Dash's `public.pro_entitlements`.

## 2. How to generate and verify

```bash
node tools/ld-migrate/generate.mjs            # writes the migration + out/audit-language-dash.sql + out/verify-language-dash.sql
node tools/ld-migrate/generate.mjs --check    # exit 1 if the committed files are stale (CI-friendly)
node tools/ld-migrate/generate.mjs --report   # print the diff report and classification tables
node tools/ld-migrate/generate.mjs --docs     # refresh the generated region of this document
npx vitest run tests/unit/ldmigrate.test.js   # pure-function tests (no Postgres), part of the normal suite
npm run test:migration                        # real PostgreSQL 16 proof (see section 7), not part of vitest
```

The generator reads the template in this order (the order `tests/unit/dbprivileges.test.js` proves against a real database; any
dependency problem would make the local test fail):

1. `schema.sql` (tables, triggers, the core RPCs; every other file builds on it)
2. `policies.sql` (row level security on the schema.sql tables)
3. `cohorts.sql`, `discovery.sql` (need schema + policies: `ranked_matches`, `player_trophies`, `study_groups`, `friends`)
4. `pro.sql`, `analytics.sql`, `analytics_views.sql` (independent of each other; the views need `analytics.sql`)
5. `lockdown.sql` (always last: closes every function and table, then opens the allow-lists)
6. `audit.sql` is not DDL: it is rewritten to `out/audit-language-dash.sql` and run **after** the migration

It fails loudly (exit 1, message with file and line) instead of guessing when it meets: `CREATE EXTENSION`, `cron.*`, `ALTER
DATABASE/ROLE/SYSTEM`, `CREATE SCHEMA/ROLE/PUBLICATION`, objects in other schemas, storage buckets or policies on `storage.objects`,
`GRANT ... TO <role other than anon/authenticated/service_role/PUBLIC>`, `GRANT ON SCHEMA public`, default privileges for another role,
a DO block it does not know, a body that calls extension functions (`gen_salt`, `crypt`, `uuid_generate_v4` ...) or touches `auth.*` other
than `auth.uid()` / `auth.jwt()`, a table or function missing from the classification maps in `lib.mjs`, a user column that the
classification does not list, a table without RLS, or a signed-in function that is neither gated nor a known predicate.

### What the rewriting does

1. `CREATE SCHEMA IF NOT EXISTS language_dash;` then `SET LOCAL search_path = language_dash, pg_temp;` inside one `BEGIN ... COMMIT`.
   A guard `DO` block aborts the whole migration if `current_schema()` is not `language_dash` (for example if someone strips the
   `BEGIN`), so no statement can ever fall through to `public`. Tested: the stripped file is refused and leaves `public` and every other
   schema byte-for-byte unchanged.
2. Every function gets `SET search_path = language_dash, pg_temp`: the 89 `SET search_path = public[, auth]` pins are rewritten, and the 9
   functions that had **no** pin (trigger functions and helpers that read tables, e.g. `scores_sanity`, `cohort_random_tag`) get one. Without
   it they would resolve `scores` on the caller's search_path, which on a shared project means Dx Dash's `public.scores`.
3. `public.x` becomes `language_dash.x` (code and bodies); the `'public'` catalog literals of the lockdown and analytics-view DO blocks and
   `IN SCHEMA public` become `language_dash`. A last pass over the finished file fails if the word `public` is left anywhere except
   `REVOKE ... FROM PUBLIC`. (The local test caught a real bug here during development: `to_regclass('public.' || tbl)` in lockdown.sql was
   first missed and silently skipped grants whenever Dx Dash had a table of the same name.)
4. Foreign keys `REFERENCES auth.users(id)` are retargeted to `language_dash.members(user_id)` (31 of them), so a Language Dash row can
   only ever reference a member (a friend request to someone who signed in through Dx Dash fails with a foreign key error), and removing a
   membership or the sign-in cascades. `--fk-target=auth` keeps the template's `auth.users` references instead.
5. `delete_my_account()` (which `DELETE`s from `auth.users`) is not emitted, nor its REVOKE/GRANT; the allow-lists in `lockdown.sql` and
   `audit.sql` are patched at generation time to name `delete_my_ld_data`, `is_member`, `join_language_dash`, `my_membership` instead.
   The originals in `database/` are not edited.
6. Member gate: a RESTRICTIVE policy `ld_member_gate` (`FOR ALL TO authenticated USING / WITH CHECK ((SELECT language_dash.is_member()))`,
   the sub-select makes Postgres evaluate it once per statement) on every table that holds member data; and
   `IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE='42501'; END IF;` injected as the first statement of
   every gated plpgsql function. Gated **SQL-language** functions cannot hold an `IF`, so their first statement is
   `SELECT language_dash.require_member();` (a SQL function runs every statement and returns the last one).
7. The membership layer, the wipe function and the gate policies are emitted by the generator; `members` is added to lockdown's table
   grant list (SELECT for `authenticated` only). After lockdown, `service_role` gets schema usage and ALL on tables, sequences and functions
   (it bypasses RLS but still needs privileges; Supabase only gives that by default in `public`).

## 3. Membership layer and decisions

* `language_dash.members(user_id uuid PK -> auth.users ON DELETE CASCADE, joined_at timestamptz)`, RLS on, one policy
  (`SELECT` own row, `TO authenticated`), no insert/update/delete privilege or policy for clients.
* `my_membership()` returns `{member, joined_at}`. `join_language_dash()` is idempotent, `SECURITY DEFINER`, uses `auth.uid()`; anonymous
  (guest) sign-ins may join, as the template relied on anonymous sign-ins. `is_member()` is stable and security definer.
  `require_member()` is the internal raiser.
* `delete_my_ld_data()` returns per-table counts as jsonb. It works for a non-member too (it clears anything a payment webhook recorded
  before they joined). Like the template's `delete_my_account`, it refuses with `subscription_still_billing` (SQLSTATE `55000`) while a
  Stripe `monthly` / `yearly` / `pass3m` plan is still running. Rows are deleted children before parents, generated from the foreign keys
  (`activity_kudos` before `activity_events`, `group_members` before `study_groups`, `ranked_reports` before `ranked_matches` ...);
  `schools.created_by` is set to NULL instead (a school belongs to its cohorts).
* Service-role functions (`pro_grant`, `pro_grant_until`, `pro_grant_item`, `pro_link_customer`, `pro_store_claim` ...) stay callable by
  `service_role` with no membership check. **Decision:** they act on an explicit user id and may record a payment for someone who has not
  joined yet (a Stripe webhook can arrive before the app's join call), but they never create a membership, and the gate still refuses that
  user's RPCs until they join. Tested: `pro_grant_until` for a non-member leaves exactly one `pro_entitlements` row and no membership;
  `delete_my_ld_data` clears it. `authenticated` and `anon` cannot call any of them.
* `report_diagnostic` is not gated: it is an opt-in crash report that stores no account id, so it works before the player joins.
* The four row-security predicates (`has_block_between`, `is_group_member`, `can_see_post`, `can_see_activity`) are not gated: they only
  answer about the caller, raising inside a policy would turn "no rows" into errors, and the table gate already closes the data.
* Anonymous analytics (`ingest_analytics`, `delete_analytics`, `count_consent`) and their five tables are keyed by a device install id,
  not an account; they are not gated and are not wiped by `delete_my_ld_data` (the app calls `delete_analytics` for that, as before).
* `scores` and `player_profiles` stay readable by `anon` (public leaderboard, as in the template); a signed-in non-member reads nothing
  from them because the gate applies to `authenticated`. See open decision 4.

<!-- BEGIN GENERATED REPORT (node tools/ld-migrate/generate.mjs --docs) -->

### Diff report vs the template (generated numbers)

| Measure | Count |
| --- | --- |
| Template statements read (schema, policies, cohorts, discovery, pro, analytics, analytics_views, lockdown) | 560 |
| Statements carried over | 557 |
| Statements removed (delete_my_account and its REVOKE/GRANT) | 3 |
| Statements in the migration (incl. wrapper, membership layer, gate, wipe, role grants) | 657 |
| `SET search_path = public[, auth]` pins rewritten to `language_dash, pg_temp` | 90 |
| Functions that had NO pin and got one (would have run on the caller's search_path) | 9 |
| `public.` qualifications rewritten to `language_dash.` | 4 |
| `'public'` catalog literals / `IN SCHEMA public` rewritten | 4 |
| Foreign keys `auth.users(id)` retargeted to `language_dash.members(user_id)` | 31 |
| Membership checks injected: plpgsql functions / SQL functions | 36 / 16 |
| `ld_member_gate` restrictive policies added | 36 |
| DO blocks recognised and translated | 5 |
| Tables created (template + members) | 45 |
| Views created | 127 |
| Functions created (template + membership layer) | 104 |
| Migration size (lines) | 4385 |

Statement kinds read from the template: ALTER_DEFAULT_PRIVILEGES 1, ALTER_TABLE 55, CREATE_FUNCTION 100, CREATE_INDEX 30, CREATE_POLICY 28, CREATE_TABLE 44, CREATE_TRIGGER 5, CREATE_VIEW 127, DELETE 1, DO 5, DROP_FUNCTION 4, DROP_POLICY 28, DROP_TRIGGER 6, GRANT 62, REVOKE 64.

Removed: function delete_my_account(); REVOKE on delete_my_account(); GRANT on delete_my_account().

### Table classification

| Table | Class | Member gate | Wiped by delete_my_ld_data on | Source |
| --- | --- | --- | --- | --- |
| `members` | membership | no | user_id | generator |
| `player_profiles` | member | yes | user_id | schema |
| `scores` | member | yes | user_id | schema |
| `friends` | member | yes | requester_id, addressee_id | schema |
| `friend_blocks` | member | yes | blocker_id, blocked_id | schema |
| `match_invites` | member | yes | from_user, to_user | schema |
| `user_reports` | member | yes | reporter_id, reported_id | schema |
| `card_reports` | member | yes | reporter_id | schema |
| `study_groups` | member | yes | owner_id | schema |
| `group_members` | member | yes | user_id | schema |
| `shared_decks` | member | yes | owner_id | schema |
| `activity_events` | member | yes | user_id | schema |
| `activity_kudos` | member | yes | user_id | schema |
| `weekly_study` | member | yes | user_id | schema |
| `content_reports` | member | yes | reporter_id | schema |
| `client_diagnostics` | anon | no | - | schema |
| `app_feedback` | member | yes | user_id | schema |
| `player_saves` | member | yes | user_id | schema |
| `player_saves_backup` | member | yes | user_id | schema |
| `player_trophies` | member | yes | user_id | schema |
| `ranked_queue` | member | yes | user_id | schema |
| `ranked_matches` | member | yes | host_id, guest_id | schema |
| `ranked_reports` | member | yes | user_id | schema |
| `schools` | member | yes | set NULL: created_by | cohorts |
| `cohorts` | shared | yes | - | cohorts |
| `cohort_members` | member | yes | user_id | cohorts |
| `cohort_war_points` | member | yes | user_id | cohorts |
| `buddy_listings` | member | yes | user_id | discovery |
| `group_join_requests` | member | yes | user_id | discovery |
| `pro_entitlements` | member | yes | user_id | pro |
| `pro_items` | member | yes | user_id | pro |
| `pro_codes` | internal | no | - | pro |
| `pro_redemptions` | member | yes | user_id | pro |
| `pro_attempts` | member | yes | user_id | pro |
| `pro_library` | member | yes | user_id | pro |
| `pro_trials` | member | yes | kept (removed by pro_forget_user with the sign-in) | pro |
| `pro_stripe_customers` | member | yes | user_id | pro |
| `pro_stripe_events` | internal | no | - | pro |
| `apple_tokens` | member | yes | kept (removed by pro_forget_user with the sign-in) | pro |
| `pro_store_purchases` | member | yes | user_id | pro |
| `analytics_installs` | anon | no | - | analytics |
| `analytics_sessions` | anon | no | - | analytics |
| `analytics_events` | anon | no | - | analytics |
| `analytics_limits` | anon | no | - | analytics |
| `analytics_consent_counts` | anon | no | - | analytics |

Classes: **member** = member data: restrictive ld_member_gate policy + wiped by delete_my_ld_data; **shared** = Language Dash content, no user column: restrictive ld_member_gate policy; **internal** = owner / service-role data, no user column: no gate (no client privileges at all); **anon** = written by the signed-out app, no account id: no gate.

### Views

- 2 x public leaderboard read model (security_invoker; anon may SELECT; signed-in non-members see nothing): `leaderboard_best`, `leaderboard_alltime`
- 2 x owner-only inbox view (no client privileges): `moderation_queue`, `feedback_inbox`
- 6 x owner-only Pro view (no client privileges)
- 117 x owner-only analytics view (no client privileges)

### Function classification and gate decision

| Function | Language | Security definer | Gate | Reason | Pin |
| --- | --- | --- | --- | --- | --- |
| `cancel_group_request` | sql | yes | SELECT require_member() | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `cohort_create` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `cohort_join` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `cohort_kick` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `cohort_leave` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `cohort_search` | sql | yes | SELECT require_member() | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `cohort_set_role` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `cohort_war_standings` | sql | yes | SELECT require_member() | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `create_group` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `discover_groups` | sql | yes | SELECT require_member() | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `find_buddies` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `force_save` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `get_feed` | sql | yes | SELECT require_member() | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `get_my_pro` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `get_shared_deck` | sql | yes | SELECT require_member() | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `give_kudos` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `group_goal_status` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `group_leaderboard` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `group_requests` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `join_group` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `join_public_group` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `leave_group` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `my_buddy_listing` | sql | yes | SELECT require_member() | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `my_cohort` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `my_groups` | sql | yes | SELECT require_member() | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `my_recent_kudos` | sql | yes | SELECT require_member() | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `publish_deck` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `push_save` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `ranked_cancel` | sql | yes | SELECT require_member() | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `ranked_find_match` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `ranked_my_stats` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `ranked_poll_match` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `ranked_report` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `ranked_settle_stale` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `ranked_top` | sql | yes | SELECT require_member() | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `redeem_pro_code` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `remove_buddy_listing` | sql | yes | SELECT require_member() | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `remove_kudos` | sql | yes | SELECT require_member() | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `report_content` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `report_study` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `resolve_group_request` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `restore_backup_save` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `school_standings` | sql | yes | SELECT require_member() | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `season_standing` | sql | yes | SELECT require_member() | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `set_activity_visibility` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `set_buddy_listing` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `set_group_discovery` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `set_group_goal` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `start_my_trial` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `submit_feedback` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `upsert_player_profile` | plpgsql | yes | IF NOT is_member() RAISE | signed-in RPC that acts for auth.uid() or reads Language Dash data | rewritten |
| `activity_rate_limit` | plpgsql | yes | none | trigger or internal helper, not callable by app roles | rewritten |
| `analytics_bool` | sql | no | none | trigger or internal helper, not callable by app roles | added |
| `analytics_num` | sql | no | none | trigger or internal helper, not callable by app roles | added |
| `analytics_pct` | sql | no | none | trigger or internal helper, not callable by app roles | added |
| `analytics_purge` | plpgsql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `analytics_txt` | sql | no | none | trigger or internal helper, not callable by app roles | added |
| `apple_token_get` | sql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `apple_token_save` | sql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `can_see_activity` | sql | yes | none | row-security predicate about the caller only; table policies carry the gate | rewritten |
| `can_see_post` | sql | yes | none | row-security predicate about the caller only; table policies carry the gate | rewritten |
| `cohort_add_war_points` | plpgsql | yes | none | trigger or internal helper, not callable by app roles | rewritten |
| `cohort_after_member_gone` | plpgsql | yes | none | trigger or internal helper, not callable by app roles | rewritten |
| `cohort_on_match_settled` | plpgsql | yes | none | trigger or internal helper, not callable by app roles | rewritten |
| `cohort_random_tag` | plpgsql | no | none | trigger or internal helper, not callable by app roles | added |
| `cohort_role_of` | sql | yes | none | trigger or internal helper, not callable by app roles | rewritten |
| `cohort_week` | sql | no | none | trigger or internal helper, not callable by app roles | added |
| `count_consent` | plpgsql | yes | none | anonymous, consent-based usage statistics keyed by install id, no account | rewritten |
| `delete_analytics` | plpgsql | yes | none | anonymous, consent-based usage statistics keyed by install id, no account | rewritten |
| `delete_my_ld_data` | plpgsql/sql | yes | none | membership layer: wipes the caller's Language Dash data + membership, never auth.users | hand-written |
| `has_block_between` | sql | yes | none | row-security predicate about the caller only; table policies carry the gate | rewritten |
| `ingest_analytics` | plpgsql | yes | none | anonymous, consent-based usage statistics keyed by install id, no account | rewritten |
| `is_group_member` | sql | yes | none | row-security predicate about the caller only; table policies carry the gate | rewritten |
| `is_member` | plpgsql/sql | yes | none | membership layer: the gate itself (stable, security definer, used by policies) | hand-written |
| `join_language_dash` | plpgsql/sql | yes | none | membership layer: the only way a membership row is created (idempotent) | hand-written |
| `keep_richest_save` | plpgsql | yes | none | trigger or internal helper, not callable by app roles | rewritten |
| `my_membership` | plpgsql/sql | yes | none | membership layer: {member, joined_at} for the caller | hand-written |
| `pro_customer_user` | sql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `pro_event_once` | plpgsql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `pro_forget_user` | plpgsql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `pro_grant` | plpgsql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `pro_grant_item` | plpgsql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `pro_grant_library` | sql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `pro_grant_until` | plpgsql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `pro_has_item` | sql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `pro_is_guest` | sql | no | none | trigger or internal helper, not callable by app roles | rewritten |
| `pro_link_customer` | sql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `pro_make_code` | plpgsql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `pro_revoke` | sql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `pro_revoke_item` | sql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `pro_revoke_library` | sql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `pro_revoke_plan` | sql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `pro_set_billing_cancelled` | sql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `pro_store_claim` | plpgsql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `pro_user_customer` | sql | yes | none | service role / owner only: acts on an explicit user id, never creates membership | rewritten |
| `purge_user_data` | plpgsql/sql | yes | none | membership layer: same wipe for a given user id (edge function, service role) before it removes the sign-in | hand-written |
| `ranked_apply` | plpgsql | yes | none | trigger or internal helper, not callable by app roles | rewritten |
| `ranked_delta` | plpgsql | no | none | trigger or internal helper, not callable by app roles | added |
| `ranked_league_floor` | sql | no | none | trigger or internal helper, not callable by app roles | added |
| `ranked_try_settle` | plpgsql | yes | none | trigger or internal helper, not callable by app roles | rewritten |
| `report_diagnostic` | plpgsql | yes | none | opt-in crash report: stores no account id, so it works before the player joins | rewritten |
| `require_member` | plpgsql/sql | yes | none | membership layer: raises not_a_member; first statement of gated SQL-language functions | hand-written |
| `scores_keep_best` | plpgsql | yes | none | trigger or internal helper, not callable by app roles | rewritten |
| `scores_sanity` | plpgsql | no | none | trigger or internal helper, not callable by app roles | added |

<!-- END GENERATED REPORT -->

### Removed and added objects (summary)

* Removed: `delete_my_account()` and its REVOKE and GRANT (3 statements). Replaced by `language_dash.delete_my_ld_data()`.
* Added: `members` table and its policy; functions `is_member`, `require_member`, `my_membership`, `join_language_dash`,
  `delete_my_ld_data`, `purge_user_data`; 36 `ld_member_gate` policies; the guard block; role grants for `service_role`.
* Changed: every function pin, every `auth.users` foreign key, the lockdown/audit allow-lists, the realtime `ALTER PUBLICATION` (now
  `language_dash.match_invites`).

## 4. What could not be converted automatically, and why

| Item | Why | What to do |
| --- | --- | --- |
| `ALTER PUBLICATION supabase_realtime ADD TABLE match_invites` | translated (qualified to `language_dash.match_invites`), but the publication is a project-wide object | adds one table, touches nothing else; owner may delete that DO block if realtime invites are not wanted (open decision 2) |
| `analytics_purge(days)` scheduling | the template says "Database -> Cron"; `cron.schedule` is rejected on purpose (pg_cron is a shared extension) | owner schedules `select language_dash.analytics_purge(400);` in the dashboard |
| Anonymous sign-ins | the game signs players in anonymously; that is a project-wide Auth setting | leave it enabled (it affects every app: they will see anonymous users too) |
| The client and edge functions | `delete_my_account()` is gone; the app must call `join_language_dash()` after sign-in and `delete_my_ld_data()` for deletion; supabase-js must use the schema | owned by the client work (section 5) |
| Pro rows when only `auth.users` is deleted | Pro tables hold a bare uuid (template design) | call `purge_user_data` before deleting the auth user |
| Unqualified calls to extension functions in new SQL | impossible to detect in general | the generator rejects a list of common ones; the pinned search_path would make others fail loudly at run time, never silently hit `public` |
| Proving the rewrite is right | text rewriting cannot prove behaviour | `npm run test:migration` (section 7) |

## 5. Applying it

### 5.1 Scratch project first (do not skip)

1. Create a scratch Supabase project (or a branch). Do not use the shared one yet.
2. If it has no Dx Dash tables, create a few with the same names as the template to see that nothing collides (the local test does this).
3. Fingerprint `public` **before**:
   ```bash
   psql "$SCRATCH_DB_URL" -X -At -f tools/ld-migrate/public-fingerprint.sql        # note the md5
   ```
4. Dry run in a transaction that is rolled back (nothing persists):
   ```bash
   sed 's/^COMMIT;$/ROLLBACK;/' supabase/migrations/20261201000000_language_dash.sql | psql "$SCRATCH_DB_URL" -X -v ON_ERROR_STOP=1
   ```
5. Apply for real: `psql "$SCRATCH_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/migrations/20261201000000_language_dash.sql`, or paste the file
   into the dashboard SQL editor (it carries its own `BEGIN; ... COMMIT;`), or `supabase db push` (the file name is the migration version).
   It is idempotent: running it twice is safe (tested).
6. Verify, all read-only:
   ```bash
   psql "$SCRATCH_DB_URL" -X -At -f tools/ld-migrate/out/verify-language-dash.sql   # every row must end in |t
   psql "$SCRATCH_DB_URL" -X -At -f tools/ld-migrate/out/audit-language-dash.sql    # must print nothing
   psql "$SCRATCH_DB_URL" -X -At -f tools/ld-migrate/public-fingerprint.sql         # must equal the "before" output
   ```
   Spot checks in the SQL editor:
   ```sql
   select count(*) from pg_class where relnamespace = 'language_dash'::regnamespace and relkind = 'r';      -- 45
   select tablename from pg_policies where schemaname = 'language_dash' and policyname = 'ld_member_gate';   -- 36 rows
   select count(*) from language_dash.members;                                                                -- 0 until someone joins
   -- act as a user who is signed in but has not joined (use a real auth.users id):
   begin; set local role authenticated; set local request.jwt.claim.sub = '<uuid>';
   select language_dash.my_membership();                    -- {"member": false, "joined_at": null}
   select * from language_dash.my_groups();                 -- ERROR 42501 not_a_member
   select language_dash.join_language_dash();               -- {"member": true, ...}
   select * from language_dash.my_groups();                 -- works (empty)
   rollback;
   ```

### 5.2 Exact steps in the Supabase dashboard (scratch first, then the real project)

1. **Project Settings -> API (Data API) -> Exposed schemas**: add `language_dash`. **Keep `public`** (and `graphql_public`): removing it breaks
   Dx Dash. Leave "Extra search path" as it is.
2. **Schema access**: the migration already runs `GRANT USAGE ON SCHEMA language_dash TO anon, authenticated, service_role`, grants
   `service_role` ALL on every table, sequence and function and sets default privileges **for service_role only**. Do not add default
   privileges for `anon` or `authenticated` on this schema (lockdown would close what exists today, but a later table created by hand
   would start open). If you want to run it by hand anyway: `grant usage on schema language_dash to anon, authenticated, service_role;`
3. **Reload PostgREST's schema cache**: in the SQL editor run `NOTIFY pgrst, 'reload schema';` (or Project Settings -> Restart server /
   pause-restart if the API still answers "schema must be one of ..."). After changing the exposed-schemas list the dashboard reloads by
   itself, but run the NOTIFY anyway after applying the migration.
4. **Authentication -> Providers -> Allow anonymous sign-ins**: leave enabled (the game uses it). It is project-wide.
5. Schedule retention (optional but recommended): **Database -> Cron**: `select language_dash.analytics_purge(400);` daily.
6. Local development (`supabase start`): `supabase/config.toml` `[api] schemas` must also list `language_dash` next to `public`.
7. Client and edge functions (outside this tool): `createClient(url, key, { db: { schema: 'language_dash' } })` (or
   `.schema('language_dash').rpc(...)`); Realtime `postgres_changes` on `schema: 'language_dash', table: 'match_invites'`; after sign-in call
   `rpc('join_language_dash')` once (and `my_membership` to decide whether to show the join screen); deletion calls
   `rpc('delete_my_ld_data')`. Edge functions using the service role call `pro_grant_until` etc. on the `language_dash` schema.

### 5.3 The real project

Repeat 5.1 steps 3 to 6 and 5.2 on the shared project, in a quiet moment. The `public-fingerprint.sql` before/after comparison is the owner's
proof that Dx Dash was not touched.

## 6. Rollback

`tools/ld-migrate/rollback.sql` runs a single `DO` block: it prints a warning with the number of tables and Language Dash members it is about
to delete, refuses unless the line `confirm text := 'NO'` is changed to `'YES'`, and then runs `DROP SCHEMA language_dash CASCADE`. It
never touches `public`, `auth` or any other schema. The Language Dash table in the realtime publication goes away with the schema, which
restores the publication to Dx Dash's tables only. There is no undo: take a backup first if any real Language Dash data exists. Tested:
as shipped it refuses; with `YES` it drops the schema and `public`, `auth` and the catalog outside `language_dash` are identical to
before the migration.

## 7. What the local Postgres test proves

`npm run test:migration` (`tools/ld-migrate/test-local.mjs`) starts a throwaway PostgreSQL 16 on a unix socket only (no TCP, random port,
data directory in a fresh temp directory under the system temp dir, as the non-root OS user `postgres` via `runuser`, everything removed at
the end), builds a Supabase-like world (roles `anon`, `authenticated`, `service_role`, `authenticator`; a mock `auth` schema with
`auth.users`, `auth.uid()` reading `request.jwt.claim.sub`, `auth.jwt()`; Supabase's open default privileges on `public`) and a fake Dx Dash
`public` schema with identically named tables, views, functions, a policy, a trigger and rows, then:

* negative control: the original `database/schema.sql` run against that `public` fails 18 statements, changes `public`, overwrites Dx Dash's
  `has_block_between` and `scores_sanity`, and plants `delete_my_account()` (which deletes `auth.users`) in `public`;
* applies the generated migration (also with permissive default privileges already set on `language_dash`, the worst case for lockdown) and
  asserts: `pg_dump` of `public` and `auth` is byte-for-byte identical; a catalog inventory of every other schema (relations, columns,
  functions with body hash and ACL, types, policies, triggers, constraints, default privileges, publications, roles) is identical; only
  `language_dash.match_invites` was added to the publication; RLS on every table; anon reads only the leaderboard views, `scores`,
  `player_profiles` and writes nothing; no PUBLIC execute; every function pinned; exact allow-lists for `anon` and `authenticated`;
  `ld_member_gate` on exactly the gated tables; the generated audit returns no rows; the owner's `verify` query is all true;
* behaviour as `authenticated` with two members, one user who signed in through "another app" and one with nothing: non-members get
  `42501 not_a_member` from 17 representative RPCs (plpgsql and SQL-language) and see no rows; `join_language_dash` is idempotent;
  clients cannot write `members`; profile upsert, score submit (sanity and keep-best triggers), friend request and accept, activity feed,
  Pro trial, cloud save, group, deck, ranked stats, cohort and leaderboard flows work for members; a member cannot read another member's
  private rows or write as them; a friend request to a non-member fails on the foreign key; the "other app" user has no membership and no
  row in any language_dash table, also after a service-role `pro_grant_until` (only the payment row exists, and `delete_my_ld_data` clears
  it); `delete_my_ld_data` removes all of a member's rows (every table scanned) and the membership, leaves `auth.users` and the Dx Dash rows
  untouched, is blocked by a still-billing Stripe plan; `purge_user_data` and an `auth.users` delete both cascade;
* re-running the migration is idempotent (exit 0, same object counts, audit still empty, nothing outside `language_dash` changed);
* the rollback script refuses as shipped and, with the switch set, drops only `language_dash`.

Deviation from the brief: the Postgres data directory is under the system temp dir (`/tmp/ld-pg-*`, removed afterwards; override with
`LD_PG_TMP`), not under the Claude scratchpad, because that directory is mode 0700 root and PostgreSQL refuses to run as root.

## 8. Risks

1. **Shared service role key.** One `service_role` key opens every schema, Dx Dash included. A bug in a Language Dash edge function can
   read or write `public`. Keep Language Dash edge functions to `.schema('language_dash')` calls and review them accordingly.
2. **Shared Auth settings.** Providers, redirect URLs, email templates, rate limits, JWT secret and "Allow anonymous sign-ins" are
   project-wide; Language Dash's Apple/Google client ids and redirect URLs must be added next to the other apps', not replace them.
3. **The app must join.** After this migration a signed-in player who has not called `join_language_dash()` is refused everywhere
   (`42501 not_a_member`). The client has to call it (once, after sign-in) before any other RPC. The template's "profile appears by
   itself" behaviour is gone on purpose.
4. **Anonymous users join too.** Guests can join and will have a membership; guests that are never upgraded accumulate in `members` and
   the data tables, as they did before. No cleanup job exists for them.
5. **Realtime publication is shared.** Only `language_dash.match_invites` is added, but a project-wide object is touched (decision 2).
6. **Deleting the sign-in orphans Pro rows** unless `purge_user_data` runs first (payment tables have no foreign key by design). Handled: `ld-remove-signin` calls it before deleting the login.
7. **Resource sharing.** Connections, disk, `statement_timeout` and Postgres version are shared. The migration was tested on 16; it needs
   15+ (`security_invoker` views and `AS RESTRICTIVE` policies, which the template already required).
8. **Default privileges.** The migration runs `ALTER DEFAULT PRIVILEGES IN SCHEMA language_dash` for the migrating role only. Objects
   created later by another role or by hand follow Supabase's defaults for that role: re-run `audit-language-dash.sql` after any manual
   change; it must return no rows.
9. **`pro_make_code` still prefixes codes with `DX-`** (the template's heritage): cosmetic, edit `database/pro.sql` and regenerate.
10. **Leaderboard visibility.** Anonymous readers see the public leaderboard and profile names; a signed-in non-member sees nothing.
11. **Generated file.** Hand edits to the migration are lost on regeneration; change the template or `lib.mjs` and regenerate. The
    unit test and `--check` fail if the committed migration is stale.

## 9. Open decisions for the owner

1. **Foreign keys to `members` (default) or to `auth.users`** (`--fk-target=auth`). `members` makes a Language Dash row about a person who
   never joined impossible and gives one cascade point; `auth.users` matches the template exactly.
2. **Realtime for `match_invites`.** Keep the one-table `ALTER PUBLICATION`, or drop the DO block and poll.
3. **Gating `get_my_pro` and friends.** Today every signed-in RPC except `report_diagnostic` needs membership. A not-yet-member then cannot
   ask "do I have Pro?" before joining; the app can call `join_language_dash()` first.
4. **Leaderboard for non-members.** `anon` can read `scores` / `player_profiles` (template behaviour) but a signed-in non-member cannot. To
   hide the public leaderboard from everyone who has not joined, revoke the `anon` SELECT grants in the lockdown list.
5. **Guests joining.** Allowed today; require a non-anonymous sign-in (`auth.jwt() ->> 'is_anonymous'`) in `join_language_dash()` if not wanted.
6. **Retention job** for analytics and for abandoned guest memberships (cron).
7. **Who calls `purge_user_data`**: resolved. `ld-remove-signin` calls it (service role, required step, aborts before deleting the login if it fails).
