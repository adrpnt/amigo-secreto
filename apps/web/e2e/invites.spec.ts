import { randomUUID } from 'node:crypto';
import type { GroupDetail, GroupInput } from '@amigo-secreto/shared';
import type { APIRequestContext, Page } from '@playwright/test';
import {
  PASSWORD,
  confirmationLinkTo,
  csrfToken,
  registerAccount,
  signIn,
} from './support/account';
import { expect, test } from './support/fixtures';

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const ORGANIZER = 'Ana Souza';
const SIGN_IN_TEXT = 'Para entrar no grupo, entre na sua conta ou crie uma.';

function newEmail(): string {
  return `convite-${randomUUID()}@example.com`;
}

function groupName(): string {
  return `Família ${randomUUID().slice(0, 8)}`;
}

// Abre a sessão de uma conta nova "Ana Souza" no contexto de `request`.
async function signedIn(request: APIRequestContext): Promise<void> {
  const email = newEmail();
  await registerAccount(request, email);
  await signIn(request, email);
}

// Cria um grupo pela API com a sessão de `request`.
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

// Grupo de outra pessoa, criado pelo `request` do teste, que tem a própria
// sessão, separada da do navegador.
async function someoneElsesGroup(
  request: APIRequestContext,
  input: Partial<GroupInput> = {},
): Promise<GroupDetail> {
  await signedIn(request);
  return createGroup(request, { name: groupName(), ...input });
}

async function expectInvite(page: Page, group: GroupDetail): Promise<void> {
  await expect(
    page.getByRole('heading', { level: 1, name: group.name }),
  ).toBeVisible();
  await expect(page.getByText(`Organizado por ${ORGANIZER}`)).toBeVisible();
}

function metaContent(html: string, property: string): string | undefined {
  const pattern = new RegExp(`<meta property="${property}" content="([^"]*)"`);
  return pattern.exec(html)?.[1];
}

test.describe('convite', () => {
  test('a imagem do preview é um PNG de 1200 x 630', async ({ request }) => {
    const response = await request.get('/og/convite.png');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
    const body = await response.body();
    expect(body.subarray(0, 8)).toEqual(PNG_SIGNATURE);
    // O cabeçalho IHDR guarda largura e altura nos bytes 16 a 23.
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
  });

  test('sem sessão mostra o grupo, cria conta e volta ao convite', async ({
    page,
    request,
  }) => {
    const group = await someoneElsesGroup(request);
    const invitePath = `/convite/${group.inviteCode}`;
    const next = encodeURIComponent(invitePath);

    await page.goto(invitePath);

    await expectInvite(page, group);
    await expect(page.getByText(SIGN_IN_TEXT)).toBeVisible();
    const main = page.getByRole('main');
    await expect(main.getByRole('link', { name: 'Entrar' })).toHaveAttribute(
      'href',
      `/entrar?next=${next}`,
    );

    await main.getByRole('link', { name: 'Criar conta' }).click();
    await expect(page).toHaveURL(`/cadastro?next=${next}`);

    const email = newEmail();
    await page.getByLabel('Nome', { exact: true }).fill('Bia Souza');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
    await page.getByRole('checkbox', { name: /Li e aceito/ }).check();
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(
      page.getByRole('heading', { name: 'Confira seu e-mail' }),
    ).toBeVisible();

    await page.goto(await confirmationLinkTo(email));

    await expect(page).toHaveURL(invitePath);
    await expectInvite(page, group);
    await expect(
      page.getByRole('button', { name: 'Entrar no grupo' }),
    ).toBeVisible();
  });

  test('cria conta com Google pelo convite e volta ao convite', async ({
    page,
    request,
  }) => {
    const group = await someoneElsesGroup(request);
    const invitePath = `/convite/${group.inviteCode}`;

    await page.goto(invitePath);
    await page
      .getByRole('main')
      .getByRole('link', { name: 'Criar conta' })
      .click();
    await page.getByRole('link', { name: 'Entrar com Google' }).click();
    await page
      .getByRole('link', { name: 'Verificada nova', exact: true })
      .click();

    await expect(page).toHaveURL('/completar-cadastro');
    await page.getByRole('checkbox', { name: /Li e aceito/ }).check();
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page).toHaveURL(invitePath);
    await expectInvite(page, group);
    await expect(
      page.getByRole('button', { name: 'Entrar no grupo' }),
    ).toBeVisible();
  });

  test('entra no grupo sem aprovação e cai na página do grupo', async ({
    page,
    request,
  }) => {
    const group = await someoneElsesGroup(request);
    await signedIn(page.request);

    await page.goto(`/convite/${group.inviteCode}`);
    await page.getByRole('button', { name: 'Entrar no grupo' }).click();

    await expect(page).toHaveURL(`/grupos/${group.id}`);
    await expect(
      page.getByRole('heading', { level: 1, name: group.name }),
    ).toBeVisible();
  });

  test('pede para entrar com aprovação, vê o aviso do pedido e o card em Meus grupos', async ({
    page,
    request,
  }) => {
    const group = await someoneElsesGroup(request, { requiresApproval: true });
    await signedIn(page.request);

    await page.goto(`/convite/${group.inviteCode}`);
    await expect(
      page.getByText('Quem organiza precisa aprovar sua entrada.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Pedir para entrar' }).click();

    const main = page.getByRole('main');
    await expect(
      main.getByText(`Seu pedido está aguardando a aprovação de ${ORGANIZER}.`),
    ).toBeVisible();
    await expect(main.getByRole('button')).toHaveCount(0);
    await expect(page).toHaveURL(`/convite/${group.inviteCode}`);

    await page.goto('/grupos');
    const active = page.getByRole('region', { name: 'Ativos' });
    const card = active
      .getByRole('heading', { level: 3, name: group.name })
      .locator('..');
    await expect(card.getByText(`Organizado por ${ORGANIZER}`)).toBeVisible();
    await expect(card.getByText('Aguardando aprovação')).toBeVisible();
  });

  test('participante aprovado vai direto para o grupo', async ({ page }) => {
    await signedIn(page.request);
    const group = await createGroup(page.request, { name: groupName() });

    await page.goto(`/convite/${group.inviteCode}`);

    await expect(page).toHaveURL(`/grupos/${group.id}`);
  });

  test('código inexistente mostra Convite não encontrado', async ({ page }) => {
    await page.goto('/convite/zzzzzzzzzz');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Convite não encontrado' }),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Este link de convite não vale mais. Peça um link novo a quem organiza o grupo.',
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Ir para o início' }),
    ).toHaveAttribute('href', '/');
  });

  test('aceita o código em maiúsculas', async ({ page, request }) => {
    const group = await someoneElsesGroup(request);

    await page.goto(`/convite/${group.inviteCode.toUpperCase()}`);

    await expectInvite(page, group);
    await expect(page.getByText(SIGN_IN_TEXT)).toBeVisible();
  });

  test('as meta tags trazem o título, a descrição e a imagem do grupo', async ({
    page,
    request,
    baseURL,
  }) => {
    const group = await someoneElsesGroup(request);

    // Com o User-Agent do WhatsApp, o Next põe as meta tags no <head> do HTML.
    const response = await page.request.get(`/convite/${group.inviteCode}`, {
      headers: { 'User-Agent': 'WhatsApp/2.23.20.0' },
    });
    expect(response.status()).toBe(200);
    const html = await response.text();

    const title = `Convite: ${group.name}`;
    const description = `${ORGANIZER} convidou você para o amigo secreto.`;
    expect(html).toContain(`<title>${title}</title>`);
    expect(metaContent(html, 'og:title')).toBe(title);
    expect(metaContent(html, 'og:description')).toBe(description);
    expect(metaContent(html, 'og:image')).toBe(`${baseURL}/og/convite.png`);
    expect(metaContent(html, 'og:image:width')).toBe('1200');
    expect(metaContent(html, 'og:image:height')).toBe('630');
  });
});
