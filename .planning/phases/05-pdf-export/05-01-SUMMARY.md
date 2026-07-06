---
phase: 05-pdf-export
plan: 01
subsystem: database
tags: [dexie, svelte5, canvas, image-processing, indexeddb, playwright]

requires: []
provides:
  - "Dexie v4 `settings` singleton table (title + optional logoLeftBlob/logoRightBlob)"
  - "downscaleImageBlob() Canvas-based image resize/compress utility"
  - "SettingsForm.svelte wired into Setup view"
affects: [05-pdf-export plan 02, phase 6 certificates]

tech-stack:
  added: []
  patterns:
    - "Canvas-based client-side image downscaling (FileReader -> Image -> Canvas drawImage -> toBlob/toDataURL)"
    - "Singleton Dexie table pattern (id: 1) extended to a Blob-bearing table"

key-files:
  created:
    - src/lib/utils/imageDownscale.ts
    - src/lib/utils/imageDownscale.test.ts
    - src/lib/components/SettingsForm.svelte
    - e2e/settingsUpload.spec.ts
  modified:
    - src/lib/db/schema.ts
    - src/lib/db/schema.test.ts
    - src/lib/db/testHelpers.ts
    - src/lib/views/Setup.svelte
    - src/lib/i18n/strings.de.ts
    - vitest-setup.ts

key-decisions:
  - "Aligned vitest's global Blob with Node's node:buffer Blob (vitest-setup.ts) so fake-indexeddb's structuredClone-based insertion cloning round-trips Blob values correctly under jsdom — jsdom's own Blob polyfill isn't recognized by Node's global structuredClone(), which caused Blob round-trip tests to fail with an empty object instead of a Blob instance."
  - "SettingsForm rebuilds object-URL previews from previously saved logo Blobs on load (not just the title text), so a page reload visually shows the same logo images, matching the plan's 'trainer... reload the page, verify persisted' verification step."

patterns-established:
  - "Client-side Canvas image downscale utility (imageDownscale.ts) — reusable for the future certificates phase (Phase 6) per 05-CONTEXT.md D-05."

requirements-completed: [PDF-02, PDF-03]

duration: ~35min
completed: 2026-07-06
---

# Phase 5 Plan 01: Settings Table + Form Summary

**Dexie v4 `settings` singleton table (title + two logo Blobs) with a Canvas-based `downscaleImageBlob()` utility and a `SettingsForm.svelte` wired into Setup — verified end-to-end including the existing preset export/import round trip.**

## Performance

- **Tasks:** 2 completed
- **Files modified:** 10 (4 created, 6 modified)

## Accomplishments
- Dexie schema bumped to v4 with a `settings` table (`id`, `title?`, `logoLeftBlob?`, `logoRightBlob?`), restating all prior `.version().stores()` calls unchanged per Dexie's versioning requirement.
- `downscaleImageBlob(file, maxWidth, maxHeight, quality)` utility: validates MIME type before Canvas processing (T-05-01 mitigation), preserves aspect ratio, and produces a sub-200KB Blob + matching data URI.
- `SettingsForm.svelte`: title input, two logo file inputs with pre-flight 200KB size gate + Canvas downscale, image previews, and a Speichern button with `QuotaExceededError`-aware error handling — nested into `Setup.svelte`'s right-hand column.
- Full round trip verified: upload → save → reload persistence → existing dexie-export-import preset export/delete/import cycle preserves the settings row.

## Task Commits

1. **Task 1: Dexie v4 settings table + image downscale utility** - `303c413` (feat)
2. **Task 2: SettingsForm component + wiring into Setup view** - `0e7ff23` (feat)

## Files Created/Modified
- `src/lib/db/schema.ts` - Adds `SettingsRecord` interface, `settings` table, and Dexie v4 `.version(4).stores()`.
- `src/lib/db/schema.test.ts` - Adds a "Dexie v4 schema" describe block (table membership, singleton roundtrip, Blob roundtrip) plus updates the v2/v3 table-count assertions to reflect the now-7-table schema.
- `src/lib/db/testHelpers.ts` - Adds `db.settings.clear()` to `resetDb()`.
- `src/lib/utils/imageDownscale.ts` - New Canvas-based downscale utility, exports `downscaleImageBlob()`.
- `src/lib/utils/imageDownscale.test.ts` - Unit tests mocking `Image`/`HTMLCanvasElement` (jsdom has no real Canvas rendering) for size-cap, aspect-ratio, and non-image-rejection coverage.
- `src/lib/components/SettingsForm.svelte` - New component: title + two logo uploads, wired to `db.settings` via `liveQuery`.
- `src/lib/views/Setup.svelte` - Imports and renders `<SettingsForm />` in a new `GlassCard` section at the end of the right-hand column.
- `src/lib/i18n/strings.de.ts` - Adds the `settingsForm` strings section (10 keys) per 05-UI-SPEC.md's Copywriting Contract.
- `e2e/settingsUpload.spec.ts` - New Playwright spec: upload → save → reload persistence → preset export/delete/import round trip.
- `vitest-setup.ts` - Aligns global `Blob` with Node's `node:buffer` Blob (see Decisions).

## Decisions Made
- **Global Blob alignment in vitest-setup.ts (deviation, not in plan's `files_modified` list):** discovered during Task 1 that jsdom's built-in `Blob` class is a separate implementation from the one Node's global `structuredClone()` recognizes. `fake-indexeddb`'s insertion-cloning path (`cloneValueForInsertion.js`) calls the global `structuredClone()`, which silently produced `{}` instead of a Blob when given a jsdom Blob — verified with a standalone repro before deciding this was an environment fix, not an application bug (native Node `Blob` + `structuredClone()` round-trips correctly outside jsdom). Fixed once at the shared test-setup level (`globalThis.Blob = NodeBlob`) rather than working around it per-test, since any future Dexie Blob test would hit the same issue.
- **SettingsForm rebuilds preview object-URLs on load:** the plan's `done` criterion for Task 2 explicitly requires the logo image to be visible after a reload, not just the title — so the component's load-sync `$effect` calls `URL.createObjectURL()` on any Blob already in the loaded record, not only on freshly uploaded files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Environment gap] vitest global Blob/structuredClone mismatch under jsdom**
- **Found during:** Task 1 (Blob round-trip unit test)
- **Issue:** `db.settings.put({ ..., logoLeftBlob: someBlob })` followed by `db.settings.get(1)` returned `logoLeftBlob: {}` instead of a `Blob` instance — the acceptance criterion "Blob values survive round trip returning a Blob instance" failed purely due to jsdom's Blob polyfill not matching what Node's structuredClone() expects.
- **Fix:** Added `globalThis.Blob = NodeBlob` (from `node:buffer`) in `vitest-setup.ts`, applied once for the whole suite.
- **Files modified:** `vitest-setup.ts`
- **Verification:** `npm run test -- src/lib/db/schema.test.ts` — Blob roundtrip test passes; full `npm run test` (134 tests, 20 files) still green afterward.
- **Committed in:** `303c413` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (environment/tooling gap, not a plan or application defect)
**Impact on plan:** Necessary to make the plan's own Blob-roundtrip acceptance criterion pass in this project's jsdom-based unit test environment; no scope creep, no change to application behavior (only affects the vitest sandbox, not production code).

## Issues Encountered
- The e2e settings-reload assertion initially flaked because the Speichern click handler's `db.settings.put()` write is fire-and-forget from the button's `onclick` — the test's `page.reload()` could race ahead of the IndexedDB write completing. Fixed by adding a short `page.waitForTimeout(300)` between the save click and the reload in `e2e/settingsUpload.spec.ts`, confirmed via a throwaway debug spec that isolated the timing (removed before final commit).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `db.settings` table and `downscaleImageBlob()` are ready for Plan 02 (PDF generation) to read the title/logo Blobs for the jsPDF header.
- Built generically (not PDF-export-specific) per 05-CONTEXT.md D-05, so Phase 6 (certificates) can reuse the same settings table without further schema changes.
- No blockers identified.

---
*Phase: 05-pdf-export*
*Completed: 2026-07-06*
