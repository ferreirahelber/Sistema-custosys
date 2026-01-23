import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    // REMOVIDO O BLOCO 'define' QUE EXPUNHA A API KEY
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './test/setup.ts',
      exclude: [
        '**/node_modules/**', 
        '**/dist/**', 
        '**/cypress/**', 
        '**/.{idea,git,cache,output,temp}/**', 
        './tests/**' 
      ],
    },
  };
});