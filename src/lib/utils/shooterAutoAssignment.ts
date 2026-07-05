import type { TournamentMode } from './modeDetection';

// Round-robin auto-assignment of unassigned shooters to lines/flights (D-10). Pure,
// framework-free — the trainer reviews the computed preview before it's persisted
// (see AutoAssignModal.svelte).

export interface LineAssignment {
  lineNum: number;
  flight: 'A/B' | 'C/D';
}

// Distributes `unassignedCount` shooters round-robin across `lineCount` lines, in
// registration order. In AB mode every assignment is flight 'A/B'. In AB/CD mode the
// flight flips every full pass through all lines (first pass A/B, second pass C/D, ...).
//
// `startIndex` continues the round-robin cursor across separate calls (i.e. separate
// registration submissions): pass the count of shooters that already occupy a line slot
// (from prior auto/manual assignments) so a new batch of 1 doesn't always restart at line
// 1. Defaults to 0 for a from-scratch computation (e.g. tests, or a single big batch).
export function assignShootersToLines(
  unassignedCount: number,
  lineCount: number,
  mode: TournamentMode,
  startIndex = 0
): LineAssignment[] {
  const assignments: LineAssignment[] = [];
  for (let offset = 0; offset < unassignedCount; offset++) {
    const index = startIndex + offset;
    const lineNum = (index % lineCount) + 1;
    const flight: 'A/B' | 'C/D' =
      mode === 'AB/CD' && Math.floor(index / lineCount) % 2 === 1 ? 'C/D' : 'A/B';
    assignments.push({ lineNum, flight });
  }
  return assignments;
}

// Human-readable, comma-joined preview of the line numbers an auto-assignment batch
// will produce, e.g. "1,2,1,2,1" — shown in AutoAssignModal for transparency (Pitfall 4).
export function previewAssignmentSummary(assignments: LineAssignment[]): string {
  return assignments.map((a) => a.lineNum).join(',');
}
