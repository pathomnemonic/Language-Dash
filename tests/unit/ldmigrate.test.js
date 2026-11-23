// @vitest-environment node
//
// tools/ld-migrate: the generator that turns database/*.sql into the Language Dash migration for a SHARED Supabase project.
// These tests run its pure functions (tokeniser, statement rewriting, classification, failure on unknown constructs) with no
// Postgres. The real-database proof is tools/ld-migrate/test-local.mjs (npm run test:migration), which is not part of vitest.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import {
  tokenize, splitStatements, classify, convertSource, newContext, generate, assertNoPublicLeft, patchAllowList, patchLockdown,
  signedInList, findPlpgsqlBegin, purgeOrder, checkContext, renderPurgeSql, MigrationError, TABLES, FUNCTION_POLICY, FILE_ORDER,
  renderMembershipSql, convertAudit, classifyView, renderReportMarkdown
} from '../../tools/ld-migrate/lib.mjs';

const conv = (sql, opts) => {
  const ctx = newContext(opts);
  return { out: convertSource('t', sql, ctx), ctx };
};
const files = () => {
  const f = {};
  for (const n of [...FILE_ORDER, 'audit']) f[n] = readFileSync('database/' + n + '.sql', 'utf8');
  return f;
};

describe('tokeniser and statement splitter', () => {
  it('keeps comments, strings, quoted names and dollar bodies whole', () => {
    const sql = "-- c; with semicolon\nSELECT 'a;b''c', \"x;y\", $f$ body; $$ nested $$ ; $f$ /* block; */ ;";
    const t = tokenize(sql);
    expect(t.map((x) => x.type).filter((x) => x === 'string' || x === 'ident' || x === 'dollar')).toEqual(['string', 'ident', 'dollar']);
    expect(t.filter((x) => x.type === 'punct' && x.text === ';').length).toBe(1);
    expect(t.map((x) => x.text).join('')).toBe(sql);
  });
  it('splits on top-level semicolons only and records line numbers', () => {
    const s = splitStatements("CREATE TABLE a (x int);\n\nCREATE FUNCTION f() RETURNS int LANGUAGE sql AS $$ SELECT 1; SELECT 2; $$;\n-- tail", 'x');
    expect(s.filter((x) => x.hasCode).length).toBe(2);
    expect(s[1].line).toBe(3);
  });
  it('refuses an unterminated string or dollar quote', () => {
    expect(() => tokenize("SELECT 'oops")).toThrow(MigrationError);
    expect(() => tokenize('SELECT $$ oops')).toThrow(MigrationError);
  });
  it('finds the main BEGIN of a plpgsql body, ignoring strings and comments', () => {
    const body = "\nDECLARE s text := 'BEGIN'; -- BEGIN\nBEGIN\n  RETURN;\nEND;\n";
    const at = findPlpgsqlBegin(body);
    expect(body.slice(at - 5, at)).toBe('BEGIN');
    expect(body.slice(0, at).includes('RETURN')).toBe(false);
  });
});

describe('statement rewriting', () => {
  it('pins every function: rewrites SET search_path = public[, auth] and adds the missing pin', () => {
    const { out, ctx } = conv(`
CREATE OR REPLACE FUNCTION get_shared_deck(p_code text) RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$ SELECT 1 $$;
CREATE OR REPLACE FUNCTION cohort_week(ts timestamptz DEFAULT now()) RETURNS text
LANGUAGE sql STABLE AS $$ SELECT to_char(ts, 'IYYY') $$;
CREATE OR REPLACE FUNCTION cohort_role_of(a uuid, b uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$ SELECT 'x' $$;`);
    expect(ctx.counters.pinsRewritten).toBe(2);
    expect(ctx.counters.pinsAdded).toBe(1);
    expect((out.match(/SET search_path = language_dash, pg_temp/g) || []).length).toBe(3);
    expect(/search_path = public/.test(out)).toBe(false);
  });
  it('rewrites public. qualification in code and in bodies, and the nspname literal', () => {
    const { out, ctx } = conv(`
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
DO $lock$ BEGIN
  IF to_regclass('public.' || 'friends') IS NOT NULL THEN EXECUTE format('GRANT SELECT ON public.%I TO authenticated', 'friends'); END IF;
  PERFORM 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p'); -- signed_in text[] := ARRAY['x']
END $lock$;`.replace('-- signed_in text[] := ARRAY', 'signed_in text[] := ARRAY'));
    expect(out).toContain('IN SCHEMA language_dash REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated');
    expect(out).toContain("to_regclass('language_dash.' ||");
    expect(out).toContain('ON language_dash.%I');
    expect(out).toContain("n.nspname = 'language_dash'");
    expect(ctx.counters.schemaQualified).toBeGreaterThanOrEqual(2);
    expect(() => assertNoPublicLeft(out)).not.toThrow();
  });
  it('keeps PUBLIC as a role in REVOKE ... FROM PUBLIC but never TO PUBLIC', () => {
    expect(conv('REVOKE ALL ON FUNCTION f(int) FROM PUBLIC, anon;').out).toContain('FROM PUBLIC, anon');
    expect(() => conv('GRANT SELECT ON t TO PUBLIC;')).toThrow(/public/i);
  });
  it('retargets REFERENCES auth.users(id) to language_dash.members(user_id) (or keeps it with fkTarget=auth)', () => {
    const sql = 'CREATE TABLE IF NOT EXISTS t (user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, b uuid REFERENCES auth.users(id));';
    const a = conv(sql);
    expect(a.out).toContain('REFERENCES language_dash.members(user_id) ON DELETE CASCADE');
    expect(a.ctx.counters.fkRetargeted).toBe(2);
    expect(a.ctx.tables.t.columns.map((c) => c.refAuth)).toEqual([true, true]);
    const k = conv(sql, { fkTarget: 'auth' });
    expect(k.out).toContain('REFERENCES auth.users(id)');
    expect(k.ctx.counters.fkRetargeted).toBe(0);
  });
  it('injects the membership check at the top of a gated plpgsql function and a gated SQL function', () => {
    const { out, ctx } = conv(`
CREATE OR REPLACE FUNCTION create_group(p_name text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
END;
$$;
CREATE OR REPLACE FUNCTION my_groups() RETURNS SETOF int
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT 1;
$$;`);
    expect(ctx.counters.gatesPlpgsql).toBe(1);
    expect(ctx.counters.gatesSql).toBe(1);
    expect(out).toMatch(/BEGIN\n {2}IF NOT language_dash\.is_member\(\) THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;\n {2}IF auth\.uid\(\) IS NULL/);
    expect(out).toMatch(/\$\$\n {2}SELECT language_dash\.require_member\(\);\n {2}SELECT 1;/);
    expect(ctx.functions.map((f) => [f.name, f.decision])).toEqual([['create_group', 'gate'], ['my_groups', 'gate']]);
  });
  it('does not gate predicates, internal helpers, service-only or anonymous functions', () => {
    const { out, ctx } = conv(`
CREATE OR REPLACE FUNCTION has_block_between(a uuid, b uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$ SELECT auth.uid() IN (a, b) $$;
CREATE OR REPLACE FUNCTION pro_grant_until(p_user uuid, p_until timestamptz) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN NULL; END $$;
CREATE OR REPLACE FUNCTION count_consent(p text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN NULL; END $$;`);
    expect(out).not.toContain('is_member');
    expect(ctx.functions.every((f) => f.decision === 'none')).toBe(true);
  });
  it('drops delete_my_account and its REVOKE/GRANT but keeps a note', () => {
    const { out, ctx } = conv(`
CREATE OR REPLACE FUNCTION delete_my_account() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$ BEGIN DELETE FROM auth.users WHERE id = auth.uid(); END; $$;
REVOKE ALL ON FUNCTION delete_my_account() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_my_account() TO authenticated;
CREATE TABLE IF NOT EXISTS keep_me (x int);`);
    expect(out.replace(/--[^\n]*/g, '')).not.toMatch(/auth\.users/);
    expect(out).toContain('keep_me');
    expect(out).toContain('is NOT carried over');
    expect(ctx.counters.removed).toBe(3);
  });
  it('patches the lockdown and audit allow-lists (delete_my_account -> the membership functions)', () => {
    const text = "signed_in text[] := ARRAY['create_group', 'delete_my_account', 'discover_groups'];";
    expect(patchAllowList(text, 'lockdown')).toBe("signed_in text[] := ARRAY['create_group', 'delete_my_ld_data', 'is_member', 'join_language_dash', 'my_membership', 'discover_groups'];");
    expect(() => patchAllowList('ARRAY[]', 'lockdown')).toThrow(/exactly once/);
    expect(() => patchLockdown("signed_in text[] := ARRAY['delete_my_account', 'x'];")).toThrow(/activity_events/);
    expect(signedInList(text)).toEqual(['create_group', 'delete_my_account', 'discover_groups']);
  });
  it('rewrites the schema literal in the audit query', () => {
    const a = convertAudit("signed_in AS (SELECT unnest(ARRAY['delete_my_account', 'x']) AS name) SELECT 1 WHERE n.nspname = 'public' AND c.schemaname = 'public'");
    expect(a).toContain("nspname = 'language_dash'");
    expect(a).not.toContain("'public'");
    expect(a).toContain("'my_membership'");
  });
});

describe('fails loudly on anything it cannot classify', () => {
  const bad = {
    'CREATE EXTENSION': 'CREATE EXTENSION IF NOT EXISTS pgcrypto;',
    'CREATE SCHEMA': 'CREATE SCHEMA other;',
    'ALTER ROLE': 'ALTER ROLE anon SET statement_timeout = 1;',
    'ALTER DATABASE': 'ALTER DATABASE postgres SET timezone TO \'utc\';',
    'ALTER SYSTEM': 'ALTER SYSTEM SET work_mem = 1;',
    'DROP SCHEMA': 'DROP SCHEMA public CASCADE;',
    'DROP EXTENSION': 'DROP EXTENSION pgcrypto;',
    'cron.schedule': "SELECT cron.schedule('x', '* * * * *', 'SELECT 1');",
    'storage bucket insert': "INSERT INTO storage.buckets (id, name) VALUES ('a', 'a');",
    'storage policy': 'CREATE POLICY p ON storage.objects FOR SELECT USING (true);',
    'table in another schema': 'CREATE TABLE auth.extra (x int);',
    'view in another schema': 'CREATE VIEW storage.v AS SELECT 1;',
    'function in another schema': 'CREATE FUNCTION extensions.f() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;',
    'grant to another role': 'GRANT SELECT ON t TO postgres;',
    'grant on schema public': 'GRANT USAGE ON SCHEMA public TO anon;',
    'grant on database': 'GRANT CONNECT ON DATABASE postgres TO anon;',
    'role grant': 'GRANT anon TO authenticator;',
    'default privileges for role': 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;',
    'default privileges global': 'ALTER DEFAULT PRIVILEGES REVOKE ALL ON TABLES FROM anon;',
    'top-level publication': 'ALTER PUBLICATION supabase_realtime ADD TABLE t;',
    'unknown DO block': 'DO $$ BEGIN PERFORM 1; END $$;',
    'DO block that creates an extension': 'DO $$ BEGIN CREATE EXTENSION foo; END $$;',
    'top-level SET': 'SET search_path = public;',
    'BEGIN': 'BEGIN;',
    'TRUNCATE': 'TRUNCATE t;',
    'unknown statement': 'FOO BAR;',
    'CREATE INDEX CONCURRENTLY': 'CREATE INDEX CONCURRENTLY i ON t (x);',
    'CREATE TEMP TABLE': 'CREATE TEMP TABLE t (x int);',
    'CREATE TABLE LIKE': 'CREATE TABLE t (LIKE other);',
    'table-level FK to auth.users': 'CREATE TABLE t (a uuid, FOREIGN KEY (a) REFERENCES auth.users(id));',
    'FK without (id)': 'CREATE TABLE t (a uuid REFERENCES auth.users);',
    'search_path with extensions': 'CREATE FUNCTION f() RETURNS int LANGUAGE sql SET search_path = public, extensions AS $$ SELECT 1 $$;',
    'function that needs an extension schema': 'CREATE FUNCTION get_my_pro() RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT gen_salt(\'bf\') $$;',
    'body that reads auth.users': 'CREATE FUNCTION get_my_pro() RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT email FROM auth.users $$;',
    'body that uses storage': 'CREATE FUNCTION get_my_pro() RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT name FROM storage.objects $$;',
    'body that creates a role': 'CREATE FUNCTION get_my_pro() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN CREATE ROLE evil; END $$;',
    'unclassified function': 'CREATE FUNCTION brand_new_fn() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;',
    'unclassified view': 'CREATE VIEW brand_new_view AS SELECT 1;',
    'gated function that is not security definer': 'CREATE FUNCTION create_group(t text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN NULL; END $$;',
    'function that calls delete_my_account': 'CREATE FUNCTION get_my_pro() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN PERFORM delete_my_account(); END $$;',
    'bare public schema in code': 'CREATE TABLE t (x public.thing);'.replace('public.thing', 'public'),
    'ALTER TABLE of an unknown table': 'ALTER TABLE ghost ADD COLUMN x int;',
    'COMMENT ON EXTENSION': "COMMENT ON EXTENSION pgcrypto IS 'x';",
    'CREATE ROLE': 'CREATE ROLE evil;',
    'CREATE PUBLICATION': 'CREATE PUBLICATION p FOR ALL TABLES;'
  };
  for (const [name, sql] of Object.entries(bad)) {
    it(name, () => {
      expect(() => conv(sql)).toThrow(MigrationError);
    });
  }
  it('names the file and line in the error', () => {
    try {
      convertSource('policies', 'SELECT 1;\n\nCREATE EXTENSION x;', newContext());
    } catch (e) {
      expect(e.message).toContain('policies.sql line 1');
      return;
    }
    throw new Error('expected a MigrationError');
  });
  it('rejects a table or function that is not in the classification maps (checkContext)', () => {
    const ctx = newContext();
    convertSource('t', 'CREATE TABLE IF NOT EXISTS brand_new (user_id uuid REFERENCES auth.users(id));\nALTER TABLE brand_new ENABLE ROW LEVEL SECURITY;', ctx);
    expect(() => checkContext(ctx, "signed_in text[] := ARRAY['x']")).toThrow(/unclassified table "brand_new"/);
  });
  it('rejects a table with a user column that its classification does not list', () => {
    const ctx = newContext();
    convertSource('t', 'CREATE TABLE IF NOT EXISTS friends (id int, requester_id uuid REFERENCES auth.users(id), addressee_id uuid, stranger uuid REFERENCES auth.users(id));\nALTER TABLE friends ENABLE ROW LEVEL SECURITY;', ctx);
    expect(() => checkContext(ctx, "signed_in text[] := ARRAY['x']")).toThrow(/stranger/);
  });
  it('rejects a table that never enables row level security', () => {
    const ctx = newContext();
    convertSource('t', 'CREATE TABLE IF NOT EXISTS scores (user_id uuid);', ctx);
    expect(() => checkContext(ctx, "signed_in text[] := ARRAY['x']")).toThrow(/ROW LEVEL SECURITY/);
  });
  it('refuses a missing input file', async () => {
    await expect(generate({})).rejects.toThrow(/missing input file/);
  });
  it('classify() recognises the harmless kinds', () => {
    const kind = (sql) => classify(splitStatements(sql, 't')[0]).kind;
    expect(kind('CREATE UNIQUE INDEX IF NOT EXISTS i ON t (a);')).toBe('CREATE_INDEX');
    expect(kind('CREATE OR REPLACE VIEW v WITH (security_invoker = true) AS SELECT 1;')).toBe('CREATE_VIEW');
    expect(kind('CREATE MATERIALIZED VIEW m AS SELECT 1;')).toBe('CREATE_MATVIEW');
    expect(kind('CREATE TRIGGER x BEFORE INSERT ON t FOR EACH ROW EXECUTE FUNCTION f();')).toBe('CREATE_TRIGGER');
    expect(kind('CREATE POLICY p ON t FOR SELECT USING (true);')).toBe('CREATE_POLICY');
    expect(kind('CREATE SEQUENCE s;')).toBe('CREATE_SEQUENCE');
    expect(kind('CREATE TYPE ty AS ENUM (\'a\');')).toBe('CREATE_TYPE');
    expect(kind("COMMENT ON TABLE t IS 'x';")).toBe('COMMENT');
    expect(kind('DROP POLICY IF EXISTS p ON t;')).toBe('DROP_POLICY');
    expect(kind('DROP FUNCTION IF EXISTS f();')).toBe('DROP_FUNCTION');
    expect(kind('GRANT UPDATE (status) ON friends TO authenticated;')).toBe('GRANT');
    expect(kind('ALTER TABLE t ENABLE ROW LEVEL SECURITY;')).toBe('ALTER_TABLE');
    expect(() => classify(splitStatements('ALTER TABLE t OWNER TO postgres;', 't')[0])).toThrow(MigrationError);
  });
  it('classifyView knows the template views and refuses others', () => {
    expect(classifyView('leaderboard_best')).toMatch(/leaderboard/);
    expect(classifyView('analytics_v_retention')).toMatch(/owner-only/);
    expect(() => classifyView('mystery')).toThrow(MigrationError);
  });
});

let cached = null;
const gen = () => (cached = cached || generate(files()));

describe('the real templates', () => {
  it('generates, and every table and function is classified', async () => {
    const { sql, report, ctx } = await gen();
    expect(Object.keys(ctx.tables).sort()).toEqual(Object.keys(TABLES).sort());
    expect(report.tables.length).toBe(Object.keys(TABLES).length + 1); // + members
    for (const f of report.functions.filter((x) => x.pin !== 'hand-written')) expect(FUNCTION_POLICY[f.name]).toBeTruthy();
    expect(report.counters.pinsRewritten).toBe(89);
    expect(report.gatedFunctions).toBeGreaterThan(40);
    expect(sql.startsWith('-- ====')).toBe(true);
    expect(sql).toContain('SET LOCAL search_path = language_dash, pg_temp;');
    expect(() => assertNoPublicLeft(sql)).not.toThrow();
  });
  it('never touches public, auth.users or the original delete_my_account', async () => {
    const { sql } = await gen();
    const code = sql.replace(/--[^\n]*/g, '');
    expect(code).not.toMatch(/\bdelete_my_account\b/);
    expect(code).not.toMatch(/DELETE\s+FROM\s+auth\./i);
    expect(code).not.toMatch(/\bSET\s+search_path\s*=\s*public\b/i);
    expect(code).not.toMatch(/\bpublic\.[a-z_%"']/i);
    expect(code).not.toMatch(/CREATE\s+EXTENSION|CREATE\s+SCHEMA\s+(?!IF NOT EXISTS language_dash)/i);
    // every SECURITY DEFINER function in the output is pinned to language_dash
    const fns = code.split(/CREATE OR REPLACE FUNCTION /).slice(1);
    for (const f of fns) {
      if (/SECURITY DEFINER/.test(f.split('$')[0])) expect(f.split('$')[0]).toMatch(/SET search_path = language_dash, pg_temp/);
    }
  });
  it('gates exactly the signed-in RPCs of lockdown.sql (plus the membership layer and the predicates)', async () => {
    const f = files();
    const { report, sql } = await generate(f);
    const signed = signedInList(patchLockdown(f.lockdown));
    const gated = report.functions.filter((x) => x.decision === 'gate').map((x) => x.name);
    for (const n of gated) expect(signed).toContain(n);
    const ungated = signed.filter((n) => !gated.includes(n)).sort();
    expect(ungated).toEqual(['can_see_activity', 'can_see_post', 'delete_my_ld_data', 'has_block_between', 'is_group_member', 'is_member', 'join_language_dash', 'my_membership', 'report_diagnostic']);
    expect(signed).not.toContain('delete_my_account');
    expect(sql).toContain("'delete_my_ld_data', 'is_member', 'join_language_dash', 'my_membership'");
  });
  it('puts ld_member_gate on every member / shared table and on no anonymous or internal one', async () => {
    const { sql, report } = await gen();
    const gated = [...sql.matchAll(/CREATE POLICY ld_member_gate ON language_dash\.(\w+) AS RESTRICTIVE FOR ALL TO authenticated/g)].map((m) => m[1]).sort();
    expect(gated).toEqual(report.tables.filter((t) => t.gated).map((t) => t.name).sort());
    for (const n of ['members', 'analytics_events', 'analytics_installs', 'client_diagnostics', 'pro_codes', 'pro_stripe_events']) expect(gated).not.toContain(n);
    for (const n of ['player_profiles', 'scores', 'friends', 'player_saves', 'pro_entitlements', 'cohorts']) expect(gated).toContain(n);
  });
  it('orders the wipe children-first and covers every member table', async () => {
    const { ctx } = await gen();
    const order = purgeOrder(ctx);
    const pos = (n) => order.indexOf(n);
    expect(pos('activity_kudos')).toBeLessThan(pos('activity_events'));
    expect(pos('group_members')).toBeLessThan(pos('study_groups'));
    expect(pos('ranked_reports')).toBeLessThan(pos('ranked_matches'));
    const member = Object.keys(TABLES).filter((n) => TABLES[n].cls === 'member');
    expect(order.sort()).toEqual(member.sort());
    const purge = renderPurgeSql(ctx);
    expect(purge).toContain('DELETE FROM language_dash.members WHERE user_id = p_user');
    expect(purge.replace(/--[^\n]*/g, '')).not.toMatch(/auth\.users/);
    expect(purge).toContain("UPDATE language_dash.schools SET created_by = NULL");
  });
  it('the hand-written membership layer has the five functions and the own-row policy, and never writes auth.users', () => {
    const m = renderMembershipSql();
    for (const n of ['is_member', 'require_member', 'my_membership', 'join_language_dash']) expect(m).toContain('FUNCTION language_dash.' + n + '()');
    expect(m).toContain('REFERENCES auth.users (id) ON DELETE CASCADE');
    expect(m).toContain('USING (user_id = (SELECT auth.uid()))');
    expect(m).not.toMatch(/DELETE\s+FROM\s+auth\./i);
    expect(m).not.toMatch(/GRANT[^;]*members[^;]*TO (anon|PUBLIC)/i);
  });
  it('the committed migration and audit are up to date with the generator', async () => {
    const f = files();
    const { sql, audit } = await generate(f);
    if (!existsSync('supabase/migrations/20261201000000_language_dash.sql')) throw new Error('run: node tools/ld-migrate/generate.mjs');
    expect(readFileSync('supabase/migrations/20261201000000_language_dash.sql', 'utf8')).toBe(sql);
    expect(readFileSync('tools/ld-migrate/out/audit-language-dash.sql', 'utf8')).toBe(audit);
  });
  it('the generated report region of docs/SHARED-PROJECT-MIGRATION.md is up to date', async () => {
    const { report } = await gen();
    const doc = readFileSync('docs/SHARED-PROJECT-MIGRATION.md', 'utf8');
    const a = doc.indexOf('<!-- BEGIN GENERATED REPORT');
    const b = doc.indexOf('<!-- END GENERATED REPORT -->');
    expect(a).toBeGreaterThan(0);
    const region = doc.slice(doc.indexOf('-->', a) + 3, b).trim();
    expect(region).toBe(renderReportMarkdown(report).trim());
  });
  // (two full generations of the migration: the heaviest test in the suite, and the only one that
  // runs generate() twice uncached — it needs more than the shared 15s timeout on a loaded runner)
  it('is deterministic', { timeout: 90000 }, async () => {
    const f = files();
    expect((await generate(f)).sql).toBe((await generate(f)).sql);
  });
  it('does not edit the original database files (no membership names in them)', () => {
    const f = files();
    expect(f.lockdown).toContain("'delete_my_account'");
    expect(f.lockdown).not.toContain('delete_my_ld_data');
    expect(f.schema).not.toContain('language_dash');
  });
});
