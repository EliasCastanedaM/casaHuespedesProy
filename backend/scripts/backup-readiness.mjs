/**
 * Auditoría de respaldo: agregados de solo lectura, sin datos de huéspedes.
 * No exporta datos, no restaura ni modifica producción.
 */
import { mkdir, open, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CRITICAL_TABLES = Object.freeze([
  'customers', 'bookings', 'payments', 'rooms', 'room_categories',
  'inquiries', 'meta_messages', 'meta_conversations',
  'meta_coexistence_events', 'ai_conversations', 'ai_processed_messages',
  'ai_usage_events', 'admin_sessions', 'admin_password_resets',
]);

function safeCount(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new Error(`Invalid aggregate count for ${label}`);
  }
  return number;
}

export async function collectBackupBaseline(db) {
  await db.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    const metadata = (await db.query(`
      SELECT current_setting('server_version_num')::integer / 10000 AS pg_major,
        (SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
         WHERE n.nspname='public' AND c.relkind='r') AS public_tables,
        (SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
         WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity) AS no_rls,
        (SELECT COUNT(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace
         WHERE n.nspname='public' AND c.contype='f' AND NOT c.convalidated) AS unvalidated_fks
    `)).rows[0];
    if (!metadata) throw new Error('Missing database metadata');
    const counts = {};
    for (const table of CRITICAL_TABLES) {
      // Only fixed, audited names; no user-provided identifier interpolation.
      const result = await db.query(`SELECT COUNT(*) AS total FROM public."${table}"`);
      counts[table] = safeCount(result.rows[0]?.total, table);
    }
    return {
      formatVersion: 1,
      generatedAt: new Date().toISOString(),
      pgMajor: safeCount(metadata.pg_major, 'pgMajor'),
      publicTables: safeCount(metadata.public_tables, 'publicTables'),
      withoutRls: safeCount(metadata.no_rls, 'withoutRls'),
      unvalidatedForeignKeys: safeCount(metadata.unvalidated_fks, 'unvalidatedForeignKeys'),
      counts,
    };
  } finally {
    await db.query('ROLLBACK');
  }
}

export function compareBackupBaselines(expected, actual) {
  if (expected?.formatVersion !== 1 || actual?.formatVersion !== 1) {
    throw new Error('Unsupported baseline format');
  }
  const differences = [];
  for (const field of ['pgMajor', 'publicTables', 'withoutRls', 'unvalidatedForeignKeys']) {
    if (safeCount(expected[field], field) !== safeCount(actual[field], field)) {
      differences.push(field);
    }
  }
  for (const table of CRITICAL_TABLES) {
    if (safeCount(expected.counts?.[table], table) !== safeCount(actual.counts?.[table], table)) {
      differences.push(`counts.${table}`);
    }
  }
  if (actual.withoutRls !== 0) differences.push('security.rlsDisabled');
  if (actual.unvalidatedForeignKeys !== 0) differences.push('integrity.unvalidatedForeignKeys');
  return { matches: differences.length === 0, differences: [...new Set(differences)] };
}

function assertEnvironment(mode, manifestPath) {
  if (!['capture', 'verify'].includes(mode) || (mode === 'verify' && !manifestPath)) {
    throw new Error('Usage: node scripts/backup-readiness.mjs capture | verify <manifest-path>');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required (never save credentials in Git).');
  }
  if (mode === 'verify' && process.env.DATABASE_URL.toLowerCase().includes('kjwaqrmhoeftxafedpae')) {
    throw new Error('Refusing to verify against the known production project.');
  }
  if (mode === 'verify' && process.env.RESTORE_TEST_CONFIRMED !== 'true') {
    throw new Error('Select an isolated test database and set RESTORE_TEST_CONFIRMED=true.');
  }
}

export async function runBackupReadiness({ mode, manifestPath, db, outputRoot }) {
  const baseline = await collectBackupBaseline(db);
  if (baseline.withoutRls !== 0 || baseline.unvalidatedForeignKeys !== 0) {
    throw new Error('Safety checks failed (RLS disabled or invalid foreign keys).');
  }
  if (mode === 'capture') {
    const destinationDir = resolve(outputRoot, '.backup');
    await mkdir(destinationDir, { recursive: true, mode: 0o700 });
    const name = `baseline-${baseline.generatedAt.replaceAll(':', '-').replaceAll('.', '-')}.json`;
    const destination = resolve(destinationDir, name);
    const file = await open(destination, 'wx', 0o600);
    try { await file.writeFile(`${JSON.stringify(baseline, null, 2)}\n`, 'utf8'); }
    finally { await file.close(); }
    return { type: 'capture', destination, baseline };
  }
  if (mode === 'verify') {
    const expected = JSON.parse(await readFile(manifestPath, 'utf8'));
    return { type: 'verify', ...compareBackupBaselines(expected, baseline) };
  }
  throw new Error('Invalid mode');
}

const invokedAsMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsMain) {
  const [mode, manifestPath] = process.argv.slice(2);
  let db;
  try {
    assertEnvironment(mode, manifestPath);
    const { default: pg } = await import('pg');
    db = new pg.Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true },
      application_name: 'casa-huespedes-backup-readiness',
      connectionTimeoutMillis: 10000,
      query_timeout: 30000,
    });
    await db.connect();
    const result = await runBackupReadiness({
      mode, manifestPath, db,
      outputRoot: resolve(dirname(fileURLToPath(import.meta.url)), '..'),
    });
    if (result.type === 'capture') {
      console.log(`Baseline saved locally: ${result.destination}`);
      console.log('No backup was created. Run the Supabase dump steps separately.');
    } else {
      console.log(result.matches ? 'Aggregate comparison passed.' :
        `Aggregate comparison failed: ${result.differences.join(', ')}`);
      console.log('Not a complete restore test. Validate the isolated import and external media.');
      if (!result.matches) process.exitCode = 1;
    }
  } catch {
    // DB error details can contain connection strings: do not log them.
    console.error('Backup verification failed. Check arguments, TLS, connectivity and permissions locally.');
    process.exitCode = 1;
  } finally {
    if (db) await db.end().catch(() => {});
  }
}
