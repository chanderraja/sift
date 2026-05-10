// SPDX-License-Identifier: MIT
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/unit/**/*.test.{ts,tsx}',
      'tests/integration/**/*.test.{ts,tsx}',
      'src/**/*.test.{ts,tsx}',
    ],
    exclude: ['tests/e2e/**', 'node_modules', 'dist'],
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts', 'src/lib/**/*.test.ts', 'proxy/**/*.test.ts'],
          // SonarClient calls relative URLs (`/api/sonar/v1/...`); fetch in
          // node env can't resolve those without a base. Route api/ tests
          // through jsdom which gives them a window.location to resolve
          // against. `.tsx` files (e.g. queries.smoke.test.tsx that mounts
          // hooks, primitive tests under components/) likewise need a DOM
          // and live only in jsdom.
          exclude: [
            'src/api/**/*.test.ts',
            'src/api/**/*.test.tsx',
            'src/components/**/*.test.tsx',
            'src/stores/**/*.test.tsx',
            'src/features/**/*.test.tsx',
            'src/dev/**/*.test.tsx',
            'src/*.test.tsx',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: [
            'src/**/*.test.tsx',
            'src/**/*.test.ts',
            'tests/integration/**/*.test.{ts,tsx}',
          ],
          exclude: ['src/lib/**/*.test.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}', 'proxy/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.test-d.ts', 'src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
});
