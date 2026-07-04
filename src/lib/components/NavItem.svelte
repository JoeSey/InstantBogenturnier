<script lang="ts">
  import type { Component } from 'svelte';

  // Shared vertical icon+label nav item, used by both BottomTabBar and Sidebar.
  // `disabled` is a structural provision for D-15 — every item is enabled in Phase 1
  // (nothing to gate on yet), but the prop must exist now so Phase 4 can disable
  // "Ergebnisse" before any scores exist without a rework.
  let {
    label,
    icon: Icon,
    active = false,
    disabled = false,
    hideLabelBelowXl = false,
    onclick,
  }: {
    label: string;
    icon: Component;
    active?: boolean;
    disabled?: boolean;
    hideLabelBelowXl?: boolean;
    onclick?: () => void;
  } = $props();

  function handleClick() {
    if (!disabled) onclick?.();
  }
</script>

<button
  type="button"
  onclick={handleClick}
  aria-disabled={disabled}
  class="flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 text-[14px] leading-[1.4] transition-opacity
    {disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
    {active && !disabled ? 'text-teal-500 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'}"
>
  <span
    class="h-0.5 w-6 rounded-full {active && !disabled
      ? 'bg-teal-500 dark:bg-teal-400'
      : 'bg-transparent'}"
  ></span>
  <Icon size={20} strokeWidth={1.75} />
  <span class={hideLabelBelowXl ? 'hidden xl:inline' : ''}>{label}</span>
</button>
