import pg from 'pg';
import { inject } from 'vitest';

// Banco migrado que só serve de modelo: ninguém se conecta a ele, então
// vários arquivos de teste podem cloná-lo ao mesmo tempo.
const TEMPLATE_DATABASE = 'migrated_template';

async function runOnServer(databaseUrl: string, sql: string): Promise<void> {
  const url = new URL(databaseUrl);
  url.pathname = '/postgres';
  const client = new pg.Client({ connectionString: url.href });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

// Chamado pelo global-setup depois das migrations e antes de qualquer
// conexão ao banco de testes, que o CREATE DATABASE ... TEMPLATE exige.
export async function createTemplateDatabase(
  databaseUrl: string,
): Promise<void> {
  const source = new URL(databaseUrl).pathname.slice(1);
  await runOnServer(
    databaseUrl,
    `CREATE DATABASE ${TEMPLATE_DATABASE} TEMPLATE ${source}`,
  );
}

// Banco próprio de um arquivo de teste, com as migrations aplicadas, para as
// rodadas de jobs de um arquivo não pegarem os jobs de outro.
export async function createIsolatedDatabase(name: string): Promise<string> {
  const databaseUrl = inject('databaseUrl');
  await runOnServer(databaseUrl, `DROP DATABASE IF EXISTS ${name}`);
  await runOnServer(
    databaseUrl,
    `CREATE DATABASE ${name} TEMPLATE ${TEMPLATE_DATABASE}`,
  );
  const url = new URL(databaseUrl);
  url.pathname = `/${name}`;
  return url.href;
}
