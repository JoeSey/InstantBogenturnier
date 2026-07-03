# Pitfalls Research

**Domain:** Offline-first PWA for live tournament/scoring data entry (single device, archery range, zero connectivity)
**Researched:** 2026-07-03
**Confidence:** HIGH (Dexie/vite-plugin-pwa mechanics via Context7 + official docs), MEDIUM (iOS storage-eviction specifics via WebSearch, cross-checked against WebKit/MDN), MEDIUM (tournament-scoring bugs via domain reasoning + WA archery rules, not project-specific post-mortems)

## Critical Pitfalls

### Pitfall 1: IndexedDB writes lost on tab close because `beforeunload` cannot guarantee async completion

**What goes wrong:**
A trainer taps "Speichern" mid-entry (or just closes the tab/browser, or the tablet auto-locks), and the last few score updates never actually land in IndexedDB. Dexie/IndexedDB transactions are asynchronous; the spec (via the W3C IndexedDB spec and confirmed by multiple browser vendors) does **not** guarantee that a transaction in flight will complete during page teardown. Depending on browser, hardware speed, and how much data is being written, some or all of the pending writes silently vanish — with no error surfaced to the user.

**Why it happens:**
Developers assume "I called `db.table.put()` and it resolved" is the same as "data is durably on disk," or they wire up `save on beforeunload` as a safety net without realizing that's exactly the unsupported pattern (async write initiated during teardown, with no guarantee it flushes). This is a well-known IndexedDB gotcha, not a Dexie bug.

**How to avoid:**
- Never treat `beforeunload`/`pagehide` as the primary save trigger. Save eagerly and continuously (e.g., write to IndexedDB on every arrow-value change or every field blur, not just on a manual "Speichern" click) so there is never more than one field's worth of unsaved state at any moment.
- Await every write and update in-memory/UI "saved" state only after the promise resolves — never assume-and-move-on.
- Treat the manual "Speichern"/"Abschließen" buttons as explicit checkpoints for state transitions (interim vs. complete), not as the only persistence mechanism — the underlying score values should already be persisted well before the button is pressed.
- Because this is single-device/single-tab (per PROJECT.md), you don't need multi-tab write coordination — but you do need "assume the tab can die at any instant" as the working assumption for entry granularity.

**Warning signs:**
- Score entry UI only writes to IndexedDB on explicit button click rather than per-cell/per-field.
- No manual test exists for "kill the tab mid-entry, reopen, confirm state" during Phase 3 development.
- Reliance on `window.onbeforeunload` to trigger a save.

**Phase to address:**
Phase covering live score entry (specs.md Phase 3 — score entry table). Should be a stated acceptance criterion: "killing the browser mid-entry loses at most the current unsaved field."

---

### Pitfall 2: Service worker serves a stale app shell after deployment, especially dangerous because the app is used offline at the range

**What goes wrong:**
`vite-plugin-pwa` precaches `index.html` along with hashed JS/CSS bundles. Even though asset filenames are content-hashed, `index.html` itself can remain cached, so a new deploy silently keeps serving old JS/CSS referencing outdated (or removed) API/module paths — a well-documented class of vite-plugin-pwa issues (GitHub #726, #776, #838: white screens, "old runtime cache is not clearing"). For this project specifically, the trainer may open the app once at home (online, gets version A cached), then use it two weeks later at the range (offline) — if version B was deployed in between but never actually activated on that device, they're stuck on stale code with no way to fetch the update (no connectivity at the range to even attempt it), and no fallback because they assumed the "installed" app was current.

**Why it happens:**
Developers pick `registerType: 'prompt'` (or leave default) without wiring the `virtual:pwa-register` update-prompt UI, so `onNeedRefresh` never fires anything the user sees — the update silently downloads but is never activated because activation requires either `skipWaiting`/`clientsClaim` (autoUpdate) or a user-triggered reload. Or they use `autoUpdate` but the update check only happens on load, and load happened offline, so it fails to check and quietly continues on the current cached version (which is actually the safe behavior, but only if the developer confirms cached-and-working, not cached-and-broken).

**How to avoid:**
- Use `registerType: 'autoUpdate'` so updates apply automatically the next time the app is opened *with* connectivity, without requiring the trainer to notice/click anything.
- Explicitly enable `cleanupOutdatedCaches: true` (default for `generateSW` strategy, verify it's not disabled) so stale runtime caches from previous versions don't accumulate or get served.
- Test the actual update flow before every release: deploy, load app while online (confirm new SW installs + activates + reloads), then go offline and confirm the new version still works fully offline (not just "installed" but "functionally complete offline" — every route/asset the tournament flow touches must be in the precache list, not fetched lazily at runtime).
- Because this app must work zero-connectivity at the range, do NOT rely on `runtimeCaching`/network-first strategies for anything used during live tournament flow — everything in the Phase 1-4 tournament flow (specs.md) must be in the SW precache manifest (`generateSW` / `globPatterns`), not fetched on demand.
- Recommend the trainer open the app once with connectivity shortly before heading to the range (document this as a "before you leave" step) since a stale-but-broken app can't self-heal without a network check.

**Warning signs:**
- No explicit `registerType` set (defaults can change between vite-plugin-pwa versions).
- No test plan step for "deploy → reload → verify offline still works" before shipping a release.
- Any dynamic import / lazy-loaded route not covered by `globPatterns`, discovered only when tested offline.

**Phase to address:**
Foundational/infrastructure phase (PWA + offline shell setup, before feature phases). Should be a hard gate: "app must fully complete a tournament (Phases 1-4 of specs.md) with airplane mode enabled" as a phase-exit test.

---

### Pitfall 3: Browser silently evicts IndexedDB data (and cached configuration presets) after a period of disuse — especially on iOS/Safari

**What goes wrong:**
Safari's Intelligent Tracking Prevention deletes IndexedDB, LocalStorage, and Service Worker registrations after 7 days without user interaction with the site *in Safari itself*. This is confirmed via WebKit bug tracking and Apple's own storage-policy blog. The trainer saves 4-8 tournament configuration presets, doesn't run a training tournament for a few weeks (plausible — training tournaments are occasional, per PROJECT.md context of "one official tournament per year" being the norm), opens the app at the next event, and finds the presets gone with no warning and no recovery path.

**Why it happens:**
Developers test actively during development (constant interaction resets the eviction timer) and never simulate "unused for N weeks," so this only surfaces in production, long after ship, when it looks like random unexplained data loss.

**How to avoid:**
- If the PWA is added to the home screen (standalone display mode), it runs outside Safari's own eviction counter and gets its own usage-based counter — **actively push "Install/Add to Home Screen" as the primary onboarding step**, not an optional nicety, specifically to sidestep the 7-day Safari-tab eviction window. Document this clearly in onboarding UI/README, since this is a real behavioral difference (browser tab vs. installed PWA) users won't intuit.
- Call `navigator.storage.persist()` on first load (with a check via `navigator.storage.persisted()`), understanding it improves eviction resistance but is not a hard guarantee, especially on iOS where the persistence API has inconsistent effect.
- Treat saved presets as valuable-but-not-irreplaceable: since presets are the only long-term persisted data (results are explicitly out of scope for persistence per PROJECT.md), consider a low-effort export/import (e.g., copy-pasteable JSON blob, or simple downloadable file) as a backstop against silent eviction — cheap insurance against a real, documented browser behavior.
- Do not assume desktop Chrome/Firefox have the same eviction risk profile as iOS Safari — iOS is the highest-risk platform here since archery ranges are likely mobile/tablet-first usage.

**Warning signs:**
- No "Install this app" prompt/instructions shown to the user.
- No `navigator.storage.persist()` call anywhere in the codebase.
- No export/backup path for saved presets.

**Phase to address:**
Phase covering configuration presets (specs.md "4-8 saved tournament configurations") and the PWA installability phase — these should ship together, since the persistence guarantee is directly tied to installation.

---

### Pitfall 4: Dexie schema version bump without (or with incorrect) `upgrade()` causes silent data loss or `VersionError` crashes

**What goes wrong:**
Any change to the Dexie schema (adding a field, changing an index, renaming a table) requires bumping `db.version(N)` and, if data already exists at a lower version, providing a matching `.upgrade()` callback to migrate it. Skipping this either throws a `VersionError` on existing installs (app fails to open entirely — a hard blocker mid-development-iteration or post-release) or, if the developer just deletes/recreates a table between versions, silently drops any data that was in it. Since this project iterates fast (single developer, greenfield, one milestone with 4 phases) and the schema *will* change across those phases (e.g., adding shooting-line assignment after the shooter table already exists, or restructuring the classes tuple), this is a near-certainty during development, and version-mismatch bugs are easy to miss until a real device with existing test data hits it.

**Why it happens:**
Devs treat local IndexedDB like a disposable dev DB during early development (true), then forget to switch that mental model to "must migrate" once presets/results are things a user actually created and cares about — and they conflate "the app still works in my browser" (because devtools were used to wipe storage) with "the migration is correct" (untested against a browser that still has old-version data).

**How to avoid:**
- Every schema change gets a new `db.version(N)` with an explicit `.upgrade()` step, even if the "migration" is a no-op default — never rely on Dexie inferring intent.
- Because tournament configuration presets are the only long-lived Dexie data (results are explicitly not persisted long-term per PROJECT.md Out of Scope), migrations mainly need to protect the presets table — write a small manual test: create a preset on schema version N, bump to N+1 with a real schema change, reload, confirm the preset survived and was transformed correctly.
- Avoid destructive schema changes (dropping/renaming fields) without a data-preserving `.modify()` step in `upgrade()`, per Dexie's documented pattern.
- Keep version bumps additive where possible during active development to minimize migration complexity; only do the harder migrations once the schema stabilizes.

**Warning signs:**
- Schema changes committed without a corresponding version bump or upgrade function.
- No test coverage exercising "open app with pre-existing data from previous schema version."
- Console errors like `VersionError` or `UpgradeError` appearing during dev and being dismissed by just clearing site data (which masks the real bug for actual users who can't/won't do that).

**Phase to address:**
Every phase that touches the Dexie schema (all of Phases 1-4 conceptually touch presets or tournament state) — should be a standing checklist item in each phase's definition of done, not a one-time thing.

---

### Pitfall 5: Tie-break ranking implemented as "dense rank" instead of the specified "standard competition rank" (skip after ties)

**What goes wrong:**
The spec explicitly states: "Bei Punktgleichheit wird der jeweilige Platz zwei Mal vergeben und der nächste übersprungen" (tied scores share a rank, and the next rank is skipped) — e.g., two shooters tied for 2nd both show rank 2, and the next shooter is rank 4, not rank 3. This is "standard competition ranking" (1-2-2-4), distinct from "dense ranking" (1-2-2-3). It's an easy off-by-one to get wrong, especially if a developer reaches for a generic "assign rank by sorted index" implementation (which naturally produces 1-2-2-4 only if done correctly by index, but produces 1-2-2-3 if done via "distinct score values enumerated"). Both look correct in a demo with no ties, and the bug only shows up with real tie data — which may not appear until a live tournament (small shooter counts of 8-14 per class make ties on integer sums genuinely likely).

**Why it happens:**
Ranking-with-ties has at least four common conventions (standard/"1224", modified/"1334", dense/"1223", ordinal/"1234") and it's easy to implement the wrong one by analogy to a more commonly-seen convention (e.g., copying a "dense rank" SQL snippet) without checking against the actual spec.

**How to avoid:**
- Implement rank assignment as: sort descending by score, assign rank = (1-based index of first shooter with this score in the sorted list), not "number of distinct scores seen so far." This directly produces the 1-2-2-4 pattern the spec requires.
- Write a unit test with a synthetic dataset containing a 2-way tie, a 3-way tie, and a no-tie case, asserting exact rank numbers — this is cheap and catches the off-by-one permanently.
- Clarify (with the actual user/club, since this is a design decision, not just an implementation detail) whether X-count or arrow-count tiebreakers should be applied before falling back to shared rank (WA archery rules use inner-ten/X-count as a tiebreaker before accepting a tie) — the current spec doesn't mention X-based tiebreaking, so confirm whether shared-rank-on-raw-sum is truly the intended (simpler) behavior for this training-tournament use case, or whether it was just not specified yet.

**Warning signs:**
- Ranking function only tested with non-tied sample data.
- Ranking logic derived from a generic "leaderboard ranking" tutorial/StackOverflow snippet without cross-checking which convention it implements.

**Phase to address:**
Results view phase (specs.md Phase 4). Should have explicit acceptance test cases for ties baked into phase success criteria.

---

### Pitfall 6: Arrow-value parsing and passe/round tallying off-by-ones (miss handling, sum recalculation, navigating between rounds losing context)

**What goes wrong:**
Several distinct but related bugs cluster around the score-entry grid:
- Treating "M" (miss) as `0` correctly in the sum, but failing to treat it as `0` consistently in sorting/statistics if it's stored as a string vs. number in different code paths.
- Recomputing "Summe" (sum) only on manual save rather than reactively per keystroke, leading to a sum that's stale relative to the arrow values shown until the next save — visually misleading to the trainer entering scores live.
Off-by-one on the number of arrows per passe (WA passes are typically 3 or 6 arrows depending on round type) if the arrow-count is hardcoded rather than derived from the class/round preset — inputting one too few/many arrow fields for a given round configuration will corrupt every downstream sum silently (no error, just a wrong number).
- Switching between Runde/Passe dropdowns without persisting the currently-open passe's in-progress (not-yet-saved) row edits, causing the trainer to lose the last cell they were typing if they tab away before the eager-save described in Pitfall 1 fires.
- The "complete tournament" detection logic (auto-detecting all rounds/passes are filled) triggering prematurely due to an off-by-one on round/passe count (e.g., treating a 0-indexed loop bound as the count) — showing "Abschließen" before the last passe is actually entered, or never showing it due to the reverse error.

**Why it happens:**
The Runde × Passe × Linie × Shooter grid is a multi-dimensional structure that's easy to under-model (e.g., storing sums as a derived UI value instead of a stored/recomputed field, or hardcoding arrow-count=3 based on the example in specs.md rather than deriving it from the round/passe configuration, which the spec says should support WA presets with different arrow counts).

**How to avoid:**
- Model arrow count per passe as a derived property of the round/passe configuration (not hardcoded), and generate the correct number of input cells per passe from that config.
- Always store raw per-arrow values and derive the sum via a pure function computed on read/render, never store "sum" as an independently-editable field that can drift from its inputs.
- Normalize "M" to `0` at the single point of data entry (or at the single normalization function used everywhere scores are read), not ad hoc in each consumer.
- Drive the "all rounds/passes complete" check off the same round/passe/arrow-count configuration used to render the grid (single source of truth), and unit-test it against the exact configured round count, not an assumed default.
- Since entry is eager-saved per Pitfall 1's fix, switching Runde/Passe dropdowns mid-edit is a non-issue as long as each field write is durable — but explicitly test this dropdown-switch-mid-edit scenario, since it's the natural place latent bugs from Pitfall 1 would resurface.

**Warning signs:**
- Sum column computed and stored separately from arrow values rather than derived.
- Arrow-count per passe hardcoded to 3 anywhere in the codebase.
- "Complete" detection logic using magic numbers instead of reading the actual configured round/passe count.

**Phase to address:**
Score entry phase (specs.md Phase 3). Warrants dedicated unit tests, not just manual QA, given how silent these bugs are.

---

### Pitfall 7: Developing and testing only against the Vite dev server, never against the actual production service-worker-cached build, offline

**What goes wrong:**
`vite dev` doesn't register a service worker or exercise the precache manifest at all — it's just live-reloading source. A developer can build the entire app, get every feature "working," and never once validate that the *actual offline artifact* (the built + SW-cached PWA) functions with real airplane-mode connectivity until very late, at which point missing precache entries, CORS-sensitive font/CDN loads, or code-splitting chunks fetched at runtime (not precached) surface all at once, close to a ship deadline.

**Why it happens:**
Dev-server ergonomics (HMR, fast iteration) are much better than testing built-and-served output, so it's natural to defer "test the real offline build" until the end — exactly backwards for an offline-first requirement that's the "everything else is secondary" core value of this project (per PROJECT.md).

**How to avoid:**
- From the very first phase (not deferred to the end), include "build → preview (`vite preview` or equivalent local static server) → toggle devtools 'offline' / airplane mode → walk through the full tournament flow" as a repeatable manual (or scripted) check, run at the end of every phase, not just before final ship.
- Avoid any external font/CDN/analytics script reference — self-host all fonts/assets so nothing depends on runtime network fetches, ever.
- Explicitly list every route/page/lazy chunk used during the Phase 1-4 tournament flow and confirm each is present in the `generateSW` glob patterns / precache manifest — don't just trust the default "precache everything in dist" without checking dynamic imports are actually bundled into that glob.

**Warning signs:**
- No phase's "definition of done" mentions testing the built artifact offline.
- Any `<link>`/`<script>` tag pointing to an external origin (Google Fonts CDN, etc.).
- Reliance on default `vite-plugin-pwa` glob patterns without a manual audit of `dist/` contents vs. what's actually needed at runtime.

**Phase to address:**
Foundational/infrastructure phase, but re-verified at the end of every subsequent phase as a regression check (this is the single highest-leverage recurring test for this project given the "must work offline" core value).

---

### Pitfall 8: Assuming "installable" happens the same way (or at all) across iOS Safari, Android Chrome, and desktop browsers

**What goes wrong:**
The `beforeinstallprompt` event (used to show a custom "Install" button) is a Chromium-only mechanism — it does not fire on iOS Safari at all. If the trainer is on an iPhone/iPad (plausible for a small club), a UI that only shows an install button gated on `beforeinstallprompt` will simply never offer installation, and the user has no idea installation is even possible via the manual "Share → Add to Home Screen" flow, which is non-obvious (buried a few taps deep) and has zero discoverability without explicit in-app instruction.

**Why it happens:**
Developers test primarily on one platform (often desktop Chrome, where `beforeinstallprompt` "just works") and don't realize the experience diverges completely on iOS, since there's no error or console warning — the feature just silently doesn't apply.

**How to avoid:**
- Detect platform (or just always show it, since it's harmless) and provide explicit written instructions for the iOS manual install path ("Tap Share, then Add to Home Screen") alongside/instead of a button, rather than relying solely on `beforeinstallprompt`.
- Test the actual "Add to Home Screen" → launch from home screen → confirm standalone display mode (`display: standalone` in manifest, no Safari chrome) → confirm full offline function, specifically on an iOS device, not just Android/desktop — this is the platform most likely to differ and also, per Pitfall 3, the platform where installation matters most for storage persistence.
- Provide correct `apple-touch-icon` and other iOS-specific manifest/meta tags (iOS historically ignores some standard manifest fields and relies on Apple-specific `<meta>` tags for icons/status bar/etc.) — verify current requirements against MDN/web.dev at build time since Apple's PWA support has been actively evolving (2023-2025 saw several improvements).

**Warning signs:**
- Install UI is a single button wired only to `beforeinstallprompt`, with no fallback messaging.
- No manual test performed on an actual iOS device/Safari (as opposed to only Chrome desktop devtools device emulation, which does not accurately emulate iOS PWA behavior).

**Phase to address:**
PWA/installability phase — needs an explicit "test on real iOS Safari device" step, since this is exactly the kind of gap emulators/simulators won't reliably catch.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|--------------------|-----------------|------------------|
| Save-on-click only (no eager per-field save to IndexedDB) | Simpler state management, less write traffic | Silent data loss on tab close/crash mid-entry (Pitfall 1) | Never for the score-entry screen; acceptable for low-stakes screens like settings preview panes |
| Hardcoding arrow-count-per-passe = 3 | Faster to build the first working demo | Silently wrong sums the moment a different WA preset (e.g., 6-arrow passes) is used (Pitfall 6) | Only acceptable for a throwaway prototype, never for the shipped Phase 3 grid |
| Skipping `registerType`/update-flow testing until near release | Faster initial feature velocity | Stale-cache/white-screen bugs discovered late, hard to reproduce, and directly undermine the offline core value (Pitfall 2) | Never — cheap to set up early, expensive to retrofit |
| Not writing a preset export/import (relying purely on IndexedDB durability) | Saves a small amount of dev time | Total, unrecoverable loss of saved presets on iOS eviction (Pitfall 3) with zero user-facing recourse | Acceptable only if the club explicitly accepts "presets are convenience-only, expect to occasionally recreate them" — otherwise build the cheap export/import |
| Using devtools "clear site data" to work around Dexie `VersionError` during development instead of fixing migrations | Keeps local dev unblocked quickly | Masks real migration bugs that will hard-crash the app for actual users who can't casually wipe their data without also losing presets (Pitfall 4) | Acceptable only pre-first-release, before any real user has real data |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|------------------|--------------------|
| vite-plugin-pwa (`generateSW`) | Assuming default glob patterns precache everything actually needed at runtime, without auditing `dist/` vs. what routes/chunks are touched during the tournament flow | Explicitly list/verify `globPatterns` cover every asset used in Phases 1-4 of the app; run the app fully offline from the production build every phase |
| Dexie.js | Bumping schema without `.upgrade()`, or reusing the same version number for an incompatible schema change during iterative development | Always pair a schema change with a version bump + explicit upgrade callback, even if it's a no-op; test against pre-existing data |
| `navigator.storage` (Storage API) | Never calling `persist()`/`persisted()`, assuming IndexedDB data just "stays" indefinitely | Call `navigator.storage.persist()` on first load and treat it as best-effort, not a guarantee — pair with the export/import backstop for presets |
| Service worker registration (`virtual:pwa-register`) | Registering with `registerType: 'prompt'` but never actually building the `onNeedRefresh` UI, so updates silently never activate | Prefer `registerType: 'autoUpdate'` for this single-user/low-traffic app so updates apply transparently on next online load, with `cleanupOutdatedCaches: true` |

## Performance Traps

Given the confirmed scale (8-14 shooters, 2-5 classes per PROJECT.md), classic performance scaling concerns (large dataset pagination, query indexing at thousands of rows) are not realistic risks for this project. The performance-adjacent traps that *do* apply at this scale:

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Re-rendering/re-sorting the full results table on every keystroke during score entry (not the results table) | Input lag on lower-end tablets used at the range | Keep sort/derived-rank computation scoped to the results view only; score-entry view should be simple reactive state, not resorted per keystroke | Noticeable on budget Android tablets even at only 8-14 rows if unnecessarily expensive recomputation runs per keystroke |
| Large service worker precache manifest bloated by unused build artifacts (source maps, unused chunks) | Slow first install/update download, larger IndexedDB/cache storage footprint eating into the tight 50MB-class quotas seen on Safari | Exclude source maps and dev-only assets from `globPatterns`; keep the bundle lean given some browsers cap cache storage around 50MB | Not a hard "breaks" threshold at this app's size, but worth watching given iOS's historically tight quotas |

## Security Mistakes

This is a single-device, no-backend, no-auth app, so most conventional web security concerns (auth, injection, CORS-sensitive APIs) don't apply. Domain-specific concerns:

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing club/shooter personal data (names, ages via age-group class) in IndexedDB with no thought to device loss/theft | Shooter names and class/age-group data exposed if device is lost/stolen, since IndexedDB is unencrypted at rest by default | Low risk for a training tournament (not sensitive data), but worth a one-line note in any eventual open-source README (v2.5 per PROJECT.md) that data is stored unencrypted client-side, so club operators shouldn't add sensitive PII beyond names |
| Hardcoding club identity/branding directly into source rather than config (already flagged as a Key Decision in PROJECT.md) | Blocks the v2.5 open-source path without a rewrite, and could leak one club's specific naming/branding into a shared codebase | Keep club-identity fields (name, logo, colors) in a config object/IndexedDB settings table from the start, per the existing Key Decision |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| No visible "saved" / "unsaved changes" indicator during live score entry | Trainer can't tell if a tap actually registered before moving to the next shooter/passe, especially on a device with input lag | Show an explicit, immediate per-cell or per-row saved-state indicator (e.g., subtle checkmark/spinner) tied to the actual IndexedDB write promise resolving |
| Silent failure when installation isn't offered on iOS (Pitfall 8) | User never installs, then hits the 7-day Safari storage eviction (Pitfall 3) and loses presets with no idea why | Explicit "Install this app" instructions shown proactively (not just a button that silently does nothing on iOS) |
| No confirmation before "Abschließen" (complete tournament) if it's irreversible in the UI flow | Accidental tap locks the trainer out of correcting a late-discovered scoring error | Add a confirm step before completing, and confirm the spec's stated behavior ("before completion, table can still be corrected") is preserved — clarify whether post-completion corrections are truly disallowed or just discouraged |
| Results view tie handling not visually distinguished (e.g., two shooters both showing "2" with no visual cue they're tied) | Trainer/spectators might assume a data-entry bug when they see a repeated rank number | Consider a visual tie indicator (e.g., "2." shown for both, italicized or grouped) so the skip-rank behavior reads as intentional, not broken |

## "Looks Done But Isn't" Checklist

- [ ] **Offline functionality:** Often verified only via dev server (which isn't offline-capable at all) — verify by building, serving the production bundle, enabling airplane mode, and completing an entire tournament flow (Phases 1-4) with zero network.
- [ ] **Score entry "save":** Often implemented as click-triggered only — verify by killing the tab/browser process mid-entry (no clean close) and confirming only the single most-recent unsaved field is lost, not more.
- [ ] **Tie-break ranking:** Often only tested with sample data containing no ties — verify with an explicit unit test dataset containing 2-way and 3-way ties, confirming exact standard-competition rank numbers (1-2-2-4 pattern).
- [ ] **Service worker update flow:** Often verified only by "it installed once" — verify by deploying a second version, confirming the old cached version updates cleanly (via autoUpdate or an actually-wired prompt flow) without requiring the user to manually clear site data.
- [ ] **PWA installability:** Often verified only on desktop Chrome — verify by actually adding to home screen on a real iOS Safari device and confirming standalone launch + full offline function from the home-screen icon (not just the browser tab).
- [ ] **Dexie schema migrations:** Often only tested against a freshly wiped IndexedDB — verify by creating a preset on the current schema version, then applying a subsequent schema change, and confirming the pre-existing preset survives and is correctly transformed.
- [ ] **Arrow-count-per-passe configurability:** Often hardcoded to the 3-arrow example from the spec — verify with a WA preset/custom config using a different arrow count (e.g., 6) and confirming sums and completion-detection still work correctly.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|------------------|
| Mid-entry data loss from tab close (Pitfall 1) | LOW (if eager-save was implemented) / HIGH (if not) | If eager-save per field is in place, recovery is automatic on reload (only the last unsaved field is lost). If not implemented, retrofitting requires restructuring score-entry state management from click-triggered to reactive-writes — do this early, not as a retrofit. |
| Stale cached app shell post-deploy (Pitfall 2) | MEDIUM | Ship a follow-up release with `autoUpdate` + `cleanupOutdatedCaches` correctly configured; affected users need one successful online load to self-heal — document this to the club as "open the app once with WiFi before the next tournament" as a stopgap. |
| Evicted presets on iOS (Pitfall 3) | LOW (if export/import exists) / HIGH (unrecoverable otherwise) | If a JSON export was ever taken, re-import it. Otherwise, presets must be manually recreated — no technical recovery possible once IndexedDB is evicted. |
| Broken Dexie migration shipped (Pitfall 4) | MEDIUM-HIGH | Ship a corrective migration version that detects the broken intermediate state and repairs/re-derives data where possible; if data was already dropped, it's unrecoverable — this is why pre-release migration testing (per the checklist) matters more than post-hoc fixes. |
| Wrong tie-break ranking shipped and used in a live tournament (Pitfall 5) | LOW | Pure display/computation bug with no stored-data implications (rank is derived, not stored) — fix the ranking function and results simply re-render correctly on next load; no data recovery needed, but any already-announced/printed results from the buggy run would need manual correction. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|--------------------|----------------|
| Mid-entry tab-close data loss (P1) | Score entry phase (specs.md Phase 3) | Kill tab/process mid-entry test; confirm only current field lost |
| Stale SW cache after deploy (P2) | Foundational PWA/offline-shell phase | Deploy-twice test: confirm v2 activates and offline still fully works after update |
| iOS storage eviction losing presets (P3) | Presets phase + PWA/installability phase (shipped together) | Manual iOS test: don't touch app for 8+ days in Safari tab (not installed) vs. installed home-screen icon; confirm installed version and/or persisted storage survives, or export/import exists as backstop |
| Dexie migration data loss (P4) | Every phase touching schema (all of Phases 1-4) | Pre-existing-data-through-migration test as a standing Definition of Done item |
| Tie-break ranking off-by-one (P5) | Results view phase (specs.md Phase 4) | Unit tests with 2-way/3-way tie fixtures asserting 1-2-2-4 rank pattern |
| Arrow-value/passe tallying off-by-ones (P6) | Score entry phase (specs.md Phase 3) | Unit tests for sum-derivation, M-as-zero normalization, and configurable arrow-count-per-passe; config-driven "complete" detection |
| Testing only against dev server, not offline build (P7) | Foundational PWA/offline-shell phase, re-checked every phase | Airplane-mode full-flow walkthrough repeated at the end of every phase, not just once at the end |
| iOS install path divergence (P8) | PWA/installability phase | Real-device iOS Safari test: Add to Home Screen → launch standalone → full offline flow |

## Sources

- Dexie.js official docs via Context7 (`/websites/dexie`): `Version.upgrade()`, schema migration patterns, `StorageManager` / persistent storage, IndexedDB storage-limit and eviction documentation — https://dexie.org/docs/Version/Version.upgrade%28%29, https://dexie.org/docs/StorageManager, https://dexie.org/docs/The-Main-Limitations-of-IndexedDB
- vite-plugin-pwa official docs via Context7 (`/websites/vite-pwa-org_netlify_app`): auto-update guide, `registerSW`/`virtual:pwa-register` prompt pattern, `injectManifest` auto-update requirements — https://vite-pwa-org.netlify.app/guide/auto-update, https://vite-pwa-org.netlify.app/guide/inject-manifest
- vite-plugin-pwa GitHub issues (white-screen/stale-cache reports): #726, #776, #838, #446, #33 — https://github.com/vite-pwa/vite-plugin-pwa/issues
- WebKit storage policy blog and WebKit Bugzilla #266559 on periodic LocalStorage/IndexedDB erasure — https://webkit.org/blog/14403/updates-to-storage-policy/, https://bugs.webkit.org/show_bug.cgi?id=266559
- Search Engine Land, "What Safari's 7-day cap on script-writeable storage means for PWA developers" — https://searchengineland.com/what-safaris-7-day-cap-on-script-writeable-storage-means-for-pwa-developers-332519
- MDN, Storage quotas and eviction criteria — https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- MDN, `Window: beforeunload` event; Vaughn Royko, "Offline Storage, IndexedDB and the onbeforeunload/unload Problem" — https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event, https://vaughnroyko.com/offline-storage-indexeddb-and-the-onbeforeunloadunload-problem/
- MDN, Making PWAs installable; Chrome for Developers, installable-manifest / maskable-icon audits / revisiting installability criteria — https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable, https://developer.chrome.com/docs/lighthouse/pwa/installable-manifest, https://developer.chrome.com/blog/update-install-criteria
- MagicBell / Brainhub / Vinova roundups on iOS Safari PWA limitations (2025/2026) — cross-checked against WebKit/Apple primary sources for the eviction and storage-cap claims — https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide, https://brainhub.eu/library/pwa-on-ios
- World Archery (WA) scoring/tiebreak conventions (X-count tiebreak precedent) — domain knowledge cross-referenced against general search results on archery scoring rules
- Standard competition-ranking convention (1-2-2-4 "standard/skip" vs. "dense" ranking) — general algorithmic/domain reasoning, not project-specific source; recommend validating the exact desired tiebreak convention directly with the club/user during roadmap refinement

---
*Pitfalls research for: Offline-first archery training-tournament PWA (Svelte + vite-plugin-pwa + Dexie.js)*
*Researched: 2026-07-03*
