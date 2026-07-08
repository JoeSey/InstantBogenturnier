# Phase 2: Setup & Registration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-04
**Phase:** 2-Setup & Registration
**Areas discussed:** Preset catalog & "Passe" terminology, Class definition & naming, AB / AB-CD mode & shooting lines, Preset management

---

## Preset catalog & "Passe" terminology

### What does "Passe" mean in specs.md's "30 Passen"?

| Option | Description | Selected |
|--------|-------------|----------|
| Passe = one end (Durchgang) | A set of arrows shot before walking to retrieve them | ✓ |
| Passe = one arrow (Pfeil) | Used loosely as a synonym for arrow | |
| Passe = the whole round/distance | A full distance segment | |

**User's choice:** Passe = one end (Durchgang)

### Was the "30 Passen" example number itself a typo?

| Option | Description | Selected |
|--------|-------------|----------|
| Typo — meant 30 arrows (Pfeile) | The "30" refers to total arrows, not ends | ✓ |
| Real preset, just an example number | 30 ends really is one of the presets to offer | |
| Let me describe the actual preset list | User specifies exact preset list instead | |

**User's choice:** Typo — meant 30 arrows (Pfeile). Confirms REQUIREMENTS.md's existing "10 ends of 3 arrows at 18m" interpretation was correct.

### Which WA-style round presets ship in v1?

| Option | Description | Selected |
|--------|-------------|----------|
| Standard indoor/outdoor set | WA 18m (10×3=30), WA 25m (10×3=30), WA 70m (6×6=36) | ✓ |
| Just one preset + free custom | Only 18m/10x3 as default, rely on free custom for rest | |
| Let me specify the exact list | User provides precise list | |

**User's choice:** Standard indoor/outdoor set.
**Notes:** Resolves the STATE.md blocker flag on "30 Passen" WA preset terminology ambiguity.

---

## Class definition & naming

### Free text, dropdowns, or hybrid for age-group/bow-type/distance?

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdowns with fixed options | Predefined lists for all three fields | |
| Free text for all three fields | Trainer types anything | |
| Dropdowns with an "other/custom" escape hatch | Predefined values + free-text option per field | ✓ |

**User's choice:** Dropdowns with an "other/custom" escape hatch.

### Default bow-type dropdown options?

| Option | Description | Selected |
|--------|-------------|----------|
| Recurve, Compound, Blank | Three most common categories | |
| Recurve, Compound, Blank, Langbogen | Adds Langbogen as fourth category | |
| Let me specify the exact list | User provides precise list | ✓ |

**User's choice:** Recurve (RCV), trad. Recurve (trad), Langbogen (LB), Blankbogen, Compound (CP). Follow-up question resolved Blankbogen's abbreviation as **BB**.

### Handling of duplicate app-suggested class names?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-suffix on collision | App appends a distinguishing suffix automatically | ✓ |
| Block save until trainer renames | Requires manual resolution before saving | |
| Allow duplicate names silently | No collision handling | |

**User's choice:** Auto-suffix on collision.

---

## AB / AB-CD mode & shooting lines

### What do AB and AB/CD modes concretely mean?

| Option | Description | Selected |
|--------|-------------|----------|
| AB = 2 shooters/line, AB/CD = 4 shooters/line in 2 flights | Standard target-archery pairing | ✓ |
| AB = 1 shooter/line, AB/CD = 2 shooters/line | Different capacity assumption | |
| Let me describe the actual rule | User specifies exact logic | |

**User's choice:** AB = 2 shooters/line, AB/CD = 4 shooters/line in 2 flights.

### Exact threshold that flips AB → AB/CD?

| Option | Description | Selected |
|--------|-------------|----------|
| shooterCount > 2 × lineCount → AB/CD | AB covers up to 2/line; switch once shooters exceed twice line count | ✓ |
| shooterCount > lineCount → AB/CD | Any time shooters outnumber lines, switch straight to AB/CD | |
| Let me specify the exact threshold | User provides precise formula | |

**User's choice:** shooterCount > 2 × lineCount → AB/CD.

### Shooting-line assignment during registration?

| Option | Description | Selected |
|--------|-------------|----------|
| Optional manual per-shooter, auto-fill if left blank | Trainer can pick a line; app auto-balances if blank | ✓ |
| Manual only, no auto-fill | Purely optional/manual, no automatic balancing | |

**User's choice:** Optional manual per-shooter, auto-fill if left blank.

---

## Preset management

### Fixed 8 slots, or dynamic list capped 4-8?

| Option | Description | Selected |
|--------|-------------|----------|
| Dynamic list, capped at 8, min 0 | "4-8" was a usage expectation, not a hard floor | ✓ |
| Fixed 8 slots, some may be empty | Always exactly 8 slots shown | |

**User's choice:** Dynamic list, capped at 8, min 0.

### What does a saved preset capture?

| Option | Description | Selected |
|--------|-------------|----------|
| Classes + lines + rounds only, no roster | Shooters re-registered fresh each time | ✓ |
| Everything including shooter roster | Preset also saves full shooter list | |

**User's choice:** Classes + lines + rounds only, no roster.

### Overwrite behavior on duplicate preset name?

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm before overwrite | App asks before replacing | ✓ |
| Silent overwrite | Just replaces, no confirmation | |
| Block — force a different name | Trainer must rename or delete first | |

**User's choice:** Confirm before overwrite.

### Can the trainer delete a saved preset?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, explicit delete action | Separate delete/remove control per entry | ✓ |
| No delete — only overwrite | Only way to remove is overwriting | |

**User's choice:** Yes, explicit delete action.

### Preset export/import — scope creep raised mid-discussion

User raised: "can we include an action button to export presets into a file (to transfer settings across several trainers' devices), or should we postpone that to a later phase?"

Flagged as a new capability beyond SETUP-05/06's original scope, but noted that `CLAUDE.md`'s tech-stack section already recommends `dexie-export-import` for a similar backup-insurance purpose.

| Option | Description | Selected |
|--------|-------------|----------|
| Include in Phase 2 | Add export-to-file/import-from-file using dexie-export-import | ✓ |
| Defer to a later phase | Note as deferred idea, ship local save/load only | |

**User's choice:** Include in Phase 2.

**Follow-up — export scope:**

| Option | Description | Selected |
|--------|-------------|----------|
| Export all presets as one file | Single action dumps all presets to one JSON file | ✓ |
| Export/import per individual preset | Trainer picks exactly which preset(s) to transfer | |

**User's choice:** Export all presets as one file.

---

## Claude's Discretion

- Exact age-group dropdown values and distance field UI type (free numeric vs. dropdown).
- Exact auto-suffix collision string wording and the shooting-line auto-balancing tie-breaking algorithm (round-robin in registration order is the guiding principle).
- Import conflict handling UX detail beyond "merges/replaces the full list."

## Deferred Ideas

None — the preset export/import idea was raised as potential scope creep but pulled into Phase 2 rather than deferred (see above), since it reuses an already-planned v1 dependency for a closely related purpose.
