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
    invalid = false,
    hint = '',
  }: {
    label: string;
    options: readonly Option[];
    value?: string;
    onchange: (value: string) => void;
    invalid?: boolean;
    hint?: string;
  } = $props();

  let isCustom = $state(false);
  let customInput = $state('');
  // WR-01: tracks the last value *this component* pushed up via `onchange`, so the
  // reset effect below can distinguish "parent externally reset `value`" (e.g. form
  // reset after save) from "the bound `value` prop is just echoing our own emit" (e.g.
  // the user backspaced the custom field down to ''). Only the former should kick the
  // component out of custom-entry mode.
  let lastEmittedValue = $state<string | null>(null);

  // If the bound value is externally reset (e.g. form reset after save), fall back out
  // of custom-entry mode so the dropdown doesn't stay stuck showing a stale text input.
  $effect(() => {
    if (value === '' && value !== lastEmittedValue) {
      isCustom = false;
      customInput = '';
    }
  });

  function handleSelectChange(e: Event) {
    const selected = (e.target as HTMLSelectElement).value;
    if (selected === 'custom') {
      isCustom = true;
      lastEmittedValue = customInput;
      onchange(customInput);
    } else {
      isCustom = false;
      lastEmittedValue = selected;
      onchange(selected);
    }
  }

  function handleCustomInput(e: Event) {
    customInput = (e.target as HTMLInputElement).value;
    lastEmittedValue = customInput;
    onchange(customInput);
  }
</script>

<label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
  {label}{#if hint}<span class="text-red-600 dark:text-red-400"> {hint}</span>{/if}
  <select
    value={isCustom ? 'custom' : value}
    onchange={handleSelectChange}
    class="mt-1 min-h-[44px] w-full rounded-lg border p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:text-slate-100 {invalid
      ? 'border-red-500 dark:border-red-500'
      : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-800"
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
      class="mt-2 min-h-[44px] w-full rounded-lg border p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:text-slate-100 {invalid
        ? 'border-red-500 dark:border-red-500'
        : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-800"
    />
  {/if}
</label>
