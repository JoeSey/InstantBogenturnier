import { describe, it, expect } from 'vitest';
import { findNextEmptyArrowInRow } from './scoreAdvance';

// Behavior per 260705-ok7-PLAN.md Task 1 <behavior> block: same-row-only forward
// scan. The `isFilled` callback takes only an arrowIndex — no shooter dimension at
// all — so it is structurally incapable of looking at another row; no separate
// "does not look at other shooters" test is needed.
describe('findNextEmptyArrowInRow', () => {
  it('returns the next empty arrow remaining in the row', () => {
    const isFilled = () => false;
    expect(findNextEmptyArrowInRow(3, 0, isFilled)).toBe(1);
  });

  it('skips a filled arrow to find a later empty one', () => {
    const isFilled = (arrowIndex: number) => arrowIndex === 1;
    expect(findNextEmptyArrowInRow(4, 0, isFilled)).toBe(2);
  });

  it('returns null when the last arrow of the row was just filled', () => {
    const isFilled = () => false;
    expect(findNextEmptyArrowInRow(3, 2, isFilled)).toBeNull();
  });

  it('returns null when all remaining arrows are already filled', () => {
    const isFilled = (arrowIndex: number) => arrowIndex === 1 || arrowIndex === 2;
    expect(findNextEmptyArrowInRow(3, 0, isFilled)).toBeNull();
  });

  it('returns null for a single-arrow passe where the current index is the only index', () => {
    const isFilled = () => false;
    expect(findNextEmptyArrowInRow(1, 0, isFilled)).toBeNull();
  });
});
