import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'electron' ? '/' : './',
  resolve: {
    alias: {
      'react-is': fileURLToPath(new URL('./src/shims/react-is.js', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    strictPort: process.env.ELECTRON_STRICT_PORTS === '1',
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
}));
