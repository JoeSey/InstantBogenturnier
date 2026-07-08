// Rune-based theme state. Initial detection happens synchronously in index.html's inline
// boot script (before first paint) — this module only toggles/persists on user action,
// it does not own initial detection (Pitfall 1: FOUC).
let isDark = $state(document.documentElement.classList.contains('dark'));

export function toggleTheme() {
  isDark = !isDark;
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.theme = isDark ? 'dark' : 'light';
  // WebKit only samples the page background for the black-translucent iOS status bar
  // (index.html) at navigation/paint-establishment time — it never re-samples on a live
  // DOM/class mutation while the app keeps running (confirmed: only a hard restart or a
  // manual pull-to-refresh picked up the new color, a plain class toggle never did, on
  // both the installed Home Screen app and a plain Safari tab). A same-app reload has
  // the same effect as that manual refresh, so trigger one here — instant, since this
  // is a fully offline PWA (no network round trip) and Dexie/IndexedDB data survives a
  // reload untouched. App.svelte separately restores the active tab (Setup/Registration/
  // etc.) via sessionStorage so this doesn't feel like a full app restart to the user;
  // any unsaved text-field input not yet persisted to Dexie would still be lost, though.
  location.reload();
}

export function currentIsDark() {
  return isDark;
}
