# Phase 3: Score Entry - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-05
**Phase:** 3-Score Entry
**Areas discussed:** Score input method, Round/Passe navigation, Interim save behavior, Finalize & lock policy

---

## Score input method

| Option | Description | Selected |
|--------|-------------|----------|
| Tap-button picker | Each arrow cell opens/shows 11 tap targets (0-10, M); fast, one-handed, touch-friendly | ✓ |
| Numeric text input | Plain `<input type="number">` per cell, requires on-screen keyboard | |
| Dropdown/select per cell | Native `<select>` with 11 options; slow to tap through on mobile | |

**User's choice:** Tap-button picker — with an "X" option added to the button set.
**Notes:** User confirmed tap-buttons work regardless of scoring convention ("if we're shooting WA targets, we can use all buttons, if we're shooting 1-5, that input method is fine, too").

**Follow-up: X behavior and scoring-scale configurability**

| Option | Description | Selected |
|--------|-------------|----------|
| X counts as 10 in sum | Matches WA convention, same treatment as M=0, no tie-break/countback needed | ✓ |
| X is its own value, not always 10 | User would specify a custom rule | |
| Fixed 0-10/X/M for all rounds | No per-round scoring-scale configuration | ✓ |
| Scoring scale configurable per round | New requirement beyond SCORE-01's "0-10, M" — flagged as scope creep | |

**User's choice:** X counts as 10 in sum; scale is fixed (not configurable).
**Notes:** The "1-5" comment was a validation that tap-buttons generalize to other point systems, not a request for a configurable scale.

---

## Round/Passe navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown selectors, one passe at a time | Matches specs.md mockup exactly | ✓ |
| Tabs for rounds/passes | Faster switching but cramped with many passes | |
| All passes of current round shown together | More context but table gets very wide | |

**User's choice:** Dropdown selectors, one passe at a time.

**Follow-up: Summe column scope**

| Option | Description | Selected |
|--------|-------------|----------|
| Current passe sum only | Matches specs.md; running totals are Phase 4's job | ✓ |
| Running total across all entered passes | Duplicates future Phase 4 (Results) functionality | |

**User's choice:** Current passe sum only.

---

## Interim save behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Autosave per cell, no button needed | Every tap immediately writes to IndexedDB — true zero-data-loss | ✓ |
| Autosave per row (per shooter) | Writes on row completion/blur; partial rows still at risk | |
| Explicit Speichern button required | Matches specs.md literally but risks the exact data-loss scenario SCORE-03 guards against | |

**User's choice:** Autosave per cell, no button needed.

**Follow-up: Speichern UI presence**

| Option | Description | Selected |
|--------|-------------|----------|
| Keep a subtle "saved" indicator, no button | Small inline feedback confirms persistence without a button | |
| Drop all save UI entirely | No button, no indicator — fully invisible autosave | ✓ |
| Keep Speichern button as a no-op confirmation | Familiar UI but functionally redundant | |

**User's choice:** Drop all save UI entirely.
**Notes:** This resolves a wording tension in ROADMAP.md/REQUIREMENTS.md (SCORE-06's "Abschließen, separate from Speichern") — with no Speichern action at all, Abschließen becomes the sole explicit action on the score-entry screen. Captured explicitly in CONTEXT.md (D-08) so downstream agents don't try to reintroduce a Speichern button.

---

## Finalize & lock policy

| Option | Description | Selected |
|--------|-------------|----------|
| Every arrow cell filled, all shooters/passes/rounds | Matches specs.md's "App erkennt, wenn alle Durchgänge erfasst sind" | ✓ |
| Per-round completion, finalize each round separately | More flexible but adds per-round lock-state complexity not hinted at in specs.md | |

**User's choice:** Every arrow cell filled, across all shooters/passes/rounds.

**Follow-up: post-lock correction policy (resolves STATE.md's flagged open question)**

| Option | Description | Selected |
|--------|-------------|----------|
| Permanent lock, no unlock path | Matches a judge's official sign-off; simplest to reason about | ✓ |
| Locked but trainer can explicitly re-open | Adds an "Erfassung wieder öffnen" escape hatch for genuine mistakes | |

**User's choice:** Permanent lock, no unlock path.
**Notes:** This directly resolves the "Post-completion score correction policy" blocker previously flagged in STATE.md — now decided as disallowed, not just discouraged.

---

## Claude's Discretion

- Exact visual/interaction design of the tap-button picker (grid layout, sizing, color coding), within Phase 1's constraint that the score table stays fully opaque/high-contrast.
- Exact confirmation UX for the "Abschließen" action (likely reusing `ConfirmDialog.svelte` from Phase 2, given the destructive/irreversible nature of the permanent lock).
- Data model shape for the new `scores` table — left to research/planning.

## Deferred Ideas

None — the "configurable scoring scale per round" idea raised during the X/1-5 discussion was explicitly decided against for v1, not deferred to a future phase.
