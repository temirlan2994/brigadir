/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json';

// База для GitHub Pages задаётся в CI: BASE_PATH=/brigadir/
const rawBase = process.env.BASE_PATH ?? '/';
// Громко падаем, если Git Bash (MSYS) подменил значение на путь Windows;
// локально на Windows задавай базу через PowerShell: $env:BASE_PATH='/brigadir/'
if (!rawBase.startsWith('/') || rawBase.includes(':')) {
  throw new Error(`BASE_PATH испорчен: «${rawBase}» — база обязана начинаться с «/»`);
}
const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      // prompt: при новой версии показываем баннер «Обновить» вместо тихого обновления
      registerType: 'prompt',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Бригадир',
        short_name: 'Бригадир',
        description: 'Блокнот бригадира, который сам считает деньги',
        lang: 'ru',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f8fafc',
        theme_color: '#f97316',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      exclude: ['src/core/**/*.test.ts'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
});
