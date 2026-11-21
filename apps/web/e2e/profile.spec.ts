import { randomUUID } from 'node:crypto';
import type { SessionUser } from '@amigo-secreto/shared';
import type { Page } from '@playwright/test';
import {
  PASSWORD,
  csrfToken,
  registerAccount,
  signIn,
} from './support/account';
import { expect, test } from './support/fixtures';

const NEW_PASSWORD = 'senha-nova-456';
const MARKETING = 'Quero receber novidades do Amigo Secreto por e-mail.';

function newEmail(): string {
  return `perfil-${randomUUID()}@example.com`;
}

async function me(page: Page): Promise<SessionUser> {
  const response = await page.request.get('/api/users/me');
  expect(response.status()).toBe(200);
  return (await response.json()) as SessionUser;
}

// Conta "Ana Souza" com a sessão aberta no navegador da página.
async function signedInAs(page: Page): Promise<string> {
  const email = newEmail();
  await registerAccount(page.request, email);
  await signIn(page.request, email);
  return email;
}

async function setMarketingOptIn(page: Page, marketingOptIn: boolean) {
  const response = await page.request.patch('/api/users/me', {
    headers: { 'X-CSRF-Token': await csrfToken(page.request) },
    data: { marketingOptIn },
  });
  expect(response.status()).toBe(200);
}

async function changePassword(page: Page, current: string | null) {
  if (current !== null) {
    await page.getByLabel('Senha atual', { exact: true }).fill(current);
  }
  await page.getByLabel('Senha nova', { exact: true }).fill(NEW_PASSWORD);
}

test.describe('perfil', () => {
  test('sem sessão leva a /entrar e volta a /perfil depois do login', async ({
    page,
  }) => {
    const email = newEmail();
    await registerAccount(page.request, email);

    await page.goto('/perfil');
    await expect(page).toHaveURL('/entrar?next=%2Fperfil');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();

    await expect(page).toHaveURL('/perfil');
    await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible();
  });

  test('mostra nome, e-mail, iniciais e o opt-in', async ({ page }) => {
    const email = await signedInAs(page);
    await setMarketingOptIn(page, true);

    await page.goto('/perfil');

    const main = page.getByRole('main');
    await expect(main.getByText('AS', { exact: true })).toBeVisible();
    await expect(main.getByText('Ana Souza', { exact: true })).toBeVisible();
    await expect(main.getByText(email, { exact: true })).toBeVisible();
    await expect(main.getByLabel('Nome', { exact: true })).toHaveValue(
      'Ana Souza',
    );
    await expect(main.getByRole('checkbox', { name: MARKETING })).toBeChecked();
  });

  test('salvar o nome muda o menu do avatar', async ({ page }) => {
    await signedInAs(page);
    await page.goto('/perfil');

    await page.getByLabel('Nome', { exact: true }).fill('  Bia Lima  ');
    await page.getByRole('button', { name: 'Salvar nome' }).click();

    await expect(page.getByText('Nome salvo.', { exact: true })).toBeVisible();
    const trigger = page
      .getByRole('banner')
      .getByRole('button', { name: 'Menu da conta' });
    await expect(trigger).toHaveText('BL');
    await trigger.click();
    await expect(
      page.getByRole('menu').getByText('Bia Lima', { exact: true }),
    ).toBeVisible();
    expect((await me(page)).name).toBe('Bia Lima');
  });

  test('recusa nome vazio mantendo o anterior', async ({ page }) => {
    await signedInAs(page);
    await page.goto('/perfil');

    const name = page.getByLabel('Nome', { exact: true });
    await name.fill('   ');
    await page.getByRole('button', { name: 'Salvar nome' }).click();

    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAccessibleDescription(/Informe seu nome\./);
    await expect(page.getByText('Nome salvo.', { exact: true })).toHaveCount(0);
    expect((await me(page)).name).toBe('Ana Souza');
    await page.reload();
    await expect(page.getByLabel('Nome', { exact: true })).toHaveValue(
      'Ana Souza',
    );
  });

  test('desligar o marketing grava o estado', async ({ page }) => {
    await signedInAs(page);
    await setMarketingOptIn(page, true);
    await page.goto('/perfil');

    const checkbox = page.getByRole('checkbox', { name: MARKETING });
    await checkbox.click();

    await expect(
      page.getByText('Preferência salva.', { exact: true }),
    ).toBeVisible();
    await expect(checkbox).not.toBeChecked();
    expect((await me(page)).marketingOptIn).toBe(false);
    await page.reload();
    await expect(
      page.getByRole('checkbox', { name: MARKETING }),
    ).not.toBeChecked();
  });

  test('troca a senha e continua logado', async ({ page, request }) => {
    const email = await signedInAs(page);
    // Outra sessão da mesma conta, em outro navegador.
    await signIn(request, email);
    await page.goto('/perfil');

    await changePassword(page, PASSWORD);
    await page.getByRole('button', { name: 'Trocar senha' }).click();

    await expect(
      page.getByText('Senha alterada.', { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Senha nova', { exact: true })).toHaveValue(
      '',
    );
    expect((await me(page)).email).toBe(email);
    const otherSession = await request.get('/api/auth/session');
    expect(((await otherSession.json()) as { user: unknown }).user).toBeNull();
    await signIn(request, email, NEW_PASSWORD);
  });

  test('mostra "Senha atual incorreta." com a senha atual errada', async ({
    page,
    request,
  }) => {
    const email = await signedInAs(page);
    await page.goto('/perfil');

    await changePassword(page, 'senha-errada-123');
    await page.getByRole('button', { name: 'Trocar senha' }).click();

    const current = page.getByLabel('Senha atual', { exact: true });
    await expect(current).toHaveAttribute('aria-invalid', 'true');
    await expect(current).toHaveAccessibleDescription(
      /Senha atual incorreta\./,
    );
    await expect(
      page.getByText('Senha alterada.', { exact: true }),
    ).toHaveCount(0);
    await signIn(request, email, PASSWORD);
  });

  test('conta Google cria a senha sem pedir a atual', async ({
    page,
    request,
  }) => {
    await page.goto('/entrar');
    await page.getByRole('link', { name: 'Entrar com Google' }).click();
    await page.getByRole('link', { name: 'Verificada nova' }).click();
    await page.getByRole('checkbox', { name: /Li e aceito/ }).check();
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page).toHaveURL('/perfil');
    const { email } = await me(page);

    await expect(page.getByLabel('Senha atual', { exact: true })).toHaveCount(
      0,
    );
    await changePassword(page, null);
    await page.getByRole('button', { name: 'Criar senha' }).click();

    await expect(
      page.getByText('Senha alterada.', { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Senha atual', { exact: true })).toBeVisible();
    await signIn(request, email, NEW_PASSWORD);
  });
});
