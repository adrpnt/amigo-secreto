import { randomUUID } from 'node:crypto';
import { confirmationLinkTo, registerAccount, signIn } from './support/account';
import { expect, test } from './support/fixtures';

function newEmail(): string {
  return `faixa-${randomUUID()}@example.com`;
}

const bannerText = (email: string) =>
  `Confirme seu e-mail: enviamos um link para ${email}.`;

test.describe('faixa de confirmação', () => {
  test('aparece para quem entrou sem confirmar com "Confirme seu e-mail: enviamos um link para X."', async ({
    page,
  }) => {
    const email = newEmail();
    await registerAccount(page.request, email);
    await page.goto('/');
    await expect(page.getByText('API online', { exact: true })).toBeVisible();
    await expect(page.getByText(/^Confirme seu e-mail:/)).toHaveCount(0);

    await signIn(page.request, email);
    await page.goto('/');

    await expect(
      page.getByText(bannerText(email), { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Reenviar e-mail' }),
    ).toBeVisible();
  });

  test('"Reenviar e-mail" mostra "Enviamos um novo link para X."', async ({
    page,
  }) => {
    const email = newEmail();
    await registerAccount(page.request, email);
    await signIn(page.request, email);
    await page.goto('/');

    await page.getByRole('button', { name: 'Reenviar e-mail' }).click();

    await expect(
      page.getByText(`Enviamos um novo link para ${email}.`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Reenviar e-mail' }),
    ).toHaveCount(0);
  });

  test('some depois da confirmação', async ({ page }) => {
    // Espera o e-mail de confirmação passar pela fila da API.
    test.setTimeout(60_000);
    const email = newEmail();
    await registerAccount(page.request, email);
    const link = await confirmationLinkTo(email);
    await signIn(page.request, email);
    await page.goto('/');
    await expect(
      page.getByText(bannerText(email), { exact: true }),
    ).toBeVisible();
    await page.goto('/confirmar-email');
    await expect(
      page.getByText('Este link expirou ou já foi usado.', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(bannerText(email), { exact: true }),
    ).toHaveCount(0);

    await page.goto(link);
    await expect(page).toHaveURL('/perfil');

    await expect(
      page.getByText(bannerText(email), { exact: true }),
    ).toHaveCount(0);
    await page.goto('/');
    await expect(page.getByText('API online', { exact: true })).toBeVisible();
    await expect(
      page.getByText(bannerText(email), { exact: true }),
    ).toHaveCount(0);
  });
});
