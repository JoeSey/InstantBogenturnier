import type { ScoreRow } from '../components/ScoreTable.svelte';

// Sort column/direction contract for the ScoreEntry table (03-02-PLAN.md Task 1,
// SCORE-04). `ScoreRow` is imported directly from ScoreTable.svelte's `<script
// module>` block, matching the codebase's established pattern of importing named
// exports/types straight from a `.svelte` file (see ShooterForm.svelte importing
// AutoAssignModal.svelte's `RosterEntry`).
export type SortColumn = 'line' | 'name' | 'class' | 'sum';
export type SortDirection = 'asc' | 'desc';

// Rows with a null `line` (no shooting line assigned) sort after every assigned line.
export function compareByLine(a: ScoreRow, b: ScoreRow): number {
  return (a.line ?? Number.MAX_SAFE_INTEGER) - (b.line ?? Number.MAX_SAFE_INTEGER);
}

export function compareByName(a: ScoreRow, b: ScoreRow): number {
  return a.name.localeCompare(b.name);
}

export function compareByClass(a: ScoreRow, b: ScoreRow): number {
  return a.className.localeCompare(b.className);
}

// Rows with a null `sum` (incomplete passe) sort before any filled sum.
export function compareBySum(a: ScoreRow, b: ScoreRow): number {
  return (a.sum ?? -1) - (b.sum ?? -1);
}

const comparators: Record<SortColumn, (a: ScoreRow, b: ScoreRow) => number> = {
  line: compareByLine,
  name: compareByName,
  class: compareByClass,
  sum: compareBySum,
};

export function sortRows(rows: ScoreRow[], column: SortColumn, direction: SortDirection): ScoreRow[] {
  const sorted = [...rows].sort(comparators[column]);
  return direction === 'desc' ? sorted.reverse() : sorted;
}
