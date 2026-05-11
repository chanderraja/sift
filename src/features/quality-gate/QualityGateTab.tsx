// SPDX-License-Identifier: MIT

// QualityGateTab — Quality Gate surface per SPEC §7.3. Three sections:
// status pill, conditions list, and measures grid. The conditions list
// and measures grid land in subsequent Phase 9 commits.

import { useMeasures, useQualityGate } from '../../api/queries';
import { Skeleton } from '../../components/primitives/Skeleton';
import { sonarClient, useSelectionStore } from '../../app/stores';
import { IssuesErrorState } from '../issues/IssuesErrorState';

import { QualityGateConditions } from './QualityGateConditions';
import { QG_DEFAULT_MEASURES, QualityGateMeasures } from './QualityGateMeasures';
import { QualityGateStatusPill } from './QualityGateStatusPill';

const MEASURE_KEYS: string[] = QG_DEFAULT_MEASURES.map((d) => d.key);

export function QualityGateTab(): React.JSX.Element {
  const projectKey = useSelectionStore((s) => s.projectKey);
  const branchName = useSelectionStore((s) => s.branchName);
  const enabled = projectKey !== null && branchName !== null;
  const query = useQualityGate(sonarClient, projectKey ?? '', branchName ?? '');
  const measuresQuery = useMeasures(sonarClient, projectKey ?? '', branchName ?? '', MEASURE_KEYS);

  if (!enabled) return <div data-testid="quality-gate-tab" />;

  return (
    <div data-testid="quality-gate-tab" className="flex flex-col gap-6">
      <section data-testid="qg-status-slot" aria-label="Quality gate status">
        {query.isPending ? (
          <Skeleton data-testid="qg-status-loading" className="h-10 w-44" />
        ) : query.data === undefined ? null : query.data.kind === 'ok' ? (
          <QualityGateStatusPill status={query.data.value.projectStatus.status} />
        ) : query.data.kind === 'over_cap' ? null : (
          <IssuesErrorState variant={query.data} />
        )}
      </section>
      <section data-testid="qg-conditions-slot" aria-label="Quality gate conditions">
        {query.data?.kind === 'ok' ? (
          <QualityGateConditions conditions={query.data.value.projectStatus.conditions} />
        ) : null}
      </section>
      <section data-testid="qg-measures-slot" aria-label="Quality gate measures">
        {measuresQuery.isPending ? (
          <div
            data-testid="qg-measures-loading"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
            {Array.from({ length: MEASURE_KEYS.length }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : measuresQuery.data?.kind === 'ok' ? (
          <QualityGateMeasures measures={measuresQuery.data.value} />
        ) : null}
      </section>
    </div>
  );
}
