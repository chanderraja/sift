// SPDX-License-Identifier: MIT

// Formatters for SonarCloud measure values. Every formatter takes a
// possibly-null string (SonarCloud's `/api/measures/component` always
// stringifies values) and returns a render-ready string. Invalid input
// falls back to an em-dash so the UI never has to special-case it.

const EM_DASH = '—';

const parseNum = (raw: string | null): number | null => {
  if (raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

// Each formatter's first move is "parse → bail on invalid with em-dash."
// Funneling that through a single helper keeps the four formatters from
// repeating the same three-line preamble.
const fromNum = (raw: string | null, render: (n: number) => string): string => {
  const n = parseNum(raw);
  return n === null ? EM_DASH : render(n);
};

/**
 * SonarCloud rates `1.0`..`5.0` → A..E. Anything outside that band
 * (including 0, 6, "" and null) renders as an em-dash so callers never
 * have to special-case.
 */
const RATING_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

export function formatRating(raw: string | null): string {
  return fromNum(raw, (n) => {
    // Sonar uses 1-based ratings; round to an integer because some
    // endpoints stringify "1.0" and some "1".
    const idx = Math.round(n) - 1;
    return RATING_LETTERS[idx] ?? EM_DASH;
  });
}

/**
 * Render a percentage at one decimal. Whole numbers drop the `.0` for
 * a cleaner look ("100%" rather than "100.0%").
 */
export function formatPercentage(raw: string | null): string {
  return fromNum(raw, (n) => {
    const rounded = Math.round(n * 10) / 10;
    const display = rounded.toString().endsWith('.0')
      ? rounded.toString().slice(0, -2)
      : rounded.toString();
    return `${display}%`;
  });
}

/**
 * Compact line-count formatter. Values < 1000 render raw; thousands
 * get a `k` suffix, millions an `M`. One decimal is kept when it
 * carries information ("1.2k") and dropped when it does not ("10k").
 */
export function formatNcloc(raw: string | null): string {
  return fromNum(raw, (n) => {
    if (n < 1000) return n.toLocaleString('en-US');
    const compact = (value: number, suffix: 'k' | 'M'): string => {
      const oneDecimal = Math.round(value * 10) / 10;
      const display = oneDecimal % 1 === 0 ? String(Math.round(oneDecimal)) : oneDecimal.toFixed(1);
      return `${display}${suffix}`;
    };
    return n < 1_000_000 ? compact(n / 1000, 'k') : compact(n / 1_000_000, 'M');
  });
}

/**
 * SonarCloud reports technical-debt-like durations in minutes, using
 * an 8h-workday convention (1d = 480min, 1h = 60min). Render compactly:
 * `45min`, `1h`, `2h 5min`, `1d 2h`.
 */
const MIN_PER_HOUR = 60;
const MIN_PER_DAY = 8 * MIN_PER_HOUR;

export function formatDuration(raw: string | null): string {
  return fromNum(raw, (n) => {
    if (n < MIN_PER_HOUR) return `${String(Math.round(n))}min`;
    if (n < MIN_PER_DAY) {
      const hours = Math.floor(n / MIN_PER_HOUR);
      const minutes = Math.round(n - hours * MIN_PER_HOUR);
      return minutes === 0 ? `${String(hours)}h` : `${String(hours)}h ${String(minutes)}min`;
    }
    const days = Math.floor(n / MIN_PER_DAY);
    const remainingMinutes = n - days * MIN_PER_DAY;
    const remainingHours = Math.round(remainingMinutes / MIN_PER_HOUR);
    return remainingHours === 0
      ? `${String(days)}d`
      : `${String(days)}d ${String(remainingHours)}h`;
  });
}
