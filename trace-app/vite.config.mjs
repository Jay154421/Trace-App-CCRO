import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      'react-is': fileURLToPath(new URL('./src/shims/react-is.js', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    strictPort: process.env.ELECTRON_STRICT_PORTS === '1',
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
});
