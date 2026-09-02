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

// Tweak 260830: the filled score cells in the Erfassung tables echo the tap-picker's
// target-face colors, but a few shades lighter so the score digit stays readable and
// the table doesn't turn into a wall of saturated blocks. Returns only the
// background/text portion — callers keep their own layout/disabled classes.
export function scoreCellColorClass(value: ScoreValue, rings: 10 | 5 = 10): string {
  switch (scoreColorCategory(value, rings)) {
    case 'yellow':
      return 'bg-amber-100 text-slate-900 dark:bg-amber-400/25 dark:text-amber-50';
    case 'red':
      return 'bg-red-100 text-slate-900 dark:bg-red-500/25 dark:text-red-50';
    case 'blue':
      return 'bg-blue-100 text-slate-900 dark:bg-blue-500/25 dark:text-blue-50';
    case 'darkblue':
      return 'bg-blue-200 text-slate-900 dark:bg-blue-800/40 dark:text-blue-50';
    case 'black':
      return 'bg-slate-200 text-slate-900 dark:bg-slate-500/40 dark:text-slate-50';
    case 'miss':
      return 'bg-gray-200 text-slate-700 dark:bg-gray-500/30 dark:text-gray-100';
    default:
      return 'bg-slate-50 text-slate-900 dark:bg-slate-700 dark:text-slate-100';
  }
}
