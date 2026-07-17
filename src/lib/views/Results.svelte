<script lang="ts">
  import { liveQuery } from 'dexie';
  import { exportDB, importInto } from 'dexie-export-import';
  import { RotateCcw, FileDown, Upload } from '@lucide/svelte';
  import { db } from '../db/schema';
  import { strings } from '../i18n/strings.de';
  import { computeClassRankings } from '../utils/ranking';
  import { generateResultsPdf, resultsPdfFilename } from '../utils/pdfExport';
  import { expandClassName } from '../utils/classNameGenerator';
  import {
    generateBulkCerts,
    generateSingleCertPdf,
    certificatePdfFilename,
    zipFilename,
  } from '../utils/certificateExport';
  import type { RankedRow } from '../utils/ranking';
  import { downloadBlob } from '../utils/downloadBlob';
  import { describeError } from '../utils/errorDetail';
  import GlassCard from '../components/GlassCard.svelte';
  import ClassSelector from '../components/ClassSelector.svelte';
  import ResultsTable from '../components/ResultsTable.svelte';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  // Main Results view (RES-01–RES-04, D-01/D-04/D-05): live-updating ranked per-class
  // standings, viewable anytime (D-01, not gated on finalization). Mirrors
  // ScoreEntry.svelte's multi-liveQuery + `?? []` defaulting pattern.
  const shootersQuery = liveQuery(() => db.shooters.toArray());
  let shooters = $derived($shootersQuery ?? []);

  const classesQuery = liveQuery(() => db.classes.toArray());
  let classes = $derived($classesQuery ?? []);

  const roundsQuery = liveQuery(() => db.rounds.get(1));
  let roundsConfig = $derived($roundsQuery);

  const scoresQuery = liveQuery(() => db.scores.toArray());
  let allScores = $derived($scoresQuery ?? []);

  let rankings = $derived(computeClassRankings(shooters, classes, allScores, roundsConfig));

  // D-04: alphabetical class order, edge-case-safe — only classes with at least one
  // ranked shooter (rankings.has) feed BOTH the phone dropdown and the grid.
  let classesWithResults = $derived(
    classes.filter((c) => c.id !== undefined && rankings.has(c.id)).sort((a, b) => a.name.localeCompare(b.name))
  );

  let selectedClassId = $state<number | null>(null);

  // Defaults to the first alphabetical class on first load, and re-picks whenever the
  // current selection is null or no longer present (handles the post-reset re-pick
  // case introduced by the next plan in this phase).
  $effect(() => {
    if (selectedClassId === null || !classesWithResults.some((c) => c.id === selectedClassId)) {
      selectedClassId = classesWithResults[0]?.id ?? null;
    }
  });

  // Declared now (unused by this plan) since Plan 02 (reset) extends this same file
  // and needs the same error-row shape as ScoreEntry.svelte.
  let errorFeedback = $state('');

  let includeIncomplete = $state(false); // D-09: default unchecked

  async function handleExport() {
    errorFeedback = '';
    try {
      // Fetch settings directly (not via liveQuery + $derived) — the reactive form was
      // never read from the template, only from this imperative handler, so Svelte's
      // store subscription could still be on its initial (stale/undefined) emission at
      // click time even though the record was long since saved (see CLAUDE.md's Dexie +
      // Svelte 5 liveQuery caveat). A direct read is also simply more correct here:
      // export is a one-off action that should see the current persisted state.
      const settings = (await db.settings.get(1)) ?? { id: 1 as const };
      const blob = await generateResultsPdf(
        rankings,
        classesWithResults,
        settings,
        includeIncomplete,
        roundsConfig
      );
      await downloadBlob(blob, resultsPdfFilename());
    } catch (err) {
      errorFeedback = `${strings.resultsPdf.exportError} [${describeError(err)}]`;
    }
  }

  // Phase 6 Plan 04 (D-01/D-03): bulk certificate ZIP export, mirroring handleExport()'s
  // settings-fetch + WR-04 append-before-click download pattern exactly.
  async function handleBulkCertExport() {
    errorFeedback = '';
    try {
      const settings = (await db.settings.get(1)) ?? { id: 1 as const };
      const blob = await generateBulkCerts(rankings, classesWithResults, settings);
      await downloadBlob(blob, zipFilename());
    } catch (err) {
      errorFeedback = `${strings.certificateExport.bulkExportError} [${describeError(err)}]`;
    }
  }

  // Phase 6 Plan 04 (D-02/D-04): per-row single-certificate export. className is passed
  // explicitly by the caller (T-6-08) — read from the exact same in-scope cls/selected
  // class variable the row itself was rendered from, no cross-class lookup.
  async function handleSingleCertExport(row: RankedRow, className: string) {
    errorFeedback = '';
    try {
      const settings = (await db.settings.get(1)) ?? { id: 1 as const };
      const blob = await generateSingleCertPdf(row, className, settings);
      await downloadBlob(blob, certificatePdfFilename(row.name));
    } catch (err) {
      errorFeedback = `${strings.certificateExport.singleExportError} [${describeError(err)}]`;
    }
  }

  // RES-05/D-08/D-09/D-10: "Neues Turnier starten" reset flow. Reuses ConfirmDialog's
  // non-dismissible confirm pattern (T-4-01) and wraps both clears in a single Dexie
  // transaction (T-4-03) so a mid-operation failure can never leave scores referencing
  // already-deleted shooters. Only `shooters`/`scores` are ever cleared here — classes,
  // shootingLines, rounds, and presets are intentionally untouched (D-10).
  let resetDialogOpen = $state(false);
  let resetSuccessMessage = $state('');

  function openResetDialog() {
    resetSuccessMessage = '';
    resetDialogOpen = true;
  }

  async function handleResetConfirm() {
    resetDialogOpen = false;
    errorFeedback = '';
    try {
      await db.transaction('rw', db.shooters, db.scores, async () => {
        await db.shooters.clear();
        await db.scores.clear();
      });
      resetSuccessMessage = strings.results.resetSuccess;
    } catch (err) {
      errorFeedback = strings.results.resetError.replace(
        '{error}',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  function handleResetCancel() {
    resetDialogOpen = false;
  }

  // Quick task — whole-tournament export/import ("continue on another device", e.g. via
  // iCloud Drive). Mirrors PresetList.svelte's exportDB/importInto pattern exactly, but
  // with the opposite skip-list: this transfers the live tournament data, not reusable
  // preset templates, so `presets` is the one table intentionally left untouched. Unlike
  // PresetList's preset-load flow (which has to reconcile shooters.classId by name
  // because it replaces classes while leaving shooters alone), this import clears and
  // replaces classes AND shooters together from the same snapshot file — so a shooter's
  // classId always matches a class that exists, with no reconciliation needed.
  const TOURNAMENT_TABLES = ['classes', 'shootingLines', 'rounds', 'shooters', 'scores', 'settings'];

  let transferFeedback = $state('');
  let importFile = $state<File | null>(null);
  let importShooterCount = $state(0);
  let importScoreCount = $state(0);
  let importDialogOpen = $state(false);
  let transferFileInputEl = $state<HTMLInputElement | undefined>(undefined);

  async function handleTournamentExport() {
    errorFeedback = '';
    transferFeedback = '';
    try {
      const blob = await exportDB(db, { skipTables: ['presets'] });
      const filename = `Turnier_${new Date().toISOString().split('T')[0]}.json`;
      await downloadBlob(blob, filename);
      transferFeedback = strings.tournamentTransfer.exportFeedback.replace('{filename}', filename);
    } catch (err) {
      errorFeedback = strings.tournamentTransfer.exportError.replace('{error}', describeError(err));
    }
  }

  async function handleTransferFileSelected(e: Event) {
    errorFeedback = '';
    transferFeedback = '';
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        formatName?: string;
        data?: {
          databaseName?: string;
          tables?: Array<{ name: string; rowCount: number }>;
        };
      };
      const tables = parsed.data?.tables;
      if (parsed.formatName !== 'dexie' || parsed.data?.databaseName !== db.name || !tables) {
        errorFeedback = strings.tournamentTransfer.importInvalidFile;
        input.value = '';
        return;
      }
      // WR-05-equivalent: refuse a structurally-valid-but-incomplete export (e.g.
      // hand-edited or truncated) rather than importing a partial tournament snapshot —
      // clearTablesBeforeImport only clears tables actually listed in the file, so a
      // missing `shooters` entry would silently leave stale local shooters in place
      // pointing at freshly-replaced classes.
      const tableNames = new Set(tables.map((t) => t.name));
      const missing = TOURNAMENT_TABLES.filter((name) => !tableNames.has(name));
      if (missing.length > 0) {
        errorFeedback = strings.tournamentTransfer.importIncompleteFile.replace('{tables}', missing.join(', '));
        input.value = '';
        return;
      }

      importShooterCount = tables.find((t) => t.name === 'shooters')?.rowCount ?? 0;
      importScoreCount = tables.find((t) => t.name === 'scores')?.rowCount ?? 0;
    } catch (err) {
      errorFeedback = strings.tournamentTransfer.importError.replace('{error}', describeError(err));
      input.value = '';
      return;
    }

    importFile = file;
    importDialogOpen = true;
  }

  function cancelTournamentImport() {
    importDialogOpen = false;
    importFile = null;
    if (transferFileInputEl) transferFileInputEl.value = '';
  }

  async function confirmTournamentImport() {
    if (!importFile) return;
    errorFeedback = '';
    try {
      await importInto(db, importFile, {
        clearTablesBeforeImport: true,
        skipTables: ['presets'],
      });
      transferFeedback = strings.tournamentTransfer.importSuccess;
    } catch (err) {
      errorFeedback = strings.tournamentTransfer.importError.replace('{error}', describeError(err));
    } finally {
      importDialogOpen = false;
      importFile = null;
      if (transferFileInputEl) transferFileInputEl.value = '';
    }
  }
</script>

<div class="mx-auto flex max-w-[1280px] flex-col gap-6 p-4">
  <h1 class="text-[28px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
    {strings.results.heading}
  </h1>

  {#if errorFeedback}
    <p class="text-[14px] leading-[1.4] text-red-600 dark:text-red-400">{errorFeedback}</p>
  {/if}

  {#if classesWithResults.length === 0}
    <div class="flex flex-col items-center gap-2 py-12 text-center">
      <h2 class="text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
        {strings.results.emptyHeading}
      </h2>
      <p class="text-[16px] leading-[1.5] text-slate-600 dark:text-slate-300">
        {strings.results.emptyBody}
      </p>
    </div>
  {:else}
    <div class="md:hidden">
      <ClassSelector
        classes={classesWithResults}
        {selectedClassId}
        onchange={(id) => (selectedClassId = id)}
      />
      <div class="mt-4">
        <ResultsTable
          rows={selectedClassId !== null ? (rankings.get(selectedClassId) ?? []) : []}
          oncertexport={(row) => {
            const cls = classesWithResults.find((c) => c.id === selectedClassId);
            handleSingleCertExport(row, cls ? expandClassName(cls) : '');
          }}
        />
      </div>
    </div>

    <!-- auto-fit (not a fixed grid-cols-N) so cards grow to use freed-up width when
    there are fewer classes than columns, instead of being squeezed into equal tracks
    with a wasted empty track — that squeeze was forcing ResultsTable's horizontal
    scrollbar even when the row would otherwise fit. minmax(480px, 1fr) is wide enough
    for the Rang/Name/Schießplatz/Gesamt/Urkunde columns in the common case. -->
    <div
      class="hidden gap-4 md:grid xl:gap-6"
      style="grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));"
    >
      {#each classesWithResults as cls (cls.id)}
        <GlassCard class="min-w-0 p-4 md:p-6 xl:p-6">
          <h2 class="mb-4 text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
            {cls.name}
          </h2>
          <ResultsTable
            rows={rankings.get(cls.id!) ?? []}
            oncertexport={(row) => handleSingleCertExport(row, expandClassName(cls))}
          />
        </GlassCard>
      {/each}
    </div>
  {/if}

  <GlassCard class="flex flex-col gap-4 p-4 md:p-6">
    <label class="flex min-h-[44px] cursor-pointer items-start gap-2">
      <input
        type="checkbox"
        bind:checked={includeIncomplete}
        class="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600"
      />
      <span class="flex flex-col">
        <span class="text-[16px] leading-[1.5] text-slate-900 dark:text-slate-100">
          {strings.resultsPdf.includeIncompleteLabel}
        </span>
        <span class="text-[14px] leading-[1.4] text-slate-600 dark:text-slate-300">
          {strings.resultsPdf.includeIncompleteHelper}
        </span>
      </span>
    </label>

    <div class="flex flex-col gap-2 md:flex-row">
      <button
        type="button"
        onclick={handleExport}
        disabled={classesWithResults.length === 0}
        class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300"
      >
        <FileDown size={20} />
        {strings.resultsPdf.exportButton}
      </button>

      <button
        type="button"
        onclick={handleBulkCertExport}
        disabled={classesWithResults.length === 0}
        class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300"
      >
        <FileDown size={20} />
        {strings.certificateExport.bulkButton}
      </button>
    </div>
  </GlassCard>

  <GlassCard class="flex flex-col gap-4 p-4 md:p-6">
    <div>
      <h2 class="text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
        {strings.tournamentTransfer.heading}
      </h2>
      <p class="text-[14px] leading-[1.4] text-slate-600 dark:text-slate-300">
        {strings.tournamentTransfer.helper}
      </p>
    </div>

    {#if transferFeedback}
      <p class="text-[14px] leading-[1.4] text-teal-700 dark:text-teal-300">{transferFeedback}</p>
    {/if}

    <div class="flex flex-col gap-2 md:flex-row">
      <button
        type="button"
        onclick={handleTournamentExport}
        class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-[16px] leading-[1.5] text-slate-700 hover:bg-slate-100 md:w-auto dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <FileDown size={20} />
        {strings.tournamentTransfer.exportButton}
      </button>

      <label
        class="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-[16px] leading-[1.5] text-slate-700 hover:bg-slate-100 md:w-auto dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <Upload size={20} />
        {strings.tournamentTransfer.importButton}
        <input
          bind:this={transferFileInputEl}
          type="file"
          accept=".json"
          aria-label={strings.tournamentTransfer.importFileLabel}
          class="sr-only"
          onchange={handleTransferFileSelected}
        />
      </label>
    </div>
  </GlassCard>

  {#if resetSuccessMessage}
    <p class="text-[14px] leading-[1.4] text-teal-600 dark:text-teal-400">{resetSuccessMessage}</p>
  {/if}

  <button
    type="button"
    onclick={openResetDialog}
    class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-red-700 md:w-auto dark:bg-red-400 dark:text-slate-900"
  >
    <RotateCcw size={20} />
    {strings.results.resetButton}
  </button>
</div>

<ConfirmDialog
  open={resetDialogOpen}
  title={strings.results.resetConfirmTitle}
  body={strings.results.resetConfirmBody}
  confirmLabel={strings.results.resetConfirmYes}
  cancelLabel={strings.results.resetConfirmCancel}
  destructive={true}
  onconfirm={handleResetConfirm}
  oncancel={handleResetCancel}
/>

<ConfirmDialog
  open={importDialogOpen}
  title={strings.tournamentTransfer.importConfirmTitle}
  body={strings.tournamentTransfer.importConfirmBody
    .replace('{shooterCount}', String(importShooterCount))
    .replace('{scoreCount}', String(importScoreCount))}
  confirmLabel={strings.tournamentTransfer.importConfirmYes}
  cancelLabel={strings.tournamentTransfer.importConfirmCancel}
  destructive={true}
  onconfirm={confirmTournamentImport}
  oncancel={cancelTournamentImport}
/>
