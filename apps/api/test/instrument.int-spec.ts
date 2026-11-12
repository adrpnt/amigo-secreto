import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const INSTRUMENT = join(import.meta.dirname, '..', 'src', 'instrument.ts');
const PROBE = join(import.meta.dirname, 'fixtures', 'sentry-initialized.mjs');

async function isSentryInitialized(cwd: string): Promise<boolean> {
  const env = { ...process.env };
  delete env.SENTRY_DSN;
  const { stdout } = await promisify(execFile)(
    process.execPath,
    ['--import', INSTRUMENT, PROBE],
    { cwd, env },
  );
  return stdout === 'true';
}

describe('instrument', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'instrument-'));
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it('inicializa o Sentry com o SENTRY_DSN posto só no .env', async () => {
    await writeFile(
      join(workDir, '.env'),
      'SENTRY_DSN=https://public@sentry.example.com/1\n',
    );

    expect(await isSentryInitialized(workDir)).toBe(true);
  });

  it('não inicializa o Sentry sem .env e sem SENTRY_DSN no ambiente', async () => {
    expect(await isSentryInitialized(workDir)).toBe(false);
  });
});
