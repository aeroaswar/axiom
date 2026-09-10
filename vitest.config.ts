import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Without an explicit `include`, vitest's default glob picks up tests/e2e/gates.spec.ts — a
// Playwright spec, whose `test.describe` it cannot run — and `pnpm test` fails before reaching a
// single unit test. The browser gates stay with `pnpm gates:e2e`; this file is the pure ones.
export default defineConfig({
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
