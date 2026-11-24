import { randomInt, randomUUID } from 'node:crypto';
import type {
  GroupDetail,
  GroupInput,
  JoinResult,
} from '@amigo-secreto/shared';
import {
  type APIRequestContext,
  type Locator,
  type Page,
  request as playwrightRequest,
} from '@playwright/test';
import { PASSWORD, csrfToken, signIn } from './support/account';
import { expect, lastEmailTo, test } from './support/fixtures';

const ORGANIZER = 'Ana Souza';

function newEmail(): string {
  return `participantes-${randomUUID()}@example.com`;
}

function groupName(): string {
  return `Família ${randomUUID().slice(0, 8)}`;
}

function randomIp(): string {
  return `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
}

// Cria a conta com o nome dado e abre a sessão no contexto de `request`.
async function signUpAs(
  request: APIRequestContext,
  name: string,
): Promise<void> {
  const email = newEmail();
  const response = await request.post('/api/auth/register', {
    headers: { 'X-CSRF-Token': await csrfToken(request) },
    data: { name, email, password: PASSWORD, acceptTerms: true },
  });
  expect(response.status()).toBe(202);
  await signIn(request, email);
}

// Outra pessoa, com sessão e IP próprios: os limites de cadastro e de convite
// por IP não somam com os do navegador do teste.
async function person(
  baseURL: string | undefined,
  name: string,
): Promise<APIRequestContext> {
  const request = await playwrightRequest.newContext({
    baseURL,
    extraHTTPHeaders: { 'X-Forwarded-For': randomIp() },
  });
  await signUpAs(request, name);
  return request;
}

async function createGroup(
  request: APIRequestContext,
  input: Partial<GroupInput> = {},
): Promise<GroupDetail> {
  const response = await request.post('/api/groups', {
    headers: { 'X-CSRF-Token': await csrfToken(request) },
    data: { name: groupName(), ...input },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as GroupDetail;
}

async function join(
  request: APIRequestContext,
  inviteCode: string,
): Promise<JoinResult> {
  const response = await request.post(`/api/invites/${inviteCode}/join`, {
    headers: { 'X-CSRF-Token': await csrfToken(request) },
  });
  expect(response.status()).toBe(200);
  return (await response.json()) as JoinResult;
}

// Grupo de "Ana Souza", que fica com a sessão aberta no navegador.
async function organizerGroup(
  page: Page,
  input: Partial<GroupInput> = {},
): Promise<GroupDetail> {
  await signUpAs(page.request, ORGANIZER);
  return createGroup(page.request, input);
}

function participantsPath(group: GroupDetail): string {
  return `/grupos/${group.id}/participantes`;
}

function row(page: Page, name: string): Locator {
  return page
    .getByRole('main')
    .getByRole('listitem')
    .filter({ has: page.getByText(name, { exact: true }) });
}

test.describe('participantes', () => {
  test('mostra o bloco de convite e a lista com o total', async ({
    page,
    baseURL,
  }) => {
    const group = await organizerGroup(page);
    const bruno = await person(baseURL, 'Bruno Lima');
    await join(bruno, group.inviteCode);

    await page.goto(participantsPath(group));

    const invite = page.getByRole('region', { name: 'Convide a turma' });
    await expect(
      invite.getByRole('textbox', { name: 'Link de convite' }),
    ).toHaveValue(`${baseURL}/convite/${group.inviteCode}`);
    await expect(
      invite.getByRole('button', { name: 'Copiar link' }),
    ).toBeVisible();
    await expect(
      invite.getByRole('link', { name: 'Compartilhar no WhatsApp' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: '2 participantes' }),
    ).toBeVisible();
    const names = page.getByRole('main').getByRole('listitem');
    await expect(names).toHaveCount(2);
    await expect(names.nth(0)).toContainText(ORGANIZER);
    await expect(names.nth(0)).toContainText('Organiza');
    await expect(names.nth(1)).toContainText('Bruno Lima');
    await expect(names.filter({ hasText: '@' })).toHaveCount(0);
  });

  test('participante comum vê o link sem Gerar novo link nem Convidar por e-mail', async ({
    page,
    baseURL,
  }) => {
    const ana = await person(baseURL, ORGANIZER);
    const group = await createGroup(ana);
    await signUpAs(page.request, 'Bruno Lima');
    await join(page.request, group.inviteCode);

    await page.goto(participantsPath(group));

    const invite = page.getByRole('region', { name: 'Convide a turma' });
    await expect(
      invite.getByRole('textbox', { name: 'Link de convite' }),
    ).toHaveValue(`${baseURL}/convite/${group.inviteCode}`);
    await expect(
      invite.getByRole('link', { name: 'Compartilhar no WhatsApp' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Gerar novo link' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Convidar por e-mail' }),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Ações para/ })).toHaveCount(
      0,
    );
  });

  test('organizador aprova um pedido e recusa outro, e aprova o recusado depois', async ({
    page,
    baseURL,
  }) => {
    const group = await organizerGroup(page, { requiresApproval: true });
    for (const name of ['Bruno Lima', 'Carla Dias']) {
      const result = await join(await person(baseURL, name), group.inviteCode);
      expect(result.status).toBe('PENDING');
    }

    await page.goto(participantsPath(group));
    await expect(row(page, 'Bruno Lima')).toContainText('Pendente');
    await expect(row(page, 'Carla Dias')).toContainText('Pendente');
    await expect(
      page.getByRole('heading', { level: 2, name: '1 participante' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Aprovar Bruno Lima' }).click();
    await expect(
      page.getByRole('heading', { level: 2, name: '2 participantes' }),
    ).toBeVisible();
    await expect(row(page, 'Bruno Lima')).not.toContainText('Pendente');

    await page.getByRole('button', { name: 'Recusar Carla Dias' }).click();
    await expect(row(page, 'Carla Dias')).toContainText('Recusado');
    await expect(
      page.getByRole('button', { name: 'Recusar Carla Dias' }),
    ).toHaveCount(0);

    await page.getByRole('button', { name: 'Aprovar Carla Dias' }).click();
    await expect(
      page.getByRole('heading', { level: 2, name: '3 participantes' }),
    ).toBeVisible();
    await expect(row(page, 'Carla Dias')).not.toContainText('Recusado');
  });

  test('organizador remove participante, que não entra de novo pelo link', async ({
    page,
    baseURL,
  }) => {
    const group = await organizerGroup(page);
    const bruno = await person(baseURL, 'Bruno Lima');
    await join(bruno, group.inviteCode);

    await page.goto(participantsPath(group));
    await page.getByRole('button', { name: 'Ações para Bruno Lima' }).click();
    await page.getByRole('menuitem', { name: 'Remover do grupo' }).click();
    const dialog = page.getByRole('dialog', {
      name: 'Remover Bruno Lima do grupo?',
    });
    await expect(
      dialog.getByText('Bruno Lima sai do grupo e só volta se você aprovar.'),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Remover do grupo' }).click();

    await expect(row(page, 'Bruno Lima')).toContainText('Recusado');
    await expect(
      page.getByRole('heading', { level: 2, name: '1 participante' }),
    ).toBeVisible();

    const again = await join(bruno, group.inviteCode);
    expect(again).toEqual({ status: 'REJECTED', groupId: null });
    expect((await bruno.get(`/api/groups/${group.id}`)).status()).toBe(404);
  });

  test('organizador transfere a organização e passa a ver o grupo como participante', async ({
    page,
    baseURL,
  }) => {
    const group = await organizerGroup(page);
    const bruno = await person(baseURL, 'Bruno Lima');
    await join(bruno, group.inviteCode);

    await page.goto(participantsPath(group));
    await page.getByRole('button', { name: 'Ações para Bruno Lima' }).click();
    await page
      .getByRole('menuitem', { name: 'Transferir organização' })
      .click();
    const dialog = page.getByRole('dialog', {
      name: 'Passar a organização para Bruno Lima?',
    });
    await dialog
      .getByRole('button', { name: 'Transferir organização' })
      .click();

    await expect(page.getByText('Organizado por Bruno Lima')).toBeVisible();
    await expect(row(page, 'Bruno Lima')).toContainText('Organiza');
    await expect(page.getByRole('button', { name: /^Ações para/ })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole('button', { name: 'Gerar novo link' }),
    ).toHaveCount(0);
    const asBruno = await bruno.get(`/api/groups/${group.id}`);
    expect(((await asBruno.json()) as GroupDetail).isOrganizer).toBe(true);
  });

  test('gerar novo link barra o link antigo', async ({ page, baseURL }) => {
    const group = await organizerGroup(page);
    const oldLink = `${baseURL}/convite/${group.inviteCode}`;

    await page.goto(participantsPath(group));
    const field = page.getByRole('textbox', { name: 'Link de convite' });
    await expect(field).toHaveValue(oldLink);
    await page.getByRole('button', { name: 'Gerar novo link' }).click();
    const dialog = page.getByRole('dialog', { name: 'Gerar um novo link?' });
    await dialog.getByRole('button', { name: 'Gerar novo link' }).click();

    await expect(page.getByRole('status')).toHaveText('Novo link gerado');
    await expect(field).not.toHaveValue(oldLink);
    const newLink = await field.inputValue();
    expect(newLink).toMatch(
      new RegExp(`^${baseURL}/convite/[23456789a-hjkmnp-z]{10}$`),
    );

    await page.goto(oldLink);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Convite não encontrado' }),
    ).toBeVisible();
    await page.goto(newLink);
    await expect(page).toHaveURL(`/grupos/${group.id}`);
  });

  test('convida por e-mail e o convite chega com o link do grupo', async ({
    page,
    baseURL,
  }) => {
    const group = await organizerGroup(page);
    const guest = newEmail();

    await page.goto(participantsPath(group));
    await page.getByRole('button', { name: 'Convidar por e-mail' }).click();
    await page.getByLabel('E-mails', { exact: true }).fill(guest);
    await page.getByRole('button', { name: 'Enviar convites' }).click();

    await expect(
      page.getByText('Convite enviado para 1 e-mail.'),
    ).toBeVisible();
    const email = await lastEmailTo(guest);
    expect(email.text).toContain(`${baseURL}/convite/${group.inviteCode}`);
  });

  test('Carregar mais traz os participantes seguintes e a busca ignora acentos', async ({
    page,
    baseURL,
  }) => {
    const group = await organizerGroup(page);
    const members = [
      'João Ávila',
      ...Array.from(
        { length: 20 },
        (_, index) => `Membro ${String(index + 1).padStart(2, '0')}`,
      ),
    ];
    for (const name of members) {
      await join(await person(baseURL, name), group.inviteCode);
    }

    await page.goto(participantsPath(group));
    const items = page.getByRole('main').getByRole('listitem');
    await expect(
      page.getByRole('heading', { level: 2, name: '22 participantes' }),
    ).toBeVisible();
    await expect(items).toHaveCount(20);
    await expect(items.nth(0)).toContainText(ORGANIZER);
    await expect(items.nth(1)).toContainText('João Ávila');
    await expect(items.nth(19)).toContainText('Membro 18');

    await page.getByRole('button', { name: 'Carregar mais' }).click();
    await expect(items).toHaveCount(22);
    await expect(items.nth(20)).toContainText('Membro 19');
    await expect(items.nth(21)).toContainText('Membro 20');
    await expect(
      page.getByRole('button', { name: 'Carregar mais' }),
    ).toHaveCount(0);

    await page.getByLabel('Buscar participante').fill('joao avila');
    await expect(items).toHaveCount(1);
    await expect(items.nth(0)).toContainText('João Ávila');
  });

  test('Meus grupos mostra N pendentes a quem organiza', async ({
    page,
    baseURL,
  }) => {
    const group = await organizerGroup(page, { requiresApproval: true });
    for (const name of ['Bruno Lima', 'Carla Dias']) {
      await join(await person(baseURL, name), group.inviteCode);
    }

    await page.goto('/grupos');

    const card = page
      .getByRole('region', { name: 'Ativos' })
      .getByRole('link', { name: new RegExp(group.name) });
    await expect(card.getByText('1 participante, 2 pendentes')).toBeVisible();
  });

  test('pessoa pendente abre o grupo e a aba Participantes e vê Grupo não encontrado.', async ({
    page,
    baseURL,
  }) => {
    const ana = await person(baseURL, ORGANIZER);
    const group = await createGroup(ana, {
      name: `Firma ${randomUUID().slice(0, 8)}`,
      requiresApproval: true,
    });
    await signUpAs(page.request, 'Bruno Lima');
    expect((await join(page.request, group.inviteCode)).status).toBe('PENDING');

    for (const path of [`/grupos/${group.id}`, participantsPath(group)]) {
      await page.goto(path);

      await expect(
        page.getByRole('heading', { level: 1, name: 'Grupo não encontrado.' }),
      ).toBeVisible();
      await expect(page.getByText(group.name)).toHaveCount(0);
      await expect(
        page.getByRole('navigation', { name: 'Seções do grupo' }),
      ).toHaveCount(0);
    }
  });
});
