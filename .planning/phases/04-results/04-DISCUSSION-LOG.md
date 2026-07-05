# Phase 4: Results - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-05
**Phase:** 4-Results
**Areas discussed:** Results availability timing, Multi-class layout & ordering, Rank presentation style, Reset flow specifics (RES-05/06)

---

## Results Availability Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Only after Abschließen (finalized) | Matches phase-goal wording, simplest — rankings computed once from a stable locked dataset | |
| Anytime, live-updating partial rankings | Trainer can peek at standings mid-tournament as scores come in | ✓ |

**User's choice:** Anytime, live-updating partial rankings
**Notes:** Follow-up on how to treat incomplete shooters:

| Option | Description | Selected |
|--------|-------------|----------|
| Rank only completed shooters; incomplete shown separately, unranked | Cleaner but splits the list | |
| Rank everyone by current sum, incomplete included | Simpler, one sorted list | ✓ |

**User's choice:** Rank everyone by current sum, incomplete included

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — small visual marker (e.g. asterisk or muted badge) | Flags in-progress shooters at a glance | ✓ |
| No — just show the sum as-is, no distinction | Simplest, no visual distinction | |

**User's choice:** Yes — small visual marker

---

## Multi-Class Layout & Ordering

| Option | Description | Selected |
|--------|-------------|----------|
| Alphabetical by class name | Predictable, matches Setup's class list ordering | ✓ |
| Setup/roster order (as classes were created) | Matches trainer's setup mental model, needs a new sort-order field | |

**User's choice:** Alphabetical by class name

| Option | Description | Selected |
|--------|-------------|----------|
| Responsive grid (1/2/3 columns by width) | Reflows by screen width, matches app's existing responsive conventions | ✓ |
| Single column, stacked full-width per class | Simpler but lots of vertical scroll with many classes | |

**User's choice:** Responsive grid (1/2/3 columns by width)

---

## Rank Presentation Style

| Option | Description | Selected |
|--------|-------------|----------|
| Plain numbered table — opaque, matches score-entry table | No decoration, consistent with Phase 1 D-11 | |
| Plain table, but top-3 (podium) get a subtle highlight/color accent | Same table, extra visual scannability for the podium | ✓ |

**User's choice:** Plain table, with podium accent

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — both get silver (rank-based, not row-based) | Accent follows the rank number, not the row position | ✓ |
| You decide | Claude's discretion | |

**User's choice:** Yes — both get silver (rank-based, not row-based)

---

## Reset Flow Specifics (RES-05/06)

| Option | Description | Selected |
|--------|-------------|----------|
| On the Results view itself | Natural end-of-flow location, no new nav section | ✓ |
| A new small "Verwaltung"/settings area in the nav | Separates destructive actions but adds a nav item for one button | |

**User's choice:** On the Results view itself

| Option | Description | Selected |
|--------|-------------|----------|
| Standard destructive ConfirmDialog (like Abschließen's) | Reuses existing component/pattern, no new UI | ✓ |
| Same dialog, but require typing the tournament/class name to confirm | Extra friction, new interaction pattern | |

**User's choice:** Standard destructive ConfirmDialog

| Option | Description | Selected |
|--------|-------------|----------|
| Disable the destructive controls, with a message pointing to reset | Controls become disabled/read-only with inline explanatory text | ✓ |
| Leave controls enabled, but intercept the action with a warning prompt | Controls stay enabled, interception dialog appears on click | |

**User's choice:** Disable the destructive controls, with a message pointing to reset

| Option | Description | Selected |
|--------|-------------|----------|
| Only once finalized (isFinalized === true) | Matches Phase 3's D-10 permanent-lock semantics exactly | ✓ |
| As soon as any score exists (even before finalize) | More conservative, blocks edits the moment scoring begins | |

**User's choice:** Only once finalized (isFinalized === true)

---

## Claude's Discretion

- Exact visual styling of the "in-progress" marker on incomplete shooters (asterisk, dot, muted badge, etc.)
- Exact responsive breakpoints for the 1/2/3-column grid
- Exact podium accent colors (as long as subtle and opaque-table-compatible)
- Whether deleting a class (not just a shooter) should also be guarded once finalized — not discussed directly; CONTEXT.md recommends treating conservatively (guard it too)

## Deferred Ideas

None — discussion stayed within phase scope. RES-05/RES-06 were already added to Phase 4's scope in a prior conversation turn, before this discussion session.
