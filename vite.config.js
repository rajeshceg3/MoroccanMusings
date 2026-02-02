import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    assetsDir: 'assets',
    sourcemap: false
  },
  server: {
    port: 8080,
    open: true
  }
});
