import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: parseInt(process.env.VITE_DEV_PORT || '5175'),
    allowedHosts: [
      'codenames-dev.local.wddt.ru',
      'localhost',
      '127.0.0.1'
    ],
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: ['src/utils/syncLocales.js', 'src/utils/generateSitemaps.js']
    }
  },
  define: {
    global: 'globalThis'
  }
})