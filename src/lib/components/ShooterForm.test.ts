import { describe, it, expect, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/svelte';
import ShooterForm from './ShooterForm.svelte';
import Registration from '../views/Registration.svelte';
import { db } from '../db/schema';
import { resetDb } from '../db/testHelpers';

// Behavior per 02-03-PLAN.md Task 2 <acceptance_criteria> block (REG-01, REG-02).
describe('ShooterForm', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('is a no-op when submitted with an empty name', async () => {
    await db.classes.add({ name: 'RCV-U14' });

    render(ShooterForm);

    const submitButton = screen.getByRole('button', { name: 'Schütze hinzufügen' });
    await fireEvent.click(submitButton);

    expect(screen.queryByText('Schützen zugewiesen')).toBeNull();
    expect(await db.shooters.count()).toBe(0);
  });

  it('opens the auto-assign modal for one shooter and persists it on Speichern', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.shootingLines.put({ id: 1, count: 2 });

    render(ShooterForm);

    // The classes dropdown is populated asynchronously via liveQuery — wait for the
    // option to appear before interacting with it.
    await screen.findByRole('option', { name: 'RCV-U14' });

    const nameInput = screen.getByLabelText('Name');
    await fireEvent.input(nameInput, { target: { value: 'Anna' } });

    const classSelect = screen.getByLabelText(/Klasse/) as HTMLSelectElement;
    await fireEvent.change(classSelect, { target: { value: String(classId) } });

    const submitButton = screen.getByRole('button', { name: 'Schütze hinzufügen' });
    await fireEvent.click(submitButton);

    // Exactly 1 assignment shown in the preview.
    await screen.findByText('1 Schützen werden automatisch zugewiesen:');

    const saveButton = screen.getByRole('button', { name: 'Speichern' });
    await fireEvent.click(saveButton);

    expect(await db.shooters.count()).toBe(1);
    const [shooter] = await db.shooters.toArray();
    expect(shooter.name).toBe('Anna');
    expect(shooter.classId).toBe(classId);
    expect(typeof shooter.lineAssignment).toBe('number');
    expect(shooter.flight === 'A/B' || shooter.flight === 'C/D').toBe(true);
  });

  // CR-02 (04-REVIEW.md): once finalized, editing an existing shooter must not be able
  // to reassign classId — that would silently corrupt the "locked" per-class rankings
  // that delete-shooter (04-03-PLAN.md Task 2) already protects.
  it('blocks a classId change via the edit path once isFinalized is true', async () => {
    const classA = await db.classes.add({ name: 'RCV-U14' });
    const classB = await db.classes.add({ name: 'RCV-U16' });
    const shooterId = await db.shooters.add({ name: 'Anna', classId: classA, lineAssignment: 1 });
    await db.scores.add({
      shooterId,
      roundIndex: 0,
      passeIndex: 0,
      arrowIndex: 0,
      value: '10',
      finalized: true,
    });

    render(ShooterForm, {
      editingShooter: { id: shooterId, name: 'Anna', classId: classA, lineAssignment: 1 },
      isFinalized: true,
    });

    const classSelect = screen.getByLabelText(/Klasse/) as HTMLSelectElement;
    expect(classSelect.disabled).toBe(true);

    await fireEvent.change(classSelect, { target: { value: String(classB) } });
    const submitButton = screen.getByRole('button', { name: 'Schütze ändern' });
    expect((submitButton as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(submitButton);

    const shooter = await db.shooters.get(shooterId);
    expect(shooter?.classId).toBe(classA);
    await screen.findByText('Turnier abgeschlossen — Zurücksetzen, um zu ändern.');
  });

  it('allows adding a new shooter even when isFinalized is true', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.shootingLines.put({ id: 1, count: 2 });

    render(ShooterForm, { isFinalized: true });

    await screen.findByRole('option', { name: 'RCV-U14' });
    const nameInput = screen.getByLabelText('Name');
    await fireEvent.input(nameInput, { target: { value: 'Bea' } });
    const classSelect = screen.getByLabelText(/Klasse/) as HTMLSelectElement;
    await fireEvent.change(classSelect, { target: { value: String(classId) } });

    const submitButton = screen.getByRole('button', { name: 'Schütze hinzufügen' });
    expect((submitButton as HTMLButtonElement).disabled).toBe(false);
    await fireEvent.click(submitButton);

    const saveButton = await screen.findByRole('button', { name: 'Speichern' });
    await fireEvent.click(saveButton);

    await waitFor(async () => {
      expect(await db.shooters.count()).toBe(1);
    });
  });
});

// Regression test for the auto-assign-modal-round-robin debug session. Note: an earlier
// revision of this fix also added a re-entrancy guard (+ regression test) against
// double-clicking "Speichern" causing a duplicate db record. That guard was explicitly
// descoped per user decision: displaying/processing the confirmation exactly once per
// normal submission is the only requirement, and the guard implementation caused an
// unrelated unresponsiveness issue on iPadOS Safari. See
// .planning/debug/resolved/auto-assign-modal-round-robin.md for the full history.
describe('Registration round-robin regression', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('distributes 3 sequentially-registered shooters round-robin (1,2,1) with lineCount=2, modal shown only once', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.shootingLines.put({ id: 1, count: 2 });

    render(Registration);
    await screen.findByRole('option', { name: 'RCV-U14' });

    for (let i = 0; i < 3; i++) {
      const nameInput = screen.getByLabelText('Name');
      await fireEvent.input(nameInput, { target: { value: `Schütze ${i}` } });

      const classSelect = screen.getByLabelText(/Klasse/) as HTMLSelectElement;
      await fireEvent.change(classSelect, { target: { value: String(classId) } });

      const submitButton = screen.getByRole('button', { name: 'Schütze hinzufügen' });
      await fireEvent.click(submitButton);

      if (i === 0) {
        const saveButton = await screen.findByRole('button', { name: 'Speichern' });
        await fireEvent.click(saveButton);

        await waitForElementToBeRemoved(() => screen.queryByRole('button', { name: 'Speichern' }));
      } else {
        await waitFor(async () => {
          expect(await db.shooters.count()).toBe(i + 1);
        });
      }
    }

    const shooters = await db.shooters.toArray();
    expect(shooters.map((s) => s.lineAssignment)).toEqual([1, 2, 1]);
  });
});

describe('Registration mode indicator', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('flips from AB to AB/CD as shooterCount crosses 2 x lineCount', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.shootingLines.put({ id: 1, count: 2 });

    render(Registration);

    await screen.findByText('Modus: AB');
    await screen.findByRole('option', { name: 'RCV-U14' });

    for (let i = 0; i < 5; i++) {
      const nameInput = screen.getByLabelText('Name');
      await fireEvent.input(nameInput, { target: { value: `Schütze ${i}` } });

      const classSelect = screen.getByLabelText(/Klasse/) as HTMLSelectElement;
      await fireEvent.change(classSelect, { target: { value: String(classId) } });

      const submitButton = screen.getByRole('button', { name: 'Schütze hinzufügen' });
      await fireEvent.click(submitButton);

      if (i === 0) {
        const saveButton = await screen.findByRole('button', { name: 'Speichern' });
        await fireEvent.click(saveButton);

        // Wait for the modal to close (and shooter to be persisted) before continuing.
        await waitForElementToBeRemoved(() => screen.queryByRole('button', { name: 'Speichern' }));
      } else {
        await waitFor(async () => {
          expect(await db.shooters.count()).toBe(i + 1);
        });
      }
    }

    await screen.findByText('Modus: AB/CD');
  });
});

describe('Auto-assign once-per-session', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('does not reopen the modal for a second auto-assigned registration in the same session', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.shootingLines.put({ id: 1, count: 2 });

    render(Registration);
    await screen.findByRole('option', { name: 'RCV-U14' });

    // First blank-line registration: modal shows, confirm via Speichern.
    const nameInput1 = screen.getByLabelText('Name');
    await fireEvent.input(nameInput1, { target: { value: 'Schütze 0' } });
    const classSelect1 = screen.getByLabelText(/Klasse/) as HTMLSelectElement;
    await fireEvent.change(classSelect1, { target: { value: String(classId) } });
    const submitButton1 = screen.getByRole('button', { name: 'Schütze hinzufügen' });
    await fireEvent.click(submitButton1);

    const saveButton = await screen.findByRole('button', { name: 'Speichern' });
    await fireEvent.click(saveButton);
    await waitForElementToBeRemoved(() => screen.queryByRole('button', { name: 'Speichern' }));

    // Second blank-line registration: no modal this time — written silently.
    const nameInput2 = screen.getByLabelText('Name');
    await fireEvent.input(nameInput2, { target: { value: 'Schütze 1' } });
    const classSelect2 = screen.getByLabelText(/Klasse/) as HTMLSelectElement;
    await fireEvent.change(classSelect2, { target: { value: String(classId) } });
    const submitButton2 = screen.getByRole('button', { name: 'Schütze hinzufügen' });
    await fireEvent.click(submitButton2);

    await waitFor(async () => {
      expect(await db.shooters.count()).toBe(2);
    });

    expect(screen.queryByRole('dialog')).toBeNull();

    const shooters = await db.shooters.toArray();
    expect(shooters.map((s) => s.lineAssignment)).toEqual([1, 2]);
  });
});
