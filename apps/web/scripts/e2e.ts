import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { getContainerRuntimeClient } from 'testcontainers';

const DOCKER_REQUIRED_MESSAGE = 'Os testes e2e precisam do Docker em execução.';
const WEB_ROOT = join(import.meta.dirname, '..');
const API_ROOT = join(WEB_ROOT, '..', 'api');
const PLAYWRIGHT_CLI = createRequire(import.meta.url).resolve(
  '@playwright/test/cli',
);

async function ensureDocker(): Promise<void> {
  try {
    await getContainerRuntimeClient();
  } catch {
    throw new Error(DOCKER_REQUIRED_MESSAGE);
  }
}

function run(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; shell?: boolean },
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

await ensureDocker();
const container = await new PostgreSqlContainer('postgres:18').start();

try {
  const env = { ...process.env, DATABASE_URL: container.getConnectionUri() };
  const migrationExitCode = await run('pnpm migration:run', [], {
    cwd: API_ROOT,
    env,
    shell: true,
  });
  process.exitCode =
    migrationExitCode === 0
      ? await run(
          process.execPath,
          [PLAYWRIGHT_CLI, 'test', ...process.argv.slice(2)],
          { cwd: WEB_ROOT, env },
        )
      : migrationExitCode;
} finally {
  await container.stop();
}
