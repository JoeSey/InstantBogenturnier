import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toggleTheme, currentIsDark } from './theme.svelte';

// Note: theme.svelte.ts's `isDark` is module-level $state, initialized once from
// document.documentElement's class at import time (Pattern 1 — synchronous FOUC-safe
// boot). Tests must not mutate the `dark` class directly (that would desync the
// module's internal state from the DOM out-of-band) — instead use currentIsDark() as
// the single source of truth for "what state are we in" and drive the DOM via toggleTheme().
describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear();
    // toggleTheme() calls location.reload() (iOS status-bar workaround — see that
    // file's comment); jsdom doesn't implement real navigation and logs a noisy
    // "Not implemented" warning for it, so stub it out for these DOM-state assertions.
    // jsdom's location.reload isn't configurable via spyOn — replace the whole
    // property instead.
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: vi.fn() },
      writable: true,
    });
  });

  it('toggleTheme flips currentIsDark()', () => {
    const before = currentIsDark();
    toggleTheme();
    expect(currentIsDark()).toBe(!before);
  });

  it('toggleTheme toggles the dark class on documentElement to match currentIsDark()', () => {
    const before = currentIsDark();
    toggleTheme();
    expect(currentIsDark()).toBe(!before);
    expect(document.documentElement.classList.contains('dark')).toBe(currentIsDark());
  });

  it('toggleTheme writes localStorage.theme to dark/light accordingly', () => {
    toggleTheme();
    const expected = currentIsDark() ? 'dark' : 'light';
    expect(localStorage.theme).toBe(expected);
  });
});
