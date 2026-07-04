import { db } from './schema';

// Shared test helper (per 02-01-PLAN.md Interfaces block): clears all 5 Phase 2 tables.
// Every later Dexie-touching test file (Plans 02, 03, 04) calls this in `beforeEach`.
export async function resetDb(): Promise<void> {
  await Promise.all([
    db.classes.clear(),
    db.shootingLines.clear(),
    db.rounds.clear(),
    db.shooters.clear(),
    db.presets.clear(),
  ]);
}
