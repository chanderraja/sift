// SPDX-License-Identifier: MIT

// FindingsTable — generic TanStack Table primitive for the Issues
// and Hotspots tabs. The shape of a "finding" differs (Issue vs.
// Hotspot), but the rendering machinery — sortable headers wired to
// the caller's sort state, click-to-expand rows with a caller-rendered
// panel, the Sift-token styling — is identical. Pulling it out keeps
// the per-feature tables (IssuesTable, HotspotsTable) thin: each
// owns only its column definitions, its row-key accessor, and its
// expand-panel renderer.

import type { ColumnDef, SortingState } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import clsx from 'clsx';
import { useMemo, useState } from 'react';

import {
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRoot,
  TableRow,
  type SortDirection,
} from './Table';
import type { SortDirective } from '../../stores/filtersStore';

const directionToHeader = (id: string, state: SortingState): SortDirection => {
  const entry = state.find((s) => s.id === id);
  if (!entry) return null;
  return entry.desc ? 'desc' : 'asc';
};

export interface FindingsTableProps<T> {
  items: readonly T[];
  columns: ColumnDef<T>[];
  /** Stable identity for a row — used as the React key and as the expand state key. */
  getRowKey: (item: T) => string;
  /** Render the panel below the row when expanded. Returning null disables the expand affordance for that row. */
  renderExpandPanel: (item: T) => React.ReactNode;
  /** Current sort state — typically `filtersStore.sort`. */
  sort: readonly SortDirective[];
  onSortChange: (next: readonly SortDirective[]) => void;
}

export function FindingsTable<T>({
  items,
  columns,
  getRowKey,
  renderExpandPanel,
  sort,
  onSortChange,
}: Readonly<FindingsTableProps<T>>): React.JSX.Element {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Map the caller's sort directives → TanStack SortingState and back.
  // The two shapes mirror each other so the conversion is a pair of
  // light maps.
  const sorting: SortingState = useMemo(
    () => sort.map((s) => ({ id: s.column, desc: s.direction === 'desc' })),
    [sort],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns non-memoizable functions by design; downstream consumers re-read each render.
  const table = useReactTable<T>({
    data: items as T[],
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      onSortChange(
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
        {table.getRowModel().rows.map((row) => {
          const item = row.original;
          const rowKey = getRowKey(item);
          const isExpanded = expandedKey === rowKey;
          const panel = renderExpandPanel(item);
          return (
            <TableRow
              key={row.id}
              data-row="true"
              tabIndex={0}
              expanded={isExpanded}
              expandedContent={panel}
              expandedColSpan={columns.length}
              className={clsx(
                'group',
                panel !== null && 'cursor-pointer',
                'focus-visible:bg-bg-surface-hover focus-visible:outline-none',
              )}
              onClick={
                panel === null
                  ? undefined
                  : () => {
                      setExpandedKey(isExpanded ? null : rowKey);
                    }
              }
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </TableRoot>
  );
}
