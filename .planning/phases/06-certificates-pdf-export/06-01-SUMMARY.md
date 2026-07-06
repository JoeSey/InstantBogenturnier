---
phase: 06-certificates-pdf-export
plan: 01
subsystem: database
tags: [jszip, dexie, indexeddb, i18n, schema-migration]

# Dependency graph
requires:
  - phase: 05-pdf-export
    provides: Dexie v4 settings singleton table (title, logoLeftBlob, logoRightBlob) and resultsPdf/settingsForm string sections
provides:
  - jszip runtime dependency for bulk certificate ZIP downloads (Plan 02+)
  - SettingsRecord.certificateHeading field with Dexie v5 migration defaulting existing rows to 'Urkunde'
  - certificateExport string section + settingsForm certificateHeading strings in strings.de.ts
affects: [06-02, 06-03, 06-04, 06-05]

# Tech tracking
tech-stack:
  added: [jszip@3.10.1]
  patterns: [Dexie versioned migration restating all prior stores unchanged, then chaining .upgrade() for new-field defaults]

key-files:
  created: []
  modified:
    - package.json
    - package-lock.json
    - src/lib/db/schema.ts
    - src/lib/db/schema.test.ts
    - src/lib/i18n/strings.de.ts

key-decisions:
  - "certificateHeading defaults to 'Urkunde' via Dexie v5 .upgrade(), keeping existing installations' settings rows consistent without user action"
  - "v5 migration test simulates a genuine v4->v5 upgrade using a separate raw Dexie instance (not just resetDb + put), since Dexie only runs .upgrade() during an actual version transition"

patterns-established:
  - "Testing Dexie .upgrade() migrations: close the shared db, delete the underlying IndexedDB database, recreate/open a temporary Dexie instance scoped to the prior version only, write pre-migration data, close it, then reopen the real (latest-version) db and assert the upgrade default applied"

requirements-completed: [D-03, D-05]

# Metrics
duration: 25min
completed: 2026-07-06
---

# Phase 6 Plan 01: Foundation (JSZip, Schema Migration, Strings) Summary

**jszip installed, Dexie v5 migration adds SettingsRecord.certificateHeading defaulting existing rows to 'Urkunde', and all Phase 6 UI copy landed in strings.de.ts**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-06T20:27:00Z
- **Completed:** 2026-07-06T20:52:02Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- `jszip` added as a runtime dependency (RESEARCH.md-approved, no checkpoint needed)
- `SettingsRecord.certificateHeading?: string` field added; Dexie v5 `.stores()`/`.upgrade()` block defaults existing settings rows to `'Urkunde'`
- New `certificateExport` string section plus `settingsForm.certificateHeadingLabel`/`certificateHeadingPlaceholder` added to `strings.de.ts`, giving Plans 02-05 everything they need without further edits to this file

## Task Commits

Each task was committed atomically:

1. **Task 1: Install JSZip and add the certificateHeading schema migration** - `24f04a4` (feat)
2. **Task 2: Add Phase 6 UI strings** - `d41e102` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `package.json` / `package-lock.json` - jszip runtime dependency
- `src/lib/db/schema.ts` - `SettingsRecord.certificateHeading` field + Dexie v5 `.stores()`/`.upgrade()` migration
- `src/lib/db/schema.test.ts` - new "Dexie v5 schema" describe block (table membership, migration default via simulated v4→v5 upgrade, explicit-value round-trip)
- `src/lib/i18n/strings.de.ts` - `certificateExport` section + two new `settingsForm` keys

## Decisions Made
- Simulated a real v4→v5 Dexie migration in the test (temporary raw Dexie instance at v4, write, close, then reopen the real v5 `db`) rather than just calling `db.settings.put()` under `resetDb()`, because `.upgrade()` only fires during an actual version transition, not on a fresh open or a cleared table.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

`npm run check` reports 5 pre-existing TypeScript errors in `src/lib/utils/pdfExport.test.ts` (`Pick<SettingsRecord, ...>` literals including `id`). Confirmed via `git stash`/re-run that these errors exist identically on the pre-plan commit — unrelated to this plan's changes, out of scope per the scope-boundary rule, not fixed here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `jszip` is importable from any Phase 6 module (Plan 02's `certificateExport.ts` bulk ZIP creation)
- `SettingsRecord.certificateHeading` is available for `SettingsForm.svelte` (Plan 03/04) and `certificateExport.ts` (Plan 02) to read/write
- All Phase 6 UI strings exist in `strings.de.ts`; no downstream plan needs to edit this file
- No blockers for Wave 2 plans

---
*Phase: 06-certificates-pdf-export*
*Completed: 2026-07-06*
