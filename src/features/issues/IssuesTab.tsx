// SPDX-License-Identifier: MIT

// IssuesTab — the Issues tab content per SPEC §7.1. Two-column layout:
// collapsible filter sidebar on the left, results table area on the
// right. Owns the data fetch (`useIssues`) and the loading / empty
// branches; the over-cap warning and error states land in subsequent
// Phase 8 commits.

import { useIssues } from '../../api/queries';
import { EmptyState } from '../../components/primitives/EmptyState';
import { Skeleton } from '../../components/primitives/Skeleton';
import { sonarClient, useFiltersStore, useSelectionStore } from '../../app/stores';
import type {
  Issue,
  IssueFilters,
  IssueType,
  ProjectKey,
  Severity,
  Status,
} from '../../types/sonar';

import { IssuesErrorState } from './IssuesErrorState';
import type { IssueCounts } from './IssuesFilterSidebar';
import { IssuesFilterSidebar } from './IssuesFilterSidebar';
import { IssuesPagination } from './IssuesPagination';
import { IssuesTable } from './IssuesTable';
import { OverCapBanner } from './OverCapBanner';
import { ResultCountBadge } from './ResultCountBadge';

const buildFilters = (
  base: IssueFilters,
  projectKey: ProjectKey,
  branchName: string,
): IssueFilters => ({
  ...base,
  componentKeys: [projectKey],
  branch: branchName,
});

function computeIssueCounts(items: readonly Issue[]): IssueCounts {
  const severities: Partial<Record<Severity, number>> = {};
  const types: Partial<Record<IssueType, number>> = {};
  const statuses: Partial<Record<Status, number>> = {};
  for (const issue of items) {
    severities[issue.severity] = (severities[issue.severity] ?? 0) + 1;
    types[issue.type] = (types[issue.type] ?? 0) + 1;
    statuses[issue.status] = (statuses[issue.status] ?? 0) + 1;
  }
  return { severities, types, statuses };
}

export function IssuesTab(): React.JSX.Element {
  const projectKey = useSelectionStore((s) => s.projectKey);
  const branchName = useSelectionStore((s) => s.branchName);
  const issuesFilters = useFiltersStore((s) => s.issuesFilters);
  const page = useFiltersStore((s) => s.page);
  const pageSize = useFiltersStore((s) => s.pageSize);

  const enabled = projectKey !== null && branchName !== null;
  const filters: IssueFilters = enabled
    ? buildFilters(issuesFilters, projectKey, branchName)
    : issuesFilters;
  // useIssues honors `enabled` via the query options factory; pass it
  // through TanStack's query options merge.
  const query = useIssues(sonarClient, filters, { p: page, ps: pageSize });
  const issueCounts: IssueCounts | undefined =
    query.data?.kind === 'ok' ? computeIssueCounts(query.data.value.items) : undefined;

  return (
    <div data-testid="issues-tab" className="grid h-full grid-cols-[280px_1fr] gap-4">
      <aside
        data-testid="issues-filter-sidebar"
        aria-label="Issue filters"
        className="border-r border-border-subtle pr-4"
      >
        <IssuesFilterSidebar {...(issueCounts === undefined ? {} : { issueCounts })} />
      </aside>
      <section data-testid="issues-results" className="flex min-w-0 flex-col gap-3">
        {!enabled ? null : query.isPending ? (
          <IssuesLoading />
        ) : query.data === undefined ? null : query.data.kind === 'over_cap' ? (
          <OverCapBanner total={query.data.total} />
        ) : query.data.kind === 'ok' ? (
          <IssuesContent
            items={query.data.value.items}
            total={query.data.value.total}
            page={page}
            pageSize={pageSize}
          />
        ) : (
          <IssuesErrorState variant={query.data} />
        )}
      </section>
    </div>
  );
}

function IssuesLoading(): React.JSX.Element {
  return (
    <div data-testid="issues-loading" className="flex flex-col gap-2">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  );
}

interface IssuesContentProps {
  items: readonly Issue[];
  total: number;
  page: number;
  pageSize: number;
}

function IssuesContent({ items, total, page, pageSize }: IssuesContentProps): React.JSX.Element {
  if (items.length === 0) {
    return (
      <EmptyState
        heading="No issues match the current filters"
        body="Try clearing or broadening a filter in the sidebar."
      />
    );
  }
  return (
    <>
      <ResultCountBadge total={total} page={page} pageSize={pageSize} />
      <IssuesTable items={items} />
      <IssuesPagination total={total} />
    </>
  );
}
