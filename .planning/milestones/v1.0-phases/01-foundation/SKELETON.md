# Walking Skeleton — InstantBogenturnier

**Phase:** 1
**Generated:** 2026-07-03

## Capability Proven End-to-End

A trainer can install the app, launch it in airplane mode, see the coherent glass shell with the app name, navigate between four sections, and toggle light/dark — all with zero network connectivity, with the theme choice persisting across restarts.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Svelte 5.56.4 + Vite 8.1.3 (plain SPA, `create-vite` `svelte-ts` template) | Locked in CLAUDE.md. Single-view, client-only, offline-first app has no need for SvelteKit's routing/SSR/adapter layer (explicitly in "What NOT to Use"). Svelte 5 runes replace any external state library. |
| Styling | Tailwind CSS 4.3.2 via `@tailwindcss/vite`, CSS-first config (`@import "tailwindcss"`, `@custom-variant`, `@utility`) — no `tailwind.config.js` | Locked. v4 CSS-first removes config-file boilerplate. Tailwind default `slate`/`teal`/`red` palette matches every UI-SPEC hex value — zero custom `@theme` color tokens needed. |
| Icons | `@lucide/svelte` 1.23.0 (PascalCase imports) | Corrected from UI-SPEC's deprecated `lucide-svelte` per RESEARCH.md. Tree-shakeable, bundled at build time (offline-safe), same import API. |
| PWA / offline | `vite-plugin-pwa` 1.3.0, `generateSW` (Workbox), `registerType: 'prompt'` (D-01) | Locked. `prompt` (not `autoUpdate`) avoids an unexpected reload disrupting live score entry; `generateSW` precache-everything is correct for a fully-static, no-API SPA. |
| Data layer | Dexie.js 4.4.4 (IndexedDB) — **schema module + connection open only in Phase 1**, no reads/writes | Locked. Phase 1 opens an empty DB so Phases 2–4 inherit a working connection with zero setup friction. Real tournament tables start Phase 2. |
| Theme persistence | `localStorage` (single scalar `theme`), FOUC-safe inline `<head>` boot script | Deliberate narrow exception to CLAUDE.md's "no localStorage for tournament data" rule (a UI preference flag, not relational data). Synchronous read before first paint prevents a flash of wrong theme. |
| Theme/state model | Svelte 5 runes (`$state`, `$derived`) in `.svelte.ts` store modules | Locked — no Redux/Zustand-style external store. |
| Update behavior | Session-dismissible in-app banner wired to `onNeedRefresh` (D-01–D-04) | `prompt` requires a mounted UI target; the banner is functionally load-bearing, not polish. |
| Deployment target | Static host over HTTPS (or `localhost` for dev); verified locally via `vite build && vite preview` with DevTools/Playwright offline toggle | HTTPS/localhost is an ASVS V14 hard requirement for service-worker registration + installability. No backend/server exists. |
| Directory layout | `src/lib/{db,stores,i18n,components,views}` (see RESEARCH.md Recommended Project Structure) | Feature-neutral shell layout; Phases 2–4 add feature folders/tables without altering it. |

## Stack Touched in Phase 1

- [x] Project scaffold (Vite + Svelte 5 + TS, Tailwind, ESLint/Prettier, Vitest + Playwright test runners)
- [x] Routing — no router library; a plain reactive `$state` active-section switch between four views (justified: 4-item always-mounted shell)
- [x] Database — Dexie schema module declared and connection opened on boot (read/write deferred to Phase 2 per CONTEXT.md phase boundary)
- [x] UI — the persisted light/dark theme toggle is the real interactive element (persists via `localStorage`)
- [x] Deployment — documented local full-stack run: `vite build && vite preview`, verified offline via Playwright `context.setOffline(true)` + a real-device install human-verify checkpoint

## Out of Scope (Deferred to Later Slices)

- Any real feature data or CRUD (classes, shooters, scores, results) — Phases 2–4
- Dexie reads/writes and the `dexie-export-import` install — Phase 2 (no utility until presets exist; RESEARCH.md Open Question 1)
- Actual tournament tables in `db/schema.ts` — Phase 2
- Input validation (ASVS V5) — begins Phase 2 (first text-entry fields)
- Destructive-action UI/copy (red token declared but unused) — Phase 2+
- PDF export, certificates, blank scoresheets — v1.5 (jsPDF)
- Multi-device sync, athlete accounts, open-source packaging — out of v1 scope

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: Trainer configures classes/lines/rounds/passes and registers shooters, with 4–8 reusable presets (first real Dexie tables + reads/writes).
- Phase 3: Trainer enters, interim-saves, and finalizes per-arrow scores live with zero data loss (opaque `surface-opaque` score table, reserved in Phase 1).
- Phase 4: Trainer views correctly-ranked per-class results, responsive across screen sizes.
