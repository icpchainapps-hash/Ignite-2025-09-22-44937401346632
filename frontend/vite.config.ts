import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: 'frontend',         // <-- tell vite where your app lives
  build: {
    outDir: 'frontend/dist'
  }
});