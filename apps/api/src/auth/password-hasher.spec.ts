import { argon2Sync } from 'node:crypto';
import { PasswordHasher } from './password-hasher.js';

const PHC =
  /^\$argon2id\$v=19\$m=19456,t=2,p=1\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

async function elapsedMs(run: () => Promise<unknown>): Promise<number> {
  const start = performance.now();
  await run();
  return performance.now() - start;
}

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('gera hash argon2id no formato PHC com m=19456, t=2 e p=1', async () => {
    const stored = await hasher.hash('senha-secreta-123');

    const [, salt = '', hash = ''] = PHC.exec(stored) ?? [];
    expect(Buffer.from(salt, 'base64')).toHaveLength(16);
    expect(Buffer.from(hash, 'base64')).toEqual(
      argon2Sync('argon2id', {
        message: 'senha-secreta-123',
        nonce: Buffer.from(salt, 'base64'),
        memory: 19456,
        passes: 2,
        parallelism: 1,
        tagLength: 32,
      }),
    );
    expect(await hasher.hash('senha-secreta-123')).not.toBe(stored);
  });

  it('verifica a senha certa', async () => {
    const stored = await hasher.hash('senha-secreta-123');

    await expect(hasher.verify('senha-secreta-123', stored)).resolves.toBe(
      true,
    );
  });

  it('recusa a senha errada', async () => {
    const stored = await hasher.hash('senha-secreta-123');

    await expect(hasher.verify('senha-secreta-124', stored)).resolves.toBe(
      false,
    );
    await expect(hasher.verify('', stored)).resolves.toBe(false);
  });

  it('verifica contra o hash fixo e devolve false quando não há hash guardado', async () => {
    const stored = await hasher.hash('senha-secreta-123');
    await hasher.verify('aquecimento', stored);

    const withHash = await elapsedMs(() =>
      hasher.verify('senha-secreta-123', stored),
    );
    let result: boolean | undefined;
    const withoutHash = await elapsedMs(async () => {
      result = await hasher.verify('senha-secreta-123', null);
    });

    expect(result).toBe(false);
    // Sem hash guardado, o argon2id roda do mesmo jeito: o tempo não revela a conta.
    expect(withoutHash).toBeGreaterThan(withHash / 4);
  });
});
