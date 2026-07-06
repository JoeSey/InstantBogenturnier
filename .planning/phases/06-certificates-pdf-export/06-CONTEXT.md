# Phase 6: Certificates PDF Export - Context

**Gathered:** 2026-07-06
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers: generating printable PDF certificates (Urkunden) for shooters, using the same ranked-results data and header/logo infrastructure built in Phase 5. Two entry points: a tournament-wide "Urkunden erstellen" action producing one zipped bundle of per-shooter certificate PDFs (all shooters, all classes), and a per-row action in the results table producing a single certificate PDF for just that one shooter. Not in scope: automated delivery (WhatsApp/email — v2), templated/placeholder certificate text, per-class-only bulk generation.

</domain>

<decisions>
## Implementation Decisions

### Recipients & scope
- **D-01:** Certificates cover all shooters with a result in a class (not a top-N cutoff) when using the tournament-wide bulk action — no threshold configuration needed.
- **D-02:** A per-shooter action also exists directly in the results table (one button per row), letting the trainer generate/reprint a single shooter's certificate — e.g. to hand out just the top 3 without generating the full batch.

### Output shape & delivery
- **D-03:** Tournament-wide bulk action ("Urkunden erstellen") generates **one certificate PDF per shooter**, bundled into a **single zip file** for download — not one combined multi-page PDF, and not separate unbundled browser downloads (which browsers throttle/block for 8-14 simultaneous files). Requires adding a zip library (e.g. JSZip) as a new dependency.
- **D-04:** The per-row action in the results table generates a single, standalone certificate PDF (no zip) for just that shooter.

### Certificate content & layout
- **D-05:** Certificate reuses the exact header/logo treatment from Phase 5 (title + left/right logos from the `settings` table, same `containFit()`-based placement), plus a new **static** certificate heading text field (e.g. "Urkunde" or "Teilnahmeurkunde") stored in Settings — same for every certificate, no per-shooter templating/placeholders.
- **D-06:** Below the header: shooter name, class, rank, and total score (sum) — mirrors the results-list PDF's data fields (D-08 in Phase 5), just laid out per-certificate instead of in a table.
- **D-07:** Page format: **portrait A4**, consistent with the results-list PDF — reuses the same jsPDF page setup and header/logo placement code from `pdfExport.ts` rather than introducing a landscape "certificate" layout.

### Filenames
- **D-08:** Zip file: `Urkunden_<date>.zip` (e.g. `Urkunden_2026-07-06.zip`). Per-shooter certificate PDF (both inside the zip and from the standalone row action): `Urkunde_<ShooterName>_<date>.pdf` — mirrors Phase 5's `Ergebnisse_<date>.pdf` convention exactly.

### Claude's Discretion
- Exact certificate page layout/typography (spacing, decorative elements, font sizes for name/rank/class) beyond the fixed header treatment.
- Where exactly the "Urkunden erstellen" bulk button sits in the Results view (likely alongside the existing Phase 5 PDF export button).
- Zip library choice (JSZip is the natural default given ecosystem maturity and browser-Blob support) and its integration with the existing anchor-click download pattern from Phase 5.
- Whether the include/exclude-incomplete-shooters toggle (D-09 from Phase 5) applies to certificate generation too — reuse that existing filter logic (`buildClassTableRows`'s `includeIncomplete` pattern) unless research surfaces a reason not to.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### PDF generation stack & existing PDF export code
- `CLAUDE.md` — jsPDF + jspdf-autotable stack rationale; also flags `pdf-lib` as the alternative only if a future need to edit/fill existing PDF templates arises (not the case here).
- `src/lib/utils/pdfExport.ts` — existing results-list PDF generator. Reuse directly: `containFit()` (aspect-ratio-preserving logo placement), `blobToDataUri()`, the settings/logo/title header-rendering block in `buildResultsPdfDoc()`, and the `resultsPdfFilename()` date-filename pattern (extend for `Urkunde_...`/`Urkunden_...` naming per D-08).
- `src/lib/utils/pdfExport.test.ts` — existing test patterns for pure PDF-building functions (assert on `doc.getNumberOfPages()`, table row-building, etc.) — mirror this test style for the new certificate-building functions.

### Ranked results data source
- `src/lib/utils/ranking.ts` — `computeClassRankings()` / `RankedRow` (shooterId, name, line, sum, rank, isComplete) is the direct data source for each certificate's name/rank/sum fields; no new ranking logic needed.

### Settings & header infrastructure (Phase 5)
- `src/lib/components/SettingsForm.svelte` — existing Settings UI (title + 2 logo uploads, downscale-on-upload, remove buttons). Add the new static certificate-heading text field here, following the same UI/save-feedback pattern ("Gespeichert." confirmation).
- `.planning/phases/05-pdf-export/05-CONTEXT.md` — D-02/D-03/D-05: settings/logo infrastructure was explicitly built generically in Phase 5 so this phase could reuse it as-is; confirms no new Dexie schema/blob-storage pattern is needed beyond one new text field.

### Prior milestone scope note
- `.planning/PROJECT.md` — "Out of Scope" section: WhatsApp/automated delivery of certificates deferred to v2; this phase is PDF generation only, no delivery mechanism.
- `.planning/phases/05-pdf-export/05-CONTEXT.md` `<deferred>` section — original user story for this phase: "As a Trainer/Kampfrichter, I want to generate PDF certificates for the top shooters, so that I can hand them out or share them, and lay the groundwork for v2's automated delivery."

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `containFit()`, `blobToDataUri()` (`src/lib/utils/pdfExport.ts`) — logo placement and Blob-to-dataURI conversion, needed identically for certificate headers.
- `computeClassRankings()` / `RankedRow` (`src/lib/utils/ranking.ts`) — supplies exactly the per-shooter fields (name, class via section grouping, sum, rank, isComplete) each certificate needs.
- Existing `settings` Dexie table (title + logoLeftBlob + logoRightBlob) — extend with one new field (certificate heading text) rather than a new table.
- Existing anchor-click download pattern (Phase 5, WR-04 fix: append-to-DOM-before-click for Safari/iOS) — reuse for both the zip download and the single per-shooter PDF download.

### Established Patterns
- PDF generation is pure/framework-free (`buildResultsPdfDoc`, `generateResultsPdf` take plain data in, return a `jsPDF`/`Blob` out, no Svelte dependency) — the code comment in `pdfExport.ts` line 6-8 already anticipates this phase ("mirrors ranking.ts's pure-function style so it stays reusable (Phase 6 certificates...) without rewriting"). Follow the same pure-function shape for certificate generation.
- Settings changes follow an established save-feedback UX ("Gespeichert." confirmation) — apply to the new certificate-heading field.

### Integration Points
- `src/lib/views/Results.svelte` — add the tournament-wide "Urkunden erstellen" button (likely near the existing Phase 5 export button) and the per-row single-certificate action in the results table.
- `src/lib/components/SettingsForm.svelte` — add the new static certificate-heading text field.

</code_context>

<specifics>
## Specific Ideas

- Zip filename example: `Urkunden_2026-07-06.zip`.
- Per-shooter certificate filename example: `Urkunde_MaxMustermann_2026-07-06.pdf`.
- Certificate heading text examples: "Urkunde" or "Teilnahmeurkunde" — free text, static (no placeholders), configured once in Settings.

</specifics>

<deferred>
## Deferred Ideas

- **WhatsApp/automated delivery of certificates** — deferred to v2 per `PROJECT.md` Out of Scope; this phase only produces downloadable PDF/zip files.
- **Templated certificate text with placeholders** (e.g. `{name}`/`{rank}` inside a custom sentence) — user chose a static heading instead; could revisit in a future phase if requested.
- **Blank pre-printed scoresheets (DIN A5)** — unrelated deferred item from Phase 5, not part of this phase.

### Reviewed Todos (not folded)
None — `todo.match-phase` returned zero matches for Phase 6.

</deferred>

---

*Phase: 6-certificates-pdf-export*
*Context gathered: 2026-07-06*
