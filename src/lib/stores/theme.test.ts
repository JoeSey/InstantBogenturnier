import { describe, it, expect, beforeEach } from 'vitest';
import { toggleTheme, currentIsDark } from './theme.svelte';

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('toggleTheme flips currentIsDark()', () => {
    const before = currentIsDark();
    toggleTheme();
    expect(currentIsDark()).toBe(!before);
  });

  it('toggleTheme toggles the dark class on documentElement', () => {
    const wasDark = document.documentElement.classList.contains('dark');
    toggleTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(!wasDark);
  });

  it('toggleTheme writes localStorage.theme to dark/light accordingly', () => {
    toggleTheme();
    const expected = currentIsDark() ? 'dark' : 'light';
    expect(localStorage.theme).toBe(expected);
  });
});
