import type { RoundConfig, ScoreRecord, ScoringMode } from '../db/schema';
import { arrowScoreValue, areAllScoresEntered } from './scoreCompletion';
import { resolveRuleset, tokenZone } from './threeDScoring';

// v2 (3D milestone) slice 2 — the single seam that generalises scoring across the
// ring-target and 3D modes. Built once per tournament from its RoundConfig; ranking,
// completion, and (later) Results/PDF all read points and tie-break counts through
// this instead of assuming ring values. In `rings` mode every method reproduces
// today's behaviour exactly (tie-break vector empty ⇒ ranking still breaks ties by
// name only).

export interface ScoringContext {
  mode: ScoringMode;
  // Points for a single stored record. In rings mode = arrowScoreValue; in 3d mode
  // the record already IS a target outcome token, so this is a table lookup.
  pointsFor(record: ScoreRecord): number;
  // Ordered tie-break labels (e.g. ['Kill', 'Vital', 'Wound']); [] in rings mode.
  tieBreakLabels: string[];
  // Count vector aligned with tieBreakLabels for a set of a shooter's records; []
  // in rings mode. assignRanks compares [sum, ...this] descending.
  tieBreakCounts(records: ScoreRecord[]): number[];
  // Entries expected per (shooter, round, station) for completion checks:
  // arrowsPerPasse in rings mode, the round's ruleset entriesPerTarget in 3d.
  entriesExpected(roundIndex: number): number;
}

export function buildScoringContext(config: RoundConfig): ScoringContext {
  if (config.scoringMode === '3d') {
    // One resolved ruleset per round (leg). Defensive against a not-yet-configured
    // 3d tournament (roundRulesets absent/short) so the slices before the Setup UI
    // exists don't crash — missing ruleset ⇒ zero points, no tie-break.
    const resolved = (config.roundRulesets ?? []).map(resolveRuleset);
    const primary = resolved[0];
    const tieBreakZones = primary?.tieBreak ?? [];
    const labelOf = (zone: string) =>
      primary?.zones.find((z) => z.zone === zone)?.label ?? zone;

    return {
      mode: '3d',
      pointsFor: (record) => resolved[record.roundIndex]?.points[record.value] ?? 0,
      tieBreakLabels: tieBreakZones.map(labelOf),
      tieBreakCounts: (records) =>
        tieBreakZones.map(
          (zone) => records.reduce((n, r) => n + (tokenZone(r.value) === zone ? 1 : 0), 0)
        ),
      entriesExpected: (roundIndex) => resolved[roundIndex]?.entriesPerTarget ?? 1,
    };
  }

  const rings = config.rings ?? 10;
  return {
    mode: 'rings',
    pointsFor: (record) => arrowScoreValue(record.value, rings),
    tieBreakLabels: [],
    tieBreakCounts: () => [],
    entriesExpected: () => config.arrowsPerPasse,
  };
}

// Whole-tournament completion, routed on scoringMode. rings mode delegates to the
// existing per-arrow check unchanged; 3d mode wants `entriesExpected(round)` records
// for every (shooter, round, station). Vacuously true with zero shooters.
export function isTournamentComplete(
  shooterIds: number[],
  config: RoundConfig,
  scores: ScoreRecord[]
): boolean {
  if (config.scoringMode !== '3d') {
    return areAllScoresEntered(
      shooterIds,
      config.numberOfRounds,
      config.passesPerRound,
      config.arrowsPerPasse,
      scores
    );
  }

  const ctx = buildScoringContext(config);
  const entryCount = new Map<string, number>();
  for (const s of scores) {
    const key = `${s.shooterId}-${s.roundIndex}-${s.passeIndex}`;
    entryCount.set(key, (entryCount.get(key) ?? 0) + 1);
  }

  for (const shooterId of shooterIds) {
    for (let roundIndex = 0; roundIndex < config.numberOfRounds; roundIndex++) {
      const need = ctx.entriesExpected(roundIndex);
      for (let passeIndex = 0; passeIndex < config.passesPerRound; passeIndex++) {
        if ((entryCount.get(`${shooterId}-${roundIndex}-${passeIndex}`) ?? 0) < need) {
          return false;
        }
      }
    }
  }
  return true;
}
