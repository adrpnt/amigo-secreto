import { randomUUID } from 'node:crypto';
import type { GroupDetail, GroupInput } from '@amigo-secreto/shared';
import type { APIRequestContext, Page } from '@playwright/test';
import {
  PASSWORD,
  csrfToken,
  registerAccount,
  signIn,
} from './support/account';
import { expect, test } from './support/fixtures';

// Datas no ano que vem, no formato do campo datetime-local.
const NEXT_YEAR = new Date().getFullYear() + 1;
const DRAW_INPUT = `${NEXT_YEAR}-12-10T20:00`;
const EVENT_INPUT = `${NEXT_YEAR}-12-20T19:00`;

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

async function fetchGroup(page: Page, id: string): Promise<GroupDetail> {
  const response = await page.request.get(`/api/groups/${id}`);
  expect(response.status()).toBe(200);
  return (await response.json()) as GroupDetail;
}

function groupIdFrom(page: Page): string {
  return new URL(page.url()).pathname.split('/')[2] ?? '';
}

const GROUP_URL = /\/grupos\/[0-9a-f-]{36}$/;

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

  test('cria um grupo só com o nome a partir de Meus grupos e abre a página dele', async ({
    page,
  }) => {
    await signedInAs(page);
    const name = `Família ${randomUUID().slice(0, 8)}`;

    await page.goto('/grupos');
    await page.getByRole('link', { name: 'Criar grupo' }).click();
    await expect(page).toHaveURL('/grupos/novo');
    await page.getByLabel('Nome do grupo').fill(name);
    await page.getByRole('button', { name: 'Criar grupo' }).click();

    await expect(page).toHaveURL(GROUP_URL);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expect(page.getByText('ABERTO')).toBeVisible();
    await expect(page.getByText('Organizado por Ana Souza')).toBeVisible();
    await expect(page.getByText('Entrada com aprovação')).toHaveCount(0);
    await expect(page.getByText('Evento online')).toHaveCount(0);
    const group = await fetchGroup(page, groupIdFrom(page));
    expect(group).toMatchObject({
      name,
      status: 'OPEN',
      isOrganizer: true,
      isOnlineEvent: false,
      requiresApproval: false,
    });
  });

  test('cria um grupo com todos os campos e mostra cada um na página', async ({
    page,
  }) => {
    await signedInAs(page);
    const name = `Família ${randomUUID().slice(0, 8)}`;

    await page.goto('/grupos/novo');
    await page.getByLabel('Nome do grupo').fill(name);
    await page
      .getByLabel('Recado para os participantes')
      .fill('Tragam algo feito à mão!\nNada de vale-presente.');
    await page.getByLabel('Valor do presente (R$)').fill('50');
    await page.getByLabel('Até (R$)').fill('100');
    await page.getByLabel('Sorteio previsto').fill(DRAW_INPUT);
    await page.getByLabel('Confraternização').fill(EVENT_INPUT);
    await page.getByLabel('Local').fill('Casa da vó');
    await page.getByRole('checkbox', { name: 'Evento online' }).check();
    await page
      .getByRole('checkbox', { name: 'Exigir aprovação para entrar' })
      .check();
    await page.getByRole('button', { name: 'Criar grupo' }).click();

    await expect(page).toHaveURL(GROUP_URL);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expect(page.getByText('Organizado por Ana Souza')).toBeVisible();
    await expect(
      page.getByText('Tragam algo feito à mão! Nada de vale-presente.'),
    ).toBeVisible();
    await expect(page.getByText('R$ 50 a R$ 100')).toBeVisible();
    await expect(page.getByText(`10/12/${NEXT_YEAR} às 20:00`)).toBeVisible();
    await expect(page.getByText(`20/12/${NEXT_YEAR} às 19:00`)).toBeVisible();
    await expect(page.getByText('Casa da vó')).toBeVisible();
    await expect(page.getByText('Evento online')).toBeVisible();
    await expect(page.getByText('Entrada com aprovação')).toBeVisible();
    const group = await fetchGroup(page, groupIdFrom(page));
    expect(group).toMatchObject({
      name,
      description: 'Tragam algo feito à mão!\nNada de vale-presente.',
      giftMinValue: 50,
      giftMaxValue: 100,
      drawScheduledAt: `${NEXT_YEAR}-12-10T23:00:00.000Z`,
      eventAt: `${NEXT_YEAR}-12-20T22:00:00.000Z`,
      eventLocation: 'Casa da vó',
      isOnlineEvent: true,
      requiresApproval: true,
    });
  });

  test('mostra o erro do campo ao enviar sorteio depois da confraternização', async ({
    page,
  }) => {
    await signedInAs(page);

    await page.goto('/grupos/novo');
    await page.getByLabel('Nome do grupo').fill('Família Souza');
    await page.getByLabel('Sorteio previsto').fill(EVENT_INPUT);
    await page.getByLabel('Confraternização').fill(DRAW_INPUT);
    await page.getByRole('button', { name: 'Criar grupo' }).click();

    await expect(
      page.getByText(
        'O sorteio previsto precisa ser antes da confraternização.',
      ),
    ).toBeVisible();
    await expect(page).toHaveURL('/grupos/novo');
    const response = await page.request.get('/api/groups');
    expect(await response.json()).toEqual({ active: [], closed: [] });
  });

  test('leva a /entrar e volta a /grupos/novo depois do login', async ({
    page,
    request,
  }) => {
    const email = newEmail();
    await registerAccount(request, email);

    await page.goto('/grupos/novo');
    await expect(page).toHaveURL('/entrar?next=%2Fgrupos%2Fnovo');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();

    await expect(page).toHaveURL('/grupos/novo');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Novo grupo' }),
    ).toBeVisible();
  });

  test('edita o valor para uma faixa e apaga o local', async ({ page }) => {
    await signedInAs(page);
    const name = `Família ${randomUUID().slice(0, 8)}`;
    const created = await createGroup(page.request, {
      name,
      giftMinValue: 50,
      eventLocation: 'Casa da vó',
    });

    await page.goto(`/grupos/${created.id}`);
    await page.getByRole('link', { name: 'Editar grupo' }).click();
    await expect(page).toHaveURL(`/grupos/${created.id}/editar`);
    await expect(page.getByLabel('Nome do grupo')).toHaveValue(name);
    await expect(page.getByLabel('Valor do presente (R$)')).toHaveValue('50');
    await expect(page.getByLabel('Local')).toHaveValue('Casa da vó');
    await page.getByLabel('Até (R$)').fill('100');
    await page.getByLabel('Local').fill('');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();

    await expect(page).toHaveURL(`/grupos/${created.id}`);
    await expect(page.getByText('R$ 50 a R$ 100')).toBeVisible();
    await expect(page.getByText('Casa da vó')).toHaveCount(0);
    await expect(page.getByText('Local', { exact: true })).toHaveCount(0);
    const group = await fetchGroup(page, created.id);
    expect(group).toMatchObject({
      name,
      giftMinValue: 50,
      giftMaxValue: 100,
      eventLocation: null,
    });
  });
});

test.describe('navegação', () => {
  test('entrar sem origem leva a /grupos', async ({ page, request }) => {
    const email = newEmail();
    await registerAccount(request, email);

    await page.goto('/entrar');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();

    await expect(page).toHaveURL('/grupos');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Meus grupos' }),
    ).toBeVisible();
  });

  test('menu do avatar mostra Meus grupos, Perfil e Sair e leva a /grupos', async ({
    page,
  }) => {
    await signedInAs(page);
    await page.goto('/perfil');

    await page
      .getByRole('banner')
      .getByRole('button', { name: 'Menu da conta' })
      .click();
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem')).toHaveText([
      'Meus grupos',
      'Perfil',
      'Sair',
    ]);
    await menu.getByRole('menuitem', { name: 'Meus grupos' }).click();

    await expect(page).toHaveURL('/grupos');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Meus grupos' }),
    ).toBeVisible();
  });

  test('logado em / vai para /grupos', async ({ page }) => {
    await signedInAs(page);

    await page.goto('/');

    await expect(page).toHaveURL('/grupos');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Meus grupos' }),
    ).toBeVisible();
  });

  test('sem sessão / continua mostrando a página atual', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Amigo Secreto' }),
    ).toBeVisible();
    await expect(page.getByText('API online', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Entrar' }),
    ).toBeVisible();
  });
});
