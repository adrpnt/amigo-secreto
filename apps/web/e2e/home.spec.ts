import { expect, test } from '@playwright/test';

test.describe('página inicial', () => {
  test('declara lang pt-BR', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  });
});
