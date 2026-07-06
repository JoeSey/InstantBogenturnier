import { test, expect, type Page } from '@playwright/test';

// Runs against the production `vite preview` build (playwright.config.ts webServer) —
// mirrors e2e/pdfExport.spec.ts's download-round-trip pattern. Each test gets a fresh
// browser context, so IndexedDB storage starts empty per test — no shared-state reset
// step needed.
//
// D-02/D-04: drives setup -> registration -> scoring -> Ergebnisse -> per-row
// certificate action and proves a real single-PDF download fires with the correct
// filename for the clicked shooter only.

async function setUpTournamentWithResults(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  // 1. Add a class.
  const classSection = page.locator('section', {
    has: page.getByRole('heading', { name: 'Klasse hinzufügen' }),
  });
  await classSection.getByLabel('Alter').selectOption('U14');
  await classSection.getByRole('button', { name: 'Klasse hinzufügen' }).click();

  // 2. Set 1 shooting line.
  const linesSection = page.locator('section', {
    has: page.getByRole('heading', { name: 'Schießplätze' }),
  });
  await linesSection.getByLabel('Schießplätze').fill('1');
  await linesSection.getByLabel('Schießplätze').blur();

  // 3. Custom round config: 1 round / 1 passe / 1 arrow — complete scores are trivial.
  const roundsSection = page.locator('section', {
    has: page.getByRole('heading', { name: 'Runden und Passen' }),
  });
  await roundsSection.getByText('Benutzerdefiniert').click();
  await roundsSection.getByLabel('Runden').fill('1');
  await roundsSection.getByLabel('Passen pro Runde').fill('1');
  await roundsSection.getByLabel('Pfeile pro Passe').fill('1');
  await roundsSection.getByLabel('Pfeile pro Passe').blur();

  // 4. Register 1 shooter with an explicit line (avoids the auto-assign modal).
  await page.getByTestId('sidebar-nav').getByText('Schützen').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Schützen' })).toBeVisible();

  await page.getByLabel('Name').fill('Anna');
  await page.getByLabel('Klasse (erforderlich)').selectOption({ index: 1 });
  await page.getByLabel('Schießplatz (optional)').fill('1');
  await page.getByRole('button', { name: 'Schütze hinzufügen' }).click();
  await expect(page.getByRole('cell', { name: 'Anna' })).toBeVisible();

  // 5. Enter the single arrow's score so the shooter is complete.
  await page.getByTestId('sidebar-nav').getByText('Erfassung').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Erfassung' })).toBeVisible();
  await page.locator('tbody button').first().click();
  await page.getByRole('button', { name: '9 Punkte' }).click();

  // 6. Navigate to Ergebnisse.
  await page.getByTestId('sidebar-nav').getByText('Ergebnisse').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Ergebnisse' })).toBeVisible();
}

test.describe('Per-row certificate export (D-02/D-04)', () => {
  test('clicking the per-row certificate action downloads a correctly-named PDF for that shooter', async ({
    page,
  }) => {
    await setUpTournamentWithResults(page);

    const row = page.locator('tbody tr', { has: page.getByRole('cell', { name: 'Anna' }) });

    const downloadPromise = page.waitForEvent('download');
    await row.getByRole('button', { name: 'Urkunde' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^Urkunde_Anna_\d{4}-\d{2}-\d{2}\.pdf$/);
  });
});
