<script lang="ts">
  import { Sun, Moon } from '@lucide/svelte';
  import { toggleTheme, currentIsDark } from '../stores/theme.svelte';
  import { strings } from '../i18n/strings.de';
</script>

<button
  type="button"
  onclick={toggleTheme}
  aria-label={currentIsDark() ? strings.theme.ariaToLight : strings.theme.ariaToDark}
  class="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:text-slate-400 dark:hover:text-slate-200 dark:focus-visible:outline-teal-400"
>
  {#if currentIsDark()}
    <Sun size={20} strokeWidth={1.75} />
  {:else}
    <Moon size={20} strokeWidth={1.75} />
  {/if}
</button>
