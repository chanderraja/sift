// SPDX-License-Identifier: MIT

// SonarClient — typed wrapper over the same-origin Sift proxy at
// `/api/sonar/v1/...`. Per ARCHITECTURE.md §2 (Module 1) and §5
// ("Errors as values, not exceptions"), every public method returns
// `Result<T>`; the client never throws.

import type { ParseResult } from '../lib/validators';
import {
  parseBranchesListResponse,
  parseOrganizationsSearchResponse,
  parseProjectsSearchResponse,
} from '../lib/validators';
import type { Branch, Organization, Page, PageOpts, Project, Result } from '../types/sonar';

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

  // Internal: GET a same-origin proxy URL with Bearer auth and map the
  // response (status + body) into the discriminated `Result<T>`. Every
  // public method funnels through here so error mapping is in one place.
  protected async get<T>(
    path: string,
    parse: (raw: unknown) => ParseResult<T>,
  ): Promise<Result<T>> {
    let resp: Response;
    try {
      resp = await fetch(path, {
        headers: { Authorization: `Bearer ${this.getToken()}` },
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
      // Bytes did not match the schema. Treat as an upstream-shape error
      // rather than a network error so the UI can show "we got something
      // unexpected from SonarCloud" instead of "network failed."
      return { kind: 'server_error', status };
    }
    return { kind: 'ok', value: parsed.value };
  }
}

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
