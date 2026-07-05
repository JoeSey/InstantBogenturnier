---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/utils/classNameGenerator.ts
  - src/lib/utils/classNameGenerator.test.ts
autonomous: true
requirements: [SETUP-01]

must_haves:
  truths:
    - "Generated class names show 'E' instead of 'Erwachsene' for adult classes (e.g. 'RCV-E-18m')"
    - "The Classes card dropdown still displays and stores the full 'Erwachsene' label — unaffected by this change"
    - "Collision auto-suffixing appends 'E' (not 'Erwachsene') when ageGroup is the differentiating field"
  artifacts:
    - path: "src/lib/utils/classNameGenerator.ts"
      provides: "getAgeGroupAbbr(ageGroup) mapping 'Erwachsene' -> 'E', all other values pass through unchanged"
      contains: "export function getAgeGroupAbbr"
  key_links:
    - from: "src/lib/utils/classNameGenerator.ts generateClassName()"
      to: "getAgeGroupAbbr()"
      via: "direct function call replacing raw ageGroup push"
      pattern: "getAgeGroupAbbr\\(ageGroup\\)"
    - from: "src/lib/utils/classNameGenerator.ts autoSuffixOnCollision()"
      to: "getAgeGroupAbbr()"
      via: "abbreviated value used in candidate suffix string, raw value still used for the differs-from-collision comparison"
      pattern: "getAgeGroupAbbr\\(tuple\\.ageGroup\\)"
---

<objective>
Add "E" as the generated-name abbreviation for the "Erwachsene" age-group option, mirroring the existing `getBowTypeAbbr` pattern, without touching the ClassForm dropdown's stored/displayed value.

Purpose: The trainer wants generated class names to read "RCV-E-18m" instead of "RCV-Erwachsene-18m" — shorter, consistent with the other age-group values (U12/U14/U16/U18) which are already abbreviations themselves.
Output: A new `getAgeGroupAbbr()` helper in `classNameGenerator.ts`, wired into `generateClassName()` and `autoSuffixOnCollision()`'s ageGroup-suffix branch; `AGE_GROUP_OPTIONS` and `ClassForm.svelte`'s dropdown are untouched.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/utils/classNameGenerator.ts
@src/lib/utils/classNameGenerator.test.ts
@src/lib/fixtures/classOptions.ts

<interfaces>
From src/lib/utils/classNameGenerator.ts (current, full file already read — no re-read needed):
```typescript
export function getBowTypeAbbr(bowType: string): string {
  if (!bowType) return bowType;
  const match = BOW_TYPE_OPTIONS.find((opt) => opt.label === bowType || opt.value === bowType);
  return match ? match.value : bowType;
}

export function generateClassName(ageGroup: string, bowType: string, distance: string): string {
  const parts: string[] = [];
  if (bowType) parts.push(getBowTypeAbbr(bowType));
  if (ageGroup) parts.push(ageGroup);          // <- change to getAgeGroupAbbr(ageGroup)
  if (distance) parts.push(distance);
  return parts.length > 0 ? parts.join('-') : 'Neue Klasse';
}

export function autoSuffixOnCollision(
  baseName: string,
  tuple: { ageGroup?: string; bowType?: string; distance?: string },
  existingClasses: ClassRecord[]
): string {
  // ...distance branch, bowType branch (both use getBowTypeAbbr for BOTH the comparison
  // and the candidate string — bowType's raw values ('Recurve') differ from abbreviated
  // ('RCV'), so both sides of the comparison must go through getBowTypeAbbr)...
  if (tuple.ageGroup && tuple.ageGroup !== collision.ageGroup) {   // <- comparison stays RAW (see reasoning below)
    const candidate = `${baseName}-${tuple.ageGroup}`;              // <- candidate needs getAgeGroupAbbr(tuple.ageGroup)
    if (!existingNames.has(candidate)) return candidate;
  }
  // ...numeric fallback...
}
```

Unlike `bowType` (where the raw label "Recurve" and the abbreviation "RCV" are genuinely different strings that could each independently equal `collision.bowType`), `ageGroup`'s raw stored value IS already what's compared on both sides here — `tuple.ageGroup` and `collision.ageGroup` are both raw dropdown values (e.g. both 'Erwachsene', or 'U14' vs 'Erwachsene'). The `getAgeGroupAbbr` mapping is injective (only 'Erwachsene' -> 'E'; every other value passes through unchanged), so comparing raw values produces the identical differs/doesn't-differ result as comparing abbreviated values would. Therefore: keep the `tuple.ageGroup !== collision.ageGroup` comparison on RAW values, and apply `getAgeGroupAbbr()` only when building the candidate suffix string.

From src/lib/fixtures/classOptions.ts (unchanged by this plan, for reference only):
```typescript
export const AGE_GROUP_OPTIONS = ['U12', 'U14', 'U16', 'U18', 'Erwachsene'] as const;
```

Confirmed via grep: `ClassForm.test.ts` has no assertion on `AGE_GROUP_OPTIONS` contents or the "Erwachsene" label/value (only one unrelated `ageGroup: 'U14'` fixture) — no test updates needed there. `PresetSave.test.ts` and `PresetList.test.ts` also only use `'U14'` fixtures — unaffected.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add getAgeGroupAbbr and wire it into name generation</name>
  <files>src/lib/utils/classNameGenerator.ts, src/lib/utils/classNameGenerator.test.ts</files>
  <behavior>
    - getAgeGroupAbbr('Erwachsene') -> 'E'
    - getAgeGroupAbbr('U14') -> 'U14' (already-abbreviated values pass through unchanged)
    - getAgeGroupAbbr('Andere-Freitext') -> 'Andere-Freitext' (custom free text passes through unchanged)
    - getAgeGroupAbbr('') -> '' (empty passes through, matching getBowTypeAbbr's empty-guard behavior)
    - generateClassName('Erwachsene', 'RCV', '18m') -> 'RCV-E-18m'
    - autoSuffixOnCollision: when ageGroup is the sole differing field and tuple.ageGroup is 'Erwachsene', the candidate suffix is '-E' (not '-Erwachsene')
  </behavior>
  <action>
    In src/lib/utils/classNameGenerator.ts, add an exported `getAgeGroupAbbr(ageGroup: string): string` function directly below `getBowTypeAbbr` (same file section, same style/comment conventions). Implementation: guard on falsy input returning it unchanged (mirroring getBowTypeAbbr's `if (!bowType) return bowType;` guard), then return `'E'` when the input is exactly `'Erwachsene'`, otherwise return the input unchanged. Do not build a lookup table or restructure AGE_GROUP_OPTIONS — a direct string comparison is sufficient since there is exactly one mapped value.

    In `generateClassName()`, change `if (ageGroup) parts.push(ageGroup);` to `if (ageGroup) parts.push(getAgeGroupAbbr(ageGroup));`.

    In `autoSuffixOnCollision()`'s ageGroup branch, keep the comparison `tuple.ageGroup !== collision.ageGroup` on RAW values (do not wrap either side in getAgeGroupAbbr — see reasoning in the interfaces block above: the mapping is injective so raw comparison yields identical results and avoids an unnecessary call). Change only the candidate-string line from `` `${baseName}-${tuple.ageGroup}` `` to `` `${baseName}-${getAgeGroupAbbr(tuple.ageGroup)}` ``.

    Update the function-level comment above `generateClassName` (currently describing "bow-type abbreviation, then age-group, then distance") to note age-group is now also abbreviated, consistent with bow-type.

    Add tests to classNameGenerator.test.ts per the `<behavior>` block above: a new `describe('getAgeGroupAbbr', ...)` block (mirroring the existing `getBowTypeAbbr` describe block's structure — one `it` per mapping case above), a new `it` in the `generateClassName` describe block for the 'Erwachsene' -> 'E' case, and a new `it` in the `autoSuffixOnCollision` describe block for the ageGroup-differs collision case using the same fixture-construction style as the existing "appends the differing field (distance priority)" test (same-distance, same-bowType, differing-ageGroup so only the ageGroup branch triggers).

    Do not modify src/lib/components/ClassForm.svelte, src/lib/components/ClassForm.test.ts, or src/lib/fixtures/classOptions.ts — confirmed via grep that no test there asserts on the "Erwachsene" label/value and the dropdown's stored value must remain the full word per the task description.
  </action>
  <verify>
    <automated>npm test -- --run 2>&1 | tail -40 && npm run check</automated>
  </verify>
  <done>getAgeGroupAbbr is exported and covered by tests for 'Erwachsene', an already-abbreviated value (U14), custom free text, and empty string; generateClassName('Erwachsene', 'RCV', '18m') returns 'RCV-E-18m' (test added); autoSuffixOnCollision returns a '-E' suffix (not '-Erwachsene') when ageGroup is the differentiating field (test added); full test suite passes; npm run check passes with no new errors.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| n/a | Pure string-mapping helper on already-validated internal dropdown/tuple values — no external/user-supplied input crosses a new trust boundary. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-quick-01 | n/a | getAgeGroupAbbr | accept | Trivial pure-function string mapping over a closed, already-trusted value set (dropdown options or free-text class-name fragments); no new attack surface. |
</threat_model>

<verification>
Run `npm test -- --run` and `npm run check` after the edit; both must pass with zero failures/errors. Manually confirm (via the added tests) that `generateClassName('Erwachsene', 'RCV', '18m')` returns `'RCV-E-18m'` and that the ClassForm dropdown behavior is unaffected (no changes to ClassForm.svelte or classOptions.ts).
</verification>

<success_criteria>
- `getAgeGroupAbbr` exported from `src/lib/utils/classNameGenerator.ts`, mapping `'Erwachsene'` -> `'E'` and passing all other values through unchanged
- `generateClassName()` and `autoSuffixOnCollision()` both use the abbreviated form when building generated/suffix strings
- `AGE_GROUP_OPTIONS`, `ClassForm.svelte`, and `ClassForm.test.ts` remain unmodified — dropdown still shows/stores full "Erwachsene"
- Full test suite (`npm test -- --run`) passes with no failures
- `npm run check` passes with no new type errors
</success_criteria>

<output>
Create `.planning/quick/260705-bnb-add-e-as-abbreviation-for-erwachsene-age/260705-bnb-SUMMARY.md` when done
</output>
</content>
