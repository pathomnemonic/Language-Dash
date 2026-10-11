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

## One caveat that lives in the other game
Dx Dash's service worker (`public/sw.js` in that repo) deletes every cache whose name is not its own when it updates. On the
shared host that also deletes Language Dash's caches, which only costs a re-download. Changing its `activate` filter to
`k.indexOf('dx-') === 0 && ...` fixes it. Only a separate origin (a custom domain, or a different GitHub account) gives
complete isolation; naming keeps data apart in practice.
