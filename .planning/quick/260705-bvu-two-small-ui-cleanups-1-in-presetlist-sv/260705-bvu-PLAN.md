---
phase: quick
plan: 260705-bvu
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/views/PresetList.svelte
  - src/lib/components/ClassForm.svelte
  - src/lib/components/ClassForm.test.ts
  - src/lib/i18n/strings.de.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "Import button label in PresetList is right-aligned (justify-end) instead of centered, export button unchanged"
    - "Redundant 'Vorschlag: {name}' paragraph no longer renders in ClassForm; the class-name input's placeholder still shows the live suggested name"
    - "No unused i18n string or leftover test assertion referencing the removed paragraph remains"
  artifacts:
    - path: "src/lib/views/PresetList.svelte"
      provides: "import label with justify-end"
    - path: "src/lib/components/ClassForm.svelte"
      provides: "class name input with placeholder-only suggestion, no separate suggestion paragraph"
    - path: "src/lib/components/ClassForm.test.ts"
      provides: "assertion on input placeholder instead of removed paragraph text"
    - path: "src/lib/i18n/strings.de.ts"
      provides: "classNameSuggestion entry removed"
  key_links:
    - from: "src/lib/components/ClassForm.svelte"
      to: "finalSuggestedName"
      via: "input placeholder binding"
      pattern: "placeholder=\\{finalSuggestedName\\}"
---

<objective>
Two small, independent UI cleanups:

1. In PresetList.svelte, change the import button's label alignment from centered to flush-right (`justify-center` -> `justify-end`), matching the user's preference. The export button is untouched.
2. In ClassForm.svelte, remove the redundant "Vorschlag: {name}" paragraph (the identical live-suggested name already shows as the class-name input's placeholder). Remove the now-unused `classNameSuggestion` i18n string, and update the ClassForm test that currently asserts on the removed paragraph's text to instead assert on the input's placeholder.

Purpose: Reduce visual redundancy and align control styling with user preference; no behavior change to underlying data/logic.
Output: Updated PresetList.svelte, ClassForm.svelte, ClassForm.test.ts, strings.de.ts -- full test suite and `npm run check` passing.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Right-align import button label in PresetList.svelte</name>
  <files>src/lib/views/PresetList.svelte</files>
  <action>
    In the label element wrapping the hidden file input (around line 308-320, the import control in the "Vorlagen" section), change the class `justify-center` to `justify-end` in the class string `flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border ...`. Keep `items-center` unchanged (vertical centering stays). Do not modify the adjacent export button (lines 300-306) at all -- it must remain untouched, its text stays flush-left (default, no justify class).
  </action>
  <verify>
    <automated>grep -n "justify-end" src/lib/views/PresetList.svelte | grep -c "cursor-pointer"</automated>
  </verify>
  <done>The import label's class string contains `justify-end` (not `justify-center`), `items-center` is still present, and the export button's classes are unchanged (no justify-* class added).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Remove redundant class-name suggestion paragraph from ClassForm</name>
  <files>src/lib/components/ClassForm.svelte, src/lib/components/ClassForm.test.ts, src/lib/i18n/strings.de.ts</files>
  <behavior>
    - Existing test "suggests a live name from the tuple and saves a new class on submit" must still verify the live suggestion is visible before submit -- but via the input's placeholder (`screen.getByPlaceholderText('RCV-U14')` or asserting the class-name input element's `.placeholder` property equals `'RCV-U14'`) instead of `screen.findByText('Vorschlag: RCV-U14')`.
    - No test should reference the removed paragraph markup or the `classNameSuggestion` string after this change.
  </behavior>
  <action>
    In src/lib/components/ClassForm.svelte, remove the paragraph element `<p class="text-[16px] leading-[1.5] text-slate-600 dark:text-slate-300">{strings.setup.classNameSuggestion.replace('{name}', finalSuggestedName)}</p>` entirely (around line 125-127). Leave `finalSuggestedName` computation untouched and leave the class-name-override input's `placeholder={finalSuggestedName}` binding as-is (around line 135) -- this is the sole remaining place the suggested name is shown live, before submit.

    In src/lib/i18n/strings.de.ts, remove the `classNameSuggestion: 'Vorschlag: {name}',` entry (line 41) from the `setup` strings object -- grep confirms ClassForm.svelte is its only consumer, so no other file references it after removal.

    In src/lib/components/ClassForm.test.ts, update the assertion at line 22 (`await screen.findByText('Vorschlag: RCV-U14');`) to instead verify the input placeholder shows the suggested name before submit, e.g. replace with `expect(screen.getByPlaceholderText('RCV-U14')).toBeTruthy();` (or equivalently assert on the class-name input's `.placeholder` property). Preserve the surrounding comment intent ("Live suggestion updates before submit") and keep the rest of the test (submit + findByText('RCV-U14') on the resulting list item) unchanged. Do not touch the second test ("auto-suffixes with the differing field on name collision") -- it does not reference the removed paragraph.
  </action>
  <verify>
    <automated>cd /home/code/MeinBogenturnier && npx vitest run src/lib/components/ClassForm.test.ts</automated>
  </verify>
  <done>ClassForm.svelte no longer renders the "Vorschlag:" paragraph; strings.de.ts no longer has a `classNameSuggestion` key; ClassForm.test.ts asserts the live suggestion via the input placeholder and passes.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

None -- this is a pure UI/markup and string cleanup with no new trust boundary, no user input parsing changes, and no external data introduced.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | N/A | N/A | accept | No new trust boundary, external input, or dependency introduced by this change; purely cosmetic markup/string removal. |
</threat_model>

<verification>
1. `npx vitest run` -- full test suite passes, including updated ClassForm.test.ts.
2. `npm run check` -- svelte-check/type-check passes with no new errors (confirms no dangling references to removed `classNameSuggestion` string or removed paragraph).
3. Manual grep confirms `classNameSuggestion` no longer appears anywhere in src/.
4. Manual visual check (optional): PresetList "Vorlagen" section shows import button text flush-right, export button text flush-left as before.
</verification>

<success_criteria>
- PresetList.svelte import label uses `justify-end`; export button unchanged.
- ClassForm.svelte no longer contains the "Vorschlag: {name}" paragraph; `finalSuggestedName` still feeds the input's placeholder.
- strings.de.ts no longer defines `classNameSuggestion`.
- ClassForm.test.ts asserts the live suggestion via the input placeholder instead of the removed paragraph text.
- Full test suite and `npm run check` pass with no regressions.
</success_criteria>

<output>
Create `.planning/quick/260705-bvu-two-small-ui-cleanups-1-in-presetlist-sv/260705-bvu-SUMMARY.md` when done
</output>
