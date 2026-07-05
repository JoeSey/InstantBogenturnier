<script lang="ts">
  import { strings } from '../i18n/strings.de';
  import type { ClassRecord } from '../db/schema';

  // Phone-only native <select> class switcher (RES-03). Caller pre-sorts `classes`
  // alphabetically (D-04) — this component renders options in the given order.
  let {
    classes,
    selectedClassId,
    onchange,
  }: {
    classes: ClassRecord[];
    selectedClassId: number | null;
    onchange: (id: number) => void;
  } = $props();
</script>

<label class="flex flex-col gap-1">
  <span class="text-[14px] leading-[1.4] text-slate-500 dark:text-slate-400"
    >{strings.results.classDropdownLabel}</span
  >
  <select
    value={selectedClassId}
    onchange={(e) => onchange(Number((e.target as HTMLSelectElement).value))}
    class="min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-[16px] leading-[1.5] text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
  >
    {#each classes as cls (cls.id)}
      <option value={cls.id}>{cls.name}</option>
    {/each}
  </select>
</label>
