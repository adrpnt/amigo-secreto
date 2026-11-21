import type { SessionUser } from '@amigo-secreto/shared';
import type { Page } from '@playwright/test';
import { FAKE_GOOGLE_NAME, FAKE_PROVIDERS_URL } from './support/fake-providers';
import { expect, test } from './support/fixtures';

const TRY_AGAIN = 'Não foi possível entrar com Google. Tente de novo.';
const USE_PASSWORD =
  'Não foi possível entrar com Google. Entre com e-mail e senha.';

type GoogleChoice = 'Verificada nova' | 'Não verificada' | 'Cancelar';

async function sessionUser(page: Page): Promise<SessionUser | null> {
  const response = await page.request.get('/api/auth/session');
  return ((await response.json()) as { user: SessionUser | null }).user;
}

// Abre /entrar, passa pelo Google falso e escolhe a conta.
async function enterWithGoogle(
  page: Page,
  choice: GoogleChoice,
  path = '/entrar',
) {
  await page.goto(path);
  await page.getByRole('link', { name: 'Entrar com Google' }).click();
  await page.getByRole('link', { name: choice, exact: true }).click();
}

test.describe('login com Google', () => {
  test('e-mail novo passa por "Complete seu cadastro" com o nome do Google e entra', async ({
    page,
  }) => {
    await enterWithGoogle(
      page,
      'Verificada nova',
      '/entrar?next=%2Fconvite%2Fabc',
    );

    await expect(page).toHaveURL('/completar-cadastro');
    await expect(
      page.getByRole('heading', { name: 'Complete seu cadastro' }),
    ).toBeVisible();
    const name = page.getByLabel('Nome', { exact: true });
    await expect(name).toHaveValue(FAKE_GOOGLE_NAME);
    await expect(
      page.getByRole('checkbox', { name: /Li e aceito/ }),
    ).not.toBeChecked();
    await expect(
      page.getByRole('checkbox', { name: /Quero receber novidades/ }),
    ).not.toBeChecked();
    const terms = page.getByRole('link', { name: 'Termos de uso' });
    const privacy = page.getByRole('link', { name: 'Política de privacidade' });
    await expect(terms).toHaveAttribute('href', '/termos');
    await expect(terms).toHaveAttribute('target', '_blank');
    await expect(privacy).toHaveAttribute('href', '/privacidade');
    await expect(privacy).toHaveAttribute('target', '_blank');

    await name.fill('Bia Souza');
    await page.getByRole('checkbox', { name: /Li e aceito/ }).check();
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page).toHaveURL('/convite/abc');
    expect(await sessionUser(page)).toMatchObject({
      name: 'Bia Souza',
      email: expect.stringMatching(/^google-.+@example\.com$/),
      emailVerified: true,
      hasGoogle: true,
      hasPassword: false,
      avatarUrl: `${FAKE_PROVIDERS_URL}/avatar.png`,
    });
  });

  test('e-mail não verificado volta a /entrar com "Não foi possível entrar com Google. Entre com e-mail e senha."', async ({
    page,
  }) => {
    await enterWithGoogle(page, 'Não verificada');

    await expect(page).toHaveURL(/\/entrar\?erro=google_nao_verificado/);
    await expect(page.getByText(USE_PASSWORD, { exact: true })).toBeVisible();
    expect(await sessionUser(page)).toBeNull();
  });

  test('cancelar no Google volta a /entrar com "Não foi possível entrar com Google. Tente de novo."', async ({
    page,
  }) => {
    await enterWithGoogle(page, 'Cancelar');

    await expect(page).toHaveURL(/\/entrar\?erro=google(&|$)/);
    await expect(page.getByText(TRY_AGAIN, { exact: true })).toBeVisible();
    expect(await sessionUser(page)).toBeNull();
  });

  test('abrir /completar-cadastro sem passar pelo Google volta a /entrar com "Não foi possível entrar com Google. Tente de novo."', async ({
    page,
  }) => {
    await page.goto('/completar-cadastro');

    await expect(page).toHaveURL('/entrar?erro=google');
    await expect(page.getByText(TRY_AGAIN, { exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Complete seu cadastro' }),
    ).toHaveCount(0);
  });
});
