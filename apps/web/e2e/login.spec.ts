import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { PASSWORD, registerAccount, signIn } from './support/account';
import { expect, test } from './support/fixtures';

const WHATSAPP_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.82 Mobile Safari/537.36 WhatsApp/2.24.9.78';

function newEmail(): string {
  return `login-${randomUUID()}@example.com`;
}

async function submitSignIn(page: Page, email: string, password: string) {
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

async function sessionEmail(page: Page): Promise<string | null> {
  const response = await page.request.get('/api/auth/session');
  const body = (await response.json()) as { user: { email: string } | null };
  return body.user?.email ?? null;
}

test.describe('login', () => {
  test('entra com a senha certa e cai em /perfil', async ({ page }) => {
    const email = newEmail();
    await registerAccount(page.request, email);
    await page.goto('/entrar');

    await submitSignIn(page, email, PASSWORD);

    await expect(page).toHaveURL('/perfil');
    expect(await sessionEmail(page)).toBe(email);
  });

  test('mostra "E-mail ou senha incorretos." com a senha errada', async ({
    page,
  }) => {
    const email = newEmail();
    await registerAccount(page.request, email);
    await page.goto('/entrar');

    await submitSignIn(page, email, 'senha-errada-123');

    await expect(
      page.getByText('E-mail ou senha incorretos.', { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL('/entrar');
    expect(await sessionEmail(page)).toBeNull();
  });

  test('volta à página de origem depois do login', async ({ page }) => {
    const email = newEmail();
    await registerAccount(page.request, email);
    await page.goto('/entrar?next=%2Fconvite%2Fabc');

    await submitSignIn(page, email, PASSWORD);

    await expect(page).toHaveURL('/convite/abc');
    expect(await sessionEmail(page)).toBe(email);
  });

  test('mostra "Muitas tentativas. Tente de novo em 15 minutos." na 11ª tentativa', async ({
    page,
  }) => {
    const email = newEmail();
    await registerAccount(page.request, email);
    await page.goto('/entrar');

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const response = page.waitForResponse('**/api/auth/login');
      await submitSignIn(page, email, 'senha-errada-123');
      expect((await response).status()).toBe(401);
    }
    await submitSignIn(page, email, PASSWORD);

    await expect(
      page.getByText('Muitas tentativas. Tente de novo em 15 minutos.', {
        exact: true,
      }),
    ).toBeVisible();
    expect(await sessionEmail(page)).toBeNull();
  });

  test('leva a pessoa logada que abre /entrar direto ao destino', async ({
    page,
  }) => {
    const email = newEmail();
    await registerAccount(page.request, email);
    await signIn(page.request, email);

    await page.goto('/entrar?next=%2Fconvite%2Fabc');
    await expect(page).toHaveURL('/convite/abc');

    await page.goto('/entrar');
    await expect(page).toHaveURL('/perfil');
  });
});

// Mesmo grupo "login", com o navegador interno do WhatsApp.
test.describe('login', () => {
  test.use({ userAgent: WHATSAPP_ANDROID });

  test('com o user agent do WhatsApp mostra a orientação no lugar do Google e o formulário continua funcionando', async ({
    page,
  }) => {
    const email = newEmail();
    await registerAccount(page.request, email);
    await page.goto('/entrar');

    await expect(
      page.getByText(
        'Para entrar com Google, abra esta página no navegador do celular.',
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Copiar link' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Entrar com Google' }),
    ).toHaveCount(0);

    await submitSignIn(page, email, PASSWORD);

    await expect(page).toHaveURL('/perfil');
    expect(await sessionEmail(page)).toBe(email);
  });
});
