# Phase 3: Score Entry - Context

**Gathered:** 2026-07-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Trainer enters, interim-saves, and finalizes per-arrow scores for each registered shooter, per round/passe, live during a tournament at the range — fully offline, with zero risk of data loss if the device/tab closes mid-entry. Once every round/passe is fully entered, the trainer can explicitly finalize ("Abschließen"), after which entries are permanently locked. Does NOT include: cross-round/tournament rankings or the results view (Phase 4), PDF export (v1.5+).

</domain>

<decisions>
## Implementation Decisions

### Score Input Method
- **D-01:** Score input is a **tap-button picker**, not a text input or native `<select>` — each arrow cell presents tap targets for the possible values, no on-screen keyboard needed. Fast, one-handed, works reliably outdoors/at the range.
- **D-02:** The button set is **0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, X, M** — WA scoring convention. **"X"** (inner-ten ring) **counts as 10 in the sum**, same treatment SCORE-02 already specifies for "M" (counts as 0). X is displayed distinctly but has no special tie-break/countback behavior (already ruled out for Phase 4 — see STATE.md's prior tie-break decision: shared-rank/skip-next, no X-ring countback).
- **D-03:** The scoring scale is **fixed at 0-10/X/M for every round** — not configurable per round or per tournament. If a club ever scores on a different physical target face (e.g. a 1-5 face for beginners), the trainer mentally maps to this fixed scale; no per-round scoring-scale setting is being built.

### Round/Passe Navigation
- **D-04:** Navigation is **dropdown selectors for Runde and Passe** (matches `specs.md`'s own mockup exactly) — the table shows only the currently-selected passe's arrow columns and sum, not all passes/rounds at once. Chosen for minimal screen width usage on phone at the range over tabs or an all-passes-side-by-side layout.
- **D-05:** The table's **"Summe" column shows only the current passe's arrow sum** — not a running/cumulative total across rounds. Tournament-wide totals and rankings are explicitly Phase 4's (Results) responsibility, keeping score entry focused.

### Interim Save Behavior
- **D-06:** **True autosave per cell** — every tap on a score button immediately writes that arrow to IndexedDB. This is the actual mechanism satisfying SCORE-03/05's "no data loss if the device/tab closes mid-entry" requirement, not a periodic or row-level save.
- **D-07:** **No save UI at all** — no "Speichern" button, no inline "saved" indicator. Saving is fully invisible, like autosave in modern apps.
- **D-08:** **Resolves a wording tension in ROADMAP.md/REQUIREMENTS.md:** SCORE-06 describes "Abschließen" as "separate from Speichern" — with autosave, "Speichern" does not exist as a UI action at all. "Abschließen" is the *only* explicit action on the score-entry screen; everything before it happens automatically. Downstream planner/researcher should not try to reintroduce a Speichern button to satisfy that wording literally — the underlying requirement (interim progress is safely persisted before finalization, per SCORE-03/05) is met by autosave instead.

### Finalize & Lock Policy
- **D-09:** "Abschließen" becomes available only when **every arrow cell is filled, for every shooter, every passe, every configured round** — matches `specs.md`'s "App erkennt, wenn alle Durchgänge erfasst sind" literally. Not per-round finalization; the whole tournament's score entry must be complete.
- **D-10:** **Resolves a flagged open question from STATE.md** (post-completion correction policy): once "Abschließen" is clicked, entries are **permanently locked with no unlock/reopen path**. This is a hard, deliberate decision — there is no "Erfassung wieder öffnen" escape hatch in v1. A genuine post-finalize mistake is out of scope for this app to handle.

### Claude's Discretion
- Exact visual/interaction design of the tap-button picker (grid layout, button sizing, color coding for M/X vs numeric values) — subject to Phase 1's D-11 constraint that the score-entry table itself must stay fully opaque/high-contrast (no glassmorphism), for legibility under range-use pressure.
- Exact confirmation UX for the "Abschließen" action (e.g. a confirmation dialog before the permanent lock takes effect) — not discussed explicitly, but a destructive/irreversible action of this kind should almost certainly get a confirmation step, consistent with the confirm-before-destructive pattern already established in Phase 2 (ConfirmDialog component, used for preset delete/load/overwrite).
- Data model shape for the new `scores` table (not yet in `schema.ts`) — left to research/planning, but must key by shooter + round + passe + arrow index at minimum, and must support the autosave-per-cell write pattern (D-06) efficiently.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Original spec (source of the score-entry table mockup)
- `specs.md` (repo root) — Contains the original German-language spec, including the literal score-entry table example (Linie/Name/Klasse/1/2/3/Summe columns), the Runde/Passe dropdown mockup, and the Speichern/Abschließen button language that D-07/D-08 above reinterpret for the autosave model.

### Prior phase decisions this phase must respect
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-11: the score-entry table must stay fully opaque/high-contrast, explicitly NOT glass-styled (unlike cards/panels/nav elsewhere in the app).
- `.planning/phases/02-setup-registration/02-CONTEXT.md` — D-01/D-02: "Passe" = one end (Durchgang), NOT one arrow; the "30 Passen" wording in specs.md was a typo for total arrows. D-08/D-09: AB vs AB/CD mode and shooting-line assignment, relevant to how shooters are grouped/ordered in the score table (likely sorted/grouped by line by default, matching specs.md's example).

### Project-level requirements and state
- `.planning/REQUIREMENTS.md` §Score Entry (SCORE-01 through SCORE-07) — the locked requirement set this phase implements.
- `.planning/STATE.md` §Blockers/Concerns — the "post-completion score correction policy" blocker is resolved by D-10 above; can be cleared from STATE.md's blocker list once this phase starts.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/components/ConfirmDialog.svelte` (Phase 2) — reusable non-dismissible confirm-dialog component (title/body/confirm/cancel/destructive props); strong candidate for the "Abschließen" confirmation step (Claude's Discretion above).
- `src/lib/db/testHelpers.ts`'s `resetDb()` — must be extended to clear the new `scores` table once it's added, so Phase 3 test files can reuse the existing `beforeEach(resetDb)` pattern.
- `liveQuery()` + `$derived` pattern (used throughout Phase 2 — `ClassForm.svelte`, `ShooterForm.svelte`, `Registration.svelte`) — the established way to get reactive Dexie-backed state; the score table should follow the same pattern for live per-cell autosave feedback and for reading shooters/classes/lines/rounds config.

### Established Patterns
- Dexie schema is currently at `version(2)` in `src/lib/db/schema.ts` with 5 tables (classes, shootingLines, rounds, shooters, presets) — Phase 3 will need a `version(3)` migration adding a `scores` (or similar) table.
- Sorting: no existing sortable-table pattern in the codebase yet (Phase 2's shooter/class lists aren't sortable) — SCORE-04's column-sortable table is new UI territory for this app.
- Existing views (`Setup.svelte`, `Registration.svelte`) are plain Svelte components wired into `App.svelte`'s nav — the score entry view will follow the same integration pattern, replacing whatever Phase 1 placeholder currently occupies that nav slot.

### Integration Points
- Score table rows need: shooter name + class (from `db.shooters`/`db.classes`), line assignment (from `db.shooters.lineAssignment`, per D-10 in Phase 2 context), and the round/passe configuration bounds (`db.rounds` — `numberOfRounds`, `passesPerRound`, `arrowsPerPasse`) to know how many passes/rounds and arrow-columns to render.
- The "all cells filled" check for D-09 needs to query across shooters × rounds × passes × arrows — likely most efficient as a computed check reading the full `scores` table rather than per-cell reactive checks.

</code_context>

<specifics>
## Specific Ideas

- Tap-button picker button set must include **X** in addition to the 0-10/M set implied by SCORE-01/02's literal wording — this is an explicit addition beyond REQUIREMENTS.md's stated "0-10, M", confirmed directly with the user (D-02).
- The trainer specifically validated that tap-buttons work fine "if we're shooting WA targets" (0-10/X/M) or "1-5" — this was a validation that the *input mechanism* generalizes, not a request to make the scale itself configurable (see D-03).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. The "configurable scoring scale per round" idea that came up while discussing X/1-5 was explicitly decided against for v1 (D-03), not deferred to a future phase; revisit only if a real need for non-WA scoring surfaces later.

</deferred>

---

*Phase: 3-Score Entry*
*Context gathered: 2026-07-05*
