<script lang="ts">
  import type { RoundRuleset, ScoreValue, ThreeDTemplateId } from '../db/schema';
  import { getThreeDTemplate } from '../fixtures/threeDTemplates';
  import { strings } from '../i18n/strings.de';

  // v2 (3D milestone) slice 3 — editable point matrix for one round's ruleset. Rows =
  // the template's zones (Kill/Vital/Wound), columns = the arrow ordinal 1..maxArrows.
  // Pure input surface: it renders the resolved value per cell (stored override ??
  // template default) and emits a full `points` map on every edit. The parent
  // (SetupRounds) owns persistence and the "(angepasst)" / reset affordances.
  // `zoneLabels` are the club-wide display-name overrides (RoundConfig.threeDZoneLabels),
  // edited on the first leg in SetupRounds and passed to every leg's grid so all row
  // headers (and the number-input aria labels) read the same custom names.
  let {
    templateId,
    points,
    disabled = false,
    onchange,
    zoneLabels = {},
  }: {
    templateId: ThreeDTemplateId;
    points: RoundRuleset['points'];
    disabled?: boolean;
    onchange: (points: RoundRuleset['points']) => void;
    zoneLabels?: Partial<Record<string, string>>;
  } = $props();

  let template = $derived(getThreeDTemplate(templateId));
  let ordinals = $derived(Array.from({ length: template.maxArrows }, (_, i) => i + 1));

  // Display name for a zone: the club override (trimmed, non-empty) or the template
  // default. Used for the number-input aria labels and the read-only header text.
  function labelFor(zone: string, fallback: string): string {
    return zoneLabels[zone]?.trim() || fallback;
  }

  function valueOf(token: ScoreValue): number {
    return points[token] ?? template.defaultPoints[token] ?? 0;
  }

  function handleInput(token: ScoreValue, raw: string) {
    const parsed = Math.trunc(Number(raw));
    const value = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    onchange({ ...points, [token]: value });
  }
</script>

<div class="overflow-x-auto">
  <table class="text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
    <thead>
      <tr>
        <th class="p-1 text-left font-normal text-slate-500 dark:text-slate-400"></th>
        {#each ordinals as ordinal (ordinal)}
          <th class="p-1 text-center font-normal text-slate-500 dark:text-slate-400">
            {strings.setup.threeDArrowColumn(ordinal)}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each template.zones as zone (zone.zone)}
        <tr>
          <th class="p-1 text-left font-semibold">{labelFor(zone.zone, zone.label)}</th>
          {#each ordinals as ordinal (ordinal)}
            {@const token = `${zone.zone}${ordinal}` as ScoreValue}
            <td class="p-1">
              <input
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
                aria-label={`${labelFor(zone.zone, zone.label)} ${strings.setup.threeDArrowColumn(ordinal)}`}
                value={valueOf(token)}
                {disabled}
                onchange={(e) => handleInput(token, (e.currentTarget as HTMLInputElement).value)}
                class="min-h-[44px] w-16 rounded-lg border border-slate-300 bg-white p-2 text-center text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
