// SPDX-License-Identifier: MIT

// Domain types for the SonarCloud Web API V1, per ARCHITECTURE.md §3.
//
// Branded primitives below prevent cross-assignment of identifier types
// across the codebase: a function expecting a `ProjectKey` cannot accept an
// `IssueKey` even though both are strings at runtime.

// === Branded primitive types ===

/** A SonarCloud project key, e.g. `"acme_widget-service"`. */
export type ProjectKey = string & { readonly __brand: 'ProjectKey' };

/** A SonarCloud issue key, e.g. `"AYx8K1pQ-2zR4Mv"`. */
export type IssueKey = string & { readonly __brand: 'IssueKey' };

/** A SonarCloud rule key, e.g. `"typescript:S6571"`. */
export type RuleKey = string & { readonly __brand: 'RuleKey' };

/** A SonarCloud organization key, e.g. `"acme"`. */
export type OrgKey = string & { readonly __brand: 'OrgKey' };

// === Domain enum unions ===

/** Issue severity levels per SonarCloud V1. */
export type Severity = 'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';

/** Issue type per SonarCloud V1. */
export type IssueType = 'BUG' | 'VULNERABILITY' | 'CODE_SMELL';

/** Issue lifecycle states per SonarCloud V1. */
export type Status = 'OPEN' | 'CONFIRMED' | 'REOPENED' | 'RESOLVED' | 'CLOSED';

/** Issue resolution; `null` means unresolved. */
export type Resolution = 'FALSE-POSITIVE' | 'WONTFIX' | 'FIXED' | 'REMOVED' | null;

/** Quality-gate status used on projects, branches, and individual conditions. */
export type QualityGateStatus = 'OK' | 'WARN' | 'ERROR' | 'NONE';

// === Domain interfaces ===

/** A character-range citation inside a source file. */
export interface TextRange {
  startLine: number;
  endLine: number;
  startOffset: number;
  endOffset: number;
}

export interface Organization {
  key: OrgKey;
  name: string;
  description?: string;
  /**
   * Documented values are `'FREE'` and `'PAID'`, but the API has historically
   * returned additional internal values; the type is the wider `string` so a
   * fresh response can't fail validation in production while we update the
   * spec. Feature code that branches on this should match the documented
   * values explicitly and have a fallback for the unknown case.
   */
  subscription?: string;
  alm?: { key: string; url: string; personal: boolean };
  actions?: { admin: boolean; delete: boolean; provision: boolean };
  avatar?: string;
}

export interface Project {
  key: ProjectKey;
  name: string;
  organization: OrgKey;
  qualifier: 'TRK';
  visibility: 'public' | 'private';
  lastAnalysisDate?: string;
  qualityGate?: QualityGateStatus;
}

export interface Branch {
  name: string;
  isMain: boolean;
  type: 'LONG' | 'SHORT' | 'PULL_REQUEST' | 'BRANCH';
  status?: { qualityGateStatus: QualityGateStatus };
  analysisDate?: string;
}

export interface Issue {
  key: IssueKey;
  rule: RuleKey;
  severity: Severity;
  type: IssueType;
  status: Status;
  resolution: Resolution;
  /** Component key in `projectKey:path/to/file` form, per V1 convention. */
  component: string;
  project: ProjectKey;
  line?: number;
  hash?: string;
  textRange?: TextRange;
  flows: {
    locations: { component?: string | null; textRange?: TextRange; msg?: string | null }[];
  }[];
  message: string;
  effort?: string;
  debt?: string;
  author?: string;
  tags: string[];
  creationDate: string;
  updateDate: string;
  closeDate?: string;
  assignee?: string;
  comments?: { key: string; htmlText: string; createdAt: string }[];
}

export interface Hotspot {
  key: string;
  component: string;
  project: ProjectKey;
  securityCategory: string;
  vulnerabilityProbability: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'TO_REVIEW' | 'ACKNOWLEDGED' | 'REVIEWED';
  resolution?: 'FIXED' | 'SAFE';
  line?: number;
  message: string;
  creationDate: string;
  updateDate: string;
  ruleKey: RuleKey;
}

export interface QualityGate {
  projectStatus: {
    status: QualityGateStatus;
    conditions: {
      status: 'OK' | 'WARN' | 'ERROR';
      metricKey: string;
      comparator: 'GT' | 'LT' | 'EQ' | 'NE';
      errorThreshold: string;
      actualValue: string;
    }[];
  };
}

export interface Measure {
  metric: string;
  value?: string;
  bestValue?: boolean;
  period?: { index: number; value: string };
}

// === Filter types ===

export interface IssueFilters {
  componentKeys?: ProjectKey[];
  branch?: string;
  severities?: Severity[];
  types?: IssueType[];
  statuses?: Status[];
  resolutions?: Resolution[];
  tags?: string[];
  rules?: RuleKey[];
  assignees?: string[];
  filePathPrefix?: string;
  createdAfter?: string;
  createdBefore?: string;
  hasComments?: boolean;
  inNewCodePeriod?: boolean;
}

export interface HotspotFilters {
  projectKey: ProjectKey;
  branch?: string;
  status?: 'TO_REVIEW' | 'ACKNOWLEDGED' | 'REVIEWED';
  resolution?: 'FIXED' | 'SAFE';
  inNewCodePeriod?: boolean;
}

/** Pagination options accepted by every paginated SonarCloud V1 endpoint. */
export interface PageOpts {
  /** 1-indexed page number. */
  p?: number;
  /** Page size; SonarCloud V1 caps this at 500 for most endpoints. */
  ps?: number;
}

// === Result and Page ===

/**
 * One paginated slice of a list endpoint.
 *
 * `total` reflects the upstream-reported total, which for `/issues/search`
 * may exceed the 10,000 hard cap. Over-cap detection lives in the API client
 * (per ADR-007) and surfaces a separate `Result.kind === 'over_cap'` variant.
 */
export interface Page<T> {
  items: T[];
  pageIndex: number;
  pageSize: number;
  total: number;
}

/** One value bucket in a SonarCloud issues/search facet. */
export interface IssueFacetValue {
  val: string;
  count: number;
}

/** A single facet dimension (e.g. severities, types, statuses) with counts. */
export interface IssueFacet {
  property: string;
  values: IssueFacetValue[];
}

/** Page<Issue> augmented with server-side facet counts from issues/search. */
export interface IssuesPage extends Page<Issue> {
  facets: IssueFacet[];
}

/**
 * Discriminated union returned by every public `SonarClient` method. Per
 * ARCHITECTURE.md §5 ("Errors as values, not exceptions"), the client never
 * throws — every failure mode becomes a typed variant the UI can pattern-
 * match on.
 *
 * Variants:
 *   - `ok`             : successful response, value is the parsed payload.
 *   - `unauthorized`   : 401 from upstream — token bad / expired.
 *   - `forbidden`      : 403 — token lacks permission for this resource.
 *   - `not_found`      : 404 — resource does not exist.
 *   - `rate_limited`   : 429 — surface upstream Retry-After if provided.
 *   - `server_error`   : 5xx — preserve upstream status for diagnostics.
 *   - `network_error`  : fetch threw / DNS / proxy unreachable.
 *   - `parse_error`    : 2xx but the body did not match the expected schema —
 *                        indicates a Sift bug or an undocumented SonarCloud
 *                        API change. See the Sift issue tracker.
 *   - `over_cap`       : `/issues/search`-only — `paging.total` exceeds the
 *                        10,000 ceiling; UI must narrow the filter set.
 *                        See ADR-007.
 */
export type Result<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'unauthorized' }
  | { kind: 'forbidden'; message: string }
  | { kind: 'not_found' }
  | { kind: 'rate_limited'; retryAfterSeconds?: number }
  | { kind: 'server_error'; status: number }
  | { kind: 'network_error'; message: string }
  | { kind: 'parse_error'; hint?: string }
  | { kind: 'over_cap'; total: number };
