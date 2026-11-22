import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { registerAccount, signIn } from './support/account';
import { FAKE_PROVIDERS_URL } from './support/fake-providers';
import { expect, test } from './support/fixtures';

function newEmail(): string {
  return `cabecalho-${randomUUID()}@example.com`;
}

async function sessionEmail(page: Page): Promise<string | null> {
  const response = await page.request.get('/api/auth/session');
  const body = (await response.json()) as { user: { email: string } | null };
  return body.user?.email ?? null;
}

// Conta "Ana Souza" com a sessão aberta no navegador da página.
async function signedInAs(page: Page): Promise<string> {
  const email = newEmail();
  await registerAccount(page.request, email);
  await signIn(page.request, email);
  return email;
}

test.describe('cabeçalho', () => {
  test('sem sessão mostra "Entrar", que leva a /entrar', async ({ page }) => {
    await page.goto('/');
    const header = page.getByRole('banner');

    await header.getByRole('link', { name: 'Entrar' }).click();

    await expect(page).toHaveURL('/entrar');
    await expect(
      header.getByRole('button', { name: 'Menu da conta' }),
    ).toHaveCount(0);
  });

  test('com sessão mostra o avatar com as iniciais e o menu com "Perfil" e "Sair"', async ({
    page,
  }) => {
    const email = await signedInAs(page);
    await page.goto('/');
    const header = page.getByRole('banner');
    const trigger = header.getByRole('button', { name: 'Menu da conta' });

    await expect(trigger).toHaveText('AS');
    await expect(header.getByRole('link', { name: 'Entrar' })).toHaveCount(0);
    await trigger.click();

    const menu = page.getByRole('menu');
    await expect(menu.getByText('Ana Souza', { exact: true })).toBeVisible();
    await expect(menu.getByText(email, { exact: true })).toBeVisible();
    await expect(menu.getByRole('menuitem')).toHaveText([
      'Meus grupos',
      'Perfil',
      'Sair',
    ]);
    await menu.getByRole('menuitem', { name: 'Perfil' }).click();
    await expect(page).toHaveURL('/perfil');
  });

  test('"Sair" encerra a sessão e leva a /entrar', async ({ page }) => {
    await signedInAs(page);
    await page.goto('/');
    const header = page.getByRole('banner');

    await header.getByRole('button', { name: 'Menu da conta' }).click();
    await page.getByRole('menuitem', { name: 'Sair' }).click();

    await expect(page).toHaveURL('/entrar');
    expect(await sessionEmail(page)).toBeNull();
    await expect(header.getByRole('link', { name: 'Entrar' })).toBeVisible();
  });

  test('mostra a foto do Google no avatar de conta Google', async ({
    page,
  }) => {
    await page.goto('/entrar');
    await page.getByRole('link', { name: 'Entrar com Google' }).click();
    await page.getByRole('link', { name: 'Verificada nova' }).click();
    await page.getByRole('checkbox', { name: /Li e aceito/ }).check();
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page).toHaveURL('/grupos');
    await page.goto('/');

    const trigger = page
      .getByRole('banner')
      .getByRole('button', { name: 'Menu da conta' });
    await expect(trigger.locator('img')).toHaveAttribute(
      'src',
      `${FAKE_PROVIDERS_URL}/avatar.png`,
    );
  });
});
