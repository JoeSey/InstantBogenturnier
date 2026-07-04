import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Separate from vite.config.ts (which carries the VitePWA plugin, irrelevant/noisy
// for unit tests) — kept minimal per RESEARCH.md Task 2 action note.
export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest-setup.ts'],
    // e2e/ holds Playwright specs (own test() global) — exclude from Vitest's run.
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
