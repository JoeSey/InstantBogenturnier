import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { downscaleImageBlob } from './imageDownscale';

// jsdom doesn't implement real image decoding or Canvas 2D rendering (no native
// "canvas" package installed — deliberately avoided, see CLAUDE.md's dependency
// posture). These tests mock `Image` and `HTMLCanvasElement` so the aspect-ratio
// math and size-cap plumbing in downscaleImageBlob() can be exercised deterministically
// without needing real image bytes or a native canvas binding.

let fakeImageDims = { width: 0, height: 0 };
let fakeBlobSize = 100 * 1024; // 100KB, under the 200KB cap by default

class FakeImage {
  width = 0;
  height = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    this.width = fakeImageDims.width;
    this.height = fakeImageDims.height;
    queueMicrotask(() => this.onload?.());
  }
}

describe('downscaleImageBlob', () => {
  let originalImage: typeof Image;
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let originalToDataURL: typeof HTMLCanvasElement.prototype.toDataURL;
  let originalToBlob: typeof HTMLCanvasElement.prototype.toBlob;

  beforeEach(() => {
    originalImage = globalThis.Image;
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    originalToBlob = HTMLCanvasElement.prototype.toBlob;

    // @ts-expect-error — test double, not a full HTMLImageElement.
    globalThis.Image = FakeImage;

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.toDataURL = vi.fn(
      (type?: string) => `data:${type ?? 'image/png'};base64,AAAA`
    );

    HTMLCanvasElement.prototype.toBlob = vi.fn(function (
      this: HTMLCanvasElement,
      callback: BlobCallback,
      type?: string
    ) {
      callback(new Blob(['x'.repeat(fakeBlobSize)], { type: type ?? 'image/png' }));
    }) as unknown as typeof HTMLCanvasElement.prototype.toBlob;
  });

  afterEach(() => {
    globalThis.Image = originalImage;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
  });

  it('resolves with a blob under the 200KB cap and a matching data URI', async () => {
    fakeImageDims = { width: 1000, height: 500 };
    fakeBlobSize = 100 * 1024;
    const file = new File(['fake-png-bytes'], 'logo.png', { type: 'image/png' });

    const result = await downscaleImageBlob(file, 500, 500, 0.85);

    expect(result.blob.size).toBeLessThanOrEqual(200 * 1024);
    expect(result.dataUri.startsWith('data:image/png')).toBe(true);
  });

  it('preserves aspect ratio for a portrait input instead of stretching to a square', async () => {
    fakeImageDims = { width: 200, height: 1000 };
    fakeBlobSize = 50 * 1024;

    let capturedCanvas: HTMLCanvasElement | undefined;
    const originalCreateElement = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'canvas') capturedCanvas = el as HTMLCanvasElement;
      return el;
    });

    const file = new File(['fake-png-bytes'], 'logo.png', { type: 'image/png' });
    await downscaleImageBlob(file, 500, 500, 0.85);

    expect(capturedCanvas).toBeDefined();
    // 200x1000 scaled to fit within 500x500: ratio = min(500/200, 500/1000) = 0.5
    // -> width 100, height 500 (proportional, not a stretched 500x500 square).
    expect(capturedCanvas!.width).toBe(100);
    expect(capturedCanvas!.height).toBe(500);

    createSpy.mockRestore();
  });

  it('normalizes JPEG input to a PNG data URI (05-03 gap closure, CR-01)', async () => {
    fakeImageDims = { width: 400, height: 300 };
    fakeBlobSize = 80 * 1024;
    const file = new File(['fake-jpeg-bytes'], 'logo.jpg', { type: 'image/jpeg' });

    const result = await downscaleImageBlob(file, 500, 500, 0.85);

    expect(result.dataUri.startsWith('data:image/png')).toBe(true);
    expect(result.dataUri.startsWith('data:image/jpeg')).toBe(false);
    expect(result.blob.type).toBe('image/png');
  });

  it('rejects when passed a non-image file', async () => {
    const file = new File(['plain text'], 'notes.txt', { type: 'text/plain' });

    await expect(downscaleImageBlob(file)).rejects.toThrow();
  });
});
