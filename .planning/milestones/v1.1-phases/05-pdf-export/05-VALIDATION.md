---
phase: 5
slug: pdf-export
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-06
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.9 (unit tests) + Playwright 1.61.1 (E2E tests) |
| **Config file** | `vitest.config.ts` and `playwright.config.ts` |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test:all` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test` (unit tests only, <5 sec)
- **After every plan wave:** Run `npm run test:all` (unit + Playwright E2E, <30 sec)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 0 | PDF-02 | — | Dexie v4 settings table stores/retrieves title + Blob images | unit | `npm run test -- src/lib/db/schema.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 0 | PDF-03 | T-05-01 | Canvas downscale produces Blob under 200KB, valid MIME/magic bytes | unit | `npm run test -- src/lib/utils/imageDownscale.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | PDF-04 | — | PDF table columns are Rank, Name, Sum only (no Line/Class) | unit | `npm run test -- src/lib/utils/pdfExport.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | PDF-05 | — | Include/exclude incomplete shooters via checkbox filters correctly, default excluded | unit | `npm run test -- src/lib/utils/pdfExport.test.ts::filter incomplete` | ❌ W0 | ⬜ pending |
| 05-02-03 | 02 | 1 | PDF-01 | — | Single PDF, all classes, page break before each new class section | e2e | `npx playwright test e2e/pdfExport.spec.ts` | ❌ W0 | ⬜ pending |
| 05-02-04 | 02 | 1 | PDF-07 | — | Filename is `Ergebnisse_YYYY-MM-DD.pdf` | e2e | `npx playwright test e2e/pdfExport.spec.ts::filename` | ❌ W0 | ⬜ pending |
| 05-02-05 | 02 | 1 | PDF-06 | T-05-01 | PDF generation works fully offline, no network calls | e2e | `npx playwright test e2e/pdfExport.spec.ts --offline-mode` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/utils/pdfExport.test.ts` — pure function tests for PDF generation: column order (Rank/Name/Sum), incomplete-shooter filtering, multi-class pagination
- [ ] `src/lib/utils/imageDownscale.test.ts` — Canvas downscaling tests: aspect ratio preservation, ~200KB size cap enforcement, Blob output, magic-byte validation
- [ ] `src/lib/db/schema.test.ts` — Dexie v4 schema test: settings table migration (v3→v4), Blob field storage/retrieval round-trip via `db.settings.put()`/`db.settings.get(1)`
- [ ] `e2e/pdfExport.spec.ts` — E2E: Results view → checkbox → export → download → verify PDF content (rows, images, page breaks, filename, zero network calls in offline mode)
- [ ] `e2e/settingsUpload.spec.ts` — E2E: Settings form → file upload → downscaling → save → preset export/import → verify header images persist

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual PDF quality (image placement, table styling, page-break appearance) | PDF-01 | Rendering fidelity across PDF viewers isn't meaningfully assertable by automated tests | Open exported PDF on iOS Safari, Android Chrome, and Desktop; confirm images render, table is legible, page breaks land between class sections |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
