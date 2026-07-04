<script lang="ts">
  import GlassCard from '../components/GlassCard.svelte';
  import ClassForm from '../components/ClassForm.svelte';
  import { strings } from '../i18n/strings.de';
</script>

<div class="mx-auto max-w-[480px] p-4">
  <h1 class="mb-6 text-[28px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
    {strings.setup.heading}
  </h1>

  <section class="mb-6">
    <GlassCard class="p-4 md:p-6">
      <ClassForm />
    </GlassCard>
  </section>
</div>
