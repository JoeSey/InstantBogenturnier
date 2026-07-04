import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './schema';
import { resetDb } from './testHelpers';

// Dexie v2 schema (Phase 2): all 5 tables this phase's plans need — classes,
// shootingLines, rounds, shooters, presets. fake-indexeddb (wired in vitest-setup.ts)
// polyfills IndexedDB under jsdom so this can be asserted without a real browser.
describe('Dexie v2 schema', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('defines all 5 Phase 2 tables', () => {
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      ['classes', 'presets', 'rounds', 'shooters', 'shootingLines'].sort()
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
});
