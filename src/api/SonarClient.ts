// SPDX-License-Identifier: MIT

// SonarClient — typed wrapper over the same-origin Sift proxy at
// `/api/sonar/v1/...`. Per ARCHITECTURE.md §2 (Module 1) and §5
// ("Errors as values, not exceptions"), every public method returns
// `Result<T>`; the client never throws.

import { logger } from '../lib/logger';
import type { ParseResult } from '../lib/validators';
import {
  parseAuthValidateResponse,
  parseBranchesListResponse,
  parseHotspotsSearchResponse,
  parseIssuesSearchResponse,
  parseMeasuresComponentResponse,
  parseOrganizationsSearchResponse,
  parseProjectsSearchResponse,
  parseQualityGate,
} from '../lib/validators';
import type {
  Branch,
  Hotspot,
  HotspotFilters,
  IssueFilters,
  IssuesPage,
  Measure,
  Organization,
  Page,
  PageOpts,
  Project,
  QualityGate,
  Result,
} from '../types/sonar';

// SonarCloud `/api/issues/search` enforces a hard 10,000 ceiling on
// `paging.total`. Per ADR-007, detection is the client's responsibility
// and surfaces a separate `over_cap` Result variant for the UI.
const ISSUES_SEARCH_CAP = 10_000;

export interface SonarClientOptions {
  region: 'eu' | 'us';
  getToken: () => string;
}

const PROXY_BASE = '/api/sonar/v1';

export class SonarClient {
  protected readonly region: 'eu' | 'us';
  protected readonly getToken: () => string;

  constructor(opts: SonarClientOptions) {
    this.region = opts.region;
    this.getToken = opts.getToken;
  }

  async validateToken(): Promise<Result<boolean>> {
    return this.get(`${PROXY_BASE}/authentication/validate`, parseAuthValidateResponse);
  }

  async listOrganizations(): Promise<Result<Organization[]>> {
    const result = await this.get(
      `${PROXY_BASE}/organizations/search?member=true&ps=500`,
      parseOrganizationsSearchResponse,
    );
    if (result.kind !== 'ok') return result;
    return { kind: 'ok', value: result.value.items };
  }

  async listProjects(orgKey: string, opts?: PageOpts): Promise<Result<Page<Project>>> {
    const params = new URLSearchParams({ organization: orgKey });
    if (opts?.p !== undefined) params.set('p', String(opts.p));
    if (opts?.ps !== undefined) params.set('ps', String(opts.ps));
    return this.get(
      `${PROXY_BASE}/projects/search?${params.toString()}`,
      parseProjectsSearchResponse,
    );
  }

  async listBranches(projectKey: string): Promise<Result<Branch[]>> {
    const params = new URLSearchParams({ project: projectKey });
    return this.get(
      `${PROXY_BASE}/project_branches/list?${params.toString()}`,
      parseBranchesListResponse,
    );
  }

  async searchIssues(filters: IssueFilters, opts?: PageOpts): Promise<Result<IssuesPage>> {
    const params = encodeIssueFilters(filters);
    if (opts?.p !== undefined) params.set('p', String(opts.p));
    if (opts?.ps !== undefined) params.set('ps', String(opts.ps));
    params.set('facets', 'severities,types,statuses');
    const result = await this.get(
      `${PROXY_BASE}/issues/search?${params.toString()}`,
      parseIssuesSearchResponse,
    );
    if (result.kind !== 'ok') return result;
    if (result.value.total > ISSUES_SEARCH_CAP) {
      return { kind: 'over_cap', total: result.value.total };
    }
    return result;
  }

  async searchHotspots(filters: HotspotFilters, opts?: PageOpts): Promise<Result<Page<Hotspot>>> {
    const params = new URLSearchParams({ projectKey: filters.projectKey });
    if (filters.branch !== undefined) params.set('branch', filters.branch);
    if (filters.status !== undefined) params.set('status', filters.status);
    if (filters.resolution !== undefined) params.set('resolution', filters.resolution);
    if (opts?.p !== undefined) params.set('p', String(opts.p));
    if (opts?.ps !== undefined) params.set('ps', String(opts.ps));
    return this.get(
      `${PROXY_BASE}/hotspots/search?${params.toString()}`,
      parseHotspotsSearchResponse,
    );
  }

  async getQualityGate(projectKey: string, branch: string): Promise<Result<QualityGate>> {
    const params = new URLSearchParams({ projectKey, branch });
    return this.get(
      `${PROXY_BASE}/qualitygates/project_status?${params.toString()}`,
      parseQualityGate,
    );
  }

  async getMeasures(
    projectKey: string,
    branch: string,
    metricKeys: string[],
  ): Promise<Result<Measure[]>> {
    const params = new URLSearchParams({
      component: projectKey,
      branch,
      metricKeys: metricKeys.join(','),
    });
    return this.get(
      `${PROXY_BASE}/measures/component?${params.toString()}`,
      parseMeasuresComponentResponse,
    );
  }

  // Internal: GET a same-origin proxy URL with Basic auth (ADR-010) and map the
  // response (status + body) into the discriminated `Result<T>`. Every
  // public method funnels through here so error mapping is in one place.
  protected async get<T>(
    path: string,
    parse: (raw: unknown) => ParseResult<T>,
  ): Promise<Result<T>> {
    let resp: Response;
    try {
      resp = await fetch(path, {
        headers: { Authorization: `Basic ${btoa(`${this.getToken()}:`)}` },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown network error';
      return { kind: 'network_error', message };
    }

    const status = resp.status;
    if (status === 401) return { kind: 'unauthorized' };
    if (status === 403) {
      const message = await readForbiddenMessage(resp);
      return { kind: 'forbidden', message };
    }
    if (status === 404) return { kind: 'not_found' };
    if (status === 429) {
      const retry = parseRetryAfter(resp.headers.get('Retry-After'));
      return retry !== null
        ? { kind: 'rate_limited', retryAfterSeconds: retry }
        : { kind: 'rate_limited' };
    }
    if (status >= 500) return { kind: 'server_error', status };
    if (status < 200 || status >= 300) return { kind: 'server_error', status };

    let raw: unknown;
    try {
      raw = await resp.json();
    } catch {
      return { kind: 'server_error', status };
    }

    const parsed = parse(raw);
    if (!parsed.ok) {
      // 2xx but the body did not satisfy the Zod schema — this is a Sift
      // bug or an undocumented SonarCloud shape change, not a server error.
      // Surface as parse_error so the UI can direct users to file an issue
      // rather than blaming SonarCloud's status page.
      const first = parsed.error.issues[0];
      const hint = first ? `${first.path.join('.')} — ${first.message}` : 'unknown field';
      logger.warn('[SonarClient] schema validation failed', {
        path,
        status,
        hint,
        issues: parsed.error.issues,
      });
      return { kind: 'parse_error', hint };
    }
    return { kind: 'ok', value: parsed.value };
  }
}

// Translate IssueFilters → a SonarCloud V1 query string. Empty arrays /
// undefined fields are dropped so the resulting URL stays clean. Most
// filters are comma-joined per V1 convention; `resolutions` filters out
// the `null` entry (which represents "unresolved" in the type but has no
// V1 query-param representation).
//
// `filePathPrefix` has no direct V1 server param and is reserved for
// client-side post-filtering of results — encoded into nothing here.
const encodeIssueFilters = (filters: IssueFilters): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.componentKeys && filters.componentKeys.length > 0) {
    params.set('componentKeys', filters.componentKeys.join(','));
  }
  if (filters.branch !== undefined) params.set('branch', filters.branch);
  if (filters.severities && filters.severities.length > 0) {
    params.set('severities', filters.severities.join(','));
  }
  // Default to standard issue types when the caller hasn't specified any.
  // SonarCloud's /api/issues/search returns SECURITY_HOTSPOT entries when
  // `types` is omitted, but those belong to the Hotspots tab and their
  // shape (status: TO_REVIEW, etc.) differs from the IssueSchema.
  const typesToSend =
    filters.types && filters.types.length > 0
      ? filters.types
      : (['BUG', 'CODE_SMELL', 'VULNERABILITY'] as const);
  params.set('types', typesToSend.join(','));
  if (filters.statuses && filters.statuses.length > 0) {
    params.set('statuses', filters.statuses.join(','));
  }
  if (filters.resolutions && filters.resolutions.length > 0) {
    const nonNull = filters.resolutions.filter((r): r is Exclude<typeof r, null> => r !== null);
    if (nonNull.length > 0) params.set('resolutions', nonNull.join(','));
  }
  if (filters.tags && filters.tags.length > 0) params.set('tags', filters.tags.join(','));
  if (filters.rules && filters.rules.length > 0) params.set('rules', filters.rules.join(','));
  if (filters.assignees && filters.assignees.length > 0) {
    params.set('assignees', filters.assignees.join(','));
  }
  if (filters.createdAfter !== undefined) params.set('createdAfter', filters.createdAfter);
  if (filters.createdBefore !== undefined) params.set('createdBefore', filters.createdBefore);
  if (filters.hasComments !== undefined) params.set('hasComments', String(filters.hasComments));
  return params;
};

const parseRetryAfter = (header: string | null): number | null => {
  if (header === null) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds : null;
};

interface ForbiddenBody {
  errors?: { msg?: string }[];
}

const readForbiddenMessage = async (resp: Response): Promise<string> => {
  try {
    const body = (await resp.json()) as ForbiddenBody;
    return body.errors?.[0]?.msg ?? 'Forbidden';
  } catch {
    return 'Forbidden';
  }
};
