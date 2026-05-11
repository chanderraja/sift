// SPDX-License-Identifier: MIT

// QualityGateMeasures — grid of the eight default measures per
// IMPLEMENTATION.md Phase 9 (resolved 2026-05-10): coverage,
// duplication, ncloc, technical debt, complexity, and the three
// security / reliability / maintainability ratings.
//
// SonarCloud's actual metric keys diverge from the colloquial names:
// "maintainability_rating" is `sqale_rating`, and "technical_debt" is
// `sqale_index`. We list the colloquial label and the upstream key
// side by side so the request and the display stay in sync.

import type { Measure } from '../../types/sonar';

import { formatMetricValue } from './metricFormat';

export interface MeasureDescriptor {
  key: string;
  label: string;
}

export const QG_DEFAULT_MEASURES: readonly MeasureDescriptor[] = [
  { key: 'coverage', label: 'Coverage' },
  { key: 'duplicated_lines_density', label: 'Duplication' },
  { key: 'ncloc', label: 'Lines of code' },
  { key: 'sqale_index', label: 'Technical debt' },
  { key: 'complexity', label: 'Complexity' },
  { key: 'security_rating', label: 'Security' },
  { key: 'reliability_rating', label: 'Reliability' },
  { key: 'sqale_rating', label: 'Maintainability' },
];

export interface QualityGateMeasuresProps {
  measures: readonly Measure[];
  /** Optional override; defaults to the Phase 9 measure set. */
  descriptors?: readonly MeasureDescriptor[];
}

export function QualityGateMeasures({
  measures,
  descriptors = QG_DEFAULT_MEASURES,
}: QualityGateMeasuresProps): React.JSX.Element {
  const byMetric = new Map(measures.map((m) => [m.metric, m]));

  return (
    <dl
      data-testid="qg-measures-grid"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
    >
      {descriptors.map((d) => {
        const measure = byMetric.get(d.key);
        const raw = measure?.value ?? null;
        return (
          <div
            key={d.key}
            data-testid={`qg-measure-${d.key}`}
            className="flex flex-col rounded border border-border-subtle bg-bg-surface px-3 py-2"
          >
            <dt className="text-2xs font-medium uppercase tracking-wide text-text-secondary">
              {d.label}
            </dt>
            <dd className="text-base tabular-nums text-text-primary">
              {formatMetricValue(d.key, raw)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
