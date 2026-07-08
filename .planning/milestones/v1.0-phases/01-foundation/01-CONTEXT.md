# Phase 1: Foundation - Context

**Gathered:** 2026-07-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver an installable, fully offline-capable PWA shell with a coherent, responsive, themeable glassmorphism visual system and persistent navigation — the foundation every later phase (Setup & Registration, Score Entry, Results) plugs into. No real feature content (classes, shooters, scoring, results) is built in this phase — only the shell, theming, PWA infrastructure, and placeholder sections for each future feature area. Covers PLAT-01, PLAT-02, PLAT-03.

</domain>

<decisions>
## Implementation Decisions

### PWA Update Behavior
- **D-01:** `registerType: 'prompt'` (not `autoUpdate`) — new service worker installs in the background but waits for explicit trainer confirmation before activating, to avoid an unexpected reload disrupting live score entry if connectivity briefly returns mid-tournament.
- **D-02:** "Update available" is surfaced via a small, dismissible banner (not a settings-menu badge, not a blocking modal).
- **D-03:** Dismissing the banner hides it only for the rest of the current app session; it reappears on the next full app open/reload if the update is still pending.
- **D-04:** No manual "check for updates" UI in v1 — rely solely on Workbox's automatic background update check.

### App Identity & Branding
- **D-05:** App name: **"InstantBogenturnier"** — a generic (non-club-specific) placeholder name evoking ad-hoc, minimal-infrastructure tournament setup. **Note:** "MeinBogenturnier" was explicitly rejected — it collides with an existing official-tournament-search website of that name.
- **D-06:** PWA icon: a simple, generic archery icon (target/arrow motif, matching the accent color), generated via `@vite-pwa/assets-generator` — no custom/club logo asset needed for v1.
- **D-07:** UI language: **German** — matches `specs.md`'s own terminology ("Speichern", "Abschließen", etc.) and the target trainer audience.
- **D-08:** All UI text is centralized in one strings/config module from the start, even though only German is needed for v1 — cheap now, avoids a find-and-replace refactor if a v2.5 open-source release ever needs localization or per-club text overrides.

### Glassmorphism Visual Language
- **D-09:** Accent/primary color: **blue/teal** — archery-neutral, no club-specific meaning to design around.
- **D-10:** Glass effect intensity: **subtle** (light blur, mostly-opaque backgrounds) — prioritizes legibility in bright outdoor sunlight at the range and readability of dense score tables (a later-phase concern, but the visual system is set here).
- **D-11:** Glass effect scope: applied to **cards, panels, and the nav only** — explicitly NOT to the score-entry table itself (built in Phase 3), which must stay fully opaque/high-contrast since it's the app's core-value screen used under the most pressure.
- **D-12:** Dark mode glass tint: **dark-tinted** glass panels (not light-tinted-on-dark) — consistent, low-glare look.

### App Shell Navigation
- **D-13:** **Persistent navigation with free movement** between sections (Setup, Registration, Scoring, Results) — not a linear guided wizard. The trainer can jump between sections at any time (e.g., tweak a class definition mid-scoring).
- **D-14:** Nav form: **bottom tab bar on phone-sized screens**, collapsing into a **sidebar on tablet/desktop** — responsive, thumb-reachable pattern for one-handed range use.
- **D-15:** Sections with no data yet (e.g., Results before any scores exist) are **gated/disabled** rather than always clickable, to avoid confusing empty screens.
- **D-16:** Phase 1 scope for each nav section: a simple **"coming soon" placeholder screen**, styled with the theme/glass system, for all four sections (Setup, Registration, Scoring, Results). This proves the shell, nav, theming, and PWA infrastructure work end-to-end without building any real feature UI — that's Phases 2-4.

### Claude's Discretion
No items were left to "you decide" — every gray area discussed reached an explicit decision above. Fine implementation details not covered here (exact Tailwind color tokens/shades, blur radius in px, breakpoint pixel values, icon file structure) are left to research/planning to resolve within the constraints above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Tech stack & version constraints
- `CLAUDE.md` — Full locked technology stack (Svelte 5.56.4, Vite 8.1.3, `@sveltejs/vite-plugin-svelte` 7.1.2, Tailwind CSS 4.3.2 via `@tailwindcss/vite`, `vite-plugin-pwa` 1.3.0, Dexie.js 4.4.4, TypeScript), the Vite 8 / vite-plugin-svelte 7 peer-dependency hard requirement, the "What NOT to Use" table, and the `registerType: 'prompt'` + `virtual:pwa-register`'s `onNeedRefresh` guidance that directly informs D-01/D-02/D-03. MUST read before scaffolding.

### Original specification
- `specs.md` — Original German-language spec document; source of German UI terminology ("Speichern", "Abschließen") and the four-phase tournament flow (Vorbereitung → Turnier-Registrierung → Punkteerfassung → Ergebnisse) that D-13 through D-16 map onto.

### Project requirements
- `.planning/PROJECT.md` — Core value statement, constraints (client-only, single-device, offline-first, club-identity-as-config for future v2.5), Key Decisions table.
- `.planning/REQUIREMENTS.md` — PLAT-01 (installable/offline), PLAT-02 (glassmorphism/responsive), PLAT-03 (light/dark mode with manual override) — the requirements this phase must satisfy.
- `.planning/ROADMAP.md` §Phase 1: Foundation — Goal and 4 success criteria for this phase.
- `.planning/STATE.md` — Blockers/Concerns log; the `vite-plugin-pwa` `registerType` blocker is now resolved by D-01 through D-04.

</canonical_refs>

<code_context>
## Existing Code Insights

This is a greenfield project — no application code exists yet (only `CLAUDE.md`, `specs.md`, and `.planning/` docs). No reusable components, established patterns, or integration points to note. Phase 1 is the first phase to write actual code.

</code_context>

<specifics>
## Specific Ideas

- The app name "InstantBogenturnier" came out of an explicit brainstorm around the "ad-hoc, minimal-infrastructure" theme (other candidates considered and passed over: Bogen-Trainingsturnier, Turnierverwaltung, Bogenturnier To Go, Turnier Kompakt, Blitzturnier, Bogenturnier Mobil, Turnier im Koffer). "MeinBogenturnier" was ruled out specifically due to a naming collision with an existing official-tournament-search website — worth remembering if any other naming decisions come up later (e.g., domain names, app store listings for a future v2.5).
- Score-entry table (Phase 3) is explicitly called out now (D-11) as needing to stay opaque/high-contrast even though it doesn't exist yet — the visual system built in Phase 1 must accommodate this exception from the start rather than retrofitting it later.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 1 scope. No scope-creep items came up.

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-07-03*
