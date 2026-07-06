// Single source of truth for app/club identity (D-05, CLAUDE.md "identity as config, not hardcoded").
// Consumed by both vite.config.ts (PWA manifest) and strings.de.ts (UI copy) — never re-typed elsewhere.
export const appName = 'InstantBogenturnier' as const;
export const themeColor = '#14B8A6' as const;
export const backgroundColor = '#F8FAFC' as const;

// Deployment sub-path, e.g. '/bogenturnier/' if hosted at https://example.com/bogenturnier/.
// Must end with a trailing slash (Vite's `base` and the PWA manifest's `scope`/`start_url`
// both expect it). Leave as '/' for root-hosted deployments. Change this and rebuild before
// deploying to a sub-path — see README.md "Deploying to a sub-path".
export const basePath = '/' as const;
