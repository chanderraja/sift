// SPDX-License-Identifier: MIT

// IssuesFilterSidebar — severity / type / status filter groups for the
// Issues tab per SPEC §7.1. Each checkbox toggle reads from and writes
// to filtersStore.issuesFilters; patchIssues resets `page` to 1 so the
// user never lands on an empty page-N of a freshly-narrowed result set.
//
// Additional dimensions (resolutions, tags, rules, assignees, file path
// prefix, date ranges) land in subsequent Phase 8 / Phase 11 commits.

import { Checkbox } from '../../components/primitives/Checkbox';
import { FilterGroup } from '../../components/primitives/FilterGroup';
import { useFiltersStore } from '../../app/stores';
import type { IssueType, Severity, Status } from '../../types/sonar';

const SEVERITIES: readonly Severity[] = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'];
const TYPES: readonly IssueType[] = ['BUG', 'VULNERABILITY', 'CODE_SMELL'];
const STATUSES: readonly Status[] = ['OPEN', 'CONFIRMED', 'REOPENED', 'RESOLVED', 'CLOSED'];

const toggle = <T extends string>(list: readonly T[] | undefined, value: T): T[] => {
  const current = list ?? [];
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
};

// exactOptionalPropertyTypes refuses `count={undefined}` for an optional
// `count?: number`. Build a conditional prop bag instead.
const countProp = (n: number | undefined): { count?: number } =>
  n !== undefined && n > 0 ? { count: n } : {};

export interface IssueCounts {
  severities?: Partial<Record<Severity, number>>;
  types?: Partial<Record<IssueType, number>>;
  statuses?: Partial<Record<Status, number>>;
}

export interface IssuesFilterSidebarProps {
  issueCounts?: IssueCounts;
}

export function IssuesFilterSidebar({
  issueCounts,
}: Readonly<IssuesFilterSidebarProps>): React.JSX.Element {
  const filters = useFiltersStore((s) => s.issuesFilters);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const patchIssues = useFiltersStore.getState().patchIssues;

  return (
    <div className="flex flex-col">
      <FilterGroup title="Severity" {...countProp(filters.severities?.length)}>
        {SEVERITIES.map((level) => {
          const n = issueCounts?.severities?.[level];
          return (
            <Checkbox
              key={level}
              aria-label={level}
              checked={filters.severities?.includes(level) ?? false}
              onCheckedChange={() => {
                patchIssues({ severities: toggle(filters.severities, level) });
              }}
              className="w-full"
            >
              <span>{level}</span>
              {n === undefined ? null : (
                <span className="ml-auto tabular-nums text-text-tertiary">{n}</span>
              )}
            </Checkbox>
          );
        })}
      </FilterGroup>
      <FilterGroup title="Type" {...countProp(filters.types?.length)}>
        {TYPES.map((type) => {
          const n = issueCounts?.types?.[type];
          return (
            <Checkbox
              key={type}
              aria-label={type}
              checked={filters.types?.includes(type) ?? false}
              onCheckedChange={() => {
                patchIssues({ types: toggle(filters.types, type) });
              }}
              className="w-full"
            >
              <span>{type}</span>
              {n === undefined ? null : (
                <span className="ml-auto tabular-nums text-text-tertiary">{n}</span>
              )}
            </Checkbox>
          );
        })}
      </FilterGroup>
      <FilterGroup title="Status" {...countProp(filters.statuses?.length)}>
        {STATUSES.map((status) => {
          const n = issueCounts?.statuses?.[status];
          return (
            <Checkbox
              key={status}
              aria-label={status}
              checked={filters.statuses?.includes(status) ?? false}
              onCheckedChange={() => {
                patchIssues({ statuses: toggle(filters.statuses, status) });
              }}
              className="w-full"
            >
              <span>{status}</span>
              {n === undefined ? null : (
                <span className="ml-auto tabular-nums text-text-tertiary">{n}</span>
              )}
            </Checkbox>
          );
        })}
      </FilterGroup>
    </div>
  );
}
