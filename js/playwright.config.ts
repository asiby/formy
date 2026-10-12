import { defineConfig } from '@playwright/test';

// Browser tests run against the demo server (mock API), not Drupal.
// Run `npm run build` first. If Playwright's own browsers are not installed,
// point CHROME_PATH at any Chromium/Chrome binary.
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:8788',
    viewport: { width: 1360, height: 1000 },
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  webServer: {
    command: 'node demo/serve.mjs',
    env: { PORT: '8788' },
    url: 'http://localhost:8788/demo/',
    reuseExistingServer: !process.env.CI,
  },
});
