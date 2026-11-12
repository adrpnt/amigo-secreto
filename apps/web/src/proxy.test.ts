// @vitest-environment node
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('proxy', () => {
  it('lança erro que nomeia API_INTERNAL_URL quando ela falta', () => {
    vi.stubEnv('API_INTERNAL_URL', undefined);

    expect(() =>
      proxy(new NextRequest('http://localhost:3000/api/health')),
    ).toThrow(/API_INTERNAL_URL/);
  });
});
