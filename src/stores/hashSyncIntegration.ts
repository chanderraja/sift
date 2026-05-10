// SPDX-License-Identifier: MIT

// Wires `selectionStore` and `filtersStore` to the URL hash so a
// configured view (selected project/branch, active tab, filter set) is
// shareable via URL. The transport layer (`src/lib/hashSync.ts`) only
// knows strings; this module owns the schema mapping between the
// Zustand stores' typed shapes and the flat HashState wire format.
//
// Wire schema (subset of selection + filters; expand as more filters
// gain UI in Phase 8 and beyond):
//
//   org      ← selectionStore.organizationKey
//   project  ← selectionStore.projectKey
//   branch   ← selectionStore.branchName
//   tab      ← filtersStore.tab
//   sev      ← filtersStore.issuesFilters.severities (comma-joined)
//   type     ← filtersStore.issuesFilters.types
//   status   ← filtersStore.issuesFilters.statuses
//   sort     ← filtersStore.sort (e.g. "severity:desc,file:asc")
//   page     ← filtersStore.page (omitted when 1)
//   ps       ← filtersStore.pageSize (omitted when 100, the default)
//   since    ← filtersStore.issuesFilters.createdAfter (ISO YYYY-MM-DD)
//   until    ← filtersStore.issuesFilters.createdBefore (ISO YYYY-MM-DD)
//
// Direction of flow:
//
//   - cold start: read window.location.hash → parse → dispatch into
//     stores (one-shot at startHashSync time).
//   - subsequent: each store change → re-serialize → write back into
//     window.location.hash.
//
// Hash → store flow only fires once at startup; we don't listen for
// hashchange events. If the user pastes a new URL, they reload — the
// initial read picks it up. This keeps the sync loop unidirectional
// after init and removes the round-trip-cycle concern from
// IMPLEMENTATION.md.

import { parse, serialize } from '../lib/hashSync';
import type { IssueType, OrgKey, ProjectKey, Severity, Status } from '../types/sonar';

import type { FiltersStore, SortDirective, Tab } from './filtersStore';
import type { SelectionStore } from './selectionStore';

interface Subscribable<T> {
  getState(): T;
  setState(partial: Partial<T> | ((s: T) => Partial<T>)): void;
  subscribe(listener: (state: T, prev: T) => void): () => void;
}

export interface HashSyncDeps {
  selection: Subscribable<SelectionStore>;
  filters: Subscribable<FiltersStore>;
  /**
   * Window-like target with a mutable `hash` property. In production
   * this is `window.location`; tests pass a small mutable shim.
   */
  location: { hash: string };
}

const SEVERITY_VALUES: readonly Severity[] = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'];
const ISSUE_TYPE_VALUES: readonly IssueType[] = ['BUG', 'VULNERABILITY', 'CODE_SMELL'];
const STATUS_VALUES: readonly Status[] = ['OPEN', 'CONFIRMED', 'REOPENED', 'RESOLVED', 'CLOSED'];
const TAB_VALUES: readonly Tab[] = ['issues', 'hotspots', 'quality-gate'];

const filterEnum = <T extends string>(allowed: readonly T[], raw: string): T[] =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is T => allowed.includes(s as T));

const parseSortDirectives = (raw: string): SortDirective[] => {
  const out: SortDirective[] = [];
  for (const piece of raw.split(',')) {
    const [column, direction] = piece.split(':');
    if (!column || (direction !== 'asc' && direction !== 'desc')) continue;
    out.push({ column, direction });
  }
  return out;
};

const serializeSortDirectives = (sort: readonly SortDirective[]): string =>
  sort.map((s) => `${s.column}:${s.direction}`).join(',');

const buildHashState = (
  selection: SelectionStore,
  filters: FiltersStore,
): Record<string, string> => {
  const out: Record<string, string> = {};
  if (selection.organizationKey !== null) out.org = selection.organizationKey;
  if (selection.projectKey !== null) out.project = selection.projectKey;
  if (selection.branchName !== null) out.branch = selection.branchName;
  if (filters.tab !== 'issues') out.tab = filters.tab;
  const f = filters.issuesFilters;
  if (f.severities && f.severities.length > 0) out.sev = f.severities.join(',');
  if (f.types && f.types.length > 0) out.type = f.types.join(',');
  if (f.statuses && f.statuses.length > 0) out.status = f.statuses.join(',');
  if (f.createdAfter !== undefined) out.since = f.createdAfter;
  if (f.createdBefore !== undefined) out.until = f.createdBefore;
  if (filters.sort.length > 0) out.sort = serializeSortDirectives(filters.sort);
  if (filters.page !== 1) out.page = String(filters.page);
  if (filters.pageSize !== 100) out.ps = String(filters.pageSize);
  return out;
};

const writeHash = (deps: HashSyncDeps): void => {
  const built = buildHashState(deps.selection.getState(), deps.filters.getState());
  const next = serialize(built);
  // Strip any leading '#' before comparing — `location.hash` may or may
  // not include it depending on the host environment.
  const current = deps.location.hash.startsWith('#')
    ? deps.location.hash.slice(1)
    : deps.location.hash;
  if (current === next) return;
  deps.location.hash = next;
};

const applyHashToStores = (deps: HashSyncDeps): void => {
  const state = parse(deps.location.hash);

  // Selection
  if (state.org !== undefined) {
    deps.selection.setState({ organizationKey: state.org as OrgKey });
  }
  if (state.project !== undefined) {
    deps.selection.setState({ projectKey: state.project as ProjectKey });
  }
  if (state.branch !== undefined) {
    deps.selection.setState({ branchName: state.branch });
  }

  // Tab + filters
  if (state.tab !== undefined && TAB_VALUES.includes(state.tab as Tab)) {
    deps.filters.setState({ tab: state.tab as Tab });
  }

  const issuesPatch: Record<string, unknown> = {};
  if (state.sev !== undefined) issuesPatch.severities = filterEnum(SEVERITY_VALUES, state.sev);
  if (state.type !== undefined) issuesPatch.types = filterEnum(ISSUE_TYPE_VALUES, state.type);
  if (state.status !== undefined) {
    issuesPatch.statuses = filterEnum(STATUS_VALUES, state.status);
  }
  if (state.since !== undefined) issuesPatch.createdAfter = state.since;
  if (state.until !== undefined) issuesPatch.createdBefore = state.until;
  if (Object.keys(issuesPatch).length > 0) {
    deps.filters.setState((s) => ({
      issuesFilters: { ...s.issuesFilters, ...issuesPatch },
    }));
  }

  if (state.sort !== undefined) {
    const parsed = parseSortDirectives(state.sort);
    if (parsed.length > 0) deps.filters.setState({ sort: parsed });
  }

  if (state.page !== undefined) {
    const n = Number(state.page);
    if (Number.isFinite(n) && n > 0) deps.filters.setState({ page: n });
  }

  if (state.ps !== undefined) {
    const n = Number(state.ps);
    if (Number.isFinite(n) && n > 0) deps.filters.setState({ pageSize: n });
  }
};

/**
 * Hydrate the stores from the current hash, then subscribe both stores
 * so any subsequent mutation re-writes the hash. Returns a cleanup
 * function that detaches both subscriptions.
 *
 * IMPORTANT: pass a stable listener reference to each store so that the
 * pair of subscriptions doesn't thrash (gotcha called out in
 * IMPLEMENTATION.md Phase 4).
 */
export function startHashSync(deps: HashSyncDeps): () => void {
  applyHashToStores(deps);

  const onAnyStoreChange = (): void => {
    writeHash(deps);
  };

  const unsubSelection = deps.selection.subscribe(onAnyStoreChange);
  const unsubFilters = deps.filters.subscribe(onAnyStoreChange);

  return () => {
    unsubSelection();
    unsubFilters();
  };
}
