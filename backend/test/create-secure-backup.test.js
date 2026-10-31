import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, copyFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSecureBackup, validateBackupConfig } from '../scripts/create-secure-backup.mjs';

const DB = 'postgresql://postgres.kjwaqrmhoeftxafedpae:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres';
const AGE = 'age1' + 'q'.repeat(58);

function mockRunner({ failPart } = {}) {
  const called = [];
  const run = async (command, args) => {
    called.push({ command, args });
    if (command === 'supabase' && args[1] === 'dump' && args.includes('-f')) {
      const out = args[args.indexOf('-f') + 1];
      if (failPart && out.endsWith(failPart + '.sql')) throw new Error('mock-failure');
      await writeFile(out, '-- mock backup data ' + 'x'.repeat(110));
    }
    if (command === 'age') await copyFile(args.at(-1), args[args.indexOf('-o') + 1]);
  };
  return { run, called };
}

test('rechaza proyectos ajenos, transaction pooler y claves inválidas', () => {
  assert.throws(() => validateBackupConfig({
    databaseUrl: 'postgresql://postgres:password@db.other.supabase.co:5432/postgres',
    recipient: AGE,
  }), /Casa Huéspedes/);
  assert.throws(() => validateBackupConfig({
    databaseUrl: DB.replace(':5432/', ':6543/'),
    recipient: AGE,
  }), /5432/);
  assert.throws(() => validateBackupConfig({ databaseUrl: DB, recipient: 'incorrecta' }), /age válida/);
  assert.deepEqual(validateBackupConfig({ databaseUrl: DB, recipient: AGE }), {
    databaseUrl: DB, recipient: AGE,
  });
});

test('produce archivos cifrados e inventario sin guardar credenciales', async () => {
  const root = await mkdtemp(join(tmpdir(), 'chp-test-'));
  try {
    const mock = mockRunner();
    const result = await createSecureBackup({
      databaseUrl: DB, recipient: AGE, destinationRoot: root,
      run: mock.run, verifyTools: false,
    });
    assert.equal(result.files, 3);
    assert.equal(result.verifiedRestore, false);
    assert.equal(mock.called.filter(c => c.command === 'supabase').length, 3);
    assert.equal(mock.called.filter(c => c.command === 'age').length, 3);
    assert.deepEqual((await readdir(result.destination)).sort(),
      ['data.sql.age', 'manifest.json', 'roles.sql.age', 'schema.sql.age']);
    const manifest = JSON.parse(await readFile(join(result.destination, 'manifest.json'), 'utf8'));
    assert.equal(manifest.files.length, 3);
    assert.equal(manifest.verification, 'not_restored');
    assert.doesNotMatch(JSON.stringify(manifest), /fake|postgresql:\/\//);
    for (const entry of manifest.files) {
      assert.match(entry.sha256, /^[0-9a-f]{64}$/);
      assert.equal((await stat(join(result.destination, entry.file))).size, entry.bytes);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('ante error del dump elimina el conjunto parcial', async () => {
  const root = await mkdtemp(join(tmpdir(), 'chp-test-'));
  try {
    const mock = mockRunner({ failPart: 'schema' });
    await assert.rejects(createSecureBackup({
      databaseUrl: DB, recipient: AGE, destinationRoot: root,
      run: mock.run, verifyTools: false,
    }), /mock-failure/);
    assert.deepEqual(await readdir(root), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});
