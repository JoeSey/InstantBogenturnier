import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Registration from './Registration.svelte';
import { db } from '../db/schema';
import { resetDb } from '../db/testHelpers';
import { strings } from '../i18n/strings.de';

// Behavior per 04-03-PLAN.md Task 2 <action>/<acceptance_criteria> block (RES-06,
// D-11/D-12): delete-shooter is disabled once the tournament is finalized, with an
// inline guard message rendered once per view — never an intercept-at-click-time
// dialog. Edit-shooter (Pencil) and add-shooter remain unaffected (Pitfall 5).
describe('Registration', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('leaves the delete-shooter button enabled and renders no guard message when no scores exist', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.shooters.add({ name: 'Anna', classId });

    render(Registration);

    const deleteButtons = await screen.findAllByLabelText(strings.registration.deleteAction);
    for (const button of deleteButtons) {
      expect((button as HTMLButtonElement).disabled).toBe(false);
    }
    expect(screen.queryByText(strings.results.guardMessage)).toBeNull();
  });

  // WR-02 (04-REVIEW.md): deleting a shooter must also remove their own score rows —
  // otherwise db.scores accumulates orphaned records keyed to a shooterId that no
  // longer exists in db.shooters.
  it('deletes the shooter\'s score rows along with the shooter (no orphaned ScoreRecords)', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    const shooterId = await db.shooters.add({ name: 'Anna', classId });
    await db.scores.add({
      shooterId,
      roundIndex: 0,
      passeIndex: 0,
      arrowIndex: 0,
      value: '10',
      finalized: false,
    });

    render(Registration);

    const [deleteButton] = await screen.findAllByLabelText(strings.registration.deleteAction);
    await fireEvent.click(deleteButton);

    await screen.findByText(strings.registration.emptyBody);
    expect(await db.shooters.get(shooterId)).toBeUndefined();
    expect(await db.scores.where('shooterId').equals(shooterId).count()).toBe(0);
  });

  it('disables the delete-shooter button and shows the guard message once the tournament is finalized', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.shooters.add({ name: 'Anna', classId });
    await db.scores.put({
      shooterId: 1,
      roundIndex: 0,
      passeIndex: 0,
      arrowIndex: 0,
      value: '8',
      finalized: true,
    });

    render(Registration);

    const deleteButtons = await screen.findAllByLabelText(strings.registration.deleteAction);
    expect(deleteButtons.length).toBeGreaterThan(0);
    for (const button of deleteButtons) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    await screen.findByText(strings.results.guardMessage);
  });

  it('leaves the edit-shooter button enabled even when the tournament is finalized (Pitfall 5 regression guard)', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.shooters.add({ name: 'Anna', classId });
    await db.scores.put({
      shooterId: 1,
      roundIndex: 0,
      passeIndex: 0,
      arrowIndex: 0,
      value: '8',
      finalized: true,
    });

    render(Registration);

    const editButtons = await screen.findAllByLabelText(strings.registration.editAction);
    expect(editButtons.length).toBeGreaterThan(0);
    for (const button of editButtons) {
      expect((button as HTMLButtonElement).disabled).toBe(false);
    }
  });
});
