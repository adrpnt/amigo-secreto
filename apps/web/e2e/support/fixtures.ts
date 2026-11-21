import { randomInt } from 'node:crypto';
import { test as base } from '@playwright/test';
import { FAKE_PROVIDERS_URL, type FakeEmail } from './fake-providers';

export { expect } from '@playwright/test';

const EMAIL_WAIT_MS = 20_000;
const EMAIL_POLL_MS = 250;

function randomIp(): string {
  return `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
}

// Cada teste chega à API por um IP próprio (TRUST_PROXY_HOPS=1), para os
// limites de tentativas por IP não passarem de um teste para outro.
export const test = base.extend({
  // O segundo parâmetro não se chama `use` para a regra de hooks do React
  // não confundir com o hook.
  extraHTTPHeaders: async ({ extraHTTPHeaders }, provide) => {
    await provide({ ...extraHTTPHeaders, 'X-Forwarded-For': randomIp() });
  },
});

// Espera o último e-mail para o endereço chegar à caixa falsa; a fila de
// e-mails da API roda a cada 10 segundos.
export async function lastEmailTo(email: string): Promise<FakeEmail> {
  const url = `${FAKE_PROVIDERS_URL}/emails/latest?to=${encodeURIComponent(email)}`;
  const deadline = Date.now() + EMAIL_WAIT_MS;
  while (Date.now() < deadline) {
    const response = await fetch(url);
    if (response.status === 200) return (await response.json()) as FakeEmail;
    await new Promise((resolve) => setTimeout(resolve, EMAIL_POLL_MS));
  }
  throw new Error(`Nenhum e-mail para ${email} em ${EMAIL_WAIT_MS / 1000} s.`);
}
