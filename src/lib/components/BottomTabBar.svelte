<script lang="ts">
  import type { Component } from 'svelte';
  import NavItem from './NavItem.svelte';

  type Item = { id: string; label: string; icon: Component; disabled: boolean };

  let {
    items,
    activeSection,
    onselect,
    class: className = '',
  }: {
    items: Item[];
    activeSection: string;
    onselect: (id: string) => void;
    class?: string;
  } = $props();
</script>

<nav
  data-testid="bottom-tab-bar"
  aria-label="Hauptnavigation"
  class="glass-surface fixed inset-x-0 bottom-0 z-10 h-16 items-stretch justify-around px-2 {className}"
>
  {#each items as item (item.id)}
    <NavItem
      label={item.label}
      icon={item.icon}
      active={activeSection === item.id}
      disabled={item.disabled}
      onclick={() => onselect(item.id)}
    />
  {/each}
</nav>
