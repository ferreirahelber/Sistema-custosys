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
    baseURL: 'http://127.0.0.1:5173', 
    trace: 'on-first-retry',
  },

  webServer: {
    // Forçamos a porta 5173 para garantir que o Vite não mude para 5174
    command: 'npm run dev -- --port 5173', 
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // Aumentamos o timeout para 2 minutos (120s)
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});