import { test, expect } from '@playwright/test';

// Runs against the production `vite preview` build (playwright.config.ts webServer) —
// mirrors e2e/presetExportImport.spec.ts's shape. Verifies the full "trainer
// configures PDF header branding" vertical slice (05-01-PLAN.md): title + logo
// upload -> save -> persist across reload -> survive the existing preset
// export/delete/import round trip (PDF-02, PDF-03; CONTEXT.md D-04).

// Minimal valid 1x1 transparent PNG, used as a real (not mocked) image upload so the
// production build's Canvas-based downscaleImageBlob() actually decodes and re-encodes
// it end-to-end.
const ONE_PX_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test.describe('Settings form (title + header logos)', () => {
  test('upload, save, persist across reload, and survive preset export/import', async ({
    page,
  }) => {
    await page.goto('/');

    const settingsSection = page.locator('section', {
      has: page.getByRole('heading', { name: 'Einstellungen (PDF-Export)' }),
    });

    const testTitle = 'E2E Trainingsturnier 6.7.2026';
    await settingsSection.getByLabel('Turnier-Titel (für PDF)').fill(testTitle);
    await settingsSection
      .getByLabel('Logo links (PNG/JPEG, max 200KB)')
      .setInputFiles({
        name: 'logo-left.png',
        mimeType: 'image/png',
        buffer: Buffer.from(ONE_PX_PNG_BASE64, 'base64'),
      });

    // Preview appears once downscaleImageBlob() resolves.
    await expect(settingsSection.locator('img')).toBeVisible();

    await settingsSection.getByRole('button', { name: 'Speichern' }).click();
    // The save writes to IndexedDB asynchronously (fire-and-forget from the click
    // handler) — give it a moment to complete before reloading, or the reload can
    // race ahead of the Dexie write.
    await page.waitForTimeout(300);

    // Reload the page — the persisted title and logo preview must reappear.
    await page.reload();
    const settingsSectionAfterReload = page.locator('section', {
      has: page.getByRole('heading', { name: 'Einstellungen (PDF-Export)' }),
    });
    await expect(settingsSectionAfterReload.getByLabel('Turnier-Titel (für PDF)')).toHaveValue(
      testTitle
    );
    await expect(settingsSectionAfterReload.locator('img')).toBeVisible();

    // Preset export/import round trip (existing dexie-export-import mechanism) must
    // preserve the settings row unmodified (D-04).
    const presetsSection = page.locator('section', {
      has: page.getByRole('heading', { name: 'Vorlagen' }),
    });
    const presetName = 'E2E Settings Round Trip Vorlage';
    await presetsSection.getByLabel('Vorlagenname').fill(presetName);
    await presetsSection.getByRole('button', { name: 'Speichern' }).click();
    await expect(presetsSection.getByText(presetName)).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await presetsSection.getByRole('button', { name: 'Alle Vorlagen exportieren' }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    await presetsSection.getByRole('button', { name: 'Löschen' }).click();
    await presetsSection.getByRole('button', { name: 'Ja, löschen' }).click();
    await expect(presetsSection.getByText(presetName)).toHaveCount(0);

    await presetsSection
      .getByLabel('Importierte Datei wählen')
      .setInputFiles(downloadPath as string);
    await expect(presetsSection.getByText(/Fortfahren\?$/)).toBeVisible();
    await presetsSection.getByRole('button', { name: 'Ja, ersetzen' }).click();
    await expect(presetsSection.getByText(presetName)).toBeVisible();

    // Settings must still hold the same title and logo after the import round trip.
    await expect(settingsSectionAfterReload.getByLabel('Turnier-Titel (für PDF)')).toHaveValue(
      testTitle
    );
    await expect(settingsSectionAfterReload.locator('img')).toBeVisible();
  });
});
