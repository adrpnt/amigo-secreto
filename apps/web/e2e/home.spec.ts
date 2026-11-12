import { expect, test } from '@playwright/test';

const WEB_WITH_API_DOWN_URL = 'http://localhost:3100/';

test.describe('página inicial', () => {
  test('declara lang pt-BR', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  });

  test('mostra o cabeçalho com Amigo Secreto e o botão de tema', async ({
    page,
  }) => {
    await page.goto('/');

    const header = page.getByRole('banner');
    await expect(
      header.getByRole('link', { name: 'Amigo Secreto', exact: true }),
    ).toBeVisible();
    await expect(
      header.getByRole('button', { name: /^Ativar tema (escuro|claro)$/ }),
    ).toBeVisible();
  });

  test('mostra API online quando a API responde', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('API online', { exact: true })).toBeVisible();
    await expect(page.getByText('API indisponível')).toHaveCount(0);
  });

  test('mostra API indisponível e o tema funciona quando a API não responde', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(WEB_WITH_API_DOWN_URL);

    await expect(
      page.getByText('API indisponível', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('API online')).toHaveCount(0);

    const header = page.getByRole('banner');
    await expect(
      header.getByRole('link', { name: 'Amigo Secreto', exact: true }),
    ).toBeVisible();

    await header.getByRole('button', { name: 'Ativar tema escuro' }).click();

    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });
});
