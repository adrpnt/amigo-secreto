import { Injectable } from '@nestjs/common';
import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';

type Argon2Options = { memory: number; passes: number; parallelism: number };

const OPTIONS: Argon2Options = { memory: 19456, passes: 2, parallelism: 1 };
const SALT_BYTES = 16;
const TAG_LENGTH = 32;
const PHC =
  /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

// Hash de uma senha aleatória descartada: conta sem senha verifica contra ele,
// para o tempo de resposta não revelar se a conta existe.
const FIXED_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$ji8tTtNWxFhq1bIiiHXgZQ$HjeL5tKB3JSj7dxVRTOo7Ec8Nfk0cWar34vA7vxeGA8';

function derive(
  password: string,
  salt: Buffer,
  options: Argon2Options,
  tagLength: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    argon2(
      'argon2id',
      { message: password, nonce: salt, tagLength, ...options },
      (error, derivedKey) => (error ? reject(error) : resolve(derivedKey)),
    );
  });
}

function toBase64(buffer: Buffer): string {
  return buffer.toString('base64').replace(/=+$/, '');
}

@Injectable()
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const hash = await derive(password, salt, OPTIONS, TAG_LENGTH);
    const { memory, passes, parallelism } = OPTIONS;
    return `$argon2id$v=19$m=${memory},t=${passes},p=${parallelism}$${toBase64(salt)}$${toBase64(hash)}`;
  }

  async verify(password: string, stored: string | null): Promise<boolean> {
    const match = PHC.exec(stored ?? FIXED_HASH);
    if (!match) return false;
    const [, memory, passes, parallelism, salt = '', hash = ''] = match;
    const expected = Buffer.from(hash, 'base64');
    const actual = await derive(
      password,
      Buffer.from(salt, 'base64'),
      {
        memory: Number(memory),
        passes: Number(passes),
        parallelism: Number(parallelism),
      },
      expected.length,
    );
    return stored !== null && timingSafeEqual(actual, expected);
  }
}
