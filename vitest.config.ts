import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      enabled: false,
      provider: 'v8',
    },
    environment: 'node',
    fileParallelism: false,
    include: ['tests/**/*.test.ts'],
    restoreMocks: true,
  },
});
