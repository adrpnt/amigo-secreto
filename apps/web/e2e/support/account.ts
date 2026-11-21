import { type APIRequestContext, expect } from '@playwright/test';
import { FAKE_PROVIDERS_URL, type FakeEmail } from './fake-providers';

export const PASSWORD = 'senha-forte-123';

export async function csrfToken(request: APIRequestContext): Promise<string> {
  await request.get('/api/auth/session');
  const { cookies } = await request.storageState();
  return cookies.find((cookie) => cookie.name === 'csrf')?.value ?? '';
}

// Use o page.request para a sessão valer no navegador da página.
export async function registerAccount(
  request: APIRequestContext,
  email: string,
  password = PASSWORD,
) {
  const response = await request.post('/api/auth/register', {
    headers: { 'X-CSRF-Token': await csrfToken(request) },
    data: { name: 'Ana Souza', email, password, acceptTerms: true },
  });
  expect(response.status()).toBe(202);
}

export async function signIn(
  request: APIRequestContext,
  email: string,
  password = PASSWORD,
) {
  const response = await request.post('/api/auth/login', {
    headers: { 'X-CSRF-Token': await csrfToken(request) },
    data: { email, password },
  });
  expect(response.status()).toBe(200);
}

const LINK_WAIT_MS = 20_000;
const LINK_POLL_MS = 250;
const LINK_PATTERN = /http:\/\/localhost:\d+(\/confirmar-email\?[^\s"<>]+)/;

// Caminho do link de /confirmar-email no último e-mail para o endereço que
// satisfaz `accept` (por exemplo, o link de troca ou um link diferente do
// anterior). A fila de e-mails da API roda a cada 10 segundos.
export async function confirmationLinkTo(
  email: string,
  accept: (path: string) => boolean = () => true,
): Promise<string> {
  const url = `${FAKE_PROVIDERS_URL}/emails/latest?to=${encodeURIComponent(email)}`;
  const deadline = Date.now() + LINK_WAIT_MS;
  while (Date.now() < deadline) {
    const response = await fetch(url);
    if (response.status === 200) {
      const { text } = (await response.json()) as FakeEmail;
      const path = LINK_PATTERN.exec(text)?.[1];
      if (path && accept(path)) return path.replaceAll('&amp;', '&');
    }
    await new Promise((resolve) => setTimeout(resolve, LINK_POLL_MS));
  }
  throw new Error(`Nenhum link para ${email} em ${LINK_WAIT_MS / 1000} s.`);
}
