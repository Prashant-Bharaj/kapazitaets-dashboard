import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Reine Frontend-App (kein Backend).
// base: lokal "/", auf GitHub Pages "/<repo>/" via VITE_BASE_PATH.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  server: { port: 8080, strictPort: true, host: true },
});
