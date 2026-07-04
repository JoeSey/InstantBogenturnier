<script lang="ts">
  import ThemeToggle from './ThemeToggle.svelte';
  import { strings } from '../i18n/strings.de';
</script>

<header
  class="glass-surface sticky top-0 z-10 flex h-16 w-full items-center justify-between px-4"
>
  <h1 class="text-[20px] font-semibold leading-tight text-slate-900 dark:text-slate-50">
    {strings.appName}
  </h1>
  <ThemeToggle />
</header>
