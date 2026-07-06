import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import { db } from './schema';
import { resetDb } from './testHelpers';

// Dexie v2 schema (Phase 2): all 5 tables this phase's plans need — classes,
// shootingLines, rounds, shooters, presets. fake-indexeddb (wired in vitest-setup.ts)
// polyfills IndexedDB under jsdom so this can be asserted without a real browser.
// Note: `db` always opens at its latest defined version (v3 as of Phase 3 Plan 01),
// so table-membership assertions here include the `scores` table too — see the
// "Dexie v3 schema" describe block below for the schema-migration-specific coverage.
describe('Dexie v2 schema', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('defines all 5 Phase 2 tables plus the Phase 3 scores and Phase 5 settings tables', () => {
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      ['classes', 'presets', 'rounds', 'scores', 'settings', 'shooters', 'shootingLines'].sort()
    );
  });

  it('supports a CRUD roundtrip on the classes table', async () => {
    await db.classes.add({ name: 'Test' });
    const all = await db.classes.toArray();
    expect(all.some((c) => c.name === 'Test')).toBe(true);
  });

  it('supports a singleton roundtrip on the shootingLines table', async () => {
    await db.shootingLines.put({ id: 1, count: 4 });
    const config = await db.shootingLines.get(1);
    expect(config).toEqual({ id: 1, count: 4 });
  });

  it('supports a singleton roundtrip on the rounds table', async () => {
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 3,
      passesPerRound: 10,
      numberOfRounds: 1,
      distance: '18m',
      presetId: 'wa-18m',
    });
    const config = await db.rounds.get(1);
    expect(config).toEqual({
      id: 1,
      arrowsPerPasse: 3,
      passesPerRound: 10,
      numberOfRounds: 1,
      distance: '18m',
      presetId: 'wa-18m',
    });
  });
});

// Dexie v3 schema (Phase 3 Plan 01): adds the `scores` table on top of Phase 2's 5
// tables. Compound primary key `[shooterId+roundIndex+passeIndex+arrowIndex]` gives
// upsert-by-cell semantics for free (RESEARCH.md Pitfall 1 — no duplicate records from
// repeated taps on the same cell).
describe('Dexie v3 schema', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('defines all 6 tables including scores', () => {
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      ['classes', 'presets', 'rounds', 'scores', 'settings', 'shooters', 'shootingLines'].sort()
    );
  });

  it('upserts by compound key instead of creating duplicate records', async () => {
    await db.scores.put({
      shooterId: 1,
      roundIndex: 0,
      passeIndex: 0,
      arrowIndex: 0,
      value: '8',
      finalized: false,
    });
    await db.scores.put({
      shooterId: 1,
      roundIndex: 0,
      passeIndex: 0,
      arrowIndex: 0,
      value: '9',
      finalized: false,
    });

    expect(await db.scores.count()).toBe(1);
    const [record] = await db.scores.toArray();
    expect(record.value).toBe('9');
  });
});

// Dexie v4 schema (Phase 5 Plan 01): adds the `settings` singleton table (title + logo
// Blobs) on top of Phase 2/3's 6 tables. Per 05-01-PLAN.md Task 1.
describe('Dexie v4 schema', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('defines all 7 tables including settings', () => {
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      ['classes', 'presets', 'rounds', 'scores', 'settings', 'shooters', 'shootingLines'].sort()
    );
  });

  it('supports a singleton roundtrip on the settings table', async () => {
    await db.settings.put({ id: 1, title: 'Test', logoLeftBlob: undefined, logoRightBlob: undefined });
    const record = await db.settings.get(1);
    expect(record?.title).toBe('Test');
  });

  it('round-trips a Blob value for logoLeftBlob as a Blob instance', async () => {
    const blob = new Blob(['fake-image-bytes'], { type: 'image/png' });
    await db.settings.put({ id: 1, title: 'With Logo', logoLeftBlob: blob });
    const record = await db.settings.get(1);
    expect(record?.logoLeftBlob).toBeInstanceOf(Blob);
  });
});

// Dexie v5 schema (Phase 6 Plan 01): adds `certificateHeading` to the settings singleton
// on top of Phase 5's 7 tables. Per 06-01-PLAN.md Task 1.
describe('Dexie v5 schema', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('defines all 7 tables including settings', () => {
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      ['classes', 'presets', 'rounds', 'scores', 'settings', 'shooters', 'shootingLines'].sort()
    );
  });

  it('defaults certificateHeading to "Urkunde" for a pre-v5 settings row after the upgrade runs', async () => {
    // Simulate an existing installation on v4: close the shared v5 `db`, delete the
    // underlying database, recreate it at v4 only, write a settings row without
    // certificateHeading, then reopen the real v5 `db` so its `.upgrade()` runs against
    // that pre-existing v4 data.
    db.close();
    await Dexie.delete('InstantBogenturnierDB');

    const v4Db = new Dexie('InstantBogenturnierDB');
    v4Db.version(4).stores({
      classes: '++id, name',
      shootingLines: 'id',
      rounds: 'id',
      shooters: '++id, classId, lineAssignment',
      presets: '++id, name',
      scores: '[shooterId+roundIndex+passeIndex+arrowIndex], shooterId, roundIndex',
      settings: 'id',
    });
    await v4Db.open();
    await v4Db.table('settings').put({ id: 1, title: 'Test' });
    v4Db.close();

    await db.open();
    const record = await db.settings.get(1);
    expect(record?.certificateHeading).toBe('Urkunde');
  });

  it('round-trips an explicit certificateHeading value unchanged', async () => {
    await db.settings.put({ id: 1, title: 'Test', certificateHeading: 'Teilnahmeurkunde' });
    const record = await db.settings.get(1);
    expect(record?.certificateHeading).toBe('Teilnahmeurkunde');
  });
});
