import { randomUUID } from 'node:crypto';
import type { APIRequestContext, Page } from '@playwright/test';
import { registerAccount, resetLinkTo, signIn } from './support/account';
import { expect, test } from './support/fixtures';

const NEW_PASSWORD = 'senha-nova-456';

function newEmail(): string {
  return `recuperacao-${randomUUID()}@example.com`;
}

async function sessionEmail(
  request: APIRequestContext,
): Promise<string | null> {
  const response = await request.get('/api/auth/session');
  const body = (await response.json()) as { user: { email: string } | null };
  return body.user?.email ?? null;
}

async function submitNewPassword(page: Page, link: string) {
  await page.goto(link);
  await page.getByLabel('Senha nova', { exact: true }).fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Salvar senha' }).click();
}

async function requestReset(
  page: Page,
  email: string,
  path = '/esqueci-a-senha',
) {
  await page.goto(path);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Enviar link' }).click();
}

test.describe('recuperação de senha', () => {
  test('mostra "Se houver uma conta com X, enviamos um link para redefinir a senha." com e sem conta', async ({
    page,
  }) => {
    const withAccount = newEmail();
    const withoutAccount = newEmail();
    await registerAccount(page.request, withAccount);

    for (const email of [withAccount, withoutAccount]) {
      await requestReset(page, email.toUpperCase());

      await expect(
        page.getByRole('heading', { name: 'Confira seu e-mail' }),
      ).toBeVisible();
      await expect(
        page.getByText(
          `Se houver uma conta com ${email}, enviamos um link para redefinir a senha.`,
          { exact: true },
        ),
      ).toBeVisible();
      await expect(page.getByLabel('E-mail', { exact: true })).toHaveCount(0);
    }
  });

  test.describe(() => {
    // Cada teste espera o e-mail de recuperação passar pela fila da API.
    test.describe.configure({ timeout: 60_000 });

    test('o link troca a senha e entra', async ({ page, request }) => {
      const email = newEmail();
      await registerAccount(page.request, email);
      // Sessão aberta antes, em outro navegador.
      await signIn(request, email);
      await requestReset(page, email, '/esqueci-a-senha?next=%2Fconvite%2Fabc');
      const link = await resetLinkTo(email);

      await submitNewPassword(page, link);

      await expect(page).toHaveURL('/convite/abc');
      expect(await sessionEmail(page.request)).toBe(email);
      expect(await sessionEmail(request)).toBeNull();
      await signIn(request, email, NEW_PASSWORD);
    });

    test('o link usado mostra "Este link expirou ou já foi usado." com o caminho para /esqueci-a-senha', async ({
      page,
    }) => {
      const email = newEmail();
      await registerAccount(page.request, email);
      await requestReset(page, email);
      const link = await resetLinkTo(email);
      await submitNewPassword(page, link);
      await expect(page).toHaveURL('/grupos');

      await submitNewPassword(page, link);

      await expect(
        page.getByText('Este link expirou ou já foi usado.', { exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel('Senha nova', { exact: true })).toHaveCount(
        0,
      );
      await page.getByRole('link', { name: 'Pedir um novo link' }).click();
      await expect(page).toHaveURL('/esqueci-a-senha');
    });
  });
});
