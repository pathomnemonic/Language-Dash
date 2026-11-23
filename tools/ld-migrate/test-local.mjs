#!/usr/bin/env node
// Postgres-backed proof for the generated migration. NOT part of `npx vitest run` (needs the PostgreSQL 16 server binaries):
//
//   node tools/ld-migrate/test-local.mjs [--keep] [--json out.json]     (or: npm run test:migration)
//
// What it does, all on THIS machine and nothing else:
//   * starts a throwaway PostgreSQL cluster (unix socket only, no TCP, random port, data dir under a fresh temp dir) as a
//     non-root OS user (it uses `runuser -u postgres` when started as root), and removes everything when it ends;
//   * builds a Supabase-like world: roles anon / authenticated / service_role / authenticator, a mock `auth` schema
//     (auth.users, auth.uid(), auth.jwt()), and a fake "Dx Dash" `public` schema whose tables and functions have the SAME names
//     as the Language Dash template, with rows;
//   * NEGATIVE CONTROL: runs the ORIGINAL database/schema.sql against that public schema and shows that it collides;
//   * runs the generated migration and asserts: nothing outside language_dash changed (byte-for-byte pg_dump of public and
//     auth, plus a catalog inventory of every other schema), RLS everywhere, pinned search_paths, who may call what, the
//     membership behaviour, the gate, the core flows, per-user isolation, deletion, re-running, the search_path guard and the
//     rollback script. Exit code 0 only if every check passes.

import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, chmodSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { generate } from './lib.mjs';
import { readTemplates, MIGRATION_PATH, AUDIT_PATH, VERIFY_PATH } from './generate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const PGBIN = process.env.PGBIN || '/usr/lib/postgresql/16/bin';
const ROLLBACK_PATH = join(here, 'rollback.sql');
const FINGERPRINT_PATH = join(here, 'public-fingerprint.sql');
const keep = process.argv.includes('--keep');
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;

// ---------------------------------------------------------------------------------------------------------------------
// throwaway server
// ---------------------------------------------------------------------------------------------------------------------
const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
let base = null;
let sockDir = null;
let port = 0;
const SU = 'ldadmin';

function asPg(cmd, args, opts = {}) {
  const bin = join(PGBIN, cmd);
  if (isRoot) return spawnSync('runuser', ['-u', 'postgres', '--', bin, ...args], { encoding: 'utf8', ...opts });
  return spawnSync(bin, args, { encoding: 'utf8', ...opts });
}

function startServer() {
  if (!existsSync(join(PGBIN, 'postgres'))) throw new Error('PostgreSQL server binaries not found in ' + PGBIN + ' (set PGBIN)');
  base = mkdtempSync(join(process.env.LD_PG_TMP || tmpdir(), 'ld-pg-'));
  chmodSync(base, 0o755);
  sockDir = join(base, 's');
  mkdirSync(sockDir);
  mkdirSync(join(base, 'data'));
  if (isRoot) execFileSync('chown', ['-R', 'postgres:postgres', base]);
  chmodSync(sockDir, 0o777);
  port = 20000 + Math.floor(Math.random() * 40000);
  let r = asPg('initdb', ['-D', join(base, 'data'), '-U', SU, '-A', 'trust', '--no-sync', '-E', 'UTF8', '--locale=C']);
  if (r.status !== 0) throw new Error('initdb failed: ' + r.stderr);
  const opts = ['-c', "listen_addresses=''", '-c', 'unix_socket_directories=' + sockDir, '-p', String(port), '-c', 'fsync=off', '-c', 'synchronous_commit=off',
    '-c', 'max_connections=40', '-c', 'shared_buffers=16MB'].join(' ');
  r = asPg('pg_ctl', ['-D', join(base, 'data'), '-o', opts, '-w', '-t', '60', '-l', join(base, 'server.log'), 'start']);
  if (r.status !== 0) throw new Error('pg_ctl start failed: ' + r.stderr + readLog());
}
function readLog() {
  try { return '\n' + readFileSync(join(base, 'server.log'), 'utf8').slice(-2000); } catch { return ''; }
}
function stopServer() {
  if (!base) return;
  try { asPg('pg_ctl', ['-D', join(base, 'data'), '-m', 'immediate', '-w', 'stop']); } catch { /* already gone */ }
  if (!keep) { try { rmSync(base, { recursive: true, force: true }); } catch { /* best effort */ } }
  else console.log('kept ' + base);
  base = null;
}
process.on('SIGINT', () => { stopServer(); process.exit(130); });
process.on('SIGTERM', () => { stopServer(); process.exit(143); });

const connArgs = (db) => ['-h', sockDir, '-p', String(port), '-U', SU, '-d', db];

// run SQL text through psql. opts: {stop: true -> ON_ERROR_STOP, role, sub, anonymous}
function psql(db, sql, opts = {}) {
  let pre = '';
  if (opts.role) {
    const sub = opts.sub || '';
    const claims = JSON.stringify(sub ? { sub, role: opts.role, is_anonymous: !!opts.anonymous } : { role: opts.role });
    pre = "SET ROLE " + opts.role + ";\nSET request.jwt.claim.sub = '" + sub + "';\nSET request.jwt.claims = '" + claims + "';\n";
  }
  const args = ['-X', '-q', '-At', '-F', '|', '-v', 'VERBOSITY=verbose', '-v', 'SHOW_CONTEXT=never', ...(opts.stop === false ? [] : ['-v', 'ON_ERROR_STOP=1']), ...connArgs(db)];
  const r = spawnSync(join(PGBIN, 'psql'), args, { input: pre + sql, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const err = r.stderr || '';
  const m = /ERROR:\s+([0-9A-Z]{5}):\s+(.*)/.exec(err);
  return {
    code: r.status,
    out: (r.stdout || '').trim(),
    rows: (r.stdout || '').trim() ? (r.stdout || '').trim().split('\n').map((l) => l.split('|')) : [],
    err,
    sqlstate: m ? m[1] : null,
    msg: m ? m[2] : null,
    errors: (err.match(/ERROR:/g) || []).length
  };
}
function psqlFile(db, file, opts = {}) {
  const args = ['-X', '-q', '-At', '-v', 'VERBOSITY=verbose', ...(opts.stop === false ? [] : ['-v', 'ON_ERROR_STOP=1']), ...connArgs(db), '-f', file];
  const r = spawnSync(join(PGBIN, 'psql'), args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status, out: (r.stdout || '').trim(), err: r.stderr || '', errors: ((r.stderr || '').match(/ERROR:/g) || []).length };
}
let dumpSeq = 0;
function dump(db, schema) {
  const r = spawnSync(join(PGBIN, 'pg_dump'), [...connArgs(db), '--schema=' + schema], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('pg_dump failed: ' + r.stderr);
  if (process.env.LD_DEBUG_DUMPS) writeFileSync(join(process.env.LD_DEBUG_DUMPS, db + '-' + schema + '-' + String(++dumpSeq).padStart(2, '0') + '.sql'), r.stdout);
  const stable = r.stdout.replace(/^\\(un)?restrict .*$/gm, '');
  return createHash('sha256').update(stable).digest('hex');
}

// ---------------------------------------------------------------------------------------------------------------------
// tiny check framework
// ---------------------------------------------------------------------------------------------------------------------
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: ok ? '' : String(detail || '') });
  console.log((ok ? '  ok   ' : '  FAIL ') + name + (ok ? '' : '\n         ' + String(detail || '').split('\n').join('\n         ')));
}
function section(t) { console.log('\n' + t); }

// ---------------------------------------------------------------------------------------------------------------------
// mock Supabase + fake Dx Dash
// ---------------------------------------------------------------------------------------------------------------------
const U = {
  u1: '11111111-1111-4111-8111-111111111111', // joins Language Dash
  u2: '22222222-2222-4222-8222-222222222222', // joins Language Dash
  u3: '33333333-3333-4333-8333-333333333333', // signed in through ANOTHER app only
  u4: '44444444-4444-4444-8444-444444444444' // signed in, no app data at all
};

const ROLES_SQL = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN CREATE ROLE authenticator LOGIN NOINHERIT; END IF;
END $$;
GRANT anon, authenticated, service_role TO authenticator;
GRANT anon, authenticated, service_role TO ${SU};
`;

const BOOTSTRAP_SQL = `
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, is_anonymous boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $f$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $f$
  SELECT coalesce(nullif(current_setting('request.jwt.claim', true), ''), nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $f$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.jwt() TO anon, authenticated, service_role;
GRANT ALL ON auth.users TO service_role;

-- what Supabase does for the public schema: everything is open to the API roles by default
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

INSERT INTO auth.users (id, email) VALUES
  ('${U.u1}', 'one@example.test'), ('${U.u2}', 'two@example.test'), ('${U.u3}', 'three-dxdash-only@example.test'), ('${U.u4}', 'four@example.test');

-- ---- fake "Dx Dash": same object names as the Language Dash template, different shapes, with rows ----
CREATE TABLE public.player_profiles (user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE, display_name text, xp integer NOT NULL DEFAULT 0);
CREATE TABLE public.scores (id bigserial PRIMARY KEY, user_id uuid REFERENCES auth.users (id), points integer, game text);
CREATE TABLE public.friends (a uuid, b uuid, state text);
CREATE TABLE public.match_invites (id serial PRIMARY KEY, who uuid, payload jsonb);
CREATE TABLE public.pro_entitlements (user_id uuid PRIMARY KEY, tier text, valid_until timestamptz);
CREATE TABLE public.analytics_events (id bigserial PRIMARY KEY, name text, props jsonb);
CREATE TABLE public.player_saves (user_id uuid PRIMARY KEY, blob text);
ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY dx_profiles_read ON public.player_profiles FOR SELECT USING (true);
CREATE FUNCTION public.has_block_between(a uuid, b uuid) RETURNS boolean LANGUAGE sql STABLE AS $f$ SELECT false $f$;
CREATE FUNCTION public.scores_sanity() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RETURN NEW; END $f$;
CREATE FUNCTION public.upsert_player_profile(p_user_id uuid, p_name text) RETURNS void LANGUAGE sql AS $f$ SELECT 1 $f$;
CREATE FUNCTION public.delete_my_account() RETURNS void LANGUAGE sql AS $f$ SELECT 'dx dash version' $f$;
CREATE VIEW public.leaderboard_best AS SELECT user_id, sum(points) AS points FROM public.scores GROUP BY user_id;
CREATE TRIGGER dx_scores_sanity BEFORE INSERT ON public.scores FOR EACH ROW EXECUTE FUNCTION public.scores_sanity();
INSERT INTO public.player_profiles VALUES ('${U.u1}', 'One (Dx)', 10), ('${U.u3}', 'Three (Dx)', 99);
INSERT INTO public.scores (user_id, points, game) VALUES ('${U.u3}', 500, 'dx'), ('${U.u3}', 700, 'dx'), ('${U.u1}', 5, 'dx');
INSERT INTO public.friends VALUES ('${U.u3}', '${U.u1}', 'accepted');
INSERT INTO public.match_invites (who, payload) VALUES ('${U.u3}', '{"room":"ABCDE"}');
INSERT INTO public.pro_entitlements VALUES ('${U.u3}', 'dxpro', now() + interval '300 days');
INSERT INTO public.analytics_events (name, props) VALUES ('dx_open', '{}'), ('dx_close', '{}');
INSERT INTO public.player_saves VALUES ('${U.u3}', 'dx save');
CREATE PUBLICATION supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_invites;
`;

// everything that exists outside language_dash, as sorted text lines
const INVENTORY_SQL = `
WITH ns AS (SELECT oid, nspname, nspacl FROM pg_namespace WHERE nspname NOT LIKE 'pg\\_%' AND nspname <> 'information_schema' AND nspname <> 'language_dash')
SELECT line FROM (
  SELECT 'schema ' || nspname || ' ' || coalesce(nspacl::text, '') AS line FROM ns
  UNION ALL SELECT 'rel ' || n.nspname || '.' || c.relname || ' ' || c.relkind::text || ' ' || coalesce(c.relacl::text, '') || ' rls=' || c.relrowsecurity::text
    FROM pg_class c JOIN ns n ON n.oid = c.relnamespace
  UNION ALL SELECT 'attr ' || n.nspname || '.' || c.relname || '.' || a.attname || ' ' || format_type(a.atttypid, a.atttypmod) || ' ' || a.attnotnull::text
    FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN ns n ON n.oid = c.relnamespace WHERE a.attnum > 0 AND NOT a.attisdropped
  UNION ALL SELECT 'proc ' || n.nspname || '.' || p.oid::regprocedure::text || ' ' || md5(p.prosrc) || ' ' || coalesce(p.proacl::text, '') || ' ' || coalesce(p.proconfig::text, '')
    FROM pg_proc p JOIN ns n ON n.oid = p.pronamespace
  UNION ALL SELECT 'type ' || n.nspname || '.' || t.typname || ' ' || t.typtype::text FROM pg_type t JOIN ns n ON n.oid = t.typnamespace
  UNION ALL SELECT 'policy ' || schemaname || '.' || tablename || '.' || policyname || ' ' || permissive || ' ' || coalesce(qual, '') || ' ' || coalesce(with_check, '')
    FROM pg_policies WHERE schemaname <> 'language_dash'
  UNION ALL SELECT 'trigger ' || n.nspname || '.' || c.relname || '.' || t.tgname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN ns n ON n.oid = c.relnamespace WHERE NOT t.tgisinternal
  UNION ALL SELECT 'constraint ' || n.nspname || '.' || c.relname || '.' || k.conname || ' ' || pg_get_constraintdef(k.oid)
    FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid JOIN ns n ON n.oid = c.relnamespace
  UNION ALL SELECT 'defacl ' || coalesce(n.nspname, '*') || ' ' || d.defaclrole::regrole::text || ' ' || d.defaclobjtype::text || ' ' || coalesce(d.defaclacl::text, '')
    FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace WHERE n.nspname IS DISTINCT FROM 'language_dash'
  UNION ALL SELECT 'publication ' || pubname || ' ' || puballtables::text FROM pg_publication
  UNION ALL SELECT 'pubtable ' || pubname || ' ' || schemaname || '.' || tablename FROM pg_publication_tables WHERE schemaname <> 'language_dash'
  UNION ALL SELECT 'role ' || rolname || ' ' || rolbypassrls::text || ' ' || rolcanlogin::text FROM pg_roles WHERE rolname !~ '^pg_'
  UNION ALL SELECT 'ext ' || extname FROM pg_extension
) x ORDER BY line`;

function inventory(db) {
  const r = psql(db, INVENTORY_SQL);
  if (r.code !== 0) throw new Error('inventory failed: ' + r.err);
  return r.out;
}
function publicRows(db) {
  return psql(db, `SELECT 'profiles', count(*) FROM public.player_profiles UNION ALL SELECT 'scores', count(*) FROM public.scores UNION ALL SELECT 'friends', count(*) FROM public.friends UNION ALL SELECT 'pro', count(*) FROM public.pro_entitlements UNION ALL SELECT 'events', count(*) FROM public.analytics_events UNION ALL SELECT 'users', count(*) FROM auth.users`).out;
}
function newDb(name) {
  let r = psql('postgres', 'CREATE DATABASE ' + name);
  if (r.code !== 0) throw new Error(r.err);
  r = psql(name, BOOTSTRAP_SQL);
  if (r.code !== 0) throw new Error('bootstrap failed: ' + r.err);
}

// run as a signed-in user
const as = (db, user, sql, extra = {}) => psql(db, sql, { role: 'authenticated', sub: U[user], ...extra, stop: true });
const anon = (db, sql) => psql(db, sql, { role: 'anon' });
const svc = (db, sql) => psql(db, sql, { role: 'service_role' });

function ldCounts(db) {
  return psql(db, `SELECT (SELECT count(*) FROM pg_class WHERE relnamespace = 'language_dash'::regnamespace) || '/' || (SELECT count(*) FROM pg_proc WHERE pronamespace = 'language_dash'::regnamespace) || '/' || (SELECT count(*) FROM pg_policies WHERE schemaname = 'language_dash') || '/' || (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE c.relnamespace = 'language_dash'::regnamespace AND NOT t.tgisinternal) || '/' || (SELECT count(*) FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid WHERE c.relnamespace = 'language_dash'::regnamespace)`).out;
}

// every row of every language_dash table that mentions this uuid
function traces(db, uuid) {
  const r = psql(db, `SELECT t.table_name, (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM language_dash.%I t WHERE t::text LIKE %L', t.table_name, '%${uuid}%'), false, true, '')))[1]::text::int AS n
    FROM information_schema.tables t WHERE t.table_schema = 'language_dash' AND t.table_type = 'BASE TABLE' ORDER BY 1`);
  return r.rows.filter((x) => Number(x[1]) > 0).map((x) => x[0] + '=' + x[1]);
}

// ---------------------------------------------------------------------------------------------------------------------
async function main() {
  console.log('ld-migrate local test: throwaway PostgreSQL ' + PGBIN);
  const fresh = await generate(readTemplates());
  const diskSql = existsSync(MIGRATION_PATH) ? readFileSync(MIGRATION_PATH, 'utf8') : '';
  section('0. the migration on disk is what the generator writes');
  check('supabase/migrations/20261201000000_language_dash.sql is up to date', diskSql === fresh.sql, 'run: node tools/ld-migrate/generate.mjs');
  check('out/verify-language-dash.sql is up to date', existsSync(VERIFY_PATH) && readFileSync(VERIFY_PATH, 'utf8') === fresh.verify, 'run: node tools/ld-migrate/generate.mjs');
  check('out/audit-language-dash.sql is up to date', existsSync(AUDIT_PATH) && readFileSync(AUDIT_PATH, 'utf8') === fresh.audit, 'run: node tools/ld-migrate/generate.mjs');
  const report = fresh.report;

  startServer();
  console.log('server up on unix socket ' + sockDir + ' port ' + port + ' (no TCP)');
  let r = psql('postgres', ROLES_SQL);
  if (r.code !== 0) throw new Error('roles: ' + r.err);

  // ------------------------------------------------------------------------------------------ negative control
  section('1. NEGATIVE CONTROL: the ORIGINAL database/schema.sql run against a project whose public schema is Dx Dash');
  newDb('collide');
  const collideBefore = inventory('collide');
  const collideDumpBefore = dump('collide', 'public');
  const collideRowsBefore = publicRows('collide');
  const orig = psqlFile('collide', join(root, 'database', 'schema.sql'), { stop: false });
  const collideAfter = inventory('collide');
  const collideDumpAfter = dump('collide', 'public');
  const procOf = (db, sig) => psql(db, `SELECT prosrc FROM pg_proc WHERE oid = '${sig}'::regprocedure`).out;
  const clobbered = [];
  for (const [sig, marker] of [['public.has_block_between(uuid, uuid)', 'auth.uid()'], ['public.scores_sanity()', 'scores_coming_too_fast|too fast'], ['public.delete_my_account()', 'DELETE FROM auth.users']]) {
    const src = procOf('collide', sig);
    if (new RegExp(marker).test(src)) clobbered.push(sig);
  }
  console.log('  original schema.sql in public: ' + orig.errors + ' statements failed, public dump changed: ' + (collideDumpBefore !== collideDumpAfter) + ', clobbered Dx Dash functions: ' + (clobbered.join(', ') || 'none'));
  check('negative control: original schema.sql errors on the identically named tables', orig.errors > 0, 'expected collisions, got ' + orig.errors);
  check('negative control: it changes the public schema (pg_dump differs)', collideDumpBefore !== collideDumpAfter, 'public unchanged?!');
  check('negative control: it overwrites Dx Dash functions with the Language Dash versions', clobbered.length >= 2, clobbered.join(','));
  check('negative control: it plants delete_my_account(), which deletes auth.users, in public', clobbered.includes('public.delete_my_account()'), clobbered.join(','));
  check('negative control: catalog inventory outside language_dash differs', collideBefore !== collideAfter, '');
  void collideRowsBefore;

  // ------------------------------------------------------------------------------------------ guard
  section('2. the search_path guard stops a run that is not inside a transaction');
  newDb('guard');
  const guardBefore = inventory('guard');
  const guardDumpBefore = dump('guard', 'public');
  const noTx = fresh.sql.replace(/^BEGIN;$/m, '').replace(/^COMMIT;$/m, '');
  const gfile = join(base, 'no-tx.sql');
  writeFileSync(gfile, noTx);
  const g = psqlFile('guard', gfile);
  check('migration without BEGIN is refused (non-zero exit, guard message)', g.code !== 0 && /migration refused/.test(g.err), g.err.slice(0, 300));
  check('after the refused run public and every other schema are untouched', dump('guard', 'public') === guardDumpBefore && inventory('guard') === guardBefore, 'guard run leaked');
  const gtables = psql('guard', "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'language_dash' AND c.relkind IN ('r', 'v')").out;
  check('and no language_dash table was created either', gtables === '0', gtables);

  section('2b. the documented dry run (COMMIT replaced by ROLLBACK) persists nothing');
  newDb('dry');
  const dryBefore = inventory('dry');
  const dryFile = join(base, 'dry.sql');
  writeFileSync(dryFile, fresh.sql.replace(/^COMMIT;$/m, 'ROLLBACK;'));
  const dry = psqlFile('dry', dryFile);
  check('dry run exits 0', dry.code === 0, dry.err.slice(0, 300));
  check('…and leaves no language_dash schema behind', psql('dry', "SELECT count(*) FROM pg_namespace WHERE nspname = 'language_dash'").out === '0' && inventory('dry') === dryBefore, 'dry run persisted');

  // ------------------------------------------------------------------------------------------ main
  section('3. apply the generated migration next to Dx Dash');
  newDb('main');
  // worst case for lockdown: someone already granted default privileges on the new schema to the API roles
  psql('main', `CREATE SCHEMA language_dash;
    ALTER DEFAULT PRIVILEGES IN SCHEMA language_dash GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA language_dash GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA language_dash GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;`);
  const invBefore = inventory('main');
  const fpBefore = psqlFile('main', FINGERPRINT_PATH).out;
  const pubDumpBefore = dump('main', 'public');
  const authDumpBefore = dump('main', 'auth');
  const rowsBefore = publicRows('main');
  const t0 = Date.now();
  const mig = psqlFile('main', MIGRATION_PATH);
  check('migration applies with ON_ERROR_STOP (exit 0)', mig.code === 0, mig.err.slice(0, 600));
  console.log('  applied in ' + (Date.now() - t0) + ' ms');
  const notices = (mig.err.match(/WARNING|NOTICE/g) || []).length;
  void notices;
  if (process.env.LD_DEBUG_SQL) console.log(psql('main', readFileSync(process.env.LD_DEBUG_SQL, 'utf8')).out);
  const invAfter = inventory('main');
  const ldCounts1 = ldCounts('main');

  section('4. nothing outside language_dash changed');
  check('public-fingerprint.sql (the owner\'s before/after query) gives the same answer', psqlFile('main', FINGERPRINT_PATH).out === fpBefore && fpBefore.length > 10, fpBefore);
  const ver = psqlFile('main', VERIFY_PATH);
  const verBad = ver.out.split('\n').filter((l) => l && !/\|t$/.test(l));
  check('verify-language-dash.sql (the owner\'s post-migration query): all ' + ver.out.split('\n').length + ' rows ok', ver.code === 0 && verBad.length === 0, ver.err + verBad.join('\n'));
  check('public: pg_dump (schema + data) is byte-for-byte identical', dump('main', 'public') === pubDumpBefore, 'public changed');
  check('auth: pg_dump is byte-for-byte identical', dump('main', 'auth') === authDumpBefore, 'auth changed');
  check('every other schema: catalog inventory (relations, columns, functions, types, policies, triggers, constraints, grants, default privileges, publications, roles) is identical', invAfter === invBefore,
    (() => { const a = new Set(invBefore.split('\n')); return invAfter.split('\n').filter((l) => !a.has(l)).slice(0, 8).join('\n'); })());
  const schemas = psql('main', "SELECT string_agg(nspname, ',' ORDER BY nspname) FROM pg_namespace WHERE nspname NOT LIKE 'pg\\_%' AND nspname <> 'information_schema'").out;
  check('the only schemas are auth, language_dash, public', schemas === 'auth,language_dash,public', schemas);
  const ldMembersInPub = psql('main', "SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname IN ('members')").out;
  check('no members table in public', ldMembersInPub === '0', ldMembersInPub);
  const pubWithLd = psql('main', "SELECT count(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prosrc ~ 'is_member|ld_member_gate|language_dash'").out;
  check('no public function mentions language_dash or the member gate', pubWithLd === '0', pubWithLd);
  const pubPol = psql('main', "SELECT policyname FROM pg_policies WHERE schemaname = 'public'").out;
  check('public has only its own policy (no ld_member_gate)', pubPol === 'dx_profiles_read', pubPol);
  const pub = psql('main', "SELECT pubname || ':' || schemaname || '.' || tablename FROM pg_publication_tables ORDER BY 1").out;
  check('realtime publication: public.match_invites untouched, language_dash.match_invites added', pub === 'supabase_realtime:language_dash.match_invites\nsupabase_realtime:public.match_invites', pub);

  section('5. structure of language_dash');
  const counts = psql('main', `SELECT
    (SELECT count(*) FROM pg_class WHERE relnamespace = 'language_dash'::regnamespace AND relkind = 'r'),
    (SELECT count(*) FROM pg_class WHERE relnamespace = 'language_dash'::regnamespace AND relkind = 'v'),
    (SELECT count(*) FROM pg_proc WHERE pronamespace = 'language_dash'::regnamespace)`).rows[0].map(Number);
  check('tables created = ' + report.tables.length + ' (template tables + members)', counts[0] === report.tables.length, counts[0]);
  check('views created = ' + report.views.length, counts[1] === report.views.length, counts[1]);
  check('functions created = ' + report.functions.length, counts[2] === report.functions.length, counts[2] + ' vs ' + report.functions.length);
  const noRls = psql('main', "SELECT string_agg(relname, ',') FROM pg_class WHERE relnamespace = 'language_dash'::regnamespace AND relkind IN ('r', 'p') AND NOT relrowsecurity").out;
  check('(b) every language_dash table has row level security enabled', noRls === '', noRls);
  const anonSelect = psql('main', `SELECT string_agg(relname, ',' ORDER BY relname) FROM pg_class WHERE relnamespace = 'language_dash'::regnamespace AND relkind IN ('r', 'v', 'm', 'p') AND has_table_privilege('anon', oid, 'SELECT')`).out;
  check('(b) anon can SELECT only the leaderboard views, scores and profiles', anonSelect === 'leaderboard_alltime,leaderboard_best,player_profiles,scores', anonSelect);
  const anonWrite = psql('main', `SELECT string_agg(relname, ',') FROM pg_class WHERE relnamespace = 'language_dash'::regnamespace AND relkind IN ('r', 'v', 'm', 'p') AND (has_table_privilege('anon', oid, 'INSERT') OR has_table_privilege('anon', oid, 'UPDATE') OR has_table_privilege('anon', oid, 'DELETE') OR has_table_privilege('anon', oid, 'TRUNCATE'))`).out;
  check('(b) anon can write nothing', anonWrite === '', anonWrite);
  const authShape = psql('main', `SELECT string_agg(relname, ',') FROM pg_class WHERE relnamespace = 'language_dash'::regnamespace AND relkind IN ('r', 'v', 'm', 'p') AND (has_table_privilege('authenticated', oid, 'TRUNCATE') OR has_table_privilege('authenticated', oid, 'TRIGGER') OR has_table_privilege('authenticated', oid, 'REFERENCES'))`).out;
  check('(b) authenticated can truncate / re-shape nothing', authShape === '', authShape);
  const memberWrite = psql('main', `SELECT has_table_privilege('authenticated', 'language_dash.members', 'INSERT'), has_table_privilege('authenticated', 'language_dash.members', 'UPDATE'), has_table_privilege('authenticated', 'language_dash.members', 'DELETE'), has_table_privilege('authenticated', 'language_dash.members', 'SELECT')`).out;
  check('members: authenticated has SELECT only', memberWrite === 'f|f|f|t', memberWrite);
  const unpinned = psql('main', `SELECT string_agg(p.oid::regprocedure::text, ', ') FROM pg_proc p WHERE p.pronamespace = 'language_dash'::regnamespace AND NOT coalesce(p.proconfig::text LIKE '%search_path=language_dash, pg_temp%', false)`).out;
  check('(c) every function in language_dash pins search_path to language_dash, pg_temp', unpinned === '', unpinned);
  const secdefUnpinned = psql('main', `SELECT count(*) FROM pg_proc p WHERE p.pronamespace = 'language_dash'::regnamespace AND p.prosecdef AND NOT coalesce(p.proconfig::text ILIKE '%search_path=language_dash%', false)`).out;
  check('(c) …in particular every SECURITY DEFINER function', secdefUnpinned === '0', secdefUnpinned);
  const secdefCount = psql('main', "SELECT count(*) FROM pg_proc WHERE pronamespace = 'language_dash'::regnamespace AND prosecdef").out;
  console.log('  security definer functions: ' + secdefCount);
  const pubExec = psql('main', `SELECT string_agg(p.proname, ',') FROM pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE p.pronamespace = 'language_dash'::regnamespace AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'`).out;
  check('no function is executable by PUBLIC', pubExec === '', pubExec);
  const anonExec = psql('main', `SELECT string_agg(proname, ',' ORDER BY proname) FROM pg_proc WHERE pronamespace = 'language_dash'::regnamespace AND has_function_privilege('anon', oid, 'EXECUTE')`).out;
  check('anon can execute only the three anonymous analytics functions', anonExec === 'count_consent,delete_analytics,ingest_analytics', anonExec);
  const authExec = psql('main', `SELECT string_agg(proname, ',' ORDER BY proname) FROM pg_proc WHERE pronamespace = 'language_dash'::regnamespace AND has_function_privilege('authenticated', oid, 'EXECUTE')`).out.split(',');
  const wantAuth = report.functions.filter((f) => f.decision === 'gate' || ['has_block_between', 'is_group_member', 'can_see_post', 'can_see_activity', 'report_diagnostic', 'is_member', 'my_membership', 'join_language_dash', 'delete_my_ld_data', 'ingest_analytics', 'delete_analytics', 'count_consent'].includes(f.name)).map((f) => f.name);
  const extraAuth = authExec.filter((n) => !wantAuth.includes(n));
  const missAuth = wantAuth.filter((n) => !authExec.includes(n));
  check('authenticated can execute exactly the signed-in allow-list (+ the 3 anonymous ones)', !extraAuth.length && !missAuth.length, 'extra: ' + extraAuth + ' missing: ' + missAuth);
  const noExecAuth = psql('main', `SELECT string_agg(proname, ',') FROM pg_proc WHERE pronamespace = 'language_dash'::regnamespace AND proname IN ('pro_grant_until','pro_grant','purge_user_data','require_member','analytics_purge','pro_make_code') AND has_function_privilege('authenticated', oid, 'EXECUTE')`).out;
  check('authenticated cannot execute pro_grant*, purge_user_data, require_member, analytics_purge, pro_make_code', noExecAuth === '', noExecAuth);
  const svcExec = psql('main', `SELECT count(*) FROM pg_proc WHERE pronamespace = 'language_dash'::regnamespace AND NOT has_function_privilege('service_role', oid, 'EXECUTE')`).out;
  check('service_role can execute every function', svcExec === '0', svcExec);
  const gateRows = psql('main', "SELECT tablename FROM pg_policies WHERE schemaname = 'language_dash' AND policyname = 'ld_member_gate' AND permissive = 'RESTRICTIVE' AND 'authenticated' = ANY (roles) AND cmd = 'ALL' ORDER BY 1").rows.map((x) => x[0]);
  const wantGate = report.tables.filter((t) => t.gated).map((t) => t.name).sort();
  check('ld_member_gate (RESTRICTIVE, FOR ALL, authenticated) exists on exactly the ' + wantGate.length + ' gated tables', JSON.stringify(gateRows) === JSON.stringify(wantGate), 'got ' + gateRows.length + ': ' + gateRows.filter((x) => !wantGate.includes(x)) + ' / missing ' + wantGate.filter((x) => !gateRows.includes(x)));
  const noGateAnon = psql('main', "SELECT string_agg(tablename, ',') FROM pg_policies WHERE schemaname = 'language_dash' AND policyname = 'ld_member_gate' AND (tablename LIKE 'analytics\\_%' OR tablename IN ('members', 'client_diagnostics', 'pro_codes', 'pro_stripe_events'))").out;
  check('no gate on members, analytics_*, client_diagnostics, pro_codes, pro_stripe_events', noGateAnon === '', noGateAnon);
  const gateFns = report.functions.filter((f) => f.decision === 'gate');
  const ungatedBodies = [];
  for (const f of gateFns) {
    const src = psql('main', `SELECT string_agg(prosrc, E'\\n----\\n') FROM pg_proc WHERE pronamespace = 'language_dash'::regnamespace AND proname = '${f.name}'`).out;
    if (!(/language_dash\.is_member\(\)/.test(src) || /language_dash\.require_member\(\)/.test(src))) ungatedBodies.push(f.name);
  }
  check('all ' + gateFns.length + ' gated functions contain the membership check in the stored body', ungatedBodies.length === 0, ungatedBodies.join(','));
  const aud = psqlFile('main', AUDIT_PATH);
  check('generated audit (audit.sql rewritten for language_dash) returns NO rows even with permissive default privileges pre-set', aud.code === 0 && aud.out === '', aud.err + aud.out);

  // ------------------------------------------------------------------------------------------ behaviour
  section('6. behaviour: non-members, joining, idempotency');
  const db = 'main';
  // other-app user u3: signed in elsewhere, has rows in the fake public tables, has done nothing in Language Dash
  check('u3 (signed in through Dx Dash only) has NO membership row', psql(db, `SELECT count(*) FROM language_dash.members WHERE user_id = '${U.u3}'`).out === '0');
  check('nothing at all exists for u3 in language_dash', traces(db, U.u3).length === 0, traces(db, U.u3).join(','));
  let x = as(db, 'u3', 'SELECT language_dash.my_membership()');
  check('u3: my_membership() = {member:false}', x.code === 0 && /"member": false/.test(x.out), x.out + x.err);
  check('u3 can run SELECTs on language_dash tables (no error) and sees zero rows', ['scores', 'player_profiles', 'friends'].every((t) => as(db, 'u3', `SELECT count(*) FROM language_dash.${t}`).out === '0'));

  // two real members join first, then non-member checks have data to (not) see
  x = as(db, 'u1', 'SELECT language_dash.join_language_dash()');
  check('u1 joins', x.code === 0 && /"member": true/.test(x.out), x.err);
  x = as(db, 'u1', 'SELECT language_dash.join_language_dash(); SELECT language_dash.join_language_dash();');
  check('join_language_dash is idempotent (twice more, no error)', x.code === 0, x.err);
  check('exactly one membership row for u1', psql(db, `SELECT count(*) FROM language_dash.members WHERE user_id = '${U.u1}'`).out === '1');
  x = as(db, 'u2', 'SELECT language_dash.join_language_dash()');
  check('u2 joins', x.code === 0, x.err);
  check('members table: 2 rows (u3 and u4 were never added)', psql(db, 'SELECT count(*) FROM language_dash.members').out === '2');
  check('u1 sees only their own members row', as(db, 'u1', 'SELECT count(*) FROM language_dash.members').out === '1');
  check('a client cannot INSERT into members (permission denied)', as(db, 'u4', `INSERT INTO language_dash.members (user_id) VALUES ('${U.u4}')`).sqlstate === '42501');
  check('a client cannot UPDATE members', as(db, 'u1', `UPDATE language_dash.members SET joined_at = now() - interval '9 years'`).sqlstate === '42501');
  check('a client cannot DELETE from members', as(db, 'u1', `DELETE FROM language_dash.members`).sqlstate === '42501');
  check('anon cannot read members or call join_language_dash', anon(db, 'SELECT count(*) FROM language_dash.members').sqlstate === '42501' && anon(db, 'SELECT language_dash.join_language_dash()').sqlstate === '42501');

  section('7. a non-member (u3 / u4) is refused by every gated RPC');
  const calls = {
    upsert_player_profile: `SELECT language_dash.upsert_player_profile('${U.u3}', 'N', 'avatar_intern', '{}', 5, 1, true)`,
    create_group: "SELECT language_dash.create_group('Nope')",
    my_groups: 'SELECT * FROM language_dash.my_groups()',
    publish_deck: `SELECT language_dash.publish_deck('d', '[{"a":1}]'::jsonb)`,
    push_save: "SELECT language_dash.push_save('{}'::jsonb, 1, NULL)",
    get_my_pro: 'SELECT language_dash.get_my_pro()',
    start_my_trial: 'SELECT language_dash.start_my_trial()',
    redeem_pro_code: "SELECT language_dash.redeem_pro_code('X')",
    ranked_my_stats: 'SELECT * FROM language_dash.ranked_my_stats()',
    ranked_find_match: "SELECT language_dash.ranked_find_match('ABCDE')",
    ranked_top: 'SELECT * FROM language_dash.ranked_top(5)',
    get_feed: 'SELECT * FROM language_dash.get_feed()',
    cohort_search: 'SELECT * FROM language_dash.cohort_search()',
    submit_feedback: "SELECT language_dash.submit_feedback('bug', 'hello')",
    season_standing: "SELECT * FROM language_dash.season_standing('endless', 'default')",
    get_shared_deck: "SELECT * FROM language_dash.get_shared_deck('ABCDEFGH')",
    find_buddies: 'SELECT * FROM language_dash.find_buddies()'
  };
  const notMember = [];
  for (const [n, sql] of Object.entries(calls)) {
    const a = as(db, 'u3', sql);
    const b = as(db, 'u4', sql);
    if (a.sqlstate !== '42501' || !/not_a_member/.test(a.msg || '') || b.sqlstate !== '42501') notMember.push(n + ':' + a.sqlstate + ':' + a.msg);
  }
  check('u3 and u4 get SQLSTATE 42501 not_a_member from ' + Object.keys(calls).length + ' RPCs (plpgsql and SQL-language)', notMember.length === 0, notMember.join('\n'));
  check('u3 direct INSERT into scores is refused by the gate', as(db, 'u3', `INSERT INTO language_dash.scores (user_id, player_name, score, run_id) VALUES ('${U.u3}', 'x', 1, 'r-u3')`).sqlstate === '42501');
  check('u3 direct INSERT into friends (u3 -> u1) is refused', as(db, 'u3', `INSERT INTO language_dash.friends (requester_id, addressee_id) VALUES ('${U.u3}', '${U.u1}')`).code !== 0);
  check('a signed-in user with a NULL sub (no jwt subject) cannot join', psql(db, 'SELECT language_dash.join_language_dash()', { role: 'authenticated', sub: '', stop: true }).code !== 0);
  check('after all that u3 and u4 still have no membership and no rows', psql(db, `SELECT count(*) FROM language_dash.members WHERE user_id IN ('${U.u3}', '${U.u4}')`).out === '0' && traces(db, U.u3).length === 0 && traces(db, U.u4).length === 0, traces(db, U.u3) + traces(db, U.u4));

  section('8. core flows as members');
  x = as(db, 'u1', `SELECT language_dash.upsert_player_profile('${U.u1}', 'Alice', 'avatar_intern', '{}', 120, 7, true)`);
  check('u1: profile upsert', x.code === 0, x.err);
  x = as(db, 'u2', `SELECT language_dash.upsert_player_profile('${U.u2}', 'Bob', 'avatar_intern', '{}', 50, 3, true)`);
  check('u2: profile upsert', x.code === 0, x.err);
  check('a member cannot upsert someone else\'s profile', as(db, 'u1', `SELECT language_dash.upsert_player_profile('${U.u2}', 'Mallory', 'a', '{}', 9999, 9, true)`).code !== 0);
  x = as(db, 'u1', "INSERT INTO language_dash.scores (user_id, player_name, score, accuracy, best_streak, run_id) VALUES ('" + U.u1 + "', 'Alice', 1200, 90, 7, 'run-u1-1')");
  check('u1: score submit (INSERT policy + sanity trigger + keep-best trigger)', x.code === 0, x.err);
  x = as(db, 'u2', "INSERT INTO language_dash.scores (user_id, player_name, score, accuracy, best_streak, run_id) VALUES ('" + U.u2 + "', 'Bob', 800, 80, 3, 'run-u2-1')");
  check('u2: score submit', x.code === 0, x.err);
  check('u1 cannot submit a score as u2 (RLS WITH CHECK)', as(db, 'u1', "INSERT INTO language_dash.scores (user_id, player_name, score, run_id) VALUES ('" + U.u2 + "', 'x', 5, 'run-fake')").code !== 0);
  x = as(db, 'u1', "SELECT player_name || ':' || score FROM language_dash.leaderboard_best ORDER BY score DESC");
  check('leaderboard read (member): both players, best first', x.out === 'Alice:1200\nBob:800', x.out + x.err);
  check('leaderboard read (anon): public, same rows', anon(db, 'SELECT count(*) FROM language_dash.leaderboard_best').out === '2');
  check('leaderboard read (non-member u4): empty, and direct SELECT on scores / player_profiles shows nothing either', as(db, 'u4', 'SELECT count(*) FROM language_dash.leaderboard_best').out === '0' && as(db, 'u4', 'SELECT count(*) FROM language_dash.scores').out === '0' && as(db, 'u4', 'SELECT count(*) FROM language_dash.player_profiles').out === '0' && as(db, 'u1', 'SELECT count(*) FROM language_dash.scores').out === '2');
  x = as(db, 'u1', `INSERT INTO language_dash.friends (requester_id, addressee_id) VALUES ('${U.u1}', '${U.u2}')`);
  check('friend request u1 -> u2 (both members)', x.code === 0, x.err);
  x = as(db, 'u2', `UPDATE language_dash.friends SET status = 'accepted' WHERE addressee_id = '${U.u2}'`);
  check('u2 accepts (column-level UPDATE(status))', x.code === 0, x.err);
  check('u2 cannot rewrite who the friendship is between', as(db, 'u2', `UPDATE language_dash.friends SET requester_id = '${U.u3}'`).sqlstate === '42501');
  x = as(db, 'u1', `INSERT INTO language_dash.friends (requester_id, addressee_id) VALUES ('${U.u1}', '${U.u3}')`);
  check('friend request to u3 (signed in elsewhere, not a member) is impossible: FK to members', x.sqlstate === '23503', x.err);
  x = as(db, 'u1', `INSERT INTO language_dash.activity_events (user_id, kind, visibility, payload) VALUES ('${U.u1}', 'run', 'friends', '{"score":1200}')`);
  check('u1 posts an activity event', x.code === 0, x.err);
  x = as(db, 'u2', 'SELECT count(*) FROM language_dash.get_feed()');
  check('u2 (accepted friend) sees u1\'s post in get_feed', x.out === '1', x.out + x.err);
  x = as(db, 'u1', 'SELECT (language_dash.start_my_trial())::text');
  check('u1: pro trial starts', x.code === 0 && /"ok": true/.test(x.out), x.out + x.err);
  x = as(db, 'u1', 'SELECT (language_dash.start_my_trial())::text');
  check('u1: second trial refused (once per account)', /"ok": false/.test(x.out), x.out);
  x = as(db, 'u1', "SELECT (language_dash.get_my_pro() ->> 'active')");
  check('u1: get_my_pro active', x.out === 'true', x.out + x.err);
  x = as(db, 'u1', "SELECT (language_dash.get_my_pro() ->> 'active')", {});
  void x;
  x = as(db, 'u2', "SELECT (language_dash.get_my_pro() ->> 'active')");
  check('u2: has no pro (separate per member)', x.out === 'false', x.out + x.err);
  x = as(db, 'u1', "SELECT language_dash.push_save('{\"coins\": 5}'::jsonb, 3, NULL)");
  check('u1: cloud save push', x.code === 0, x.err);
  x = as(db, 'u1', "SELECT * FROM language_dash.create_group('Spanish club')");
  check('u1: create study group', x.code === 0, x.err);
  x = as(db, 'u1', 'SELECT name FROM language_dash.my_groups()');
  check('u1: my_groups (SQL-language, gated) lists it', x.out === 'Spanish club', x.out + x.err);
  x = as(db, 'u1', "SELECT language_dash.publish_deck('Verbs', '[{\"q\":\"a\"}]'::jsonb)");
  check('u1: publish_deck', x.code === 0 && x.out.length === 8, x.out + x.err);
  x = as(db, 'u1', 'SELECT trophies FROM language_dash.ranked_my_stats()');
  check('u1: ranked_my_stats creates the row', x.out === '0', x.out + x.err);
  x = as(db, 'u1', "SELECT language_dash.submit_feedback('idea', 'nice game')");
  check('u1: submit_feedback', x.code === 0, x.err);
  x = as(db, 'u1', "SELECT language_dash.cohort_create('Class 5A', 'Test School', 'hi')");
  check('u1: cohort_create', x.code === 0, x.err);

  section('9. isolation between members');
  check('u2 cannot read u1\'s cloud save', as(db, 'u2', 'SELECT count(*) FROM language_dash.player_saves').out === '0');
  check('u2 cannot read u1\'s shared decks', as(db, 'u2', 'SELECT count(*) FROM language_dash.shared_decks').out === '0');
  check('u2 cannot read u1\'s group', as(db, 'u2', 'SELECT count(*) FROM language_dash.study_groups').out === '0');
  check('u2 cannot read u1\'s feedback, trial or entitlement rows (no privilege at all)', ['app_feedback', 'pro_trials', 'pro_entitlements'].every((t) => as(db, 'u2', `SELECT count(*) FROM language_dash.${t}`).sqlstate === '42501'));
  check('u2 cannot read u1\'s private activity', (() => { as(db, 'u1', `INSERT INTO language_dash.activity_events (user_id, kind, visibility) VALUES ('${U.u1}', 'run', 'private')`); return as(db, 'u2', "SELECT count(*) FROM language_dash.activity_events WHERE visibility = 'private'").out === '0'; })());
  check('u2 is not in u1\'s cohort (my_cohort is empty)', as(db, 'u2', 'SELECT language_dash.my_cohort() IS NULL').out === 't');
  check('u1 sees its own save', as(db, 'u1', 'SELECT count(*) FROM language_dash.player_saves').out === '1');

  section('10. service role: payments before join, membership never created');
  x = svc(db, `SELECT language_dash.pro_grant_until('${U.u3}', now() + interval '30 days', 'yearly', 'stripe', false) IS NOT NULL`);
  check('service_role can pro_grant_until for u3 (a Stripe webhook may land before the app join)', x.out === 't', x.err);
  check('…which did NOT create a membership for u3', psql(db, `SELECT count(*) FROM language_dash.members WHERE user_id = '${U.u3}'`).out === '0');
  check('…the only trace of u3 is the pro_entitlements row', traces(db, U.u3).join(',') === 'pro_entitlements=1', traces(db, U.u3).join(','));
  check('u3 is still refused by gated RPCs after the grant', as(db, 'u3', 'SELECT language_dash.get_my_pro()').sqlstate === '42501');
  check('authenticated cannot call pro_grant_until (permission denied)', as(db, 'u1', `SELECT language_dash.pro_grant_until('${U.u1}', now() + interval '3000 days')`).sqlstate === '42501');
  check('anon cannot call pro_grant_until', anon(db, `SELECT language_dash.pro_grant_until('${U.u1}', now() + interval '1 day')`).sqlstate === '42501');
  check('service_role can read any language_dash table (bypasses the gate)', svc(db, 'SELECT count(*) FROM language_dash.scores').out === '2');
  x = as(db, 'u3', 'SELECT language_dash.delete_my_ld_data()');
  check('u3 (non-member) with a still-billing Stripe plan is also told to cancel first (55000)', x.sqlstate === '55000', x.err);
  svc(db, `SELECT language_dash.pro_revoke('${U.u3}')`);
  x = as(db, 'u3', 'SELECT language_dash.delete_my_ld_data()::text');
  check('u3 (non-member) can then clear the pre-join payment trace with delete_my_ld_data', x.code === 0 && traces(db, U.u3).length === 0 && /"pro_entitlements": 1/.test(x.out), x.err + x.out + traces(db, U.u3));
  check('…and u3 still has no membership', psql(db, `SELECT count(*) FROM language_dash.members WHERE user_id = '${U.u3}'`).out === '0');

  section('11. deleting my Language Dash account (u1)');
  const pubRowsBefore = publicRows(db);
  const authUsersBefore = psql(db, 'SELECT count(*) FROM auth.users').out;
  const u1Before = traces(db, U.u1);
  x = as(db, 'u1', 'SELECT language_dash.delete_my_ld_data()::text');
  check('delete_my_ld_data succeeds and returns per-table counts', x.code === 0 && /"members": 1/.test(x.out) && /"scores": 1/.test(x.out), x.out + x.err);
  console.log('  u1 had rows in: ' + u1Before.join(', '));
  check('no language_dash row mentions u1 any more (every table scanned)', traces(db, U.u1).length === 0, traces(db, U.u1).join(','));
  check('u1\'s membership row is gone', psql(db, `SELECT count(*) FROM language_dash.members WHERE user_id = '${U.u1}'`).out === '0');
  check('auth.users untouched: all 4 sign-ins still exist (u1 included)', psql(db, 'SELECT count(*) FROM auth.users').out === authUsersBefore && psql(db, `SELECT count(*) FROM auth.users WHERE id = '${U.u1}'`).out === '1');
  check('Dx Dash rows untouched (profiles, scores, friends, pro, events, users)', publicRows(db) === pubRowsBefore, pubRowsBefore + ' vs ' + publicRows(db));
  check('u2\'s own data survives (profile, score, membership)', psql(db, `SELECT (SELECT count(*) FROM language_dash.player_profiles WHERE user_id = '${U.u2}') || '/' || (SELECT count(*) FROM language_dash.scores WHERE user_id = '${U.u2}') || '/' || (SELECT count(*) FROM language_dash.members WHERE user_id = '${U.u2}')`).out === '1/1/1');
  check('the friendship that involved u1 is gone, u2 has no friends row', psql(db, 'SELECT count(*) FROM language_dash.friends').out === '0');
  check('u1: my_membership() is now false', /"member": false/.test(as(db, 'u1', 'SELECT language_dash.my_membership()').out));
  check('u1 is refused by gated RPCs again', as(db, 'u1', 'SELECT * FROM language_dash.my_groups()').sqlstate === '42501');
  x = as(db, 'u1', 'SELECT language_dash.join_language_dash()');
  check('u1 can deliberately join again (fresh start)', x.code === 0 && traces(db, U.u1).join(',') === 'members=1', x.err + traces(db, U.u1));
  svc(db, `SELECT language_dash.pro_grant_until('${U.u1}', now() + interval '30 days', 'monthly', 'stripe', false)`);
  x = as(db, 'u1', 'SELECT language_dash.delete_my_ld_data()');
  check('a still-billing Stripe subscription blocks deletion (subscription_still_billing, 55000)', x.sqlstate === '55000' && /subscription_still_billing/.test(x.msg || ''), x.err);
  svc(db, `SELECT language_dash.pro_revoke('${U.u1}')`);
  x = as(db, 'u1', 'SELECT language_dash.delete_my_ld_data()');
  check('…and works once the subscription has ended', x.code === 0, x.err);
  x = svc(db, `SELECT language_dash.purge_user_data('${U.u2}')::text`);
  check('service role purge_user_data(u2) wipes u2 (the edge function calls it before removing the sign-in)', x.code === 0 && traces(db, U.u2).length === 0 && psql(db, `SELECT count(*) FROM auth.users WHERE id = '${U.u2}'`).out === '1', x.err + traces(db, U.u2));
  check('after everything, language_dash holds no member rows at all', psql(db, 'SELECT count(*) FROM language_dash.members').out === '0');

  section('12. auth.users deletion cascades into Language Dash (the separate sign-in removal)');
  U.u5 = '55555555-5555-4555-8555-555555555555';
  psql(db, `INSERT INTO auth.users (id, email) VALUES ('${U.u5}', 'five@example.test')`);
  as(db, 'u5', 'SELECT language_dash.join_language_dash()');
  as(db, 'u5', `SELECT language_dash.upsert_player_profile('${U.u5}', 'Eve', 'avatar_intern', '{}', 1, 1, true)`);
  check('u5 joined and has rows', traces(db, U.u5).length === 2, traces(db, U.u5).join(','));
  const delAuth = psql(db, `DELETE FROM auth.users WHERE id = '${U.u5}'`);
  check('removing the sign-in (service-role path) cascades members and profile', delAuth.code === 0 && traces(db, U.u5).length === 0, delAuth.err + traces(db, U.u5));

  section('13. re-running the migration');
  const invAfterBehaviour = inventory(db);
  const mig2 = psqlFile(db, MIGRATION_PATH);
  check('second run exits 0 (the migration is idempotent)', mig2.code === 0, mig2.err.slice(0, 600));
  const counts2 = ldCounts(db);
  const aud2 = psqlFile(db, AUDIT_PATH);
  check('second run changes no object count (relations, functions, policies, triggers, indexes) and the audit is still empty', aud2.out === '' && counts2 === ldCounts1, ldCounts1 + ' vs ' + counts2 + aud2.out);
  check('second run leaves everything outside language_dash identical', inventory(db) === invAfterBehaviour && inventory(db) === invBefore, '');
  check('public + auth dumps still byte-for-byte identical after behaviour tests and a re-run', dump(db, 'public') === pubDumpBefore && dump(db, 'auth').length > 0, 'public changed');
  void rowsBefore;

  section('14. rollback script');
  const rb = readFileSync(ROLLBACK_PATH, 'utf8');
  const refuse = psql(db, rb);
  check('rollback.sql refuses to run as shipped (confirmation not set)', refuse.code !== 0 && /rollback refused/i.test(refuse.err), refuse.err.slice(0, 300));
  check('…and the schema is still there', psql(db, "SELECT count(*) FROM pg_namespace WHERE nspname = 'language_dash'").out === '1');
  const confirmed = rb.replace("confirm text := 'NO'", "confirm text := 'YES'");
  check('the shipped file contains the single confirmation switch', confirmed !== rb, '');
  const run = psql(db, confirmed);
  check('with the switch set to YES it drops language_dash', run.code === 0 && psql(db, "SELECT count(*) FROM pg_namespace WHERE nspname = 'language_dash'").out === '0', run.err);
  check('rollback printed its warning', /WARNING/.test(run.err), run.err.slice(0, 300));
  check('after rollback public is byte-for-byte what it was before the migration', dump(db, 'public') === pubDumpBefore && dump(db, 'auth') === authDumpBefore, 'public changed');
  check('after rollback the catalog outside language_dash is what it was (publication back to public.match_invites only)', inventory(db) === invBefore, '');

  // ----------------------------------------------------------------------------------------------------------------
  const failed = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - failed.length) + ' / ' + results.length + ' checks passed' + (failed.length ? ', ' + failed.length + ' FAILED' : ''));
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ checks: results, report: { tables: report.tables.length, views: report.views.length, functions: report.functions.length } }, null, 2));
  return failed.length ? 1 : 0;
}

let code = 1;
try {
  code = await main();
} catch (e) {
  console.error('\nharness error: ' + (e && e.stack || e));
  code = 2;
} finally {
  stopServer();
}
process.exit(code);
