// Rune-based theme state. Initial detection happens synchronously in index.html's inline
// boot script (before first paint) — this module only toggles/persists on user action,
// it does not own initial detection (Pitfall 1: FOUC).
let isDark = $state(document.documentElement.classList.contains('dark'));

export function toggleTheme() {
  isDark = !isDark;
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.theme = isDark ? 'dark' : 'light';
  // Keep the iOS/Android chrome tint (status bar / address bar) in sync with the
  // app's own background — see index.html's matching inline boot-time set.
  document.getElementById('theme-color-meta')?.setAttribute('content', isDark ? '#0f172a' : '#f8fafc');
  // iOS only reads apple-mobile-web-app-status-bar-style at cold launch of the
  // standalone Home Screen app, not live — updating it here has no visible effect on
  // the currently running session, but ensures the *next* launch opens with the status
  // bar style matching whatever theme the user last chose.
  document
    .getElementById('apple-status-bar-meta')
    ?.setAttribute('content', isDark ? 'black' : 'default');
}

export function currentIsDark() {
  return isDark;
}
