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

// Live class-name suggestion from the age-group/bow-type/distance tuple (D-04).
// Order: bow-type abbreviation, then age-group, then distance — only populated fields
// are joined. Falls back to a friendly placeholder when the tuple is fully empty.
export function generateClassName(ageGroup: string, bowType: string, distance: string): string {
  const parts: string[] = [];
  if (bowType) parts.push(getBowTypeAbbr(bowType));
  if (ageGroup) parts.push(ageGroup);
  if (distance) parts.push(distance);
  return parts.length > 0 ? parts.join('-') : 'Neue Klasse';
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

  if (tuple.distance && tuple.distance !== collision.distance) {
    return `${baseName}-${tuple.distance}`;
  }
  if (tuple.bowType && getBowTypeAbbr(tuple.bowType) !== getBowTypeAbbr(collision.bowType ?? '')) {
    return `${baseName}-${getBowTypeAbbr(tuple.bowType)}`;
  }
  if (tuple.ageGroup && tuple.ageGroup !== collision.ageGroup) {
    return `${baseName}-${tuple.ageGroup}`;
  }

  const existingNames = new Set(existingClasses.map((c) => c.name));
  let suffix = 2;
  let candidate = `${baseName}-${suffix}`;
  while (existingNames.has(candidate)) {
    suffix += 1;
    candidate = `${baseName}-${suffix}`;
  }
  return candidate;
}
