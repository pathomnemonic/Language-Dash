# Keeping Language Dash separate from Dx Dash (the browser side)

> The **backend is deliberately shared**: all the owner's apps use one Supabase project and one sign-in pool, with Language Dash living only in
> its own schema `language_dash` and its own membership. That model is in [BACKEND_AND_PAYMENTS.md](BACKEND_AND_PAYMENTS.md). This page is
> only about what shares a browser origin: local storage, caches, backups, room ids and the stored copy of the session.

Both games are served from the same host (`pathomnemonic.github.io`), and browsers give every page on one origin the same
localStorage, IndexedDB and Cache Storage. A page path (`/Language-Dash/` vs `/buzzword-dash-v2/`) does NOT separate them.
So Language Dash uses names nothing else uses, and `tests/unit/silo.test.js` fails if that ever slips.

| Thing | Language Dash | (Dx Dash used) |
|---|---|---|
| Save file key | `langdash_save_v1@<site path>` | `buzzword_dash_v1@...` |
| Other storage keys | `ld_*`, `langdash_*` | `dx_*`, `dxdash_*`, `buzzword_*` |
| Window events | `ld:*` | `dx:*` |
| Service worker caches | `language-dash-<build>`, `language-dash-assets`; it deletes only caches starting `language-dash-` | `dx-dash-<build>`, `dx-assets` |
| Backup file | `langdash-save.json`, marker `app: "language-dash"` (a Dx Dash backup is refused on import) | `dxdash-save.json`, `buzzword-dash` |
| Versus room ids (PeerJS) | `languagedash1-<code>` | other prefix |
| Stored copy of the Supabase session | `storageKey: 'langdash-auth'` (the login itself is shared, the browser copy is not) | `sb-<project>-auth-token` |
| Store/app ids | `com.pathomnemonic.languagedash`, product `languagedash_library` | `com.pathomnemonic.dxdash` |

## Supabase (one shared project; see BACKEND_AND_PAYMENTS.md)
1. Language Dash does **not** get a Supabase project of its own. Its tables and functions live in the `language_dash` schema of the
   shared project; Dx Dash stays in `public`. Nothing of Language Dash is created in `public`.
2. Apply the `language_dash` migration (`supabase/migrations/`) to a **scratch project first**, review the migration diff, then apply it
   to the shared project (order: `docs/BACKEND_AND_PAYMENTS.md`, "Deployment order").
3. Put the shared project's URL and anon key in this repo's GitHub **secrets/variables** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   (the deploy workflow reads them). With no keys the game runs fully offline and accounts/leaderboards simply stay off.
4. Deploy `supabase/functions/ld-*` with the `LD_`-prefixed secrets (never an unprefixed name: another app's value would be picked up).
5. The sign-in redirect URLs must include `https://pathomnemonic.github.io/Language-Dash/`, its `/**` form and
   `com.pathomnemonic.languagedash://auth`.
6. A login is shared across apps; a Language Dash **membership** is created only inside Language Dash, deliberately. Data, Pro
   subscriptions and deletion are per app.

## The other game's service worker (fixed on a branch, needs merging)
Dx Dash's `public/sw.js` deleted every cache that was not its own when it updated, which on the shared host also deleted Language
Dash's caches (only a re-download, but still a cross-over). The fix (delete only caches starting `dx-`) is committed in the
`buzzword-dash-v2` repo on branch `ccr-bd150d31-nr1rph`. Merge that branch and redeploy Dx Dash to apply it; nothing was merged or
deployed for you. Only a separate origin (a custom domain, or a different GitHub account) gives complete isolation; naming keeps
data apart in practice, and `tests/unit/silo.test.js` guards it from this side.

## Checklist for any future game on this host
Pick a unique prefix, never read an unsuffixed key from another game, give the service worker a prefix filter, give Supabase its
own schema, membership, `LD_`-style secret prefix, function prefix and `storageKey`, and use a unique PeerJS prefix and store product ids.
