import { expect, test } from '@playwright/test';

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
});
