# Stack Research

**Domain:** Offline-first, installable PWA (client-only, no backend) — archery tournament management
**Researched:** 2026-07-03
**Confidence:** HIGH (core stack verified against npm registry + official docs/Context7); MEDIUM for a few emerging-tool notes (flagged inline)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Svelte | 5.56.4 | UI compiler/framework, runes-based reactivity | Already locked by user. Svelte 5's runes (`$state`, `$derived`, `$effect`) fully replace the need for an external store/state library for score-table sorting, preset state, and derived rankings — matches the project's stated architecture rationale. |
| Vite | 8.1.3 | Dev server + build tool | Current stable major (released 2026-03-12, now on the Rolldown-based unified bundler). All other locked-in tools (`@sveltejs/vite-plugin-svelte@7`, `vite-plugin-pwa@1.3.0`, `@tailwindcss/vite@4`) declare explicit peer support for Vite 8, so there is no version-lag risk in choosing it as the baseline. |
| @sveltejs/vite-plugin-svelte | 7.1.2 | Compiles `.svelte` files under Vite | **Must be paired with Vite 8** — its `peerDependencies` require `vite: "^8.0.0-beta.7 || ^8.0.0"` and `svelte: "^5.46.4"`. This is not backward compatible with Vite 7 (see Version Compatibility below). |
| Tailwind CSS | 4.3.2 | Utility-first CSS | Already locked by user. v4's CSS-first config (no `tailwind.config.js` needed) plus the dedicated `@tailwindcss/vite` plugin gives faster builds and simpler setup than the old PostCSS-plugin path used by v3. |
| @tailwindcss/vite | 4.3.2 | Vite-native Tailwind integration | Official first-party plugin, replaces `tailwindcss` + `autoprefixer` + `postcss.config.js` boilerplate from v3-era setups. Peer-compatible with Vite 5–8. |
| vite-plugin-pwa | 1.3.0 | Generates web manifest + service worker (via Workbox) at build time | Already locked by user. Zero-config `generateSW` strategy is exactly right for this app: a fully static, single-entry SPA with no external API to selectively cache — precache-everything is the correct (and simplest) strategy here, not `injectManifest`. |
| workbox-build / workbox-window | 7.4.1 | Underlying SW tooling used by vite-plugin-pwa | Pulled in automatically as a dependency of `vite-plugin-pwa`; pin awareness only, not a direct install. |
| Dexie.js | 4.4.4 | IndexedDB wrapper for local data (classes, shooters, scores, presets) | Already locked by user. Mature, well-documented, handles IndexedDB's async/versioning pain points; `liveQuery` gives reactive queries that integrate with Svelte's store-auto-subscription syntax. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dexie-export-import | 4.4.0 | Export/import the entire Dexie database as a JSON blob | Use for a manual "export my presets" / "import presets" backup feature. Given iOS Safari's known IndexedDB eviction behavior (see Version Compatibility / gotchas), this is cheap insurance against a trainer losing their 4–8 saved tournament presets. Low complexity, high value — recommend including even in v1. |
| @vite-pwa/assets-generator | 1.0.2 | Generates all required PWA icon sizes (incl. maskable) from one source image | Use once, at setup time (via `vite-plugin-pwa`'s optional peer dependency + `pwa-assets-generator` CLI/config) to produce `pwa-192x192.png`, `pwa-512x512.png`, maskable variant, apple-touch-icon, favicon — avoids hand-producing icon sets. |
| jsPDF | 4.2.1 | Client-side PDF generation from scratch | **For the v1.5 phase.** Recommended over `pdf-lib` — see PDF section below. |
| jspdf-autotable | 5.0.8 | Table plugin for jsPDF | For the v1.5 result-list PDF export (multi-page tabular data with automatic pagination). Peer-compatible with `jspdf@4`. |
| typescript | 6.0.3 | Static typing | Recommended even for a small project: Svelte 5 + Dexie both have strong TS support, and typed table/score/class shapes materially reduce bugs in the sorting/ranking logic (tie-handling, rank-skipping) that is the app's core value. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest | 4.1.9 | Unit tests for scoring/ranking logic, preset (de)serialization, Dexie schema helpers | Runs natively inside the Vite pipeline (shares config/transforms), no separate test-runner config needed. |
| @testing-library/svelte | 5.4.2 | Component-level tests (score table rendering, sort-on-click, results view) | Peer dep explicitly supports `svelte: "^3 \|\| ^4 \|\| ^5"` — safe with Svelte 5. |
| @playwright/test | 1.61.1 | End-to-end tests, incl. simulating offline mode (`context.setOffline(true)`) and verifying installability/manifest | Use for the "must work with zero connectivity" acceptance test and for smoke-testing the generated service worker in a real browser, which Vitest/jsdom cannot do. |
| svelte-check | 4.7.1 | Type-checks `.svelte` files (TS in `<script>` blocks + template bindings) | Run in CI / pre-commit; catches prop/type mismatches Vite's dev server won't. |
| eslint-plugin-svelte | 3.20.0 | Lint `.svelte` files | Pair with a standard `eslint` + `typescript-eslint` base config. |
| prettier-plugin-svelte | 4.1.1 | Formats `.svelte` files | Standard formatting; keeps single-developer velocity high without style debates. |

## Installation

```bash
# Core (scaffold with the official Svelte+Vite template, then add):
npm install -D vite@^8.1 @sveltejs/vite-plugin-svelte@^7.1 svelte@^5.56
npm install -D tailwindcss@^4.3 @tailwindcss/vite@^4.3
npm install -D vite-plugin-pwa@^1.3
npm install dexie@^4.4

# Supporting
npm install dexie-export-import@^4.4
npm install -D @vite-pwa/assets-generator@^1.0

# PDF generation (defer install until v1.5 phase starts)
npm install jspdf@^4.2 jspdf-autotable@^5.0

# TypeScript
npm install -D typescript@^6.0

# Dev/test tooling
npm install -D vitest@^4.1 @testing-library/svelte@^5.4 @playwright/test@^1.61 svelte-check@^4.7 eslint-plugin-svelte@^3.20 prettier-plugin-svelte@^4.1
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Plain Svelte + Vite SPA | SvelteKit | Only if the project later needs SSR, file-based routing, or server endpoints. This project is explicitly client-only/single-view-state — SvelteKit's adapters and routing add build complexity with zero benefit here. |
| Vite 8 + `@sveltejs/vite-plugin-svelte@7` | Vite 7.x + `@sveltejs/vite-plugin-svelte@6.2.1` | If the Rolldown-powered Vite 8 bundler (new in March 2026) causes an unexpected build issue during setup, fall back to the Vite 7 line — `vite-plugin-svelte@6.2.1` targets `vite: "^6.3.0 \|\| ^7.0.0"` and is a more battle-tested (Rollup-based) build path. All other locked tools (`vite-plugin-pwa`, `@tailwindcss/vite`) support both lines. |
| `generateSW` (default Workbox strategy) | `injectManifest` (custom service worker) | Only needed if the app later adds real network calls it wants to cache selectively (e.g. a future v2 sync feature). For a fully static, no-API app, `generateSW`'s auto-precaching is simpler and sufficient. |
| jsPDF + jspdf-autotable | pdf-lib | Use `pdf-lib` instead if a later phase needs to **edit or fill an existing PDF template** (e.g. a pre-designed certificate PDF with form fields) rather than draw a fresh document. Not the case here — see PDF section below. |
| dexie `liveQuery` + Svelte auto-subscription | Manual `$state` + Dexie promises | If the known `liveQuery`-with-runes edge case (see Version Compatibility) causes issues, fall back to plain `async` loads into `$state` variables re-run inside `$effect`, forgoing live-reactivity for a manual refresh-on-save pattern — perfectly adequate given this app already has an explicit "Save" step. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| SvelteKit | Adds a full routing/adapter/SSR layer (Node-oriented build output, `+page.js` conventions) that this single-view, client-only, offline-first app doesn't need. `vite-plugin-pwa`'s SvelteKit integration is explicitly a *heavier* config path (custom `srcDir`/`outDir`/`manifestTransforms`) than the plain-Vite path. | Plain Svelte + Vite SPA (`npm create vite@latest -- --template svelte-ts`) |
| Redux/Zustand-style external state libraries | Unnecessary given Svelte 5 runes already provide fine-grained reactivity for table sorting, mode detection (AB vs AB/CD), and preset state — confirmed as the project's own stated rationale. | Svelte 5 runes (`$state`, `$derived`) |
| `localStorage`/`sessionStorage` for tournament data | Synchronous API blocks the main thread, ~5–10MB quota, and no native support for structured/relational data (shooters × classes × rounds × passes × arrows). Wrong tool for this data shape. | Dexie.js (IndexedDB) — already locked in |
| `registerType: 'autoUpdate'` in vite-plugin-pwa without care | Auto-update triggers a forced reload of the running tab as soon as a new build's service worker takes control. If the trainer has the app open mid-tournament and a background update check succeeds (e.g. briefly regains signal at the range), an unexpected reload could disrupt live score entry. | `registerType: 'prompt'` with `virtual:pwa-register`'s `onNeedRefresh` callback wired to the app's own "between tournaments" UI, so updates only apply when the trainer explicitly chooses, not mid-session. |
| `pwa-asset-generator` (older, Puppeteer-based icon generator) | Requires a headless Chromium download (heavy, slower CI/dev setup) and isn't purpose-built for `vite-plugin-pwa`'s manifest config. | `@vite-pwa/assets-generator`, the first-party sibling project, listed as an optional peer dependency of `vite-plugin-pwa` itself. |
| Custom `injectManifest` service worker (writing your own Workbox SW from scratch) as a starting point | Unnecessary complexity/maintenance burden for an app with no runtime API calls to differentiate cache strategies for. | `generateSW` (the vite-plugin-pwa default) |

## Stack Patterns by Variant

**If reactive Dexie queries feel unreliable with runes (known edge case):**
- Use the hybrid pattern Dexie's own docs now recommend for Svelte 5:
  ```svelte
  <script>
    import { liveQuery } from 'dexie';
    import { db } from './db';

    let _shooters = liveQuery(() => db.shooters.toArray());
    let shooters = $derived($_shooters); // combines store auto-subscription with $derived
  </script>
  ```
- Because `liveQuery()` returns an object that satisfies the Svelte store contract (so `$_shooters` auto-subscribes), and wrapping it in `$derived` gives you a rune-friendly value to pass to child components/derived computations (e.g. sorted/ranked views). There is a documented (as of mid-2025) edge case where a fresh page load can show `undefined` until the first write — if this bites, add an explicit initial `await` fallback or default value.

**If deploying to a static host with a sub-path (e.g. GitHub Pages under `/repo-name/`):**
- Set both Vite's `base` and vite-plugin-pwa's `manifest.scope`/`manifest.start_url` to match the sub-path, or the installed PWA's service worker scope will mismatch and installability/offline routing will silently break.
- Because the web app manifest's `scope` and `start_url` are resolved relative to the manifest's own URL, not the site root, by default.

**If targeting iOS Safari installed-PWA reliability (relevant since the range device may be an iPad/iPhone):**
- Call `navigator.storage.persist()` on first launch (best-effort; not guaranteed on iOS) and rely on `dexie-export-import` for a manual "export presets" safety net.
- Because iOS Safari has a documented history of evicting IndexedDB/cache data after ~7 days of inactivity for web content, and IndexedDB has had stability issues on iOS WebKit historically (data loss/corruption reports). Since this app doesn't need long-term result persistence, this mainly protects the 4–8 saved tournament presets, not live-tournament data (which only needs to survive the single session).

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `vite@8.1.3` | `@sveltejs/vite-plugin-svelte@7.1.2` | **Hard requirement**, not optional: `vite-plugin-svelte@7.x`'s peerDependencies are `vite: "^8.0.0-beta.7 \|\| ^8.0.0"` and `svelte: "^5.46.4"`. Do not mix `vite-plugin-svelte@7` with Vite 7 — it will fail peer-dep resolution. |
| `vite@7.x` (fallback line) | `@sveltejs/vite-plugin-svelte@6.2.1` | If choosing to stay on Vite 7 instead, use this older plugin major (peer: `vite: "^6.3.0 \|\| ^7.0.0"`, `svelte: "^5.0.0"`). Do not combine Vite 8 with `vite-plugin-svelte@6.x` — unsupported combination. |
| `vite-plugin-pwa@1.3.0` | `vite: "^3.1.0 \|\| ^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0"` | Confirmed via package.json peerDependencies — safe with either Vite 7 or Vite 8 path above. |
| `@tailwindcss/vite@4.3.2` | `vite: "^5.2.0 \|\| ^6 \|\| ^7 \|\| ^8"` | Safe with either Vite 7 or Vite 8 path above. |
| `jspdf-autotable@5.0.8` | `jspdf: "^2 \|\| ^3 \|\| ^4"` | Matches recommended `jspdf@4.2.1`. |
| `@testing-library/svelte@5.4.2` | `svelte: "^3 \|\| ^4 \|\| ^5 \|\| ^5.0.0-next.0"` | Confirmed safe with Svelte 5 stable. |
| Vite 8 | Node.js `^20.19.0 \|\| >=22.12.0` | Vite 8's `engines` field — verify the dev/build machine's Node version before scaffolding; older Node 18/20.x-pre-19 will fail to install/run. |

## PDF Generation for v1.5 (jsPDF vs pdf-lib vs alternatives)

**Recommendation: jsPDF (`jspdf@4.2.1`) + `jspdf-autotable@5.0.8`.** Confidence: MEDIUM (WebSearch-verified across multiple comparison sources, cross-checked against npm registry for current major versions; no single authoritative "which is better" doc exists since the two tools solve different problems).

- **Why jsPDF over pdf-lib:** the v1.5 requirement is to *generate new documents from scratch* (a results table via `jspdf-autotable`, and per-shooter certificates with configurable header images), not to edit/fill an existing PDF file. jsPDF is purpose-built for drawing-from-scratch (text, tables, images, shapes) with a simple imperative API; `pdf-lib` is purpose-built for *manipulating existing PDFs* (form-filling, merging, extracting pages, embedding into a pre-made template) and only has fairly low-level, verbose drawing primitives for from-scratch content. Since there's no existing PDF template to fill here, jsPDF is the better fit.
- **Header images / logos:** jsPDF's `doc.addImage()` directly supports placing PNG/JPEG images at arbitrary x/y/width/height — exactly what's needed for the two configurable header images (left/right) mentioned in the spec. No extra library needed.
- **Certificates:** same `jsPDF` instance can be reused per-shooter in a loop (`doc.addPage()` between shooters or separate `doc.save()` calls), drawing text (name, class, rank) plus the same header-image logic.
- **Multi-page result lists:** `jspdf-autotable` handles automatic pagination for long shooter lists out of the box, which is explicitly called out as a requirement ("bei Bedarf mehrseitig" in specs.md).
- **What this implies for earlier-phase architecture (data shape):** design the shooter/results data model now so that, at PDF time, a single query can yield "shooter name, class, per-round/per-passe scores, computed sum, computed rank" as a flat, already-sorted/ranked array — i.e. keep ranking/tie-handling logic as a pure function operating on plain arrays/objects, not tied to Svelte component state. This makes it trivially reusable for both the live results view (Phase 4) and the later jsPDF/autotable export (v1.5) without rewriting the ranking logic. Also model "header image A / header image B" as two independent optional binary blobs (e.g. stored as `Blob`/base64 in a Dexie `settings` table) from day one, even though they're unused until v1.5, since jsPDF's `addImage()` will need base64/Uint8Array/Blob data directly and this avoids a data-migration later.
- **Do NOT reach for:** `pdfmake` (declarative but heavier, less control over precise image placement for a two-logo header layout) or `html2pdf.js`/`html2canvas`-based approaches (rasterizes HTML to an image before embedding in a PDF — produces larger files, blurrier text/QR-unfriendly output, and doesn't respect print-quality vector text; unnecessary given jsPDF's native drawing API already covers every requirement here).

## Sources

- `/sveltejs/svelte` (Context7) — confirmed current Svelte 5 docs/runes API
- `/vite-pwa/vite-plugin-pwa` (Context7) — `generateSW` vs `injectManifest` strategy docs, manifest minimal requirements, `registerType: autoUpdate` vs `prompt`, `virtual:pwa-register` usage
- npm registry (`npm view <pkg> version/peerDependencies/engines`, checked 2026-07-03) — authoritative current versions and peer-dependency constraints for: vite, vite-plugin-pwa, svelte, @sveltejs/vite-plugin-svelte, dexie, tailwindcss, @tailwindcss/vite, workbox-build, jspdf, jspdf-autotable, pdf-lib, vitest, @playwright/test, @testing-library/svelte, svelte-check, eslint-plugin-svelte, prettier-plugin-svelte, @vite-pwa/assets-generator, pwa-asset-generator, dexie-export-import, typescript
- https://vite.dev/blog/announcing-vite8 — Vite 8.0 release date (2026-03-12) and Rolldown-based bundler change, verified via WebSearch
- https://github.com/vite-pwa/vite-plugin-pwa/issues/923 and repo `package.json` on `main` — confirmed Vite 8 peer-dep support landed (checked directly against `raw.githubusercontent.com` package.json, not just the issue thread) — HIGH confidence
- https://dexie.org/docs/Tutorial/Svelte and https://github.com/dexie/Dexie.js/issues/2075 — Dexie + Svelte 5 runes integration pattern and known edge case — MEDIUM confidence (community-reported edge case, no official Dexie fix confirmed as of research date)
- Tailwind CSS official docs (`tailwindcss.com/docs/dark-mode`), fetched directly — v4 `@custom-variant dark` pattern for manual + automatic dark mode — HIGH confidence
- WebSearch comparison sources (Joyfill, dev.to, Apryse, Nutrient, npm-compare.com) — jsPDF vs pdf-lib vs pdfmake positioning — MEDIUM confidence (multiple independent sources agree on the generate-vs-edit distinction; no single primary-source doc directly compares them)
- WebSearch (magicbell.com, developer.apple.com forums) — iOS Safari IndexedDB/cache eviction behavior — MEDIUM confidence (consistent community reporting, no single official Apple doc found confirming exact eviction window)

---
*Stack research for: Offline-first archery tournament management PWA (Svelte 5 + Vite + Tailwind + vite-plugin-pwa + Dexie.js)*
*Researched: 2026-07-03*
