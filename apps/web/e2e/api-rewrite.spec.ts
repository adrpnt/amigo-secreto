import { expect, test } from '@playwright/test';

const API_URL = 'http://localhost:3001';

test.describe('rewrite da API', () => {
  test('GET /api/health no web devolve o status e o corpo da API', async ({
    request,
  }) => {
    const fromApi = await request.get(`${API_URL}/health`);
    const fromWeb = await request.get('/api/health');

    expect(fromWeb.status()).toBe(fromApi.status());
    expect(await fromWeb.json()).toEqual(await fromApi.json());
    expect(await fromWeb.json()).toMatchObject({ status: 'ok' });
  });
});
