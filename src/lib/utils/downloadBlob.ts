// Installed (standalone-display-mode) PWAs on iPadOS/macOS Safari don't reliably
// support triggering a file download via an `<a download>` + blob: URL click — WebKit's
// standalone WKWebView can throw synchronously on `.click()` instead of downloading,
// which is why every export button worked fine in a normal browser tab but broke once
// installed. Opening the blob in a new window instead reproduces the old browser-tab
// behavior the trainer relies on at the range (PDF shows inline in Safari's own viewer,
// with its save/print/share controls) rather than routing every export through the iOS
// share sheet. Only fall back to the anchor-click download if the popup is blocked.
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');

  if (!win) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    // WR-04: some WebKit/iOS Safari versions silently ignore .click() on an anchor
    // that was never attached to the DOM — append before clicking, then clean up.
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  // The new window/tab needs time to load the blob: URL before it's safe to revoke —
  // revoking immediately would race the load and show a blank page.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
