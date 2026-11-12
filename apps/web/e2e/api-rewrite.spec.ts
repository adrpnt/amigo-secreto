import { expect, test, type APIResponse } from '@playwright/test';

const API_URL = 'http://localhost:3001';

// O responseTime muda a cada ping ao banco; o resto do corpo tem de ser igual.
async function bodyWithoutResponseTime(response: APIResponse) {
  return JSON.parse(await response.text(), (key, value: unknown) =>
    key === 'responseTime' ? undefined : value,
  ) as unknown;
}

test.describe('rewrite da API', () => {
  test('GET /api/health no web devolve o status e o corpo da API', async ({
    request,
  }) => {
    const fromApi = await request.get(`${API_URL}/health`);
    const fromWeb = await request.get('/api/health');

    expect(fromWeb.status()).toBe(fromApi.status());
    expect(await bodyWithoutResponseTime(fromWeb)).toEqual(
      await bodyWithoutResponseTime(fromApi),
    );
    expect(await fromWeb.json()).toMatchObject({ status: 'ok' });
  });
});
