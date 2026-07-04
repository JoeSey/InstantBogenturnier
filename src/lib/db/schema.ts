import Dexie, { type Table } from 'dexie';

// Phase 2 data model — all 5 tables this phase (and Plans 02/03/04) need. Defined up
// front, not incrementally per plan, so Wave 2 plans (lines/rounds, registration,
// presets) can build against a stable schema without touching this file again.

export interface ClassRecord {
  id?: number;
  name: string;
  ageGroup?: string;
  bowType?: string;
  distance?: string;
}

export interface ShootingLineConfig {
  id?: number;
  count: number;
}

export interface RoundConfig {
  id?: number;
  arrowsPerPasse: number;
  passesPerRound: number;
  numberOfRounds: number;
  distance: string;
  presetId?: string;
}

export interface ShooterRecord {
  id?: number;
  name: string;
  classId: number;
  lineAssignment?: number | null;
  flight?: 'A/B' | 'C/D' | null;
}

export interface PresetRecord {
  id?: number;
  name: string;
  classes: ClassRecord[];
  shootingLineCount: number;
  roundsConfig: Omit<RoundConfig, 'id'>;
  createdAt: Date;
}

class InstantBogenturnierDB extends Dexie {
  classes!: Table<ClassRecord, number>;
  // Singleton row tables (always id: 1) — keyed by explicit `id`, not auto-increment.
  shootingLines!: Table<ShootingLineConfig, number>;
  rounds!: Table<RoundConfig, number>;
  shooters!: Table<ShooterRecord, number>;
  presets!: Table<PresetRecord, number>;

  constructor() {
    super('InstantBogenturnierDB');
    // v1 (Phase 1 walking skeleton): empty, proved IndexedDB opens without error.
    this.version(1).stores({});
    this.version(2).stores({
      classes: '++id, name',
      shootingLines: 'id',
      rounds: 'id',
      shooters: '++id, classId, lineAssignment',
      presets: '++id, name',
    });
  }
}

export const db = new InstantBogenturnierDB();
