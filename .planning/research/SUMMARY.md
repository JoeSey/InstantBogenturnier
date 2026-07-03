# Project Research Summary

**Project:** Bogen-Trainingsturnier Verwaltung (MeinBogenturnier)
**Domain:** Offline-first, installable PWA (client-only, no backend) — archery training-tournament management
**Researched:** 2026-07-03
**Confidence:** HIGH

## Executive Summary

This is a client-only, offline-first PWA for a single judge to run an informal archery training tournament (8-14 shooters, 2-5 classes) on one device, entirely without network connectivity at the range. The domain is well-understood: dedicated tournament software (Ianseo, MS ArchersScore) all assume a server/sync model that directly conflicts with this project's core constraint, while paper/spreadsheet status quo lacks automatic sums, ranking, and reusable configuration. The genuine differentiator validated by research is "true single-device, zero-backend, zero-account offline operation" combined with a lightweight, informal class model and fast judge-optimized entry — nobody else in the space builds for this niche.

The recommended approach is a plain Svelte 5 + Vite SPA (explicitly not SvelteKit — no routing/SSR need), styled with Tailwind CSS 4, made installable via vite-plugin-pwa (generateSW strategy), and persisted entirely through Dexie.js/IndexedDB as the single source of truth (via liveQuery, not a manually-synced store). Phase navigation should be driven by a persisted tournamentMeta.status field rather than a router, doubling as both navigation state and offline-reload resilience. Domain logic (ranking, AB/AB-CD mode detection, completion detection) should be pure, framework-agnostic TypeScript, decoupled from both Dexie and Svelte, since this is the most failure-prone and highest-value-to-get-right part of the app.

The key risks are all forms of "quietly loses or corrupts data offline, precisely when there's no way to notice or recover": async IndexedDB writes lost on tab close, stale service-worker caches serving broken code at the range with no connectivity to self-heal, iOS Safari's 7-day storage eviction wiping saved presets, unmigrated Dexie schema changes crashing the app or silently dropping data, and subtle off-by-one bugs in tie-break ranking and arrow/passe tallying that only manifest with real (tied or non-default) data. Mitigations are well-documented and mostly cheap if built in from day one (eager per-field saves, autoUpdate/prompt + cleanupOutdatedCaches, navigator.storage.persist() + preset export/import, disciplined Dexie version bumps, and unit tests for ranking/tallying with tie fixtures) — but expensive to retrofit, so they should be treated as phase-exit gates rather than end-of-project polish.

## Key Findings

### Recommended Stack

The stack is largely already locked in by the user and confirmed compatible/current via npm registry and official docs: Svelte 5.56 (runes-based reactivity, no external state library needed), Vite 8.1 paired strictly with @sveltejs/vite-plugin-svelte@7 (hard peer-dependency requirement — do not mix with Vite 7), Tailwind CSS 4 via @tailwindcss/vite (CSS-first config, no tailwind.config.js), vite-plugin-pwa@1.3 using the generateSW strategy (precache-everything is correct for a static, no-API SPA), and Dexie.js 4.4 as the IndexedDB wrapper with liveQuery for reactive queries. TypeScript is recommended throughout given how much correctness rides on typed score/rank shapes.

**Core technologies:**
- Svelte 5 (runes) — UI framework, replaces need for Redux/Zustand-style state management
- Vite 8 + @sveltejs/vite-plugin-svelte@7 — build tooling; version pairing is a hard requirement, not optional
- Tailwind CSS 4 + @tailwindcss/vite — styling, supports the required glassmorphism/dark-light design
- vite-plugin-pwa (generateSW) — installability + offline precaching; a mid-session update strategy (autoUpdate vs. prompt) needs an explicit decision — see Gaps
- Dexie.js — single source of truth for all persisted data (presets, classes, shooters, scores), including small settings like theme, to avoid a second storage mechanism (localStorage)
- Deferred to v1.5: jsPDF + jspdf-autotable for PDF export/certificates (not pdf-lib — this app generates new documents, doesn't edit templates)

### Expected Features

The scope in PROJECT.md is already well-validated against the ecosystem: it correctly sits below both official-competition tooling and full dedicated software in complexity, while covering everything a club needs for a legitimate (if informal) tournament.

**Must have (table stakes):**
- Class definition (tuple: age group / bow type / distance, app-suggested names)
- Shooter registration + shooting-line count, with derived AB/AB-CD mode indication
- Round/passe configuration (WA presets + custom) — flag: clarify "30 Passen" ambiguity (30 ends vs. 30m distance) before finalizing preset values
- Per-arrow score entry (0-10, M) with M-as-zero summation enforced at a single normalization point
- Interim save/resume, explicit completion detection distinct from "save"
- Sortable score-entry table; editable until finalization
- Results ranking with shared-rank/skip-next ("1-2-2-4" standard competition ranking) tie handling, grouped per class, adaptive phone/desktop view
- Config presets (4-8 slots), offline PWA installability

**Should have (competitive differentiators):**
- True zero-backend single-device operation (validated as a genuine market gap — every dedicated tool assumes server/sync)
- Lightweight/free-form class model vs. rigid federation categories
- Fast judge-optimized entry (large touch targets, dedicated "M" key, focus-advance)
- Modern glassmorphism visual design with auto+manual dark/light mode

**Defer (v1.5/v2+):**
- PDF export of result lists + certificates, blank DIN A5 scoresheets — v1.5
- WhatsApp delivery of certificates — v2
- Open-source multi-club packaging — v2.5 (but avoid hardcoding club identity now, per existing PROJECT.md constraint, so this isn't a rewrite later)

**Explicitly anti-features (do not build):** multi-device concurrent sync, official WA/DSB X-ring countback tie-breaks and shoot-offs, athlete accounts/season history/handicaps, federation ranking-database integration, team/elimination brackets, QR-code check-in, peer-verification dual-signature scorecards. All of these solve problems this tool doesn't have and directly conflict with its offline/single-device/single-judge/session-scoped-data constraints.

### Architecture Approach

A strict layered architecture: presentational components -> phase-based "view" containers (own live queries + ephemeral UI state) -> pure domain logic (logic/*.ts, framework-agnostic) -> repository functions (db/repository.*.ts, the only code with Dexie schema knowledge) -> Dexie/IndexedDB as the single source of truth, bridged into Svelte reactivity via liveQuery wrapped in a small custom $state adapter (no manually-synced writable-store cache). Navigation between the app's four phases (Setup, Registration, Score Entry, Results) is driven by a persisted tournamentMeta.status field read by App.svelte — no router, no SvelteKit.

**Major components:**
1. Views (SetupView, RegistrationView, ScoreEntryView, ResultsView) — own live queries and ephemeral UI state (sort column, selected round/passe), call repository functions on user actions
2. Domain logic (logic/ranking.ts, mode.ts, completion.ts, className.ts, waPresets.ts) — pure, testable TypeScript with no Dexie/Svelte dependency; this is where tie-aware ranking and completion detection live, deliberately isolated since they're the most failure-prone logic in the app
3. Persistence layer (db/repository.*.ts + db/live.svelte.ts) — the only code calling db.table.*; encapsulates a two-tier lifecycle: ephemeral-but-durable live-tournament tables (wiped on "Start New Tournament") vs. durable-and-persistent presets table (one-way copy in/out, never live-linked)
4. Service Worker (vite-plugin-pwa, generateSW) — precaches the entire app shell so it loads/runs with zero connectivity

Key anti-patterns flagged: don't build a parallel writable-store cache manually synced with Dexie (creates "two sources of truth" bugs); don't persist computed rank (it's a read-time function of the whole class dataset, recompute always); don't reach for a router for phase navigation; don't split settings into localStorage alongside Dexie.

### Critical Pitfalls

1. **IndexedDB writes lost on tab/tablet close mid-entry** — async writes are not guaranteed to flush during page teardown. Fix: eager per-field/per-blur saves (not click-only "Speichern"), never rely on beforeunload. Non-negotiable for the score-entry phase.
2. **Stale service-worker cache serves broken code with no way to self-heal offline** — because the app is opened online at home, then used offline weeks later at the range. Fix: cleanupOutdatedCaches: true, test the full deploy->reload->offline cycle every phase (not just once at ship), audit globPatterns against actual runtime assets.
3. **iOS Safari evicts IndexedDB (and saved presets) after ~7 days of tab disuse** — training tournaments are occasional, so this is a real, likely-to-occur failure mode. Fix: push "Add to Home Screen" as primary onboarding (installed PWAs get a different eviction counter), call navigator.storage.persist(), and ship a cheap preset export/import as a backstop from day one.
4. **Dexie schema version bumps without .upgrade() cause VersionError crashes or silent data loss** — near-certain to occur given the schema will evolve across all 4 phases. Fix: every schema change gets a version bump + explicit upgrade callback as a standing per-phase checklist item, tested against pre-existing data, not a freshly wiped DB.
5. **Tie-break ranking implemented as the wrong convention** (dense "1223" instead of the spec's standard "1224" skip-after-ties) — easy off-by-one that only surfaces with real tied data. Fix: unit tests with explicit 2-way/3-way tie fixtures asserting exact rank numbers, from the start of the Results phase.

(Two more notable pitfalls worth carrying into planning: arrow-count-per-passe must be derived from round/passe config, never hardcoded to 3; and iOS's beforeinstallprompt-only install-button pattern silently fails on Safari — provide explicit "Share -> Add to Home Screen" instructions, not just a button.)

## Implications for Roadmap

Based on combined research, the natural phase structure follows both the app's own four tournament phases (Setup -> Registration -> Score Entry -> Results) and the dependency/pitfall structure uncovered by research — foundational offline/PWA infrastructure and pure domain logic should be established early since they're expensive to retrofit, not added at the end.

### Phase 1: Foundation — Project scaffold, offline PWA shell, Dexie schema, presets

**Rationale:** PITFALLS.md flags stale-SW-cache and dev-server-only testing as pitfalls that must be prevented from day one, not fixed near ship — and STACK.md's version-pairing constraints (Vite 8 + vite-plugin-svelte 7) and Node engine requirements need to be locked in before any feature code exists. ARCHITECTURE.md's tournamentMeta.status-driven navigation and Dexie schema (with disciplined versioning) are also foundational — every later phase depends on the schema and persistence pattern being right.
**Delivers:** Scaffolded Svelte 5 + Vite 8 + Tailwind 4 app; vite-plugin-pwa configured with generateSW, precache audited, update-flow (registerType, cleanupOutdatedCaches) decided and tested; Dexie schema v1 (presets, classes, shooters, scores, tournamentMeta) with repository layer skeleton; navigator.storage.persist() call; build->offline-airplane-mode walkthrough established as a repeatable phase-exit check.
**Addresses:** Offline PWA installability (table stakes); config preset persistence groundwork.
**Avoids:** Pitfall 2 (stale cache), Pitfall 3 (iOS eviction — install-prompt UX and persist() call), Pitfall 4 (unmigrated schema), Pitfall 7 (dev-server-only testing).

### Phase 2: Setup & Registration — Classes, lines, rounds/passes, shooters, presets

**Rationale:** FEATURES.md's dependency graph shows class definition, line count, and round/passe configuration as foundational (nothing else works without them), with shooter registration and AB/AB-CD mode detection depending on those. Config presets enhance (don't gate) this cluster, so they should be built once these are stable.
**Delivers:** SetupView (class tuple + app-suggested names, line count, round/passe config incl. WA presets, preset picker/save) and RegistrationView (shooter roster, AB/AB-CD mode indicator).
**Uses:** logic/className.ts, logic/waPresets.ts, logic/mode.ts as pure functions per ARCHITECTURE.md's separation pattern; repository.presets.ts two-tier lifecycle (one-way copy in/out).
**Implements:** Domain-logic-first pattern — write and unit-test mode.ts/className.ts before wiring UI.
**Research flag:** Resolve the "30 Passen" terminology ambiguity (ends vs. distance) with the actual user before finalizing WA preset values — this is a requirements clarification, not a technical unknown.

### Phase 3: Score Entry — Live per-arrow entry, sums, interim save, completion detection

**Rationale:** This is the app's core value ("score entry ... must work correctly and offline ... everything else is secondary" per PROJECT.md) and the single most pitfall-dense phase in PITFALLS.md (Pitfalls 1 and 6 both map here directly). It must be built with the eager-save and derived-sum patterns from the start — these are called out as "expensive to retrofit."
**Delivers:** ScoreEntryView with sortable table, per-arrow entry (0-10/M) with eager per-field IndexedDB writes, sum derived (never independently stored/editable), M-as-zero normalized at a single point, completion detection driven by actual configured round/passe/arrow-count (never hardcoded), visible per-cell "saved" state indicator.
**Addresses:** Per-arrow score entry, correct M-handling, interim save, sortable table, completion detection (all P1 table stakes).
**Avoids:** Pitfall 1 (tab-close data loss — mandatory eager-save architecture), Pitfall 6 (arrow-count/passe tallying off-by-ones), UX pitfall of no saved-state indicator. Requires a "kill tab mid-entry" test as an explicit phase-exit acceptance criterion.

### Phase 4: Results — Ranking, per-class grouping, adaptive view

**Rationale:** Depends on score entry existing and correctly summing (per FEATURES.md dependency graph); ranking is the second-most pitfall-dense area (Pitfall 5) and must be read-time-computed, never persisted (ARCHITECTURE.md Anti-Pattern 2).
**Delivers:** ResultsView with logic/ranking.ts (standard "1-2-2-4" competition ranking, computed at read time), per-class grouping, adaptive phone-dropdown/desktop-multi-column layout, visual tie indicator.
**Addresses:** Results ranking with tie handling, per-class grouping, adaptive results view (all P1 table stakes).
**Avoids:** Pitfall 5 (wrong ranking convention) — requires unit tests with 2-way/3-way tie fixtures asserting exact rank numbers before this phase is considered done.

### Phase Ordering Rationale

- Foundation-first ordering is driven directly by PITFALLS.md: stale-cache, dev-server-only-testing, and schema-migration risks are explicitly called out as "cheap to prevent early, expensive to retrofit" — they gate everything else.
- The Setup->Registration->ScoreEntry->Results ordering mirrors both PROJECT.md's own stated tournament flow and FEATURES.md's explicit dependency graph (class definition and round/passe config are prerequisites for shooter registration, which is a prerequisite for score entry, which is a prerequisite for ranking).
- Config presets are placed inside Phase 2 (not a separate phase) because FEATURES.md explicitly frames them as "enhance, rather than gate" the core config features — they should be built once classes/lines/rounds are stable, not designed first, but there's no reason to delay them to a later phase since they reuse Phase 2's data model directly.
- Domain logic (logic/*.ts) is called out in ARCHITECTURE.md as "nearly free to do correctly from day one, expensive to retrofit if entangled inside component script blocks" — each phase above should write the relevant pure logic module and its unit tests before/alongside the UI that consumes it, not after.
- PDF export (v1.5) and WhatsApp delivery (v2) are intentionally excluded from this phase structure per PROJECT.md's Out of Scope section and FEATURES.md's dependency graph ("PDF export requires Results ranking (v1)") — do not pull them into v1 phases.

### Research Flags

Needs research during planning:
- **Phase 1 (Foundation):** Moderate — the Vite 8 / Rolldown bundler and vite-plugin-pwa update-strategy decision (autoUpdate vs. prompt) has some nuance/conflicting guidance between STACK.md and PITFALLS.md worth a focused look during /gsd:plan-phase --research-phase 1 to settle the update-flow UX definitively.
- **Phase 3 (Score Entry):** Yes — the eager-save architecture and multi-dimensional Runde x Passe x Linie x Shooter data model is the most pitfall-dense and correctness-critical phase; worth a deeper look at Dexie transaction/write patterns for per-field eager saves before implementation.

Phases with standard, well-documented patterns (research-phase likely unnecessary):
- **Phase 2 (Setup & Registration):** Standard CRUD + Dexie repository pattern, well-covered by ARCHITECTURE.md's examples.
- **Phase 4 (Results):** The "1-2-2-4" ranking algorithm is a well-established, fully-specified algorithm (see ARCHITECTURE.md's worked example) — implementation risk is low, just needs disciplined unit testing.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core versions verified directly against npm registry peerDependencies/engines and Context7 docs; only the jsPDF-vs-alternatives and iOS-eviction specifics are MEDIUM (WebSearch cross-referenced, no single authoritative doc) |
| Features | MEDIUM-HIGH | WA/DSB rules and Ianseo/dedicated-tool feature sets are well-corroborated across multiple sources; some sources (single club example, general spreadsheet templates) are LOW-MEDIUM and only used for minor color, not core conclusions |
| Architecture | HIGH | Verified via Context7 official Dexie and Svelte 5 docs; the "1-2-2-4" ranking algorithm is a well-established, independently documented convention matching the spec exactly |
| Pitfalls | HIGH (mechanics) / MEDIUM (domain-specific specifics) | Dexie/vite-plugin-pwa mechanics confirmed via Context7 + official docs (HIGH); iOS storage-eviction timing and tournament-scoring-bug patterns are MEDIUM — cross-checked against WebKit/MDN and domain reasoning, not project-specific post-mortems |

**Overall confidence:** HIGH

### Gaps to Address

- **"30 Passen" terminology ambiguity** (FEATURES.md): Unclear whether PROJECT.md's example WA preset ("1 round of 30 passes") means 30 ends (approx. 90-180 arrows, unusually long for a training tournament) or is a mix-up with a 30m distance designation. Resolve directly with the user before finalizing Phase 2's WA preset catalog — flagged as a requirements clarification, not a technical unknown.
- **Tie-break convention confirmation** (PITFALLS.md Pitfall 5): The spec's shared-rank/skip-next approach is correctly scoped down from official WA X-count countback, but this is a genuine design decision, not just an implementation detail — confirm with the user/club that raw-sum shared-rank (no X-ring tiebreak) is truly intended before treating it as final.
- **registerType: 'autoUpdate' vs 'prompt' conflict**: STACK.md and PITFALLS.md recommend 'prompt' with an explicit "between tournaments" update UI (to avoid disrupting live entry if connectivity briefly returns mid-tournament), while ARCHITECTURE.md's Integration Points section suggests 'autoUpdate' for simplicity. Resolve this during Phase 1 planning — the safety argument (STACK.md/PITFALLS.md) should likely win given the core "must work correctly during live entry" value, but this should be an explicit decision, not an accidental default.
- **Post-completion score correction**: PITFALLS.md's UX Pitfalls section notes the spec doesn't fully clarify whether corrections are disallowed or merely discouraged after "Abschließen" — clarify during Phase 3/4 planning.

## Sources

### Primary (HIGH confidence)
- /sveltejs/svelte (Context7) — Svelte 5 runes API, .svelte.ts shared-state patterns
- /dexie/dexie.js and /websites/dexie (Context7) — liveQuery(), Version.upgrade(), StorageManager, IndexedDB limitations
- /vite-pwa/vite-plugin-pwa and /websites/vite-pwa-org_netlify_app (Context7) — generateSW/injectManifest, auto-update guide, virtual:pwa-register
- npm registry (npm view, checked 2026-07-03) — authoritative current versions/peerDependencies/engines for the full stack
- https://vite.dev/blog/announcing-vite8 — Vite 8.0 release details
- https://github.com/vite-pwa/vite-plugin-pwa (package.json on main + issues #726, #776, #838, #446, #33) — Vite 8 peer support, stale-cache bug reports
- MDN — Storage quotas/eviction, beforeunload event, PWA installability guides
- WebKit blog + Bugzilla #266559 — Safari storage eviction policy
- https://programming.guide/generating-competition-rankings.html — "1224" standard competition ranking algorithm
- Ianseo official site + App Store listing — dedicated tournament software feature/architecture baseline
- DSB Regeln für das Bogenschießen Teil 6 (PDF) — official German federation rules

### Secondary (MEDIUM confidence)
- WebSearch comparison sources (Joyfill, dev.to, Apryse, Nutrient, npm-compare.com) — jsPDF vs pdf-lib positioning
- MagicBell/Brainhub/Vinova roundups — iOS Safari PWA limitations, cross-checked against WebKit/Apple primary sources
- ArcheryBuddy, Archery Supplier, CalcResult — scoring rules, M-as-miss convention, end/round structure
- Wikipedia (DE) "Passe (Bogenschießen)" — German terminology confirmation
- Archers Campfire forum — MS ArchersScore/Apollon/Scorex2 community usage patterns

### Tertiary (LOW confidence)
- Bogensportverein Pang templates, Formularbox.de/Excel marketplace — single-club/general template examples, used only for minor color on existing club practice, not load-bearing for any recommendation

---
*Research completed: 2026-07-03*
*Ready for roadmap: yes*
