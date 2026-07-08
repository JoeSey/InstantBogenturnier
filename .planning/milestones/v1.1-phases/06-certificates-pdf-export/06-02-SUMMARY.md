---
phase: 06-certificates-pdf-export
plan: 02
subsystem: pdf-export
tags: [jspdf, jszip, vitest, tdd, certificates]

requires:
  - phase: 06-certificates-pdf-export (Plan 01)
    provides: settings.certificateHeading field (Dexie v5 schema)
  - phase: 05-pdf-export
    provides: containFit() logo aspect-ratio scaling, header/logo rendering pattern in pdfExport.ts, RankedRow shape from ranking.ts
provides:
  - "buildCertPdf(rankedRow, className, settings): Promise<jsPDF> — single-shooter A4 portrait certificate PDF"
  - "generateSingleCertPdf(...): Promise<Blob> — Blob wrapper for a single certificate"
  - "generateBulkCerts(classifications, classes, settings): Promise<Blob> — all shooters bundled into a JSZip archive, no top-N cutoff"
  - "certificatePdfFilename(shooterName, date) / zipFilename(date) — D-08 filename helpers"
affects: [06-certificates-pdf-export (Plan 04 — UI wiring for bulk 'Urkunden erstellen' and per-row single export)]

tech-stack:
  added: []
  patterns: ["pure framework-free util module mirroring pdfExport.ts/ranking.ts style", "JSZip bundling of per-shooter Blobs"]

key-files:
  created:
    - src/lib/utils/certificateExport.ts
    - src/lib/utils/certificateExport.test.ts
  modified: []

key-decisions:
  - "Reused pdfExport.ts's containFit() and header-rendering approach verbatim rather than duplicating logo-scaling logic"
  - "In generateBulkCerts, filenames/ordering mirror buildResultsPdfDoc's alphabetical-by-class-name convention for consistency with the existing PDF export"
  - "Test-only fix: JSZip.loadAsync() in Vitest+jsdom cannot reliably accept a raw Blob or ArrayBuffer produced across the jsdom/Node realm boundary (instanceof checks fail even though bytes are identical) — tests wrap the Blob's bytes in a Uint8Array constructed in the test's own realm before calling JSZip.loadAsync(); production code paths (browser only, single realm) are unaffected and still use plain Blob/ArrayBuffer"

patterns-established:
  - "Pure, framework-free certificate generation module — same style as pdfExport.ts/ranking.ts, fully unit-testable without a browser or Svelte"

requirements-completed: [D-01, D-03, D-04, D-05, D-06, D-07, D-08]

duration: 25min
completed: 2026-07-06
---

# Phase 06 Plan 02: Certificate PDF/ZIP Generation Core Summary

**Pure `certificateExport.ts` module (buildCertPdf/generateSingleCertPdf/generateBulkCerts + filename helpers) generating single-shooter A4 certificates and a no-cutoff bulk ZIP, built TDD-first and reusing Phase 5's containFit() logo scaling.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-06T20:56:00Z
- **Completed:** 2026-07-06T21:02:36Z
- **Tasks:** 2 (TDD RED/GREEN)
- **Files modified:** 2 created

## Accomplishments
- `certificatePdfFilename()` / `zipFilename()` implementing exact D-08 filename conventions
- `buildCertPdf()` — single-page A4 portrait certificate reusing Phase 5's header/logo rendering (title, left/right logos via `containFit()`), then a configurable certificate heading (default `'Urkunde'`) and shooter name/class/rank/sum block per 06-UI-SPEC.md's layout
- `generateSingleCertPdf()` Blob wrapper and `generateBulkCerts()` bundling every shooter across all classes (no top-N cutoff, per D-01) into a single JSZip archive
- 8 passing unit tests covering CRT-01 through CRT-06/CRT-10 from 06-RESEARCH.md's Test Map

## Task Commits

1. **Task 1: Write failing tests for certificateExport.ts (RED)** - `bbadbbd` (test)
2. **Task 2: Implement certificateExport.ts to pass all tests (GREEN)** - `71cf19a` (feat)

_Note: `npm install` was run mid-Task-1 to sync `node_modules` with the already-declared `jszip@^3.10.1` dependency (present in package.json/package-lock.json from Plan 01 but not yet installed in this worktree) — no package.json/lockfile changes resulted, so nothing additional was committed._

## Files Created/Modified
- `src/lib/utils/certificateExport.ts` - `buildCertPdf`, `generateSingleCertPdf`, `generateBulkCerts`, `certificatePdfFilename`, `zipFilename` — pure, framework-free certificate PDF/ZIP generation
- `src/lib/utils/certificateExport.test.ts` - Unit tests for all five exports (filename formatting, single-cert page/content, bulk ZIP file count/naming/no-cutoff)

## Decisions Made
- Reused `containFit()` from `pdfExport.ts` directly (imported, not reimplemented) for logo aspect-ratio scaling, per the plan's interfaces block.
- `generateBulkCerts` orders classes alphabetically by name before looping, mirroring `buildResultsPdfDoc`'s existing convention (D-04-consistent), even though not explicitly mandated for certificates.
- Certificate heading and shooter-detail Y-offsets (60mm/85mm/93mm/101mm/109mm) taken directly from 06-UI-SPEC.md's Certificate Content Structure section.

## Deviations from Plan

**1. [Rule 3 - Blocking] Ran `npm install` to sync node_modules with the already-declared `jszip` dependency**
- **Found during:** Task 1 (writing the RED test file)
- **Issue:** `jszip@^3.10.1` was already declared in `package.json`/`package-lock.json` (added in Plan 01) but not present in this worktree's `node_modules`, causing a module-resolution error unrelated to the RED-test-should-fail expectation
- **Fix:** Ran `npm install` (no new package added — already a locked, declared dependency, so this is a sync operation, not a new install requiring package-legitimacy verification)
- **Files modified:** none (package.json/package-lock.json unchanged by the sync)
- **Verification:** `node_modules/jszip` present afterward; test suite could resolve the import
- **Committed in:** N/A (no file changes to commit)

**2. [Rule 1 - Bug] Fixed a jsdom/Node Blob-realm mismatch in the ZIP-content assertions (test-only)**
- **Found during:** Task 2 (GREEN — running the ZIP-content tests)
- **Issue:** `JSZip.loadAsync(blob)` and `JSZip.loadAsync(await blob.arrayBuffer())` both threw in Vitest's jsdom environment because JSZip's internal `instanceof Blob`/`instanceof ArrayBuffer` checks (and jsdom's FileReader Blob-brand check) fail across the jsdom/Node realm boundary, even though the underlying bytes are correct — a known Vitest+jsdom+JSZip interop issue, not a bug in the implementation
- **Fix:** Test file now wraps the Blob's bytes in a `Uint8Array` (constructed in the test's own realm) before calling `JSZip.loadAsync()`; production `generateBulkCerts()` still returns a plain Blob via `zip.generateAsync({ type: 'blob', ... })`, unaffected by this test-environment-only workaround (real browsers have a single realm)
- **Files modified:** `src/lib/utils/certificateExport.test.ts`
- **Verification:** `npm test -- src/lib/utils/certificateExport.test.ts` — 8/8 passing
- **Committed in:** `71cf19a` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking/dependency-sync, 1 bug/test-environment workaround)
**Impact on plan:** Both fixes were necessary to get from RED to GREEN; no scope creep, no changes to the module's public API or behavior described in the plan.

## Issues Encountered
- Vitest+jsdom's Blob/ArrayBuffer realm mismatch with JSZip (see Deviation 2 above) took several iterations to isolate — confirmed via a throwaway scratch test that `blob.arrayBuffer() instanceof ArrayBuffer` is `false` in this environment, which pinpointed the root cause.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
`certificateExport.ts` exports exactly the five functions Plan 04's UI wiring needs (`buildCertPdf`, `generateSingleCertPdf`, `generateBulkCerts`, `certificatePdfFilename`, `zipFilename`), all pure and Svelte-independent, ready to be called directly from the bulk "Urkunden erstellen" action and the per-row single-certificate export button. No blockers.

---
*Phase: 06-certificates-pdf-export*
*Completed: 2026-07-06*
