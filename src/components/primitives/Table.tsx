// SPDX-License-Identifier: MIT

// Table primitives per SPEC §16.5. Headless layout — TanStack Table
// drives composition in Phase 8. These primitives just supply the
// Sift-token styling: dense rows, sortable header cells, hover state,
// and an optional expanded-row slot below a regular row.

import clsx from 'clsx';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import type { HTMLAttributes, TableHTMLAttributes, ThHTMLAttributes } from 'react';
import { forwardRef } from 'react';

export const TableRoot = forwardRef<HTMLTableElement, TableHTMLAttributes<HTMLTableElement>>(
  function TableRoot({ className, ...rest }, ref) {
    return (
      <table
        ref={ref}
        className={clsx('w-full border-collapse text-xs text-text-primary', className)}
        {...rest}
      />
    );
  },
);

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableHeader({ className, ...rest }, ref) {
  return (
    <thead
      ref={ref}
      className={clsx('border-b border-border-subtle bg-bg-surface text-text-secondary', className)}
      {...rest}
    />
  );
});

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableBody({ className, ...rest }, ref) {
  return <tbody ref={ref} className={className} {...rest} />;
});

export type SortDirection = 'asc' | 'desc' | null;

export interface TableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortDirection?: SortDirection;
  // Widen to accept handlers that take a synthetic / native event
  // (e.g. TanStack Table's `getToggleSortingHandler`). The Table
  // primitive itself never invokes with an argument.
  onSort?: (event?: unknown) => void;
}

const headerCellBase = 'h-8 px-2 text-left font-medium uppercase tracking-wide';

export const TableHeaderCell = forwardRef<HTMLTableCellElement, TableHeaderCellProps>(
  function TableHeaderCell({ sortDirection, onSort, className, children, ...rest }, ref) {
    const ariaSort: 'ascending' | 'descending' | 'none' = (() => {
      if (sortDirection === 'asc') return 'ascending';
      if (sortDirection === 'desc') return 'descending';
      return 'none';
    })();
    if (onSort === undefined) {
      return (
        <th
          ref={ref}
          aria-sort={sortDirection !== undefined && sortDirection !== null ? ariaSort : undefined}
          className={clsx(headerCellBase, className)}
          {...rest}
        >
          {children}
        </th>
      );
    }
    return (
      <th ref={ref} aria-sort={ariaSort} className={clsx(headerCellBase, className)} {...rest}>
        <button
          type="button"
          onClick={onSort}
          className={
            'inline-flex items-center gap-1 text-text-secondary hover:text-text-primary ' +
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
            'focus-visible:outline-accent'
          }
        >
          {children}
          {sortDirection === 'asc' ? (
            <ChevronUp className="h-3 w-3" aria-hidden="true" />
          ) : sortDirection === 'desc' ? (
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ChevronsUpDown
              className="h-3 w-3 opacity-50 group-hover:opacity-100"
              aria-hidden="true"
            />
          )}
        </button>
      </th>
    );
  },
);

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Render an expanded panel below this row when truthy. */
  expanded?: boolean;
  /** Element rendered inside the expanded row. */
  expandedContent?: React.ReactNode;
  /** Number of columns the expanded row should span. */
  expandedColSpan?: number;
}

const rowClasses =
  'border-b border-border-subtle hover:bg-bg-surface-hover ' +
  'data-[state=expanded]:bg-bg-surface-hover';

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(
  { expanded, expandedContent, expandedColSpan, className, children, ...rest },
  ref,
) {
  if (!expanded) {
    return (
      <tr ref={ref} className={clsx(rowClasses, className)} {...rest}>
        {children}
      </tr>
    );
  }
  return (
    <>
      <tr ref={ref} data-state="expanded" className={clsx(rowClasses, className)} {...rest}>
        {children}
      </tr>
      <tr className="border-b border-border-subtle bg-bg-surface">
        <td colSpan={expandedColSpan} className="px-3 py-3 text-xs text-text-secondary">
          {expandedContent}
        </td>
      </tr>
    </>
  );
});

export const TableCell = forwardRef<HTMLTableCellElement, HTMLAttributes<HTMLTableCellElement>>(
  function TableCell({ className, ...rest }, ref) {
    return <td ref={ref} className={clsx('px-2 py-1.5 align-middle', className)} {...rest} />;
  },
);
