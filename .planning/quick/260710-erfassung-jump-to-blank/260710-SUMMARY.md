# Quick Task 260710-erfassung-jump-to-blank Summary

One-liner: Erfassung now auto-jumps to the first round/passe with a blank arrow on initial load, via a pure `findFirstIncompletePasse` helper wired into a one-shot `$effect`.

## What Changed

- **`src/lib/utils/scoreCompletion.ts`**: Added `findFirstIncompletePasse(shooterIds, numberOfRounds, passesPerRound, arrowsPerPasse, scores)`. Scans rounds then passes (round-major order, matching `RoundPasseSelector`'s visual hierarchy), delegating the per-passe check to the existing `isPasseComplete`. Returns `{ roundIndex, passeIndex }` for the first incomplete passe, or `null` when everything is complete or there are zero shooters registered.
- **`src/lib/utils/scoreCompletion.test.ts`**: Added a `describe('findFirstIncompletePasse')` block covering: zero shooters (null), empty scores with a shooter present (returns `{0,0}`, equivalent to the existing default), a mid-tournament gap, a later round with no records at all, and the all-complete case (null).
- **`src/lib/views/ScoreEntry.svelte`**: Imported `findFirstIncompletePasse`; added `let hasAppliedInitialJump = $state(false);` next to the other state; added an `$effect` (placed after the `rows` derived, before the event handlers) that fires once data has loaded (`roundsConfig` truthy, `shooters.length > 0`). When `allScores.length > 0`, it computes the first incomplete passe and, if found, sets `selectedRound`/`selectedPasse`. Regardless of outcome, it flips `hasAppliedInitialJump = true` on that first qualifying run so the effect becomes a permanent no-op afterward — later `liveQuery` updates to `allScores` (e.g. a new score entered) never retrigger the jump, and manual navigation via `RoundPasseSelector`/advance button is never overridden.
- **`src/lib/views/ScoreEntry.test.ts`**: Added a `describe('initial jump to first incomplete passe (260710-erfassung-jump-to-blank)')` block with four tests: fresh tournament (no scores) opens on round 1/passe 1; a tournament with an earlier passe complete and a later one partially filled jumps to that later passe; a fully-complete tournament still opens on round 1/passe 1; and manually navigating back to an earlier passe after the initial jump is not undone by a subsequently-entered score.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx vitest run src/lib/utils/scoreCompletion.test.ts` — 23/23 tests pass (5 new for `findFirstIncompletePasse`).
- `npx vitest run src/lib/views/ScoreEntry.test.ts` — 23/23 tests pass (4 new for the initial-jump behavior).
- `npx vitest run` (full suite) — all tests pass.
- `npx svelte-check --tsconfig ./tsconfig.json` — 0 errors, 5 pre-existing config warnings unrelated to this change.

## Known Stubs

None.

## Threat Flags

None — purely client-side default-view logic operating on already-trusted local IndexedDB data, matching the plan's threat model (no new trust boundary).

## Self-Check: PASSED

- `src/lib/utils/scoreCompletion.ts` contains `findFirstIncompletePasse` — FOUND
- `src/lib/utils/scoreCompletion.test.ts` contains `describe('findFirstIncompletePasse'` — FOUND
- `src/lib/views/ScoreEntry.svelte` contains `findFirstIncompletePasse` and `hasAppliedInitialJump` — FOUND
- `src/lib/views/ScoreEntry.test.ts` contains the initial-jump describe block — FOUND
- Commit `0e9a4dd` (findFirstIncompletePasse helper) — FOUND in `git log`
- Commit `a586d1a` (wire into ScoreEntry.svelte) — FOUND in `git log`
