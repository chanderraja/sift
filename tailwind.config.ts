// SPDX-License-Identifier: MIT
import type { Config } from 'tailwindcss';

/*
 * Tailwind config for Sift. Color utilities map onto CSS variables
 * defined in `src/styles/tokens.css`; the variables are the single
 * source of truth so theme switching only swaps a `data-theme`
 * attribute on the document root.
 *
 * `darkMode: ['class', '[data-theme="dark"]']` lets `dark:`-prefixed
 * utilities respond to the same attribute the tokens key off.
 *
 * Border radius is capped at 4px per SPEC §16.2 ("sharp edges, small
 * radii").
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          'surface-hover': 'var(--bg-surface-hover)',
          elevated: 'var(--bg-elevated)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          muted: 'var(--accent-muted)',
        },
        severity: {
          blocker: 'var(--severity-blocker)',
          critical: 'var(--severity-critical)',
          major: 'var(--severity-major)',
          minor: 'var(--severity-minor)',
          info: 'var(--severity-info)',
        },
        qg: {
          pass: 'var(--qg-pass)',
          fail: 'var(--qg-fail)',
          warn: 'var(--qg-warn)',
        },
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '4px',
        md: '4px',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: [
          'ui-monospace',
          '"SF Mono"',
          '"Cascadia Mono"',
          '"Roboto Mono"',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        // SPEC §16.4 size scale: 12 / 13 / 14 / 16 / 20 / 28.
        '2xs': ['12px', '1.4'],
        xs: ['13px', '1.4'],
        sm: ['14px', '1.4'],
        base: ['16px', '1.4'],
        lg: ['20px', '1.3'],
        xl: ['28px', '1.2'],
      },
    },
  },
  plugins: [],
} satisfies Config;
