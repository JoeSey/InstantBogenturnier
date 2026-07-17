<script lang="ts">
  import { liveQuery } from 'dexie';
  import { X } from '@lucide/svelte';
  import { db } from '../db/schema';
  import { downscaleImageBlob } from '../utils/imageDownscale';
  import { strings } from '../i18n/strings.de';

  // 05-01-PLAN.md Task 2: title + two logo uploads, singleton settings row (id: 1).
  // Built generically (not PDF-export-specific) per 05-CONTEXT.md D-05 so the future
  // certificates phase (Phase 6) can reuse the same settings table.
  const settingsQuery = liveQuery(() => db.settings.get(1));
  let settings = $derived($settingsQuery);

  let title = $state('');
  let certificateHeading = $state('');
  let logoLeftBlob = $state<Blob | undefined>(undefined);
  let logoRightBlob = $state<Blob | undefined>(undefined);
  // Tracks whether the trainer actually replaced/removed a logo in this session, as
  // opposed to logoLeftBlob/logoRightBlob merely holding the Blob instance that was
  // read back from IndexedDB on load. WebKit's IndexedDB has a known bug where writing
  // a Blob that was itself retrieved from IndexedDB back into IndexedDB (a "round-trip"
  // put) corrupts it — reads succeed until the next put, then the stored blob becomes
  // unreadable (FileReader/jsPDF throws) until the app restarts and gets a fresh
  // connection. Editing only the title triggered exactly this: save() used to put the
  // whole record, including the already-once-read logo blobs, on every save. Only
  // including the blob fields in the write when they were actually changed avoids the
  // round-trip entirely.
  let logoLeftDirty = false;
  let logoRightDirty = false;
  let logoLeftPreview = $state<string | undefined>(undefined);
  let logoRightPreview = $state<string | undefined>(undefined);
  let logoLeftInput = $state<HTMLInputElement | undefined>(undefined);
  let logoRightInput = $state<HTMLInputElement | undefined>(undefined);
  let errorFeedback = $state('');
  let successFeedback = $state('');

  // Sync local form state from the loaded record once it arrives (liveQuery starts as
  // `undefined` before the first read resolves). Rebuilds object-URL previews for any
  // previously saved logo Blobs so a page reload shows the same images, not just the
  // title text.
  let initialized = $state(false);
  $effect(() => {
    if (!initialized && settings !== undefined) {
      title = settings?.title ?? '';
      certificateHeading = settings?.certificateHeading ?? '';
      logoLeftBlob = settings?.logoLeftBlob;
      logoRightBlob = settings?.logoRightBlob;
      logoLeftPreview = logoLeftBlob ? URL.createObjectURL(logoLeftBlob) : undefined;
      logoRightPreview = logoRightBlob ? URL.createObjectURL(logoRightBlob) : undefined;
      initialized = true;
    }
  });

  // WR-03: revoke any blob: object URL before it's replaced/discarded, and on
  // component teardown, so navigating away from Setup doesn't leak one object URL
  // per previously-saved logo for the life of the SPA session. Data URIs (from
  // downscaleImageBlob) aren't real object URLs — revokeObjectURL is a documented
  // no-op for them, so this helper is safe to call unconditionally.
  function revokePreview(preview: string | undefined) {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
  }
  $effect(() => {
    return () => {
      revokePreview(logoLeftPreview);
      revokePreview(logoRightPreview);
    };
  });

  const MAX_LOGO_BYTES = 200 * 1024;

  async function handleLogoChange(side: 'left' | 'right', e: Event) {
    errorFeedback = '';
    successFeedback = '';
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Pre-flight size check before downscaling — surface errorTooLarge immediately
    // without calling into Canvas for an obviously oversized file.
    if (file.size > MAX_LOGO_BYTES) {
      errorFeedback = strings.settingsForm.errorTooLarge;
      return;
    }

    try {
      const { blob, dataUri } = await downscaleImageBlob(file);
      // WR-01: the pre-flight check above only bounds the *original* file size —
      // a low-compression image could still downscale to a blob at or above the
      // 200KB cap the UI promises. Enforce the cap on the actual stored blob too.
      if (blob.size > MAX_LOGO_BYTES) {
        errorFeedback = strings.settingsForm.errorTooLarge;
        return;
      }
      if (side === 'left') {
        revokePreview(logoLeftPreview);
        logoLeftBlob = blob;
        logoLeftPreview = dataUri;
        logoLeftDirty = true;
      } else {
        revokePreview(logoRightPreview);
        logoRightBlob = blob;
        logoRightPreview = dataUri;
        logoRightDirty = true;
      }
    } catch {
      errorFeedback = strings.settingsForm.errorUploadFailed;
    }
  }

  function removeLogo(side: 'left' | 'right') {
    errorFeedback = '';
    successFeedback = '';
    if (side === 'left') {
      revokePreview(logoLeftPreview);
      logoLeftBlob = undefined;
      logoLeftPreview = undefined;
      logoLeftDirty = true;
      if (logoLeftInput) logoLeftInput.value = '';
    } else {
      revokePreview(logoRightPreview);
      logoRightBlob = undefined;
      logoRightPreview = undefined;
      logoRightDirty = true;
      if (logoRightInput) logoRightInput.value = '';
    }
  }

  async function save() {
    errorFeedback = '';
    successFeedback = '';
    try {
      const existing = await db.settings.get(1);
      if (existing) {
        // Only touch the logo Blob fields when this save actually changed them —
        // see logoLeftDirty/logoRightDirty above for why re-writing an unchanged,
        // previously-read-back Blob corrupts it under WebKit's IndexedDB.
        await db.settings.update(1, {
          title,
          certificateHeading,
          ...(logoLeftDirty ? { logoLeftBlob } : {}),
          ...(logoRightDirty ? { logoRightBlob } : {}),
        });
      } else {
        await db.settings.put({
          id: 1,
          title,
          certificateHeading,
          logoLeftBlob,
          logoRightBlob,
        });
      }
      logoLeftDirty = false;
      logoRightDirty = false;
      successFeedback = strings.settingsForm.saveSuccess;
    } catch (err) {
      errorFeedback =
        err instanceof Error && err.name === 'QuotaExceededError'
          ? strings.settingsForm.errorQuotaExceeded
          : strings.settingsForm.errorSaveFailed;
    }
  }
</script>

<h3 class="mb-4 text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
  {strings.settingsForm.heading}
</h3>

<div class="flex flex-col gap-4">
  <label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
    {strings.settingsForm.titleLabel}
    <input
      type="text"
      bind:value={title}
      placeholder={strings.settingsForm.titlePlaceholder}
      class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
    />
  </label>

  <label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
    {strings.settingsForm.certificateHeadingLabel}
    <input
      type="text"
      bind:value={certificateHeading}
      placeholder={strings.settingsForm.certificateHeadingPlaceholder}
      class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
    />
  </label>

  <div class="flex flex-col gap-2">
    <label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
      {strings.settingsForm.logoLeftLabel}
      <input
        bind:this={logoLeftInput}
        type="file"
        accept="image/png,image/jpeg"
        onchange={(e) => handleLogoChange('left', e)}
        class="mt-1 w-full text-[16px] leading-[1.5] text-slate-900 dark:text-slate-100"
      />
      <span class="mt-1 block text-[14px] leading-[1.4] text-slate-600 dark:text-slate-300">
        {strings.settingsForm.logoSizeHint}
      </span>
    </label>
    {#if logoLeftPreview}
      <div class="flex items-start gap-2">
        <img src={logoLeftPreview} alt="" class="max-h-[80px] rounded-lg" />
        <button
          type="button"
          onclick={() => removeLogo('left')}
          aria-label={strings.settingsForm.removeLogoLabel}
          class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-red-600 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-red-400"
        >
          <X size={20} />
        </button>
      </div>
    {/if}
  </div>

  <div class="flex flex-col gap-2">
    <label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
      {strings.settingsForm.logoRightLabel}
      <input
        bind:this={logoRightInput}
        type="file"
        accept="image/png,image/jpeg"
        onchange={(e) => handleLogoChange('right', e)}
        class="mt-1 w-full text-[16px] leading-[1.5] text-slate-900 dark:text-slate-100"
      />
      <span class="mt-1 block text-[14px] leading-[1.4] text-slate-600 dark:text-slate-300">
        {strings.settingsForm.logoSizeHint}
      </span>
    </label>
    {#if logoRightPreview}
      <div class="flex items-start gap-2">
        <img src={logoRightPreview} alt="" class="max-h-[80px] rounded-lg" />
        <button
          type="button"
          onclick={() => removeLogo('right')}
          aria-label={strings.settingsForm.removeLogoLabel}
          class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-red-600 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-red-400"
        >
          <X size={20} />
        </button>
      </div>
    {/if}
  </div>

  <button
    type="button"
    onclick={save}
    class="min-h-[44px] rounded-lg bg-teal-500 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-teal-600 dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300"
  >
    {strings.settingsForm.saveButton}
  </button>

  {#if successFeedback}
    <p class="text-[14px] leading-[1.4] text-teal-600 dark:text-teal-400">{successFeedback}</p>
  {/if}

  {#if errorFeedback}
    <p class="text-[14px] leading-[1.4] text-red-600 dark:text-red-400">{errorFeedback}</p>
  {/if}
</div>
