import type { ScoreValue } from '../db/schema';

// Quick task 260705-jda: maps a ScoreValue to the WA (World Archery) target-face
// color category, so the tap-button picker visually matches the physical target
// the trainer is scoring against. '0' has no dedicated branch (falls through to
// 'white' alongside '1'/'2') — it is unreachable from the UI after this task (no
// tap button) but must remain assignable per the ScoreValue type.

export type ScoreColorCategory = 'yellow' | 'red' | 'blue' | 'black' | 'white' | 'miss';

export function scoreColorCategory(value: ScoreValue): ScoreColorCategory {
  if (value === 'M') return 'miss';
  if (value === 'X' || value === '10' || value === '9') return 'yellow';
  if (value === '8' || value === '7') return 'red';
  if (value === '6' || value === '5') return 'blue';
  if (value === '4' || value === '3') return 'black';
  return 'white';
}
