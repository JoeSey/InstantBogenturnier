import Dexie, { type Table } from 'dexie';

// Uses Blob.arrayBuffer() + manual base64 encoding rather than FileReader: fake-
// indexeddb (used under jsdom in tests) constructs Blobs against a different global
// than jsdom's own FileReader expects, which rejects them as "not of type Blob".
// arrayBuffer() is a plain Blob-prototype method and works across that boundary.
async function blobToDataUri(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = btoa(binary);
  return `data:${blob.type || 'application/octet-stream'};base64,${base64}`;
}

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
  distance?: string;
  presetId?: string;
  rings?: 10 | 5;
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

// Phase 3 data model — per-arrow score entry (03-01-PLAN.md Interfaces block).
// `roundIndex`/`passeIndex`/`arrowIndex` are 0-based; the UI displays them 1-based
// via `{i + 1}`. No separate `id` field — the 4-part compound tuple below is the
// primary key, giving `db.scores.put(...)` upsert-by-cell semantics for free.
export type ScoreValue =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'X'
  | 'M';

export interface ScoreRecord {
  shooterId: number;
  roundIndex: number;
  passeIndex: number;
  arrowIndex: number;
  value: ScoreValue;
  finalized: boolean;
}

// Phase 5 data model — settings singleton (title + optional header logo images) used by
// the PDF export feature (Plan 02) and, per 05-CONTEXT.md D-05, built generically now
// for reuse by the future certificates phase (Phase 6) rather than PDF-export-specific.
//
// Logos are stored as data URI strings, not Blobs (see v6 migration below) — WebKit's
// IndexedDB has a documented bug where any write transaction against an object store
// holding Blobs can invalidate previously-read Blob references from that same store,
// making them throw `NotFoundError` on the next read. That's exactly what surfaced as
// "Schießformular konnte nicht generiert werden" after every title save: saving the
// settings row invalidated the already-open logoLeftBlob/logoRightBlob, and the next
// PDF export's FileReader read of that Blob threw. Data URI strings aren't subject to
// this bug at all.
export interface SettingsRecord {
  id: 1;
  title?: string;
  logoLeftDataUri?: string;
  logoRightDataUri?: string;
  certificateHeading?: string;
}

class InstantBogenturnierDB extends Dexie {
  classes!: Table<ClassRecord, number>;
  // Singleton row tables (always id: 1) — keyed by explicit `id`, not auto-increment.
  shootingLines!: Table<ShootingLineConfig, number>;
  rounds!: Table<RoundConfig, number>;
  shooters!: Table<ShooterRecord, number>;
  presets!: Table<PresetRecord, number>;
  scores!: Table<ScoreRecord, [number, number, number, number]>;
  settings!: Table<SettingsRecord, number>;

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
    // v3 (Phase 3 Plan 01): adds the `scores` table. Every prior version's stores must
    // be restated unchanged per Dexie's versioning requirement.
    this.version(3).stores({
      classes: '++id, name',
      shootingLines: 'id',
      rounds: 'id',
      shooters: '++id, classId, lineAssignment',
      presets: '++id, name',
      scores: '[shooterId+roundIndex+passeIndex+arrowIndex], shooterId, roundIndex',
    });
    // v4 (Phase 5 Plan 01): adds the `settings` singleton table (title + logo Blobs).
    // Every prior version's stores must be restated unchanged per Dexie's versioning
    // requirement.
    this.version(4).stores({
      classes: '++id, name',
      shootingLines: 'id',
      rounds: 'id',
      shooters: '++id, classId, lineAssignment',
      presets: '++id, name',
      scores: '[shooterId+roundIndex+passeIndex+arrowIndex], shooterId, roundIndex',
      settings: 'id',
    });
    // v5 (Phase 6 Plan 01): adds `certificateHeading` to the settings singleton (used by
    // the per-shooter certificate PDF export). Every prior version's stores must be
    // restated unchanged per Dexie's versioning requirement; only `.upgrade()` is new.
    this.version(5)
      .stores({
        classes: '++id, name',
        shootingLines: 'id',
        rounds: 'id',
        shooters: '++id, classId, lineAssignment',
        presets: '++id, name',
        scores: '[shooterId+roundIndex+passeIndex+arrowIndex], shooterId, roundIndex',
        settings: 'id',
      })
      .upgrade((tx) =>
        tx
          .table('settings')
          .toCollection()
          .modify((record) => {
            if (!record.certificateHeading) {
              record.certificateHeading = 'Urkunde';
            }
          })
      );
    // v6: migrates logoLeftBlob/logoRightBlob (Blob) to logoLeftDataUri/logoRightDataUri
    // (string) — see the SettingsRecord comment above for why. Every prior version's
    // stores must be restated unchanged per Dexie's versioning requirement.
    this.version(6)
      .stores({
        classes: '++id, name',
        shootingLines: 'id',
        rounds: 'id',
        shooters: '++id, classId, lineAssignment',
        presets: '++id, name',
        scores: '[shooterId+roundIndex+passeIndex+arrowIndex], shooterId, roundIndex',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        const table = tx.table('settings');
        const records = await table.toArray();
        for (const record of records) {
          if (record.logoLeftBlob instanceof Blob) {
            record.logoLeftDataUri = await blobToDataUri(record.logoLeftBlob);
            delete record.logoLeftBlob;
          }
          if (record.logoRightBlob instanceof Blob) {
            record.logoRightDataUri = await blobToDataUri(record.logoRightBlob);
            delete record.logoRightBlob;
          }
          await table.put(record);
        }
      });
  }
}

export const db = new InstantBogenturnierDB();
