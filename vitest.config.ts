import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use node environment for server-side utility tests; switch to 'jsdom'
    // on a per-file basis with @vitest-environment jsdom when React component
    // tests are added in Phase 2+.
    environment: 'node',
    globals: true,
    include: ['**/__tests__/**/*.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
