import { describe, it, expect } from 'vitest';
import { arrowScoreValue, calculatePasseSum } from './scoreCompletion';

// Behavior per 03-01-PLAN.md Task 1 <behavior> block (D-02, SCORE-02): M=0, X=10.
describe('arrowScoreValue', () => {
  it('treats M as 0', () => {
    expect(arrowScoreValue('M')).toBe(0);
  });

  it('treats X as 10', () => {
    expect(arrowScoreValue('X')).toBe(10);
  });

  it('returns the numeric value for ordinary scores', () => {
    expect(arrowScoreValue('7')).toBe(7);
  });
});

describe('calculatePasseSum', () => {
  it('sums numeric and M values, treating M as 0', () => {
    expect(calculatePasseSum(['8', 'M', '9'])).toBe(17);
  });

  it('sums numeric and X values, treating X as 10', () => {
    expect(calculatePasseSum(['X', '9'])).toBe(19);
  });
});
