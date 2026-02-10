import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  // AQUI ESTÁ A CORREÇÃO PRINCIPAL
  use: {
    // Usar 127.0.0.1 é mais seguro no Windows que localhost
    baseURL: 'http://localhost:3000',
    trace: 'on',
  },

  webServer: {
    // Forçamos a porta 3000 para garantir que use o server manual se existir
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});