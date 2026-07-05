import { describe, it, expect } from 'vitest';
import { findNextEmptyArrow } from './scoreAdvance';

function isFilledFromKeys(filledKeys: string[]): (shooterId: number, arrowIndex: number) => boolean {
  const set = new Set(filledKeys);
  return (shooterId, arrowIndex) => set.has(`${shooterId}-${arrowIndex}`);
}

// Behavior per 260705-lpv-PLAN.md Task 1 <behavior> block: forward-only scan, never
// wraps back to an earlier row.
describe('findNextEmptyArrow', () => {
  it('returns the next empty arrow remaining in the same row', () => {
    const rows = [{ shooterId: 1 }, { shooterId: 2 }];
    const isFilled = isFilledFromKeys(['1-0']);
    expect(findNextEmptyArrow(rows, 3, 1, 0, isFilled)).toEqual({ shooterId: 1, arrowIndex: 1 });
  });

  it('jumps to the next row at index 0 once the current row is complete', () => {
    const rows = [{ shooterId: 1 }, { shooterId: 2 }];
    const isFilled = isFilledFromKeys(['1-0', '1-1', '1-2']);
    expect(findNextEmptyArrow(rows, 3, 1, 2, isFilled)).toEqual({ shooterId: 2, arrowIndex: 0 });
  });

  it('skips a fully-filled next row and continues to the following row', () => {
    const rows = [{ shooterId: 1 }, { shooterId: 2 }, { shooterId: 3 }];
    const isFilled = isFilledFromKeys(['1-0', '1-1', '1-2', '2-0', '2-1', '2-2']);
    expect(findNextEmptyArrow(rows, 3, 1, 2, isFilled)).toEqual({ shooterId: 3, arrowIndex: 0 });
  });

  it("returns the next row's first empty arrow even when it is not at index 0", () => {
    const rows = [{ shooterId: 1 }, { shooterId: 2 }];
    const isFilled = isFilledFromKeys(['1-0', '1-1', '1-2', '2-0']);
    expect(findNextEmptyArrow(rows, 3, 1, 2, isFilled)).toEqual({ shooterId: 2, arrowIndex: 1 });
  });

  it('returns null when no empty arrow exists anywhere forward', () => {
    const rows = [{ shooterId: 1 }, { shooterId: 2 }];
    const isFilled = isFilledFromKeys(['2-0', '2-1', '2-2']);
    expect(findNextEmptyArrow(rows, 3, 2, 2, isFilled)).toBeNull();
  });

  it('never wraps back to an earlier row even if it has an empty arrow', () => {
    const rows = [{ shooterId: 1 }, { shooterId: 2 }];
    // Shooter 1 has an empty arrow at index 0; shooter 2 is fully filled.
    const isFilled = isFilledFromKeys(['1-1', '1-2', '2-0', '2-1', '2-2']);
    expect(findNextEmptyArrow(rows, 3, 2, 2, isFilled)).toBeNull();
  });
});
