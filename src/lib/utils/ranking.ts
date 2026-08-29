import type { ClassRecord, RoundConfig, ScoreRecord, ShooterRecord } from '../db/schema';
import { arrowScoreValue } from './scoreCompletion';
import { buildScoringContext, isTournamentComplete, type ScoringContext } from './scoringContext';

// v2 slice 2: the per-shooter sum helpers accept either a legacy ring count (10 | 5,
// the historical 3rd arg — kept so existing callers/tests are untouched) or a
// ScoringContext. A number reproduces today's arrowScoreValue behaviour exactly; a
// context routes through mode-aware `pointsFor` (3D outcome-token lookup).
type ScoringArg = ScoringContext | 10 | 5;

function pointsFn(arg: ScoringArg): (record: ScoreRecord) => number {
  return typeof arg === 'number' ? (record) => arrowScoreValue(record.value, arg) : arg.pointsFor;
}

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
  // Counts of X/10/9 arrows across all rounds — the PDF's "X/10/9" column (10-ring).
  countX: number;
  count10: number;
  count9: number;
  // Phase 9 (TARGET-09): raw counts for the 5-ring "X+5/4-1/M" PDF column.
  count5: number;
  count4to1: number;
  countM: number;
  // v2 (3D milestone): ordered tie-break count vector (e.g. [killCount, vitalCount,
  // woundCount]) aligned with the ScoringContext's tieBreakLabels. Empty/absent in
  // rings mode, where ranks break ties by name only as before.
  tieBreakCounts?: number[];
}

export function computeShooterSum(
  shooterId: number,
  scores: ScoreRecord[],
  scoring: ScoringArg = 10
): number {
  const points = pointsFn(scoring);
  return scores
    .filter((s) => s.shooterId === shooterId)
    .reduce((sum, s) => sum + points(s), 0);
}

export function computeShooterRoundSums(
  shooterId: number,
  numberOfRounds: number,
  scores: ScoreRecord[],
  scoring: ScoringArg = 10
): number[] {
  const points = pointsFn(scoring);
  const sums = new Array(numberOfRounds).fill(0) as number[];
  for (const s of scores) {
    if (s.shooterId === shooterId && s.roundIndex >= 0 && s.roundIndex < numberOfRounds) {
      sums[s.roundIndex] += points(s);
    }
  }
  return sums;
}

export function computeShooterHitCounts(
  shooterId: number,
  scores: ScoreRecord[]
): { countX: number; count10: number; count9: number; count5: number; count4to1: number; countM: number } {
  let countX = 0;
  let count10 = 0;
  let count9 = 0;
  let count5 = 0;
  let count4to1 = 0;
  let countM = 0;
  for (const s of scores) {
    if (s.shooterId !== shooterId) continue;
    if (s.value === 'X') countX += 1;
    else if (s.value === '10') count10 += 1;
    else if (s.value === '9') count9 += 1;
    if (s.value === '5') count5 += 1;
    else if (s.value === '4' || s.value === '3' || s.value === '2' || s.value === '1') count4to1 += 1;
    else if (s.value === 'M') countM += 1;
  }
  return { countX, count10, count9, count5, count4to1, countM };
}

export function isShooterComplete(
  shooterId: number,
  roundsConfig: RoundConfig,
  scores: ScoreRecord[]
): boolean {
  return isTournamentComplete([shooterId], roundsConfig, scores);
}

// Ranking key: total score, then the tie-break count vector (Kill/Vital/… in 3d mode,
// empty in rings mode). Two rows share a rank iff every key element is equal.
function rankKey(row: { sum: number; tieBreakCounts?: number[] }): number[] {
  return [row.sum, ...(row.tieBreakCounts ?? [])];
}

function keysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

// Descending comparator over the ranking key — [sum, ...tieBreakCounts], all higher-is-
// better. Rows must already be sorted with this (name as the final row-order tiebreak)
// before assignRanks runs.
export function compareRankKeyDesc(
  a: { sum: number; tieBreakCounts?: number[] },
  b: { sum: number; tieBreakCounts?: number[] }
): number {
  const ka = rankKey(a);
  const kb = rankKey(b);
  for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
    const diff = (kb[i] ?? 0) - (ka[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Standard competition ranking: the rows are already sorted by the ranking key by the
// time this runs. Rank = 1-based index of the first row sharing this key (not an
// incrementing counter) — produces "1-2-2-4" rather than "1-2-2-3" for a 2-way tie at
// position 2 (Pitfall 1). In rings mode the key is [sum] only, so behaviour is
// unchanged from the old sum-only implementation.
function assignRanks(sortedDesc: { sum: number; tieBreakCounts?: number[] }[]): number[] {
  const ranks: number[] = [];
  let firstIndexOfKey = 0;

  sortedDesc.forEach((row, index) => {
    if (index === 0 || !keysEqual(rankKey(row), rankKey(sortedDesc[index - 1]))) {
      firstIndexOfKey = index;
    }
    ranks.push(firstIndexOfKey + 1);
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

  const ctx = buildScoringContext(roundsConfig);

  for (const cls of classes) {
    if (cls.id === undefined) continue;

    const classShooters = shooters.filter((s) => s.classId === cls.id);
    if (classShooters.length === 0) {
      // D-04/edge case: classes with 0 matching shooters are omitted entirely — not
      // present as an empty array.
      continue;
    }

    const unranked = classShooters
      .map((shooter) => {
        const shooterScores = scores.filter((s) => s.shooterId === shooter.id);
        return {
          shooterId: shooter.id as number,
          name: shooter.name,
          line: shooter.lineAssignment ?? null,
          sum: computeShooterSum(shooter.id as number, scores, ctx),
          isComplete: isShooterComplete(shooter.id as number, roundsConfig, scores),
          roundSums: computeShooterRoundSums(
            shooter.id as number,
            roundsConfig.numberOfRounds,
            scores,
            ctx
          ),
          // Ring-face buckets for the rings-mode PDF; all zero in 3d mode (no ring tokens).
          ...computeShooterHitCounts(shooter.id as number, scores),
          // Kill/Vital/Wound counts in 3d; [] in rings mode.
          tieBreakCounts: ctx.tieBreakCounts(shooterScores),
        };
      })
      // Sort by the ranking key descending ([sum, ...tieBreakCounts]); alphabetical-by-
      // name as the final row-order tiebreak (rank number is identical either way). In
      // rings mode the key is [sum] only, so this matches the old sort exactly.
      .sort((a, b) => compareRankKeyDesc(a, b) || a.name.localeCompare(b.name));

    const ranks = assignRanks(unranked);

    const rows: RankedRow[] = unranked.map((row, index) => ({
      ...row,
      rank: ranks[index],
    }));

    rankings.set(cls.id, rows);
  }

  return rankings;
}
