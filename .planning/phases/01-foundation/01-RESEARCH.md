# Phase 1: Foundation - Research

**Researched:** 2026-07-03
**Domain:** Installable, offline-first PWA shell (Svelte 5 + Vite 8 + Tailwind CSS 4 + vite-plugin-pwa) with glassmorphism theming and responsive navigation — no backend, no real feature data yet
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### PWA Update Behavior
- **D-01:** `registerType: 'prompt'` (not `autoUpdate`) — new service worker installs in the background but waits for explicit trainer confirmation before activating, to avoid an unexpected reload disrupting live score entry if connectivity briefly returns mid-tournament.
- **D-02:** "Update available" is surfaced via a small, dismissible banner (not a settings-menu badge, not a blocking modal).
- **D-03:** Dismissing the banner hides it only for the rest of the current app session; it reappears on the next full app open/reload if the update is still pending.
- **D-04:** No manual "check for updates" UI in v1 — rely solely on Workbox's automatic background update check.

#### App Identity & Branding
- **D-05:** App name: **"InstantBogenturnier"** — a generic (non-club-specific) placeholder name evoking ad-hoc, minimal-infrastructure tournament setup. **Note:** "MeinBogenturnier" was explicitly rejected — it collides with an existing official-tournament-search website of that name.
- **D-06:** PWA icon: a simple, generic archery icon (target/arrow motif, matching the accent color), generated via `@vite-pwa/assets-generator` — no custom/club logo asset needed for v1.
- **D-07:** UI language: **German** — matches `specs.md`'s own terminology ("Speichern", "Abschließen", etc.) and the target trainer audience.
- **D-08:** All UI text is centralized in one strings/config module from the start, even though only German is needed for v1 — cheap now, avoids a find-and-replace refactor if a v2.5 open-source release ever needs localization or per-club text overrides.

#### Glassmorphism Visual Language
- **D-09:** Accent/primary color: **blue/teal** — archery-neutral, no club-specific meaning to design around.
- **D-10:** Glass effect intensity: **subtle** (light blur, mostly-opaque backgrounds) — prioritizes legibility in bright outdoor sunlight at the range and readability of dense score tables (a later-phase concern, but the visual system is set here).
- **D-11:** Glass effect scope: applied to **cards, panels, and the nav only** — explicitly NOT to the score-entry table itself (built in Phase 3), which must stay fully opaque/high-contrast since it's the app's core-value screen used under the most pressure.
- **D-12:** Dark mode glass tint: **dark-tinted** glass panels (not light-tinted-on-dark) — consistent, low-glare look.

#### App Shell Navigation
- **D-13:** **Persistent navigation with free movement** between sections (Setup, Registration, Scoring, Results) — not a linear guided wizard. The trainer can jump between sections at any time (e.g., tweak a class definition mid-scoring).
- **D-14:** Nav form: **bottom tab bar on phone-sized screens**, collapsing into a **sidebar on tablet/desktop** — responsive, thumb-reachable pattern for one-handed range use.
- **D-15:** Sections with no data yet (e.g., Results before any scores exist) are **gated/disabled** rather than always clickable, to avoid confusing empty screens.
- **D-16:** Phase 1 scope for each nav section: a simple **"coming soon" placeholder screen**, styled with the theme/glass system, for all four sections (Setup, Registration, Scoring, Results). This proves the shell, nav, theming, and PWA infrastructure work end-to-end without building any real feature UI — that's Phases 2-4.

### Claude's Discretion
No items were left to "you decide" — every gray area discussed reached an explicit decision above. Fine implementation details not covered here (exact Tailwind color tokens/shades, blur radius in px, breakpoint pixel values, icon file structure) are left to research/planning to resolve within the constraints above.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within Phase 1 scope. No scope-creep items came up.

### UI Design Contract (from 01-UI-SPEC.md, approved)
The full UI-SPEC is locked and canonical for visual/interaction details — see `.planning/phases/01-foundation/01-UI-SPEC.md`. Key points this research relies on and, in one case, corrects:
- Design system: no component library/registry (hand-built Svelte 5 + Tailwind); icon library `lucide-svelte` — **this research found `lucide-svelte` is deprecated; substitute `@lucide/svelte`, see Standard Stack and Pitfall 3 below.**
- Font: Tailwind default `font-sans` system-UI stack, no bundled webfont.
- Spacing scale: 4/8/16/24/32/48/64px tokens; 44×44px minimum touch targets; sidebar 240px (72px collapsed rail below 1280px).
- Typography: exactly 4 sizes (14/16/20/28px), 2 weights (400/600).
- Color: Tailwind default `slate-50/800/900`, `teal-400/500`, `red-400/600` — see Architecture Patterns Pattern 4 for confirmation no custom theme is needed.
- Glass tokens: `backdrop-filter: blur(8px)` (= Tailwind `backdrop-blur-sm`), applied only to cards/panels/nav, explicitly excluded from the future score-entry table (`--surface-opaque` token reserved now).
- Nav breakpoint: below 768px (Tailwind `md`) = bottom tab bar; 768px+ = sidebar.
- Copy: all locked in German, see Code Examples' `strings.de.ts` for the full centralized module.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| PLAT-01 | App is installable as a PWA and fully functional with zero network connectivity | Pattern 2 (`registerType:'prompt'` + manifest config), Pitfall 2 & 4, Environment Availability (Node/npm confirmed), Package Legitimacy Audit (`vite-plugin-pwa`, `@vite-pwa/assets-generator` verified) |
| PLAT-02 | App uses a modern, glassmorphism-influenced design, responsive across phone/tablet/desktop | Pattern 3 (responsive nav breakpoint switch), Pattern 4 (glass surface tokens, confirmed default Tailwind palette match), Recommended Project Structure (`GlassCard.svelte`, `BottomTabBar.svelte`, `Sidebar.svelte`) |
| PLAT-03 | App automatically switches light/dark mode based on system preference, with a manual override toggle | Pattern 1 (FOUC-free theme boot via `localStorage` + `@custom-variant dark`), Alternatives Considered (localStorage vs. Dexie for theme), Open Question 2 (walking-skeleton interaction interpretation) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

The following directives from `./CLAUDE.md` are binding for this phase's planning and implementation:

- **Tech stack is client-only**: no backend/server, no hosted DB — every capability in this phase must be achievable with static hosting + browser APIs alone.
- **Framework is locked**: Svelte 5 + Vite 8 + Tailwind CSS 4 + `vite-plugin-pwa` + Dexie.js — do not substitute SvelteKit, an external state library, or a different CSS framework (all explicitly listed under "What NOT to Use").
- **Single-device operation only** for v1 — no multi-device sync/concurrency design needed anywhere in this phase.
- **Must be fully operable with zero network connectivity** during live tournament use — directly the subject of PLAT-01 and this phase's core acceptance test.
- **Club-specific identity must live in configuration, not be hardcoded** — the app name "InstantBogenturnier" (D-05) and all UI strings (D-08) must go through the centralized `strings.de.ts`-style module from day one, not inline literals, in anticipation of a v2.5 open-source release.
- **`registerType: 'prompt'`, not `'autoUpdate'`, with `virtual:pwa-register`'s `onNeedRefresh` wired to in-app UI** — explicitly required by CLAUDE.md's "What NOT to Use" table and reconfirmed by CONTEXT.md's D-01–D-04.
- **Do not use `localStorage`/`sessionStorage` for tournament data** (relational shooter/class/score data) — Dexie is mandatory for that data shape. This research's recommendation to use `localStorage` for the single-scalar theme preference (Pattern 1) is a deliberate, narrow exception this constraint does not cover (it explicitly targets "tournament data," not UI preferences) — flagged explicitly so the planner can confirm this reading is acceptable.
- **`@vite-pwa/assets-generator`, not `pwa-asset-generator`**, for icon generation — the Puppeteer-based tool is explicitly forbidden.
- Package versions in CLAUDE.md's Recommended Stack table were re-verified in this research session and found still current — no deviation needed except the `lucide-svelte` → `@lucide/svelte` correction (`lucide-svelte` is not named in CLAUDE.md's own table, only in the later UI-SPEC, so this is not a CLAUDE.md conflict, just a UI-SPEC correction).


## Summary

Phase 1 scaffolds the entire project from zero. The full technology stack is already locked in `CLAUDE.md` and confirmed unchanged by this research: every package version named there (`svelte@5.56.4`, `vite@8.1.3`, `@sveltejs/vite-plugin-svelte@7.1.2`, `tailwindcss@4.3.2`, `@tailwindcss/vite@4.3.2`, `vite-plugin-pwa@1.3.0`, `dexie@4.4.4`, `typescript@6.0.3`, plus the dev-tooling set) is still current on the npm registry as of 2026-07-03, and the official `create-vite@9.1.1` `svelte-ts` template itself now scaffolds these exact major/minor versions (`vite@^8.1.1`, `svelte@^5.56.4`, `@sveltejs/vite-plugin-svelte@^7.1.2`) out of the box — so the standard `npm create vite@latest -- --template svelte-ts` bootstrap is the correct, zero-friction starting point requiring no manual version pinning.

One correction to the UI-SPEC's locked dependency list: **`lucide-svelte` is deprecated** (confirmed via `npm view lucide-svelte deprecated`) in favor of **`@lucide/svelte@1.23.0`**, the actively maintained successor from the same `lucide-icons/lucide` monorepo, requiring `svelte: "^5"` — a strictly better match for this Svelte-5-only project. The icon names and component API are unchanged (`import { Settings2 } from '@lucide/svelte'`), so this is a drop-in package-name swap, not a rewrite. This must be flagged to the user/planner since it changes a locked UI-SPEC artifact.

The four success criteria (installable+offline, responsive glass shell, light/dark with persisted override) map cleanly onto three build-time/runtime layers: (1) `vite-plugin-pwa`'s `generateSW` strategy with `registerType: 'prompt'` for install/offline per D-01–D-04, (2) Tailwind v4's `@custom-variant dark` + a `localStorage`-backed, FOUC-safe inline boot script for theming per PLAT-03, and (3) hand-built Svelte 5 components (no UI kit, per UI-SPEC) for the responsive nav shell and glass surfaces, using Tailwind's default color palette and `backdrop-blur-sm` (exactly 8px) utility — meaning **zero custom Tailwind theme/color configuration is required**; the UI-SPEC's hex values are Tailwind's stock `slate`/`teal`/`red` shades.

**Primary recommendation:** Scaffold via `npm create vite@latest -- --template svelte-ts`, layer in Tailwind v4 (`@tailwindcss/vite`) and `vite-plugin-pwa` (`registerType: 'prompt'`, `generateSW`), build the nav/theme/glass shell as plain Svelte 5 runes components with `@lucide/svelte` icons, and persist the theme override via `localStorage` (not Dexie) to guarantee a flash-free first paint — while still scaffolding an empty `db/schema.ts` Dexie database in this phase so Phase 2 has zero setup friction.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PWA install / manifest / service worker | Build tool (Vite plugin, `vite-plugin-pwa`) | Browser/Client (SW runtime, install prompt) | Manifest + SW are generated at build time from `vite.config.ts`; the browser only consumes and registers the artifact — there is no server involved in either generation or serving (fully static host). |
| Offline app-shell precaching | Browser/Client (Service Worker, Workbox) | Build tool (`globPatterns` config) | Runtime caching decisions happen in the SW; correctness depends on build-time config covering every asset — both tiers matter, but the runtime behavior is what the success criteria test. |
| Update-available banner (D-01–D-04) | Browser/Client | Build tool (`virtual:pwa-register` generated by the plugin) | The banner is pure UI state driven by the `onNeedRefresh` callback the plugin injects; no backend involved. |
| Responsive nav shell (tab bar / sidebar) | Browser/Client | — | Pure CSS breakpoint + Svelte component logic, no data dependency. |
| Light/dark theme + manual override persistence | Browser/Client | Database/Storage (`localStorage`, NOT Dexie — see Pitfall/Code Examples) | Must resolve synchronously before first paint to avoid FOUC; `localStorage` is the only synchronous, zero-network-hop storage available in a static SPA head script. |
| Glassmorphism surface styling (cards/panels/nav) | Browser/Client | — | Pure CSS (`backdrop-filter`, Tailwind utilities); no logic. |
| Placeholder ("coming soon") screens | Browser/Client | — | Static content, no data layer touch in this phase (per D-16 / CONTEXT.md phase boundary). |
| Local database initialization (Dexie schema scaffold) | Database/Storage (IndexedDB via Dexie) | Browser/Client (`db/schema.ts` module) | Phase 1 should declare the schema module and open the DB so later phases (2–4) inherit a working connection, but should NOT read/write real tournament data yet — that starts in Phase 2 per the CONTEXT.md phase boundary. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| svelte | 5.56.4 | UI framework, runes reactivity | Locked in CLAUDE.md; confirmed current on npm registry `[VERIFIED: npm registry]` and matches `create-vite`'s own template pin `[VERIFIED: GitHub vite template package.json]` |
| vite | 8.1.3 | Build tool / dev server | Locked in CLAUDE.md; confirmed current `[VERIFIED: npm registry]`; Node 22.23.1 present in this environment satisfies Vite 8's `engines: "^20.19.0 || >=22.12.0"` requirement `[VERIFIED: node --version]` |
| @sveltejs/vite-plugin-svelte | 7.1.2 | Compiles `.svelte` under Vite | Locked in CLAUDE.md; confirmed current `[VERIFIED: npm registry]`; hard peer requirement `vite: "^8.0.0-beta.7 || ^8.0.0"` — do not pair with Vite 7 |
| tailwindcss | 4.3.2 | Utility CSS engine | Locked in CLAUDE.md; confirmed current `[VERIFIED: npm registry]` |
| @tailwindcss/vite | 4.3.2 | Vite-native Tailwind plugin (no PostCSS config needed) | Locked in CLAUDE.md; confirmed current `[VERIFIED: npm registry]` |
| vite-plugin-pwa | 1.3.0 | Manifest + Workbox service worker generation | Locked in CLAUDE.md; confirmed current `[VERIFIED: npm registry]`; peer range covers Vite 8 |
| dexie | 4.4.4 | IndexedDB wrapper (schema scaffold only in this phase) | Locked in CLAUDE.md; confirmed current `[VERIFIED: npm registry]`. Real read/write use starts Phase 2; Phase 1 only opens the DB connection. |
| typescript | 6.0.3 | Static typing | Locked in CLAUDE.md; confirmed current `[VERIFIED: npm registry]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @lucide/svelte | 1.23.0 | Icon components (nav icons, theme toggle, update banner) | **Replaces the UI-SPEC's `lucide-svelte`, which is deprecated** `[VERIFIED: npm registry — deprecated field + official successor confirmed via lucide.dev/GitHub]`. Requires `svelte: "^5"` — exact match. Import pattern: `import { Settings2 } from '@lucide/svelte'` (PascalCase of UI-SPEC's kebab-case names: `settings-2`→`Settings2`, `users`→`Users`, `target`→`Target`, `trophy`→`Trophy`). |
| @vite-pwa/assets-generator | 1.0.2 | Generates all PWA icon sizes/maskable variant from one source image | Run once during scaffold (per D-06's generic archery icon) `[VERIFIED: npm registry]` |
| dexie-export-import | 4.4.0 | Export/import Dexie DB as JSON | Not needed until Phase 2 presets exist; scaffold-time install is harmless but not required in Phase 1's task list |
| vitest | 4.1.9 | Unit test runner | `[VERIFIED: npm registry]`. Note: `nyquist_validation` is disabled in this project's config — treat as standard dev tooling, not a phase gate. |
| @testing-library/svelte | 5.4.2 | Component testing | `[VERIFIED: npm registry]` |
| @playwright/test | 1.61.1 | E2E + offline-mode simulation (`context.setOffline(true)`) | Use for the "install + airplane mode" acceptance test central to this phase's success criteria |
| svelte-check | 4.7.1 | Type-checks `.svelte` files | `[VERIFIED: npm registry]` |
| eslint-plugin-svelte | 3.20.0 | Lint `.svelte` | `[VERIFIED: npm registry]` |
| prettier-plugin-svelte | 4.1.1 | Format `.svelte` | `[VERIFIED: npm registry]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@lucide/svelte` | Keep `lucide-svelte` | Works today (not yet removed from registry) but is explicitly deprecated upstream with no future updates — adopting it now in a greenfield project creates immediate technical debt for zero benefit. |
| `localStorage` for theme persistence | Dexie `settings` table for theme persistence | Dexie's `liveQuery`/IndexedDB access is asynchronous, so reading it before first paint would either flash the wrong theme (FOUC) or require blocking app boot on a DB round-trip. `localStorage` is synchronous and can run inline in `<head>` before any paint — the standard, official Tailwind-recommended pattern. Theme preference is a single scalar, not relational tournament data, so it falls outside CLAUDE.md's "don't use localStorage for tournament data" prohibition (that guidance targets shooters/scores/classes, not a UI preference flag). |
| `generateSW` (Workbox default) | `injectManifest` (hand-written SW) | Only relevant if the app later adds real network calls needing selective caching (e.g. a hypothetical v2 sync feature). Not applicable to a fully static SPA. |

**Installation:**
```bash
npm create vite@latest -- --template svelte-ts   # scaffolds vite@^8.1, svelte@^5.56, @sveltejs/vite-plugin-svelte@^7.1 already pinned correctly
npm install -D tailwindcss@^4.3 @tailwindcss/vite@^4.3
npm install -D vite-plugin-pwa@^1.3 @vite-pwa/assets-generator@^1.0
npm install dexie@^4.4
npm install @lucide/svelte@^1.23
npm install -D typescript@^6.0
npm install -D vitest@^4.1 @testing-library/svelte@^5.4 @playwright/test@^1.61 svelte-check@^4.7 eslint-plugin-svelte@^3.20 prettier-plugin-svelte@^4.1
```

**Version verification:** All versions above were confirmed via `npm view <pkg> version` against the live npm registry on 2026-07-03 (see Package Legitimacy Audit for full provenance). The `create-vite` svelte-ts template's own `package.json` (fetched from `vitejs/vite` GitHub `main` branch) independently confirms `vite@^8.1.1` + `svelte@^5.56.4` + `@sveltejs/vite-plugin-svelte@^7.1.2` are the current, mutually-compatible triad — this removes any risk of the manual CLAUDE.md pins having drifted from what the tooling itself now scaffolds.

## Package Legitimacy Audit

`slopcheck 0.6.1` was installed and run with `--ecosystem npm` against every package this phase installs (run from an isolated scratch directory to avoid touching the project tree).

| Package | Registry | Age | Downloads/wk | Source Repo | slopcheck | Disposition |
|---------|----------|-----|--------------|--------------|-----------|-------------|
| svelte | npm | 10 yrs | 5.4M | github.com/sveltejs/svelte | OK | Approved |
| vite | npm | 6 yrs | 147M | github.com/vitejs/vite | OK | Approved |
| @sveltejs/vite-plugin-svelte | npm | 5 yrs | 2.9M | github.com/sveltejs/vite-plugin-svelte | OK | Approved |
| tailwindcss | npm | 9 yrs | 118M | github.com/tailwindlabs/tailwindcss | OK | Approved |
| @tailwindcss/vite | npm | 2 yrs | 37M | github.com/tailwindlabs/tailwindcss | OK | Approved |
| vite-plugin-pwa | npm | 6 yrs | 3.3M | github.com/vite-pwa/vite-plugin-pwa | OK | Approved |
| dexie | npm | 12 yrs | 1.8M | github.com/dexie/Dexie.js | OK | Approved |
| typescript | npm | 14 yrs | 217M | github.com/microsoft/TypeScript | OK | Approved |
| @vite-pwa/assets-generator | npm | 3 yrs | 233K | github.com/vite-pwa/assets-generator | OK | Approved |
| dexie-export-import | npm | 8 yrs | 21K | github.com/dexie/Dexie.js | OK | Approved |
| @testing-library/svelte | npm | 7 yrs | 633K | github.com/testing-library/svelte-testing-library | OK | Approved |
| @playwright/test | npm | 6 yrs | 42M | github.com/microsoft/playwright | OK | Approved |
| svelte-check | npm | 6 yrs | 2.0M | github.com/sveltejs/language-tools | OK | Approved |
| eslint-plugin-svelte | npm | 5 yrs | 1.2M | github.com/sveltejs/eslint-plugin-svelte | OK | Approved |
| prettier-plugin-svelte | npm | 8 yrs | 1.3M | github.com/sveltejs/prettier-plugin-svelte | OK | Approved |
| vitest | npm | 4 yrs | 68.6M | github.com/vitest-dev/vitest | SUS | **False positive — see note below. Approved.** |
| lucide-svelte | npm | 4 yrs | 413K | github.com/lucide-icons/lucide | OK (but `npm view` flags `deprecated`) | **REMOVED — deprecated upstream** |
| @lucide/svelte | npm | 1.4 yrs | 519K | github.com/lucide-icons/lucide | OK | **Approved — replaces `lucide-svelte`** |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `vitest` — slopcheck's heuristic flagged it as "suspiciously close to 'vite', could be a typosquat." This is a confirmed false positive: `vitest` is the official Vite-native test runner maintained by the Vitest/Vite core team (68.6M weekly downloads, 4-year-old package, `github.com/vitest-dev/vitest`, already named as a locked dev-dependency in CLAUDE.md). No action needed; the planner does not need a `checkpoint:human-verify` gate for this one specific package, but should note the false-positive reasoning if slopcheck is re-run in CI later.
**Additional finding (not a slopcheck verdict, found via `npm view ... deprecated`):** `lucide-svelte`, the package named in the locked UI-SPEC, returns `"Package deprecated. Please use @lucide/svelte instead."` from the registry. It is not hallucinated or malicious (slopcheck itself returns OK), but it is unmaintained going forward. **Recommendation: substitute `@lucide/svelte` for `lucide-svelte` throughout planning and implementation.** This is a package-name-only change; the import syntax (`import { IconName } from '@lucide/svelte'`) and PascalCase icon-name convention are identical.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────── BUILD TIME (Vite 8) ───────────────────────────┐
│  vite.config.ts                                                            │
│   ├─ @tailwindcss/vite  → compiles app.css (Tailwind v4, no config file)  │
│   └─ VitePWA({ registerType:'prompt', manifest, workbox.globPatterns })   │
│        → emits: dist/manifest.webmanifest, dist/sw.js (Workbox precache)  │
└───────────────────────────────────┬────────────────────────────────────────┘
                                     │ build output served as static files
                                     ▼
┌────────────────────────── BROWSER (installed PWA) ─────────────────────────┐
│ index.html (loads inline boot script BEFORE Svelte mounts)                 │
│   → reads localStorage.theme (or matchMedia fallback) → sets <html class>  │
│        (prevents FOUC — must run synchronously, before first paint)        │
│                                                                             │
│ main.ts                                                                    │
│   ├─ mounts App.svelte                                                    │
│   ├─ registerSW({ onNeedRefresh, onOfflineReady }) from 'virtual:pwa-register'│
│   └─ opens Dexie db (schema.ts) — connection only, no data ops this phase │
│                                                                             │
│ App.svelte                                                                 │
│   ├─ TopAppBar (app name + ThemeToggle, writes localStorage + <html class>)│
│   ├─ UpdateBanner (shown only when onNeedRefresh fired; session-dismissible)│
│   ├─ Nav (breakpoint <768px → BottomTabBar, ≥768px → Sidebar)             │
│   │     4 items: Einrichtung / Schützen / Erfassung / Ergebnisse           │
│   └─ <slot>/routed section → one of 4 PlaceholderScreen instances          │
│         (no router library — plain reactive $state selecting which view)  │
│                                                                             │
│ Service Worker (registered from precached sw.js)                          │
│   └─ intercepts all fetches → serves precached app shell → offline-capable│
└─────────────────────────────────────────────────────────────────────────────┘
```
A trainer's install-and-launch-offline flow traces: build emits manifest+SW → browser installs PWA (reads manifest) → browser launches in airplane mode → SW serves precached `index.html`/JS/CSS with zero network → inline boot script sets theme synchronously → Svelte mounts shell → nav/placeholder screens render fully, satisfying all 4 success criteria without a single network request.

### Recommended Project Structure
```
src/
├── main.ts                     # mounts App, registers SW (registerType:'prompt'), opens Dexie
├── App.svelte                  # top-level shell: TopAppBar + UpdateBanner + Nav + active section
├── app.css                     # @import "tailwindcss"; @custom-variant dark (&:where(.dark, .dark *));
├── lib/
│   ├── db/
│   │   └── schema.ts           # Dexie subclass, db.version(1).stores({...}) — empty/minimal in Phase 1
│   ├── stores/
│   │   └── theme.svelte.ts     # $state-based theme rune: reads/writes localStorage, exposes toggle()
│   ├── i18n/
│   │   └── strings.de.ts       # D-08: centralized German UI copy module (single source, ready for future locales)
│   ├── components/
│   │   ├── TopAppBar.svelte
│   │   ├── ThemeToggle.svelte
│   │   ├── UpdateBanner.svelte
│   │   ├── BottomTabBar.svelte
│   │   ├── Sidebar.svelte
│   │   ├── NavItem.svelte       # shared by both nav forms; accepts `disabled` prop (D-15 provision)
│   │   ├── GlassCard.svelte     # reusable glass-surface wrapper (cards/panels/nav per D-11)
│   │   └── PlaceholderScreen.svelte  # generic "{Bereich} kommt bald" screen, parameterized
│   └── views/
│       ├── SetupPlaceholder.svelte
│       ├── RegistrationPlaceholder.svelte
│       ├── ScoringPlaceholder.svelte
│       └── ResultsPlaceholder.svelte
├── vite-env.d.ts
public/
├── pwa-192x192.png, pwa-512x512.png, maskable-icon-512x512.png, apple-touch-icon.png  # from @vite-pwa/assets-generator
pwa-assets.config.ts            # source icon + generation targets
vite.config.ts                  # tailwindcss() + VitePWA({...})
```

### Pattern 1: FOUC-free theme boot with persisted manual override (PLAT-03)
**What:** An inline `<script>` in `index.html`'s `<head>` (before any stylesheet/Svelte bundle loads) synchronously reads `localStorage.theme`, falls back to `matchMedia('(prefers-color-scheme: dark)')` if unset, and toggles a `dark` class on `<html>`. Tailwind v4's `@custom-variant dark` then targets that class. The Svelte `ThemeToggle` component only needs to flip the class + write `localStorage` on click; it does not own initial detection.
**When to use:** Any dark-mode implementation where the toggle must persist across restarts without a flash of incorrect theme — this is the official Tailwind-recommended pattern.
**Example:**
```html
<!-- index.html, inside <head>, before app bundle -->
<script>
  document.documentElement.classList.toggle(
    'dark',
    localStorage.theme === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
</script>
```
```css
/* src/app.css */
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```
```ts
// src/lib/stores/theme.svelte.ts
let isDark = $state(document.documentElement.classList.contains('dark'));

export function toggleTheme() {
  isDark = !isDark;
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.theme = isDark ? 'dark' : 'light';
}
export function currentIsDark() { return isDark; }
```
*Source: Tailwind CSS official docs (docs/dark-mode), fetched 2026-07-03 — `[CITED: tailwindcss.com/docs/dark-mode]`*

### Pattern 2: `registerType: 'prompt'` with a custom banner (D-01–D-04)
**What:** Configure `vite-plugin-pwa` with `registerType: 'prompt'` so a new service worker installs in the background but does **not** auto-activate. Wire the generated `virtual:pwa-register` module's `onNeedRefresh` callback to local Svelte state that renders the UI-SPEC's dismissible update banner, calling the returned `updateSW()` function only when the trainer taps "Aktualisieren."
**When to use:** Exactly this project's D-01 requirement — avoid an unexpected reload disrupting live score entry.
**Note on conflicting prior research:** The project's own earlier `.planning/research/PITFALLS.md` (Pitfall 2) recommended `autoUpdate` for simplicity. **This is superseded by the explicit, later user decision D-01 in CONTEXT.md — `registerType: 'prompt'` is the locked, correct choice for this phase.** Treat CONTEXT.md as authoritative over the older cross-phase pitfalls doc.
**Example:**
```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svelte(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
      manifest: {
        name: 'InstantBogenturnier',
        short_name: 'InstantBogenturnier',
        description: 'Bogen-Trainingsturnier Verwaltung',
        theme_color: '#14B8A6',
        background_color: '#F8FAFC',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
```
```ts
// src/main.ts
import { registerSW } from 'virtual:pwa-register';
import { updateAvailable } from './lib/stores/updateBanner.svelte';

const updateSW = registerSW({
  onNeedRefresh() { updateAvailable.set(true); },   // shows the D-02 banner
  onOfflineReady() { /* no UI required per spec — silent */ },
});

export { updateSW }; // called by UpdateBanner's "Aktualisieren" button
```
*Source: vite-pwa-org.netlify.app/guide/prompt-for-update (fetched 2026-07-03) `[CITED: vite-pwa-org.netlify.app]`, cross-checked against CLAUDE.md's own `registerType: 'prompt'` guidance `[CITED: CLAUDE.md]`*

### Pattern 3: Responsive nav-form switch at a single breakpoint (D-13, D-14, UI-SPEC)
**What:** One `Nav` data source (array of 4 items with icon/label/disabled), rendered by either `BottomTabBar` (below `768px`) or `Sidebar` (`768px`+) via Tailwind's `md:` breakpoint pair (`flex md:hidden` / `hidden md:flex`), never both mounted-and-visible simultaneously to avoid duplicate interactive elements for assistive tech.
**When to use:** Any phone-vs-tablet/desktop nav-form switch with a single defined breakpoint (locked in UI-SPEC at exactly `768px`/Tailwind `md`).
**Example:**
```svelte
<!-- App.svelte -->
<BottomTabBar {items} class="flex md:hidden" />
<Sidebar {items} class="hidden md:flex" />
```

### Pattern 4: Glass surface as a single reusable token set, explicitly excluded from data-dense surfaces (D-10, D-11, D-12)
**What:** Define glass styling once (`GlassCard.svelte` or a Tailwind `@utility` class) using `backdrop-blur-sm` (exactly 8px, matches UI-SPEC), semi-transparent background, and a light border — applied only to nav/cards/panels. Also define a `surface-opaque` counterpart (solid, no blur) reserved for the future score-entry table (Phase 3), so the exception is structurally present from day one rather than retrofitted.
**Example:**
```css
/* src/app.css */
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@utility glass-surface {
  background-color: rgb(255 255 255 / 0.70);
  border: 1px solid rgb(255 255 255 / 0.45);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 24px rgb(15 23 42 / 0.08);
}
.dark .glass-surface {
  background-color: rgb(30 41 59 / 0.72);
  border-color: rgb(255 255 255 / 0.06);
  box-shadow: 0 4px 24px rgb(0 0 0 / 0.35);
}
```
Tailwind's default palette already supplies every named color in the UI-SPEC (`slate-50`, `slate-800`, `slate-900`, `teal-400`, `teal-500`, `red-400`, `red-600`) — **no custom `@theme` color tokens are needed**, only class usage like `bg-slate-50 dark:bg-slate-900`, `text-teal-500 dark:text-teal-400`. `[CITED: tailwindcss.com/docs/colors — OKLCH values cross-referenced against the well-known v3 hex palette the UI-SPEC quotes directly, MEDIUM-HIGH confidence]`.

### Anti-Patterns to Avoid
- **Reading theme preference from Dexie/IndexedDB before first paint:** causes a visible flash of the wrong theme, since IndexedDB access is always asynchronous. Use `localStorage` (synchronous) instead for this one value.
- **Two simultaneously-mounted-and-interactive nav forms** (e.g., both tab bar and sidebar rendered with only `display:none` via a class that some assistive tech still reads as present) — use `hidden`/conditional rendering, not just visual `opacity:0`.
- **Wiring `onNeedRefresh` to nothing** (a documented real-world vite-plugin-pwa footgun per this project's own PITFALLS.md Pitfall 2) — with `registerType: 'prompt'`, if the callback isn't wired to a visible UI element, updates silently never activate. The D-01–D-04 banner IS that required wiring — it is not optional polish, it is functionally load-bearing.
- **Testing PWA installability/offline only against `vite dev`** — the dev server never registers a real service worker. Every phase-exit check must run against `vite build && vite preview` (or equivalent static serve) with devtools "Offline" toggled on.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service worker precaching / offline detection | Custom `fetch` event listener + manual cache API bookkeeping | `vite-plugin-pwa` `generateSW` strategy | Workbox handles cache versioning, stale-cache cleanup (`cleanupOutdatedCaches`), and precache manifest generation correctly; hand-rolled SW logic is a well-documented source of stale-cache bugs (see project's own PITFALLS.md Pitfall 2). |
| PWA icon set (multiple sizes, maskable, apple-touch-icon) | Manually exporting N PNG sizes from a design tool | `@vite-pwa/assets-generator` | One source image → correct, complete icon set; avoids missing-size Lighthouse installability failures. |
| Dark-mode media-query + override logic | Custom `matchMedia` listener wired to component state, reinvented per project | Tailwind v4's `@custom-variant dark` + the documented `localStorage` pattern | This is the exact, officially documented Tailwind v4 idiom — reinventing it risks the well-known FOUC bug or missing the "manual override persists, but system-preference still applies until first override" nuance PLAT-03 requires. |
| Icon set | Hand-drawn/hand-sourced SVGs per icon | `@lucide/svelte` (tree-shakeable, per-icon import) | Consistent stroke width/style across dozens of future icons, zero runtime fetch (fully offline-safe), matches UI-SPEC's exact icon choices. |

**Key insight:** Every "don't hand-roll" item in this phase exists specifically because the project's core value (works fully offline, on the first try, at the range) is directly undermined by subtly-wrong hand-rolled PWA/theming code that "looks done" in a normal dev-server session but fails only in the specific offline/production-build/no-second-chance conditions this app must handle correctly the first time.

## Common Pitfalls

### Pitfall 1: FOUC (flash of unstyled/wrong-theme content) from async theme detection
**What goes wrong:** If the dark/light class is set inside a Svelte `onMount`/`$effect` (which runs after initial render) or from an async source (Dexie), the page paints once in the wrong theme, then flips — visible as a jarring flash, especially bad in a glassmorphism design with translucent surfaces.
**Why it happens:** Developers put "app logic" (theme detection) inside the framework's lifecycle, forgetting that the framework itself hasn't rendered anything yet at the point synchronous detection needs to happen.
**How to avoid:** Inline `<script>` in `<head>`, before the Svelte bundle's `<script type=module>` tag, reading only synchronous APIs (`localStorage`, `matchMedia`).
**Warning signs:** A visible color flash on reload, especially noticeable when toggling airplane mode and reloading (this phase's own acceptance test).

### Pitfall 2: `registerType: 'prompt'` silently doing nothing (no banner ever appears)
**What goes wrong:** The service worker installs a waiting update in the background, but if `onNeedRefresh` isn't wired to real UI (or the banner component isn't actually mounted at the app root), the trainer never sees D-02's "Ein Update ist verfügbar" banner and the app is stuck on the old version forever (never even prompted) — the opposite failure mode from Pitfall 2 in `.planning/research/PITFALLS.md`, but equally silent.
**Why it happens:** `registerSW()`'s callbacks are easy to stub out or leave as `console.log` during early scaffolding and forget to finish.
**How to avoid:** Treat the update-banner wiring as part of this phase's core deliverable (it directly implements D-01–D-04, which map to PLAT-01's "offline+update-safe" intent), not an optional nice-to-have layered on later. Manually test by publishing two builds locally and confirming the banner appears on the second load.
**Warning signs:** `onNeedRefresh` callback body is empty or just logs to console; no manual test of "build twice, reload, see banner" exists.

### Pitfall 3: `lucide-svelte` (deprecated) accidentally installed instead of `@lucide/svelte`
**What goes wrong:** Because the UI-SPEC document literally names `lucide-svelte`, a planner/implementer following it literally without re-checking the registry will install the deprecated package. It still technically works today, but receives no further updates, icon additions, or bug fixes, and diverges from the actively maintained package sharing the exact same GitHub org/repo.
**Why it happens:** UI-SPEC was written before this research ran; deprecation notices don't show up unless someone actually runs `npm view <pkg> deprecated` or reads the npm page.
**How to avoid:** Install `@lucide/svelte`, not `lucide-svelte`, per this research's correction. Import syntax is otherwise unchanged.
**Warning signs:** `npm install` prints an `npm warn deprecated lucide-svelte@1.0.1` line (confirmed reproducible in this research session) — do not ignore this warning if seen during scaffolding.

### Pitfall 4: Building/testing only via `vite dev`, never the production SW-cached build
**What goes wrong:** This phase's #1 and #2 success criteria (installable, works with zero connectivity) cannot be validated at all against the dev server — it never registers a service worker. A developer can spend the whole phase believing everything works, then discover at the very end that offline mode is broken.
**Why it happens:** `vite dev`'s HMR loop is far more pleasant to iterate against than rebuilding + re-serving statically each time.
**How to avoid:** Make "`vite build && vite preview`, then toggle devtools Offline, then reload" a required manual check run at the *end of every task*, not just once before phase sign-off — directly reflects this project's own PITFALLS.md Pitfall 7 finding, specifically relevant because this is the foundational PWA phase where the pattern must be established.
**Warning signs:** No task in the eventual PLAN.md's verification steps mentions `vite preview` or offline toggling.

## Code Examples

### Placeholder screen component (D-16), parameterized
```svelte
<!-- src/lib/components/PlaceholderScreen.svelte -->
<script lang="ts">
  import type { Component } from 'svelte';
  let { icon: Icon, heading, body }: { icon: Component; heading: string; body: string } = $props();
</script>

<div class="flex flex-col items-center justify-center gap-6 max-w-[480px] mx-auto pt-16 text-center">
  <div class="glass-surface rounded-full p-6">
    <Icon size={48} class="text-slate-500 dark:text-slate-400" />
  </div>
  <h1 class="text-[28px] font-semibold leading-tight text-slate-900 dark:text-slate-50">{heading}</h1>
  <p class="text-base text-slate-600 dark:text-slate-300">{body}</p>
</div>
```

### Centralized German strings module (D-08)
```ts
// src/lib/i18n/strings.de.ts
export const strings = {
  appName: 'InstantBogenturnier',
  nav: {
    setup: 'Einrichtung',
    registration: 'Schützen',
    scoring: 'Erfassung',
    results: 'Ergebnisse',
  },
  updateBanner: { body: 'Ein Update ist verfügbar.', confirm: 'Aktualisieren', dismiss: 'Später' },
  placeholder: {
    heading: (section: string) => `${section} kommt bald`,
    body: 'Diese Funktion wird in einer kommenden Version freigeschaltet.',
  },
  theme: {
    ariaToDark: 'Zu Dunkelmodus wechseln',
    ariaToLight: 'Zu Hellmodus wechseln',
  },
} as const;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `tailwind.config.js` (JS-based config) | CSS-first `@import "tailwindcss"` + `@theme`/`@custom-variant`/`@utility` directives | Tailwind v4 (2025) | No config file needed for this phase; dark-mode variant and glass utility both defined directly in `app.css`. |
| `lucide-svelte` | `@lucide/svelte` | Package split ~Jan 2025 (per npm `time.created` for `@lucide/svelte`) | Locked UI-SPEC needs correcting; otherwise zero code-level impact. |
| Rollup-based Vite (≤7.x) | Rolldown-based unified bundler (Vite 8, March 2026) | 2026-03-12 | No action needed for this project — all locked plugins already declare Vite 8 peer support, and the official `create-vite` template already targets it. |

**Deprecated/outdated:**
- `lucide-svelte`: superseded by `@lucide/svelte`; no further updates expected.
- `pwa-asset-generator` (Puppeteer-based, different package from the one used here): superseded by `@vite-pwa/assets-generator` for this ecosystem — already correctly excluded per CLAUDE.md's "What NOT to Use."

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@lucide/svelte`'s icon component prop API (size/color/strokeWidth) is functionally identical to `lucide-svelte`'s for the 4 icons this phase needs (`settings-2`→`Settings2`, `users`→`Users`, `target`→`Target`, `trophy`→`Trophy`) | Standard Stack / Code Examples | LOW — both packages are generated from the same underlying Lucide icon-source monorepo; worst case is a prop-name mismatch caught immediately by `svelte-check`/TypeScript at build time, not a runtime surprise. |
| A2 | Tailwind v4's default `slate`/`teal`/`red` OKLCH shade values render as visually identical colors to the specific hex values the UI-SPEC quotes (`#F8FAFC`, `#0F172A`, `#14B8A6`, `#2DD4BF`, etc.) | Architecture Patterns / Pattern 4 | LOW-MEDIUM — OKLCH and the legacy hex values were confirmed to correspond via official docs cross-reference, but no pixel-level color comparison was run in this session. If a shade looks visibly off during implementation, fall back to explicit `@theme` overrides with the literal hex values from UI-SPEC — trivial to add if needed. |

## Open Questions

1. **Should `dexie-export-import` be installed in Phase 1 or deferred to the preset-saving phase (Phase 2)?**
   - What we know: It's cheap, has no downside to installing early, and is already in CLAUDE.md's locked stack.
   - What's unclear: Phase 1's CONTEXT.md explicitly scopes out "real feature content," and this package has zero utility until Phase 2 presets exist.
   - Recommendation: Defer the actual `npm install` to Phase 2 planning; no need to carry an unused dependency through Phase 1's walking-skeleton scaffold.

2. **Walking-skeleton "one real interaction" — should it touch Dexie, or is the theme toggle (via localStorage) sufficient?**
   - What we know: The project's MVP/walking-skeleton guidance calls for "one real UI interaction" proving the stack end-to-end; this phase's CONTEXT.md explicitly limits Phase 1 to shell/theming/nav/PWA infrastructure with zero real feature data.
   - What's unclear: Whether "real interaction" must specifically exercise Dexie/IndexedDB (the project's actual persistence layer) to count as proving the full stack, or whether the theme toggle (a real, persisted, user-visible interaction using `localStorage`) satisfies the walking-skeleton intent on its own.
   - Recommendation: Treat the theme toggle as Phase 1's qualifying "real interaction" (it is genuinely interactive, persisted, and testable end-to-end), while still scaffolding `db/schema.ts` and opening an empty Dexie database on boot — this proves IndexedDB opens successfully in this project's target browsers/PWA context without requiring Phase 1 to invent throwaway feature data just to exercise Dexie. Flag this interpretation for the planner to confirm or override.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite 8 build/dev toolchain | ✓ | v22.23.1 | — (already satisfies `^20.19.0 \|\| >=22.12.0`) |
| npm | Package installation | ✓ | 10.9.8 | — |
| Python/pip (dev-machine only, not shipped) | `slopcheck` legitimacy tooling used during this research | ✓ | slopcheck 0.6.1 installed successfully | — |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none — no other external tools/services are required for this phase (fully client-side, static-host deployable).

## Security Domain

`security_enforcement` is not explicitly disabled in `.planning/config.json` (absent key ⇒ treated as enabled), but this phase is a fully static, client-only, no-auth, no-backend, no-network-call app — most ASVS categories are structurally not applicable.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | No accounts/login exist in this app (single-device, single-operator by design per PROJECT.md). |
| V3 Session Management | No | No sessions/cookies — a static SPA with local persistence only. |
| V4 Access Control | No | Single local user, no roles. |
| V5 Input Validation | No (not yet) | This phase has no user text-entry fields (placeholder screens only); becomes relevant starting Phase 2 (shooter names, class definitions) — flag for that phase's research, not this one. |
| V6 Cryptography | No | No secrets, no data transmission; IndexedDB is unencrypted at rest by design (already flagged in the project's own PITFALLS.md as a low-risk, documented tradeoff for non-sensitive training-tournament data). |
| V14 Configuration | Yes | Serve over HTTPS (or `localhost` for dev) — **required** for service worker registration and PWA installability; document this in deployment notes even though the phase itself doesn't configure hosting. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Service worker scope confusion (SW registered at wrong scope hijacks unrelated paths on the same origin) | Tampering / Elevation of Privilege | Not a realistic risk here (single-purpose dedicated app, root-scoped, no shared origin), but keep `manifest.scope`/`start_url` and Vite's `base` aligned if ever deployed under a sub-path — see `.planning/research/STACK.md`'s existing note on this. |
| Stale/malicious cached asset served offline after a compromised deploy | Tampering | Standard build/deploy pipeline integrity (out of scope for this phase's code, relevant to CI/CD setup later) — no action needed in Phase 1 itself. |

## Sources

### Primary (HIGH confidence)
- npm registry, `npm view <pkg> version/deprecated/peerDependencies/engines/time.created`, checked 2026-07-03 — authoritative current versions for all 18 packages listed in Standard Stack/Supporting/Package Legitimacy Audit
- `slopcheck 0.6.1` (`pip install slopcheck`), run with `--ecosystem npm` against all 18 packages — legitimacy scan, one false-positive (`vitest`) investigated and cleared
- `raw.githubusercontent.com/vitejs/vite/main/packages/create-vite/template-svelte-ts/package.json` — confirmed the official scaffold template's own pinned versions match CLAUDE.md's locked stack exactly
- `api.npmjs.org/downloads/point/last-week/<pkg>` — weekly download counts used to corroborate legitimacy for every package in the audit table, including cross-checking the `vitest`/`vite` false-positive

### Secondary (MEDIUM confidence)
- tailwindcss.com/docs/dark-mode (fetched 2026-07-03) — `@custom-variant dark` + `localStorage` FOUC-safe pattern `[CITED]`
- tailwindcss.com/docs/backdrop-filter-blur (fetched 2026-07-03) — exact `backdrop-blur-sm` = 8px mapping to UI-SPEC's blur value `[CITED]`
- tailwindcss.com/docs/colors (fetched 2026-07-03) — OKLCH values for slate/teal/red shades, cross-referenced against UI-SPEC's quoted hex values (v3-era hex ↔ v4 OKLCH correspondence not independently pixel-verified — see Assumptions Log A2)
- vite-pwa-org.netlify.app/guide/prompt-for-update — `registerType: 'prompt'` + `virtual:pwa-register` wiring pattern `[CITED]`
- vite-pwa-org.netlify.app/assets-generator — `@vite-pwa/assets-generator` config/output structure `[CITED]`
- WebSearch (lucide.dev/guide/svelte, GitHub lucide-icons/lucide issue #3752, npmjs.com/package/@lucide/svelte) — confirmed `@lucide/svelte` is the deprecation successor, import syntax, `svelte:"^5"` peer requirement — MEDIUM confidence (WebSearch-sourced, cross-checked against `npm view` registry metadata directly)

### Tertiary (LOW confidence)
- None — all findings in this document were either registry-verified or cross-checked against official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version independently re-verified against the live npm registry in this session, not carried over from training data or the prior project-level research alone
- Architecture: HIGH — patterns directly sourced from official Tailwind/vite-plugin-pwa docs and this project's own locked CONTEXT.md/UI-SPEC decisions, not invented
- Pitfalls: HIGH for PWA/theming mechanics (Context7-equivalent official doc verification), MEDIUM for the walking-skeleton interpretation question (genuinely underspecified, flagged as Open Question 2)

**Research date:** 2026-07-03
**Valid until:** 2026-08-02 (30 days — stable ecosystem, but Vite 8 is only ~4 months old as of this research; re-verify peer-dependency ranges if planning is delayed past this window)

---
*Phase 1 research for: InstantBogenturnier — offline-first archery training-tournament PWA shell*
*Researched: 2026-07-03*
