import { randomInt, randomUUID } from 'node:crypto';
import type { GroupDetail, GroupInput } from '@amigo-secreto/shared';
import {
  type APIRequestContext,
  type Page,
  request as playwrightRequest,
} from '@playwright/test';
import { PASSWORD, csrfToken, signIn } from './support/account';
import { expect, test } from './support/fixtures';

const ORGANIZER = 'Ana Souza';

function newEmail(): string {
  return `sorteio-${randomUUID()}@example.com`;
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

// Outra pessoa, com sessão e IP próprios: os limites de cadastro por IP não
// somam com os do navegador do teste.
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
): Promise<void> {
  const response = await request.post(`/api/invites/${inviteCode}/join`, {
    headers: { 'X-CSRF-Token': await csrfToken(request) },
  });
  expect(response.status()).toBe(200);
}

function drawPath(group: GroupDetail): string {
  return `/grupos/${group.id}/sorteio`;
}

function tabs(page: Page) {
  return page.getByRole('navigation', { name: 'Seções do grupo' });
}

test.describe('sorteio', () => {
  test('a aba Sorteio aparece em Grupo, Participantes e Sorteio', async ({
    page,
  }) => {
    await signUpAs(page.request, ORGANIZER);
    const group = await createGroup(page.request);

    for (const path of [
      `/grupos/${group.id}`,
      `/grupos/${group.id}/participantes`,
      drawPath(group),
    ]) {
      await page.goto(path);

      const links = tabs(page).getByRole('link');
      await expect(links).toHaveText(['Grupo', 'Participantes', 'Sorteio']);
      await expect(
        tabs(page).getByRole('link', { name: 'Sorteio' }),
      ).toHaveAttribute('href', drawPath(group));
    }

    await page.goto(`/grupos/${group.id}`);
    await tabs(page).getByRole('link', { name: 'Sorteio' }).click();
    await expect(page).toHaveURL(drawPath(group));
    await expect(
      tabs(page).getByRole('link', { name: 'Sorteio' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('participante vê a aba Sorteio e o aviso de que o sorteio não foi feito', async ({
    page,
    baseURL,
  }) => {
    const ana = await person(baseURL, ORGANIZER);
    const group = await createGroup(ana);
    await signUpAs(page.request, 'Bruno Lima');
    await join(page.request, group.inviteCode);

    await page.goto(drawPath(group));

    await expect(
      page.getByRole('heading', { level: 1, name: group.name }),
    ).toBeVisible();
    await expect(
      tabs(page).getByRole('link', { name: 'Sorteio' }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(page).toHaveTitle(`Sorteio · ${group.name} · Amigo Secreto`);
    await expect(
      page
        .getByRole('main')
        .getByText(
          'O sorteio ainda não foi feito. Você recebe um e-mail quando Ana Souza sortear.',
        ),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sortear' })).toHaveCount(0);
    await expect(page.getByText('Quem não tira quem')).toHaveCount(0);
  });

  test('sem sessão leva a entrar com a aba como destino', async ({ page }) => {
    const path = `/grupos/${randomUUID()}/sorteio`;

    await page.goto(path);

    await expect(page).toHaveURL(`/entrar?next=${encodeURIComponent(path)}`);
  });

  test('pessoa de fora vê Grupo não encontrado. sem as abas', async ({
    page,
    baseURL,
  }) => {
    const ana = await person(baseURL, ORGANIZER);
    const group = await createGroup(ana);
    await signUpAs(page.request, 'Carla Dias');

    for (const path of [drawPath(group), `/grupos/${randomUUID()}/sorteio`]) {
      await page.goto(path);

      await expect(
        page.getByRole('heading', { level: 1, name: 'Grupo não encontrado.' }),
      ).toBeVisible();
      await expect(page.getByText(group.name)).toHaveCount(0);
      await expect(tabs(page)).toHaveCount(0);
    }
  });
});
