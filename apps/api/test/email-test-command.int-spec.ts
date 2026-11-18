import { execFile } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import pg from 'pg';
import { createIsolatedDatabase } from './isolated-database.js';

const API_ROOT = join(import.meta.dirname, '..');
const DIST_DIR = join(API_ROOT, 'dist');
const INSTRUCTION =
  'Informe um e-mail válido: pnpm --filter @amigo-secreto/api email:test <destinatário>';

type CommandResult = { code: number; stdout: string; stderr: string };

type JobRow = {
  id: string;
  type: string;
  status: string;
  attempts: number;
  payload: Record<string, unknown>;
};

describe('email:test', () => {
  let databaseUrl: string;

  beforeAll(async () => {
    databaseUrl = await createIsolatedDatabase('email_test_command');
  });

  // Roda o comando como o dev roda, pelo pnpm, com o banco deste arquivo.
  async function emailTest(...args: string[]): Promise<CommandResult> {
    try {
      const { stdout, stderr } = await promisify(execFile)(
        'pnpm',
        ['email:test', ...args],
        {
          cwd: API_ROOT,
          shell: true,
          env: {
            ...process.env,
            NODE_ENV: 'development',
            DATABASE_URL: databaseUrl,
            RESEND_API_KEY: '',
          },
        },
      );
      return { code: 0, stdout, stderr };
    } catch (error) {
      const failure = error as { code: number; stdout: string; stderr: string };
      return {
        code: failure.code,
        stdout: failure.stdout,
        stderr: failure.stderr,
      };
    }
  }

  async function jobs(): Promise<JobRow[]> {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const result = await client.query<JobRow>(
        'SELECT id, type, status, attempts, payload FROM job',
      );
      return result.rows;
    } finally {
      await client.end();
    }
  }

  async function clearJobs(): Promise<void> {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    await client.query('DELETE FROM job');
    await client.end();
  }

  beforeEach(clearJobs);

  it('enfileira o e-mail de teste, imprime o id do job e sai com 0', async () => {
    const result = await emailTest('ana@example.com');

    expect(result.code).toBe(0);
    const rows = await jobs();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: 'email.send',
      status: 'PENDING',
      attempts: 0,
      payload: {
        to: 'ana@example.com',
        subject: 'E-mail de teste do Amigo Secreto',
        blocks: [
          {
            type: 'paragraph',
            text: 'Se você recebeu esta mensagem, o envio de e-mails está funcionando.',
          },
        ],
      },
    });
    expect(result.stdout).toContain(
      `Job ${rows[0]?.id} enfileirado. A API em execução envia o e-mail em até 10 segundos.`,
    );
  });

  it('sem destinatário válido imprime a instrução, não grava job e sai com 1', async () => {
    for (const args of [[], ['ana'], ['ana@']]) {
      const result = await emailTest(...args);

      expect(result.code).toBe(1);
      expect(`${result.stdout}${result.stderr}`).toContain(INSTRUCTION);
      expect(await jobs()).toHaveLength(0);
    }
  });

  it('compila a API antes de enfileirar num clone sem dist', async () => {
    await rm(DIST_DIR, { recursive: true, force: true });

    const result = await emailTest('bia@example.com');

    expect(result.code).toBe(0);
    const rows = await jobs();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.payload.to).toBe('bia@example.com');
    expect(result.stdout).toContain(`Job ${rows[0]?.id} enfileirado.`);
  });
});
