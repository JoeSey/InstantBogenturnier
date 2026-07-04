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
export function assignShootersToLines(
  unassignedCount: number,
  lineCount: number,
  mode: TournamentMode
): LineAssignment[] {
  const assignments: LineAssignment[] = [];
  for (let index = 0; index < unassignedCount; index++) {
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
