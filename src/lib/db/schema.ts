import Dexie from 'dexie';

// Empty schema scaffold for Phase 1 — no tables yet. Real tables (classes, shooters,
// scores, presets) are added starting Phase 2. Opened on boot only to prove IndexedDB
// works in the target PWA context (walking-skeleton "Dexie opens without error" truth).
class InstantBogenturnierDB extends Dexie {
  constructor() {
    super('InstantBogenturnierDB');
    this.version(1).stores({});
  }
}

export const db = new InstantBogenturnierDB();
