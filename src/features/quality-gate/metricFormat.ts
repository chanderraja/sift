// SPDX-License-Identifier: MIT

// Per-metric formatting and labeling for the Quality Gate view.
//
// SonarCloud returns measure and condition values as strings keyed by
// the metric key (e.g. `new_reliability_rating`). The formatter picks
// the right `format*` helper based on the suffix / well-known keys.
// Unknown keys fall back to the raw value; the table still renders.

import { formatDuration, formatNcloc, formatPercentage, formatRating } from '../../lib/format';

const DURATION_KEYS = new Set([
  'sqale_index',
  'new_technical_debt',
  'technical_debt',
  'reliability_remediation_effort',
  'new_reliability_remediation_effort',
  'security_remediation_effort',
  'new_security_remediation_effort',
]);

const NCLOC_KEYS = new Set(['ncloc', 'new_lines', 'lines', 'new_ncloc', 'statements']);

/**
 * Pick the right formatter for a SonarCloud metric value. The decision
 * tree (suffix / key set) covers every metric the v1 Quality Gate view
 * cares about; unknown metrics return the raw string unchanged.
 */
export function formatMetricValue(metricKey: string, raw: string | null): string {
  if (metricKey.endsWith('_rating')) return formatRating(raw);
  if (DURATION_KEYS.has(metricKey)) return formatDuration(raw);
  if (NCLOC_KEYS.has(metricKey)) return formatNcloc(raw);
  if (
    metricKey.endsWith('_density') ||
    metricKey.endsWith('_percentage') ||
    metricKey === 'coverage' ||
    metricKey === 'new_coverage' ||
    metricKey === 'duplicated_lines_density'
  ) {
    return formatPercentage(raw);
  }
  return raw ?? '—';
}

/**
 * Render a snake_case metric key as a human label.
 * `new_reliability_rating` → `New reliability rating`.
 */
export function humanizeMetricKey(metricKey: string): string {
  const words = metricKey.split('_');
  return words.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ');
}

const COMPARATOR_SYMBOL: Record<'GT' | 'LT' | 'EQ' | 'NE', string> = {
  GT: '>',
  LT: '<',
  EQ: '=',
  NE: '≠',
};

export function formatComparator(comparator: 'GT' | 'LT' | 'EQ' | 'NE'): string {
  return COMPARATOR_SYMBOL[comparator];
}
