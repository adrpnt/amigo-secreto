import { randomInt, randomUUID } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import type { GroupDetail } from '@amigo-secreto/shared';
import {
  type APIRequestContext,
  type Page,
  request as playwrightRequest,
} from '@playwright/test';
import { csrfToken, registerAccount, signIn } from './support/account';
import { expect, test } from './support/fixtures';

const WCAG_21_A_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
}

async function expectTheme(page: Page, theme: 'light' | 'dark') {
  if (theme === 'dark') {
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  } else {
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
  }
}

async function openWithTheme(page: Page, theme: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme: theme });
  await page.goto('/');
  await expect(page.getByText('API online', { exact: true })).toBeVisible();
  await expectTheme(page, theme);
}

// Nome com 80 caracteres e sem espaço, o pior caso para a largura.
const LONG_GROUP_NAME = `Amigo-secreto-${'x'.repeat(66)}`;
const NEXT_YEAR = new Date().getFullYear() + 1;

// Conta com sessão na página e um grupo com todos os campos preenchidos.
async function signedInWithGroup(page: Page): Promise<GroupDetail> {
  const email = `a11y-${randomUUID()}@example.com`;
  await registerAccount(page.request, email);
  await signIn(page.request, email);
  const response = await page.request.post('/api/groups', {
    headers: { 'X-CSRF-Token': await csrfToken(page.request) },
    data: {
      name: LONG_GROUP_NAME,
      description: 'Tragam algo feito à mão!\nNada de vale-presente.',
      giftMinValue: 50,
      giftMaxValue: 100,
      drawScheduledAt: `${NEXT_YEAR}-12-10T23:00:00.000Z`,
      eventAt: `${NEXT_YEAR}-12-20T22:00:00.000Z`,
      eventLocation: 'Casa da vó',
      isOnlineEvent: true,
      requiresApproval: true,
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as GroupDetail;
}

type GroupScreen = { label: string; open: (page: Page) => Promise<void> };

async function openAndWait(page: Page, path: string, heading: string) {
  await page.goto(path);
  await expect(
    page.getByRole('heading', { level: 1, name: heading }),
  ).toBeVisible();
}

// As quatro telas de grupo e a confirmação aberta na página do grupo.
function groupScreens(group: GroupDetail): GroupScreen[] {
  return [
    {
      label: '/grupos',
      open: (page) => openAndWait(page, '/grupos', 'Meus grupos'),
    },
    {
      label: '/grupos/novo',
      open: (page) => openAndWait(page, '/grupos/novo', 'Novo grupo'),
    },
    {
      label: '/grupos/{id}',
      open: (page) => openAndWait(page, `/grupos/${group.id}`, group.name),
    },
    {
      label: '/grupos/{id} com a confirmação aberta',
      open: async (page) => {
        await openAndWait(page, `/grupos/${group.id}`, group.name);
        await page.getByRole('button', { name: 'Excluir grupo' }).click();
        await expect(
          page.getByRole('dialog', { name: `Excluir o grupo ${group.name}?` }),
        ).toBeVisible();
      },
    },
    {
      label: '/grupos/{id}/editar',
      open: (page) =>
        openAndWait(page, `/grupos/${group.id}/editar`, 'Editar grupo'),
    },
  ];
}

const NO_VIOLATIONS = {
  '/grupos': [],
  '/grupos/novo': [],
  '/grupos/{id}': [],
  '/grupos/{id} com a confirmação aberta': [],
  '/grupos/{id}/editar': [],
};

// Violações do axe por tela, para a falha dizer onde está cada uma.
async function groupScreenViolations(page: Page, theme: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme: theme });
  const group = await signedInWithGroup(page);
  const violations: Record<string, string[]> = {};
  for (const screen of groupScreens(group)) {
    await screen.open(page);
    await expectTheme(page, theme);
    const results = await new AxeBuilder({ page })
      .withTags(WCAG_21_A_AA)
      .analyze();
    violations[screen.label] = results.violations.map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
    );
  }
  return violations;
}

test.describe('layout', () => {
  test('não rola na horizontal em 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    await expect(page.getByText('API online', { exact: true })).toBeVisible();

    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  test('não rola na horizontal em 1440 px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByText('API online', { exact: true })).toBeVisible();

    expect(await hasHorizontalScroll(page)).toBe(false);
  });
});

test.describe('layout', () => {
  test('telas de grupo não rolam na horizontal em 360 px e 1440 px', async ({
    page,
  }) => {
    const group = await signedInWithGroup(page);
    const scrolling: string[] = [];

    for (const viewport of [
      { width: 360, height: 800 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      for (const screen of groupScreens(group)) {
        await screen.open(page);
        if (await hasHorizontalScroll(page)) {
          scrolling.push(`${screen.label} em ${viewport.width} px`);
        }
      }
    }

    expect(scrolling).toEqual([]);
  });
});

test.describe('acessibilidade', () => {
  test('página inicial sem violações WCAG 2.1 A/AA no tema claro', async ({
    page,
  }) => {
    await openWithTheme(page, 'light');

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_21_A_AA)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('página inicial sem violações WCAG 2.1 A/AA no tema escuro', async ({
    page,
  }) => {
    await openWithTheme(page, 'dark');

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_21_A_AA)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('telas de grupo sem violações WCAG 2.1 A/AA no tema claro', async ({
    page,
  }) => {
    const violations = await groupScreenViolations(page, 'light');

    expect(violations).toEqual(NO_VIOLATIONS);
  });

  test('telas de grupo sem violações WCAG 2.1 A/AA no tema escuro', async ({
    page,
  }) => {
    const violations = await groupScreenViolations(page, 'dark');

    expect(violations).toEqual(NO_VIOLATIONS);
  });
});

// Outra pessoa, com sessão e IP próprios, para os limites por IP não somarem
// com os do navegador do teste.
async function otherPerson(
  baseURL: string | undefined,
): Promise<APIRequestContext> {
  const request = await playwrightRequest.newContext({
    baseURL,
    extraHTTPHeaders: {
      'X-Forwarded-For': `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`,
    },
  });
  const email = `a11y-${randomUUID()}@example.com`;
  await registerAccount(request, email);
  await signIn(request, email);
  return request;
}

async function joinGroup(request: APIRequestContext, inviteCode: string) {
  const response = await request.post(`/api/invites/${inviteCode}/join`, {
    headers: { 'X-CSRF-Token': await csrfToken(request) },
  });
  expect(response.status()).toBe(200);
}

// Grupo com o nome longo e aprovação, criado por outra pessoa.
async function someoneElsesGroup(
  baseURL: string | undefined,
): Promise<GroupDetail> {
  const owner = await otherPerson(baseURL);
  const response = await owner.post('/api/groups', {
    headers: { 'X-CSRF-Token': await csrfToken(owner) },
    data: { name: LONG_GROUP_NAME, requiresApproval: true },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as GroupDetail;
}

// Violações do axe nos dois temas e rolagem horizontal em 360 e 1440 px de
// uma tela, aberta por `open` a cada vez.
async function screenProblems(
  page: Page,
  open: () => Promise<void>,
): Promise<string[]> {
  const problems: string[] = [];
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await open();
    await expectTheme(page, theme);
    const results = await new AxeBuilder({ page })
      .withTags(WCAG_21_A_AA)
      .analyze();
    for (const violation of results.violations) {
      problems.push(
        `${theme}: ${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
      );
    }
  }
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await open();
    if (await hasHorizontalScroll(page)) {
      problems.push(`rola na horizontal em ${viewport.width} px`);
    }
  }
  return problems;
}

test.describe('acessibilidade', () => {
  test('/convite/{código} sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px', async ({
    page,
    baseURL,
  }) => {
    const group = await someoneElsesGroup(baseURL);
    const openInvite = async () => {
      await page.goto(`/convite/${group.inviteCode}`);
      await expect(
        page.getByRole('heading', { level: 1, name: group.name }),
      ).toBeVisible();
    };

    // Sem sessão: "Entrar" e "Criar conta".
    const anonymous = await screenProblems(page, openInvite);
    // Logada sem participação: o texto da aprovação e "Pedir para entrar".
    const email = `a11y-${randomUUID()}@example.com`;
    await registerAccount(page.request, email);
    await signIn(page.request, email);
    const signedIn = await screenProblems(page, async () => {
      await openInvite();
      await expect(
        page.getByRole('button', { name: 'Pedir para entrar' }),
      ).toBeVisible();
    });

    expect({ anonymous, signedIn }).toEqual({ anonymous: [], signedIn: [] });
  });

  test('/grupos/{id}/participantes sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px', async ({
    page,
    baseURL,
  }) => {
    const group = await signedInWithGroup(page);
    await joinGroup(await otherPerson(baseURL), group.inviteCode);

    const problems = await screenProblems(page, async () => {
      await page.goto(`/grupos/${group.id}/participantes`);
      await expect(page.getByText('Pendente', { exact: true })).toBeVisible();
    });

    expect(problems).toEqual([]);
  });

  test('/grupos/{id} com as abas sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px', async ({
    page,
  }) => {
    const group = await signedInWithGroup(page);

    const problems = await screenProblems(page, async () => {
      await openAndWait(page, `/grupos/${group.id}`, group.name);
      await expect(
        page.getByRole('navigation', { name: 'Seções do grupo' }),
      ).toBeVisible();
    });

    expect(problems).toEqual([]);
  });

  test('/grupos com card pendente sem violações nos dois temas e sem rolagem horizontal em 360 e 1440 px', async ({
    page,
    baseURL,
  }) => {
    const group = await someoneElsesGroup(baseURL);
    const email = `a11y-${randomUUID()}@example.com`;
    await registerAccount(page.request, email);
    await signIn(page.request, email);
    await joinGroup(page.request, group.inviteCode);

    const problems = await screenProblems(page, async () => {
      await openAndWait(page, '/grupos', 'Meus grupos');
      await expect(page.getByText('Aguardando aprovação')).toBeVisible();
    });

    expect(problems).toEqual([]);
  });
});
