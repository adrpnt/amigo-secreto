import { type APIRequestContext, expect } from '@playwright/test';

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
