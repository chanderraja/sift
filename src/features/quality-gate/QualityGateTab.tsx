// SPDX-License-Identifier: MIT

// QualityGateTab — Quality Gate surface per SPEC §7.3. Three sections:
// status pill, conditions list, and measures grid. The conditions list
// and measures grid land in subsequent Phase 9 commits.

import { useQualityGate } from '../../api/queries';
import { Skeleton } from '../../components/primitives/Skeleton';
import { sonarClient, useSelectionStore } from '../../app/stores';
import { IssuesErrorState } from '../issues/IssuesErrorState';

import { QualityGateStatusPill } from './QualityGateStatusPill';

export function QualityGateTab(): React.JSX.Element {
  const projectKey = useSelectionStore((s) => s.projectKey);
  const branchName = useSelectionStore((s) => s.branchName);
  const enabled = projectKey !== null && branchName !== null;
  const query = useQualityGate(sonarClient, projectKey ?? '', branchName ?? '');

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
      <section data-testid="qg-conditions-slot" aria-label="Quality gate conditions" />
      <section data-testid="qg-measures-slot" aria-label="Quality gate measures" />
    </div>
  );
}
