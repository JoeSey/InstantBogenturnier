import { describe, it, expect } from 'vitest';
import {
  arrowScoreValue,
  calculatePasseSum,
  areAllScoresEntered,
  isPasseComplete,
} from './scoreCompletion';
import type { ScoreRecord } from '../db/schema';

function record(
  shooterId: number,
  roundIndex: number,
  passeIndex: number,
  arrowIndex: number
): ScoreRecord {
  return { shooterId, roundIndex, passeIndex, arrowIndex, value: '8', finalized: false };
}

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

// Behavior per 03-03-PLAN.md Task 1 <behavior> block (D-09): completion must cover
// every shooter x every round x every passe x every arrow, not just the current view.
describe('areAllScoresEntered', () => {
  it('is vacuously true when no shooters are registered', () => {
    expect(areAllScoresEntered([], 1, 10, 3, [])).toBe(true);
  });

  it('is true when the single shooter has all arrows for the only round/passe', () => {
    const scores = [record(1, 0, 0, 0), record(1, 0, 0, 1), record(1, 0, 0, 2)];
    expect(areAllScoresEntered([1], 1, 1, 3, scores)).toBe(true);
  });

  it('is false when one of the arrows is missing', () => {
    const scores = [record(1, 0, 0, 0), record(1, 0, 0, 1)];
    expect(areAllScoresEntered([1], 1, 1, 3, scores)).toBe(false);
  });

  it('is false when a later configured round has no records at all', () => {
    const scores = [record(1, 0, 0, 0), record(1, 0, 0, 1), record(1, 0, 0, 2)];
    expect(areAllScoresEntered([1], 2, 1, 3, scores)).toBe(false);
  });

  it('is false when only some shooters have entered scores', () => {
    const scores = [record(1, 0, 0, 0)];
    expect(areAllScoresEntered([1, 2], 1, 1, 1, scores)).toBe(false);
  });
});

// Behavior per 260705-jda-PLAN.md Task 2 <behavior> block: single-passe completion
// check used to gate the new advance button (distinct from areAllScoresEntered's
// whole-tournament check).
describe('isPasseComplete', () => {
  it('is vacuously true when no shooters are registered', () => {
    expect(isPasseComplete([], 0, 0, 3, [])).toBe(true);
  });

  it('is true when the shooter has all arrows for the given round/passe', () => {
    const scores = [record(1, 0, 0, 0), record(1, 0, 0, 1)];
    expect(isPasseComplete([1], 0, 0, 2, scores)).toBe(true);
  });

  it('is false when an arrow of the given passe is missing', () => {
    const scores = [record(1, 0, 0, 0)];
    expect(isPasseComplete([1], 0, 0, 2, scores)).toBe(false);
  });

  it('is false when the recorded scores belong to a different passe', () => {
    const scores = [record(1, 0, 0, 0), record(1, 0, 0, 1)];
    expect(isPasseComplete([1], 0, 1, 2, scores)).toBe(false);
  });

  it('is false when only some shooters have entered scores', () => {
    const scores = [record(1, 0, 0, 0)];
    expect(isPasseComplete([1, 2], 0, 0, 1, scores)).toBe(false);
  });
});
