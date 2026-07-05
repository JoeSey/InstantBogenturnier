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
});
