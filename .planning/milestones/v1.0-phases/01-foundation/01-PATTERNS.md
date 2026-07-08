# Phase 1: Foundation - Pattern Map

**Mapped:** 2026-07-03
**Files analyzed:** 21 (all new — no modified files, greenfield project)
**Analogs found:** 0 / 21 (no application source code exists anywhere in this repository)

## Greenfield Notice — Read This First

This repository contains **no application source code**. The working tree at the time of this mapping is:

```
/home/code/MeinBogenturnier
├── CLAUDE.md
├── specs.md
├── .claude/settings.local.json
└── .planning/  (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, research/, phases/01-foundation/)
```

There is no `src/`, no `package.json`, no `vite.config.ts`, no prior Svelte component, no prior Dexie schema, no prior test — **nothing to copy an existing pattern from**. Phase 1 is the first phase that writes any code at all (confirmed explicitly in `01-CONTEXT.md`'s `<code_context>` block: "no reusable components, established patterns, or integration points to note").

Because of this, the normal "Pattern Assignments" table (new file → existing analog file → excerpt) is not populate-able. Instead, this document maps each planned new file to the **closest available reference material**, which is `01-RESEARCH.md`'s own `Architecture Patterns` and `Code Examples` sections (themselves sourced from official Tailwind/vite-plugin-pwa docs and this project's own locked `01-CONTEXT.md`/`01-UI-SPEC.md` decisions — not invented). The planner should treat the RESEARCH.md excerpts reproduced below as the de facto "analog code" for this phase only. **From Phase 2 onward, this greenfield situation will not recur** — Phase 2's pattern-mapper will have Phase 1's actual shipped files (e.g. `db/schema.ts`, `strings.de.ts`, `GlassCard.svelte`) to use as real analogs.

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|-----------------|---------------|
| `index.html` | config/entry | request-response (boot) | none (greenfield) | no-analog — see RESEARCH.md Pattern 1 |
| `vite.config.ts` | config | build-time transform | none (greenfield) | no-analog — see RESEARCH.md Pattern 2 |
| `pwa-assets.config.ts` | config | build-time transform (icon generation) | none (greenfield) | no-analog — see RESEARCH.md Standard Stack / Installation |
| `src/main.ts` | controller (app bootstrap) | event-driven (SW lifecycle) | none (greenfield) | no-analog — see RESEARCH.md Pattern 2, System Architecture Diagram |
| `src/App.svelte` | component (shell/composition root) | request-response (renders active section) | none (greenfield) | no-analog — see RESEARCH.md Pattern 3, System Architecture Diagram |
| `src/app.css` | config (styling tokens) | transform (CSS build) | none (greenfield) | no-analog — see RESEARCH.md Pattern 1 & Pattern 4 |
| `src/lib/db/schema.ts` | model (Dexie schema) | CRUD (schema declaration only, no ops in Phase 1) | none (greenfield) | no-analog — see RESEARCH.md Recommended Project Structure, Architectural Responsibility Map |
| `src/lib/stores/theme.svelte.ts` | store | event-driven (state + localStorage side effect) | none (greenfield) | no-analog — see RESEARCH.md Pattern 1 |
| `src/lib/stores/updateBanner.svelte.ts` | store | event-driven (SW callback → UI state) | none (greenfield) | no-analog — see RESEARCH.md Pattern 2 |
| `src/lib/i18n/strings.de.ts` | config (centralized copy module) | transform (static lookup) | none (greenfield) | no-analog — see RESEARCH.md Code Examples: "Centralized German strings module" |
| `src/lib/components/TopAppBar.svelte` | component | request-response | none (greenfield) | no-analog — see 01-UI-SPEC.md Layout & Navigation §Top app bar |
| `src/lib/components/ThemeToggle.svelte` | component | event-driven | none (greenfield) | no-analog — see RESEARCH.md Pattern 1 |
| `src/lib/components/UpdateBanner.svelte` | component | event-driven | none (greenfield) | no-analog — see RESEARCH.md Pattern 2, Pitfall 2 |
| `src/lib/components/BottomTabBar.svelte` | component | request-response | none (greenfield) | no-analog — see RESEARCH.md Pattern 3 |
| `src/lib/components/Sidebar.svelte` | component | request-response | none (greenfield) | no-analog — see RESEARCH.md Pattern 3 |
| `src/lib/components/NavItem.svelte` | component | request-response | none (greenfield) | no-analog — see 01-UI-SPEC.md §Nav item disabled state |
| `src/lib/components/GlassCard.svelte` | component | request-response | none (greenfield) | no-analog — see RESEARCH.md Pattern 4 |
| `src/lib/components/PlaceholderScreen.svelte` | component | request-response | none (greenfield) | no-analog — see RESEARCH.md Code Examples: "Placeholder screen component" |
| `src/lib/views/SetupPlaceholder.svelte` | component | request-response | none (greenfield) | no-analog — thin wrapper around `PlaceholderScreen.svelte` (see below) |
| `src/lib/views/RegistrationPlaceholder.svelte` | component | request-response | none (greenfield) | no-analog — thin wrapper around `PlaceholderScreen.svelte` (see below) |
| `src/lib/views/ScoringPlaceholder.svelte` | component | request-response | none (greenfield) | no-analog — thin wrapper around `PlaceholderScreen.svelte` (see below) |
| `src/lib/views/ResultsPlaceholder.svelte` | component | request-response | none (greenfield) | no-analog — thin wrapper around `PlaceholderScreen.svelte` (see below) |

Note: the four `*Placeholder.svelte` view wrappers are not separate patterns — each is `PlaceholderScreen.svelte` invoked with a section-specific icon/heading/body triple from `strings.de.ts` (see Pattern Assignment below). Treat `PlaceholderScreen.svelte` as the single real pattern and the four views as its instantiation.

## Pattern Assignments

Since no codebase analog exists, each assignment below reproduces the exact reference excerpt from `01-RESEARCH.md` (cited by section) that the planner/executor should use as the template for that file. Do not treat these as "inspiration" — they are the locked, decision-driven reference implementation for this phase.

---

### `index.html` (config/entry, request-response)

**Reference:** `01-RESEARCH.md` → Pattern 1 ("FOUC-free theme boot with persisted manual override")

**Inline boot script — must run in `<head>`, before any Svelte bundle `<script type=module>` tag:**
```html
<script>
  document.documentElement.classList.toggle(
    'dark',
    localStorage.theme === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
</script>
```
Rationale (from RESEARCH.md Pitfall 1): this MUST be synchronous (`localStorage`/`matchMedia` only, no Dexie, no `onMount`) or the app will show a visible flash of the wrong theme on load — directly tested by this phase's own offline/reload acceptance check.

---

### `vite.config.ts` (config, build-time transform)

**Reference:** `01-RESEARCH.md` → Pattern 2 ("`registerType: 'prompt'` with a custom banner")

```ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { appName, themeColor, backgroundColor } from './src/lib/config/app.config';

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
        name: appName,
        short_name: appName,
        description: 'Bogen-Trainingsturnier Verwaltung',
        theme_color: themeColor,
        background_color: backgroundColor,
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

**Do NOT use** `registerType: 'autoUpdate'` — explicitly forbidden by `CLAUDE.md`'s "What NOT to Use" table and superseded decision D-01. This is a hard constraint, not a style preference.

---

### `src/main.ts` (controller/bootstrap, event-driven)

**Reference:** `01-RESEARCH.md` → Pattern 2, System Architecture Diagram (BROWSER section)

```ts
import { registerSW } from 'virtual:pwa-register';
import { updateAvailable } from './lib/stores/updateBanner.svelte';

const updateSW = registerSW({
  onNeedRefresh() { updateAvailable.set(true); },   // shows the D-02 banner
  onOfflineReady() { /* no UI required per spec — silent */ },
});

export { updateSW }; // called by UpdateBanner's "Aktualisieren" button
```

Also responsible (per Recommended Project Structure) for mounting `App.svelte` and opening the Dexie DB connection from `lib/db/schema.ts` — connection-open only, no reads/writes in Phase 1 (see Architectural Responsibility Map row "Local database initialization").

**Pitfall to avoid** (RESEARCH.md Pitfall 2): `onNeedRefresh`/`onOfflineReady` must not be stubbed as `console.log` — wiring `onNeedRefresh` to real `UpdateBanner` UI state is load-bearing for D-01–D-04, not optional polish.

---

### `src/App.svelte` (component/shell, request-response)

**Reference:** `01-RESEARCH.md` → Pattern 3 (responsive nav-form switch), System Architecture Diagram

```svelte
<!-- App.svelte -->
<BottomTabBar {items} class="flex md:hidden" />
<Sidebar {items} class="hidden md:flex" />
```

Composition per the System Architecture Diagram: `TopAppBar` (app name + `ThemeToggle`) → `UpdateBanner` (conditional) → `Nav` (breakpoint switch above) → active section view, selected via a plain reactive `$state` variable — **no router library** (explicitly out of scope; a 4-item, always-mounted-shell app has no route-matching complexity to justify one).

---

### `src/app.css` (config/styling tokens, transform)

**Reference:** `01-RESEARCH.md` → Pattern 1 (dark variant) + Pattern 4 (glass utility)

```css
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

Also reserve a `surface-opaque` counterpart now (per D-11/UI-SPEC): light `#FFFFFF` solid, dark `#1E293B` solid, no blur, no transparency — unused in Phase 1 but structurally present so Phase 3's score-entry table doesn't require a CSS-architecture retrofit. No custom `@theme` color tokens are needed — Tailwind's stock `slate`/`teal`/`red` shades already match every UI-SPEC color value (RESEARCH.md Pattern 4 confirmation).

---

### `src/lib/db/schema.ts` (model, CRUD-schema-only)

**Reference:** `01-RESEARCH.md` → Recommended Project Structure, Architectural Responsibility Map (row: "Local database initialization")

No code excerpt is given in RESEARCH.md beyond "Dexie subclass, `db.version(1).stores({...})` — empty/minimal in Phase 1." Planner/executor should follow standard Dexie subclass conventions (per `dexie@4.4.4`, locked in `CLAUDE.md`) to declare an empty or near-empty schema and open the connection — real tables are added starting Phase 2. This file exists so Phase 2 inherits a working connection with zero setup friction (explicit rationale in RESEARCH.md Summary).

---

### `src/lib/stores/theme.svelte.ts` (store, event-driven)

**Reference:** `01-RESEARCH.md` → Pattern 1

```ts
let isDark = $state(document.documentElement.classList.contains('dark'));

export function toggleTheme() {
  isDark = !isDark;
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.theme = isDark ? 'dark' : 'light';
}
export function currentIsDark() { return isDark; }
```

**Constraint reminder:** `localStorage`, not Dexie, for this one scalar — RESEARCH.md's Alternatives Considered explains this is a deliberate, narrow exception to `CLAUDE.md`'s "don't use localStorage for tournament data" rule (theme preference is a UI flag, not relational tournament data).

---

### `src/lib/stores/updateBanner.svelte.ts` (store, event-driven)

**Reference:** `01-RESEARCH.md` → Pattern 2 (paired with `main.ts`'s `onNeedRefresh` call site above)

No standalone excerpt beyond the `updateAvailable.set(true)` call shown in the `main.ts` pattern above — implement as a small `$state`-backed boolean store exposing `set`/a reactive getter, following the same rune convention as `theme.svelte.ts`. Must support the session-only dismissal semantics of D-03 (dismissing hides for the rest of the current session; reappears on next full app open) — i.e., dismissal state itself should NOT be persisted to `localStorage`.

---

### `src/lib/i18n/strings.de.ts` (config, transform/static lookup)

**Reference:** `01-RESEARCH.md` → Code Examples: "Centralized German strings module (D-08)"

```ts
import { appName } from '../config/app.config';

export const strings = {
  appName,
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

**Hard constraint** (D-08 + `CLAUDE.md`'s club-identity-as-config directive): every UI string in every component below MUST come from this module — no inline literal copy, even though only German exists in v1.

---

### `src/lib/components/PlaceholderScreen.svelte` (component, request-response)

**Reference:** `01-RESEARCH.md` → Code Examples: "Placeholder screen component (D-16), parameterized"

```svelte
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

The four `src/lib/views/*Placeholder.svelte` files are each a thin instantiation of this component, passing the section-specific icon (`Settings2`/`Users`/`Target`/`Trophy` from `@lucide/svelte`) and `strings.de.ts` copy (`strings.placeholder.heading('Einrichtung')`, etc. — see UI-SPEC §Copywriting Contract for the exact 4 heading/body pairs).

---

### `src/lib/components/TopAppBar.svelte`, `ThemeToggle.svelte`, `UpdateBanner.svelte`, `BottomTabBar.svelte`, `Sidebar.svelte`, `NavItem.svelte`, `GlassCard.svelte` (components, request-response / event-driven)

**Reference:** No standalone code excerpt exists for these in RESEARCH.md beyond the composition shown in Pattern 2/3/4 and the System Architecture Diagram above — RESEARCH.md explicitly defers "fine implementation details" (exact spacing/blur/breakpoint values) to `01-UI-SPEC.md`, which IS locked and canonical. Build each against:
- **Structural/interaction contract:** `01-UI-SPEC.md` §Layout & Navigation (exact touch-target sizes, breakpoint at 768px, sidebar 240px/72px-rail, disabled-state provision for `NavItem`)
- **Visual contract:** `01-UI-SPEC.md` §Color / §Glassmorphism Tokens (reuse the `glass-surface` utility class defined in `app.css`, do not redefine per-component)
- **Copy contract:** `strings.de.ts` (never inline literals)

---

## Shared Patterns

### FOUC-free theme detection
**Source:** `01-RESEARCH.md` Pattern 1 + Pitfall 1
**Apply to:** `index.html` (inline boot script), `src/lib/stores/theme.svelte.ts`, `src/lib/components/ThemeToggle.svelte`
Theme class must be set synchronously before first paint; the Svelte layer only toggles/persists on user action, never owns initial detection.

### `registerType: 'prompt'` + explicit UI wiring
**Source:** `01-RESEARCH.md` Pattern 2 + Pitfall 2
**Apply to:** `vite.config.ts`, `src/main.ts`, `src/lib/stores/updateBanner.svelte.ts`, `src/lib/components/UpdateBanner.svelte`
`onNeedRefresh`/`onOfflineReady` callbacks must be wired to real, mounted UI — an unwired or console-logged callback is a functional bug for D-01–D-04, not acceptable placeholder code.

### Single glass utility class, reused everywhere
**Source:** `01-RESEARCH.md` Pattern 4, `01-UI-SPEC.md` §Glassmorphism Tokens
**Apply to:** `src/app.css` (definition), `GlassCard.svelte`, `TopAppBar.svelte`, `BottomTabBar.svelte`, `Sidebar.svelte`, `UpdateBanner.svelte`, `PlaceholderScreen.svelte`'s icon badge
Define `.glass-surface` (and its `dark` variant) exactly once in `app.css`; every component applies the class rather than re-declaring `backdrop-filter`/background/border values inline. Never apply this class to anything resembling the future score-entry table (Phase 3) — use the reserved `surface-opaque` token instead for that eventual case.

### Centralized copy, no inline literals
**Source:** `01-RESEARCH.md` Code Examples "strings.de.ts", D-08
**Apply to:** every `.svelte` component listed above that renders any user-visible text
All copy is imported from `src/lib/i18n/strings.de.ts`; this is the mechanism that keeps club-identity/localization swappable per `CLAUDE.md`'s future-facing constraint.

### Production-build verification, not dev-server verification
**Source:** `01-RESEARCH.md` Pitfall 4
**Apply to:** all PWA-related files (`vite.config.ts`, `src/main.ts`, `index.html`) — verification step for every task touching these
`vite dev` never registers a real service worker. Every task that touches PWA/offline/theme-boot behavior must be manually verified via `vite build && vite preview` with devtools "Offline" toggled on — this is a process pattern, not a code pattern, but it is load-bearing for this phase's success criteria and should be reflected in every relevant plan's verification steps.

## No Analog Found

All 21 files listed in File Classification have no existing-codebase analog (repository is greenfield — confirmed via direct filesystem inspection: no `src/`, no `package.json`, no prior components of any kind). Planner should treat the `01-RESEARCH.md` excerpts reproduced in Pattern Assignments above, plus `01-UI-SPEC.md`'s locked visual/interaction contract, as the reference material for every file in this phase.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| all 21 files above | (see File Classification) | (see File Classification) | Greenfield project — Phase 1 is the first phase to write any application code; no prior Svelte/Dexie/Vite source exists anywhere in the repository to analog against. |

## Metadata

**Analog search scope:** Full repository root (`/home/code/MeinBogenturnier`), non-`.git` paths, confirmed via `find -maxdepth 2` and targeted `ls` checks for `src/`, `package.json`, `.claude/skills/`, `.agents/skills/` — none found.
**Files scanned:** 0 application source files (none exist); 3 planning documents read in full (`01-CONTEXT.md`, `01-RESEARCH.md`, `01-UI-SPEC.md`)
**Pattern extraction date:** 2026-07-03
