// Quick task 260705-ok7: retires the cross-row auto-advance introduced in
// 260705-lpv entirely. The scan is now same-row-only — jumping to another
// shooter's row is no longer this function's concern at all (the caller no longer
// has a "next row" to jump to). Framework-free, no side effects.
export function findNextEmptyArrowInRow(
  arrowsPerPasse: number,
  currentArrowIndex: number,
  isFilled: (arrowIndex: number) => boolean
): number | null {
  for (let arrowIndex = currentArrowIndex + 1; arrowIndex < arrowsPerPasse; arrowIndex++) {
    if (!isFilled(arrowIndex)) {
      return arrowIndex;
    }
  }

  return null;
}
