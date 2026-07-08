# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-03
**Phase:** 1-Foundation
**Areas discussed:** PWA update behavior, App identity & branding placeholder, Glassmorphism visual language, App shell navigation structure

---

## PWA Update Behavior

| Question | Options | Selected |
|---|---|---|
| registerType: how should new versions get applied? | prompt (recommended) / autoUpdate | **prompt** |
| Where/how should the trainer see and act on an "update available" notification? | Small dismissible banner / Settings-menu indicator / Modal on next safe screen | **Small dismissible banner** |
| If dismissed, what happens next? | Reappear every launch / Reappear once per session only / Stay dismissed until manually checked | **Reappear once per session only** |
| Manual "check for updates" action, or purely automatic? | Automatic only (recommended) / Add manual button | **Automatic only** |

**Notes:** Directly resolves the `registerType` blocker flagged in STATE.md. Reasoning centered on avoiding a disruptive reload mid-tournament while still surfacing updates promptly between sessions.

---

## App Identity & Branding Placeholder

| Question | Options | Selected |
|---|---|---|
| App name for v1 | Real club name now / Generic placeholder name | **Generic placeholder name** |
| PWA icon/logo | Simple generic archery icon (recommended) / I'll provide a source image | **Simple generic archery icon**, via `@vite-pwa/assets-generator` |
| UI language | German (recommended) / English | **German** |
| Centralize UI strings now? | Yes, centralize now (recommended) / No, hardcode inline | **Yes, centralize now** |

**Naming digression:** Initial generic-name proposals were reconsidered when the user flagged that "MeinBogenturnier" (matching this repo's directory name) collides with an existing official-tournament-search website. Brainstormed alternatives along an "ad-hoc / minimal-infrastructure" theme: Bogen-Trainingsturnier, Turnierverwaltung, Bogenturnier To Go, Turnier Kompakt, Blitzturnier, Bogenturnier Mobil, Turnier im Koffer, Schießplatz-Turnier, Turnier vor Ort.

**User's final choice:** **InstantBogenturnier**

---

## Glassmorphism Visual Language

| Question | Options | Selected |
|---|---|---|
| Accent/primary color scheme | Blue/teal (archery-neutral) / Green (archery-associated) / Specific colors in mind | **Blue/teal** |
| Glass effect intensity | Subtle (recommended) / Bold/pronounced | **Subtle** |
| Where should the glass effect apply? | Cards & panels only (recommended) / Everywhere, including tables | **Cards & panels only** |
| Dark mode glass tint | Dark-tinted (recommended) / Light-tinted even in dark mode | **Dark-tinted** |

**Notes:** Legibility in bright outdoor sunlight at the range and readability of the (future) score-entry table drove the "subtle" and "cards/panels only" choices — the score table is explicitly excluded from glass treatment even though it isn't built until Phase 3.

---

## App Shell Navigation Structure

| Question | Options | Selected |
|---|---|---|
| How should the trainer move through the 4 tournament phases? | Guided step wizard / Persistent nav, free movement | **Persistent nav, free movement** |
| Nav form on phone-sized screens | Bottom tab bar (phone) / sidebar (tablet+) / Top nav bar at all sizes | **Bottom tab bar (phone) / sidebar (tablet+)** |
| Gate sections with no data yet, or always accessible? | Always accessible / Gate sections with no data yet | **Gate sections with no data yet** |
| What should each nav section show in Phase 1? | Simple "coming soon" placeholders / Just one landing/home section | **Simple "coming soon" placeholders** for all 4 sections |

**Notes:** "Free movement" was chosen over a linear wizard so the trainer can jump back to tweak setup mid-scoring or peek at partial results — this shapes Phase 1's shell architecture (all 4 sections exist as nav destinations from day one, even though only placeholders).

---

## Claude's Discretion

None — every gray area discussed reached an explicit decision. Fine implementation details (exact color tokens, blur radius, breakpoint values, icon file structure) are left to research/planning.

## Deferred Ideas

None — discussion stayed within Phase 1 scope.
