import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const WCAG_21_A_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
}

async function openWithTheme(page: Page, theme: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme: theme });
  await page.goto('/');
  await expect(page.getByText('API online', { exact: true })).toBeVisible();
  if (theme === 'dark') {
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  } else {
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
  }
}

test.describe('layout', () => {
  test('não rola na horizontal em 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    await expect(page.getByText('API online', { exact: true })).toBeVisible();

    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  test('não rola na horizontal em 1440 px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByText('API online', { exact: true })).toBeVisible();

    expect(await hasHorizontalScroll(page)).toBe(false);
  });
});

test.describe('acessibilidade', () => {
  test('página inicial sem violações WCAG 2.1 A/AA no tema claro', async ({
    page,
  }) => {
    await openWithTheme(page, 'light');

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_21_A_AA)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('página inicial sem violações WCAG 2.1 A/AA no tema escuro', async ({
    page,
  }) => {
    await openWithTheme(page, 'dark');

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_21_A_AA)
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
