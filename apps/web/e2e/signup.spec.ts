import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { PASSWORD, registerAccount, signIn } from './support/account';
import { expect, test } from './support/fixtures';

function newEmail(): string {
  return `cadastro-${randomUUID()}@example.com`;
}

async function fillSignUp(page: Page, email: string, password = PASSWORD) {
  await page.getByLabel('Nome', { exact: true }).fill('Ana Souza');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('checkbox', { name: /Li e aceito/ }).check();
}

test.describe('cadastro', () => {
  test('cria a conta e mostra "Enviamos um e-mail para X. Abra o link para confirmar sua conta."', async ({
    page,
  }) => {
    const email = newEmail();
    await page.goto('/cadastro');

    await fillSignUp(page, email);
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(
      page.getByRole('heading', { name: 'Confira seu e-mail' }),
    ).toBeVisible();
    await expect(
      page.getByText(
        `Enviamos um e-mail para ${email}. Abra o link para confirmar sua conta.`,
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByLabel('Senha', { exact: true })).toHaveCount(0);
  });

  test('mostra a mesma tela para um e-mail já cadastrado', async ({ page }) => {
    const email = newEmail();
    await page.goto('/cadastro');
    await fillSignUp(page, email);
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(
      page.getByRole('heading', { name: 'Confira seu e-mail' }),
    ).toBeVisible();

    await page.goto('/cadastro');
    await fillSignUp(page, email.toUpperCase());
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(
      page.getByRole('heading', { name: 'Confira seu e-mail' }),
    ).toBeVisible();
    await expect(
      page.getByText(
        `Enviamos um e-mail para ${email}. Abra o link para confirmar sua conta.`,
        { exact: true },
      ),
    ).toBeVisible();
  });

  test('mostra o erro do campo para senha com menos de 8 caracteres', async ({
    page,
  }) => {
    await page.goto('/cadastro');

    await fillSignUp(page, newEmail(), '1234567');
    await page.getByRole('button', { name: 'Criar conta' }).click();

    const password = page.getByLabel('Senha', { exact: true });
    await expect(password).toHaveAttribute('aria-invalid', 'true');
    await expect(password).toHaveAccessibleDescription(
      /A senha precisa ter pelo menos 8 caracteres\./,
    );
    await expect(
      page.getByRole('heading', { name: 'Confira seu e-mail' }),
    ).toHaveCount(0);

    await password.fill('12345678');

    await expect(
      page.getByText('A senha precisa ter pelo menos 8 caracteres.'),
    ).toHaveCount(0);
    await expect(password).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('a caixa de termos tem links para /termos e /privacidade', async ({
    page,
  }) => {
    await page.goto('/cadastro');

    const terms = page.getByRole('link', { name: 'Termos de uso' });
    const privacy = page.getByRole('link', { name: 'Política de privacidade' });
    await expect(terms).toHaveAttribute('href', '/termos');
    await expect(terms).toHaveAttribute('target', '_blank');
    await expect(privacy).toHaveAttribute('href', '/privacidade');
    await expect(privacy).toHaveAttribute('target', '_blank');
    await expect(
      page.getByRole('checkbox', { name: /Li e aceito/ }),
    ).not.toBeChecked();
  });

  test('leva a pessoa logada que abre /cadastro direto ao destino', async ({
    page,
  }) => {
    const email = newEmail();
    await registerAccount(page.request, email);
    await signIn(page.request, email);

    await page.goto('/cadastro?next=%2Fconvite%2Fabc');
    await expect(page).toHaveURL('/convite/abc');

    await page.goto('/cadastro');
    await expect(page).toHaveURL('/grupos');
  });
});
