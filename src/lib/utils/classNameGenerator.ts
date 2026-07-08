import { BOW_TYPE_OPTIONS } from '../fixtures/classOptions';
import type { ClassRecord } from '../db/schema';

// Resolve a bow-type value/label to its short abbreviation (D-05). Accepts either the
// full label ("Recurve") or an already-abbreviated value ("RCV") so callers never need
// to know which form they're holding; unrecognized/custom ("Andere") text passes through
// unchanged.
export function getBowTypeAbbr(bowType: string): string {
  if (!bowType) return bowType;
  const match = BOW_TYPE_OPTIONS.find((opt) => opt.label === bowType || opt.value === bowType);
  return match ? match.value : bowType;
}

// Resolve an age-group value to its short abbreviation, mirroring getBowTypeAbbr's
// pattern. Only "Erwachsene" has a longer full-word form that needs shortening — the
// other options (U12/U14/U16/U18) are already abbreviations and pass through unchanged,
// as does any custom free text.
export function getAgeGroupAbbr(ageGroup: string): string {
  if (!ageGroup) return ageGroup;
  return ageGroup === 'Erwachsene' ? 'E' : ageGroup;
}

// Live class-name suggestion from the age-group/bow-type/distance tuple (D-04).
// Order: bow-type abbreviation, then age-group abbreviation, then distance — only
// populated fields are joined. Falls back to a friendly placeholder when the tuple is
// fully empty.
export function generateClassName(ageGroup: string, bowType: string, distance: string): string {
  const parts: string[] = [];
  if (bowType) parts.push(getBowTypeAbbr(bowType));
  if (ageGroup) parts.push(getAgeGroupAbbr(ageGroup));
  if (distance) parts.push(distance);
  return parts.length > 0 ? parts.join('-') : 'Neue Klasse';
}

// Resolve a bow-type value/abbreviation to its full display label, mirroring
// getBowTypeAbbr's lookup but returning `label` instead of `value`.
export function getBowTypeLabel(bowType: string): string {
  if (!bowType) return bowType;
  const match = BOW_TYPE_OPTIONS.find((opt) => opt.label === bowType || opt.value === bowType);
  return match ? match.label : bowType;
}

// Re-expands an auto-generated short class name ("BB-U16-18m") back into a readable
// long form ("Blankbogen U16 auf 18m") for PDF output (results table + certificates).
// Only expands when `cls.name` still matches what generateClassName() would produce
// from the current ageGroup/bowType/distance tuple — if the trainer has edited the name
// by hand, there's no way to tell which parts are still "current", so the manual name is
// printed as-is instead of guessing.
export function expandClassName(cls: { name: string; ageGroup?: string; bowType?: string; distance?: string }): string {
  const auto = generateClassName(cls.ageGroup ?? '', cls.bowType ?? '', cls.distance ?? '');
  if (cls.name !== auto) return cls.name;

  const parts: string[] = [];
  if (cls.bowType) parts.push(getBowTypeLabel(cls.bowType));
  if (cls.ageGroup) parts.push(cls.ageGroup);
  const label = parts.join(' ');

  if (!label) return cls.name;
  return cls.distance ? `${label} auf ${cls.distance}` : label;
}

// Auto-suffix on collision (D-07): when `baseName` already exists, append the first
// differing field's own value (priority: distance > bowType > ageGroup) — never a
// random or bare numeric id when a semantic option exists. Only falls back to a
// numeric `-2`, `-3`, ... suffix when the tuple is fully identical to the colliding
// record (no differing field available to disambiguate with).
export function autoSuffixOnCollision(
  baseName: string,
  tuple: { ageGroup?: string; bowType?: string; distance?: string },
  existingClasses: ClassRecord[]
): string {
  const collision = existingClasses.find((c) => c.name === baseName);
  if (!collision) return baseName;

  // WR-02: each semantic disambiguator below only resolves the *first* collision found
  // above — it must still be re-checked against the full existingClasses list before
  // being returned, otherwise a candidate like "RCV-U14-25m" can itself already be
  // taken by an unrelated third class, and Dexie's `name` index (no unique constraint)
  // would happily insert a duplicate-named row.
  const existingNames = new Set(existingClasses.map((c) => c.name));

  if (tuple.distance && tuple.distance !== collision.distance) {
    const candidate = `${baseName}-${tuple.distance}`;
    if (!existingNames.has(candidate)) return candidate;
  }
  if (tuple.bowType && getBowTypeAbbr(tuple.bowType) !== getBowTypeAbbr(collision.bowType ?? '')) {
    const candidate = `${baseName}-${getBowTypeAbbr(tuple.bowType)}`;
    if (!existingNames.has(candidate)) return candidate;
  }
  if (tuple.ageGroup && tuple.ageGroup !== collision.ageGroup) {
    const candidate = `${baseName}-${getAgeGroupAbbr(tuple.ageGroup)}`;
    if (!existingNames.has(candidate)) return candidate;
  }

  // Fall through to a numeric suffix once every semantic disambiguator either doesn't
  // apply or is itself already taken.
  let suffix = 2;
  let candidate = `${baseName}-${suffix}`;
  while (existingNames.has(candidate)) {
    suffix += 1;
    candidate = `${baseName}-${suffix}`;
  }
  return candidate;
}
