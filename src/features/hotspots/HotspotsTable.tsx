// SPDX-License-Identifier: MIT

// HotspotsTable — Hotspot-specific binding of FindingsTable. The
// Hotspot column set is leaner than Issues (no Sift-side severity,
// no tags) and centers on the vulnerability probability + security
// category + status. Sort wires through filtersStore.sort just like
// IssuesTable.

import type { ColumnDef } from '@tanstack/react-table';

import { Badge } from '../../components/primitives/Badge';
import { FindingsTable } from '../../components/primitives/FindingsTable';
import { fileFromComponent } from '../../lib/component';
import { formatRelativeDate } from '../../lib/format';
import { useFiltersStore } from '../../app/stores';
import type { Hotspot } from '../../types/sonar';

import { HotspotExpandPanel } from './HotspotExpandPanel';

const PROBABILITY_TONE = {
  HIGH: 'severity-blocker',
  MEDIUM: 'severity-major',
  LOW: 'severity-info',
} as const;

const columns: ColumnDef<Hotspot>[] = [
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
