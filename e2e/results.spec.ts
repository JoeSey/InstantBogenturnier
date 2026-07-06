import { test, expect, type Page } from '@playwright/test';

// Runs against the production `vite preview` build (playwright.config.ts webServer) —
// mirrors e2e/nav.spec.ts's viewport-assertion shape and e2e/scoring.spec.ts's
// setup-flow-helper convention. Each test gets a fresh browser context, so IndexedDB
// storage starts empty per test — no shared-state reset step needed.
//
// RES-03/RES-04 (D-04/D-05): proves the phone-dropdown-vs-responsive-grid split
// renders correctly at the app's locked breakpoints. Reset-flow tests are out of
// scope here — added in Plan 02.

async function setUpTournamentWithResults(page: Page) {
  // 1440x900: wide enough that nav labels are visible text, matching
  // e2e/scoring.spec.ts's setup-flow convention.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  // 1. Add a class.
  const classSection = page.locator('section', {
    has: page.getByRole('heading', { name: 'Klasse hinzufügen' }),
  });
  await classSection.getByLabel('Alter').selectOption('U14');
  await classSection.getByRole('button', { name: 'Klasse hinzufügen' }).click();

  // 2. Set 2 shooting lines.
  const linesSection = page.locator('section', {
    has: page.getByRole('heading', { name: 'Schießplätze' }),
  });
  await linesSection.getByLabel('Schießplätze').fill('2');
  await linesSection.getByLabel('Schießplätze').blur();

  // 3. Custom round config: 1 round / 1 passe / 1 arrow.
  const roundsSection = page.locator('section', {
    has: page.getByRole('heading', { name: 'Runden und Passen' }),
  });
  // The rounds/passes section auto-saves on each field's change/blur event — there's
  // no explicit save button (see quick task 260706-9iv). Blur the last field to fire
  // its onchange handler before navigating away.
  await roundsSection.getByText('Benutzerdefiniert').click();
  await roundsSection.getByLabel('Runden').fill('1');
  await roundsSection.getByLabel('Passen pro Runde').fill('1');
  await roundsSection.getByLabel('Pfeile pro Passe').fill('1');
  await roundsSection.getByLabel('Pfeile pro Passe').blur();

  // 4. Register 2 shooters with explicit lines (avoids the auto-assign modal).
  await page.getByTestId('sidebar-nav').getByText('Schützen').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Schützen' })).toBeVisible();

  await page.getByLabel('Name').fill('Anna');
  await page.getByLabel('Klasse (erforderlich)').selectOption({ index: 1 });
  await page.getByLabel('Schießplatz (optional)').fill('1');
  await page.getByRole('button', { name: 'Schütze hinzufügen' }).click();
  await expect(page.getByRole('cell', { name: 'Anna' })).toBeVisible();

  await page.getByLabel('Name').fill('Bob');
  await page.getByLabel('Klasse (erforderlich)').selectOption({ index: 1 });
  await page.getByLabel('Schießplatz (optional)').fill('2');
  await page.getByRole('button', { name: 'Schütze hinzufügen' }).click();
  await expect(page.getByRole('cell', { name: 'Bob' })).toBeVisible();

  // 5. Enter different scores for each shooter.
  await page.getByTestId('sidebar-nav').getByText('Erfassung').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Erfassung' })).toBeVisible();

  const arrowButtons = page.locator('tbody button');
  await arrowButtons.nth(0).click();
  await page.getByRole('button', { name: '9 Punkte' }).click();
  await arrowButtons.nth(1).click();
  await page.getByRole('button', { name: '5 Punkte' }).click();

  // 6. Navigate to Ergebnisse.
  await page.getByTestId('sidebar-nav').getByText('Ergebnisse').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Ergebnisse' })).toBeVisible();
}

test.describe('reset flow (RES-05)', () => {
  test('reset clears shooters/scores (survives reload) while classes/lines/rounds remain configured', async ({
    page,
  }) => {
    await setUpTournamentWithResults(page);

    // Confirm results are present before resetting.
    await expect(page.getByRole('cell', { name: 'Anna' })).toBeVisible();

    await page.getByRole('button', { name: 'Neues Turnier starten' }).click();
    await expect(page.getByRole('heading', { name: 'Neues Turnier starten?' })).toBeVisible();
    await page.getByRole('button', { name: 'Ja, zurücksetzen' }).click();

    await expect(page.getByText('Noch keine Ergebnisse')).toBeVisible();

    // Reload proves the clear persisted in IndexedDB, not just in-memory component state.
    await page.reload();
    await expect(page.getByTestId('sidebar-nav').getByText('Ergebnisse')).toBeVisible();
    await page.getByTestId('sidebar-nav').getByText('Ergebnisse').click();
    await expect(page.getByText('Noch keine Ergebnisse')).toBeVisible();

    // D-10: classes/lines/rounds configured in Einrichtung are still present.
    await page.getByTestId('sidebar-nav').getByText('Einrichtung').click();
    await expect(page.locator('ul li').first()).toBeVisible();
    await expect(page.getByLabel('Schießplätze')).toHaveValue('2');
  });
});

test.describe('Results responsive layout (RES-03/RES-04, D-04/D-05)', () => {
  test('phone width (375px): class dropdown visible, no grid card visible', async ({ page }) => {
    await setUpTournamentWithResults(page);
    await page.setViewportSize({ width: 375, height: 700 });

    await expect(page.getByLabel('Klasse')).toBeVisible();

    const phoneWrapper = page.locator('div.md\\:hidden');
    await expect(phoneWrapper.getByText('Anna')).toBeVisible();

    // The grid wrapper (`.hidden.md:grid`) is present in the DOM but not visible below
    // the md breakpoint.
    const gridWrapper = page.locator('div.md\\:grid');
    await expect(gridWrapper).toBeHidden();
  });

  test('desktop width (1024px): grid renders at the 2-column breakpoint, no dropdown visible', async ({
    page,
  }) => {
    await setUpTournamentWithResults(page);
    await page.setViewportSize({ width: 1024, height: 800 });

    const gridWrapper = page.locator('div.md\\:grid');
    await expect(gridWrapper).toBeVisible();
    await expect(gridWrapper).toHaveClass(/lg:grid-cols-2/);
    await expect(page.getByLabel('Klasse')).toBeHidden();
  });

  test('wide desktop width (1440px): grid renders at the 3-column breakpoint, no dropdown visible', async ({
    page,
  }) => {
    await setUpTournamentWithResults(page);
    await page.setViewportSize({ width: 1440, height: 900 });

    const gridWrapper = page.locator('div.md\\:grid');
    await expect(gridWrapper).toBeVisible();
    await expect(gridWrapper).toHaveClass(/xl:grid-cols-3/);
    await expect(page.getByLabel('Klasse')).toBeHidden();
  });
});
