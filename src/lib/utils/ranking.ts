import type { ClassRecord, RoundConfig, ScoreRecord, ShooterRecord } from '../db/schema';
import { arrowScoreValue, areAllScoresEntered } from './scoreCompletion';

// Pure tournament-wide ranking functions (D-01, D-02, RES-01, RES-02). Framework-free,
// no side effects — mirrors scoreCompletion.ts's plain-function style. Every registered
// shooter appears in the ranked output regardless of completion status (D-02); ranking
// uses standard competition ranking (shared-rank/skip-next, "1-2-2-4") over the
// tournament-wide sum (all rounds/passes combined, not scoped to a single passe like
// Phase 3's calculatePasseSum).

export interface RankedRow {
  shooterId: number;
  name: string;
  line: number | null;
  sum: number;
  rank: number;
  isComplete: boolean;
  // Per-round sums (index 0-based, matching ScoreRecord.roundIndex), for the PDF's
  // "Runde 1 / Runde 2 / ..." columns when a tournament has more than one round.
  roundSums: number[];
  // Counts of X/10/9 arrows across all rounds — the PDF's "X/10/9" column.
  countX: number;
  count10: number;
  count9: number;
}

export function computeShooterSum(shooterId: number, scores: ScoreRecord[]): number {
  return scores
    .filter((s) => s.shooterId === shooterId)
    .reduce((sum, s) => sum + arrowScoreValue(s.value), 0);
}

export function computeShooterRoundSums(
  shooterId: number,
  numberOfRounds: number,
  scores: ScoreRecord[]
): number[] {
  const sums = new Array(numberOfRounds).fill(0) as number[];
  for (const s of scores) {
    if (s.shooterId === shooterId && s.roundIndex >= 0 && s.roundIndex < numberOfRounds) {
      sums[s.roundIndex] += arrowScoreValue(s.value);
    }
  }
  return sums;
}

export function computeShooterHitCounts(
  shooterId: number,
  scores: ScoreRecord[]
): { countX: number; count10: number; count9: number } {
  let countX = 0;
  let count10 = 0;
  let count9 = 0;
  for (const s of scores) {
    if (s.shooterId !== shooterId) continue;
    if (s.value === 'X') countX += 1;
    else if (s.value === '10') count10 += 1;
    else if (s.value === '9') count9 += 1;
  }
  return { countX, count10, count9 };
}

export function isShooterComplete(
  shooterId: number,
  roundsConfig: RoundConfig,
  scores: ScoreRecord[]
): boolean {
  return areAllScoresEntered(
    [shooterId],
    roundsConfig.numberOfRounds,
    roundsConfig.passesPerRound,
    roundsConfig.arrowsPerPasse,
    scores
  );
}

// Standard competition ranking: sort descending by sum has already happened by the time
// this runs. Rank = 1-based index of the first occurrence of this sum in the sorted
// array (not an incrementing counter) — this is what produces "1-2-2-4" rather than
// "1-2-2-3" for a 2-way tie at position 2 (Pitfall 1).
function assignRanks(sortedBySumDesc: { sum: number }[]): number[] {
  const ranks: number[] = [];
  let firstIndexOfSum = 0;

  sortedBySumDesc.forEach((row, index) => {
    if (index === 0 || row.sum !== sortedBySumDesc[index - 1].sum) {
      firstIndexOfSum = index;
    }
    ranks.push(firstIndexOfSum + 1);
  });

  return ranks;
}

export function computeClassRankings(
  shooters: ShooterRecord[],
  classes: ClassRecord[],
  scores: ScoreRecord[],
  roundsConfig: RoundConfig | undefined
): Map<number, RankedRow[]> {
  const rankings = new Map<number, RankedRow[]>();

  if (!roundsConfig) {
    return rankings;
  }

  for (const cls of classes) {
    if (cls.id === undefined) continue;

    const classShooters = shooters.filter((s) => s.classId === cls.id);
    if (classShooters.length === 0) {
      // D-04/edge case: classes with 0 matching shooters are omitted entirely — not
      // present as an empty array.
      continue;
    }

    const unranked = classShooters
      .map((shooter) => ({
        shooterId: shooter.id as number,
        name: shooter.name,
        line: shooter.lineAssignment ?? null,
        sum: computeShooterSum(shooter.id as number, scores),
        isComplete: isShooterComplete(shooter.id as number, roundsConfig, scores),
        roundSums: computeShooterRoundSums(shooter.id as number, roundsConfig.numberOfRounds, scores),
        ...computeShooterHitCounts(shooter.id as number, scores),
      }))
      // Sort descending by sum; alphabetical-by-name as the row-order tiebreak (rank
      // number is identical either way, per the UI-SPEC's ranking computation section).
      .sort((a, b) => b.sum - a.sum || a.name.localeCompare(b.name));

    const ranks = assignRanks(unranked);

    const rows: RankedRow[] = unranked.map((row, index) => ({
      ...row,
      rank: ranks[index],
    }));

    rankings.set(cls.id, rows);
  }

  return rankings;
}
