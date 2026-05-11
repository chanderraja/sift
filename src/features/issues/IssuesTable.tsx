// SPDX-License-Identifier: MIT

// IssuesTable — Issue-specific binding of the generic FindingsTable
// primitive. Owns the column set (per ARCHITECTURE.md §Issues tab),
// the Issue.key row identity, and the IssueExpandPanel renderer.
// Sortable headers round-trip through filtersStore.sort so URL hash
// and cross-tab persistence flow for free.

import type { ColumnDef } from '@tanstack/react-table';

import { SeverityBadge, StatusBadge, TypeBadge } from '../../components/primitives/Badge';
import { FindingsTable } from '../../components/primitives/FindingsTable';
import { fileFromComponent } from '../../lib/component';
import { formatRelativeDate } from '../../lib/format';
import { useFiltersStore } from '../../app/stores';
import type { Issue } from '../../types/sonar';

import { IssueExpandPanel } from './IssueExpandPanel';

const columns: ColumnDef<Issue>[] = [
  {
    accessorKey: 'severity',
    header: 'Severity',
    cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
    enableSorting: true,
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => <TypeBadge type={row.original.type} />,
    enableSorting: true,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    enableSorting: true,
  },
  {
    accessorKey: 'rule',
    header: 'Rule',
    cell: ({ row }) => <span className="font-mono text-text-secondary">{row.original.rule}</span>,
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
    accessorFn: (issue) => fileFromComponent(issue.component),
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
      <span className="tabular-nums text-text-secondary">{row.original.line ?? '—'}</span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'effort',
    header: 'Effort',
    cell: ({ row }) => (
      <span className="tabular-nums text-text-secondary">{row.original.effort ?? '—'}</span>
    ),
    enableSorting: false,
  },
  {
    id: 'tags',
    header: 'Tags',
    cell: ({ row }) =>
      row.original.tags.length === 0 ? (
        <span className="text-text-tertiary">—</span>
      ) : (
        <span className="text-text-tertiary">{row.original.tags.join(', ')}</span>
      ),
    enableSorting: false,
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

export interface IssuesTableProps {
  items: readonly Issue[];
}

export function IssuesTable({ items }: IssuesTableProps): React.JSX.Element {
  const sort = useFiltersStore((s) => s.sort);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setSort = useFiltersStore.getState().setSort;

  return (
    <FindingsTable<Issue>
      items={items}
      columns={columns}
      getRowKey={(issue) => issue.key}
      renderExpandPanel={(issue) => <IssueExpandPanel issue={issue} />}
      sort={sort}
      onSortChange={setSort}
    />
  );
}
