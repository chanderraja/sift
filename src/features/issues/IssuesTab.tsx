// SPDX-License-Identifier: MIT

// IssuesTab — the Issues tab content per SPEC §7.1. Two-column layout:
// collapsible filter sidebar on the left, results table area on the
// right. The components inside (`IssuesFilterSidebar`, `IssuesTable`,
// the result-count badge, pagination, expand drawer, over-cap banner,
// error states) land in subsequent Phase 8 commits. This scaffold owns
// only the grid + the slot identifiers so downstream commits can mount
// into the documented positions.

export function IssuesTab(): React.JSX.Element {
  return (
    <div data-testid="issues-tab" className="grid h-full grid-cols-[280px_1fr] gap-4">
      <aside
        data-testid="issues-filter-sidebar"
        aria-label="Issue filters"
        className="border-r border-border-subtle pr-4"
      />
      <section data-testid="issues-results" className="flex min-w-0 flex-col gap-3" />
    </div>
  );
}
