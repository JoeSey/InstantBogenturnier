---
phase: 05-pdf-export
reviewed: 2026-07-06T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/lib/utils/imageDownscale.ts
  - src/lib/utils/imageDownscale.test.ts
  - src/lib/components/SettingsForm.svelte
  - e2e/settingsUpload.spec.ts
  - src/lib/db/schema.ts
  - src/lib/db/schema.test.ts
  - src/lib/db/testHelpers.ts
  - src/lib/views/Setup.svelte
  - src/lib/i18n/strings.de.ts
  - src/lib/utils/pdfExport.ts
  - src/lib/utils/pdfExport.test.ts
  - e2e/pdfExport.spec.ts
  - src/lib/views/Results.svelte
findings:
  critical: 1
  warning: 5
  info: 2
  total: 8
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-07-06T00:00:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Reviewed the Settings-form (title + header logos) and PDF-export vertical slice. The
core ranking/PDF-generation flow is well tested for the "no logo" and PNG-shaped
data-URI paths, but the JPEG-logo path is untested and contains a genuine bug: the PDF
generator hard-codes the image format passed to `jsPDF.addImage()` as `'PNG'`
regardless of the blob's actual encoding, which will throw/corrupt output for any
uploaded JPEG logo. There are also several quality/robustness gaps: no post-downscale
size cap enforcement (only the pre-flight raw-upload size is checked), fixed-aspect
logo stretching in the generated PDF, un-revoked object URLs, and a flaky
timeout-based wait in the settings-upload e2e test.

## Critical Issues

### CR-01: PDF export hard-codes image format as PNG, breaking JPEG logo uploads

**File:** `src/lib/utils/pdfExport.ts:73-78`
**Issue:** `SettingsForm.svelte`'s upload flow accepts `image/jpeg` uploads and
`downscaleImageBlob()` (imageDownscale.ts:51-52) faithfully preserves the JPEG
encoding for JPEG uploads (`mimeType = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'`),
storing a real JPEG-encoded `Blob` in `SettingsRecord.logoLeftBlob`/`logoRightBlob`.
However, `buildResultsPdfDoc()` converts that blob to a data URI via `blobToDataUri()`
(which correctly embeds `data:image/jpeg;base64,...`) but then calls:
```ts
doc.addImage(logoLeftData, 'PNG', 20, imageY, 25, 20);
doc.addImage(logoRightData, 'PNG', doc.internal.pageSize.getWidth() - 50, imageY, 25, 20);
```
The explicit `'PNG'` format argument tells jsPDF's internal image processor to parse
the data as PNG regardless of what it actually is. For a JPEG-encoded logo this either
throws (jsPDF's PNG decoder fails on JPEG magic bytes) or produces corrupted image
data in the resulting PDF. Since `handleExport()` in `Results.svelte` wraps the whole
call in a generic `try/catch` (line 59-71), the trainer only sees the generic
`errorFeedback = strings.resultsPdf.exportError` ("Speichern fehlgeschlagen") with no
indication that a JPEG logo is the cause — the entire PDF export silently fails for
any club that uploads a JPEG logo instead of a PNG. This path is completely untested:
`pdfExport.test.ts` only exercises `{ id: 1 }` (no logo blobs at all), so the bug was
never caught.
**Fix:** Derive the format from the actual data URI mime type instead of hard-coding it:
```ts
function formatFromDataUri(dataUri: string): 'PNG' | 'JPEG' {
  return dataUri.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
}
...
if (logoLeftData) {
  doc.addImage(logoLeftData, formatFromDataUri(logoLeftData), 20, imageY, 25, 20);
}
if (logoRightData) {
  doc.addImage(logoRightData, formatFromDataUri(logoRightData), doc.internal.pageSize.getWidth() - 50, imageY, 25, 20);
}
```
Add a test case in `pdfExport.test.ts` that passes a real JPEG-encoded `Blob` for
`logoLeftBlob`/`logoRightBlob` and asserts the resulting PDF is generated without
throwing.

## Warnings

### WR-01: No post-downscale size enforcement — the 200KB cap is only checked pre-upload

**File:** `src/lib/components/SettingsForm.svelte:44-49`, `src/lib/utils/imageDownscale.ts:15-72`
**Issue:** `handleLogoChange()` only rejects files whose *original* `file.size` exceeds
`MAX_LOGO_BYTES` (200KB) before calling `downscaleImageBlob()`. The function never
checks `blob.size` on the value actually returned from the canvas re-encode. The UI
label ("Logo links (PNG/JPEG, max 200KB)") and the whole feature's storage-budget
rationale imply the *stored* blob should stay under this cap, but a low-compression
image (e.g. high-entropy PNG with small dimensions but complex content) sized just
under 200KB pre-upload could downscale to a similarly-sized or even larger blob at
quality 0.85, silently violating the documented cap.
**Fix:** After `downscaleImageBlob()` resolves, check `blob.size` against
`MAX_LOGO_BYTES` and surface `errorTooLarge` if it's still over cap, e.g.:
```ts
const { blob, dataUri } = await downscaleImageBlob(file);
if (blob.size > MAX_LOGO_BYTES) {
  errorFeedback = strings.settingsForm.errorTooLarge;
  return;
}
```

### WR-02: Logos are drawn at a fixed 25x20mm box regardless of actual aspect ratio

**File:** `src/lib/utils/pdfExport.ts:73-78`
**Issue:** `downscaleImageBlob()` deliberately preserves the source aspect ratio
(imageDownscale.ts:34-39), but `buildResultsPdfDoc()` draws both logos into a
hard-coded 25mm x 20mm (1.25:1) box via `doc.addImage(..., 25, 20)`. Any logo whose
aspect ratio differs from 1.25:1 (e.g. a square club crest, or a wide banner logo)
will be stretched/squashed in the exported PDF, defeating the aspect-ratio-preserving
work done at upload time.
**Fix:** Compute the drawn width/height from the image's natural aspect ratio,
constrained to a max box (e.g. max height 20mm, width computed proportionally), or
store the logo's natural width/height alongside the blob in `SettingsRecord` so
`pdfExport.ts` can compute a non-distorting draw size.

### WR-03: Object URLs for logo previews are never revoked

**File:** `src/lib/components/SettingsForm.svelte:30-31`
**Issue:** On initial load, `logoLeftPreview`/`logoRightPreview` are set via
`URL.createObjectURL(logoLeftBlob)` / `URL.createObjectURL(logoRightBlob)`. These
object URLs are never revoked — not when a new logo replaces the old preview (the
`dataUri` returned from `downscaleImageBlob()` simply overwrites the state variable,
orphaning the previous blob URL), and not when the component is destroyed. This is a
resource leak that accumulates over the lifetime of the SPA session (each Settings
page visit that had a previously-saved logo creates one more leaked object URL).
**Fix:** Track the created object URL and revoke it before creating a new one / on
component teardown:
```ts
$effect(() => {
  return () => {
    if (logoLeftPreview?.startsWith('blob:')) URL.revokeObjectURL(logoLeftPreview);
  };
});
```

### WR-04: `<a>` download click without appending to the DOM may silently fail on Safari/iOS

**File:** `src/lib/views/Results.svelte:63-68`
**Issue:** `handleExport()` creates an anchor element and calls `.click()` on it
without ever appending it to `document.body`. Modern Chromium/Firefox tolerate this,
but this pattern has a documented history of silently failing on some WebKit/iOS
Safari versions — directly relevant given CLAUDE.md's explicit callout of iOS Safari
quirks as a first-class concern for this app.
**Fix:** Append the anchor before clicking and remove it afterward:
```ts
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
```

### WR-05: Settings-upload e2e test relies on a fixed 300ms timeout instead of confirming the write

**File:** `e2e/settingsUpload.spec.ts:38-42`
**Issue:** The test comment explicitly acknowledges the race ("the save writes to
IndexedDB asynchronously ... give it a moment ... or the reload can race ahead of the
Dexie write") and papers over it with `await page.waitForTimeout(300)`. This is a
classic source of CI flakiness — under load the write may take longer than 300ms, and
the test doesn't confirm the write actually landed before reloading.
**Fix:** Wait for an observable UI signal that the save completed (e.g. a transient
"saved" confirmation, or poll the reloaded page's title field with a longer
`toHaveValue` timeout) rather than a fixed sleep.

## Info

### IN-01: Division-by-zero / NaN dimensions not guarded for zero-sized images

**File:** `src/lib/utils/imageDownscale.ts:36-39`
**Issue:** If a malformed/corrupted image decodes with `img.width` or `img.height`
equal to `0` (some browsers will fire `onload` rather than `onerror` for certain
degenerate images), `ratio = Math.min(maxWidth / width, maxHeight / height, 1)` can
evaluate to `Infinity` or `NaN`, producing a zero-or-NaN-sized canvas and an unclear
downstream failure mode instead of a clean rejected promise.
**Fix:** Guard explicitly:
```ts
if (!img.width || !img.height) {
  reject(new Error('Image has invalid dimensions'));
  return;
}
```

### IN-02: File input accepts any `image/*` type despite UI copy promising only PNG/JPEG

**File:** `src/lib/utils/imageDownscale.ts:21-23`, `src/lib/components/SettingsForm.svelte:100-118`
**Issue:** The `accept="image/png,image/jpeg"` attribute on the `<input type="file">`
is only an OS file-picker hint and isn't enforced — a user can still choose "All
Files" and select e.g. a `.webp`/`.gif`/`.svg` file with a matching MIME type.
`downscaleImageBlob()`'s validation is `file.type.startsWith('image/')`, which accepts
any image subtype, not just png/jpeg, silently diverging from the label text ("Logo
links (PNG/JPEG, max 200KB)"). In practice this doesn't crash (the canvas re-encodes
to PNG/JPEG regardless), but SVG uploads specifically can fail to rasterize
consistently across browsers and are worth explicitly rejecting.
**Fix:** Tighten the check to the two supported subtypes:
```ts
if (!['image/png', 'image/jpeg'].includes(file.type)) {
  return Promise.reject(new Error(`Unsupported image type: ${file.type || 'unknown type'}`));
}
```

---

_Reviewed: 2026-07-06T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
