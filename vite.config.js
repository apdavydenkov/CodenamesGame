import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { localizeHtml } from './src/utils/localizeHtml.js'
import ru from './src/locales/ru.js'

// В сборке плейсхолдеры index.html заполняет postbuild по всем локалям,
// в дев-режиме — этот плагин русской локалью
const localizeIndexHtml = {
  name: 'localize-index-html',
  apply: 'serve',
  transformIndexHtml: html =>
    localizeHtml(html, { locale: 'ru', meta: ru.meta, locales: [], baseUrl: '' }),
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localizeIndexHtml],
  server: {
    host: true,
    port: parseInt(process.env.VITE_DEV_PORT || '5175'),
    allowedHosts: [
      'codenames-dev.vps.wddt.ru',
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
    sourcemap: false,
    rollupOptions: {
      external: ['src/utils/syncLocales.js', 'src/utils/generateSitemaps.js']
    }
  },
  define: {
    global: 'globalThis'
  }
})