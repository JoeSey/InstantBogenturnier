---
phase: 03-score-entry
reviewed: 2026-07-05T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - e2e/scoring.spec.ts
  - src/App.svelte
  - src/lib/components/RoundPasseSelector.svelte
  - src/lib/components/ScorePicker.svelte
  - src/lib/components/ScoreTable.svelte
  - src/lib/db/schema.test.ts
  - src/lib/db/schema.ts
  - src/lib/i18n/strings.de.ts
  - src/lib/utils/scoreCompletion.test.ts
  - src/lib/utils/scoreCompletion.ts
  - src/lib/utils/sortComparators.test.ts
  - src/lib/utils/sortComparators.ts
  - src/lib/views/ScoreEntry.svelte
  - src/lib/views/ScoreEntry.test.ts
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-07-05
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Score entry implementation is substantially sound with correct handling of scoring rules (M=0, X=10), proper Dexie schema design with compound keys, and comprehensive test coverage. Svelte 5 runes are correctly used for reactive state. The finalize/lock mechanism properly persists tournament state to IndexedDB and survives page reloads.

Primary concerns are code clarity issues in type handling and missing defensive validation around round/passe selection. No security vulnerabilities or data loss risks detected.

## Warnings

### WR-01: Confusing Type Assertion in Score Array Building

**File:** `src/lib/views/ScoreEntry.svelte:78`

**Issue:** The expression `(currentPasseScoreByKey.get(...) as ScoreValue) ?? null` uses an unnecessary type assertion that confuses the intent. The cast `as ScoreValue` tells TypeScript to trust the value is `ScoreValue`, but the map's `.get()` actually returns `ScoreValue | undefined`. While the nullish coalescing operator (`?? null`) correctly handles the undefined case at runtime, the type assertion misleads readers into thinking the value is guaranteed to be a `ScoreValue`.

**Fix:**
```typescript
// Replace this:
arrows.push((currentPasseScoreByKey.get(`${shooter.id}-${i}`) as ScoreValue) ?? null);

// With this (cleaner, type-safe):
arrows.push(currentPasseScoreByKey.get(`${shooter.id}-${i}`) ?? null);
```

TypeScript will correctly infer the result type as `ScoreValue | null` without the misleading assertion. This improves code readability and makes type safety explicit.

### WR-02: Missing Validation of Round/Passe Indexes Before Database Writes

**File:** `src/lib/views/ScoreEntry.svelte:115-122`

**Issue:** In `handleScoreSelect()`, the `selectedRound` and `selectedPasse` state values are written directly to the database without validation:

```typescript
db.scores.put({
  shooterId,
  roundIndex: selectedRound,  // ← not validated
  passeIndex: selectedPasse,   // ← not validated
  arrowIndex,
  value,
  finalized: false,
})
```

While these come from HTML select elements with options generated from `roundsConfig`, there is a theoretical race condition: if `roundsConfig` changes (e.g., user reconfigures the tournament) after the user opens a score cell picker, `selectedRound` or `selectedPasse` could reference an invalid index. The resulting score record would have an out-of-bounds index, potentially creating orphaned data.

**Fix:**
```typescript
function handleScoreSelect(value: ScoreValue) {
  if (!pickerCell) return;
  if (!roundsConfig) return; // guard missing config
  
  // Validate round/passe are within configured bounds
  if (selectedRound >= roundsConfig.numberOfRounds || selectedRound < 0) return;
  if (selectedPasse >= roundsConfig.passesPerRound || selectedPasse < 0) return;
  
  const { shooterId, arrowIndex } = pickerCell;
  pickerCell = null;
  db.scores.put({
    shooterId,
    roundIndex: selectedRound,
    passeIndex: selectedPasse,
    arrowIndex,
    value,
    finalized: false,
  }).catch((err) => {
    errorFeedback = strings.common.saveError.replace(
      '{error}',
      err instanceof Error ? err.message : String(err)
    );
  });
}
```

## Info

### IN-01: Missing Shooter Class Name Defaults to Empty String

**File:** `src/lib/views/ScoreEntry.svelte:85`

**Issue:** When building score table rows, if a shooter's `classId` is not found in the `classNameById` map, the class name defaults to an empty string:

```typescript
className: classNameById.get(shooter.classId) ?? ''
```

This could silently hide data consistency issues. If a shooter is assigned to a deleted class, the table would display an empty class column without any warning or visual indication that something is broken.

**Fix:**
```typescript
className: classNameById.get(shooter.classId) ?? '[Gelöschte Klasse]'
```

Or implement explicit error handling with a warning message to the user.

### IN-02: Finalize Logic Implicitly Assumes Single-Tournament Model

**File:** `src/lib/views/ScoreEntry.svelte:145-146`

**Issue:** The `handleFinalizeConfirm()` function finalizes all scores in the database without filtering by tournament:

```typescript
const all = await db.scores.toArray();
await db.scores.bulkPut(all.map((s) => ({ ...s, finalized: true })));
```

This works correctly for Phase 3 (single-device, single-tournament design), but the code does not explicitly document or enforce this assumption. If future phases add multi-tournament or session management, this silent reliance could cause bugs.

**Suggestion:** Add a clarifying comment documenting the single-tournament assumption, and consider adding a `sessionId` or `tournamentId` field to `ScoreRecord` to make this explicit (useful preparation for Phase 4+ multi-match scenarios).

### IN-03: E2E Test Hook Adds Minimal Runtime Surface

**File:** `src/App.svelte:38-46`

**Issue:** The `__setUpdateAvailable` hook is exposed on `window` when `?e2e=1` is present in the URL query parameters. While the opt-in is explicit and the feature is only used by tests, this is a runtime hook that could theoretically be discovered via developer tools or URL manipulation.

**Assessment:** This is acceptable for testing purposes. The hook is clearly marked as test-only via the comment, and CLAUDE.md notes that no manual "check for updates" UI ships (D-04), so this doesn't expand the trainer's attack surface. No action required, but document the contract clearly (already done in the comment).

---

## Strengths

- **Correct scoring semantics:** `arrowScoreValue()` and `calculatePasseSum()` correctly implement M=0, X=10 convention with comprehensive unit tests.
- **Sound database schema:** Dexie v3 compound primary key `[shooterId+roundIndex+passeIndex+arrowIndex]` prevents duplicate records elegantly.
- **Proper state management:** Svelte 5 runes (`$state`, `$derived`) correctly separate mutable state from computed views without external store libraries.
- **Accessible component design:** `ScoreTable` has proper ARIA sort attributes, `ScorePicker` follows non-dismissible modal pattern with Escape key support, `ScoreEntry` uses `role="status"` for live updates.
- **Thorough test coverage:** Unit tests cover edge cases (vacuous completion check, null line/sum sorting, score override via same-cell re-entry), E2E tests verify IndexedDB persistence.
- **Non-blocking autosave:** Score writes use fire-and-forget with error feedback (WR-04 pattern), avoiding UI freeze during saves.

---

_Reviewed: 2026-07-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
