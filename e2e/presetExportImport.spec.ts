import { test, expect } from '@playwright/test';

// Runs against the production `vite preview` build (playwright.config.ts webServer) —
// download/file-input round trips need the production build's real IndexedDB, not
// jsdom (Pitfall 4). Each test gets a fresh browser context, so IndexedDB storage
// starts empty per test — no shared-state reset step needed.

test.describe('preset export / import round trip (SETUP-05/06, D-15)', () => {
  test('save -> export -> delete -> import -> reappear', async ({ page }) => {
    await page.goto('/');

    // "Speichern" is also used by the Rounds/Passes card — scope to the "Vorlagen"
    // (Presets) card's own <section> so the button/list queries below are unambiguous.
    const presetsSection = page.locator('section', {
      has: page.getByRole('heading', { name: 'Vorlagen' }),
    });

    // Save a preset.
    const presetName = 'E2E Test Vorlage';
    await presetsSection.getByLabel('Vorlagenname').fill(presetName);
    await presetsSection.getByRole('button', { name: 'Speichern' }).click();

    await expect(presetsSection.getByText(presetName)).toBeVisible();

    // Export all presets — triggers a real file download.
    const downloadPromise = page.waitForEvent('download');
    await presetsSection.getByRole('button', { name: 'Alle Vorlagen exportieren' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^presets-.*\.json$/);

    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    // Delete the preset via its confirmation flow.
    await presetsSection.getByRole('button', { name: 'Löschen' }).click();
    await expect(presetsSection.getByText(`Vorlage "${presetName}" löschen?`)).toBeVisible();
    await presetsSection.getByRole('button', { name: 'Ja, löschen' }).click();
    await expect(presetsSection.getByText(presetName)).toHaveCount(0);

    // Import the previously exported file back in.
    await presetsSection.getByLabel('Importierte Datei wählen').setInputFiles(downloadPath as string);
    await expect(presetsSection.getByText(/Fortfahren\?$/)).toBeVisible();
    await presetsSection.getByRole('button', { name: 'Ja, ersetzen' }).click();

    // The preset reappears with the same name.
    await expect(presetsSection.getByText(presetName)).toBeVisible();
  });
});
