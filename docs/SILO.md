# Keeping Language Dash separate from Dx Dash

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
| Supabase auth session | `storageKey: 'langdash-auth'` | `sb-<project>-auth-token` |
| Store/app ids | `com.pathomnemonic.languagedash`, product `languagedash_library` | `com.pathomnemonic.dxdash` |

## Supabase (do this once, with a NEW project)
1. Create a **new** Supabase project for Language Dash. Never reuse the Dx Dash project: users, leaderboards, Pro entitlements,
   friends and analytics would mix.
2. Run the SQL in `database/` in order (schema, policies, pro, analytics ...) in the new project.
3. Put the new project's URL and anon key in this repo's GitHub **secrets/variables** `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` (the deploy workflow reads them). The code has no hard-coded project: with no keys the game runs
   fully offline and accounts/leaderboards simply stay off.
4. Deploy `supabase/functions/*` to the new project with its own Stripe keys and webhook secret (see `docs/PRO.md`).
5. The Apple/Google sign-in redirect URLs must list `com.pathomnemonic.languagedash://auth` and the Language Dash site URL only.

## The other game's service worker (fixed on a branch, needs merging)
Dx Dash's `public/sw.js` deleted every cache that was not its own when it updated, which on the shared host also deleted Language
Dash's caches (only a re-download, but still a cross-over). The fix (delete only caches starting `dx-`) is committed in the
`buzzword-dash-v2` repo on branch `ccr-bd150d31-nr1rph`. Merge that branch and redeploy Dx Dash to apply it; nothing was merged or
deployed for you. Only a separate origin (a custom domain, or a different GitHub account) gives complete isolation; naming keeps
data apart in practice, and `tests/unit/silo.test.js` guards it from this side.

## Checklist for any future game on this host
Pick a unique prefix, never read an unsuffixed key from another game, give the service worker a prefix filter, give Supabase its
own project and `storageKey`, and use a unique PeerJS prefix and store product ids.
