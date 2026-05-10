// SPDX-License-Identifier: MIT

// IssuesTable — TanStack Table rendering of an Issue page. Column set
// per ARCHITECTURE.md §Issues tab; sortable headers wire into
// filtersStore.sort so URL hash + cross-tab persistence flows for
// free. Row interaction (click-to-expand) lands in a subsequent
// Phase 8 commit.
//
// The table is presentational: data fetching, pagination, and
// filtering live above in IssuesTab. We hand a pre-paged `items` in
// and the table renders columns + sort affordances.

import type { ColumnDef, SortingState } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo } from 'react';

import { SeverityBadge, StatusBadge, TypeBadge } from '../../components/primitives/Badge';
import {
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRoot,
  TableRow,
  type SortDirection,
} from '../../components/primitives/Table';
import { useFiltersStore } from '../../app/stores';
import type { Issue } from '../../types/sonar';

/**
 * Strip the `projectKey:` prefix from `component` so the path column
 * shows `src/foo.ts` rather than `acme_widget:src/foo.ts`.
 */
const fileFromComponent = (component: string): string => {
  const colon = component.indexOf(':');
  return colon === -1 ? component : component.slice(colon + 1);
};

const formatRelative = (iso: string): string => {
  // Lightweight relative format — full Intl.RelativeTimeFormat lands
  // with Phase 11 polish along with a TimeAgo primitive.
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
        {formatRelative(row.original.creationDate)}
      </span>
    ),
    enableSorting: true,
  },
];

const directionToHeader = (id: string, state: SortingState): SortDirection => {
  const entry = state.find((s) => s.id === id);
  if (!entry) return null;
  return entry.desc ? 'desc' : 'asc';
};

export interface IssuesTableProps {
  items: readonly Issue[];
}

export function IssuesTable({ items }: IssuesTableProps): React.JSX.Element {
  const sort = useFiltersStore((s) => s.sort);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setSort = useFiltersStore.getState().setSort;

  // Map filtersStore.sort → TanStack SortingState. The two shapes
  // mirror each other so the conversion is a pair of light maps.
  const sorting: SortingState = useMemo(
    () => sort.map((s) => ({ id: s.column, desc: s.direction === 'desc' })),
    [sort],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns non-memoizable functions by design; downstream consumers re-read each render.
  const table = useReactTable<Issue>({
    data: items as Issue[],
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      setSort(
        next.map((entry) => ({
          column: entry.id,
          direction: entry.desc ? 'desc' : 'asc',
        })),
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  });

  return (
    <TableRoot>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => {
              const direction = directionToHeader(header.column.id, sorting);
              const canSort = header.column.getCanSort();
              const tanstackHandler = header.isPlaceholder
                ? undefined
                : header.column.getToggleSortingHandler();
              const onSortProps =
                canSort && tanstackHandler !== undefined ? { onSort: tanstackHandler } : {};
              return (
                <TableHeaderCell key={header.id} sortDirection={direction} {...onSortProps}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHeaderCell>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </TableRoot>
  );
}
