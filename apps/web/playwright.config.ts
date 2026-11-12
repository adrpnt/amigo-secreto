import { defineConfig, devices } from '@playwright/test';

const API_URL = 'http://localhost:3001';
const CLOSED_API_URL = 'http://localhost:3999';
const IS_CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'e2e',
  reporter: IS_CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: IS_CI ? 'retain-on-failure' : 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      name: 'api',
      command: 'node --import ./dist/instrument.js dist/main.js',
      cwd: '../api',
      url: `${API_URL}/health`,
      reuseExistingServer: false,
      env: { NODE_ENV: 'production', PORT: '3001' },
    },
    {
      name: 'web',
      command: 'pnpm exec next start --port 3000',
      url: 'http://localhost:3000',
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
