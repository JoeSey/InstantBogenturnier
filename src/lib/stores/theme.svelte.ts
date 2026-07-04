// Rune-based theme state. Initial detection happens synchronously in index.html's inline
// boot script (before first paint) — this module only toggles/persists on user action,
// it does not own initial detection (Pitfall 1: FOUC).
let isDark = $state(document.documentElement.classList.contains('dark'));

export function toggleTheme() {
  isDark = !isDark;
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.theme = isDark ? 'dark' : 'light';
}

export function currentIsDark() {
  return isDark;
}
