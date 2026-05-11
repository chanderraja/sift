// SPDX-License-Identifier: MIT
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import licenseHeader from 'eslint-plugin-license-header';
import prettier from 'eslint-config-prettier';

const SPDX_HEADER = ['// SPDX-License-Identifier: MIT'];

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'node_modules', '.vercel'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-expect-error': 'allow-with-description',
          'ts-nocheck': true,
          'ts-check': false,
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  // SPDX header required in src/, proxy/, api/, and tests/ — per SPEC §12.1.
  // .d.ts files are excluded because TypeScript triple-slash directives
  // confuse eslint-plugin-license-header's AST traversal; they are not
  // hand-authored source files in any meaningful sense.
  {
    files: ['src/**/*.{ts,tsx}', 'proxy/**/*.{ts,tsx}', 'api/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    ignores: ['**/*.d.ts'],
    plugins: { 'license-header': licenseHeader },
    rules: {
      'license-header/header': ['error', SPDX_HEADER],
    },
  },
  // No-console outside the logger module — token redaction lives there only.
  // The logger doesn't exist yet (Phase 4), so this rule is wired up but its
  // \`no-restricted-syntax\` enforcement starts mattering once code lands.
  {
    files: ['src/**/*.{ts,tsx}', 'proxy/**/*.ts', 'api/**/*.ts'],
    ignores: ['src/lib/logger.ts'],
    rules: {
      'no-console': 'error',
    },
  },
  // Test files: relax some prod-leaning rules.
  {
    files: ['**/*.test.{ts,tsx}', '**/*.test-d.ts', 'tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Loosen type-aware rules on plain config files (not in any tsconfig).
  {
    files: ['*.config.{js,ts}', 'postcss.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);
