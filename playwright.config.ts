import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testIgnore: 'admin.spec.ts', timeout: 60000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:3000', channel: 'msedge', headless: true, permissions: ['camera'],
    launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
    screenshot: 'only-on-failure', trace: 'retain-on-failure' },
});

