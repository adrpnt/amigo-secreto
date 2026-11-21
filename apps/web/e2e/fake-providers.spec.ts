import { randomUUID } from 'node:crypto';
import { expect, lastEmailTo, test } from './support/fixtures';

test.describe('provedores falsos', () => {
  test('o e-mail enfileirado pela API chega à caixa falsa', async ({
    request,
  }) => {
    // A fila de e-mails roda a cada 10 segundos.
    test.setTimeout(30_000);
    const email = `cadastro-${randomUUID()}@example.com`;
    await request.get('/api/auth/session');
    const { cookies } = await request.storageState();
    const csrf = cookies.find((cookie) => cookie.name === 'csrf')?.value;

    const response = await request.post('/api/auth/register', {
      headers: { 'X-CSRF-Token': csrf ?? '' },
      data: {
        name: 'Ana Souza',
        email,
        password: 'senha-forte-123',
        acceptTerms: true,
      },
    });
    expect(response.status()).toBe(202);

    const received = await lastEmailTo(email);
    expect(received.to).toBe(email);
    expect(received.subject).toBe('Confirme seu e-mail no Amigo Secreto');
    expect(received.text).toContain(
      'http://localhost:3200/confirmar-email?token=',
    );
  });
});
