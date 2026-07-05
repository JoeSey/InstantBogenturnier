import type { ScoreValue } from '../db/schema';

// Pure functions implementing the WA scoring convention (D-02, SCORE-02): M (miss)
// counts as 0, X (inner-ten) counts as 10. Framework-free, no side effects.

export function arrowScoreValue(value: ScoreValue): number {
  if (value === 'M') return 0;
  if (value === 'X') return 10;
  return Number(value);
}

export function calculatePasseSum(values: ScoreValue[]): number {
  return values.reduce((sum, v) => sum + arrowScoreValue(v), 0);
}
