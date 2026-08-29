import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import SetupRounds from './SetupRounds.svelte';
import { db } from '../db/schema';
import { resetDb } from '../db/testHelpers';
import { strings } from '../i18n/strings.de';

describe('SetupRounds', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('shows the DFBV summary and persists the matching preset immediately on selection', async () => {
    render(SetupRounds);

    // WA 10 Passen à 3 Pfeile is the default-selected preset on mount, so selecting it
    // again would not fire a native radio "change" event (checked state wouldn't
    // actually change). Select DFBV instead to exercise a genuine onchange-driven
    // auto-save.
    const dfbvRadio = screen.getByLabelText(strings.setup.presetDfbv6x5);
    await fireEvent.click(dfbvRadio);

    await screen.findByText('1 Passen, 5 Pfeile, 5 Ringe');

    await waitFor(async () => {
      const config = await db.rounds.get(1);
      expect(config).toEqual({
        id: 1,
        arrowsPerPasse: 5,
        passesPerRound: 1,
        numberOfRounds: 6,
        rings: 5,
        presetId: 'dfbv-6x5',
        entryMode: 'byRound',
      });
    });
  });

  it('persists a custom configuration with presetId undefined', async () => {
    render(SetupRounds);

    const customModeRadio = screen.getByLabelText(strings.setup.customLabel);
    await fireEvent.click(customModeRadio);

    const passesInput = screen.getByLabelText(strings.setup.passesPerRoundLabel) as HTMLInputElement;
    const arrowsInput = screen.getByLabelText(strings.setup.arrowsPerPassLabel) as HTMLInputElement;
    const roundsInput = screen.getByLabelText(strings.setup.roundsCountLabel) as HTMLInputElement;
    const rings5Radio = screen.getByLabelText(strings.setup.rings5Label) as HTMLInputElement;

    await fireEvent.input(passesInput, { target: { value: '8' } });
    await fireEvent.input(arrowsInput, { target: { value: '5' } });
    await fireEvent.input(roundsInput, { target: { value: '2' } });
    await fireEvent.click(rings5Radio);

    await screen.findByText('8 Passen, 5 Pfeile, 5 Ringe');

    await waitFor(async () => {
      const config = await db.rounds.get(1);
      expect(config).toEqual({
        id: 1,
        arrowsPerPasse: 5,
        passesPerRound: 8,
        numberOfRounds: 2,
        rings: 5,
        presetId: undefined,
        entryMode: 'byRound',
      });
    });
  });

  // CR-01 (04-REVIEW.md): App.svelte destroys/recreates views on nav, so this component
  // remounts on every visit to Einrichtung. It must rehydrate from the persisted
  // db.rounds record rather than resetting to hardcoded defaults — otherwise a
  // subsequent Speichern click silently overwrites a real saved configuration.
  it('rehydrates form fields from an existing db.rounds record with rings: 5 set', async () => {
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 6,
      passesPerRound: 4,
      numberOfRounds: 3,
      rings: 5,
      presetId: undefined,
    });

    render(SetupRounds);

    await screen.findByText('4 Passen, 6 Pfeile, 5 Ringe');
    expect((screen.getByLabelText(strings.setup.customLabel) as HTMLInputElement).checked).toBe(
      true
    );
    expect((screen.getByLabelText(strings.setup.rings5Label) as HTMLInputElement).checked).toBe(
      true
    );

    await waitFor(async () => {
      const config = await db.rounds.get(1);
      expect(config).toEqual({
        id: 1,
        arrowsPerPasse: 6,
        passesPerRound: 4,
        numberOfRounds: 3,
        rings: 5,
        presetId: undefined,
      });
    });
  });

  it('defaults to 10 Ringe when rehydrating a custom db.rounds record with no rings field', async () => {
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 6,
      passesPerRound: 4,
      numberOfRounds: 3,
      presetId: undefined,
    });

    render(SetupRounds);

    await screen.findByText('4 Passen, 6 Pfeile, 10 Ringe');
    expect((screen.getByLabelText(strings.setup.customLabel) as HTMLInputElement).checked).toBe(
      true
    );
    expect((screen.getByLabelText(strings.setup.rings10Label) as HTMLInputElement).checked).toBe(
      true
    );
  });

  it('rehydrates a preset-based db.rounds record by selecting the matching preset radio', async () => {
    // resolvedConfig in preset mode looks up the summary text from WA_PRESETS by
    // presetId (not from the stored numberOfRounds/passesPerRound/arrowsPerPasse
    // fields), so this must match the real WA 70 preset shape (6 Passen, 6 Pfeile).
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 6,
      passesPerRound: 6,
      numberOfRounds: 1,
      rings: 10,
      presetId: 'wa-70',
    });

    render(SetupRounds);

    await screen.findByText('6 Passen, 6 Pfeile, 10 Ringe');
    expect((screen.getByLabelText(strings.setup.presetWa70) as HTMLInputElement).checked).toBe(
      true
    );
  });

  // Behavior per 04-03-PLAN.md Task 3 <action>/<acceptance_criteria> block (RES-06):
  // once isFinalized is passed as true, every radio, every custom input, and the
  // Speichern button must be disabled.
  it('disables every radio, custom input, and the save button when isFinalized is true', async () => {
    render(SetupRounds, { isFinalized: true });

    expect((screen.getByLabelText(strings.setup.waPresetsLabel) as HTMLInputElement).disabled).toBe(
      true
    );
    expect((screen.getByLabelText(strings.setup.customLabel) as HTMLInputElement).disabled).toBe(
      true
    );
    expect(
      (screen.getByLabelText(strings.setup.presetWa10x3) as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      (screen.getByLabelText(strings.setup.presetDfbv6x5) as HTMLInputElement).disabled
    ).toBe(true);
    expect((screen.getByLabelText(strings.setup.presetWa70) as HTMLInputElement).disabled).toBe(
      true
    );

    await fireEvent.click(screen.getByLabelText(strings.setup.customLabel));
    // Note: the custom-mode radio itself is disabled above, but the underlying
    // selectedMode state is still toggleable via fireEvent in jsdom regardless of the
    // disabled attribute (jsdom does not enforce disabled semantics on fireEvent).
    // The assertion of interest here is that once rendered, the custom inputs also
    // carry the disabled attribute.

    expect(
      (screen.getByLabelText(strings.setup.roundsCountLabel) as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      (screen.getByLabelText(strings.setup.passesPerRoundLabel) as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      (screen.getByLabelText(strings.setup.arrowsPerPassLabel) as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      (screen.getByLabelText(strings.setup.rings10Label) as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      (screen.getByLabelText(strings.setup.rings5Label) as HTMLInputElement).disabled
    ).toBe(true);
  });

  it('persists the chosen entry mode onto the rounds singleton', async () => {
    render(SetupRounds);

    await fireEvent.click(screen.getByLabelText(strings.setup.entryModeByLine));

    await waitFor(async () => {
      expect((await db.rounds.get(1))?.entryMode).toBe('byArcherLine');
    });

    await fireEvent.click(screen.getByLabelText(strings.setup.entryModeByRound));

    await waitFor(async () => {
      expect((await db.rounds.get(1))?.entryMode).toBe('byRound');
    });
  });

  it('rehydrates the entry-mode radio from an existing rounds record', async () => {
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 3,
      passesPerRound: 10,
      numberOfRounds: 1,
      rings: 10,
      presetId: 'wa-10x3',
      entryMode: 'byArcherName',
    });

    render(SetupRounds);

    await waitFor(() => {
      expect(
        (screen.getByLabelText(strings.setup.entryModeByName) as HTMLInputElement).checked
      ).toBe(true);
    });
  });

  it('keeps the entry mode available even when the tournament is finalized', async () => {
    render(SetupRounds, { isFinalized: true });

    const byLine = screen.getByLabelText(strings.setup.entryModeByLine) as HTMLInputElement;
    expect(byLine.disabled).toBe(false);

    await fireEvent.click(byLine);
    await waitFor(async () => {
      expect((await db.rounds.get(1))?.entryMode).toBe('byArcherLine');
    });
  });

  // v2 (3D milestone) slice 3 — the scoring-mode toggle and the 3D parcours panel.
  describe('3D scoring mode', () => {
    it('switching to 3D persists a 3d config with one default 3-Pfeil ruleset per leg', async () => {
      render(SetupRounds);

      await fireEvent.click(screen.getByLabelText(strings.setup.scoringMode3d));

      await waitFor(async () => {
        const cfg = await db.rounds.get(1);
        expect(cfg?.scoringMode).toBe('3d');
        expect(cfg?.numberOfRounds).toBe(1);
        expect(cfg?.passesPerRound).toBe(20);
        expect(cfg?.arrowsPerPasse).toBe(1);
        expect(cfg?.roundRulesets).toHaveLength(1);
        expect(cfg?.roundRulesets?.[0].templateId).toBe('dfbv-3arrow');
        expect(cfg?.roundRulesets?.[0].points.K1).toBe(20);
      });
    });

    it('auto-switches entry mode away from byRound when 3D is selected', async () => {
      render(SetupRounds);

      await fireEvent.click(screen.getByLabelText(strings.setup.scoringMode3d));

      await waitFor(async () => {
        expect((await db.rounds.get(1))?.entryMode).toBe('byArcherLine');
      });
      expect(
        (screen.getByLabelText(strings.setup.entryModeByRound) as HTMLInputElement).disabled
      ).toBe(true);
    });

    it('keeps one ruleset per leg as the leg count changes', async () => {
      render(SetupRounds);
      await fireEvent.click(screen.getByLabelText(strings.setup.scoringMode3d));

      const legs = screen.getByLabelText(strings.setup.threeDLegsLabel);
      await fireEvent.input(legs, { target: { value: '3' } });
      await fireEvent.change(legs, { target: { value: '3' } });

      await waitFor(async () => {
        const cfg = await db.rounds.get(1);
        expect(cfg?.numberOfRounds).toBe(3);
        expect(cfg?.roundRulesets).toHaveLength(3);
      });

      await fireEvent.input(legs, { target: { value: '2' } });
      await fireEvent.change(legs, { target: { value: '2' } });

      await waitFor(async () => {
        expect((await db.rounds.get(1))?.roundRulesets).toHaveLength(2);
      });
    });

    it('persists a per-leg template choice', async () => {
      render(SetupRounds);
      await fireEvent.click(screen.getByLabelText(strings.setup.scoringMode3d));
      await screen.findByLabelText(strings.setup.threeDTemplateLabel);

      await fireEvent.change(screen.getByLabelText(strings.setup.threeDTemplateLabel), {
        target: { value: 'dfbv-hunter' },
      });

      await waitFor(async () => {
        const cfg = await db.rounds.get(1);
        expect(cfg?.roundRulesets?.[0].templateId).toBe('dfbv-hunter');
        expect(cfg?.roundRulesets?.[0].points.K1).toBe(20);
        expect(cfg?.roundRulesets?.[0].points.K2).toBeUndefined();
      });
    });

    it('persists an edited point value and resets it on demand', async () => {
      render(SetupRounds);
      await fireEvent.click(screen.getByLabelText(strings.setup.scoringMode3d));

      const killFirst = await screen.findByLabelText('Kill 1. Pfeil');
      await fireEvent.change(killFirst, { target: { value: '25' } });

      await waitFor(async () => {
        expect((await db.rounds.get(1))?.roundRulesets?.[0].points.K1).toBe(25);
      });
      // badge flips to "(angepasst)"
      await screen.findByText(strings.setup.threeDPointsCustom);

      await fireEvent.click(screen.getByText(strings.setup.threeDPointsReset));

      await waitFor(async () => {
        expect((await db.rounds.get(1))?.roundRulesets?.[0].points.K1).toBe(20);
      });
    });

    it('switching back to a ring mode drops the 3D ruleset fields', async () => {
      render(SetupRounds);
      await fireEvent.click(screen.getByLabelText(strings.setup.scoringMode3d));
      await waitFor(async () => {
        expect((await db.rounds.get(1))?.scoringMode).toBe('3d');
      });

      await fireEvent.click(screen.getByLabelText(strings.setup.scoringModeRings));

      await waitFor(async () => {
        const cfg = await db.rounds.get(1);
        expect(cfg?.scoringMode).toBeUndefined();
        expect(cfg?.roundRulesets).toBeUndefined();
      });
    });

    it('rehydrates the 3D panel from an existing 3d rounds record', async () => {
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 1,
        passesPerRound: 28,
        numberOfRounds: 2,
        scoringMode: '3d',
        roundRulesets: [
          { templateId: 'dfbv-3arrow', points: { K1: 21 } },
          { templateId: 'dfbv-hunter', points: {} },
        ],
        entryMode: 'byArcherLine',
      });

      render(SetupRounds);

      await waitFor(() => {
        expect(
          (screen.getByLabelText(strings.setup.scoringMode3d) as HTMLInputElement).checked
        ).toBe(true);
      });
      expect(
        (screen.getByLabelText(strings.setup.threeDStationsLabel) as HTMLInputElement).value
      ).toBe('28');
      expect((screen.getByLabelText(strings.setup.threeDLegsLabel) as HTMLInputElement).value).toBe(
        '2'
      );
      // Two legs ⇒ two grids; leg 1 carries the K1:21 override.
      const killFirstInputs = (await screen.findAllByLabelText(
        'Kill 1. Pfeil'
      )) as HTMLInputElement[];
      expect(killFirstInputs).toHaveLength(2);
      expect(killFirstInputs[0].value).toBe('21');
    });
  });
});
