import { describe, it, expect } from 'vitest';
import { scoreColorCategory } from './scoreColor';

// Behavior per 260705-jda-PLAN.md Task 1 <behavior> block: WA target-face color
// mapping for the tap-button picker.
describe('scoreColorCategory', () => {
  it('maps X, 10, and 9 to yellow', () => {
    expect(scoreColorCategory('X')).toBe('yellow');
    expect(scoreColorCategory('10')).toBe('yellow');
    expect(scoreColorCategory('9')).toBe('yellow');
  });

  it('maps 8 and 7 to red', () => {
    expect(scoreColorCategory('8')).toBe('red');
    expect(scoreColorCategory('7')).toBe('red');
  });

  it('maps 6 and 5 to blue', () => {
    expect(scoreColorCategory('6')).toBe('blue');
    expect(scoreColorCategory('5')).toBe('blue');
  });

  it('maps 4 and 3 to black', () => {
    expect(scoreColorCategory('4')).toBe('black');
    expect(scoreColorCategory('3')).toBe('black');
  });

  it('maps 2 and 1 to white', () => {
    expect(scoreColorCategory('2')).toBe('white');
    expect(scoreColorCategory('1')).toBe('white');
  });

  it('maps M to miss', () => {
    expect(scoreColorCategory('M')).toBe('miss');
  });

  // Phase 9 (TARGET-09): 10-ring behavior unchanged with explicit rings=10.
  it('leaves every 10-ring classification unchanged with rings=10 explicit', () => {
    expect(scoreColorCategory('X', 10)).toBe('yellow');
    expect(scoreColorCategory('9', 10)).toBe('yellow');
    expect(scoreColorCategory('8', 10)).toBe('red');
    expect(scoreColorCategory('5', 10)).toBe('blue');
    expect(scoreColorCategory('3', 10)).toBe('black');
    expect(scoreColorCategory('1', 10)).toBe('white');
    expect(scoreColorCategory('M', 10)).toBe('miss');
  });

  // Phase 9 (TARGET-09): 5-ring (DFBV) target face — white for X/5, darkblue for 4-1.
  describe('rings=5 (DFBV)', () => {
    it('maps X and 5 to white', () => {
      expect(scoreColorCategory('X', 5)).toBe('white');
      expect(scoreColorCategory('5', 5)).toBe('white');
    });

    it('maps 4, 3, 2, 1 to darkblue', () => {
      expect(scoreColorCategory('4', 5)).toBe('darkblue');
      expect(scoreColorCategory('3', 5)).toBe('darkblue');
      expect(scoreColorCategory('2', 5)).toBe('darkblue');
      expect(scoreColorCategory('1', 5)).toBe('darkblue');
    });

    it('maps M to miss regardless of rings mode', () => {
      expect(scoreColorCategory('M', 5)).toBe('miss');
    });
  });
});
