import type { ScoreValue } from '../db/schema';

// Quick task 260705-jda: maps a ScoreValue to the WA (World Archery) target-face
// color category, so the tap-button picker visually matches the physical target
// the trainer is scoring against. '0' has no dedicated branch (falls through to
// 'white' alongside '1'/'2') — it is unreachable from the UI after this task (no
// tap button) but must remain assignable per the ScoreValue type.
//
// Phase 9 (TARGET-09): rings-aware — a 5-ring (DFBV) target face has only two
// visible colors (white ring for X/5, dark blue for 4-1), distinct from the
// 10-ring WA face's five-color scheme. Defaults to rings=10 so existing callers
// (still passing no second argument) get byte-identical categorization to today.

export type ScoreColorCategory = 'yellow' | 'red' | 'blue' | 'black' | 'white' | 'darkblue' | 'miss';

export function scoreColorCategory(value: ScoreValue, rings: 10 | 5 = 10): ScoreColorCategory {
  if (value === 'M') return 'miss';

  if (rings === 5) {
    if (value === 'X' || value === '5') return 'white';
    return 'darkblue';
  }

  if (value === 'X' || value === '10' || value === '9') return 'yellow';
  if (value === '8' || value === '7') return 'red';
  if (value === '6' || value === '5') return 'blue';
  if (value === '4' || value === '3') return 'black';
  return 'white';
}
