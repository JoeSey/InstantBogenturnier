// Rune-based theme state. Initial detection happens synchronously in index.html's inline
// boot script (before first paint) — this module only toggles/persists on user action,
// it does not own initial detection (Pitfall 1: FOUC).
let isDark = $state(document.documentElement.classList.contains('dark'));

export function toggleTheme() {
  isDark = !isDark;
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.theme = isDark ? 'dark' : 'light';
  // The iOS status bar (installed PWA) and Safari chrome tint are *not* kept in sync
  // here — both rely on meta tags iOS only reads statically (see index.html), so
  // there's nothing to update at runtime. The status bar instead tracks the app's own
  // live background color (html.dark background-color in app.css, safe-area padding in
  // App.svelte/TopAppBar.svelte) via "black-translucent", which updates immediately.
}

export function currentIsDark() {
  return isDark;
}
