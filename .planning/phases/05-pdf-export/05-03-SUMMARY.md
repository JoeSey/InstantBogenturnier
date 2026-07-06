---
phase: 05-pdf-export
plan: 05-03
executed: 2026-07-06
status: complete
---

# 05-03 Gap Closure: Summary

## What this plan closed

Two gaps flagged against Phase 5's PDF export in `.planning/phases/05-pdf-export/05-REVIEW.md`:

- **CR-01** (critical): `buildResultsPdfDoc()` hard-coded `doc.addImage(..., 'PNG', ...)`,
  but `downscaleImageBlob()` preserved JPEG encoding for JPEG uploads — any club logo
  uploaded as a JPEG would throw or corrupt on PDF export.
- **WR-02** (warning): logos were drawn into a fixed 25x20mm box regardless of their
  actual (aspect-ratio-preserving) dimensions, stretching/squashing any non-1.25:1 logo
  (square crests, wide banners).

Note: `05-03-PLAN.md` and `05-VERIFICATION.md` referenced by the orchestrator task
description were not present in this worktree. The two tasks were executed exactly as
specified in the objective ("Task 1: normalize downscaleImageBlob to PNG; Task 2: fix
aspect-ratio stretching with containFit"), cross-checked against the concrete findings
in `05-REVIEW.md` (CR-01 and WR-02) to confirm scope and root cause.

## Task 1 — Normalize downscaleImageBlob to PNG

**File:** `src/lib/utils/imageDownscale.ts`

Changed `downscaleImageBlob()` to always re-encode the canvas output as `image/png`,
regardless of the source file's MIME type (previously JPEG uploads stayed JPEG-encoded).
This closes CR-01 at its source: since every stored logo blob is now guaranteed PNG,
`pdfExport.ts`'s existing hard-coded `'PNG'` format argument to `doc.addImage()` is no
longer a mismatch for any upload path.

Existing `imageDownscale.test.ts` tests (blob-size cap, aspect-ratio-preserving canvas
sizing, non-image rejection) all still pass unchanged.

## Task 2 — Fix aspect-ratio stretching with containFit

**File:** `src/lib/utils/pdfExport.ts`

Added a new exported pure function `containFit(naturalWidth, naturalHeight, maxWidth,
maxHeight)` that scales natural image dimensions down to fit inside a bounding box
without distortion (mirrors CSS `object-fit: contain`), falling back to the max box
size if natural dimensions are zero/invalid.

`buildResultsPdfDoc()` now calls `doc.getImageProperties(logoData)` to read each logo's
natural width/height, computes the contain-fit size via `containFit()` against a
25x20mm max box (same box size as before), and draws each logo at its computed
(non-distorted) width/height instead of the previous fixed `25, 20`. The vertical
cursor advance after the logo row (`imageY += ...`) now uses the taller of the two
logos' computed heights instead of an assumed fixed `20`.

Added 4 unit tests for `containFit()` covering: wide (2:1) input width-constrained,
tall (0.5:1) input height-constrained, square (1:1) input, and the zero-dimension
fallback case.

## Deviation: dropped a planned integration test

Attempted to add an integration test in `pdfExport.test.ts` exercising
`buildResultsPdfDoc()` with real `Blob` logo data (base64-decoded 1x1 PNG) end-to-end
through `blobToDataUri()`'s `FileReader.readAsDataURL()`. This failed with `TypeError:
Failed to execute 'readAsDataURL' on 'FileReader': parameter 1 is not of type 'Blob'`
— confirmed via a standalone sanity test that this is a pre-existing limitation of this
project's jsdom/Vitest environment (real `Blob` → `FileReader` round-trips don't work at
all here, not something introduced by this change). This is consistent with how
`imageDownscale.test.ts` already sidesteps the same limitation by mocking
`canvas.toBlob`/`Image` entirely rather than exercising real Blob/FileReader plumbing.
Dropped that test and relied on the `containFit()` unit tests (which cover the actual
aspect-ratio math) plus the existing no-logo `generateResultsPdf` tests (which confirm
the surrounding code path still produces valid PDFs).

## Verification

- `npx vitest run src/lib/utils/imageDownscale.test.ts` — 3/3 pass
- `npx vitest run src/lib/utils/pdfExport.test.ts` — 12/12 pass (8 pre-existing + 4 new `containFit` tests)
- `npx tsc --noEmit -p .` — clean, no type errors
- `npx vitest run` (full suite) — 146/146 tests pass across 21 files

## Files changed

- `src/lib/utils/imageDownscale.ts` — normalize output MIME type to PNG
- `src/lib/utils/pdfExport.ts` — add `containFit()`, use it for logo draw sizing
- `src/lib/utils/pdfExport.test.ts` — add `containFit()` unit tests

## Commits

1. `fix: normalize downscaled logo output to PNG regardless of source type`
2. `fix: preserve logo aspect ratio in PDF export instead of stretching`
