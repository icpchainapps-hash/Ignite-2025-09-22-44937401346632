import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'frontend',              // Vite operates inside ./frontend
  plugins: [react()],
  server: { port: 5173 },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});