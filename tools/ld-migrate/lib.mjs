// Pure functions behind tools/ld-migrate/generate.mjs (no file or network access, so tests/unit/ldmigrate.test.js can run them).
//
// Job: turn the single-tenant database/*.sql template (written for the `public` schema of its own Supabase project) into ONE
// migration that lives entirely in the schema `language_dash` of a Supabase project shared with other apps.
//
// Method (see docs/SHARED-PROJECT-MIGRATION.md): every file is tokenised (comments, strings, quoted names and $$ bodies are
// kept apart from code), split into statements, and each statement is CLASSIFIED. Anything this file does not recognise
// (CREATE EXTENSION, cron, ALTER ROLE/DATABASE, storage buckets, objects in other schemas, unknown DO blocks, unknown tables
// or functions, ...) throws a MigrationError instead of being guessed at.

export class MigrationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MigrationError';
  }
}

export const SCHEMA = 'language_dash';
export const PIN = 'SET search_path = ' + SCHEMA + ', pg_temp';

// Run order of the template files. This is the order tests/unit/dbprivileges.test.js proves works against a real database
// (README lists schema, policies, then the optional files; cohorts and discovery only need schema + policies, and pro/analytics
// are independent of each other). lockdown.sql MUST be last: it closes everything, then opens the allow-lists. audit.sql is a
// query, not DDL: it is rewritten separately and run AFTER the migration.
export const FILE_ORDER = ['schema', 'policies', 'cohorts', 'discovery', 'pro', 'analytics', 'analytics_views', 'lockdown'];
export const AUDIT_FILE = 'audit';

// ---------------------------------------------------------------------------------------------------------------------
// Classification tables. Adding a table or function to database/*.sql without adding it here makes the generator fail.
// ---------------------------------------------------------------------------------------------------------------------

// cls: member = holds one member's data (gated + wiped by delete_my_ld_data); shared = Language Dash content with no user column
// (gated, nobody reads it directly); internal = owner/service data with no user column (ungated); anon = written by the
// signed-out app (ungated, no account id at all). userCols: the columns delete_my_ld_data matches on. setNull: columns that
// are set to NULL instead (the row belongs to something else). keepOnPurge: the row is NOT wiped by delete_my_ld_data /
// purge_user_data, because something outside this app's data still needs it; pro_forget_user removes it when the
// sign-in itself is removed (apple_tokens: the Apple login can only be revoked while the token exists; pro_trials:
// the once-per-account free trial marker, which must not reset when only the app data is deleted).
export const TABLES = {
  player_profiles: { cls: 'member', userCols: ['user_id'] },
  scores: { cls: 'member', userCols: ['user_id'] },
  friends: { cls: 'member', userCols: ['requester_id', 'addressee_id'] },
  friend_blocks: { cls: 'member', userCols: ['blocker_id', 'blocked_id'] },
  match_invites: { cls: 'member', userCols: ['from_user', 'to_user'] },
  user_reports: { cls: 'member', userCols: ['reporter_id', 'reported_id'] },
  card_reports: { cls: 'member', userCols: ['reporter_id'] },
  study_groups: { cls: 'member', userCols: ['owner_id'] },
  group_members: { cls: 'member', userCols: ['user_id'] },
  group_join_requests: { cls: 'member', userCols: ['user_id'] },
  shared_decks: { cls: 'member', userCols: ['owner_id'] },
  activity_events: { cls: 'member', userCols: ['user_id'] },
  activity_kudos: { cls: 'member', userCols: ['user_id'] },
  weekly_study: { cls: 'member', userCols: ['user_id'] },
  content_reports: { cls: 'member', userCols: ['reporter_id'] },
  app_feedback: { cls: 'member', userCols: ['user_id'] },
  player_saves: { cls: 'member', userCols: ['user_id'] },
  player_saves_backup: { cls: 'member', userCols: ['user_id'] },
  player_trophies: { cls: 'member', userCols: ['user_id'] },
  ranked_queue: { cls: 'member', userCols: ['user_id'] },
  ranked_matches: { cls: 'member', userCols: ['host_id', 'guest_id'] },
  ranked_reports: { cls: 'member', userCols: ['user_id'] },
  buddy_listings: { cls: 'member', userCols: ['user_id'] },
  cohort_members: { cls: 'member', userCols: ['user_id'] },
  cohort_war_points: { cls: 'member', userCols: ['user_id'] },
  schools: { cls: 'member', userCols: [], setNull: ['created_by'] },
  pro_entitlements: { cls: 'member', userCols: ['user_id'] },
  pro_grants: { cls: 'member', userCols: ['user_id'] },
  pro_items: { cls: 'member', userCols: ['user_id'] },
  pro_library: { cls: 'member', userCols: ['user_id'] },
  pro_trials: { cls: 'member', userCols: ['user_id'], keepOnPurge: true },
  pro_redemptions: { cls: 'member', userCols: ['user_id'] },
  pro_attempts: { cls: 'member', userCols: ['user_id'] },
  pro_stripe_customers: { cls: 'member', userCols: ['user_id'] },
  pro_store_purchases: { cls: 'member', userCols: ['user_id'] },
  apple_tokens: { cls: 'member', userCols: ['user_id'], keepOnPurge: true },
  cohorts: { cls: 'shared', userCols: [] },
  pro_codes: { cls: 'internal', userCols: [] },
  pro_stripe_events: { cls: 'internal', userCols: [] },
  client_diagnostics: { cls: 'anon', userCols: [] },
  analytics_installs: { cls: 'anon', userCols: [] },
  analytics_sessions: { cls: 'anon', userCols: [] },
  analytics_events: { cls: 'anon', userCols: [] },
  analytics_limits: { cls: 'anon', userCols: [] },
  analytics_consent_counts: { cls: 'anon', userCols: [] }
};

export const TABLE_CLASS_TEXT = {
  member: 'member data: restrictive ld_member_gate policy + wiped by delete_my_ld_data',
  shared: 'Language Dash content, no user column: restrictive ld_member_gate policy',
  internal: 'owner / service-role data, no user column: no gate (no client privileges at all)',
  anon: 'written by the signed-out app, no account id: no gate'
};

const VIEW_RULES = [
  [/^leaderboard_(best|alltime)$/, 'public leaderboard read model (security_invoker; anon may SELECT; signed-in non-members see nothing)'],
  [/^analytics_v_/, 'owner-only analytics view (no client privileges)'],
  [/^pro_v_/, 'owner-only Pro view (no client privileges)'],
  [/^(moderation_queue|feedback_inbox)$/, 'owner-only inbox view (no client privileges)']
];

export function classifyView(name) {
  for (const [re, why] of VIEW_RULES) if (re.test(name)) return why;
  throw new MigrationError('unclassified view "' + name + '": add it to VIEW_RULES in tools/ld-migrate/lib.mjs');
}

// Function decisions. gate = a membership check is injected as the first statement. Every function granted to `authenticated`
// by lockdown.sql must be listed as gate, a predicate, or a membership function (checked against lockdown's own list).
const GATED_RPCS = [
  'upsert_player_profile', 'create_group', 'join_group', 'leave_group', 'my_groups', 'group_leaderboard', 'publish_deck',
  'get_shared_deck', 'season_standing', 'give_kudos', 'remove_kudos', 'set_activity_visibility', 'get_feed', 'my_recent_kudos',
  'report_study', 'set_group_goal', 'group_goal_status', 'report_content', 'submit_feedback', 'restore_backup_save', 'push_save',
  'force_save', 'ranked_find_match', 'ranked_poll_match', 'ranked_cancel', 'ranked_report', 'ranked_settle_stale',
  'ranked_my_stats', 'ranked_top', 'cohort_create', 'cohort_join', 'cohort_leave', 'cohort_set_role', 'cohort_kick',
  'cohort_search', 'my_cohort', 'cohort_war_standings', 'school_standings', 'set_buddy_listing', 'my_buddy_listing',
  'remove_buddy_listing', 'find_buddies', 'set_group_discovery', 'discover_groups', 'join_public_group', 'cancel_group_request',
  'group_requests', 'resolve_group_request', 'get_my_pro', 'start_my_trial', 'redeem_pro_code'
];
const PREDICATES = ['has_block_between', 'is_group_member', 'can_see_post', 'can_see_activity'];
const INTERNAL = [
  'scores_sanity', 'scores_keep_best', 'activity_rate_limit', 'keep_richest_save', 'ranked_league_floor', 'ranked_delta',
  'ranked_apply', 'ranked_try_settle', 'cohort_week', 'cohort_random_tag', 'cohort_role_of', 'cohort_after_member_gone',
  'cohort_on_match_settled', 'cohort_add_war_points', 'pro_is_guest', 'analytics_pct', 'analytics_txt', 'analytics_num',
  'analytics_bool'
];
const SERVICE_ONLY = [
  'pro_grant', 'pro_grant_until', 'pro_revoke', 'pro_grant_item', 'pro_revoke_item', 'pro_has_item', 'pro_revoke_plan',
  'pro_forget_user', 'pro_grant_library', 'pro_revoke_library', 'pro_link_customer', 'pro_customer_user', 'pro_user_customer',
  'pro_event_once', 'pro_make_code', 'pro_store_claim', 'apple_token_save', 'apple_token_get', 'analytics_purge',
  'pro_set_billing_cancelled', 'pro_sync_entitlement'
];
const ANON_RPCS = ['ingest_analytics', 'delete_analytics', 'count_consent'];

export const FUNCTION_POLICY = {};
for (const n of GATED_RPCS) FUNCTION_POLICY[n] = { decision: 'gate', why: 'signed-in RPC that acts for auth.uid() or reads Language Dash data' };
for (const n of PREDICATES) FUNCTION_POLICY[n] = { decision: 'none', why: 'row-security predicate about the caller only; table policies carry the gate' };
for (const n of INTERNAL) FUNCTION_POLICY[n] = { decision: 'none', why: 'trigger or internal helper, not callable by app roles' };
for (const n of SERVICE_ONLY) FUNCTION_POLICY[n] = { decision: 'none', why: 'service role / owner only: acts on an explicit user id, never creates membership' };
for (const n of ANON_RPCS) FUNCTION_POLICY[n] = { decision: 'none', why: 'anonymous, consent-based usage statistics keyed by install id, no account' };
FUNCTION_POLICY.report_diagnostic = { decision: 'none', why: 'opt-in crash report: stores no account id, so it works before the player joins' };
// removed on purpose (see REMOVED_FUNCTIONS)
export const REMOVED_FUNCTIONS = {
  delete_my_account: 'deleted auth.users (the shared sign-in). Replaced by language_dash.delete_my_ld_data(), which only removes Language Dash data'
};
// hand-written membership layer (emitted by renderMembershipSql; listed so the report and checks know them)
export const MEMBERSHIP_FUNCTIONS = {
  is_member: { decision: 'none', why: 'membership layer: the gate itself (stable, security definer, used by policies)', grant: 'authenticated' },
  require_member: { decision: 'none', why: 'membership layer: raises not_a_member; first statement of gated SQL-language functions', grant: 'none (internal)' },
  my_membership: { decision: 'none', why: 'membership layer: {member, joined_at} for the caller', grant: 'authenticated' },
  join_language_dash: { decision: 'none', why: 'membership layer: the only way a membership row is created (idempotent)', grant: 'authenticated' },
  delete_my_ld_data: { decision: 'none', why: 'membership layer: wipes the caller\'s Language Dash data + membership, never auth.users', grant: 'authenticated' },
  purge_user_data: { decision: 'none', why: 'membership layer: same wipe for a given user id (edge function, service role) before it removes the sign-in', grant: 'service_role' }
};

// ---------------------------------------------------------------------------------------------------------------------
// Tokeniser
// ---------------------------------------------------------------------------------------------------------------------

const WORD_START = /[A-Za-z_]/;
const WORD_CHAR = /[A-Za-z0-9_]/;
const DOLLAR_OPEN = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/;

// token types: ws, comment, word, ident (quoted), string, dollar, number, punct
export function tokenize(sql) {
  const toks = [];
  const n = sql.length;
  let i = 0;
  while (i < n) {
    const c = sql[i];
    if (/\s/.test(c)) {
      let j = i + 1;
      while (j < n && /\s/.test(sql[j])) j++;
      toks.push({ type: 'ws', text: sql.slice(i, j) });
      i = j;
    } else if (c === '-' && sql[i + 1] === '-') {
      let j = i;
      while (j < n && sql[j] !== '\n') j++;
      toks.push({ type: 'comment', text: sql.slice(i, j) });
      i = j;
    } else if (c === '/' && sql[i + 1] === '*') {
      let depth = 1;
      let j = i + 2;
      while (j < n && depth > 0) {
        if (sql[j] === '/' && sql[j + 1] === '*') { depth++; j += 2; }
        else if (sql[j] === '*' && sql[j + 1] === '/') { depth--; j += 2; }
        else j++;
      }
      if (depth > 0) throw new MigrationError('unterminated /* comment at offset ' + i);
      toks.push({ type: 'comment', text: sql.slice(i, j) });
      i = j;
    } else if (c === "'") {
      const prev = toks[toks.length - 1];
      const escapes = !!prev && prev.type === 'word' && /^[Ee]$/.test(prev.text);
      let j = i + 1;
      for (;;) {
        if (j >= n) throw new MigrationError('unterminated string at offset ' + i);
        if (escapes && sql[j] === '\\') { j += 2; continue; }
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") { j += 2; continue; }
          break;
        }
        j++;
      }
      toks.push({ type: 'string', text: sql.slice(i, j + 1) });
      i = j + 1;
    } else if (c === '"') {
      let j = i + 1;
      for (;;) {
        if (j >= n) throw new MigrationError('unterminated quoted name at offset ' + i);
        if (sql[j] === '"') {
          if (sql[j + 1] === '"') { j += 2; continue; }
          break;
        }
        j++;
      }
      toks.push({ type: 'ident', text: sql.slice(i, j + 1) });
      i = j + 1;
    } else if (c === '$' && DOLLAR_OPEN.test(sql.slice(i, i + 80))) {
      const open = DOLLAR_OPEN.exec(sql.slice(i, i + 80))[0];
      const end = sql.indexOf(open, i + open.length);
      if (end < 0) throw new MigrationError('unterminated ' + open + ' quote at offset ' + i);
      toks.push({ type: 'dollar', text: sql.slice(i, end + open.length), tag: open });
      i = end + open.length;
    } else if (WORD_START.test(c)) {
      let j = i + 1;
      while (j < n && WORD_CHAR.test(sql[j])) j++;
      toks.push({ type: 'word', text: sql.slice(i, j) });
      i = j;
    } else if (/[0-9]/.test(c)) {
      let j = i + 1;
      while (j < n && /[0-9.]/.test(sql[j])) j++;
      toks.push({ type: 'number', text: sql.slice(i, j) });
      i = j;
    } else {
      toks.push({ type: 'punct', text: c });
      i++;
    }
  }
  return toks;
}

export function dollarBody(tok) {
  return tok.text.slice(tok.tag.length, tok.text.length - tok.tag.length);
}
function setDollarBody(tok, body) {
  tok.text = tok.tag + body + tok.tag;
}

export function untokenize(toks) {
  return toks.map((t) => t.text).join('');
}

// Split into statements at top-level semicolons. Comments before a statement stay with it. Leftover trivia is returned with
// kind 'trivia'.
export function splitStatements(sql, file) {
  const toks = tokenize(sql);
  const out = [];
  let cur = [];
  let offset = 0;
  let firstCode = -1;
  const flush = () => {
    out.push({ file, tokens: cur, line: 1 + countNl(sql.slice(0, firstCode < 0 ? offset : firstCode)), hasCode: firstCode >= 0 });
    cur = [];
    firstCode = -1;
  };
  for (const t of toks) {
    if (firstCode < 0 && t.type !== 'ws' && t.type !== 'comment') firstCode = offset;
    cur.push(t);
    offset += t.text.length;
    if (t.type === 'punct' && t.text === ';') flush();
  }
  if (cur.length) flush();
  return out;
}
function countNl(s) {
  let c = 0;
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) c++;
  return c;
}

const isCode = (t) => t.type !== 'ws' && t.type !== 'comment';
const up = (t) => (t && t.type === 'word' ? t.text.toUpperCase() : '');
export function codeOf(stmt) {
  const code = [];
  stmt.tokens.forEach((t, i) => { if (isCode(t)) code.push({ t, i }); });
  return code;
}
function where(stmt) {
  return stmt.file + '.sql line ' + stmt.line;
}
function fail(stmt, msg) {
  const first = untokenize(stmt.tokens).replace(/\s+/g, ' ').trim().slice(0, 90);
  throw new MigrationError(where(stmt) + ': ' + msg + '\n    statement: ' + first);
}

// ---------------------------------------------------------------------------------------------------------------------
// Statement classification
// ---------------------------------------------------------------------------------------------------------------------

const REJECT_WORDS = {
  EXTENSION: 'CREATE/ALTER/DROP EXTENSION is a database-wide change: ask the project owner to enable it in the dashboard',
  SCHEMA: 'schemas are created only by the generator (language_dash)',
  DATABASE: 'database-level settings are shared with every other app',
  ROLE: 'roles are shared with every other app',
  USER: 'roles are shared with every other app',
  SYSTEM: 'server settings are shared with every other app',
  PUBLICATION: 'publications are database-wide (only the known match_invites realtime DO block is allowed)',
  SUBSCRIPTION: 'subscriptions are database-wide',
  SERVER: 'foreign servers are database-wide',
  RULE: 'rules are not supported',
  'EVENT': 'event triggers are database-wide',
  TABLESPACE: 'tablespaces are database-wide',
  COLLATION: 'unsupported',
  OPERATOR: 'unsupported',
  AGGREGATE: 'unsupported',
  LANGUAGE: 'unsupported'
};

const ALLOWED_ROLES = new Set(['PUBLIC', 'ANON', 'AUTHENTICATED', 'SERVICE_ROLE']);
const FOREIGN_SCHEMA_RE = /\b(storage|extensions|cron|net|vault|realtime|supabase_functions|supabase_migrations|graphql|graphql_public|pgsodium|pgbouncer|pg_net|pgmq|information_schema)\s*\./i;
const EXT_FUNCTIONS_RE = /\b(uuid_generate_v[1-5]|crypt|gen_salt|digest|hmac|pgp_sym_encrypt|pgp_sym_decrypt|gen_random_bytes|similarity|unaccent|http_get|http_post|schedule)\s*\(/i;

function nameAt(code, k) {
  // schema-qualified or plain name starting at code[k]; returns {schema, name, next}
  const a = code[k];
  if (!a || (a.t.type !== 'word' && a.t.type !== 'ident')) return null;
  const strip = (x) => (x.type === 'ident' ? x.text.slice(1, -1) : x.text);
  const dot = code[k + 1];
  if (dot && dot.t.type === 'punct' && dot.t.text === '.' && code[k + 2] && (code[k + 2].t.type === 'word' || code[k + 2].t.type === 'ident')) {
    return { schema: strip(a.t), name: strip(code[k + 2].t), next: k + 3 };
  }
  return { schema: null, name: strip(a.t), next: k + 1 };
}
function checkSchema(stmt, nm) {
  if (nm.schema && !['public', SCHEMA].includes(nm.schema.toLowerCase())) {
    fail(stmt, 'object "' + nm.schema + '.' + nm.name + '" lives in another schema; the generator only creates objects in ' + SCHEMA);
  }
}

// Returns {kind, name, object, schemaObj} or throws. kind is e.g. CREATE_TABLE, GRANT, DO ...
export function classify(stmt) {
  const code = codeOf(stmt);
  const w = code.map((c) => up(c.t));
  if (!w.length) return { kind: 'TRIVIA' };
  let k = 1;
  const first = w[0];
  const reject = (word) => fail(stmt, REJECT_WORDS[word] || 'not supported');
  if (first === 'CREATE') {
    if (w[k] === 'OR' && w[k + 1] === 'REPLACE') k += 2;
    if (w[k] === 'UNIQUE') k++;
    if (w[k] === 'TEMP' || w[k] === 'TEMPORARY' || w[k] === 'UNLOGGED') fail(stmt, 'temporary / unlogged objects are not supported');
    let obj = w[k];
    if (obj === 'MATERIALIZED' && w[k + 1] === 'VIEW') { obj = 'MATVIEW'; k++; }
    if (obj === 'EVENT') reject('EVENT');
    if (REJECT_WORDS[obj] && !['LANGUAGE'].includes(obj)) reject(obj);
    if (obj === 'LANGUAGE') reject('LANGUAGE');
    if (!['TABLE', 'INDEX', 'VIEW', 'MATVIEW', 'FUNCTION', 'PROCEDURE', 'TRIGGER', 'POLICY', 'SEQUENCE', 'TYPE', 'DOMAIN'].includes(obj)) {
      fail(stmt, 'unknown CREATE ' + (obj || '?'));
    }
    k++;
    if (w[k] === 'IF' && w[k + 1] === 'NOT' && w[k + 2] === 'EXISTS') k += 3;
    if (obj === 'INDEX' && w[k] === 'CONCURRENTLY') fail(stmt, 'CREATE INDEX CONCURRENTLY cannot run inside the migration transaction');
    if (obj === 'POLICY' || obj === 'TRIGGER' || obj === 'INDEX') {
      // POLICY name ON table / TRIGGER name ... ON table / INDEX [name] ON table
      const idx = w.indexOf('ON', k);
      const nm = obj === 'INDEX' && w[k] === 'ON' ? { name: null } : nameAt(code, k);
      if (idx < 0) fail(stmt, 'cannot find the table of this ' + obj);
      const tn = nameAt(code, idx + 1);
      checkSchema(stmt, tn);
      return { kind: 'CREATE_' + obj, name: nm && nm.name, table: tn.name.toLowerCase() };
    }
    const nm = nameAt(code, k);
    if (!nm) fail(stmt, 'cannot read the name of this ' + obj);
    checkSchema(stmt, nm);
    return { kind: 'CREATE_' + obj, name: nm.name.toLowerCase(), nameEnd: nm.next };
  }
  if (first === 'ALTER') {
    const obj = w[k];
    if (obj === 'DEFAULT' && w[k + 1] === 'PRIVILEGES') {
      if (w.includes('FOR')) fail(stmt, 'ALTER DEFAULT PRIVILEGES FOR ROLE changes another role');
      if (!(w.includes('IN') && w.includes('SCHEMA'))) fail(stmt, 'ALTER DEFAULT PRIVILEGES without IN SCHEMA is database-wide');
      return { kind: 'ALTER_DEFAULT_PRIVILEGES' };
    }
    if (REJECT_WORDS[obj]) reject(obj);
    if (obj === 'MATERIALIZED') { k++; w[k] = 'VIEW'; }
    if (!['TABLE', 'FUNCTION', 'PROCEDURE', 'VIEW', 'SEQUENCE', 'TYPE', 'INDEX', 'POLICY'].includes(w[k])) fail(stmt, 'unknown ALTER ' + w[k]);
    let kk = k + 1;
    if (w[kk] === 'IF' && w[kk + 1] === 'EXISTS') kk += 2;
    if (w[kk] === 'ONLY') kk++;
    if (w[k] === 'POLICY') { const idx = w.indexOf('ON', kk); kk = idx + 1; }
    const nm = nameAt(code, kk);
    if (!nm) fail(stmt, 'cannot read the name after ALTER ' + w[k]);
    checkSchema(stmt, nm);
    if (w[k] === 'TABLE') {
      if (w.includes('OWNER') || w.includes('SET') && w[w.indexOf('SET') + 1] === 'SCHEMA') fail(stmt, 'ALTER TABLE OWNER / SET SCHEMA is not allowed');
    }
    return { kind: 'ALTER_' + w[k], name: nm.name.toLowerCase(), nameEnd: nm.next };
  }
  if (first === 'DROP') {
    const obj = w[k];
    if (REJECT_WORDS[obj]) reject(obj);
    if (!['POLICY', 'TRIGGER', 'FUNCTION', 'PROCEDURE', 'INDEX', 'VIEW', 'TABLE', 'MATERIALIZED', 'TYPE', 'SEQUENCE'].includes(obj)) fail(stmt, 'unknown DROP ' + obj);
    let kk = k + 1;
    if (obj === 'MATERIALIZED') kk++;
    if (w[kk] === 'IF' && w[kk + 1] === 'EXISTS') kk += 2;
    const nm = nameAt(code, kk);
    if (!nm) fail(stmt, 'cannot read the name after DROP ' + obj);
    checkSchema(stmt, nm);
    if (obj === 'POLICY' || obj === 'TRIGGER') {
      const on = w.indexOf('ON', kk);
      if (on < 0) fail(stmt, 'DROP ' + obj + ' without ON table');
      checkSchema(stmt, nameAt(code, on + 1));
    }
    return { kind: 'DROP_' + obj, name: nm.name.toLowerCase() };
  }
  if (first === 'GRANT' || first === 'REVOKE') {
    const dir = first === 'GRANT' ? 'TO' : 'FROM';
    let depth = 0;
    let di = -1;
    let on = -1;
    for (let j = 1; j < w.length; j++) {
      const t = code[j].t;
      if (t.type === 'punct' && t.text === '(') depth++;
      if (t.type === 'punct' && t.text === ')') depth--;
      if (depth === 0 && w[j] === 'ON' && on < 0) on = j;
      if (depth === 0 && w[j] === dir && on >= 0) { di = j; break; }
    }
    if (on < 0) fail(stmt, first + ' of a role (no ON clause) is not supported');
    if (di < 0) fail(stmt, 'cannot find ' + dir + ' in ' + first);
    for (let j = di + 1; j < code.length; j++) {
      const t = code[j].t;
      if (t.type === 'punct') continue;
      if (up(t) === 'WITH' || up(t) === 'GRANTED') break;
      const r = t.type === 'ident' ? t.text.slice(1, -1).toUpperCase() : up(t);
      if (up(t) === 'CASCADE' || up(t) === 'RESTRICT') continue;
      if (!ALLOWED_ROLES.has(r)) fail(stmt, first + ' names role "' + t.text + '": only PUBLIC, anon, authenticated and service_role are allowed');
    }
    const target = w[on + 1];
    if (['DATABASE', 'TABLESPACE', 'LANGUAGE', 'LARGE', 'FOREIGN', 'DOMAIN', 'TYPE'].includes(target)) fail(stmt, first + ' ON ' + target + ' is not supported');
    if (target === 'SCHEMA') {
      const nm = nameAt(code, on + 2);
      if (!nm || nm.name.toLowerCase() !== SCHEMA) fail(stmt, first + ' ON SCHEMA must name ' + SCHEMA);
    }
    return { kind: first, targetKind: target, onIndex: on };
  }
  if (first === 'COMMENT') {
    if (w[1] !== 'ON') fail(stmt, 'malformed COMMENT');
    if (['EXTENSION', 'DATABASE', 'ROLE', 'SCHEMA', 'PUBLICATION'].includes(w[2])) fail(stmt, 'COMMENT ON ' + w[2] + ' is not supported');
    return { kind: 'COMMENT' };
  }
  if (first === 'DO') {
    const body = code.find((c) => c.t.type === 'dollar');
    if (!body) fail(stmt, 'DO block without a $$ body');
    return { kind: 'DO', bodyTok: body.t };
  }
  if (first === 'DELETE' && w[1] === 'FROM') {
    const nm = nameAt(code, 2);
    checkSchema(stmt, nm);
    return { kind: 'DELETE', name: nm.name.toLowerCase() };
  }
  if (first === 'SELECT' || first === 'INSERT' || first === 'UPDATE') {
    fail(stmt, 'top-level ' + first + ' (data change, cron.schedule or extension call?) is not supported; only DDL, grants and known DO blocks are');
  }
  if (['BEGIN', 'COMMIT', 'ROLLBACK', 'SET', 'RESET', 'SAVEPOINT', 'START', 'END', 'LISTEN', 'NOTIFY', 'LOAD', 'TRUNCATE', 'VACUUM', 'ANALYZE', 'REINDEX', 'CALL', 'COPY'].includes(first)) {
    fail(stmt, first + ' is not allowed in a template file (the generator owns the transaction and search_path)');
  }
  return fail(stmt, 'unrecognised statement starting with "' + first + '"');
}

// ---------------------------------------------------------------------------------------------------------------------
// Rewriting
// ---------------------------------------------------------------------------------------------------------------------

function newCounters() {
  return {
    schemaQualified: 0, // public.x -> language_dash.x
    schemaLiterals: 0, // 'public' catalog literals, IN SCHEMA public
    pinsRewritten: 0, // SET search_path = public[, auth] -> language_dash, pg_temp
    pinsAdded: 0, // functions that had no pin
    fkRetargeted: 0, // REFERENCES auth.users(id) -> language_dash.members(user_id)
    gatesPlpgsql: 0,
    gatesSql: 0,
    doBlocks: 0,
    removed: 0
  };
}

// a function statement: parse its header. Returns null if not a function.
function parseFunction(stmt) {
  const code = codeOf(stmt);
  let k = 1;
  if (up(code[k].t) === 'OR') k += 2;
  const kindWord = up(code[k].t);
  if (kindWord !== 'FUNCTION' && kindWord !== 'PROCEDURE') return null;
  const nm = nameAt(code, k + 1);
  let p = nm.next;
  if (!(code[p].t.type === 'punct' && code[p].t.text === '(')) fail(stmt, 'expected "(" after the function name');
  let depth = 0;
  let paramsEnd = -1;
  for (let j = p; j < code.length; j++) {
    const t = code[j].t;
    if (t.type === 'punct' && t.text === '(') depth++;
    if (t.type === 'punct' && t.text === ')') { depth--; if (depth === 0) { paramsEnd = j; break; } }
  }
  if (paramsEnd < 0) fail(stmt, 'unbalanced function parameter list');
  let bodyAt = -1;
  for (let j = paramsEnd + 1; j < code.length; j++) {
    if ((code[j].t.type === 'dollar' || code[j].t.type === 'string') && up(code[j - 1].t) === 'AS') { bodyAt = j; break; }
  }
  if (bodyAt < 0) fail(stmt, 'function without an AS $$ body (BEGIN ATOMIC / external functions are not supported)');
  const header = code.slice(paramsEnd + 1, bodyAt - 1);
  let lang = null;
  let secdef = false;
  let setIdx = -1;
  const argText = untokenize(stmt.tokens.slice(code[p].i, code[paramsEnd].i + 1));
  for (let j = 0; j < header.length; j++) {
    const u = up(header[j].t);
    if (u === 'LANGUAGE') lang = up(header[j + 1].t) || header[j + 1].t.text.toLowerCase();
    if (u === 'SECURITY' && up(header[j + 1].t) === 'DEFINER') secdef = true;
    if (u === 'SET' && header[j + 1] && /^search_path$/i.test(header[j + 1].t.text)) setIdx = j;
  }
  if (!lang) fail(stmt, 'function without LANGUAGE');
  return {
    code, name: nm.name.toLowerCase(), schema: nm.schema, args: argText.replace(/\s+/g, ' '),
    lang: lang.toLowerCase(), secdef, header, headerFrom: paramsEnd + 1, bodyAt, setIdx, asIdx: bodyAt - 1
  };
}

const HEADER_STOP = new Set(['AS', 'LANGUAGE', 'SECURITY', 'STABLE', 'IMMUTABLE', 'VOLATILE', 'STRICT', 'SET', 'COST', 'ROWS', 'PARALLEL', 'LEAKPROOF', 'CALLED', 'RETURNS', 'WINDOW', 'TRANSFORM', 'SUPPORT', 'NOT']);

// Rewrites the search_path pin of a function statement in place; returns 'rewritten' | 'added'
function pinFunction(stmt, f, counters) {
  const toks = stmt.tokens;
  if (f.setIdx >= 0) {
    const startC = f.code[f.headerFrom + f.setIdx];
    let endCodeIdx = f.headerFrom + f.setIdx + 1; // 'search_path'
    let j = endCodeIdx + 1;
    while (j < f.bodyAt - 1) {
      const t = f.code[j].t;
      if (t.type === 'word' && HEADER_STOP.has(t.text.toUpperCase()) && !(up(t) === 'TO')) break;
      endCodeIdx = j;
      j++;
    }
    const values = [];
    for (let m = f.headerFrom + f.setIdx + 2; m <= endCodeIdx; m++) {
      const t = f.code[m].t;
      if (t.type === 'punct' && (t.text === '=' || t.text === ',')) continue;
      if (up(t) === 'TO') continue;
      values.push(t.text.toLowerCase());
    }
    const ok = new Set(['public', 'auth', 'pg_temp', 'pg_catalog']);
    const bad = values.filter((v) => !ok.has(v));
    if (!values.length || bad.length) fail(stmt, 'function ' + f.name + ' pins search_path to "' + values.join(', ') + '": only public, auth, pg_temp and pg_catalog can be translated safely');
    const from = startC.i;
    const to = f.code[endCodeIdx].i;
    toks.splice(from, to - from + 1, { type: 'word', text: PIN });
    counters.pinsRewritten++;
    return 'rewritten';
  }
  const asTok = f.code[f.asIdx].i;
  toks.splice(asTok, 0, { type: 'word', text: PIN }, { type: 'ws', text: '\n' });
  counters.pinsAdded++;
  return 'added';
}

// find the main BEGIN of a plpgsql body, skipping comments and strings
export function findPlpgsqlBegin(body) {
  const toks = tokenize(body);
  let off = 0;
  for (const t of toks) {
    if (t.type === 'word' && t.text.toUpperCase() === 'BEGIN') return off + t.text.length;
    off += t.text.length;
  }
  return -1;
}

export const GATE_PLPGSQL = "IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;";
export const GATE_SQL = 'SELECT language_dash.require_member();';

function gateFunction(stmt, f, counters) {
  const tok = stmt.tokens.find((t, i) => i === f.code[f.bodyAt].i);
  if (tok.type !== 'dollar') fail(stmt, 'gated function ' + f.name + ' needs a $$ body');
  const body = dollarBody(tok);
  if (f.lang === 'plpgsql') {
    const at = findPlpgsqlBegin(body);
    if (at < 0) fail(stmt, 'cannot find BEGIN in the body of ' + f.name);
    setDollarBody(tok, body.slice(0, at) + '\n  ' + GATE_PLPGSQL + body.slice(at));
    counters.gatesPlpgsql++;
  } else if (f.lang === 'sql') {
    setDollarBody(tok, '\n  ' + GATE_SQL + body.replace(/^\n/, '\n'));
    counters.gatesSql++;
  } else {
    fail(stmt, 'cannot gate a ' + f.lang + ' function (' + f.name + ')');
  }
}

// Rewrites code and body text for schema qualification. Throws on anything that would leave the schema.
function rewriteSchemaRefs(stmt, counters, opts) {
  const toks = stmt.tokens;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'word' && t.text.toLowerCase() === 'public') {
      const nxt = toks[i + 1];
      const prevCode = [];
      for (let j = i - 1; j >= 0 && prevCode.length < 2; j--) if (isCode(toks[j])) prevCode.unshift(toks[j]);
      if (nxt && nxt.type === 'punct' && nxt.text === '.') {
        t.text = SCHEMA;
        counters.schemaQualified++;
      } else if (prevCode.length === 2 && up(prevCode[0]) === 'IN' && up(prevCode[1]) === 'SCHEMA') {
        t.text = SCHEMA;
        counters.schemaLiterals++;
      } else if (opts && opts.privilege && prevCode.length && (up(prevCode[prevCode.length - 1]) === 'FROM' || (prevCode[prevCode.length - 1].text === ',' && !opts.afterTo))) {
        // the PUBLIC pseudo-role in REVOKE ... FROM PUBLIC, anon (never the schema)
      } else {
        fail(stmt, 'bare reference to the "public" schema or role that the generator cannot translate');
      }
    }
    if (t.type === 'dollar' || t.type === 'string') {
      let text = t.type === 'dollar' ? dollarBody(t) : t.text;
      const before = text;
      text = text.replace(/\b(nspname|schemaname|table_schema)(\s*=\s*)'public'/gi, (m, a, b) => { counters.schemaLiterals++; return a + b + "'" + SCHEMA + "'"; });
      text = text.replace(/(^|[^A-Za-z0-9_$])public\.(?=[A-Za-z_"%']|$)/g, (m, a) => { counters.schemaQualified++; return a + SCHEMA + '.'; });
      if (text !== before) {
        if (t.type === 'dollar') setDollarBody(t, text); else t.text = text;
      }
      const check = t.type === 'dollar' ? dollarBody(t) : t.text;
      scanBody(stmt, check, opts);
    }
  }
}

function stripComments(text) {
  return text.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

// body text safety checks (comments excluded)
function scanBody(stmt, text, opts) {
  const body = stripComments(text);
  const fs = FOREIGN_SCHEMA_RE.exec(body.replace(/'[^']*'/g, (m) => (/'(storage|extensions|cron|net|vault|realtime)\./i.test(m) ? m : "''")));
  if (fs) fail(stmt, 'body refers to another schema ("' + fs[1] + '."): storage / extensions / cron / realtime objects cannot be created or used from the Language Dash schema');
  const ext = EXT_FUNCTIONS_RE.exec(body);
  if (ext) fail(stmt, 'body calls ' + ext[1] + '(), which lives in an extension schema that the pinned search_path does not include');
  const authBad = /\bauth\s*\.\s*(?!uid\b|jwt\b)(\w+)/i.exec(body);
  if (authBad) fail(stmt, 'body uses auth.' + authBad[1] + ': only auth.uid() and auth.jwt() are allowed (never read or change the shared sign-in table)');
  if (/\b(CREATE|ALTER|DROP)\s+(EXTENSION|ROLE|USER|DATABASE|SCHEMA|PUBLICATION)\b/i.test(body) && !(opts && opts.allowPublication && /ALTER\s+PUBLICATION/i.test(body))) {
    fail(stmt, 'body contains a database-wide DDL statement');
  }
}

// REFERENCES auth.users(id) -> REFERENCES language_dash.members(user_id)
function retargetFks(stmt, counters, fkTarget) {
  const toks = stmt.tokens;
  for (let i = 0; i < toks.length; i++) {
    if (!(toks[i].type === 'word' && toks[i].text.toUpperCase() === 'REFERENCES')) continue;
    const idx = [];
    for (let j = i + 1; j < toks.length && idx.length < 3; j++) if (isCode(toks[j])) idx.push(j);
    if (idx.length < 3) continue;
    const [a, d, u] = idx;
    if (!(toks[a].text.toLowerCase() === 'auth' && toks[d].text === '.' && toks[u].text.toLowerCase() === 'users')) continue;
    if (fkTarget !== 'members') continue;
    toks[a].text = SCHEMA;
    toks[u].text = 'members';
    // (id) -> (user_id)
    const rest = [];
    for (let j = u + 1; j < toks.length && rest.length < 3; j++) if (isCode(toks[j])) rest.push(j);
    if (rest.length === 3 && toks[rest[0]].text === '(' && toks[rest[1]].text.toLowerCase() === 'id' && toks[rest[2]].text === ')') {
      toks[rest[1]].text = 'user_id';
    } else {
      fail(stmt, 'REFERENCES auth.users without a plain (id) column list');
    }
    counters.fkRetargeted++;
  }
}

// column definitions of CREATE TABLE / ALTER TABLE ... ADD COLUMN, for the registry
function parseColumns(stmt, info) {
  const code = codeOf(stmt);
  const w = code.map((c) => up(c.t));
  const cols = [];
  const refsOf = (items) => {
    // items: code entries of one column definition
    const wi = items.map((c) => up(c.t));
    let refAuth = false;
    let refTable = null;
    let onDelete = null;
    const r = wi.indexOf('REFERENCES');
    if (r >= 0) {
      const nm = nameAt(items, r + 1);
      if (nm && nm.schema && nm.schema.toLowerCase() === 'auth' && nm.name.toLowerCase() === 'users') refAuth = true;
      else if (nm) refTable = nm.name.toLowerCase();
      const od = wi.indexOf('ON', r);
      if (od >= 0 && wi[od + 1] === 'DELETE') onDelete = wi.slice(od + 2, od + 4).join(' ');
    }
    return { refAuth, refTable, onDelete };
  };
  if (info.kind === 'CREATE_TABLE') {
    const open = code.findIndex((c, i) => i >= info.nameEnd && c.t.type === 'punct' && c.t.text === '(');
    if (open < 0) fail(stmt, 'CREATE TABLE without a column list (CREATE TABLE AS / LIKE / PARTITION OF are not supported)');
    let depth = 0;
    let item = [];
    const items = [];
    for (let j = open; j < code.length; j++) {
      const t = code[j].t;
      if (t.type === 'punct' && t.text === '(') { depth++; if (depth === 1) continue; }
      if (t.type === 'punct' && t.text === ')') { depth--; if (depth === 0) { if (item.length) items.push(item); break; } }
      if (depth === 1 && t.type === 'punct' && t.text === ',') { items.push(item); item = []; continue; }
      item.push(code[j]);
    }
    for (const it of items) {
      const f = up(it[0].t);
      if (['CONSTRAINT', 'PRIMARY', 'UNIQUE', 'CHECK', 'FOREIGN', 'EXCLUDE', 'LIKE'].includes(f)) {
        const wi = it.map((c) => up(c.t));
        if (wi.includes('FOREIGN') && wi.includes('REFERENCES') && wi.join(' ').includes('REFERENCES AUTH')) {
          fail(stmt, 'table-level FOREIGN KEY to auth.users is not supported (use a column REFERENCES)');
        }
        if (f === 'LIKE') fail(stmt, 'CREATE TABLE ... LIKE is not supported');
        continue;
      }
      cols.push({ name: it[0].t.text.replace(/"/g, '').toLowerCase(), type: it[1] ? it[1].t.text.toLowerCase() : '', ...refsOf(it) });
    }
  } else if (info.kind === 'ALTER_TABLE') {
    const a = w.indexOf('ADD');
    if (a >= 0 && (w[a + 1] === 'COLUMN')) {
      let k = a + 2;
      if (w[k] === 'IF' && w[k + 1] === 'NOT' && w[k + 2] === 'EXISTS') k += 3;
      const it = code.slice(k);
      cols.push({ name: it[0].t.text.replace(/"/g, '').toLowerCase(), type: it[1] ? it[1].t.text.toLowerCase() : '', ...refsOf(it) });
    }
  }
  return cols;
}

// ---------------------------------------------------------------------------------------------------------------------
// DO blocks: only these known ones are accepted
// ---------------------------------------------------------------------------------------------------------------------
const DO_REGISTRY = [
  { id: 'realtime-publication', re: /ALTER\s+PUBLICATION\s+supabase_realtime\s+ADD\s+TABLE\s+match_invites\s*;/i, publication: true,
    why: 'adds language_dash.match_invites to the shared supabase_realtime publication (the publication and public.* are not touched)' },
  { id: 'lockdown-functions', re: /signed_in\s+text\[\]\s*:=\s*ARRAY/i, why: 'closes every function in language_dash, then opens the signed-in / anon allow-list' },
  { id: 'lockdown-tables', re: /FOR\s+r\s+IN\s+SELECT\s+c\.oid::regclass[\s\S]*FROM\s+pg_class/i, why: 'closes every table / view in language_dash' },
  { id: 'lockdown-grants', re: /to_regclass\(\s*'public\.'\s*\|\|\s*g\.tbl\s*\)/i, why: 'grants the short list of table privileges (members added)' },
  { id: 'analytics-views-revoke', re: /FROM\s+pg_views\s+WHERE\s+schemaname\s*=\s*'public'\s+AND\s+viewname\s+LIKE\s+'analytics\\_v\\_%'/i, why: 'closes the analytics views' }
];

export function classifyDo(stmt, tok) {
  const body = dollarBody(tok);
  const hit = DO_REGISTRY.find((d) => d.re.test(body));
  if (!hit) fail(stmt, 'unknown DO block: only the known realtime / lockdown / analytics-view blocks are translated');
  return hit;
}

// ---------------------------------------------------------------------------------------------------------------------
// Converting one file
// ---------------------------------------------------------------------------------------------------------------------

export function newContext(options = {}) {
  return {
    options: { fkTarget: 'members', ...options },
    counters: newCounters(),
    tables: {}, // name -> {file, columns: [], rls: bool, fks: []}
    views: {},
    functions: [], // {name, args, lang, secdef, decision, why, file, pin}
    stmtIn: 0,
    stmtOut: 0,
    kinds: {},
    removed: [],
    dos: []
  };
}

export function convertSource(file, text, ctx) {
  const stmts = splitStatements(text, file);
  const out = [];
  let pendingRemovalNote = false;
  for (const stmt of stmts) {
    if (!stmt.hasCode) { out.push(untokenize(stmt.tokens)); continue; }
    ctx.stmtIn++;
    const info = classify(stmt);
    const kindKey = info.kind === 'GRANT' || info.kind === 'REVOKE' ? info.kind : info.kind;
    ctx.kinds[kindKey] = (ctx.kinds[kindKey] || 0) + 1;

    // statements about removed functions
    const text0 = untokenize(stmt.tokens);
    const removedHit = Object.keys(REMOVED_FUNCTIONS).find((n) => new RegExp('\\b' + n + '\\b').test(stripComments(text0)));
    if (removedHit) {
      const isFnStmt = (info.kind === 'CREATE_FUNCTION' && info.name === removedHit) ||
        ((info.kind === 'GRANT' || info.kind === 'REVOKE') && /ON\s+FUNCTION\s+delete_my_account\s*\(/i.test(stripComments(text0)));
      if (!isFnStmt) fail(stmt, 'refers to ' + removedHit + '(), which is removed in the shared project (' + REMOVED_FUNCTIONS[removedHit] + ')');
      ctx.counters.removed++;
      ctx.removed.push({ what: info.kind === 'CREATE_FUNCTION' ? 'function ' + removedHit + '()' : info.kind + ' on ' + removedHit + '()', file });
      if (!pendingRemovalNote) {
        out.push('-- (' + removedHit + '() is NOT carried over: ' + REMOVED_FUNCTIONS[removedHit] + '.)\n');
        pendingRemovalNote = true;
      }
      continue;
    }

    const opts = { privilege: info.kind === 'REVOKE' || info.kind === 'GRANT' || info.kind === 'ALTER_DEFAULT_PRIVILEGES' };
    if (info.kind === 'DO') {
      const d = classifyDo(stmt, info.bodyTok);
      opts.allowPublication = !!d.publication;
      ctx.counters.doBlocks++;
      ctx.dos.push({ id: d.id, why: d.why, file });
      if (d.publication) {
        const b = dollarBody(info.bodyTok).replace(/ADD\s+TABLE\s+match_invites\s*;/i, 'ADD TABLE ' + SCHEMA + '.match_invites;');
        setDollarBody(info.bodyTok, b);
        ctx.counters.schemaQualified++;
      }
    }

    // registries (before rewriting, from the original text)
    if (info.kind === 'CREATE_TABLE') {
      const cols = parseColumns(stmt, info);
      if (ctx.tables[info.name] && !/IF\s+NOT\s+EXISTS/i.test(text0)) fail(stmt, 'table ' + info.name + ' is created twice');
      ctx.tables[info.name] = ctx.tables[info.name] || { file, columns: [], rls: false };
      ctx.tables[info.name].columns.push(...cols);
    } else if (info.kind === 'ALTER_TABLE') {
      const t = ctx.tables[info.name];
      if (!t) fail(stmt, 'ALTER TABLE ' + info.name + ': table is not created by the template files seen so far');
      t.columns.push(...parseColumns(stmt, info));
      if (/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(stripComments(text0))) t.rls = true;
    } else if (info.kind === 'CREATE_VIEW' || info.kind === 'CREATE_MATVIEW') {
      ctx.views[info.name] = { file, why: classifyView(info.name) };
    }

    if (info.kind === 'CREATE_FUNCTION' || info.kind === 'CREATE_PROCEDURE') {
      const f = parseFunction(stmt);
      const pol = FUNCTION_POLICY[f.name];
      if (!pol) fail(stmt, 'function "' + f.name + '" is not classified: add it to FUNCTION_POLICY (gate or none) in tools/ld-migrate/lib.mjs');
      if (pol.decision === 'gate' && !f.secdef) fail(stmt, 'gated function ' + f.name + ' must be SECURITY DEFINER');
      const pin = pinFunction(stmt, f, ctx.counters);
      // re-parse after the pin edit (indexes moved)
      const f2 = parseFunction(stmt);
      if (pol.decision === 'gate') gateFunction(stmt, f2, ctx.counters);
      ctx.functions.push({ name: f.name, args: f.args, lang: f.lang, secdef: f.secdef, decision: pol.decision, why: pol.why, file, pin });
    }

    retargetFks(stmt, ctx.counters, ctx.options.fkTarget);
    rewriteSchemaRefs(stmt, ctx.counters, opts);
    // anything still pointing at auth.users after rewriting (fkTarget=auth keeps the FK)
    const done = untokenize(stmt.tokens);
    const sans = stripComments(done);
    if (/\bauth\s*\.\s*users\b/i.test(sans) && !(ctx.options.fkTarget === 'auth' && info.kind === 'CREATE_TABLE')) {
      fail(stmt, 'auth.users is referenced outside a table foreign key (the shared sign-in table must never be read or written)');
    }
    out.push(done);
    ctx.stmtOut++;
  }
  return out.join('');
}

// ---------------------------------------------------------------------------------------------------------------------
// Lockdown / audit text patches (the allow-lists name delete_my_account; the new membership functions replace it)
// ---------------------------------------------------------------------------------------------------------------------

export const MEMBERSHIP_ALLOW = ["'delete_my_ld_data'", "'is_member'", "'join_language_dash'", "'my_membership'"];

export function patchAllowList(text, file) {
  const needle = "'delete_my_account', ";
  const n = text.split(needle).length - 1;
  if (n !== 1) throw new MigrationError(file + '.sql: expected the signed_in list to contain \'delete_my_account\' exactly once, found ' + n);
  return text.replace(needle, MEMBERSHIP_ALLOW.join(', ') + ', ');
}

export function patchLockdown(text) {
  let t = patchAllowList(text, 'lockdown');
  const anchor = "    ('activity_events',";
  if (t.split(anchor).length !== 2) throw new MigrationError("lockdown.sql: expected the table grant list to start with ('activity_events', exactly once");
  t = t.replace(anchor, "    ('members',           '',       'SELECT'),                                 -- (language_dash.members: a signed-in user reads only their own row; rows are created only by join_language_dash)\n" + anchor);
  return t;
}

export function signedInList(text) {
  const m = /signed_in\s+text\[\]\s*:=\s*ARRAY\[([\s\S]*?)\]/.exec(text) || /signed_in AS \(SELECT unnest\(ARRAY\[([\s\S]*?)\]\)/.exec(text);
  if (!m) throw new MigrationError('cannot find the signed_in allow-list');
  return [...m[1].matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1]);
}

// audit.sql: same allow-list, schema literals -> language_dash
export function convertAudit(text, counters = newCounters()) {
  let t = patchAllowList(text, 'audit');
  t = t.replace(/\b(nspname|schemaname)(\s*=\s*)'public'/g, (m, a, b) => { counters.schemaLiterals++; return a + b + "'" + SCHEMA + "'"; });
  if (/'public'/.test(stripComments(t))) throw new MigrationError("audit.sql: a 'public' literal is left after rewriting");
  return t;
}

// ---------------------------------------------------------------------------------------------------------------------
// Hand-written membership layer
// ---------------------------------------------------------------------------------------------------------------------

export function renderMembershipSql() {
  return `-- ===================================================================================================================
-- MEMBERSHIP LAYER (hand-written, not from database/*.sql)
--
-- One sign-in per person lives in the shared auth.users pool. Language Dash membership is a separate, deliberate step:
-- language_dash.join_language_dash() is the ONLY way a row appears in language_dash.members. Signing in through another
-- app creates nothing here. Every table that holds member data is closed to non-members by the restrictive policy
-- ld_member_gate, and every function that acts for the caller starts with a membership check.
-- ===================================================================================================================

CREATE TABLE IF NOT EXISTS language_dash.members (
  user_id   uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE language_dash.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS members_select_own ON language_dash.members;
CREATE POLICY members_select_own ON language_dash.members FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
-- (no INSERT / UPDATE / DELETE policy and no privilege: clients cannot write this table directly)
REVOKE ALL ON language_dash.members FROM PUBLIC, anon, authenticated;
GRANT SELECT ON language_dash.members TO authenticated;

-- Is the caller a Language Dash member? (stable, security definer: used by the gate policies)
CREATE OR REPLACE FUNCTION language_dash.is_member() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER ${PIN} AS $$
  SELECT EXISTS (SELECT 1 FROM language_dash.members WHERE user_id = auth.uid())
$$;

-- Raises not_a_member (SQLSTATE 42501) for a non-member. Internal: first statement of gated SQL-language functions.
CREATE OR REPLACE FUNCTION language_dash.require_member() RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER ${PIN} AS $$
BEGIN
  IF NOT language_dash.is_member() THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
END $$;

-- { member boolean, joined_at timestamptz } for the caller
CREATE OR REPLACE FUNCTION language_dash.my_membership() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER ${PIN} AS $$
DECLARE j timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('member', false, 'joined_at', NULL); END IF;
  SELECT joined_at INTO j FROM language_dash.members WHERE user_id = auth.uid();
  RETURN jsonb_build_object('member', j IS NOT NULL, 'joined_at', j);
END $$;

-- Become a Language Dash member (idempotent). The only code path that inserts into members.
CREATE OR REPLACE FUNCTION language_dash.join_language_dash() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER ${PIN} AS $$
DECLARE me uuid := auth.uid(); j timestamptz;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_signed_in' USING ERRCODE = '28000'; END IF;
  INSERT INTO language_dash.members (user_id) VALUES (me) ON CONFLICT (user_id) DO NOTHING;
  SELECT joined_at INTO j FROM language_dash.members WHERE user_id = me;
  RETURN jsonb_build_object('member', true, 'joined_at', j);
END $$;

REVOKE ALL ON FUNCTION language_dash.is_member(), language_dash.require_member(), language_dash.my_membership(),
  language_dash.join_language_dash() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION language_dash.is_member(), language_dash.my_membership(), language_dash.join_language_dash() TO authenticated;

`;
}

// Orders tables so that a table that REFERENCES another is deleted first.
export function purgeOrder(ctx) {
  const names = Object.keys(TABLES).filter((n) => (TABLES[n].userCols.length || (TABLES[n].setNull || []).length) && ctx.tables[n]);
  const deps = {};
  for (const n of names) {
    deps[n] = new Set(ctx.tables[n].columns.map((c) => c.refTable).filter((r) => r && r !== n && names.includes(r)));
  }
  // n must come before every table it references: reverse topological order
  const order = [];
  const done = new Set();
  const visiting = new Set();
  const visit = (n) => {
    if (done.has(n)) return;
    if (visiting.has(n)) throw new MigrationError('foreign-key cycle through ' + n + ': cannot order the member-data wipe');
    visiting.add(n);
    // everything that references n must be wiped first
    for (const m of names) if (deps[m].has(n)) visit(m);
    visiting.delete(n);
    done.add(n);
    order.push(n);
  };
  for (const n of [...names].sort()) visit(n);
  return order;
}

export function renderPurgeSql(ctx) {
  const order = purgeOrder(ctx);
  const lines = [];
  for (const n of order) {
    const t = TABLES[n];
    if (t.userCols.length && !t.keepOnPurge) {
      const cond = t.userCols.map((c) => c + ' = p_user').join(' OR ');
      lines.push('  DELETE FROM language_dash.' + n + ' WHERE ' + cond + ';');
      lines.push("  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('" + n + "', n);");
    }
    for (const c of t.setNull || []) {
      lines.push('  UPDATE language_dash.' + n + ' SET ' + c + ' = NULL WHERE ' + c + ' = p_user;');
      lines.push("  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('" + n + '.' + c + "', n);");
    }
  }
  return `-- ===================================================================================================================
-- MEMBER DATA WIPE (generated from the table classification: ${order.length} tables, children before parents)
-- ===================================================================================================================

-- Removes every Language Dash row that belongs to p_user, then the membership. NEVER touches auth.users (the shared sign-in).
-- Used by delete_my_ld_data() for the caller, and by the edge function (service role) just before it removes the sign-in.
-- Two tables are deliberately NOT wiped here (keepOnPurge in the classification): apple_tokens (a later sign-in removal
-- still needs the token to revoke the Apple login) and pro_trials (the once-per-account trial marker must not reset).
-- pro_forget_user removes both when the sign-in itself is removed.
CREATE OR REPLACE FUNCTION language_dash.purge_user_data(p_user uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER ${PIN} AS $$
DECLARE n integer; counts jsonb := '{}'::jsonb;
BEGIN
  IF p_user IS NULL THEN RAISE EXCEPTION 'user required'; END IF;
${lines.join('\n')}
  DELETE FROM language_dash.members WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('members', n);
  RETURN counts;
END $$;

-- "Delete my Language Dash account": the caller's Language Dash data and membership only. Works for a non-member too (it
-- clears anything a payment webhook may have recorded before they joined). A subscription that is still billing must be
-- cancelled first, exactly as the template's delete_my_account required. "Still billing" is the cancelled_at marker,
-- not the paid time left in until: once the subscription is cancelled (in the app, which records it, or in Stripe's
-- portal, which the webhook records) nothing more will be charged, and deletion may proceed while the paid time runs on.
CREATE OR REPLACE FUNCTION language_dash.delete_my_ld_data() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER ${PIN} AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not_signed_in' USING ERRCODE = '28000'; END IF;
  IF EXISTS (SELECT 1 FROM language_dash.pro_entitlements WHERE user_id = me AND source = 'stripe' AND plan IN ('monthly', 'yearly', 'pass3m') AND until > now() AND cancelled_at IS NULL) THEN
    RAISE EXCEPTION 'subscription_still_billing' USING ERRCODE = '55000',
      HINT = 'Cancel the subscription first (Settings, Language Dash Pro, Manage subscription), then delete your Language Dash data.';
  END IF;
  RETURN language_dash.purge_user_data(me);
END $$;

REVOKE ALL ON FUNCTION language_dash.purge_user_data(uuid), language_dash.delete_my_ld_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION language_dash.delete_my_ld_data() TO authenticated;

`;
}

export function gatedTables(ctx) {
  return Object.keys(ctx.tables).filter((n) => TABLES[n] && ['member', 'shared'].includes(TABLES[n].cls));
}

export function renderGateSql(ctx) {
  const t = gatedTables(ctx);
  const body = t.map((n) => 'DROP POLICY IF EXISTS ld_member_gate ON language_dash.' + n + ';\n' +
    'CREATE POLICY ld_member_gate ON language_dash.' + n + ' AS RESTRICTIVE FOR ALL TO authenticated\n' +
    '  USING ((SELECT language_dash.is_member())) WITH CHECK ((SELECT language_dash.is_member()));').join('\n');
  return `-- ===================================================================================================================
-- MEMBER GATE (generated: ${t.length} tables). A RESTRICTIVE policy is ANDed with every other policy, so a signed-in
-- non-member sees and writes nothing, whatever the template's own policies say. service_role and the table owner bypass RLS.
-- ===================================================================================================================

${body}

`;
}

export function renderRolesSql() {
  return `-- ===================================================================================================================
-- ROLE ACCESS TO THE SCHEMA (after lockdown.sql, which closed everything and opened only the allow-lists)
-- service_role bypasses row security but still needs privileges; anon and authenticated get schema USAGE only
-- (the allow-lists above decide what they may touch inside it).
-- ===================================================================================================================

GRANT USAGE ON SCHEMA language_dash TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA language_dash TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA language_dash TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA language_dash TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA language_dash GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA language_dash GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA language_dash GRANT EXECUTE ON FUNCTIONS TO service_role;
`;
}

// ---------------------------------------------------------------------------------------------------------------------
// Whole migration
// ---------------------------------------------------------------------------------------------------------------------

export function checkContext(ctx, lockdownText) {
  // every table classified, flagged user columns declared, RLS on
  for (const [name, t] of Object.entries(ctx.tables)) {
    const decl = TABLES[name];
    if (!decl) throw new MigrationError('unclassified table "' + name + '" (' + t.file + '.sql): add it to TABLES in tools/ld-migrate/lib.mjs');
    if (!t.rls) throw new MigrationError('table ' + name + ' never gets ENABLE ROW LEVEL SECURITY in the template');
    const auto = t.columns.filter((c) => c.refAuth || c.name === 'user_id').map((c) => c.name);
    const known = new Set([...decl.userCols, ...(decl.setNull || [])]);
    const missing = auto.filter((c) => !known.has(c));
    if (missing.length) throw new MigrationError('table ' + name + ' has user column(s) ' + missing.join(', ') + ' that its TABLES entry does not list');
    for (const c of known) if (!t.columns.some((x) => x.name === c)) throw new MigrationError('TABLES says ' + name + '.' + c + ' is a user column but the table has no such column');
    if (['internal', 'anon'].includes(decl.cls) && auto.length) throw new MigrationError('table ' + name + ' is classed ' + decl.cls + ' but has user columns ' + auto.join(', '));
  }
  for (const name of Object.keys(TABLES)) if (!ctx.tables[name]) throw new MigrationError('TABLES lists ' + name + ' but the template files do not create it');
  // functions: every signed-in function must be a gate, a predicate or in the membership layer
  const signed = signedInList(lockdownText);
  const byName = new Map(ctx.functions.map((f) => [f.name, f]));
  for (const n of signed) {
    if (MEMBERSHIP_ALLOW.includes("'" + n + "'")) continue;
    const f = byName.get(n);
    if (!f) throw new MigrationError('lockdown.sql allows ' + n + '() but no template file creates it');
    if (f.decision !== 'gate' && !PREDICATES.includes(n) && n !== 'report_diagnostic') {
      throw new MigrationError(n + '() is callable by signed-in users but is not gated and is not a known predicate');
    }
  }
  for (const f of ctx.functions) {
    if (f.decision === 'gate' && !signed.includes(f.name)) throw new MigrationError('gated function ' + f.name + '() is not in the lockdown signed-in list');
  }
  for (const n of Object.keys(FUNCTION_POLICY)) if (!byName.has(n)) throw new MigrationError('FUNCTION_POLICY lists ' + n + '() but the template files do not create it');
}

async function sha(text) {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

// files: { schema: '...', policies: '...', ..., lockdown: '...', audit: '...' }
export async function generate(files, options = {}) {
  for (const f of [...FILE_ORDER, AUDIT_FILE]) if (typeof files[f] !== 'string') throw new MigrationError('missing input file database/' + f + '.sql');
  const ctx = newContext(options);
  const sections = [];
  const hashes = [];
  const inputs = { ...files, lockdown: patchLockdown(files.lockdown) };
  for (const f of FILE_ORDER) {
    hashes.push(f + '.sql=' + (await sha(files[f])));
    if (f === 'lockdown') continue;
    sections.push('-- ===================================================================================================================\n-- from database/' + f + '.sql\n-- ===================================================================================================================\n\n' + convertSource(f, inputs[f], ctx));
  }
  hashes.push(AUDIT_FILE + '.sql=' + (await sha(files[AUDIT_FILE])));
  const lockdownText = inputs.lockdown;
  checkContext(ctx, lockdownText);
  const gate = renderGateSql(ctx);
  const purge = renderPurgeSql(ctx);
  const lockdownSql = '-- ===================================================================================================================\n-- from database/lockdown.sql (allow-lists patched: delete_my_account -> delete_my_ld_data, is_member, join_language_dash,\n-- my_membership; members added to the table grants)\n-- ===================================================================================================================\n\n' + convertSource('lockdown', lockdownText, ctx);
  const header = `-- ===================================================================================================================
-- Language Dash in a SHARED Supabase project: everything lives in the schema "language_dash". Nothing is created in "public".
--
-- GENERATED FILE - do not edit by hand. Regenerate with:   node tools/ld-migrate/generate.mjs
-- Source: database/*.sql (${hashes.join(' ')})
-- How it works and how to verify it: docs/SHARED-PROJECT-MIGRATION.md
--
-- Safe to run more than once. Runs in ONE transaction; the guard below aborts if search_path did not take effect, so a
-- statement can never fall through to "public".
-- ===================================================================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS language_dash;
SET LOCAL search_path = language_dash, pg_temp;

DO $guard$
BEGIN
  IF current_schema() IS DISTINCT FROM 'language_dash' THEN
    RAISE EXCEPTION 'Language Dash migration refused: search_path is %, not language_dash (is this running inside a transaction?)', current_setting('search_path');
  END IF;
END
$guard$;

`;
  const sql = header + renderMembershipSql() + sections.join('\n') + '\n' + gate + purge + lockdownSql + '\n' + renderRolesSql() + '\nCOMMIT;\n';
  const auditCounters = newCounters();
  const audit = convertAudit(files[AUDIT_FILE], auditCounters);
  assertNoPublicLeft(sql);
  const report = buildReport(ctx, sql, files, auditCounters);
  const verify = renderVerifySql(report);
  return { sql, audit, verify, report, ctx };
}

// Read-only verification query for the project owner (also run by test-local.mjs): every row must say ok = true.
export function renderVerifySql(report) {
  return `-- Language Dash migration: read-only verification. GENERATED by tools/ld-migrate/generate.mjs. Run it after the migration
-- (SQL editor or psql). EVERY row must say ok = true. It changes nothing.
SELECT 'the language_dash schema exists' AS check_name, EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'language_dash') AS ok
UNION ALL SELECT 'language_dash has ${report.tables.length} tables, ${report.views.length} views and ${report.functions.length} functions',
  (SELECT count(*) FROM pg_class WHERE relnamespace = 'language_dash'::regnamespace AND relkind IN ('r', 'p')) = ${report.tables.length}
  AND (SELECT count(*) FROM pg_class WHERE relnamespace = 'language_dash'::regnamespace AND relkind IN ('v', 'm')) = ${report.views.length}
  AND (SELECT count(*) FROM pg_proc WHERE pronamespace = 'language_dash'::regnamespace) = ${report.functions.length}
UNION ALL SELECT 'every table has row level security',
  NOT EXISTS (SELECT 1 FROM pg_class WHERE relnamespace = 'language_dash'::regnamespace AND relkind IN ('r', 'p') AND NOT relrowsecurity)
UNION ALL SELECT 'every function pins search_path to language_dash, pg_temp',
  NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.pronamespace = 'language_dash'::regnamespace AND NOT coalesce(p.proconfig::text LIKE '%search_path=language_dash, pg_temp%', false))
UNION ALL SELECT 'the member gate (restrictive, FOR ALL, authenticated) is on exactly the ${report.gatePolicies} member tables',
  (SELECT coalesce(array_agg(tablename ORDER BY tablename), '{}') FROM pg_policies WHERE schemaname = 'language_dash' AND policyname = 'ld_member_gate' AND permissive = 'RESTRICTIVE' AND cmd = 'ALL' AND 'authenticated' = ANY (roles))
    = ARRAY[${report.tables.filter((t) => t.gated).map((t) => t.name).sort().map((n) => "'" + n + "'").join(', ')}]::name[]
UNION ALL SELECT 'every gated function starts with the membership check',
  (SELECT count(*) FROM pg_proc p WHERE p.pronamespace = 'language_dash'::regnamespace AND (p.prosrc LIKE '%language_dash.is_member()%' OR p.prosrc LIKE '%language_dash.require_member()%')) >= ${report.gatedFunctions}
UNION ALL SELECT 'anon can read only the leaderboard views, scores and profiles',
  (SELECT coalesce(string_agg(relname, ',' ORDER BY relname), '') FROM pg_class WHERE relnamespace = 'language_dash'::regnamespace AND relkind IN ('r', 'v', 'm', 'p') AND has_table_privilege('anon', oid, 'SELECT'))
    = 'leaderboard_alltime,leaderboard_best,player_profiles,scores'
UNION ALL SELECT 'anon cannot write or truncate anything',
  NOT EXISTS (SELECT 1 FROM pg_class WHERE relnamespace = 'language_dash'::regnamespace AND relkind IN ('r', 'v', 'm', 'p')
    AND (has_table_privilege('anon', oid, 'INSERT') OR has_table_privilege('anon', oid, 'UPDATE') OR has_table_privilege('anon', oid, 'DELETE') OR has_table_privilege('anon', oid, 'TRUNCATE')))
UNION ALL SELECT 'authenticated cannot truncate or re-shape anything',
  NOT EXISTS (SELECT 1 FROM pg_class WHERE relnamespace = 'language_dash'::regnamespace AND relkind IN ('r', 'v', 'm', 'p')
    AND (has_table_privilege('authenticated', oid, 'TRUNCATE') OR has_table_privilege('authenticated', oid, 'TRIGGER') OR has_table_privilege('authenticated', oid, 'REFERENCES')))
UNION ALL SELECT 'members: authenticated can only SELECT',
  has_table_privilege('authenticated', 'language_dash.members', 'SELECT') AND NOT has_table_privilege('authenticated', 'language_dash.members', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'language_dash.members', 'UPDATE') AND NOT has_table_privilege('authenticated', 'language_dash.members', 'DELETE')
UNION ALL SELECT 'no function is executable by PUBLIC',
  NOT EXISTS (SELECT 1 FROM pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE p.pronamespace = 'language_dash'::regnamespace AND a.grantee = 0 AND a.privilege_type = 'EXECUTE')
UNION ALL SELECT 'anon can execute only the three anonymous analytics functions',
  (SELECT coalesce(string_agg(proname, ',' ORDER BY proname), '') FROM pg_proc WHERE pronamespace = 'language_dash'::regnamespace AND has_function_privilege('anon', oid, 'EXECUTE'))
    = 'count_consent,delete_analytics,ingest_analytics'
UNION ALL SELECT 'authenticated cannot run pro_grant*, purge_user_data, require_member, analytics_purge or pro_make_code',
  NOT EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = 'language_dash'::regnamespace AND (proname LIKE 'pro\\_grant%' OR proname IN ('purge_user_data', 'require_member', 'analytics_purge', 'pro_make_code')) AND has_function_privilege('authenticated', oid, 'EXECUTE'))
UNION ALL SELECT 'service_role can execute every function',
  NOT EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = 'language_dash'::regnamespace AND NOT has_function_privilege('service_role', oid, 'EXECUTE'))
UNION ALL SELECT 'delete_my_account does not exist in language_dash',
  NOT EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = 'language_dash'::regnamespace AND proname = 'delete_my_account')
UNION ALL SELECT 'no Language Dash object leaked into public (policy, function body, gate)',
  NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'ld_member_gate')
  AND NOT EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND (prosrc LIKE '%language_dash%' OR prosrc LIKE '%is_member()%'))
UNION ALL SELECT 'nothing in auth depends on language_dash except the members foreign key',
  NOT EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE c.relnamespace = 'auth'::regnamespace AND NOT t.tgisinternal AND t.tgfoid IN (SELECT oid FROM pg_proc WHERE pronamespace = 'language_dash'::regnamespace))
ORDER BY 1;
`;
}

// Final safety net over the finished migration (comments excluded): nothing may name the public schema.
export function assertNoPublicLeft(sql) {
  const toks = tokenize(sql);
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'word' && t.text.toLowerCase() === 'public') {
      // only legal as a role name in GRANT/REVOKE ... FROM PUBLIC
      let j = i - 1;
      while (j >= 0 && !isCode(toks[j])) j--;
      const prev = j >= 0 ? up(toks[j]) : '';
      const prevPunct = j >= 0 && toks[j].type === 'punct' && toks[j].text === ',';
      if (!(prev === 'FROM' || prev === 'TO' || prevPunct)) throw new MigrationError('output still contains the word "public" in code (token ' + i + ')');
      if (prev === 'TO') throw new MigrationError('output grants TO PUBLIC');
    }
    if (t.type === 'dollar' || t.type === 'string') {
      const body = stripComments(t.type === 'dollar' ? dollarBody(t) : t.text);
      if (/(^|[^A-Za-z0-9_$])public\.([A-Za-z_"%']|$)/.test(body) || /\b(nspname|schemaname|table_schema)\s*=\s*'public'/i.test(body) || /search_path\s*(=|TO)\s*public/i.test(body)) {
        throw new MigrationError('output still refers to the public schema inside a string or body: ' + body.slice(0, 80).replace(/\s+/g, ' '));
      }
    }
  }
}

function buildReport(ctx, sql, files, auditCounters) {
  const tables = Object.keys(ctx.tables).map((n) => ({ name: n, cls: TABLES[n].cls, gated: ['member', 'shared'].includes(TABLES[n].cls), userCols: TABLES[n].userCols, setNull: TABLES[n].setNull || [], keepOnPurge: !!TABLES[n].keepOnPurge, file: ctx.tables[n].file, why: TABLE_CLASS_TEXT[TABLES[n].cls] }));
  tables.unshift({ name: 'members', cls: 'membership', gated: false, userCols: ['user_id'], setNull: [], file: 'generator', why: 'membership table: own-row SELECT policy only, no client writes' });
  const seen = new Map();
  for (const f of ctx.functions) seen.set(f.name + f.args, { name: f.name, args: f.args, lang: f.lang, secdef: f.secdef, decision: f.decision, why: f.why, file: f.file, pin: f.pin });
  const functions = [...seen.values()];
  for (const [n, f] of Object.entries(MEMBERSHIP_FUNCTIONS)) functions.push({ name: n, args: '', lang: 'plpgsql/sql', secdef: true, decision: f.decision, why: f.why, file: 'generator', pin: 'hand-written', grant: f.grant });
  const views = Object.entries(ctx.views).map(([name, v]) => ({ name, why: v.why }));
  const countLines = (s) => s.split('\n').length;
  const stmtOutTotal = tokenizeCount(sql);
  const kinds = ctx.kinds;
  return {
    inputFiles: FILE_ORDER.concat([AUDIT_FILE]).map((f) => ({ file: f + '.sql', lines: countLines(files[f]) })),
    statementsIn: ctx.stmtIn,
    statementsKept: ctx.stmtOut,
    statementsRemoved: ctx.counters.removed,
    statementsOut: stmtOutTotal,
    migrationLines: countLines(sql),
    kinds,
    counters: { ...ctx.counters, auditSchemaLiterals: auditCounters.schemaLiterals },
    tables, functions, views, removed: ctx.removed, dos: ctx.dos,
    gatePolicies: gatedTables(ctx).length,
    purgeTables: purgeOrder(ctx).length,
    gatedFunctions: functions.filter((f) => f.decision === 'gate').length
  };
}

function tokenizeCount(sql) {
  return splitStatements(sql, 'out').filter((s) => s.hasCode).length;
}

export function renderReportMarkdown(r) {
  const L = [];
  const yn = (b) => (b ? 'yes' : 'no');
  L.push('### Diff report vs the template (generated numbers)');
  L.push('');
  L.push('| Measure | Count |');
  L.push('| --- | --- |');
  L.push('| Template statements read (schema, policies, cohorts, discovery, pro, analytics, analytics_views, lockdown) | ' + r.statementsIn + ' |');
  L.push('| Statements carried over | ' + r.statementsKept + ' |');
  L.push('| Statements removed (delete_my_account and its REVOKE/GRANT) | ' + r.statementsRemoved + ' |');
  L.push('| Statements in the migration (incl. wrapper, membership layer, gate, wipe, role grants) | ' + r.statementsOut + ' |');
  L.push('| `SET search_path = public[, auth]` pins rewritten to `language_dash, pg_temp` | ' + r.counters.pinsRewritten + ' |');
  L.push('| Functions that had NO pin and got one (would have run on the caller\'s search_path) | ' + r.counters.pinsAdded + ' |');
  L.push('| `public.` qualifications rewritten to `language_dash.` | ' + r.counters.schemaQualified + ' |');
  L.push('| `\'public\'` catalog literals / `IN SCHEMA public` rewritten | ' + r.counters.schemaLiterals + ' |');
  L.push('| Foreign keys `auth.users(id)` retargeted to `language_dash.members(user_id)` | ' + r.counters.fkRetargeted + ' |');
  L.push('| Membership checks injected: plpgsql functions / SQL functions | ' + r.counters.gatesPlpgsql + ' / ' + r.counters.gatesSql + ' |');
  L.push('| `ld_member_gate` restrictive policies added | ' + r.gatePolicies + ' |');
  L.push('| DO blocks recognised and translated | ' + r.counters.doBlocks + ' |');
  L.push('| Tables created (template + members) | ' + r.tables.length + ' |');
  L.push('| Views created | ' + r.views.length + ' |');
  L.push('| Functions created (template + membership layer) | ' + r.functions.length + ' |');
  L.push('| Migration size (lines) | ' + r.migrationLines + ' |');
  L.push('');
  L.push('Statement kinds read from the template: ' + Object.entries(r.kinds).sort().map(([k, v]) => k + ' ' + v).join(', ') + '.');
  L.push('');
  L.push('Removed: ' + r.removed.map((x) => x.what).join('; ') + '.');
  L.push('');
  L.push('### Table classification');
  L.push('');
  L.push('| Table | Class | Member gate | Wiped by delete_my_ld_data on | Source |');
  L.push('| --- | --- | --- | --- | --- |');
  for (const t of r.tables) {
    const wipe = t.keepOnPurge ? 'kept (removed by pro_forget_user with the sign-in)' : (t.userCols.length ? t.userCols.join(', ') : (t.setNull.length ? 'set NULL: ' + t.setNull.join(', ') : '-'));
    L.push('| `' + t.name + '` | ' + t.cls + ' | ' + yn(t.gated) + ' | ' + wipe + ' | ' + t.file + ' |');
  }
  L.push('');
  L.push('Classes: ' + Object.entries(TABLE_CLASS_TEXT).map(([k, v]) => '**' + k + '** = ' + v).join('; ') + '.');
  L.push('');
  L.push('### Views');
  L.push('');
  const groups = {};
  for (const v of r.views) (groups[v.why] = groups[v.why] || []).push(v.name);
  for (const [why, names] of Object.entries(groups)) L.push('- ' + names.length + ' x ' + why + (names.length <= 3 ? ': ' + names.map((n) => '`' + n + '`').join(', ') : ''));
  L.push('');
  L.push('### Function classification and gate decision');
  L.push('');
  L.push('| Function | Language | Security definer | Gate | Reason | Pin |');
  L.push('| --- | --- | --- | --- | --- | --- |');
  const fns = [...r.functions].sort((a, b) => (a.decision === b.decision ? a.name.localeCompare(b.name) : a.decision === 'gate' ? -1 : 1));
  for (const f of fns) {
    L.push('| `' + f.name + '` | ' + f.lang + ' | ' + yn(f.secdef) + ' | ' + (f.decision === 'gate' ? (f.lang === 'plpgsql' ? 'IF NOT is_member() RAISE' : 'SELECT require_member()') : 'none') + ' | ' + f.why + ' | ' + f.pin + ' |');
  }
  return L.join('\n') + '\n';
}
