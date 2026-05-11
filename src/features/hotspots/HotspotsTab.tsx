// SPDX-License-Identifier: MIT

// HotspotsTab — security-hotspot triage surface per SPEC §7.2. Mirrors
// IssuesTab in shape: two-column layout (filter sidebar + results),
// loading / over-cap (n/a here)/ empty / error branches. Hotspot
// filters are narrower than Issues, so the sidebar lands in the next
// commit; this commit owns the data fetch + table.

import { useHotspots } from '../../api/queries';
import { EmptyState } from '../../components/primitives/EmptyState';
import { Skeleton } from '../../components/primitives/Skeleton';
import { sonarClient, useFiltersStore, useSelectionStore } from '../../app/stores';
import { IssuesErrorState } from '../issues/IssuesErrorState';
import { IssuesPagination } from '../issues/IssuesPagination';
import { ResultCountBadge } from '../issues/ResultCountBadge';
import type { Hotspot, HotspotFilters, ProjectKey } from '../../types/sonar';

import { HotspotsTable } from './HotspotsTable';

const buildFilters = (
  base: HotspotFilters | null,
  projectKey: ProjectKey,
  branchName: string,
): HotspotFilters => ({
  ...(base ?? {}),
  projectKey,
  branch: branchName,
});

const NOUNS = { singular: 'hotspot', plural: 'hotspots' } as const;

export function HotspotsTab(): React.JSX.Element {
  const projectKey = useSelectionStore((s) => s.projectKey);
  const branchName = useSelectionStore((s) => s.branchName);
  const hotspotsFilters = useFiltersStore((s) => s.hotspotsFilters);
  const page = useFiltersStore((s) => s.page);
  const pageSize = useFiltersStore((s) => s.pageSize);

  const enabled = projectKey !== null && branchName !== null;
  const filters: HotspotFilters | null = enabled
    ? buildFilters(hotspotsFilters, projectKey, branchName)
    : null;
  const query = useHotspots(
    sonarClient,
    filters ?? ({ projectKey: '' as ProjectKey } satisfies HotspotFilters),
    { p: page, ps: pageSize },
  );

  return (
    <div data-testid="hotspots-tab" className="grid h-full grid-cols-[280px_1fr] gap-4">
      <aside
        data-testid="hotspots-filter-sidebar"
        aria-label="Hotspot filters"
        className="border-r border-border-subtle pr-4"
      />
      <section data-testid="hotspots-results" className="flex min-w-0 flex-col gap-3">
        {!enabled ? null : query.isPending ? (
          <HotspotsLoading />
        ) : query.data === undefined ? null : query.data.kind === 'ok' ? (
          <HotspotsContent
            items={query.data.value.items}
            total={query.data.value.total}
            page={page}
            pageSize={pageSize}
          />
        ) : query.data.kind === 'over_cap' ? null : (
          <IssuesErrorState variant={query.data} />
        )}
      </section>
    </div>
  );
}

function HotspotsLoading(): React.JSX.Element {
  return (
    <div data-testid="hotspots-loading" className="flex flex-col gap-2">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  );
}

interface HotspotsContentProps {
  items: readonly Hotspot[];
  total: number;
  page: number;
  pageSize: number;
}

function HotspotsContent({
  items,
  total,
  page,
  pageSize,
}: HotspotsContentProps): React.JSX.Element {
  if (items.length === 0) {
    return (
      <EmptyState
        heading="No security hotspots match the current filters"
        body="Try clearing or broadening a filter in the sidebar."
      />
    );
  }
  return (
    <>
      <ResultCountBadge total={total} page={page} pageSize={pageSize} nouns={NOUNS} />
      <HotspotsTable items={items} />
      <IssuesPagination total={total} />
    </>
  );
}
