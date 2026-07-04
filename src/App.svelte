<script lang="ts">
  import type { Component } from 'svelte';
  import { Settings2, Users, Target, Trophy } from '@lucide/svelte';
  import TopAppBar from './lib/components/TopAppBar.svelte';
  import UpdateBanner from './lib/components/UpdateBanner.svelte';
  import BottomTabBar from './lib/components/BottomTabBar.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import SetupPlaceholder from './lib/views/SetupPlaceholder.svelte';
  import RegistrationPlaceholder from './lib/views/RegistrationPlaceholder.svelte';
  import ScoringPlaceholder from './lib/views/ScoringPlaceholder.svelte';
  import ResultsPlaceholder from './lib/views/ResultsPlaceholder.svelte';
  import { strings } from './lib/i18n/strings.de';
  import { updateAvailable } from './lib/stores/updateBanner.svelte';

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

  // Deterministic E2E test hook (nav.spec.ts contract): only active with `?e2e=1` in the
  // URL, so Playwright can flip `updateAvailable` without publishing two real builds
  // mid-test. T-01-06: gated behind an explicit opt-in query param — no runtime attack
  // surface for normal trainer use, and no manual "check for updates" UI ships (D-04).
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('e2e')) {
    (
      window as unknown as { __setUpdateAvailable?: (value: boolean) => void }
    ).__setUpdateAvailable = updateAvailable.set;
  }
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-900">
  <TopAppBar />
  <UpdateBanner />
  <BottomTabBar {items} {activeSection} onselect={selectSection} class="flex md:hidden" />
  <Sidebar {items} {activeSection} onselect={selectSection} class="hidden md:flex" />
  <main class="pb-24 md:pb-8 md:pl-[88px] xl:pl-[256px]">
    <ActiveView />
  </main>
</div>
