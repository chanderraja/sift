// SPDX-License-Identifier: MIT

// ResultCountBadge — small "1–100 of 142 issues" indicator that sits
// above the Issues table per SPEC §7.1. Pure presentational; the
// caller derives `page`, `pageSize`, `total`, and `capped` from the
// query result + filtersStore.

const fmt = (n: number): string => n.toLocaleString('en-US');

export interface ResultCountBadgeProps {
  total: number;
  page: number;
  pageSize: number;
  /** True when the upstream total exceeds the 10,000 SonarCloud cap. */
  capped?: boolean;
}

export function ResultCountBadge({
  total,
  page,
  pageSize,
  capped = false,
}: ResultCountBadgeProps): React.JSX.Element {
  if (total === 0) {
    return <div className="text-xs text-text-secondary">0 issues</div>;
  }
  if (total === 1) {
    return <div className="text-xs text-text-secondary">1 issue</div>;
  }
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const totalLabel = capped ? `${fmt(total)}+` : fmt(total);
  return (
    <div className="text-xs text-text-secondary">
      {fmt(start)}–{fmt(end)} of {totalLabel} issues
    </div>
  );
}
