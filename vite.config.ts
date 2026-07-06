import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { appName, themeColor, backgroundColor, basePath } from './src/lib/config/app.config';

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [
    svelte(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
      manifest: {
        name: appName,
        short_name: appName,
        description: 'Bogen-Trainingsturnier Verwaltung',
        theme_color: themeColor,
        background_color: backgroundColor,
        display: 'standalone',
        // Both scope and start_url must match Vite's `base` (basePath above), or the
        // installed PWA's service-worker scope mismatches the sub-path and
        // installability/offline routing silently breaks (see CLAUDE.md gotcha).
        scope: basePath,
        start_url: basePath,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
