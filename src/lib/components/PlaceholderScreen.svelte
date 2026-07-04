<script lang="ts">
  import type { Component } from 'svelte';
  let { icon: Icon, heading, body }: { icon: Component; heading: string; body: string } = $props();
</script>

<div class="mx-auto flex max-w-[480px] flex-col items-center justify-center gap-6 pt-16 text-center">
  <div class="glass-surface rounded-full p-6">
    <Icon size={48} class="text-slate-500 dark:text-slate-400" />
  </div>
  <h1 class="text-[28px] font-semibold leading-tight text-slate-900 dark:text-slate-50">{heading}</h1>
  <p class="text-base text-slate-600 dark:text-slate-300">{body}</p>
</div>
