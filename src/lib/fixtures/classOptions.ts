// Reference data for the Classes card's dropdown-with-custom fields (D-04/D-05/D-06).
// Age-group and distance defaults are Claude's Discretion (D-06); bow-type list and
// abbreviations are fixed by D-05 and consumed by classNameGenerator.ts.

export const AGE_GROUP_OPTIONS = ['U12', 'U14', 'U16', 'U18', 'Erwachsene'] as const;

export const BOW_TYPE_OPTIONS = [
  { value: 'RCV', label: 'Recurve' },
  { value: 'trad', label: 'trad. Recurve' },
  { value: 'LB', label: 'Langbogen' },
  { value: 'BB', label: 'Blankbogen' },
  { value: 'CP', label: 'Compound' },
] as const;

export const DISTANCE_OPTIONS = ['10m', '18m', '25m', '70m'] as const;
