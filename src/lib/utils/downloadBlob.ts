// Installed (standalone-display-mode) PWAs on iPadOS/macOS Safari don't reliably
// support triggering a file download via an `<a download>` + blob: URL click — WebKit's
// standalone WKWebView can throw synchronously on `.click()` instead of downloading,
// which is why every export button worked fine in a normal browser tab but broke (and
// even required force-quitting the app) once installed. The Web Share API's file
// sharing, however, is supported in standalone PWAs, so prefer it there and only fall
// back to the anchor-click pattern for regular browser tabs where it already works.
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true);

  if (isStandalone && typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (err) {
        // AbortError means the trainer dismissed the share sheet — not a failure.
        if (err instanceof Error && err.name === 'AbortError') return;
        // Otherwise fall through to the anchor-download path as a last resort.
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  // WR-04: some WebKit/iOS Safari versions silently ignore .click() on an anchor
  // that was never attached to the DOM — append before clicking, then clean up.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
