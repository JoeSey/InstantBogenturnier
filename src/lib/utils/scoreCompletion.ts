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

// Quick task 260710-erfassung-jump-to-blank: locates the first round/passe (in
// round-major order) that still has a blank arrow, so ScoreEntry can jump straight
// there on initial load instead of always defaulting to round 1/passe 1. Delegates
// the per-passe check to isPasseComplete (vacuously true with zero shooters, so this
// returns null in that case, matching the existing default-to-1/1 behavior).
export function findFirstIncompletePasse(
  shooterIds: number[],
  numberOfRounds: number,
  passesPerRound: number,
  arrowsPerPasse: number,
  scores: ScoreRecord[]
): { roundIndex: number; passeIndex: number } | null {
  for (let roundIndex = 0; roundIndex < numberOfRounds; roundIndex++) {
    for (let passeIndex = 0; passeIndex < passesPerRound; passeIndex++) {
      if (!isPasseComplete(shooterIds, roundIndex, passeIndex, arrowsPerPasse, scores)) {
        return { roundIndex, passeIndex };
      }
    }
  }

  return null;
}

// 04-03-PLAN.md Task 1 (D-09/D-10 per 03-CONTEXT.md, D-12 per 04-CONTEXT.md): single
// source of truth for the permanent-lock boolean. Every RES-06-guarded view (Setup,
// SetupRounds, ClassForm, Registration) and ScoreEntry must call this instead of
// re-deriving the same expression inline a second time. Vacuously false when there are
// no score records yet — a tournament with nothing recorded is never "finalized".
export function computeIsFinalized(scores: ScoreRecord[]): boolean {
  return scores.length > 0 && scores.every((s) => s.finalized);
}
