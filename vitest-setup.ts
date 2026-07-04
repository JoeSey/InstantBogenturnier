import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';

// jsdom + @testing-library/svelte cleanup between tests.
afterEach(() => {
  cleanup();
});
