<script lang="ts">
  import GlassCard from './GlassCard.svelte';
  import { strings } from '../i18n/strings.de';
  import { appVersion } from '../config/app.config';

  let { open, onclose }: { open: boolean; onclose: () => void } = $props();
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    role="presentation"
    onclick={onclose}
  >
    <GlassCard class="w-full max-w-[420px] p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-dialog-title"
        onclick={(e: MouseEvent) => e.stopPropagation()}
      >
        <h2
          id="about-dialog-title"
          class="mb-2 text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100"
        >
          {strings.appName}
        </h2>
        <p class="mb-4 text-[14px] leading-[1.5] text-slate-500 dark:text-slate-400">
          {strings.about.version} {appVersion}
        </p>
        <p class="mb-6 text-[16px] leading-[1.5] text-slate-700 dark:text-slate-200">
          {strings.about.body}
        </p>

        <div class="flex justify-end">
          <button
            type="button"
            onclick={onclose}
            class="min-h-[44px] rounded-lg bg-teal-500 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-teal-600 dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300"
          >
            {strings.about.close}
          </button>
        </div>
      </div>
    </GlassCard>
  </div>
{/if}
