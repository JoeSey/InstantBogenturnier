import 'fake-indexeddb/auto';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import { Blob as NodeBlob } from 'node:buffer';

// jsdom + @testing-library/svelte cleanup between tests.
afterEach(() => {
  cleanup();
});

// Phase 5 Plan 01: fake-indexeddb's insertion cloning uses Node's global
// structuredClone(), which only recognizes Node's own `Blob` (from `node:buffer`) —
// not jsdom's separate `Blob` polyfill. Without this, a Blob written to Dexie comes
// back as `{}` after the structured-clone round trip under jsdom, even though real
// browsers preserve Blob identity correctly via IndexedDB's native structured clone.
// Aligning the global `Blob` with Node's implementation makes `settings` table Blob
// round-trip tests (schema.test.ts) reflect real browser behavior.
globalThis.Blob = NodeBlob as unknown as typeof Blob;
