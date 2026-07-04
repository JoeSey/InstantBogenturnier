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
  data-testid="sidebar-nav"
  aria-label="Hauptnavigation"
  class="glass-surface fixed inset-y-0 left-0 z-10 w-[72px] flex-col items-stretch gap-2 p-3 xl:w-[240px] {className}"
>
  {#each items as item (item.id)}
    <NavItem
      label={item.label}
      icon={item.icon}
      active={activeSection === item.id}
      disabled={item.disabled}
      hideLabelBelowXl
      onclick={() => onselect(item.id)}
    />
  {/each}
</nav>
