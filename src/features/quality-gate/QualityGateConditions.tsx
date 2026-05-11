// SPDX-License-Identifier: MIT

// QualityGateConditions — table of the project's gate conditions with
// metric, comparator, threshold, actual value, and pass/fail tone.

import { Check, X } from 'lucide-react';

import type { QualityGate } from '../../types/sonar';

import { formatComparator, formatMetricValue, humanizeMetricKey } from './metricFormat';

type Condition = QualityGate['projectStatus']['conditions'][number];

const STATUS_LABEL: Record<Condition['status'], string> = {
  OK: 'Pass',
  WARN: 'Warn',
  ERROR: 'Fail',
};

const STATUS_TONE: Record<Condition['status'], string> = {
  OK: 'text-qg-pass',
  WARN: 'text-qg-warn',
  ERROR: 'text-qg-fail',
};

export interface QualityGateConditionsProps {
  conditions: readonly Condition[];
}

export function QualityGateConditions({
  conditions,
}: QualityGateConditionsProps): React.JSX.Element {
  if (conditions.length === 0) {
    return <p className="text-xs text-text-secondary">This gate has no conditions configured.</p>;
  }

  return (
    <table
      data-testid="qg-conditions-table"
      className="w-full border-collapse text-xs text-text-primary"
    >
      <thead className="border-b border-border-subtle text-text-secondary">
        <tr>
          <th className="h-8 px-2 text-left font-medium uppercase tracking-wide">Metric</th>
          <th className="h-8 px-2 text-left font-medium uppercase tracking-wide">Op</th>
          <th className="h-8 px-2 text-left font-medium uppercase tracking-wide">Threshold</th>
          <th className="h-8 px-2 text-left font-medium uppercase tracking-wide">Actual</th>
          <th className="h-8 px-2 text-left font-medium uppercase tracking-wide">Status</th>
        </tr>
      </thead>
      <tbody>
        {conditions.map((c) => (
          <tr key={c.metricKey} className="border-b border-border-subtle">
            <td className="px-2 py-1.5">{humanizeMetricKey(c.metricKey)}</td>
            <td className="px-2 py-1.5 font-mono text-text-secondary">
              {formatComparator(c.comparator)}
            </td>
            <td className="px-2 py-1.5 tabular-nums">
              {formatMetricValue(c.metricKey, c.errorThreshold)}
            </td>
            <td className="px-2 py-1.5 tabular-nums">
              {formatMetricValue(c.metricKey, c.actualValue)}
            </td>
            <td className={`px-2 py-1.5 ${STATUS_TONE[c.status]}`}>
              <span className="inline-flex items-center gap-1">
                {c.status === 'OK' ? (
                  <Check className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <X className="h-3 w-3" aria-hidden="true" />
                )}
                {STATUS_LABEL[c.status]}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
