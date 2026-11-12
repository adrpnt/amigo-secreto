import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

const API_ROOT = join(import.meta.dirname, '..');

export async function runMigrations(databaseUrl: string): Promise<void> {
  await promisify(execFile)('pnpm', ['migration:run'], {
    cwd: API_ROOT,
    shell: true,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
