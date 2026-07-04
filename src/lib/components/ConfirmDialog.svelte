<script lang="ts">
  import GlassCard from './GlassCard.svelte';

  // Reusable non-dismissible confirmation modal (Plan 02-04 Task 1). Used by
  // PresetSave (overwrite-on-collision, D-13) and PresetList (load/delete confirms,
  // D-12/D-14, and import-replace confirm, D-15). "Non-dismissible" means there is no
  // backdrop-click-to-close or Escape handling — the trainer must explicitly choose
  // confirm or cancel, since these actions guard destructive/overwriting operations.
  let {
    open,
    title,
    body,
    confirmLabel,
    cancelLabel,
    destructive = false,
    onconfirm,
    oncancel,
  }: {
    open: boolean;
    title: string;
    body: string;
    confirmLabel: string;
    cancelLabel: string;
    destructive?: boolean;
    onconfirm: () => void;
    oncancel: () => void;
  } = $props();
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <GlassCard class="w-full max-w-[520px] p-6">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <h2
          id="confirm-dialog-title"
          class="mb-4 text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100"
        >
          {title}
        </h2>

        <p class="mb-6 text-[16px] leading-[1.5] text-slate-700 dark:text-slate-200">
          {body}
        </p>

        <div class="flex justify-end gap-2">
          <button
            type="button"
            onclick={oncancel}
            class="min-h-[44px] rounded-lg px-4 py-2 text-[16px] leading-[1.5] text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onclick={onconfirm}
            class={destructive
              ? 'min-h-[44px] rounded-lg bg-red-600 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-red-700 dark:bg-red-400 dark:text-slate-900'
              : 'min-h-[44px] rounded-lg bg-teal-500 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-teal-600 dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </GlassCard>
  </div>
{/if}
