# Phase 2: Setup & Registration - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the tournament configuration and shooter-registration workflow: class definition (age-group/bow-type/distance tuple with app-suggested naming), shooting-line count, round/passe configuration (WA presets or free custom), shooter registration with AB/AB-CD mode detection, and named-preset save/load/delete/export/import (4-8 typical, capped at 8). No scoring or results UI is built in this phase — Setup and Registration must be fully usable before any scoring begins. Covers SETUP-01 through SETUP-06 and REG-01/REG-02.

</domain>

<decisions>
## Implementation Decisions

### "Passe" Terminology & Preset Catalog
- **D-01:** **"Passe" = one end (Durchgang)** — a set of arrows shot together before the shooters walk to retrieve them (e.g. 3 or 6 arrows). This is the domain term used throughout the UI and data model (field names, labels).
- **D-02:** The `specs.md` example **"1 Runde mit 30 Passen"** was a typo/shorthand — the "30" refers to total arrows (Pfeile), not 30 ends. This confirms REQUIREMENTS.md's own prior reinterpretation ("1 round of 10 ends of 3 arrows at 18m") was correct. Do not take the literal "30 Passen" wording in `specs.md` at face value anywhere else in the app.
- **D-03:** v1 preset catalog (SETUP-04) ships a **standard indoor/outdoor set**:
  - **WA 18m**: 10 Passen à 3 Pfeile = 30 Pfeile, distance 18m
  - **WA 25m**: 10 Passen à 3 Pfeile = 30 Pfeile, distance 25m
  - **WA 70m**: 6 Passen à 6 Pfeile = 36 Pfeile, distance 70m
  - Plus a free custom configuration path (arrows/Passe, Passen/round, number of rounds, distance) per SETUP-04.

### Class Definition & Naming (SETUP-01/02)
- **D-04:** Age-group, bow-type, and distance fields use **dropdowns with an "other/custom" free-text escape hatch** per field (not pure free text, not pure fixed dropdowns).
- **D-05:** Default **bow-type dropdown options** (exact list, with abbreviations used in name generation):
  | Bow type | Abbreviation |
  |---|---|
  | Recurve | RCV |
  | trad. Recurve | trad |
  | Langbogen | LB |
  | Blankbogen | BB |
  | Compound | CP |
- **D-06:** Age-group dropdown default values and the exact distance field type (free numeric input vs. dropdown) are **Claude's Discretion** — not explicitly decided; use reasonable German-club conventions (e.g. U12/U14/U16/U18/Erwachsene) subject to the same dropdown+custom pattern as bow-type.
- **D-07:** When the app-suggested class name collides with an existing class's name, **auto-suffix on collision** — the app appends a distinguishing suffix automatically (e.g. append distance, or a numeric suffix like `-2`); the trainer can still rename either class afterward.

### AB / AB-CD Mode & Shooting Lines (REG-01/REG-02)
- **D-08:** **AB mode** = up to 2 shooters share one shooting line (positions A/B), shooting together. **AB/CD mode** = 4 shooters per line, split into two sequential flights (A/B, then C/D).
- **D-09:** Mode threshold: **`shooterCount > 2 × lineCount` → AB/CD mode**; otherwise AB mode. This is derived live from registered shooter count vs. configured line count (set in Setup) and must update reactively as shooters are registered/removed.
- **D-10:** Shooting-line assignment per shooter is **optional and manual** (per REG-01) — the trainer can pick a line for a shooter; if left blank, the app **auto-assigns** to balance shooters evenly across lines and flights (A/B/C/D) in registration order.

### Preset Management (SETUP-05/06)
- **D-11:** Preset storage is a **dynamic list, capped at 8** (min 0) — not a fixed 8-slot grid. The "4-8" language in REQUIREMENTS.md/PROJECT.md is a usage expectation, not a hard floor.
- **D-12:** A saved preset captures **classes + shooting-line count + rounds/passes configuration only** — it explicitly does **NOT** include the shooter roster, since shooters vary per tournament and are re-registered fresh each time.
- **D-13:** Saving a preset under a name that already exists **prompts for confirmation** before overwriting ("Overwrite existing preset X?").
- **D-14:** Presets support an explicit **delete action**, separate from overwrite-by-saving.
- **D-15:** **Preset export/import is in scope for Phase 2** (pulled forward from `CLAUDE.md`'s tech-stack recommendation of `dexie-export-import`, originally framed as backup insurance against iOS Safari IndexedDB eviction — same mechanism now also serves cross-device preset transfer between trainers). Scope: **export all presets as one JSON file**; import merges/replaces the full preset list on the receiving device. Per-preset selective export/import is not required for v1.

### Claude's Discretion
- Exact age-group dropdown values and distance field UI (D-06).
- Exact wording/placement of the auto-suffix collision string (D-07) and the balancing algorithm details for auto-assigned shooting lines (D-10) — round-robin across lines/flights in registration order is the guiding principle, exact tie-breaking left to implementation.
- Import conflict handling detail (e.g. exact merge vs. replace UX copy) beyond "merges/replaces the full list" (D-15).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Tech stack & version constraints
- `CLAUDE.md` — Locked stack (Svelte 5, Vite 8, Tailwind 4, Dexie.js, `dexie-export-import`), and the `dexie-export-import` recommendation that directly informs D-15 (preset export/import).

### Original specification & terminology
- `specs.md` — Original German-language spec; source of the "Passe"/"Runde" terminology resolved by D-01/D-02, and the AB/AB-CD mode description referenced by D-08/D-09.

### Project requirements
- `.planning/PROJECT.md` — Active requirements list, Out of Scope table, Key Decisions.
- `.planning/REQUIREMENTS.md` §Setup, §Registration — SETUP-01 through SETUP-06, REG-01, REG-02 — the requirements this phase must satisfy.
- `.planning/ROADMAP.md` §Phase 2: Setup & Registration — Goal, MVP mode, 4 success criteria.
- `.planning/STATE.md` — Blockers/Concerns log; the "30 Passen" terminology blocker is now resolved by D-01/D-02.

### Prior phase context
- `.planning/phases/01-foundation/01-CONTEXT.md` — German UI language (D-07 there), glassmorphism visual system (glass on cards/panels/nav only, not data tables), centralized i18n strings module (`src/lib/i18n/strings.de.ts`) — Phase 2 UI must extend these, not introduce new patterns.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/components/GlassCard.svelte` — Glass-styled card component from Phase 1; use for Setup/Registration forms and preset list items.
- `src/lib/i18n/strings.de.ts` — Centralized German strings module; add new `setup`, `registration`, and `presets` sections here rather than inlining strings.
- `src/lib/db/schema.ts` — Empty Dexie schema scaffold (`InstantBogenturnierDB`, version 1, no tables). Phase 2 adds the first real tables (classes, shooting-line config, rounds/passes config, shooters, presets) — bump the Dexie version and define `stores({...})` here.
- `src/lib/views/SetupPlaceholder.svelte`, `src/lib/views/RegistrationPlaceholder.svelte` — Phase 1 placeholder screens to be replaced with real Setup and Registration UI.

### Established Patterns
- Svelte 5 runes (`$state`, `$derived`) for reactive state — no external state library (per `src/lib/stores/theme.svelte.ts` pattern). AB/AB-CD mode derivation (D-09) should be a `$derived` value, not manually recomputed.
- Glass effect applies to cards/panels/nav only, NOT data tables — carries forward to any shooter-roster table in Registration.

### Integration Points
- `src/App.svelte` — Wires nav sections to views; Setup and Registration views plug in here.
- Dexie `liveQuery()` + Svelte auto-subscription pattern (documented in `CLAUDE.md`) — use for reactive class/shooter/preset lists.

</code_context>

<specifics>
## Specific Ideas

- WA round presets: WA 18m (10×3=30 Pfeile), WA 25m (10×3=30 Pfeile), WA 70m (6×6=36 Pfeile) — see D-03 for exact structure.
- Bow-type abbreviations for class-name generation: RCV, trad, LB, BB, CP — see D-05.
- Preset export/import via `dexie-export-import`, single "export all" JSON file — see D-15.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 2 scope. The preset export/import idea (D-15) was evaluated as scope creep but pulled into this phase rather than deferred, since it reuses an already-planned v1 dependency (`dexie-export-import`) for a closely related purpose.

</deferred>

---

*Phase: 2-Setup & Registration*
*Context gathered: 2026-07-04*
