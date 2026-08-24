// SPDX-License-Identifier: MIT

// HotspotsTable — Hotspot-specific binding of FindingsTable. The
// Hotspot column set is leaner than Issues (no Sift-side severity,
// no tags) and centers on the vulnerability probability + security
// category + status. Sort wires through filtersStore.sort just like
// IssuesTable.

import type { ColumnDef } from '@tanstack/react-table';
import { ExternalLink } from 'lucide-react';
import { useMemo } from 'react';

import { Badge } from '../../components/primitives/Badge';
import { FindingsTable } from '../../components/primitives/FindingsTable';
import { Tooltip } from '../../components/primitives/Tooltip';
import { fileFromComponent } from '../../lib/component';
import { formatRelativeDate } from '../../lib/format';
import { hotspotUrl } from '../../lib/sonarUrl';
import { useAuthStore, useFiltersStore, useSelectionStore } from '../../app/stores';
import type { Hotspot } from '../../types/sonar';

import { HotspotExpandPanel } from './HotspotExpandPanel';

const PROBABILITY_TONE = {
  HIGH: 'severity-blocker',
  MEDIUM: 'severity-major',
  LOW: 'severity-info',
} as const;

const BASE_COLUMNS: ColumnDef<Hotspot>[] = [
  {
    accessorKey: 'vulnerabilityProbability',
    header: 'Probability',
    cell: ({ row }) => (
      <Badge tone={PROBABILITY_TONE[row.original.vulnerabilityProbability]}>
        {row.original.vulnerabilityProbability}
      </Badge>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'securityCategory',
    header: 'Category',
    cell: ({ row }) => <span className="text-text-secondary">{row.original.securityCategory}</span>,
    enableSorting: true,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <Badge tone="neutral">{row.original.status}</Badge>,
    enableSorting: true,
  },
  {
    accessorKey: 'message',
    header: 'Message',
    cell: ({ row }) => <span className="line-clamp-1">{row.original.message}</span>,
    enableSorting: false,
  },
  {
    id: 'file',
    header: 'File',
    accessorFn: (h) => fileFromComponent(h.component),
    cell: ({ row }) => (
      <span className="font-mono text-text-secondary">
        {fileFromComponent(row.original.component)}
      </span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'line',
    header: 'Line',
    cell: ({ row }) => (
      <span className="tabular-nums text-text-secondary">{row.original.line}</span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'creationDate',
    header: 'Created',
    cell: ({ row }) => (
      <span className="tabular-nums text-text-secondary">
        {formatRelativeDate(row.original.creationDate)}
      </span>
    ),
    enableSorting: true,
  },
];

export interface HotspotsTableProps {
  items: readonly Hotspot[];
}

export function HotspotsTable({ items }: HotspotsTableProps): React.JSX.Element {
  const sort = useFiltersStore((s) => s.sort);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setSort = useFiltersStore.getState().setSort;

  const region = useAuthStore((s) => s.region);
  const projectKey = useSelectionStore((s) => s.projectKey);
  const branchName = useSelectionStore((s) => s.branchName);

  const columns = useMemo<ColumnDef<Hotspot>[]>(
    () => [
      ...BASE_COLUMNS,
      {
        id: 'sonarLink',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const href = hotspotUrl(region, projectKey ?? '', row.original.key, branchName ?? '');
          return (
            <Tooltip content="Open in SonarCloud." delayDuration={300}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label="Open in SonarCloud"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Tooltip>
          );
        },
      },
    ],
    [region, projectKey, branchName],
  );

  return (
    <FindingsTable<Hotspot>
      items={items}
      columns={columns}
      getRowKey={(h) => h.key}
      renderExpandPanel={(h) => <HotspotExpandPanel hotspot={h} />}
      sort={sort}
      onSortChange={setSort}
    />
  );
}
