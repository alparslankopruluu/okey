import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'src/**/*.test.ts', 'workers/**/*.test.ts'],
    coverage: { reporter: ['text', 'json-summary'] },
  },
});
