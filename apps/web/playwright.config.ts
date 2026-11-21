import { defineConfig, devices } from '@playwright/test';
import { FAKE_PROVIDERS_URL } from './e2e/support/fake-providers';

const API_URL = 'http://localhost:3001';
// Porta própria do e2e, fora da 3000 do `pnpm dev`.
const WEB_PORT = 3200;
const WEB_URL = `http://localhost:${WEB_PORT}`;
const CLOSED_API_URL = 'http://localhost:3999';
const IS_CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'e2e',
  reporter: IS_CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  retries: 0,
  use: {
    baseURL: WEB_URL,
    trace: IS_CI ? 'retain-on-failure' : 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      name: 'fake-providers',
      command: 'node e2e/support/fake-providers.ts',
      url: `${FAKE_PROVIDERS_URL}/health`,
      reuseExistingServer: false,
    },
    {
      name: 'api',
      command: 'node --import ./dist/instrument.js dist/main.js',
      cwd: '../api',
      url: `${API_URL}/health`,
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
        RESEND_API_KEY: 're_e2e',
        RESEND_BASE_URL: FAKE_PROVIDERS_URL,
        EMAIL_FROM: 'Amigo Secreto <e2e@example.com>',
        WEB_URL,
        AUTH_SECRET: 'e2e-auth-secret',
        GOOGLE_CLIENT_ID: 'e2e-google-client',
        GOOGLE_CLIENT_SECRET: 'e2e-google-secret',
        GOOGLE_AUTH_URL: `${FAKE_PROVIDERS_URL}/o/oauth2/v2/auth`,
        GOOGLE_TOKEN_URL: `${FAKE_PROVIDERS_URL}/token`,
        // Cada teste manda o próprio X-Forwarded-For (e2e/support/fixtures.ts).
        TRUST_PROXY_HOPS: '1',
      },
    },
    {
      name: 'web',
      command: `pnpm exec next start --port ${WEB_PORT}`,
      url: WEB_URL,
      reuseExistingServer: false,
      env: { API_INTERNAL_URL: API_URL },
    },
    {
      name: 'web-api-down',
      command: 'pnpm exec next start --port 3100',
      url: 'http://localhost:3100',
      reuseExistingServer: false,
      env: { API_INTERNAL_URL: CLOSED_API_URL },
    },
  ],
});
