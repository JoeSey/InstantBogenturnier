import { describe, it, expect, vi, afterEach } from 'vitest';
import { downloadBlob } from './downloadBlob';

// jsdom doesn't implement window.open() (always returns a falsy value), so every
// downloadBlob() call under test exercises the anchor-click fallback branch — which is
// also the only branch real Safari/WebKit ever takes if a popup gets blocked.
describe('downloadBlob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a download anchor with the given filename and blob: href, then clicks it', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    let appendedAnchor: HTMLAnchorElement | undefined;
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    const blob = new Blob(['hello'], { type: 'text/plain' });
    await downloadBlob(blob, 'Turnier_test.json');

    const anchorCall = appendSpy.mock.calls.find((call) => call[0] instanceof HTMLAnchorElement);
    appendedAnchor = anchorCall?.[0] as HTMLAnchorElement | undefined;

    expect(appendedAnchor).toBeDefined();
    expect(appendedAnchor?.download).toBe('Turnier_test.json');
    expect(appendedAnchor?.href).toMatch(/^blob:/);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('removes the anchor from the document after clicking', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const blob = new Blob(['hello'], { type: 'text/plain' });

    await downloadBlob(blob, 'Turnier_test.json');

    expect(document.querySelectorAll('a[download="Turnier_test.json"]').length).toBe(0);
  });
});
