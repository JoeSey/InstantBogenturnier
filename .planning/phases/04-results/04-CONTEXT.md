# Phase 4: Results - Context

**Gathered:** 2026-07-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Trainer can view accurate, correctly-ranked results for each class, live-updating as scores come in and continuing to be viewable after the tournament is finalized. Includes the tournament-lifecycle capabilities added to this phase after Phase 3 shipped: an explicit "start new tournament" reset action, and a guard against destructive edits (deleting shooters, changing rounds/passes config) once a tournament is finalized. Covers RES-01 through RES-06.

</domain>

<decisions>
## Implementation Decisions

### Results Availability & Partial Data
- **D-01:** Results are viewable **anytime**, not gated on finalization — a live-updating view of current standings, not a screen that's locked/placeholder until "Abschließen".
- **D-02:** Ranking includes **every shooter by current sum**, whether or not they've finished all their arrows yet. No separate "unranked/in-progress" bucket — one sorted list.
- **D-03:** Shooters with incomplete sums get a **small visual marker** (e.g. asterisk or muted badge) next to their row so the trainer can tell at a glance that sum is still growing. Exact marker styling is Claude's discretion (see below), but it must be visually distinct from the finished-shooter rows.

### Multi-Class Layout & Ordering
- **D-04:** Classes are ordered **alphabetically by class name** when multiple appear together (matches how classes are already listed in Setup).
- **D-05:** On tablet/desktop, multiple classes use a **responsive grid** (1 column on narrow tablet widths, up to 3 columns on wide desktop) — not a single stacked column. Exact breakpoints (which width → 1 vs 2 vs 3 columns) are Claude's discretion, consistent with the app's existing responsive conventions (e.g. the nav shell's 768px breakpoint, and the score-table phone-compaction breakpoint from quick task 260705-p25).
- Per REQUIREMENTS.md RES-03: on **phone**, only one class is shown at a time via a dropdown selector (this was already locked pre-discussion — not re-litigated here).

### Rank Presentation Style
- **D-06:** Results table is a **plain, opaque table** (rank, line/name/class as relevant, sum) matching the score-entry table's high-contrast look (Phase 1 D-11 applies here too — no glassmorphism on this data-heavy view) — **plus** a subtle color accent on the top-3 (podium) rank cells.
- **D-07:** The podium accent is **rank-based, not row-based** — every row sharing rank 2 gets the same "silver" accent (consistent with the already-locked shared-rank/skip-next "1-2-2-4" tie convention from REQUIREMENTS.md; RES-02 is not re-litigated here). E.g. two shooters tied for 2nd both get silver; the next shooter is rank 4 with no podium accent.

### Reset Flow (RES-05 / RES-06)
- **D-08:** The "Neues Turnier starten" (start new tournament / reset) action lives **on the Results view itself** — no new nav section/settings area for a single button.
- **D-09:** Reset confirmation reuses the **existing `ConfirmDialog.svelte` destructive pattern** (same component/props already used for "Abschließen" and preset delete/overwrite flows in Phases 2-3) — title + body explaining the consequences + "Ja, zurücksetzen"/"Abbrechen". No new type-to-confirm interaction pattern.
- **D-10:** Per REQUIREMENTS.md RES-05's locked wording ("clears all shooters and scores, not saved presets"), reset clears the `shooters` and `scores` Dexie tables only. Classes, shooting-line count, and rounds/passes config (the `classes`/`shootingLines`/`rounds` tables) are **retained** — this lets the trainer immediately start a same-shaped tournament (same classes/lines/rounds) without reconfiguring Setup from scratch, while presets remain available for a differently-shaped tournament. This is an inference from the already-locked RES-05 requirement text, not a new question re-discussed here — flagging it explicitly so the researcher/planner don't have to guess.
- **D-11:** RES-06's destructive-edit guard is implemented as **disabled controls with an inline message** pointing to reset (e.g. delete-shooter buttons and the rounds/passes config form become disabled/read-only, with text like "Turnier abgeschlossen — Zurücksetzen, um zu ändern" near the disabled controls) — not an "action intercepted by a warning dialog at click time" pattern.
- **D-12:** The RES-06 guard triggers **only once the tournament is finalized** (`isFinalized === true`, same boolean already computed in `ScoreEntry.svelte` per Phase 3's D-10 permanent-lock decision) — **not** as soon as any score exists. While a tournament is still live/in-progress (not yet finalized), the trainer can still edit shooters and rounds/passes config normally, consistent with D-01's "results are viewable anytime, mid-tournament" decision — the guard is specifically about protecting *finalized/locked* data, not live-entry data.

### Claude's Discretion
- Exact visual styling of the "in-progress" marker on incomplete shooters (D-03) — asterisk, dot, muted-text badge, etc.
- Exact responsive breakpoints for the 1/2/3-column grid (D-05) beyond "narrow tablet → wide desktop".
- Exact podium accent colors (gold/silver/bronze or the app's existing accent-color family) as long as they're subtle and don't compromise the opaque/high-contrast table requirement (D-06).
- Whether "deleting a class" (as opposed to deleting a shooter, which RES-06 explicitly names) should also be guarded once finalized — not discussed; treat conservatively (guard it too) unless research surfaces a reason not to, since a class deletion after finalization would orphan finalized shooter records in the same way a shooter deletion would.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & prior decisions
- `.planning/REQUIREMENTS.md` §Results (RES-01 through RES-06) — the locked requirement set this phase implements, including the already-final tie-break convention (RES-02, shared-rank/skip-next, no X-ring countback) and the reset/guard wording quoted in D-10 above.
- `.planning/phases/01-foundation/01-CONTEXT.md` D-10/D-11 — glassmorphism scope decision; results table must stay opaque/high-contrast like the score-entry table (D-06 above).
- `.planning/phases/03-score-entry/03-CONTEXT.md` D-09/D-10 — `isFinalized`/permanent-lock semantics that D-12's guard-trigger condition depends on directly.

### Reusable components/patterns
- `src/lib/components/ConfirmDialog.svelte` — destructive-confirm pattern to reuse for the reset dialog (D-09).
- `src/lib/components/ScoreTable.svelte` — opaque-table styling and the responsive column-hiding pattern (`hidden md:table-cell`) from quick task `260705-p25-score-table-phone-view-compaction-on-pho/260705-p25-SUMMARY.md` — relevant precedent for the Results table's own responsive behavior (D-05, and RES-03's phone dropdown).
- `src/lib/utils/scoreCompletion.ts` — existing pure functions (`arrowScoreValue`, `calculatePasseSum`, `areAllScoresEntered`, `isPasseComplete`) this phase's new tournament-wide-sum ranking function should follow the same style/pattern (plain functions, no framework imports, comment banner referencing decision/requirement IDs).
- `src/lib/db/schema.ts` — current Dexie schema (`classes`, `shootingLines`, `rounds`, `shooters`, `scores`, `presets` tables) that the reset action (D-10) and the ranking computation both operate over.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ConfirmDialog.svelte`: directly reusable for the reset confirmation (D-09), same `destructive={true}` prop pattern already used for finalize/preset-delete.
- `scoreCompletion.ts`'s existing per-passe pure functions: pattern to follow for a new tournament-wide aggregation function (summing every round/passe per shooter, not just the current one like Phase 3's `calculatePasseSum`).
- `db.shooters`, `db.classes`, `db.scores` tables: source data for building the ranked-per-class list.

### Established Patterns
- `liveQuery()` + `$derived` reactive pattern (Phases 2-3): Results view should use this same pattern to satisfy D-01's "live-updating anytime" requirement — no manual refresh needed.
- Opaque/high-contrast data tables, no glassmorphism (Phase 1 D-11): applies to the Results table by the same reasoning as the score-entry table.
- Responsive `hidden md:table-cell` / tightened padding pattern (quick task 260705-p25): precedent for how the Results table should behave across phone/tablet/desktop widths.

### Integration Points
- Reset (D-08/D-09/D-10) must clear `db.shooters` and `db.scores` only, leaving `db.classes`/`db.shootingLines`/`db.rounds`/`db.presets` untouched.
- RES-06's guard (D-11/D-12) needs `isFinalized` (or an equivalent live query over `db.scores`) available to the Setup (rounds/passes config) and Registration (shooter delete) views, not just Score Entry where it currently lives — this is a new cross-view integration point Phase 4 introduces.

</code_context>

<specifics>
## Specific Ideas

No specific visual mockups or external references given during discussion — decisions above (opaque table + podium accent, alphabetical class order, responsive grid) are the concrete constraints to build from.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (RES-05/RES-06 themselves were already added to this phase's scope in a prior conversation turn, before this discuss-phase session started — see `.planning/ROADMAP.md` Phase 4 and the STATE.md Roadmap Evolution entry dated 2026-07-05.)

</deferred>

---

*Phase: 4-Results*
*Context gathered: 2026-07-05*
