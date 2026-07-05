import type { ScoreValue, ScoreRecord } from '../db/schema';

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

// D-09: Abschließen is only enabled once every registered shooter x every configured
// round x every passe x every arrow has a recorded value. Vacuously true when there
// are no shooters registered (nothing left to fill in).
export function areAllScoresEntered(
  shooterIds: number[],
  numberOfRounds: number,
  passesPerRound: number,
  arrowsPerPasse: number,
  scores: ScoreRecord[]
): boolean {
  const existingCells = new Set(
    scores.map((s) => `${s.shooterId}-${s.roundIndex}-${s.passeIndex}-${s.arrowIndex}`)
  );

  for (const shooterId of shooterIds) {
    for (let roundIndex = 0; roundIndex < numberOfRounds; roundIndex++) {
      for (let passeIndex = 0; passeIndex < passesPerRound; passeIndex++) {
        for (let arrowIndex = 0; arrowIndex < arrowsPerPasse; arrowIndex++) {
          const key = `${shooterId}-${roundIndex}-${passeIndex}-${arrowIndex}`;
          if (!existingCells.has(key)) {
            return false;
          }
        }
      }
    }
  }

  return true;
}

// Quick task 260705-jda: single-passe counterpart used to gate the new advance
// button — distinct from areAllScoresEntered's whole-tournament check used for
// "Abschließen". Vacuously true when there are no shooters registered.
export function isPasseComplete(
  shooterIds: number[],
  roundIndex: number,
  passeIndex: number,
  arrowsPerPasse: number,
  scores: ScoreRecord[]
): boolean {
  const existingCells = new Set(
    scores
      .filter((s) => s.roundIndex === roundIndex && s.passeIndex === passeIndex)
      .map((s) => `${s.shooterId}-${s.arrowIndex}`)
  );

  for (const shooterId of shooterIds) {
    for (let arrowIndex = 0; arrowIndex < arrowsPerPasse; arrowIndex++) {
      const key = `${shooterId}-${arrowIndex}`;
      if (!existingCells.has(key)) {
        return false;
      }
    }
  }

  return true;
}
