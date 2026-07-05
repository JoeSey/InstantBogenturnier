---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/fixtures/classOptions.ts
  - src/lib/i18n/strings.de.ts
autonomous: true
requirements: [SETUP-01]

must_haves:
  truths:
    - "Trainer sees '10m' as a selectable option in the Classes card distance dropdown, listed before '18m'"
  artifacts:
    - path: "src/lib/fixtures/classOptions.ts"
      provides: "DISTANCE_OPTIONS tuple including '10m' in ascending order"
      contains: "'10m', '18m', '25m', '70m'"
  key_links:
    - from: "src/lib/components/ClassForm.svelte"
      to: "src/lib/fixtures/classOptions.ts"
      via: "import { DISTANCE_OPTIONS } and .map() into dropdown options"
      pattern: "DISTANCE_OPTIONS"
---

<objective>
Add "10m" as a fourth predefined distance option in the Classes card's distance dropdown, in ascending numeric order.

Purpose: The trainer's club runs some training rounds at 10m (common indoor short-distance practice), which is not currently selectable without using the dropdown's "Andere" (custom) fallback.
Output: `DISTANCE_OPTIONS` in `src/lib/fixtures/classOptions.ts` becomes `['10m', '18m', '25m', '70m']`, automatically flowing into `ClassForm.svelte`'s dropdown (no component change needed — it already maps `DISTANCE_OPTIONS` generically).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/fixtures/classOptions.ts
@src/lib/components/ClassForm.svelte

<interfaces>
From src/lib/fixtures/classOptions.ts (current):
```typescript
export const DISTANCE_OPTIONS = ['18m', '25m', '70m'] as const;
```

Consumed in src/lib/components/ClassForm.svelte:11 as:
```typescript
const distanceOptions = DISTANCE_OPTIONS.map((v) => ({ value: v, label: v }));
```
This mapping is generic — no ClassForm.svelte change is required when the tuple grows.

Confirmed via full-repo grep: no `.test.ts` file asserts `DISTANCE_OPTIONS`'s exact contents or length (ClassForm.test.ts and classNameGenerator.test.ts only reference specific single distance values like '18m'/'25m' in unrelated scenarios — verified, no updates needed there).

`src/lib/i18n/strings.de.ts:38` has a separate, unused duplicate literal `distanceOptions: ['18m', '25m', '70m']` under `strings.setup` — confirmed via grep it is not imported/consumed anywhere in `src/` (dead documentation-only data mirroring the UI-SPEC). Update it too for consistency so it doesn't silently drift from the real source of truth.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add "10m" distance option and keep docs in sync</name>
  <files>src/lib/fixtures/classOptions.ts, src/lib/i18n/strings.de.ts</files>
  <action>
    In src/lib/fixtures/classOptions.ts, change line 15 from `export const DISTANCE_OPTIONS = ['18m', '25m', '70m'] as const;` to `export const DISTANCE_OPTIONS = ['10m', '18m', '25m', '70m'] as const;` (ascending order, '10m' first).
    In src/lib/i18n/strings.de.ts line 38, change `distanceOptions: ['18m', '25m', '70m'],` to `distanceOptions: ['10m', '18m', '25m', '70m'],` to keep this unused-but-descriptive literal consistent with the real source of truth (no functional consumer — confirmed via grep — this is purely to avoid stale documentation data).
    Do not touch ClassForm.svelte — its `.map()` over DISTANCE_OPTIONS is already generic and will pick up the new value automatically.
  </action>
  <verify>
    <automated>npm test -- --run 2>&1 | tail -30 && npm run check</automated>
  </verify>
  <done>DISTANCE_OPTIONS is `['10m', '18m', '25m', '70m']`; full test suite passes; `npm run check` (svelte-check/tsc) passes with no new errors; manually confirmed no test asserts the old 3-item array shape.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| n/a | Static fixture data change only — no user input, no trust boundary crossed. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|------------------|
| T-quick-01 | n/a | classOptions.ts | accept | Trivial static data change, no attack surface introduced. |
</threat_model>

<verification>
Run `npm test -- --run` and `npm run check` after the edit; both must pass with zero failures/errors. Manually confirm the dropdown in ClassForm renders "10m" as the first option (covered implicitly by existing ClassForm.test.ts render tests continuing to pass, since it exercises the same DropdownWithCustom component).
</verification>

<success_criteria>
- `DISTANCE_OPTIONS` exported from `src/lib/fixtures/classOptions.ts` equals `['10m', '18m', '25m', '70m']`
- Full test suite (`npm test -- --run`) passes with no failures
- `npm run check` passes with no new type errors
</success_criteria>

<output>
Create `.planning/quick/260705-bht-add-10m-as-a-predefined-distance-option-/260705-bht-SUMMARY.md` when done
</output>
