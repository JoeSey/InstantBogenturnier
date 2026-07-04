<script lang="ts">
  import { updateAvailable } from '../stores/updateBanner.svelte';
  import { strings } from '../i18n/strings.de';
  import { updateSW } from '../../main';

  // Session-only dismissal (D-02/D-03): component-level $state, never written to any
  // persistent browser storage — stays hidden for the rest of this session, reappears on
  // next full app open if the update is still pending.
  let dismissed = $state(false);

  function applyUpdate() {
    updateSW();
  }

  function dismiss() {
    dismissed = true;
  }
</script>

{#if updateAvailable.current && !dismissed}
  <div
    role="status"
    class="glass-surface flex w-full flex-col items-start gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
  >
    <p class="text-base text-slate-700 dark:text-slate-200">{strings.updateBanner.body}</p>
    <div class="flex gap-2">
      <button
        type="button"
        onclick={dismiss}
        class="rounded-lg px-3 py-2 text-[14px] leading-[1.4] text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
      >
        {strings.updateBanner.dismiss}
      </button>
      <button
        type="button"
        onclick={applyUpdate}
        class="rounded-lg bg-teal-500 px-3 py-2 text-[14px] font-semibold leading-[1.4] text-white hover:bg-teal-600 dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300"
      >
        {strings.updateBanner.confirm}
      </button>
    </div>
  </div>
{/if}
