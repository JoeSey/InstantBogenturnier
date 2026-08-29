import { test, expect, type Page } from '@playwright/test';

// Runs against the production `vite preview` build (playwright.config.ts webServer) —
// mirrors e2e/scoring.spec.ts's setup-flow-helper convention and
// e2e/scoresheetExport.spec.ts's offline download round-trip. Each test gets a fresh
// browser context, so IndexedDB storage starts empty per test.
//
// v2 (3D milestone): the whole 3D flow end to end — Einrichtung "Wertung: 3D"
// config, per-archer outcome-zone score entry, finalize, Kill/Vital/Wound results,
// and both PDFs offline (D-06 / zero network dependency).

// Point values come from the DFBV 3-Pfeil-Runde default table (SpO §6.7.8):
// Kill/Vital/Wound on the 1st arrow = 20 / 18 / 16.
const KILL_1 = 'Kill (1.), 20 Punkte';
const VITAL_1 = 'Vital (1.), 18 Punkte';

async function configure3dTournament(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  // The first-launch "About" dialog is a full-screen overlay that blocks the setup
  // form until dismissed — seed its "seen" flag so it never opens.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('instantbogenturnier:about-seen', '1');
    } catch {
      /* private-mode / storage disabled — dialog will just be dismissed manually */
    }
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Einrichtung' })).toBeVisible();

  // Class: one field (age group) is enough per SETUP-01.
  await page.getByLabel('Alter').selectOption('U14');
  await page.getByRole('button', { name: 'Klasse hinzufügen' }).click();

  // Shooting-line count ("Scheiben").
  await page.getByLabel('Scheiben').fill('2');
  await page.getByLabel('Scheiben').blur();

  // Switch scoring mode to 3D and set a short 3-station course. The 3D panel
  // auto-saves on each field's change/blur (no save button).
  await page.getByText('3D / Feldparcours').click();
  await page.getByLabel('Stationen pro Durchgang').fill('3');
  await page.getByLabel('Stationen pro Durchgang').blur();
  await expect(page.getByLabel('Wertungsart')).toBeVisible();
}

async function registerTwoArchers(page: Page) {
  await page.getByTestId('sidebar-nav').getByText('Schützen').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Schützen' })).toBeVisible();

  for (const [name, line] of [
    ['Anna', '1'],
    ['Bea', '2'],
  ] as const) {
    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Klasse (erforderlich)').selectOption({ index: 1 });
    await page.getByLabel('Schießplatz (optional)').fill(line);
    await page.getByRole('button', { name: 'Schütze hinzufügen' }).click();
    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
  }
}

// Fill one archer's whole 3-station card. The first tap opens the outcome grid;
// after each pick the grid auto-advances to the next unscored station and closes
// once the card is complete.
async function fillCard(page: Page, picks: string[]) {
  await page.locator('tbody tr').first().getByRole('button').click();
  for (const pick of picks) {
    await page.getByRole('button', { name: pick }).click();
  }
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test.describe('3D tournament end to end (v2)', () => {
  test('configure → per-archer outcome entry → finalize → Kill/Vital/Wound results', async ({
    page,
  }) => {
    await configure3dTournament(page);
    await registerTwoArchers(page);

    await page.getByTestId('sidebar-nav').getByText('Erfassung').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Erfassung' })).toBeVisible();
    // 3D per-archer card, not the ring table.
    await expect(page.getByRole('columnheader', { name: 'Wertung' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Punkte' })).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(3);

    // Anna: Kill, Kill, Vital  = 20 + 20 + 18 = 58
    await fillCard(page, [KILL_1, KILL_1, VITAL_1]);
    await expect(
      page.getByRole('row', { name: /Gesamt/ }).getByText('58', { exact: true })
    ).toBeVisible();

    // Bea: Vital, Vital, Kill  = 18 + 18 + 20 = 56
    await page.getByRole('button', { name: 'Nächster Schütze' }).click();
    await fillCard(page, [VITAL_1, VITAL_1, KILL_1]);

    const finalize = page.getByRole('button', { name: 'Turnier abschließen' });
    await expect(finalize).toBeEnabled({ timeout: 10000 });
    await finalize.click();
    await page.getByRole('button', { name: 'Ja, abschließen' }).click();
    await expect(
      page.getByText('Erfassung abgeschlossen. Die Ergebnisse sind jetzt gesperrt.')
    ).toBeVisible();

    await page.getByTestId('sidebar-nav').getByText('Ergebnisse').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Ergebnisse' })).toBeVisible();

    // Tie-break count columns replace the ring X/10/9 column.
    for (const label of ['Kill', 'Vital', 'Wound']) {
      await expect(page.getByRole('columnheader', { name: label }).first()).toBeVisible();
    }
    // Anna 58 ahead of Bea 56.
    const annaRow = page.getByRole('row', { name: /Anna/ }).first();
    await expect(annaRow.getByText('58', { exact: true })).toBeVisible();
    await expect(annaRow.getByText('1', { exact: true }).first()).toBeVisible(); // rank 1
  });

  test('blank 3D scoresheet downloads with zero network connectivity', async ({ page, context }) => {
    await configure3dTournament(page);

    await context.setOffline(true);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Schießformular (PDF) drucken' }).click();
    const download = await downloadPromise;
    // downloadBlob() opens the blob via window.open() in a real browser, which yields a
    // UUID filename (no `download` attr) — the download firing at all, offline, is the
    // assertion here.
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    await context.setOffline(false);
  });

  test('3D results PDF downloads with zero network connectivity', async ({ page, context }) => {
    await configure3dTournament(page);
    await registerTwoArchers(page);

    await page.getByTestId('sidebar-nav').getByText('Erfassung').click();
    await fillCard(page, [KILL_1, KILL_1, VITAL_1]);
    await page.getByRole('button', { name: 'Nächster Schütze' }).click();
    await fillCard(page, [VITAL_1, VITAL_1, KILL_1]);

    await page.getByTestId('sidebar-nav').getByText('Ergebnisse').click();
    await expect(page.getByRole('columnheader', { name: 'Kill' }).first()).toBeVisible();

    await context.setOffline(true);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PDF exportieren' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    await context.setOffline(false);
  });
});
