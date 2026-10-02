import { defineConfig } from 'vitest/config';

// Unit tests only. The browser gates under tests/e2e are Playwright specs run by `pnpm gates:e2e`;
// collected here, Playwright's test.describe() throws outside its own runner and fails the suite.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/unit/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
    passWithNoTests: true,
  },
});
