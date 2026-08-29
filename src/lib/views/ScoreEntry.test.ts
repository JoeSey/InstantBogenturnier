import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ScoreEntry from './ScoreEntry.svelte';
import { db } from '../db/schema';
import { resetDb } from '../db/testHelpers';
import { strings } from '../i18n/strings.de';
import { defaultRoundRuleset } from '../utils/threeDScoring';

// Behavior per 03-01-PLAN.md Task 2 <acceptance_criteria> block (SCORE-01/02/03/05).
describe('ScoreEntry', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('renders the shooter name, class name, and line number once configured', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.shootingLines.put({ id: 1, count: 2 });
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 2,
      passesPerRound: 1,
      numberOfRounds: 1,
      distance: '18m',
    });
    await db.shooters.add({ name: 'Anna', classId, lineAssignment: 3 });

    render(ScoreEntry);

    await screen.findByText('Anna');
    await screen.findByText('RCV-U14');
    await screen.findByText('3');
  });

  // Static class-presence check only (260705-p25) — jsdom does not evaluate real
  // media queries, so this only proves the responsive utility classes are present
  // on the Klasse th/td; e2e/scoring.spec.ts proves actual hide/show behavior in a
  // real browser at 375px/1024px.
  it('marks the Klasse column th and td with responsive hidden md:table-cell classes', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.shootingLines.put({ id: 1, count: 2 });
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 2,
      passesPerRound: 1,
      numberOfRounds: 1,
      distance: '18m',
    });
    await db.shooters.add({ name: 'Anna', classId, lineAssignment: 3 });

    const { container } = render(ScoreEntry);
    await screen.findByText('Anna');

    const classHeaderTh = container.querySelector('thead th:nth-child(3)') as HTMLElement;
    expect(classHeaderTh).not.toBeNull();
    expect(classHeaderTh.className).toContain('hidden');
    expect(classHeaderTh.className).toContain('md:table-cell');

    const classDataTd = container.querySelectorAll('tbody tr')[0].querySelectorAll('td')[2];
    expect(classDataTd.className).toContain('hidden');
    expect(classDataTd.className).toContain('md:table-cell');
  });

  it('opens the picker on cell tap and autosaves the selected value', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 1,
      passesPerRound: 1,
      numberOfRounds: 1,
      distance: '18m',
    });
    const shooterId = await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });

    const { container } = render(ScoreEntry);
    await screen.findByText('Anna');

    const arrowButtons = container.querySelectorAll('tbody button');
    expect(arrowButtons.length).toBe(1);
    await fireEvent.click(arrowButtons[0]);

    const eightButton = await screen.findByRole('button', { name: '8 Punkte' });
    await fireEvent.click(eightButton);

    // Picker closes — no empty arrow left to auto-advance to (260705-lpv).
    expect(screen.queryByRole('button', { name: '8 Punkte' })).toBeNull();

    await waitFor(async () => {
      expect(await db.scores.count()).toBe(1);
    });
    const [record] = await db.scores.toArray();
    expect(record).toMatchObject({
      shooterId,
      roundIndex: 0,
      passeIndex: 0,
      arrowIndex: 0,
      value: '8',
    });
  });

  // Behavior per 260710-erfassung-jump-to-blank-PLAN.md Task 2 <behavior> block:
  // one-shot initial jump to the first incomplete round/passe on mount.
  describe('initial jump to first incomplete passe (260710-erfassung-jump-to-blank)', () => {
    it('opens on round 1/passe 1 for a fresh tournament with no scores yet', async () => {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 1,
        passesPerRound: 2,
        numberOfRounds: 2,
        distance: '18m',
      });
      await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });

      render(ScoreEntry);
      await screen.findByText('Anna');

      expect((screen.getByLabelText(strings.scoring.roundLabel) as HTMLSelectElement).value).toBe(
        '0'
      );
      expect((screen.getByLabelText(strings.scoring.passeLabel) as HTMLSelectElement).value).toBe(
        '0'
      );
    });

    it('jumps to the first round/passe with a blank arrow when earlier passes are already complete', async () => {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 1,
        passesPerRound: 2,
        numberOfRounds: 1,
        distance: '18m',
      });
      const shooterId = await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });
      await db.scores.add({
        shooterId,
        roundIndex: 0,
        passeIndex: 0,
        arrowIndex: 0,
        value: '8',
        finalized: false,
      });

      render(ScoreEntry);
      await screen.findByText('Anna');

      await waitFor(() => {
        expect(
          (screen.getByLabelText(strings.scoring.passeLabel) as HTMLSelectElement).value
        ).toBe('1');
      });
      expect((screen.getByLabelText(strings.scoring.roundLabel) as HTMLSelectElement).value).toBe(
        '0'
      );
    });

    it('opens on round 1/passe 1 when every score in the tournament is already entered', async () => {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 1,
        passesPerRound: 1,
        numberOfRounds: 1,
        distance: '18m',
      });
      const shooterId = await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });
      await db.scores.add({
        shooterId,
        roundIndex: 0,
        passeIndex: 0,
        arrowIndex: 0,
        value: '8',
        finalized: false,
      });

      render(ScoreEntry);
      await screen.findByText('Anna');

      expect((screen.getByLabelText(strings.scoring.roundLabel) as HTMLSelectElement).value).toBe(
        '0'
      );
      expect((screen.getByLabelText(strings.scoring.passeLabel) as HTMLSelectElement).value).toBe(
        '0'
      );
    });

    it('does not override manual navigation after the initial jump has been applied', async () => {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 1,
        passesPerRound: 2,
        numberOfRounds: 1,
        distance: '18m',
      });
      const shooterId = await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });
      await db.scores.add({
        shooterId,
        roundIndex: 0,
        passeIndex: 0,
        arrowIndex: 0,
        value: '8',
        finalized: false,
      });

      render(ScoreEntry);
      await screen.findByText('Anna');

      const passeSelect = (await waitFor(() =>
        screen.getByLabelText(strings.scoring.passeLabel)
      )) as HTMLSelectElement;
      await waitFor(() => expect(passeSelect.value).toBe('1'));

      // Manually navigate back to passe 1.
      await fireEvent.change(passeSelect, { target: { value: '0' } });
      expect(passeSelect.value).toBe('0');

      // Entering a new score (allScores updates via liveQuery) must not retrigger
      // the initial jump and reset the trainer's manual selection.
      await db.scores.add({
        shooterId,
        roundIndex: 0,
        passeIndex: 1,
        arrowIndex: 0,
        value: '9',
        finalized: false,
      });

      await waitFor(async () => {
        expect(await db.scores.count()).toBe(2);
      });

      expect(passeSelect.value).toBe('0');
    });
  });

  // Behavior per 260705-ok7-PLAN.md Task 3 <behavior> block: same-row-only
  // auto-advance, wasFilled short-circuit for edits, and the live row preview.
  describe('picker title, backdrop dismiss, and auto-advance (260705-ok7)', () => {
    it("shows the tapped archer's name and a live row preview in the picker dialog title", async () => {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 1,
        passesPerRound: 1,
        numberOfRounds: 1,
        distance: '18m',
      });
      await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });

      const { container } = render(ScoreEntry);
      await screen.findByText('Anna');

      const arrowButtons = container.querySelectorAll('tbody button');
      await fireEvent.click(arrowButtons[0]);

      await screen.findByText('Punkte von Anna (-)');
    });

    it('clicking the backdrop cancels the picker without writing a score', async () => {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 1,
        passesPerRound: 1,
        numberOfRounds: 1,
        distance: '18m',
      });
      await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });

      const { container } = render(ScoreEntry);
      await screen.findByText('Anna');

      const arrowButtons = container.querySelectorAll('tbody button');
      await fireEvent.click(arrowButtons[0]);

      const dialog = await screen.findByRole('dialog');
      const backdrop = dialog.closest('.fixed.inset-0') as HTMLElement;
      await fireEvent.click(backdrop);

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(await db.scores.count()).toBe(0);
    });

    it('auto-advances to the next empty arrow in the same row after a selection', async () => {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 2,
        passesPerRound: 1,
        numberOfRounds: 1,
        distance: '18m',
      });
      const shooterId = await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });

      const { container } = render(ScoreEntry);
      await screen.findByText('Anna');

      const arrowButtons = container.querySelectorAll('tbody button');
      await fireEvent.click(arrowButtons[0]);
      const eightButton = await screen.findByRole('button', { name: '8 Punkte' });
      await fireEvent.click(eightButton);

      // Picker reopens for the same shooter (still one empty arrow left), and the
      // title preview reflects the just-made pick even though the Dexie write above
      // was never awaited.
      await screen.findByText('Punkte von Anna (8 -)');
      await waitFor(async () => {
        expect(await db.scores.count()).toBe(1);
      });

      const sevenButton = await screen.findByRole('button', { name: '7 Punkte' });
      await fireEvent.click(sevenButton);

      // Both arrows filled — picker closes, it does not jump to another row.
      expect(screen.queryByRole('dialog')).toBeNull();
      await waitFor(async () => {
        expect(await db.scores.count()).toBe(2);
      });
      const records = await db.scores.toArray();
      expect(records).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ shooterId, arrowIndex: 0, value: '8' }),
          expect.objectContaining({ shooterId, arrowIndex: 1, value: '7' }),
        ])
      );
    });

    it('closes the dialog instead of opening the next shooter\'s row once the current row completes', async () => {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 1,
        passesPerRound: 1,
        numberOfRounds: 1,
        distance: '18m',
      });
      await db.shooters.add({ name: 'Bob', classId, lineAssignment: 1 });
      await db.shooters.add({ name: 'Anna', classId, lineAssignment: 2 });

      const { container } = render(ScoreEntry);
      await screen.findByText('Anna');

      // Default sort is by Linie ascending -> Bob (line 1) is the first row.
      const arrowButtons = container.querySelectorAll('tbody button');
      await fireEvent.click(arrowButtons[0]);
      await screen.findByText('Punkte von Bob (-)');

      const eightButton = await screen.findByRole('button', { name: '8 Punkte' });
      await fireEvent.click(eightButton);

      // Bob's only arrow is now filled — dialog closes, cross-row auto-advance is
      // retired, so Anna's row must never open automatically.
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.queryByText(/Punkte von Anna/)).toBeNull();
      await waitFor(async () => {
        expect(await db.scores.count()).toBe(1);
      });
    });

    it('editing an already-filled cell closes the dialog immediately without reopening', async () => {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 2,
        passesPerRound: 1,
        numberOfRounds: 1,
        distance: '18m',
      });
      const shooterId = await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });

      const { container } = render(ScoreEntry);
      await screen.findByText('Anna');

      // Fill arrow 0 first — picker reopens on arrow 1 (still empty).
      let arrowButtons = container.querySelectorAll('tbody button');
      await fireEvent.click(arrowButtons[0]);
      const eightButton = await screen.findByRole('button', { name: '8 Punkte' });
      await fireEvent.click(eightButton);
      await screen.findByText('Punkte von Anna (8 -)');
      await waitFor(async () => {
        expect(await db.scores.count()).toBe(1);
      });

      // Dismiss the reopened dialog (arrow 1 stays empty) so we can re-tap arrow 0.
      const dialog = await screen.findByRole('dialog');
      const backdrop = dialog.closest('.fixed.inset-0') as HTMLElement;
      await fireEvent.click(backdrop);
      expect(screen.queryByRole('dialog')).toBeNull();

      // Re-tap the already-filled arrow 0 cell and pick a different value. A naive
      // same-row scan would find arrow 1 still empty and wrongly reopen — the
      // wasFilled short-circuit must close the dialog instead.
      arrowButtons = container.querySelectorAll('tbody button');
      await fireEvent.click(arrowButtons[0]);
      await screen.findByText('Punkte von Anna (8 -)');
      const sixButton = await screen.findByRole('button', { name: '6 Punkte' });
      await fireEvent.click(sixButton);

      expect(screen.queryByRole('dialog')).toBeNull();
      await waitFor(async () => {
        const record = (await db.scores.toArray()).find(
          (s) => s.shooterId === shooterId && s.arrowIndex === 0
        );
        expect(record?.value).toBe('6');
      });
    });
  });

  // Post-ship UAT feedback: desktop trainers want to type scores instead of clicking.
  // Physical keydown only — never triggers the on-screen keyboard on touch devices.
  describe('keyboard shortcuts in the picker (post-ship UAT)', () => {
    it('digit keys 1-9 write the matching score', async () => {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 1,
        passesPerRound: 1,
        numberOfRounds: 1,
        distance: '18m',
      });
      const shooterId = await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });

      const { container } = render(ScoreEntry);
      await screen.findByText('Anna');

      const arrowButtons = container.querySelectorAll('tbody button');
      await fireEvent.click(arrowButtons[0]);
      await screen.findByRole('dialog');

      await fireEvent.keyDown(window, { key: '7' });

      expect(screen.queryByRole('dialog')).toBeNull();
      await waitFor(async () => {
        const record = (await db.scores.toArray()).find(
          (s) => s.shooterId === shooterId && s.arrowIndex === 0
        );
        expect(record?.value).toBe('7');
      });
    });

    it('the "0" key writes a 10', async () => {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 1,
        passesPerRound: 1,
        numberOfRounds: 1,
        distance: '18m',
      });
      const shooterId = await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });

      const { container } = render(ScoreEntry);
      await screen.findByText('Anna');

      const arrowButtons = container.querySelectorAll('tbody button');
      await fireEvent.click(arrowButtons[0]);
      await screen.findByRole('dialog');

      await fireEvent.keyDown(window, { key: '0' });

      await waitFor(async () => {
        const record = (await db.scores.toArray()).find(
          (s) => s.shooterId === shooterId && s.arrowIndex === 0
        );
        expect(record?.value).toBe('10');
      });
    });

    it('the "x"/"X" key writes X and the "m"/"M" key writes M, case-insensitively', async () => {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 2,
        passesPerRound: 1,
        numberOfRounds: 1,
        distance: '18m',
      });
      const shooterId = await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });

      const { container } = render(ScoreEntry);
      await screen.findByText('Anna');

      const arrowButtons = container.querySelectorAll('tbody button');
      await fireEvent.click(arrowButtons[0]);
      await screen.findByRole('dialog');
      await fireEvent.keyDown(window, { key: 'X' });

      await screen.findByRole('dialog');
      await fireEvent.keyDown(window, { key: 'm' });

      expect(screen.queryByRole('dialog')).toBeNull();
      await waitFor(async () => {
        const records = await db.scores.toArray();
        expect(records).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ shooterId, arrowIndex: 0, value: 'X' }),
            expect.objectContaining({ shooterId, arrowIndex: 1, value: 'M' }),
          ])
        );
      });
    });

    it('ignores keystrokes with a modifier held (e.g. Ctrl+1) so browser shortcuts still work', async () => {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 1,
        passesPerRound: 1,
        numberOfRounds: 1,
        distance: '18m',
      });
      await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });

      const { container } = render(ScoreEntry);
      await screen.findByText('Anna');

      const arrowButtons = container.querySelectorAll('tbody button');
      await fireEvent.click(arrowButtons[0]);
      await screen.findByRole('dialog');

      await fireEvent.keyDown(window, { key: '1', ctrlKey: true });

      // Dialog stays open, no score written — the modifier-held keystroke was ignored.
      await screen.findByRole('dialog');
      expect(await db.scores.count()).toBe(0);
    });
  });

  it('shows sumIncomplete until every arrow is filled, then sums with M=0/X=10 treatment', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 2,
      passesPerRound: 1,
      numberOfRounds: 1,
      distance: '18m',
    });
    await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });

    const { container } = render(ScoreEntry);
    await screen.findByText('Anna');

    await screen.findByText(strings.scoring.sumIncomplete);

    // First arrow: M (miss) -> 0.
    let arrowButtons = container.querySelectorAll('tbody button');
    await fireEvent.click(arrowButtons[0]);
    const missButton = await screen.findByRole('button', { name: strings.scoring.pickerAriaMiss });
    await fireEvent.click(missButton);

    await waitFor(async () => {
      expect(await db.scores.count()).toBe(1);
    });

    // Sum still incomplete — only 1 of 2 arrows filled.
    await screen.findByText(strings.scoring.sumIncomplete);

    // Second arrow: X (inner-ten) -> 10.
    arrowButtons = container.querySelectorAll('tbody button');
    await fireEvent.click(arrowButtons[1]);
    const xButton = await screen.findByRole('button', { name: strings.scoring.pickerAriaX(10) });
    await fireEvent.click(xButton);

    await waitFor(async () => {
      expect(await db.scores.count()).toBe(2);
    });

    // Sum: M(0) + X(10) = 10.
    await screen.findByText('10', { selector: 'td' });
  });

  it('shows the not-configured message instead of the table when no rounds config exists', async () => {
    await db.classes.add({ name: 'RCV-U14' });

    render(ScoreEntry);

    await screen.findByText(strings.scoring.notConfiguredHeading);
    expect(screen.queryByRole('table')).toBeNull();
  });

  // Behavior per 03-02-PLAN.md Task 2 <acceptance_criteria> (SCORE-04).
  it('sorts rows by clicking column headers, toggling direction, and switching columns', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 1,
      passesPerRound: 1,
      numberOfRounds: 1,
      distance: '18m',
    });
    await db.shooters.add({ name: 'Bob', classId, lineAssignment: 1 });
    await db.shooters.add({ name: 'Anna', classId, lineAssignment: 2 });

    const { container } = render(ScoreEntry);
    await screen.findByText('Anna');

    const bodyNameCell = () =>
      container.querySelectorAll('tbody tr td:nth-child(2)')[0]?.textContent;

    // Default sort: by Linie ascending -> Bob (line 1) before Anna (line 2).
    expect(bodyNameCell()).toBe('Bob');

    const nameHeaderButton = screen.getByRole('button', { name: strings.scoring.columnName });
    await fireEvent.click(nameHeaderButton);

    // Ascending by Name -> Anna before Bob.
    await waitFor(() => {
      expect(bodyNameCell()).toBe('Anna');
    });
    const nameHeaderTh = container.querySelector('thead th:nth-child(2)');
    expect(nameHeaderTh?.getAttribute('aria-sort')).toBe('ascending');

    await fireEvent.click(nameHeaderButton);

    // Second click reverses to descending -> Bob before Anna.
    await waitFor(() => {
      expect(bodyNameCell()).toBe('Bob');
    });
    expect(nameHeaderTh?.getAttribute('aria-sort')).toBe('descending');

    const lineHeaderButton = screen.getByRole('button', { name: strings.scoring.columnLine });
    await fireEvent.click(lineHeaderButton);

    // Switching to Linie resets to ascending -> Bob (line 1) before Anna (line 2).
    await waitFor(() => {
      expect(bodyNameCell()).toBe('Bob');
    });
    const lineHeaderTh = container.querySelector('thead th:nth-child(1)');
    expect(lineHeaderTh?.getAttribute('aria-sort')).toBe('ascending');
    expect(nameHeaderTh?.getAttribute('aria-sort')).toBe('none');
  });

  // Behavior per 03-03-PLAN.md Task 2 <acceptance_criteria> (SCORE-06/07, D-09/D-10).
  describe('finalize (Abschließen)', () => {
    async function setupOneShooterOneArrow() {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 1,
        passesPerRound: 1,
        numberOfRounds: 1,
        distance: '18m',
      });
      await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });
    }

    it('disables Turnier abschließen until every cell is filled, then enables it', async () => {
      await setupOneShooterOneArrow();

      const { container } = render(ScoreEntry);
      await screen.findByText('Anna');

      const finalizeButton = screen.getByRole('button', {
        name: strings.scoring.finalizeButton,
      }) as HTMLButtonElement;
      expect(finalizeButton.disabled).toBe(true);
      screen.getByText(strings.scoring.completionHelper);

      const arrowButtons = container.querySelectorAll('tbody button');
      await fireEvent.click(arrowButtons[0]);
      const eightButton = await screen.findByRole('button', { name: '8 Punkte' });
      await fireEvent.click(eightButton);

      await waitFor(() => {
        expect(finalizeButton.disabled).toBe(false);
      });
      expect(screen.queryByText(strings.scoring.completionHelper)).toBeNull();
    });

    it('confirming the finalize dialog locks every record and disables all cells', async () => {
      await setupOneShooterOneArrow();

      const { container } = render(ScoreEntry);
      await screen.findByText('Anna');

      const arrowButtons = container.querySelectorAll('tbody button');
      await fireEvent.click(arrowButtons[0]);
      const eightButton = await screen.findByRole('button', { name: '8 Punkte' });
      await fireEvent.click(eightButton);

      const finalizeButton = (await screen.findByRole('button', {
        name: strings.scoring.finalizeButton,
      })) as HTMLButtonElement;
      await waitFor(() => expect(finalizeButton.disabled).toBe(false));
      await fireEvent.click(finalizeButton);

      await screen.findByText(strings.scoring.finalizeModalTitle);

      const confirmButton = screen.getByRole('button', {
        name: strings.scoring.finalizeConfirmYes,
      });
      await fireEvent.click(confirmButton);

      await waitFor(async () => {
        const records = await db.scores.toArray();
        expect(records.length).toBeGreaterThan(0);
        expect(records.every((r) => r.finalized)).toBe(true);
      });

      await screen.findByText(strings.scoring.finalizedMessage);
      const lockedArrowButtons = container.querySelectorAll('tbody button');
      lockedArrowButtons.forEach((btn) => expect((btn as HTMLButtonElement).disabled).toBe(true));
      expect(screen.queryByRole('button', { name: strings.scoring.finalizeButton })).toBeNull();
    });

    it('canceling the finalize dialog leaves records unfinalized and cells tappable', async () => {
      await setupOneShooterOneArrow();

      const { container } = render(ScoreEntry);
      await screen.findByText('Anna');

      const arrowButtons = container.querySelectorAll('tbody button');
      await fireEvent.click(arrowButtons[0]);
      const eightButton = await screen.findByRole('button', { name: '8 Punkte' });
      await fireEvent.click(eightButton);

      const finalizeButton = (await screen.findByRole('button', {
        name: strings.scoring.finalizeButton,
      })) as HTMLButtonElement;
      await waitFor(() => expect(finalizeButton.disabled).toBe(false));
      await fireEvent.click(finalizeButton);

      await screen.findByText(strings.scoring.finalizeModalTitle);
      const cancelButton = screen.getByRole('button', {
        name: strings.scoring.finalizeConfirmCancel,
      });
      await fireEvent.click(cancelButton);

      expect(screen.queryByText(strings.scoring.finalizeModalTitle)).toBeNull();
      const records = await db.scores.toArray();
      expect(records.every((r) => !r.finalized)).toBe(true);

      const stillTappableArrowButtons = container.querySelectorAll('tbody button');
      stillTappableArrowButtons.forEach((btn) =>
        expect((btn as HTMLButtonElement).disabled).toBe(false)
      );
    });

    it('disables Turnier abschließen and shows noShootersHelper when zero shooters are registered', async () => {
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 1,
        passesPerRound: 1,
        numberOfRounds: 1,
        distance: '18m',
      });

      render(ScoreEntry);

      const finalizeButton = await screen.findByRole('button', {
        name: strings.scoring.finalizeButton,
      });
      expect((finalizeButton as HTMLButtonElement).disabled).toBe(true);
      screen.getByText(strings.scoring.noShootersHelper);
      expect(screen.queryByText(strings.scoring.completionHelper)).toBeNull();
    });
  });

  // Post-ship feedback (2026-07-17 quick task): unconditional linear prev/next
  // navigation across the whole round/passe sequence, wrapping at round boundaries.
  describe('prev/next navigation buttons', () => {
    async function seedTwoRoundTournament() {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 1,
        passesPerRound: 2,
        numberOfRounds: 2,
        distance: '18m',
      });
      await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });
    }

    it('disables the previous button on round 1/passe 1 and the next button on the last passe of the last round', async () => {
      await seedTwoRoundTournament();
      render(ScoreEntry);
      await screen.findByText('Anna');

      expect(
        (screen.getByRole('button', { name: strings.scoring.previousButtonAria }) as HTMLButtonElement)
          .disabled
      ).toBe(true);

      await fireEvent.change(screen.getByLabelText(strings.scoring.roundLabel), { target: { value: '1' } });
      await fireEvent.change(screen.getByLabelText(strings.scoring.passeLabel), { target: { value: '1' } });

      expect(
        (screen.getByRole('button', { name: strings.scoring.nextButtonAria }) as HTMLButtonElement).disabled
      ).toBe(true);
    });

    it('next wraps from the last passe of a round into passe 1 of the next round', async () => {
      await seedTwoRoundTournament();
      render(ScoreEntry);
      await screen.findByText('Anna');

      await fireEvent.change(screen.getByLabelText(strings.scoring.passeLabel), { target: { value: '1' } });
      await fireEvent.click(screen.getByRole('button', { name: strings.scoring.nextButtonAria }));

      expect((screen.getByLabelText(strings.scoring.roundLabel) as HTMLSelectElement).value).toBe('1');
      expect((screen.getByLabelText(strings.scoring.passeLabel) as HTMLSelectElement).value).toBe('0');
    });

    it('previous wraps backward from passe 1 of a round into the last passe of the previous round', async () => {
      await seedTwoRoundTournament();
      render(ScoreEntry);
      await screen.findByText('Anna');

      await fireEvent.change(screen.getByLabelText(strings.scoring.roundLabel), { target: { value: '1' } });
      await fireEvent.click(screen.getByRole('button', { name: strings.scoring.previousButtonAria }));

      expect((screen.getByLabelText(strings.scoring.roundLabel) as HTMLSelectElement).value).toBe('0');
      expect((screen.getByLabelText(strings.scoring.passeLabel) as HTMLSelectElement).value).toBe('1');
    });
  });

  // Single-archer scorecard layouts for 3D-/Feldturniere (entryMode byArcherLine /
  // byArcherName): one archer at a time, every Runde/Passe as a row.
  describe('single-archer scorecard entry modes', () => {
    async function seedThreeArcherCourse(entryMode: 'byArcherLine' | 'byArcherName') {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 2,
        passesPerRound: 3,
        numberOfRounds: 1,
        distance: '3D',
        entryMode,
      });
      await db.shooters.add({ name: 'Cara', classId, lineAssignment: 1 });
      await db.shooters.add({ name: 'Bea', classId, lineAssignment: 2 });
      await db.shooters.add({ name: 'Ada', classId, lineAssignment: 3 });
      return classId;
    }

    it('shows an archer picker ordered by Schießplatz and a row per target', async () => {
      await seedThreeArcherCourse('byArcherLine');
      const { container } = render(ScoreEntry);

      const select = (await screen.findByLabelText(strings.scoring.archerLabel)) as HTMLSelectElement;
      const optionLabels = Array.from(select.options).map((o) => o.textContent?.trim());
      expect(optionLabels).toEqual(['1 — Cara', '2 — Bea', '3 — Ada']);

      // 1 round × 3 passes = 3 target rows, single-digit labels (no "r.p" form).
      const rowLabels = Array.from(container.querySelectorAll('tbody tr td:first-child')).map((c) =>
        c.textContent?.trim()
      );
      expect(rowLabels).toEqual(['1', '2', '3']);
    });

    it('orders the archer picker alphabetically by name in byArcherName mode', async () => {
      await seedThreeArcherCourse('byArcherName');
      render(ScoreEntry);

      const select = (await screen.findByLabelText(strings.scoring.archerLabel)) as HTMLSelectElement;
      expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual([
        'Ada',
        'Bea',
        'Cara',
      ]);
    });

    it('writes a score with the tapped row/target coordinates for the selected archer', async () => {
      await seedThreeArcherCourse('byArcherLine');
      const { container } = render(ScoreEntry);
      await screen.findByLabelText(strings.scoring.archerLabel);

      // Second target row (passeIndex 1), second arrow (arrowIndex 1).
      const secondRow = container.querySelectorAll('tbody tr')[1];
      const arrowButtons = secondRow.querySelectorAll('td button');
      await fireEvent.click(arrowButtons[1]);

      await fireEvent.click(await screen.findByRole('button', { name: '7 Punkte' }));

      await waitFor(async () => {
        expect(await db.scores.count()).toBe(1);
      });
      const cara = (await db.shooters.toArray()).find((s) => s.name === 'Cara');
      const [record] = await db.scores.toArray();
      expect(record).toMatchObject({
        shooterId: cara!.id,
        roundIndex: 0,
        passeIndex: 1,
        arrowIndex: 1,
        value: '7',
      });
    });

    it('steps to the next archer with the > button', async () => {
      await seedThreeArcherCourse('byArcherLine');
      render(ScoreEntry);

      const select = (await screen.findByLabelText(strings.scoring.archerLabel)) as HTMLSelectElement;
      const all = await db.shooters.toArray();
      const caraId = String(all.find((s) => s.name === 'Cara')!.id);
      const beaId = String(all.find((s) => s.name === 'Bea')!.id);
      expect(select.value).toBe(caraId);

      await fireEvent.click(screen.getByRole('button', { name: strings.scoring.nextArcherAria }));
      expect(select.value).toBe(beaId);
    });

    it('labels target rows as "round.passe" when there is more than one round', async () => {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 1,
        passesPerRound: 2,
        numberOfRounds: 2,
        distance: '3D',
        entryMode: 'byArcherLine',
      });
      await db.shooters.add({ name: 'Ada', classId, lineAssignment: 1 });

      const { container } = render(ScoreEntry);
      await screen.findByLabelText(strings.scoring.archerLabel);

      const rowLabels = Array.from(container.querySelectorAll('tbody tr td:first-child')).map((c) =>
        c.textContent?.trim()
      );
      expect(rowLabels).toEqual(['1.1', '1.2', '2.1', '2.2']);
    });

    it('falls back to the classic per-passe table when entryMode is byRound', async () => {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 2,
        passesPerRound: 3,
        numberOfRounds: 1,
        distance: '18m',
        entryMode: 'byRound',
      });
      await db.shooters.add({ name: 'Ada', classId, lineAssignment: 1 });

      render(ScoreEntry);
      await screen.findByText('Ada');

      expect(screen.getByLabelText(strings.scoring.roundLabel)).toBeTruthy();
      expect(screen.queryByLabelText(strings.scoring.archerLabel)).toBeNull();
    });
  });

  // v2 (3D milestone) slice 4 — 3D scoring mode: per-archer card of Ziel/Wertung/
  // Punkte rows, tapped via the outcome-zone picker.
  describe('3D scoring mode', () => {
    async function seed3dCourse(rulesetId: 'dfbv-3arrow' | 'dfbv-hunter' = 'dfbv-3arrow') {
      const classId = await db.classes.add({ name: 'Blank' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 1,
        passesPerRound: 3,
        numberOfRounds: 1,
        scoringMode: '3d',
        roundRulesets: [defaultRoundRuleset(rulesetId)],
        entryMode: 'byArcherLine',
      });
      await db.shooters.add({ name: 'Ada', classId, lineAssignment: 1 });
      await db.shooters.add({ name: 'Bea', classId, lineAssignment: 2 });
      return classId;
    }

    it('shows the per-archer card with Ziel/Wertung/Punkte and no ring picker', async () => {
      await seed3dCourse();
      const { container } = render(ScoreEntry);
      await screen.findByLabelText(strings.scoring.archerLabel);

      expect(screen.queryByLabelText(strings.scoring.roundLabel)).toBeNull();
      expect(screen.getByText(strings.scoring.columnOutcome)).toBeTruthy();
      expect(screen.getByText(strings.scoring.columnPoints)).toBeTruthy();

      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(3); // 1 leg × 3 stations
      // every station starts unscored
      expect(screen.getAllByText(strings.scoring.outcomeNotScored)).toHaveLength(3);
    });

    it('records an outcome token and shows its label + points', async () => {
      await seed3dCourse();
      const { container } = render(ScoreEntry);
      await screen.findByLabelText(strings.scoring.archerLabel);

      // tap station 1's Wertung cell
      const firstCellButton = container.querySelectorAll('tbody tr')[0].querySelectorAll('button')[0];
      await fireEvent.click(firstCellButton);

      // pick "Kill (1.)" = 20 points
      await fireEvent.click(
        await screen.findByRole('button', {
          name: strings.scoring.outcomeAria(strings.scoring.outcomeZoneOrdinal('Kill', 1), 20),
        })
      );

      const ada = (await db.shooters.toArray()).find((s) => s.name === 'Ada');
      await waitFor(async () => {
        expect(await db.scores.count()).toBe(1);
      });
      expect((await db.scores.toArray())[0]).toMatchObject({
        shooterId: ada!.id,
        roundIndex: 0,
        passeIndex: 0,
        arrowIndex: 0,
        value: 'K1',
      });

      await screen.findByText(strings.scoring.outcomeZoneOrdinal('Kill', 1));
      // total row reflects 20
      expect(screen.getByText(strings.scoring.cardTotalLabel).closest('tr')?.textContent).toContain(
        '20'
      );
    });

    it('auto-advances the picker to the next unscored station, then closes', async () => {
      await seed3dCourse();
      const { container } = render(ScoreEntry);
      await screen.findByLabelText(strings.scoring.archerLabel);

      await fireEvent.click(
        container.querySelectorAll('tbody tr')[0].querySelectorAll('button')[0]
      );

      const missName = new RegExp(strings.scoring.outcomeMiss);
      // station 1 -> picker stays open on station 2
      await fireEvent.click(await screen.findByRole('button', { name: missName }));
      expect(
        screen.getByText(strings.scoring.outcomePickerTitle('Ada', '2'))
      ).toBeTruthy();
      // station 2 -> station 3
      await fireEvent.click(await screen.findByRole('button', { name: missName }));
      expect(
        screen.getByText(strings.scoring.outcomePickerTitle('Ada', '3'))
      ).toBeTruthy();
      // station 3 -> card complete, picker closes
      await fireEvent.click(await screen.findByRole('button', { name: missName }));
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
      });
      await waitFor(async () => {
        const ada = (await db.shooters.toArray()).find((s) => s.name === 'Ada');
        const adaScores = (await db.scores.toArray()).filter((s) => s.shooterId === ada!.id);
        expect(adaScores).toHaveLength(3);
        expect(adaScores.every((s) => s.value === 'M')).toBe(true);
      });
    });

    it('enables Abschließen only once every archer has a full card', async () => {
      await seed3dCourse();
      render(ScoreEntry);
      await screen.findByLabelText(strings.scoring.archerLabel);

      const finalizeBtn = () =>
        screen.getByRole('button', { name: strings.scoring.finalizeButton }) as HTMLButtonElement;
      expect(finalizeBtn().disabled).toBe(true);

      const all = await db.shooters.toArray();
      for (const s of all) {
        for (let p = 0; p < 3; p++) {
          await db.scores.put({
            shooterId: s.id!,
            roundIndex: 0,
            passeIndex: p,
            arrowIndex: 0,
            value: 'V1',
            finalized: false,
          });
        }
      }

      await waitFor(() => {
        expect(finalizeBtn().disabled).toBe(false);
      });
    });

    it('omits the arrow ordinal from the outcome label for a single-arrow hunter leg', async () => {
      await seed3dCourse('dfbv-hunter');
      const { container } = render(ScoreEntry);
      await screen.findByLabelText(strings.scoring.archerLabel);

      await fireEvent.click(
        container.querySelectorAll('tbody tr')[0].querySelectorAll('button')[0]
      );
      await fireEvent.click(
        await screen.findByRole('button', {
          name: strings.scoring.outcomeAria('Wound', 16),
        })
      );

      // label is just "Wound" — no "(1.)"
      await screen.findByText('Wound');
      expect(screen.queryByText(strings.scoring.outcomeZoneOrdinal('Wound', 1))).toBeNull();
    });
  });
});
