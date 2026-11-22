import { randomUUID } from 'node:crypto';
import type { GroupDetail, GroupInput } from '@amigo-secreto/shared';
import type { APIRequestContext, Page } from '@playwright/test';
import { csrfToken, registerAccount, signIn } from './support/account';
import { expect, test } from './support/fixtures';

function newEmail(): string {
  return `grupos-${randomUUID()}@example.com`;
}

// Conta "Ana Souza" com a sessão aberta no navegador da página.
async function signedInAs(page: Page): Promise<string> {
  const email = newEmail();
  await registerAccount(page.request, email);
  await signIn(page.request, email);
  return email;
}

// Cria um grupo pela API com a sessão de `request`; só o nome é obrigatório.
async function createGroup(
  request: APIRequestContext,
  input: Partial<GroupInput> & { name: string },
): Promise<GroupDetail> {
  const response = await request.post('/api/groups', {
    headers: { 'X-CSRF-Token': await csrfToken(request) },
    data: input,
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as GroupDetail;
}

test.describe('grupos', () => {
  test('lista o grupo criado em Ativos com Você organiza', async ({ page }) => {
    await signedInAs(page);
    const name = `Família ${randomUUID().slice(0, 8)}`;
    await createGroup(page.request, { name });

    await page.goto('/grupos');

    const active = page.getByRole('region', { name: 'Ativos' });
    const card = active.getByRole('link', { name: new RegExp(name) });
    await expect(card).toBeVisible();
    await expect(card.getByText('ABERTO')).toBeVisible();
    await expect(card.getByText('1 participante')).toBeVisible();
    await expect(card.getByText('Você organiza')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Encerrados' })).toHaveCount(
      0,
    );
  });

  test('mostra o estado vazio para quem não participa de nenhum grupo', async ({
    page,
  }) => {
    await signedInAs(page);

    await page.goto('/grupos');

    await expect(
      page.getByText('Você ainda não participa de nenhum grupo.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Criar grupo' })).toHaveCount(
      1,
    );
    await expect(page.getByRole('region', { name: 'Ativos' })).toHaveCount(0);
  });

  test('o card leva à página do grupo', async ({ page }) => {
    await signedInAs(page);
    const name = `Firma ${randomUUID().slice(0, 8)}`;
    const group = await createGroup(page.request, { name });

    await page.goto('/grupos');
    await page.getByRole('link', { name: new RegExp(name) }).click();

    await expect(page).toHaveURL(`/grupos/${group.id}`);
  });

  test('mostra Grupo não encontrado. para quem não participa e para id inexistente', async ({
    page,
    request,
  }) => {
    const ownerEmail = newEmail();
    await registerAccount(request, ownerEmail);
    await signIn(request, ownerEmail);
    const othersGroup = await createGroup(request, { name: 'Firma da Bia' });
    await signedInAs(page);

    for (const path of [
      `/grupos/${othersGroup.id}`,
      `/grupos/${randomUUID()}`,
      '/grupos/nao-e-uuid',
    ]) {
      await page.goto(path);

      await expect(
        page.getByRole('heading', { level: 1, name: 'Grupo não encontrado.' }),
      ).toBeVisible();
      await expect(page.getByText('Firma da Bia')).toHaveCount(0);
      await page.getByRole('link', { name: 'Meus grupos' }).click();
      await expect(page).toHaveURL('/grupos');
    }
  });

  test('exclui o grupo depois de confirmar e ele some de Meus grupos', async ({
    page,
  }) => {
    await signedInAs(page);
    const name = `Família ${randomUUID().slice(0, 8)}`;
    const group = await createGroup(page.request, { name });

    await page.goto(`/grupos/${group.id}`);
    await page.getByRole('button', { name: 'Excluir grupo' }).click();
    const dialog = page.getByRole('dialog', {
      name: `Excluir o grupo ${name}?`,
    });
    await dialog.getByRole('button', { name: 'Excluir grupo' }).click();

    await expect(page).toHaveURL('/grupos');
    await expect(
      page.getByText('Você ainda não participa de nenhum grupo.'),
    ).toBeVisible();
    await expect(page.getByText(name)).toHaveCount(0);
    const response = await page.request.get(`/api/groups/${group.id}`);
    expect(response.status()).toBe(404);
  });

  test('Manter grupo fecha a confirmação sem excluir', async ({ page }) => {
    await signedInAs(page);
    const name = `Família ${randomUUID().slice(0, 8)}`;
    const group = await createGroup(page.request, { name });

    await page.goto(`/grupos/${group.id}`);
    await page.getByRole('button', { name: 'Excluir grupo' }).click();
    const dialog = page.getByRole('dialog', {
      name: `Excluir o grupo ${name}?`,
    });
    await dialog.getByRole('button', { name: 'Manter grupo' }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(`/grupos/${group.id}`);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    const response = await page.request.get(`/api/groups/${group.id}`);
    expect(response.status()).toBe(200);
  });
});
