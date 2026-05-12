// SPDX-License-Identifier: MIT

// IssuesPagination — Prev / Next page navigation + page size selector
// for the Issues table per SPEC §7.1 and the Phase 8 resolved decision
// (PR #27): default page size 100; options 50 / 100 / 200 / 500;
// persists via prefsStore.defaultPageSize.
//
// The selector writes both `filtersStore.pageSize` (the live, in-tab
// value) and `prefsStore.defaultPageSize` (the next-session default).

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '../../components/primitives/Button';
import { Select, SelectItem } from '../../components/primitives/Select';
import { useFiltersStore, usePrefsStore } from '../../app/stores';

const PAGE_SIZES = [50, 100, 200, 500] as const;

export interface IssuesPaginationProps {
  /** Upstream total from the issues query. */
  total: number;
}

export function IssuesPagination({ total }: Readonly<IssuesPaginationProps>): React.JSX.Element {
  const page = useFiltersStore((s) => s.page);
  const pageSize = useFiltersStore((s) => s.pageSize);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setPage = useFiltersStore.getState().setPage;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setPageSize = useFiltersStore.getState().setPageSize;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setDefaultPageSize = usePrefsStore.getState().setDefaultPageSize;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasMultiplePages = totalPages > 1;

  return (
    <div className="flex items-center justify-between gap-3 text-xs text-text-secondary">
      {hasMultiplePages ? (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              setPage(page - 1);
            }}
          >
            <ChevronLeft className="h-3 w-3" aria-hidden="true" />
            Previous
          </Button>
          <span className="tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => {
              setPage(page + 1);
            }}
          >
            Next
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        Page size
        <Select
          aria-label="Page size"
          value={String(pageSize)}
          onValueChange={(v) => {
            setPageSize(Number(v));
            setDefaultPageSize(Number(v));
          }}
        >
          {PAGE_SIZES.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}
            </SelectItem>
          ))}
        </Select>
      </div>
    </div>
  );
}
