import { describe, it, expect } from 'vitest';
import {
  arrowScoreValue,
  calculatePasseSum,
  areAllScoresEntered,
  isPasseComplete,
  findFirstIncompletePasse,
  computeIsFinalized,
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

// Behavior per 260710-erfassung-jump-to-blank-PLAN.md Task 1 <behavior> block: find
// the first round/passe (round-major order) that still has a blank arrow, for the
// Erfassung initial-jump feature.
describe('findFirstIncompletePasse', () => {
  it('returns null when there are zero shooters registered', () => {
    expect(findFirstIncompletePasse([], 2, 2, 3, [])).toBeNull();
  });

  it('returns round 0/passe 0 when scores are empty and there is at least one shooter (fresh tournament, equivalent to the existing default)', () => {
    expect(findFirstIncompletePasse([1], 2, 1, 3, [])).toEqual({
      roundIndex: 0,
      passeIndex: 0,
    });
  });

  it('returns the first passe with a missing arrow when an earlier passe is fully complete', () => {
    const scores = [
      record(1, 0, 0, 0),
      record(1, 0, 0, 1),
      record(1, 0, 1, 0), // passe 1 missing arrow 1
    ];
    expect(findFirstIncompletePasse([1], 2, 2, 2, scores)).toEqual({
      roundIndex: 0,
      passeIndex: 1,
    });
  });

  it('returns the first passe of a later round when that round has no records at all', () => {
    const scores = [record(1, 0, 0, 0)];
    expect(findFirstIncompletePasse([1], 2, 1, 1, scores)).toEqual({
      roundIndex: 1,
      passeIndex: 0,
    });
  });

  it('returns null when every passe across all rounds is complete', () => {
    const scores = [
      record(1, 0, 0, 0),
      record(1, 0, 0, 1),
      record(1, 1, 0, 0),
      record(1, 1, 0, 1),
    ];
    expect(findFirstIncompletePasse([1], 2, 1, 2, scores)).toBeNull();
  });
});

// Behavior per 04-03-PLAN.md Task 1 <behavior> block (D-09/D-10, D-12): the single
// shared source of truth for the permanent-lock boolean every RES-06-guarded view
// and ScoreEntry must call instead of re-deriving the expression inline.
describe('computeIsFinalized', () => {
  it('is vacuously false when there are no score records yet', () => {
    expect(computeIsFinalized([])).toBe(false);
  });

  it('is true when every record has finalized: true', () => {
    const scores: ScoreRecord[] = [
      { shooterId: 1, roundIndex: 0, passeIndex: 0, arrowIndex: 0, value: '8', finalized: true },
      { shooterId: 1, roundIndex: 0, passeIndex: 0, arrowIndex: 1, value: '9', finalized: true },
    ];
    expect(computeIsFinalized(scores)).toBe(true);
  });

  it('is false when at least one record has finalized: false (mixed state)', () => {
    const scores: ScoreRecord[] = [
      { shooterId: 1, roundIndex: 0, passeIndex: 0, arrowIndex: 0, value: '8', finalized: true },
      { shooterId: 1, roundIndex: 0, passeIndex: 0, arrowIndex: 1, value: '9', finalized: false },
    ];
    expect(computeIsFinalized(scores)).toBe(false);
  });
});
