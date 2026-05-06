// SPDX-License-Identifier: MIT
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environmentMatchGlobs: [
      ['tests/unit/**/*.test.{ts,tsx}', 'node'],
      ['src/lib/**/*.test.ts', 'node'],
      ['src/**/*.test.tsx', 'jsdom'],
      ['tests/integration/**/*.test.{ts,tsx}', 'jsdom'],
    ],
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}', 'proxy/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.test-d.ts', 'src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
});
