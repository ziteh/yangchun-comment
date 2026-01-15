import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/app.test.ts'], // TODO: fix the tests in app.test.ts
    passWithNoTests: true,
  },
});
