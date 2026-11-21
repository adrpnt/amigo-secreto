import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { registerAccount } from './support/account';
import { expect, test } from './support/fixtures';

function newEmail(): string {
  return `recuperacao-${randomUUID()}@example.com`;
}

async function requestReset(page: Page, email: string) {
  await page.goto('/esqueci-a-senha');
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
});
