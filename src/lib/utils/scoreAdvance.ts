import type { ScoreRow } from '../components/ScoreTable.svelte';

// Quick task 260705-lpv: forward-only "next empty arrow" scan used to auto-advance
// the score-picker dialog after each selection. Framework-free, no side effects.
// Scans the current shooter's remaining arrows in the current passe first
// (left-to-right), then the following rows in the currently displayed/sorted table
// order — never wraps back to an earlier row (rows before the current shooter's row
// are never visited, by construction of the loop bounds below).
export function findNextEmptyArrow(
  rows: Pick<ScoreRow, 'shooterId'>[],
  arrowsPerPasse: number,
  currentShooterId: number,
  currentArrowIndex: number,
  isFilled: (shooterId: number, arrowIndex: number) => boolean
): { shooterId: number; arrowIndex: number } | null {
  const currentRowIndex = rows.findIndex((row) => row.shooterId === currentShooterId);
  if (currentRowIndex === -1) return null;

  for (let arrowIndex = currentArrowIndex + 1; arrowIndex < arrowsPerPasse; arrowIndex++) {
    if (!isFilled(currentShooterId, arrowIndex)) {
      return { shooterId: currentShooterId, arrowIndex };
    }
  }

  for (let rowIndex = currentRowIndex + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    for (let arrowIndex = 0; arrowIndex < arrowsPerPasse; arrowIndex++) {
      if (!isFilled(row.shooterId, arrowIndex)) {
        return { shooterId: row.shooterId, arrowIndex };
      }
    }
  }

  return null;
}
