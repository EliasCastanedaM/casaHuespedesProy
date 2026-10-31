import test from 'node:test';
import assert from 'node:assert/strict';
import { CRITICAL_TABLES, collectBackupBaseline, compareBackupBaselines } from '../scripts/backup-readiness.mjs';

function fakeDb() {
  const queries = [];
  return {
    queries,
    async query(query) {
      queries.push(query.trim());
      if (query.startsWith('BEGIN') || query.startsWith('ROLLBACK')) return { rows: [] };
      if (query.includes('current_setting')) {
        return { rows: [{ pg_major: 17, public_tables: 34, no_rls: 0, unvalidated_fks: 0 }] };
      }
      if (query.includes('COUNT(*) AS total')) return { rows: [{ total: '7' }] };
      throw new Error('Unexpected SQL');
    },
  };
}

test('baseline uses a consistent read-only transaction and aggregate SQL only', async () => {
  const db = fakeDb();
  const baseline = await collectBackupBaseline(db);
  assert.match(db.queries[0], /^BEGIN TRANSACTION .*READ ONLY/);
  assert.equal(db.queries.at(-1), 'ROLLBACK');
  for (const sql of db.queries.slice(1,-1)) {
    assert.match(sql, /^SELECT/);
    assert.doesNotMatch(sql, /\b(DELETE|UPDATE|INSERT|TRUNCATE|DROP|ALTER)\b/i);
  }
  assert.equal(Object.keys(baseline.counts).length, CRITICAL_TABLES.length);
  assert.equal(baseline.counts.meta_messages, 7);
  assert.doesNotMatch(JSON.stringify(baseline), /phone|email|document_number|external_user_id|booking_context/);
});

test('verification detects changed counts and disabled RLS', async () => {
  const source = await collectBackupBaseline(fakeDb());
  const target = structuredClone(source);
  assert.deepEqual(compareBackupBaselines(source,target), { matches: true, differences: [] });
  target.counts.meta_messages = 6;
  target.withoutRls = 1;
  const result = compareBackupBaselines(source,target);
  assert.equal(result.matches, false);
  assert.ok(result.differences.includes('counts.meta_messages'));
  assert.ok(result.differences.includes('security.rlsDisabled'));
  delete target.counts.bookings;
  assert.throws(() => compareBackupBaselines(source,target), /Invalid aggregate count/);
});

test('transaction is rolled back after a query failure', async () => {
  const db = fakeDb();
  const original = db.query.bind(db);
  db.query = async (sql) => {
    if (sql.includes('FROM public."payments"')) throw new Error('simulated failure');
    return original(sql);
  };
  await assert.rejects(collectBackupBaseline(db), /simulated failure/);
  assert.equal(db.queries.at(-1), 'ROLLBACK');
});
