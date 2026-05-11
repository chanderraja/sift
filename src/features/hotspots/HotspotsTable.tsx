// SPDX-License-Identifier: MIT

// HotspotsTable — Hotspot-specific binding of FindingsTable. The
// Hotspot column set is leaner than Issues (no Sift-side severity,
// no tags) and centers on the vulnerability probability + security
// category + status. Sort wires through filtersStore.sort just like
// IssuesTable.

import type { ColumnDef } from '@tanstack/react-table';

import { Badge } from '../../components/primitives/Badge';
import { FindingsTable } from '../../components/primitives/FindingsTable';
import { useFiltersStore } from '../../app/stores';
import type { Hotspot } from '../../types/sonar';

import { HotspotExpandPanel } from './HotspotExpandPanel';

const fileFromComponent = (component: string): string => {
  const colon = component.indexOf(':');
  return colon === -1 ? component : component.slice(colon + 1);
};

const formatRelative = (iso: string): string => {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const days = Math.floor((now - then) / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${String(days)}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${String(months)}mo ago`;
  return `${String(Math.floor(months / 12))}y ago`;
};

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
        {formatRelative(row.original.creationDate)}
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
