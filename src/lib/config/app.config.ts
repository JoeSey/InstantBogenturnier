// Single source of truth for app/club identity (D-05, CLAUDE.md "identity as config, not hardcoded").
// Consumed by both vite.config.ts (PWA manifest) and strings.de.ts (UI copy) — never re-typed elsewhere.
export const appName = 'InstantBogenturnier' as const;
export const appVersion = '1.2' as const;
export const themeColor = '#14B8A6' as const;
export const backgroundColor = '#F8FAFC' as const;
