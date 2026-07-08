<script lang="ts">
  import ThemeToggle from './ThemeToggle.svelte';
  import { strings } from '../i18n/strings.de';

  let { onlogoclick }: { onlogoclick: () => void } = $props();
</script>

<header
  class="glass-surface sticky top-0 z-10 flex h-[calc(4rem+env(safe-area-inset-top))] w-full items-center justify-between px-4 pt-[env(safe-area-inset-top)] md:pl-[88px] xl:pl-[136px]"
>
  <button
    type="button"
    onclick={onlogoclick}
    class="rounded-lg text-[20px] font-semibold leading-tight text-slate-900 hover:opacity-80 dark:text-slate-50"
  >
    {strings.appName}
  </button>
  <ThemeToggle />
</header>
