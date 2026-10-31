/**
 * Casa Huéspedes Pimentel: exportación cifrada desde un equipo autorizado.
 * Exige Supabase CLI, Docker Desktop y age. No envía copias a GitHub.
 * Supabase CLI utiliza archivos SQL temporales: ejecutar en disco con BitLocker.
 */
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, open, rm, stat, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_REF = 'kjwaqrmhoeftxafedpae';
const BACKEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PARTS = Object.freeze([
  { name: 'roles', flags: ['--role-only'] },
  { name: 'schema', flags: [] },
  { name: 'data', flags: ['--use-copy', '--data-only', '-x', 'storage.buckets_vectors', '-x', 'storage.vector_indexes'] },
]);

export function validateBackupConfig({ databaseUrl, recipient }) {
  if (!databaseUrl || !recipient) {
    throw new Error('Faltan BACKUP_DB_URL (o DATABASE_URL) y/o BACKUP_AGE_RECIPIENT.');
  }
  let url;
  try { url = new URL(databaseUrl); }
  catch { throw new Error('La cadena PostgreSQL no tiene un formato válido.'); }
  if (!['postgresql:', 'postgres:'].includes(url.protocol)) {
    throw new Error('La cadena debe usar PostgreSQL.');
  }
  const hostname = url.hostname.toLowerCase();
  const username = decodeURIComponent(url.username);
  const direct = hostname === 'db.' + PROJECT_REF + '.supabase.co' && username === 'postgres';
  const pooler = hostname.endsWith('.pooler.supabase.com') && username === 'postgres.' + PROJECT_REF;
  if ((!direct && !pooler) || (url.port && url.port !== '5432') || url.pathname !== '/postgres') {
    throw new Error('Usa la conexión directa o Session Pooler (puerto 5432) del proyecto Casa Huéspedes.');
  }
  if (!url.password) throw new Error('Falta la contraseña PostgreSQL en la conexión local.');
  if (!/^age1[0-9a-z]{58}$/.test(String(recipient).trim())) {
    throw new Error('BACKUP_AGE_RECIPIENT debe ser una clave pública age válida.');
  }
  return { databaseUrl, recipient: recipient.trim() };
}

export function runSilent(command, args, { cwd = BACKEND_ROOT } = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd, shell: false, windowsHide: true, stdio: 'ignore' });
    child.on('error', () => reject(new Error('No se pudo iniciar ' + command + '.')));
    child.on('close', (code) => {
      if (code === 0) resolveRun();
      else reject(new Error('La herramienta ' + command + ' terminó con error. Comprueba la configuración local.'));
    });
  });
}

async function sha256File(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export async function createSecureBackup({
  databaseUrl, recipient, destinationRoot = join(BACKEND_ROOT, '.backup'),
  run = runSilent, verifyTools = true,
}) {
  const config = validateBackupConfig({ databaseUrl, recipient });
  if (verifyTools) {
    for (const [command, args] of [
      ['supabase', ['db', 'dump', '--help']],
      ['age', ['--version']],
      ['docker', ['info']],
    ]) await run(command, args, { cwd: BACKEND_ROOT });
  }

  const location = resolve(destinationRoot);
  const repositoryRoot = resolve(BACKEND_ROOT, '..');
  const ignoredRoot = resolve(BACKEND_ROOT, '.backup');
  if ((location === repositoryRoot || location === BACKEND_ROOT || location.startsWith(repositoryRoot + sep)) &&
      location !== ignoredRoot && !location.startsWith(ignoredRoot + sep)) {
    throw new Error('Dentro del repositorio solo se permiten respaldos en backend/.backup.');
  }
  await mkdir(location, { recursive: true, mode: 0o700 });
  const backupDirName = 'chp-' + new Date().toISOString().replace(/[:.]/g, '-') +
    '-' + randomBytes(5).toString('hex');
  const destination = resolve(location, backupDirName);
  const temporary = await mkdtemp(join(tmpdir(), 'chp-plaintext-'));
  let success = false;
  try {
    await mkdir(destination, { mode: 0o700 });
    const entries = [];
    for (const part of PARTS) {
      const rawPath = join(temporary, part.name + '.sql');
      const encryptedFile = part.name + '.sql.age';
      const encryptedPath = join(destination, encryptedFile);
      await run('supabase', ['db', 'dump', '--db-url', config.databaseUrl, '-f', rawPath, ...part.flags],
        { cwd: BACKEND_ROOT });
      if ((await stat(rawPath)).size === 0) {
        throw new Error('El segmento ' + part.name + ' está vacío; se canceló el respaldo.');
      }
      await run('age', ['-r', config.recipient, '-o', encryptedPath, rawPath], { cwd: BACKEND_ROOT });
      const encryptedStat = await stat(encryptedPath);
      if (encryptedStat.size < 100) {
        throw new Error('No se generó una copia cifrada válida de ' + part.name + '.');
      }
      entries.push({
        file: encryptedFile, bytes: encryptedStat.size,
        sha256: await sha256File(encryptedPath),
      });
      await unlink(rawPath);
    }

    const manifest = {
      formatVersion: 1,
      createdAt: new Date().toISOString(),
      projectRef: PROJECT_REF,
      mode: 'logical-export-encrypted-age',
      verification: 'not_restored',
      limitation: 'excludes_supabase_managed_schemas_and_external_media',
      files: entries,
    };
    const file = await open(join(destination, 'manifest.json'), 'wx', 0o600);
    try { await file.writeFile(JSON.stringify(manifest, null, 2) + '\n', 'utf8'); }
    finally { await file.close(); }
    success = true;
    return { destination, files: entries.length, verifiedRestore: false };
  } finally {
    // En SSD el borrado de temporales no garantiza eliminación forense: utilizar BitLocker.
    await rm(temporary, { recursive: true, force: true });
    if (!success) await rm(destination, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { default: dotenv } = await import('dotenv');
    dotenv.config({ path: join(BACKEND_ROOT, '.env') });
    console.log('Exportación local: el directorio temporal debe estar en un disco cifrado (BitLocker).');
    const result = await createSecureBackup({
      databaseUrl: process.env.BACKUP_DB_URL || process.env.DATABASE_URL,
      recipient: process.env.BACKUP_AGE_RECIPIENT,
      destinationRoot: process.env.BACKUP_OUTPUT_DIRECTORY || join(BACKEND_ROOT, '.backup'),
    });
    console.log('Exportación completada: ' + result.files +
      ' archivos cifrados en ' + result.destination);
    console.log('La restauración aún no está verificada. Traslada la carpeta cifrada fuera del equipo.');
  } catch (err) {
    // Nunca imprimir la cadena de conexión ni la salida de herramientas externas.
    console.error('Respaldo no completado: ' +
      (err instanceof Error ? err.message : 'error desconocido'));
    process.exitCode = 1;
  }
}
