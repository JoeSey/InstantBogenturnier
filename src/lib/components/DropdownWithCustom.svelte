<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }

  // D-04: dropdown with an "Andere" (custom) free-text escape hatch. Selecting a real
  // option calls `onchange` immediately with its value; selecting "Andere" reveals a
  // text input whose typed content is reported via `onchange` on every keystroke.
  let {
    label,
    options,
    value = '',
    onchange,
  }: {
    label: string;
    options: readonly Option[];
    value?: string;
    onchange: (value: string) => void;
  } = $props();

  let isCustom = $state(false);
  let customInput = $state('');

  // If the bound value is externally reset (e.g. form reset after save), fall back out
  // of custom-entry mode so the dropdown doesn't stay stuck showing a stale text input.
  $effect(() => {
    if (value === '') {
      isCustom = false;
      customInput = '';
    }
  });

  function handleSelectChange(e: Event) {
    const selected = (e.target as HTMLSelectElement).value;
    if (selected === 'custom') {
      isCustom = true;
      onchange(customInput);
    } else {
      isCustom = false;
      onchange(selected);
    }
  }

  function handleCustomInput(e: Event) {
    customInput = (e.target as HTMLInputElement).value;
    onchange(customInput);
  }
</script>

<label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
  {label}
  <select
    value={isCustom ? 'custom' : value}
    onchange={handleSelectChange}
    class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
  >
    <option value="">— Keine Angabe —</option>
    {#each options as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
    <option value="custom">— Andere —</option>
  </select>

  {#if isCustom}
    <input
      type="text"
      placeholder="Benutzerdefiniert eingeben"
      value={customInput}
      oninput={handleCustomInput}
      class="mt-2 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
    />
  {/if}
</label>
