// SPDX-License-Identifier: MIT

// QG condition → driver query mapping.
//
// | Failing metric                   | Type     | Filters                                               |
// |----------------------------------|----------|-------------------------------------------------------|
// | new_reliability_rating           | issues   | type=BUG, inNewCodePeriod=true, sev≥rating, OPEN      |
// | reliability_rating               | issues   | type=BUG, sev≥rating, OPEN                            |
// | new_security_rating              | issues   | type=VULNERABILITY, inNewCodePeriod=true, sev≥rating   |
// | security_rating                  | issues   | type=VULNERABILITY, sev≥rating, OPEN                  |
// | new_maintainability_rating       | issues   | type=CODE_SMELL, inNewCodePeriod=true, sev≥rating      |
// | maintainability_rating           | issues   | type=CODE_SMELL, sev≥rating, OPEN                     |
// | new_security_hotspots_reviewed   | hotspots | inNewCodePeriod=true, status=TO_REVIEW                |
// | security_hotspots_reviewed       | hotspots | status=TO_REVIEW                                      |
// | new_blocker_violations           | issues   | severity=BLOCKER, inNewCodePeriod=true, OPEN           |
// | new_critical_violations          | issues   | severity=CRITICAL, inNewCodePeriod=true, OPEN          |
// | new_major_violations             | issues   | severity=MAJOR, inNewCodePeriod=true, OPEN             |
// | new_coverage / coverage          | note     | "Requires test coverage improvements…"                |
// | new_duplicated_lines_density     | note     | "Requires deduplication…"                             |
// | (unknown)                        | note     | "No issue-level driver mapping found for this metric."|

import type {
  Hotspot,
  HotspotFilters,
  Issue,
  IssueFilters,
  IssueType,
  ProjectKey,
  QualityGate,
  Severity,
} from '../types/sonar';

export const DRIVER_LIMIT = 25;
export const COMPOSITE_CAP = 200;

export interface IssueDriverSpec {
  readonly type: 'issues';
  readonly filters: IssueFilters;
}

export interface HotspotDriverSpec {
  readonly type: 'hotspots';
  readonly filters: HotspotFilters;
}

export interface NoteDriverSpec {
  readonly type: 'note';
  readonly message: string;
}

export type DriverSpec = IssueDriverSpec | HotspotDriverSpec | NoteDriverSpec;

export type DriverResult =
  | { readonly kind: 'issues'; readonly items: readonly Issue[] }
  | { readonly kind: 'hotspots'; readonly items: readonly Hotspot[] }
  | { readonly kind: 'note'; readonly message: string }
  | { readonly kind: 'error'; readonly message: string };

export interface ConditionDriver {
  readonly condition: QualityGate['projectStatus']['conditions'][number];
  readonly spec: DriverSpec;
}

export interface ConditionWithDrivers {
  readonly condition: QualityGate['projectStatus']['conditions'][number];
  readonly driverResult: DriverResult;
}

// Severity-from-rating scaling per SPEC.md §7.4:
// E (5) → BLOCKER+CRITICAL; D (4) → CRITICAL+ (BLOCKER+CRITICAL);
// C (3) → MAJOR+ (BLOCKER+CRITICAL+MAJOR); B (2) → MINOR+ (all above INFO).
function severitiesFromRating(actualValue: string): Severity[] {
  const rating = Math.ceil(Number.parseFloat(actualValue) || 3);
  if (rating >= 4) return ['BLOCKER', 'CRITICAL'];
  if (rating === 3) return ['BLOCKER', 'CRITICAL', 'MAJOR'];
  return ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR'];
}

function issueSpec(
  projectKey: string,
  branch: string,
  types: IssueType[],
  severities: Severity[],
  inNewCodePeriod?: true,
): IssueDriverSpec {
  const filters: IssueFilters = {
    componentKeys: [projectKey as ProjectKey],
    branch,
    types,
    severities,
    statuses: ['OPEN'],
  };
  if (inNewCodePeriod === true) {
    return { type: 'issues', filters: { ...filters, inNewCodePeriod: true } };
  }
  return { type: 'issues', filters };
}

function hotspotSpec(
  projectKey: string,
  branch: string,
  inNewCodePeriod?: true,
): HotspotDriverSpec {
  const filters: HotspotFilters = {
    projectKey: projectKey as ProjectKey,
    branch,
    status: 'TO_REVIEW',
  };
  if (inNewCodePeriod === true) {
    return { type: 'hotspots', filters: { ...filters, inNewCodePeriod: true } };
  }
  return { type: 'hotspots', filters };
}

function specForCondition(
  metricKey: string,
  actualValue: string,
  projectKey: string,
  branch: string,
): DriverSpec {
  const isNew = metricKey.startsWith('new_');
  const newFlag: true | undefined = isNew ? true : undefined;

  if (metricKey.endsWith('reliability_rating')) {
    return issueSpec(projectKey, branch, ['BUG'], severitiesFromRating(actualValue), newFlag);
  }
  if (metricKey.endsWith('security_rating')) {
    return issueSpec(
      projectKey,
      branch,
      ['VULNERABILITY'],
      severitiesFromRating(actualValue),
      newFlag,
    );
  }
  if (metricKey.endsWith('maintainability_rating')) {
    return issueSpec(
      projectKey,
      branch,
      ['CODE_SMELL'],
      severitiesFromRating(actualValue),
      newFlag,
    );
  }
  if (
    metricKey === 'security_hotspots_reviewed' ||
    metricKey === 'new_security_hotspots_reviewed'
  ) {
    return hotspotSpec(projectKey, branch, newFlag);
  }
  if (metricKey === 'new_blocker_violations') {
    return issueSpec(projectKey, branch, ['BUG', 'CODE_SMELL', 'VULNERABILITY'], ['BLOCKER'], true);
  }
  if (metricKey === 'new_critical_violations') {
    return issueSpec(
      projectKey,
      branch,
      ['BUG', 'CODE_SMELL', 'VULNERABILITY'],
      ['CRITICAL'],
      true,
    );
  }
  if (metricKey === 'new_major_violations') {
    return issueSpec(projectKey, branch, ['BUG', 'CODE_SMELL', 'VULNERABILITY'], ['MAJOR'], true);
  }
  if (metricKey === 'coverage' || metricKey === 'new_coverage') {
    return {
      type: 'note',
      message: 'Requires test coverage improvements; no specific issues drive this metric.',
    };
  }
  if (metricKey === 'new_duplicated_lines_density' || metricKey === 'duplicated_lines_density') {
    return {
      type: 'note',
      message: 'Requires deduplication; no specific issues drive this metric.',
    };
  }
  return {
    type: 'note',
    message: `No issue-level driver mapping found for metric "${metricKey}".`,
  };
}

export function getConditionDrivers(
  conditions: QualityGate['projectStatus']['conditions'],
  projectKey: string,
  branch: string,
): ConditionDriver[] {
  return conditions
    .filter((c) => c.status !== 'OK')
    .map((c) => ({
      condition: c,
      spec: specForCondition(c.metricKey, c.actualValue, projectKey, branch),
    }));
}
