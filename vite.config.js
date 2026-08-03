import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  cacheDir: '/tmp/dnf-hell-optimizer-vite-cache',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        about: resolve(import.meta.dirname, 'about/index.html'),
        privacy: resolve(import.meta.dirname, 'privacy/index.html'),
        stats: resolve(import.meta.dirname, 'stats/index.html'),
      },
    },
  },
  server: {
    host: '127.0.0.1',
    watch: {
      ignored: ['**/Docs/**', '**/.venv-xlsx/**', '**/.codex/**', '**/이미지/**', '**/*.xlsx'],
      usePolling: process.env.VITE_USE_POLLING === '1',
      interval: 300,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
});
