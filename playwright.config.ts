import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';

const chromiumPath = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure', ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}) },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'pnpm start',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { PORT: '3000' },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } } },
  ],
});
