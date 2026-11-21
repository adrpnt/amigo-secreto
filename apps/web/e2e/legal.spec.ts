import { expect, test } from './support/fixtures';

test.describe('termos', () => {
  test('/termos mostra o título, a versão vigente e o texto provisório', async ({
    page,
  }) => {
    const response = await page.goto('/termos');

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle('Termos de uso · Amigo Secreto');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Termos de uso' }),
    ).toBeVisible();
    await expect(
      page.getByText('Versão 2026-11-19', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Este texto é provisório. A versão completa dos Termos de uso será publicada aqui antes do lançamento do Amigo Secreto.',
        { exact: true },
      ),
    ).toBeVisible();
  });

  test('/privacidade mostra o título, a versão vigente e o texto provisório', async ({
    page,
  }) => {
    const response = await page.goto('/privacidade');

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle('Política de privacidade · Amigo Secreto');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Política de privacidade' }),
    ).toBeVisible();
    await expect(
      page.getByText('Versão 2026-11-19', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Este texto é provisório. A versão completa da Política de privacidade será publicada aqui antes do lançamento do Amigo Secreto.',
        { exact: true },
      ),
    ).toBeVisible();
  });
});
