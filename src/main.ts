import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import './app.css';
import App from './App.svelte';
import { updateAvailable } from './lib/stores/updateBanner.svelte';
import { db } from './lib/db/schema';

const app = mount(App, {
  target: document.getElementById('app')!,
});

const updateSW = registerSW({
  onNeedRefresh() {
    updateAvailable.set(true); // shows the D-02 banner (Plan 02)
  },
  onOfflineReady() {
    /* no UI required per spec — silent */
  },
});

// Open the Dexie connection on boot (connection only — no reads/writes in Phase 1).
db.open().catch((err) => {
  console.error('Failed to open Dexie database', err);
});

export { updateSW }; // called by UpdateBanner's "Aktualisieren" button (Plan 02)
export default app;
