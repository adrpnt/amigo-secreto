import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    firstFrameClass?: string;
  }
}

type Theme = 'light' | 'dark';

// Valores do design system "Cristal e Gelo" (tokens.json).
const COLOR_TOKENS: Record<string, Record<Theme, string>> = {
  background: { light: '#f1f5f9', dark: '#0b1120' },
  foreground: { light: '#1e293b', dark: '#e2e8f0' },
  card: { light: '#ffffff', dark: '#1e293b' },
  'card-foreground': { light: '#1e293b', dark: '#e2e8f0' },
  popover: { light: '#ffffff', dark: '#1e293b' },
  'popover-foreground': { light: '#1e293b', dark: '#e2e8f0' },
  muted: { light: '#e2e8f0', dark: '#283548' },
  'muted-foreground': { light: '#475569', dark: '#94a3b8' },
  primary: { light: '#0369a1', dark: '#38bdf8' },
  'primary-foreground': { light: '#ffffff', dark: '#0b1120' },
  brand: { light: '#0284c7', dark: '#38bdf8' },
  secondary: { light: '#cbd5e1', dark: '#334155' },
  'secondary-foreground': { light: '#1e293b', dark: '#e2e8f0' },
  accent: { light: '#e2e8f0', dark: '#334155' },
  'accent-foreground': { light: '#1e293b', dark: '#e2e8f0' },
  festive: { light: '#fbbf24', dark: '#fbbf24' },
  'festive-foreground': { light: '#1e293b', dark: '#1e293b' },
  destructive: { light: '#b91c1c', dark: '#f87171' },
  'destructive-foreground': { light: '#ffffff', dark: '#0b1120' },
  success: { light: '#15803d', dark: '#4ade80' },
  'success-foreground': { light: '#ffffff', dark: '#0b1120' },
  warning: { light: '#c2410c', dark: '#fb923c' },
  'warning-foreground': { light: '#ffffff', dark: '#0b1120' },
  'info-subtle': { light: '#e0f2fe', dark: '#0c4a6e' },
  'info-subtle-foreground': { light: '#075985', dark: '#7dd3fc' },
  'festive-subtle': { light: '#fef3c7', dark: '#78350f' },
  'festive-subtle-foreground': { light: '#92400e', dark: '#fcd34d' },
  'success-subtle': { light: '#dcfce7', dark: '#14532d' },
  'success-subtle-foreground': { light: '#166534', dark: '#86efac' },
  'warning-subtle': { light: '#ffedd5', dark: '#7c2d12' },
  'warning-subtle-foreground': { light: '#9a3412', dark: '#fdba74' },
  'destructive-subtle': { light: '#fee2e2', dark: '#7f1d1d' },
  'destructive-subtle-foreground': { light: '#991b1b', dark: '#fca5a5' },
  border: { light: '#cbd5e1', dark: '#334155' },
  input: { light: '#64748b', dark: '#64748b' },
  ring: { light: '#0284c7', dark: '#38bdf8' },
  glass: { light: 'rgba(255, 255, 255, 0.7)', dark: 'rgba(30, 41, 59, 0.6)' },
  'glass-border': {
    light: 'rgba(255, 255, 255, 0.6)',
    dark: 'rgba(226, 232, 240, 0.12)',
  },
  'reveal-from': { light: '#0f172a', dark: '#0f172a' },
  'reveal-to': { light: '#082f49', dark: '#082f49' },
  'reveal-foreground': { light: '#f8fafc', dark: '#f8fafc' },
  'reveal-particle': { light: '#bae6fd', dark: '#bae6fd' },
  'reveal-glass': {
    light: 'rgba(255, 255, 255, 0.08)',
    dark: 'rgba(255, 255, 255, 0.08)',
  },
};

const SHADOW_TOKENS: Record<string, Record<Theme, string>> = {
  'elevation-sm': {
    light: '0 1px 2px rgba(15, 23, 42, 0.06)',
    dark: '0 1px 2px rgba(0, 0, 0, 0.4)',
  },
  'elevation-md': {
    light: '0 4px 12px rgba(15, 23, 42, 0.08)',
    dark: '0 4px 12px rgba(0, 0, 0, 0.5)',
  },
};

async function openWithSystemTheme(page: Page, theme: Theme) {
  await page.emulateMedia({ colorScheme: theme });
  await page.goto('/');
}

// Resolve no navegador o token e o valor do design system pela mesma propriedade,
// para comparar cores e sombras já normalizadas.
function resolveTokens(
  page: Page,
  property: 'color' | 'boxShadow',
  tokens: Record<string, string>,
) {
  return page.evaluate(
    ({ property, tokens }) => {
      const probe = document.createElement('div');
      document.body.append(probe);
      const resolve = (value: string) => {
        probe.style[property] = value;
        return getComputedStyle(probe)[property];
      };
      const result: Record<string, { actual: string; expected: string }> = {};
      for (const [name, expected] of Object.entries(tokens)) {
        result[name] = {
          actual: resolve(`var(--${name})`),
          expected: resolve(expected),
        };
      }
      probe.remove();
      return result;
    },
    { property, tokens },
  );
}

function tokensFor(
  source: Record<string, Record<Theme, string>>,
  theme: Theme,
) {
  return Object.fromEntries(
    Object.entries(source).map(([name, values]) => [name, values[theme]]),
  );
}

async function expectDesignTokens(page: Page, theme: Theme) {
  const colors = await resolveTokens(
    page,
    'color',
    tokensFor(COLOR_TOKENS, theme),
  );
  for (const [name, { actual, expected }] of Object.entries(colors)) {
    expect(actual, `--${name}`).toBe(expected);
  }

  const shadows = await resolveTokens(
    page,
    'boxShadow',
    tokensFor(SHADOW_TOKENS, theme),
  );
  for (const [name, { actual, expected }] of Object.entries(shadows)) {
    expect(actual, `--${name}`).toBe(expected);
  }

  const body = page.locator('body');
  await expect(body).toHaveCSS('font-family', /Plus Jakarta Sans/);
  await expect(body).toHaveCSS('background-color', colors.background.expected);
  await expect(body).toHaveCSS('color', colors.foreground.expected);

  const toggle = page.getByRole('button', { name: /Ativar tema/ });
  await expect(toggle).toHaveCSS('border-radius', '10px');
  await expect(toggle).toHaveCSS('width', '44px');
  await expect(toggle).toHaveCSS('height', '44px');
}

test.describe('tema', () => {
  test('segue o tema escuro do sistema quando não há tema salvo', async ({
    page,
  }) => {
    await openWithSystemTheme(page, 'dark');

    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });

  test('segue o tema claro do sistema quando não há tema salvo', async ({
    page,
  }) => {
    await openWithSystemTheme(page, 'light');

    await expect(page.locator('html')).toHaveClass(/\blight\b/);
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
  });

  test('o botão troca o tema e a escolha sobrevive ao recarregar', async ({
    page,
  }) => {
    await openWithSystemTheme(page, 'light');

    await page.getByRole('button', { name: 'Ativar tema escuro' }).click();

    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe(
      'dark',
    );

    await page.reload();

    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });

  test('pinta o primeiro quadro no tema salvo', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
      requestAnimationFrame(() => {
        window.firstFrameClass = document.documentElement.className;
      });
    });

    await page.goto('/');

    const firstFrameClass = await page.evaluate(() => window.firstFrameClass);
    expect(firstFrameClass).toMatch(/\bdark\b/);
  });

  test('o botão se chama Ativar tema escuro no claro e Ativar tema claro no escuro', async ({
    page,
  }) => {
    await openWithSystemTheme(page, 'light');
    const lightButton = page.getByRole('button', {
      name: 'Ativar tema escuro',
      exact: true,
    });
    await expect(lightButton).toBeVisible();

    await lightButton.click();

    await expect(
      page.getByRole('button', { name: 'Ativar tema claro', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button')).toHaveCount(1);
  });

  test('aplica os tokens do design system no tema claro', async ({ page }) => {
    await openWithSystemTheme(page, 'light');
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);

    await expectDesignTokens(page, 'light');
  });

  test('aplica os tokens do design system no tema escuro', async ({ page }) => {
    await openWithSystemTheme(page, 'dark');
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    await expectDesignTokens(page, 'dark');
  });
});
