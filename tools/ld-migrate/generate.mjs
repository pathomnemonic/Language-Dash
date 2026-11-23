#!/usr/bin/env node
// Generates supabase/migrations/20261201000000_language_dash.sql from database/*.sql.
//
//   node tools/ld-migrate/generate.mjs            write the migration (+ tools/ld-migrate/out/audit-language-dash.sql and verify-language-dash.sql)
//   node tools/ld-migrate/generate.mjs --check    exit 1 if the files on disk are not what the generator would write now
//   node tools/ld-migrate/generate.mjs --report   print the diff report / classification tables (markdown) to stdout
//   node tools/ld-migrate/generate.mjs --docs     refresh the generated region of docs/SHARED-PROJECT-MIGRATION.md
//   --fk-target=auth   keep foreign keys on auth.users(id) instead of language_dash.members(user_id) (not recommended)
//
// Exit code 1 (and a message naming the file and line) when something in database/*.sql cannot be classified.
// It never reads or writes anything but the files named here, and never talks to a database.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, renderReportMarkdown, FILE_ORDER, AUDIT_FILE, MigrationError } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
export const MIGRATION_PATH = join(root, 'supabase', 'migrations', '20261201000000_language_dash.sql');
export const AUDIT_PATH = join(here, 'out', 'audit-language-dash.sql');
export const VERIFY_PATH = join(here, 'out', 'verify-language-dash.sql');
export const DOC_PATH = join(root, 'docs', 'SHARED-PROJECT-MIGRATION.md');
const DOC_BEGIN = '<!-- BEGIN GENERATED REPORT (node tools/ld-migrate/generate.mjs --docs) -->';
const DOC_END = '<!-- END GENERATED REPORT -->';

export function readTemplates() {
  const files = {};
  for (const f of [...FILE_ORDER, AUDIT_FILE]) files[f] = readFileSync(join(root, 'database', f + '.sql'), 'utf8');
  return files;
}

async function main() {
  const args = process.argv.slice(2);
  const options = {};
  for (const a of args) if (a.startsWith('--fk-target=')) options.fkTarget = a.split('=')[1];
  if (options.fkTarget && !['members', 'auth'].includes(options.fkTarget)) throw new MigrationError('--fk-target must be members or auth');
  const { sql, audit, verify, report } = await generate(readTemplates(), options);

  if (args.includes('--report')) {
    process.stdout.write(renderReportMarkdown(report));
    return 0;
  }
  if (args.includes('--docs')) {
    const doc = readFileSync(DOC_PATH, 'utf8');
    const a = doc.indexOf(DOC_BEGIN);
    const b = doc.indexOf(DOC_END);
    if (a < 0 || b < a) throw new MigrationError('docs/SHARED-PROJECT-MIGRATION.md has no generated-report markers');
    const next = doc.slice(0, a + DOC_BEGIN.length) + '\n\n' + renderReportMarkdown(report) + '\n' + doc.slice(b);
    if (args.includes('--check')) {
      if (next !== doc) { console.error('docs/SHARED-PROJECT-MIGRATION.md generated region is stale: run node tools/ld-migrate/generate.mjs --docs'); return 1; }
      return 0;
    }
    writeFileSync(DOC_PATH, next);
    console.log('updated ' + DOC_PATH);
    return 0;
  }
  if (args.includes('--check')) {
    const stale = [];
    if (!existsSync(MIGRATION_PATH) || readFileSync(MIGRATION_PATH, 'utf8') !== sql) stale.push(MIGRATION_PATH);
    if (!existsSync(AUDIT_PATH) || readFileSync(AUDIT_PATH, 'utf8') !== audit) stale.push(AUDIT_PATH);
    if (!existsSync(VERIFY_PATH) || readFileSync(VERIFY_PATH, 'utf8') !== verify) stale.push(VERIFY_PATH);
    if (stale.length) { console.error('stale: ' + stale.join(', ') + '\nrun: node tools/ld-migrate/generate.mjs'); return 1; }
    console.log('up to date');
    return 0;
  }
  mkdirSync(dirname(MIGRATION_PATH), { recursive: true });
  mkdirSync(dirname(AUDIT_PATH), { recursive: true });
  writeFileSync(MIGRATION_PATH, sql);
  writeFileSync(AUDIT_PATH, audit);
  writeFileSync(VERIFY_PATH, verify);
  console.log('wrote ' + MIGRATION_PATH + ' (' + report.migrationLines + ' lines, ' + report.statementsOut + ' statements)');
  console.log('wrote ' + AUDIT_PATH);
  console.log('wrote ' + VERIFY_PATH);
  console.log('statements read ' + report.statementsIn + ', removed ' + report.statementsRemoved + '; pins rewritten ' + report.counters.pinsRewritten + ', added ' + report.counters.pinsAdded +
    '; public. -> language_dash. ' + report.counters.schemaQualified + '; FKs retargeted ' + report.counters.fkRetargeted +
    '; gates ' + report.counters.gatesPlpgsql + ' plpgsql + ' + report.counters.gatesSql + ' sql; gate policies ' + report.gatePolicies);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c), (e) => {
    if (e instanceof MigrationError) { console.error('ld-migrate: ' + e.message); process.exit(1); }
    console.error(e);
    process.exit(2);
  });
}
