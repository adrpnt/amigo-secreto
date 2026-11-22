import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import {
  PASSWORD,
  confirmationLinkTo,
  csrfToken,
  registerAccount,
  signIn,
} from './support/account';
import { expect, test } from './support/fixtures';

const EXPIRED = 'Este link expirou ou já foi usado.';
const IN_USE = 'Este e-mail já está em uso por outra conta.';

function newEmail(): string {
  return `confirmacao-${randomUUID()}@example.com`;
}

type SessionUser = { email: string; emailVerified: boolean };

async function sessionUser(page: Page): Promise<SessionUser | null> {
  const response = await page.request.get('/api/auth/session');
  return ((await response.json()) as { user: SessionUser | null }).user;
}

async function requestEmailChange(page: Page, newAddress: string) {
  const response = await page.request.post('/api/users/me/email', {
    headers: { 'X-CSRF-Token': await csrfToken(page.request) },
    data: { password: PASSWORD, newEmail: newAddress },
  });
  expect(response.status()).toBe(202);
}

const isEmailChange = (path: string) => path.includes('tipo=troca');

test.describe('confirmação de e-mail', () => {
  // Cada teste espera ao menos um e-mail passar pela fila da API.
  test.describe.configure({ timeout: 60_000 });

  test('o link do e-mail confirma, abre a sessão e leva a Meus grupos', async ({
    page,
  }) => {
    const email = newEmail();
    await registerAccount(page.request, email);
    const link = await confirmationLinkTo(email);

    await page.goto(link);

    await expect(page).toHaveURL('/grupos');
    expect(await sessionUser(page)).toMatchObject({
      email,
      emailVerified: true,
    });
  });

  test('o link aberto de novo mostra "Este link expirou ou já foi usado."', async ({
    page,
  }) => {
    const email = newEmail();
    await registerAccount(page.request, email);
    const link = await confirmationLinkTo(email);
    await page.goto(link);
    await expect(page).toHaveURL('/grupos');

    await page.goto(link);

    await expect(page.getByText(EXPIRED, { exact: true })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Ir para o perfil' }),
    ).toHaveAttribute('href', '/perfil');
    await expect(
      page.getByRole('button', { name: 'Reenviar e-mail' }),
    ).toHaveCount(0);
  });

  test('o link usado mostra "Reenviar e-mail" para quem está logado sem confirmar', async ({
    page,
  }) => {
    const email = newEmail();
    await registerAccount(page.request, email);
    const replacedLink = await confirmationLinkTo(email);
    await signIn(page.request, email);
    const resend = await page.request.post(
      '/api/auth/email/verification-link',
      { headers: { 'X-CSRF-Token': await csrfToken(page.request) } },
    );
    expect(resend.status()).toBe(202);

    await page.goto(replacedLink);

    await expect(page.getByText(EXPIRED, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Reenviar e-mail' }).click();
    await expect(
      page.getByText(`Enviamos um novo link para ${email}.`, { exact: true }),
    ).toBeVisible();
    expect(await sessionUser(page)).toMatchObject({ emailVerified: false });
  });

  test('o link de troca de e-mail troca o e-mail mostrado no perfil', async ({
    page,
  }) => {
    const email = newEmail();
    const newAddress = newEmail();
    await registerAccount(page.request, email);
    await signIn(page.request, email);
    await requestEmailChange(page, newAddress);
    const link = await confirmationLinkTo(newAddress, isEmailChange);

    await page.goto(link);

    await expect(page).toHaveURL('/perfil');
    await expect(
      page.getByRole('main').getByText(newAddress, { exact: true }),
    ).toBeVisible();
    expect(await sessionUser(page)).toMatchObject({
      email: newAddress,
      emailVerified: true,
    });
  });

  test('o link de troca para um e-mail em uso mostra "Este e-mail já está em uso por outra conta."', async ({
    page,
  }) => {
    const email = newEmail();
    const otherAccount = newEmail();
    await registerAccount(page.request, email);
    await registerAccount(page.request, otherAccount);
    await signIn(page.request, email);
    await requestEmailChange(page, otherAccount);
    const link = await confirmationLinkTo(otherAccount, isEmailChange);

    await page.goto(link);

    await expect(page.getByText(IN_USE, { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/confirmar-email\?/);
    expect(await sessionUser(page)).toMatchObject({ email });
  });
});
