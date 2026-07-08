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
}

export function currentIsDark() {
  return isDark;
}
