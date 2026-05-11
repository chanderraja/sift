// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';

import { formatDuration, formatNcloc, formatPercentage, formatRating } from './format';

// Every formatter falls back to an em-dash on invalid input. Asserting
// that contract once across all formatters keeps the suite from
// repeating itself in four near-identical blocks.
const FORMATTERS = {
  formatRating,
  formatPercentage,
  formatNcloc,
  formatDuration,
} as const;

const INVALID_INPUTS: readonly (string | null)[] = [null, '', 'NaN'];

describe('formatters — em-dash fallback on invalid input', () => {
  for (const [name, fn] of Object.entries(FORMATTERS)) {
    it.each(INVALID_INPUTS)(`${name}(%j) → "—"`, (input) => {
      expect(fn(input)).toBe('—');
    });
  }
});

describe('formatRating', () => {
  it.each([
    ['1.0', 'A'],
    ['1', 'A'],
    ['2.0', 'B'],
    ['3.0', 'C'],
    ['4.0', 'D'],
    ['5.0', 'E'],
  ])('maps SonarCloud rating %s to %s', (input, expected) => {
    expect(formatRating(input)).toBe(expected);
  });

  it('returns an em-dash for ratings outside the 1..5 band', () => {
    expect(formatRating('0')).toBe('—');
    expect(formatRating('6')).toBe('—');
    expect(formatRating('not-a-number')).toBe('—');
  });
});

describe('formatPercentage', () => {
  it('renders a percentage with one decimal', () => {
    expect(formatPercentage('73.5')).toBe('73.5%');
  });

  it('preserves whole numbers without a trailing .0', () => {
    expect(formatPercentage('100')).toBe('100%');
    expect(formatPercentage('100.0')).toBe('100%');
    expect(formatPercentage('0')).toBe('0%');
  });

  it('clamps to one decimal place on long values', () => {
    expect(formatPercentage('73.487')).toBe('73.5%');
  });
});

describe('formatNcloc', () => {
  it('renders small counts as-is with a thousands separator', () => {
    expect(formatNcloc('142')).toBe('142');
    expect(formatNcloc('999')).toBe('999');
  });

  it('renders thousands with k suffix at one decimal', () => {
    expect(formatNcloc('1234')).toBe('1.2k');
    expect(formatNcloc('10000')).toBe('10k');
    expect(formatNcloc('99999')).toBe('100k');
  });

  it('renders millions with M suffix at one decimal', () => {
    expect(formatNcloc('1234567')).toBe('1.2M');
    expect(formatNcloc('12000000')).toBe('12M');
  });
});

describe('formatDuration', () => {
  it('renders sub-hour durations in minutes', () => {
    expect(formatDuration('45')).toBe('45min');
    expect(formatDuration('1')).toBe('1min');
  });

  it('renders whole-hour durations as Xh', () => {
    expect(formatDuration('60')).toBe('1h');
    expect(formatDuration('120')).toBe('2h');
  });

  it('renders mixed hours and minutes', () => {
    expect(formatDuration('125')).toBe('2h 5min');
    expect(formatDuration('90')).toBe('1h 30min');
  });

  it('renders multi-day durations as Xd Yh when ≥ 1 day', () => {
    // 8h workday convention is SonarCloud's debt model.
    expect(formatDuration('480')).toBe('1d'); // 8h * 60min
    expect(formatDuration('600')).toBe('1d 2h');
    expect(formatDuration('540')).toBe('1d 1h');
  });
});
