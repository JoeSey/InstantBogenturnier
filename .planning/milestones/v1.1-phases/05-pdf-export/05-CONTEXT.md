# Phase 5: PDF Export - Context

**Gathered:** 2026-07-06
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers: exporting the tournament's ranked results (per class, from `computeClassRankings`) as a single downloadable/printable PDF document. Certificates for individual shooters are explicitly out of scope here — split off (via SPIDR/Interfaces axis during `/gsd-mvp-phase`) into a follow-up Phase 6.

</domain>

<decisions>
## Implementation Decisions

### PDF structure & pagination
- **D-01:** Single PDF containing all classes, not one PDF per class. One section per class, with a page break inserted before each new class section. Simplest to hand out/archive as one file; maps cleanly onto `jspdf-autotable`'s built-in pagination.

### Header images & branding config (Settings)
- **D-02:** Add a new minimal Settings section now (not deferred to the certificates phase) to configure: two header images (left/right logos) and a free-text title line for the results list (e.g. "Trainingsturnier SV Musterbach 6.7.2026").
- **D-03:** Images are stored as `Blob` in Dexie (existing tech-stack pattern), downscaled on upload (target ~500px width, ~200KB cap) before storage — keeps PDF generation fast and avoids any edge-case IndexedDB quota friction on constrained devices (iOS/iPadOS).
- **D-04:** No additional backup mechanism needed beyond what already exists — the settings table (including these image blobs) rides along in the existing `dexie-export-import` preset export/import, which is the app's existing mitigation for iOS Safari's ~7-day IndexedDB eviction window.
- **D-05:** This Settings UI and its Dexie storage will be reused as-is by the certificates phase (Phase 6) for the same header treatment — build it generically now, not PDF-export-specific.

### Trigger & filename
- **D-06:** The export action is a button on the existing Results view (e.g. "PDF exportieren"), not a separate page or menu entry.
- **D-07:** Filename convention: auto-generated from date only, ISO format, e.g. `Ergebnisse_2026-07-06.pdf` — not derived from the free-text tournament title (title appears inside the PDF, not the filename).

### Content scope per class
- **D-08:** PDF table columns per class section: **Rank, Name, Sum only** — no Line or Class column (Class is implicit from the section heading; Line is not meaningful in a printed/archival results document). Slimmer than the on-screen `ResultsTable` component.
- **D-09:** Add a checkbox (in the Results view, next to the export button) to include or exclude shooters with incomplete score entry from the exported PDF. **Default: unchecked** — incomplete shooters are excluded from the PDF unless the trainer explicitly opts in.

### Claude's Discretion
- Exact page-break/section-heading typography, table styling (`jspdf-autotable` theme), and the Settings section's exact layout/copy are left to implementation, consistent with the app's existing glassmorphism design language.
- Image upload UI (file picker vs. drag-drop) and downscale implementation (canvas resize vs. library) are left to implementation.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### PDF generation stack (locked in CLAUDE.md tech-stack section)
- `CLAUDE.md` — jsPDF + jspdf-autotable chosen over pdf-lib for from-scratch document generation (not template-filling); rationale, header-image handling via `doc.addImage()`, and the recommendation to store header images as Blob/base64 in a Dexie `settings` table from day one (this phase implements that recommendation).

### Ranked results data source
- `src/lib/utils/ranking.ts` — `computeClassRankings()` is the pure function producing per-class `RankedRow[]` (shooterId, name, line, sum, rank, isComplete) that this phase's PDF export must consume; `isComplete` field already exists and directly supports the include/exclude-incomplete checkbox (D-09).

### Prior milestone scope note
- `.planning/PROJECT.md` — "Out of Scope" section explicitly deferred PDF export to v1.5 (this milestone) and certificates/WhatsApp delivery further out; confirms this phase's boundary.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `computeClassRankings()` (`src/lib/utils/ranking.ts`): already produces the exact per-class, ranked, tie-handled data shape (`RankedRow[]`) needed as direct input to `jspdf-autotable` — no new ranking/aggregation logic needed, only a PDF-rendering layer on top.
- Existing Dexie schema/db layer (`src/lib/db/schema.ts` and sibling files) — a `settings` table (or similar) should follow the same Dexie patterns already used for classes/shooters/scores.
- Existing `dexie-export-import` integration (from Phase 2, preset export/import) — reused unmodified as the backup path for the new settings/header-image data (D-04).

### Established Patterns
- Ranking output is already framework-free and side-effect-free (see comment in `ranking.ts`: "Pure tournament-wide ranking functions... Framework-free, no side effects") — the PDF export function should follow the same pattern: pure data-in, PDF-blob-out, independent of Svelte component state.
- `RankedRow.isComplete` already exists per-shooter — no new completion-detection logic needed for the include/exclude-incomplete checkbox.

### Integration Points
- Results view (`src/lib/views/Results.svelte`) is where the new "PDF exportieren" button and incomplete-shooters checkbox are added (D-06).
- A new Settings section/component is needed for header images + title line (D-02) — likely alongside or within whatever existing Settings/Setup UI structure exists from Phase 1/2.

</code_context>

<specifics>
## Specific Ideas

- Example title line the trainer might enter: "Trainingsturnier SV Musterbach 6.7.2026" — free text, not auto-generated, appears in the PDF (not the filename).
- Example filename: `Ergebnisse_2026-07-06.pdf`.

</specifics>

<deferred>
## Deferred Ideas

- **Per-shooter PDF certificates** (top n / all shooters, configurable) — explicitly split into a new Phase 6 via the SPIDR Interfaces-axis split during `/gsd-mvp-phase`. Story: "As a Trainer/Kampfrichter, I want to generate PDF certificates for the top shooters, so that I can hand them out or share them, and lay the groundwork for v2's automated delivery."
- **WhatsApp/automated delivery of certificates** — deferred to v2 per `PROJECT.md` Out of Scope.
- **Blank pre-printed scoresheets (DIN A5)** — deferred to v1.5 originally per SPECS.md, not yet scheduled as its own phase; not part of this phase's scope.

### Reviewed Todos (not folded)
None — discussion stayed within phase scope; no matching todos existed (`todo.match-phase` returned zero matches).

</deferred>

---

*Phase: 5-pdf-export*
*Context gathered: 2026-07-06*
