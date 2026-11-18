import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(import.meta.dirname, '..');

// Sem letra antes: "beforeSend" do Sentry não conta como Resend.
const MENTIONS_RESEND = /(?<![a-z])resend/i;

function sourceFiles(): string[] {
  return readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'))
    .map((file) => file.split('\\').join('/'));
}

function mentionsResend(file: string): boolean {
  return MENTIONS_RESEND.test(readFileSync(join(SRC, file), 'utf8'));
}

describe('fronteira do Resend', () => {
  it('só o módulo de e-mail e a configuração citam o Resend', () => {
    const files = sourceFiles();
    const outside = files.filter(
      (file) => !file.startsWith('email/') && !file.startsWith('config/'),
    );

    expect(outside.length).toBeGreaterThan(0);
    expect(files.filter((file) => file.startsWith('email/'))).toEqual(
      expect.arrayContaining(['email/resend.transport.ts']),
    );
    expect(mentionsResend('email/resend.transport.ts')).toBe(true);
    expect(outside.filter(mentionsResend)).toEqual([]);
  });
});
