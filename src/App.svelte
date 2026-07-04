<script lang="ts">
  import type { Component } from 'svelte';
  import { Settings2, Users, Target, Trophy } from '@lucide/svelte';
  import TopAppBar from './lib/components/TopAppBar.svelte';
  import BottomTabBar from './lib/components/BottomTabBar.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import SetupPlaceholder from './lib/views/SetupPlaceholder.svelte';
  import RegistrationPlaceholder from './lib/views/RegistrationPlaceholder.svelte';
  import ScoringPlaceholder from './lib/views/ScoringPlaceholder.svelte';
  import ResultsPlaceholder from './lib/views/ResultsPlaceholder.svelte';
  import { strings } from './lib/i18n/strings.de';

  type SectionId = 'setup' | 'registration' | 'scoring' | 'results';

  const items: { id: SectionId; label: string; icon: Component; disabled: boolean }[] = [
    { id: 'setup', label: strings.nav.setup, icon: Settings2, disabled: false },
    { id: 'registration', label: strings.nav.registration, icon: Users, disabled: false },
    { id: 'scoring', label: strings.nav.scoring, icon: Target, disabled: false },
    { id: 'results', label: strings.nav.results, icon: Trophy, disabled: false },
  ];

  const views: Record<SectionId, Component> = {
    setup: SetupPlaceholder,
    registration: RegistrationPlaceholder,
    scoring: ScoringPlaceholder,
    results: ResultsPlaceholder,
  };

  let activeSection = $state<SectionId>('setup');
  let ActiveView = $derived(views[activeSection]);

  function selectSection(id: SectionId) {
    activeSection = id;
  }
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-900">
  <TopAppBar />
  <BottomTabBar {items} {activeSection} onselect={selectSection} class="flex md:hidden" />
  <Sidebar {items} {activeSection} onselect={selectSection} class="hidden md:flex" />
  <main class="pb-24 md:pb-8 md:pl-[88px] xl:pl-[256px]">
    <ActiveView />
  </main>
</div>
