# Feature Research

**Domain:** Archery training-tournament scoring/management (club-level, informal, single-judge)
**Researched:** 2026-07-03
**Confidence:** MEDIUM-HIGH

## Context Note

This research compares three reference points for the domain:
1. **Official World Archery (WA) / national federation (DSB) conventions** — the rules a formal competition follows (ends, X-ring, countback tie-breaks).
2. **Dedicated tournament software** (Ianseo and similar) — what full-featured competition management tools do.
3. **How clubs actually run informal tournaments today** — paper scorecards and ad-hoc spreadsheets.

The target product (per PROJECT.md) sits deliberately *below* #1 and #2 in scope: 8-14 shooters, 2-5 classes, single judge, single offline device, no official ranking implications. Several official conventions are correctly simplified away already (see Anti-Features) — this document validates those decisions against the ecosystem rather than second-guessing them.

## Feature Landscape

### Table Stakes (Users Expect These)

Features any archery scoring tool — digital or paper — is expected to support. Missing these makes the tool unusable for its basic job.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Class/category definition (age group × bow type × distance) | Every club tournament groups shooters into comparable categories (e.g. RCV-U14, Blankbogen-Herren); results are meaningless if mixed | MEDIUM | Project's tuple model with app-suggested names matches how clubs informally name classes today (abbreviation conventions like "RCV", "BB", "LB" are community-standard, not formalized) |
| Shooter/roster registration (name, class, optional line) | Baseline requirement to know who's shooting and where | LOW | — |
| Round & end ("Passe") structure configuration | All archery scoring — paper or digital — is organized as ends (German: *Passe*) of 3 or 6 arrows, grouped into rounds. WA presets (e.g. 3-arrow indoor ends, 6-arrow outdoor ends) are the community-standard building blocks | MEDIUM | Confirm with the requester whether "30 Passen" in specs.md means 30 ends (≈90-180 arrows — unusually long for a training tournament) or is a mix-up with "30 m" distance. This is a terminology ambiguity worth resolving before roadmap, not a research gap — flagging here because it directly affects preset complexity. |
| Per-arrow score entry with constrained values (0-10, M, optional X) | This is exactly how paper scorecards work; any tool that allows free-text or unclamped numeric entry invites bad data | MEDIUM | Validation must reject anything outside {0-10, X, M} per cell |
| Correct handling of "M" (miss) as zero in sums | Classic tallying pitfall — WA scorecards record a miss explicitly as "M", and it must contribute 0 to end/round/total sums. Naive spreadsheet formulas (`=A1+B1+C1`) throw errors on text; naive JS (`parseInt('M')` → `NaN`) silently corrupts running totals if not mapped to 0 before summing | LOW-MEDIUM | Explicit mapping step required: `M/m → 0` before any arithmetic. This is the single most common "tallying bug" class in the domain — treat it as a required unit-test case, not an edge case |
| Automatic running sums (per end, per round, tournament total) | Manual arithmetic is the #1 source of paper-scorecard errors in clubs; digital tools exist specifically to remove this burden | LOW | Straightforward once M-handling above is correct |
| Mid-entry save / resume without data loss | Judge is frequently interrupted (weather, next group starting, etc.); losing entered scores is the single worst failure mode for a live-tournament tool | MEDIUM | Already speced as "interim save" — correct and necessary |
| Explicit "all entries complete" detection before finalizing | Prevents accidentally publishing/ranking incomplete results; matches how paper tournaments require every scorecard turned in before results are read out | MEDIUM | Speced correctly — distinct "complete tournament" action gated on all cells filled |
| Sortable score-entry table (by line, name, class, sum) | Judges look up shooters differently depending on context — by shooting line while walking the range, by name when a shooter approaches the table | LOW | — |
| Ranking with defined, consistent tie-break behavior | Every ranking system — official or informal — must define what happens on equal scores, or results look arbitrary/broken | LOW-MEDIUM | Project's "shared rank, skip next" (standard competition ranking, "1224" style) is a legitimate, common simplification — see Anti-Features for why *not* to do official WA countback here |
| Per-class result grouping | Results are only meaningful within a class; an unsorted flat list of all shooters regardless of class is not a "result list" by any club's definition | LOW | — |
| Shooting-line "AB" vs "AB/CD" mode indication | Standard club practice when shooter count exceeds available lines: pairs of shooters (A/B or A/B/C/D) share a boss and shoot in turns. Any club running more shooters than lines does this already, on paper | LOW-MEDIUM | Correctly identified in specs.md; deriving mode from shooter-count vs. line-count is the right approach |
| Ability to correct/edit already-entered scores before finalization | Mis-heard or mis-keyed arrow values happen constantly; paper process allows crossing out and correcting | LOW | Implicit in an editable table pre-"complete" — make sure this isn't accidentally locked down for UX polish reasons |
| Offline operability during live use | Ranges routinely have no or unreliable connectivity; this is universally cited as the reason clubs still use paper today rather than any of the online tools | MEDIUM | Core differentiator is really "offline done well," not offline itself — see Differentiators |

### Differentiators (Competitive Advantage)

Features that set this tool apart from both dedicated competition software (Ianseo, MS ArchersScore, Apollon) and the paper/spreadsheet status quo — none of which serve this specific niche well.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| True single-device, zero-backend, zero-account offline operation | Every dedicated tool found (Ianseo, MS ArchersScore, Apollon, Scorex2) assumes a server/DB/network sync model, even if "offline-capable" in parts (Ianseo Scorekeeper still syncs to a central instance). A tool that needs *nothing* beyond the browser is unique in this space and matches the actual constraint (no connectivity at the range) | MEDIUM | This is the core value already identified in PROJECT.md — validated by the ecosystem gap |
| Lightweight, free-form class model (tuple, mostly-optional fields, app-suggested names) | Dedicated tools (Ianseo, MS ArchersScore) model rigid, federation-defined categories requiring setup overhead disproportionate to an 8-14-shooter informal event | LOW-MEDIUM | Directly addresses a real friction point: club training tournaments don't map cleanly onto official category systems |
| Fast, judge-optimized per-arrow entry (numeric keypad-style, minimal taps) | The single judge is entering *all* scores for *all* shooters live — entry speed and error-resistance matter more than in official tournaments (where each archer's own group verifies their own card) | MEDIUM | Consider large touch targets, dedicated "M" button distinct from numeric keys, and default focus-advance after each arrow entered |
| Saved/reloadable tournament configuration presets (4-8 slots) | Recreates a recurring event shape (same classes, lines, rounds) in seconds; no dedicated club tool offers "quick-start from last time" as a lightweight, un-networked feature — it's usually tied to persistent server-side event history | LOW-MEDIUM | Only the configuration persists, not results — matches the explicit no-long-term-persistence decision |
| Adaptive results view (phone dropdown-per-class vs. multi-column desktop) | Dedicated tools are built desktop/kiosk-first; club trainers need this to work equally well glanced at on a phone mid-tournament and projected/viewed on a tablet at the awards moment | MEDIUM | Straightforward responsive design work, not a novel technical challenge, but rare in this specific product category |
| Modern visual design (glassmorphism, auto + manual light/dark) | Every tool surveyed (Ianseo, MS ArchersScore/Access-based, Excel templates) has utilitarian, dated UI. A polished feel is a genuine differentiator for user delight, even though it doesn't affect correctness | LOW-MEDIUM | Purely presentational; no functional dependency risk |

### Anti-Features (Commonly Requested, Often Problematic)

Features present in official/dedicated tools that would be actively wrong to build for this tool's scope — either because they solve a problem this tool doesn't have, or because they contradict its core constraints.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Multi-device concurrent score entry / real-time sync | Larger events use multiple scorers/tablets feeding a shared live leaderboard (this is Ianseo's core model) | Requires conflict resolution, network availability, or a sync backend — directly contradicts the offline, single-device, single-judge constraint already confirmed as the actual usage pattern | Single device, single judge, as already decided |
| Official WA/DSB countback tie-break (X-count, then 10-count, then 9-count) and shoot-offs | This is the *official* rule for resolving ties in real competitions and what experienced archers may expect by habit | Requires tracking X-ring separately from 10s (extra per-arrow data field and often a target-face assumption that may not hold for informal training targets), plus shoot-off/extra-end workflow — disproportionate complexity for an informal event where "shared rank, skip next" is already a legitimate, widely-understood convention (same as used in many recreational leaderboards) | Keep the already-chosen shared-rank/skip-next approach; do not add X-ring tracking |
| Athlete accounts, season-long history, handicap/classification systems | Leagues and federations track shooters across many events for handicapping or classification progression | Requires persistent identity, auth, and long-term storage — directly contradicts the explicit decision that results don't persist beyond the session and only configuration presets do | Ephemeral per-tournament shooter entries only; presets capture the *shape* of a recurring event, not shooter history |
| National federation / ranking database integration (e.g., DSB Ergebnisdienst, Ianseo network) | Official events must report results upward into ranking systems | Requires network connectivity and server-side integration — contradicts offline-first, no-backend architecture; also irrelevant since this tool explicitly does not run official competitions | None needed — this tool's results are local and informal by design |
| Team / mixed-team match-play brackets and elimination rounds | Official WA-format events include head-to-head elimination matches alongside qualification | Substantially more complex data model (matches, byes, brackets, set-point scoring) for a format this tool doesn't target — training tournaments are qualification-only by nature | Stay qualification-round-only (as already scoped) |
| QR-code / barcode athlete check-in, automated pairing algorithms | Larger events use these to speed up registration of many unknown participants | Overkill for 8-14 known club members registered by a single judge who already knows them; adds setup and hardware-dependency complexity for no time saved at this scale | Manual name/class entry, as already scoped |
| Peer-verification / dual-signature scorecards (the paper convention of two archers checking each other's card) | This is standard official practice, ensuring the descending-arrow-order convention exists in the first place | Irrelevant when a single trusted judge enters all scores directly — there's no second scorer to verify against, and forcing descending-order arrow entry only replicates a paper-era workaround with no digital purpose | Accept arrows in whatever order the judge hears/records them; do not enforce or require descending sort on entry (optional cosmetic sort in the display layer is fine, but not a data-integrity feature) |

## Feature Dependencies

```
Class definition (tuple: age/bow/distance)
    └──requires──> nothing (foundational)

Round/Pass ("Passe") configuration
    └──requires──> nothing (foundational, but should clarify "30 Passen" ambiguity before building presets)

Shooting-line count + shooter registration
    └──requires──> Class definition (to assign class per shooter)

AB / AB-CD mode indicator
    └──requires──> Shooting-line count + Shooter registration (needs shooter-count vs. line-count comparison)

Per-arrow score entry (table)
    └──requires──> Shooter registration + Round/Pass configuration (needs to know who and how many cells per end)
                       └──requires──> M-as-zero sum handling (correctness dependency, not sequencing)

Interim save / resume
    └──requires──> Per-arrow score entry (there must be entry state to save)

Completion detection ("complete tournament" action)
    └──requires──> Per-arrow score entry + Round/Pass configuration (needs to know what "all" means)

Results ranking (shared rank, skip next)
    └──requires──> Completion detection is NOT strictly required (interim results can be viewed pre-completion)
                     but DOES require Per-arrow score entry + M-as-zero sum handling

Adaptive results view (phone/desktop) ──enhances──> Results ranking

Config presets (save/reload 4-8 slots) ──enhances──> Class definition + Shooting-line count + Round/Pass configuration
    (captures these three as a reusable bundle; must be built after they exist, not before)

PDF export / certificates (v1.5, deferred) ──requires──> Results ranking (v1)
WhatsApp delivery (v2, deferred) ──requires──> PDF export (v1.5)

[Multi-device sync] ──conflicts──> [Single-device offline-first architecture]
[Official X-ring countback tie-break] ──conflicts──> [Simple shared-rank tie handling already chosen]
```

### Dependency Notes

- **Per-arrow entry requires M-as-zero handling as a correctness dependency, not a sequencing one:** this isn't a feature to build "later" — it must be correct from the first line of summing logic, since every downstream feature (running sums, completion detection, ranking) depends on sums being right.
- **Config presets enhance, rather than gate, the core config features:** presets are a convenience layer over class/line/round setup, so they should be built once those three are stable, not designed first.
- **AB/AB-CD mode indicator depends on both shooter count and line count existing:** this is a derived/computed value, not separately stored state — avoid letting it drift out of sync if either input changes later in the flow.
- **Multi-device sync conflicts with the offline-first architecture:** not a feature to "add later" without a rewrite — correctly excluded now per PROJECT.md, and this research confirms the ecosystem tools that do support it (Ianseo) pay for it with a server dependency this project has deliberately avoided.
- **Official X-ring countback conflicts with the chosen shared-rank approach:** these are mutually exclusive tie-break philosophies; do not attempt to support both, and do not let a future "for correctness" instinct reintroduce X-ring tracking without revisiting this trade-off explicitly.

## MVP Definition

### Launch With (v1)

Minimum viable product — matches PROJECT.md's Active requirements, validated against ecosystem norms above as genuinely load-bearing.

- [ ] Class definition (tuple, app-suggested names) — foundational, nothing else works without categorization
- [ ] Shooting-line count setting — needed to derive AB/AB-CD mode
- [ ] Round/pass configuration (WA presets + custom) — resolve the "30 Passen" ambiguity before finalizing preset values
- [ ] Shooter registration (name, class, optional line) — foundational roster
- [ ] AB/AB-CD mode indication — standard club practice, low cost, high situational value
- [ ] Per-arrow score entry table with valid-value constraints (0-10, M) — core value-delivery feature
- [ ] Correct M-as-zero summation at every level (end/round/total) — non-negotiable correctness requirement
- [ ] Interim save — protects against live-tournament data loss
- [ ] Completion detection + distinct "complete tournament" action — prevents premature/incomplete results
- [ ] Sortable score-entry table — matches how judges actually look up shooters
- [ ] Results ranking with shared-rank/skip-next tie handling — simple, sufficient, and correctly scoped down from official countback
- [ ] Per-class result grouping with adaptive phone/desktop view — results only mean something within a class
- [ ] Config presets (4-8 slots) — high value relative to low complexity, directly reduces setup friction for recurring events
- [ ] Offline PWA installability — the core constraint the whole product exists to satisfy

### Add After Validation (v1.x)

- [ ] PDF export of result lists and per-shooter certificates — trigger: v1 proves the scoring/ranking flow works reliably across a few real tournaments
- [ ] Blank pre-printed scoresheets (DIN A5) — trigger: demand for a paper fallback/backup during entry, or pre-collecting scores from multiple lines before centralized entry

### Future Consideration (v2+)

- [ ] WhatsApp delivery of certificates — defer until PDF export (v1.5) is solid; adds an external-integration dependency
- [ ] Open-source packaging / multi-club distribution — defer until the single-club tool has proven itself; architecture should avoid hardcoding club identity now so this isn't a rewrite later (already a stated constraint)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Per-arrow entry + correct M-handling | HIGH | MEDIUM | P1 |
| Class definition (tuple model) | HIGH | MEDIUM | P1 |
| Round/pass configuration (presets + custom) | HIGH | MEDIUM | P1 |
| Interim save / resume | HIGH | MEDIUM | P1 |
| Results ranking + tie handling | HIGH | LOW-MEDIUM | P1 |
| AB/AB-CD mode indicator | MEDIUM | LOW | P1 |
| Adaptive results view | MEDIUM | MEDIUM | P1 |
| Config presets (save/reload) | MEDIUM-HIGH | LOW-MEDIUM | P1 |
| Offline PWA packaging | HIGH | MEDIUM | P1 |
| Glassmorphism / dark-light design | MEDIUM | LOW-MEDIUM | P2 |
| PDF export + certificates | MEDIUM | MEDIUM-HIGH | P2 |
| Blank scoresheet printing | LOW-MEDIUM | LOW-MEDIUM | P2 |
| WhatsApp delivery | LOW | MEDIUM | P3 |
| Open-source multi-club packaging | LOW (now) | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Ianseo / MS ArchersScore / Apollon (dedicated software) | Paper scorecard / Excel spreadsheet (status quo) | This App's Approach |
|---------|----------------------------------------------------------|---------------------------------------------------|----------------------|
| Setup model | Server/DB-backed, often requires Access Runtime or hosted instance, QR-code device setup | Zero setup, but manual and error-prone | Client-only PWA, saved presets for instant recurring setup |
| Offline support | Partial — device app may cache but syncs to central server when possible | Fully offline by nature (it's paper) | Fully offline by design, IndexedDB-backed |
| Category/class model | Rigid, federation-defined categories | Whatever the organizer writes by hand | Flexible tuple model with suggested names |
| Score entry | Large-button scoring UI, arrow-by-arrow, real-time end totals | Handwritten, descending-order convention, manual sums | Per-arrow table entry, automatic sums, M-as-zero handled explicitly |
| Tie-break | Full WA countback (X-count, 10s, 9s) plus shoot-offs | Ad hoc, often just "check the judge" | Shared rank, skip next (explicit, simple, documented) |
| Multi-device | Yes — core feature for large events | N/A | Explicitly not supported — single device/judge |
| Results distribution | Network publishing, live leaderboards | Read aloud / posted paper list | On-device display now; PDF export planned for v1.5 |
| Long-term data | Persistent athlete/event history | Whatever the club chooses to file away | Only config presets persist; results are session-scoped |

## Sources

- [World Archery Rulebook (index)](https://www.worldarchery.sport/rulebook) — MEDIUM confidence (navigation reached, specific article text not directly retrievable, corroborated via multiple secondary summaries below)
- [Archery Scoring: Complete Guide to Scoring Rules & Systems — ArcheryBuddy](https://www.archerybuddy.app/articles/archery-scoring-rules-guide) — M-as-miss recording, X-ring tie-break mechanics — MEDIUM confidence
- [Archery Scoring: Complete System Explained — Archery Supplier](https://archerysupplier.com/archery-scoring-guide/) — descending-order arrow recording convention — MEDIUM confidence
- [Archery Terminology Reference — CalcResult](https://www.calcresult.com/reference/archery/archery_dictionary.html) and related search summary — end/round structure (3 vs 6 arrows, indoor vs outdoor) — MEDIUM confidence
- [Passe (Bogenschießen) — Wikipedia (German)](https://de.wikipedia.org/wiki/Passe_(Bogenschie%C3%9Fen)) — confirms "Passe" = German term for WA "end," 3-arrow (indoor) or 6-arrow (outdoor) — MEDIUM-HIGH confidence
- [DSB Regeln für das Bogenschießen Teil 6 (PDF)](https://www.dsb.de/fileadmin/DSB.DE/PDF/PDF_2021/2000204_DSB_Teil_06_2021-safe.pdf) — official German federation rules referenced for Passe/tie-break conventions — HIGH confidence (official source, referenced via search summary; not directly fetched in full)
- [Ianseo (official site)](https://www.ianseo.net/) and [Ianseo Scorekeeper NG — App Store](https://apps.apple.com/us/app/ianseo-scorekeeper-ng/id1631394400) — dedicated tournament software feature set, network/server model — HIGH confidence (official product descriptions)
- [Archers Campfire forum: tournament organization software discussion](https://www.archers-campfire.rocks/index.php?topic=8772.0) — MS ArchersScore, Apollon, Scorex2, spreadsheet/manual practices among clubs — MEDIUM confidence (community forum, cross-referenced across multiple posters)
- [Bogensportverein Pang — Vorlagen](https://www.svpang-bogensport.de/index.php/sport/technik/vorlagen) — example of German club-level result-list/template practices — LOW-MEDIUM confidence (single club example, not verified in detail)
- Formularbox.de / Excel tournament template search results — general spreadsheet-based ranking/result-list conventions used by German clubs — LOW-MEDIUM confidence (general template marketplace, not archery-specific)

---
*Feature research for: Archery training-tournament scoring/management (informal club use)*
*Researched: 2026-07-03*
