import { vi } from 'vitest';

// Variáveis da conta obrigatórias em production, com valores de teste.
export function stubAccountEnv(): void {
  vi.stubEnv('WEB_URL', 'http://localhost:3000');
  vi.stubEnv('AUTH_SECRET', 'test-auth-secret');
  vi.stubEnv('GOOGLE_CLIENT_ID', 'test-google-client');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-google-secret');
  vi.stubEnv('TRUST_PROXY_HOPS', '0');
}
