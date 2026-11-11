import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  workers: 1,
  use: { baseURL: 'http://localhost:8081', trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: { channel: 'msedge' } },
  projects: [
    { name: 'celular-web', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'desktop-web', use: { viewport: { width: 1440, height: 1000 } } },
  ],
});
