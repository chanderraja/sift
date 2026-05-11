// SPDX-License-Identifier: MIT

import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import type { Result } from '../types/sonar';
import { server } from '../../tests/msw';
import { SonarClient } from './SonarClient';

const makeClient = (token = 'squ_test'): SonarClient =>
  new SonarClient({ region: 'eu', getToken: () => token });

// MSW one-off overlay for an error status. Body defaults to empty so
// tests focus on the status→Result mapping, not on shape.
const stubGet = (path: string, init: ResponseInit, body: BodyInit | null = null): void => {
  server.use(http.get(path, () => new HttpResponse(body, init)));
};

// MSW one-off overlay that records the request URL the client built.
// Lets the encoding tests inspect the wire query without each describe
// block redeclaring the same boilerplate.
const captureUrl = (path: string, response: Record<string, unknown>): { read: () => string } => {
  let url = '';
  server.use(
    http.get(path, ({ request }) => {
      url = request.url;
      return HttpResponse.json(response);
    }),
  );
  return { read: () => url };
};

const emptyPage = (key: 'components' | 'issues' | 'hotspots'): Record<string, unknown> => ({
  paging: { pageIndex: 1, pageSize: 50, total: 0 },
  [key]: [],
});

const PATHS = {
  authValidate: '/api/sonar/v1/authentication/validate',
  organizations: '/api/sonar/v1/organizations/search',
  projects: '/api/sonar/v1/projects/search',
  branches: '/api/sonar/v1/project_branches/list',
  issues: '/api/sonar/v1/issues/search',
  hotspots: '/api/sonar/v1/hotspots/search',
  qualityGate: '/api/sonar/v1/qualitygates/project_status',
  measures: '/api/sonar/v1/measures/component',
} as const;

const projectKey = 'acme_widget-service' as never;

// Routing table for the parametric error-mapping tests. Every public
// method goes through the same `get` helper in SonarClient, so the
// status→Result mapping is identical for all of them — drive the table
// once, not seven times.
type MethodCall = (c: SonarClient) => Promise<Result<unknown>>;
const METHODS: readonly (readonly [string, string, MethodCall])[] = [
  ['validateToken', PATHS.authValidate, (c) => c.validateToken()],
  ['listOrganizations', PATHS.organizations, (c) => c.listOrganizations()],
  ['listProjects', PATHS.projects, (c) => c.listProjects('acme')],
  ['listBranches', PATHS.branches, (c) => c.listBranches(projectKey)],
  ['searchIssues', PATHS.issues, (c) => c.searchIssues({})],
  ['searchHotspots', PATHS.hotspots, (c) => c.searchHotspots({ projectKey })],
  ['getQualityGate', PATHS.qualityGate, (c) => c.getQualityGate(projectKey, 'master')],
  ['getMeasures', PATHS.measures, (c) => c.getMeasures(projectKey, 'master', ['ncloc'])],
];

describe.each(METHODS)('SonarClient.%s — shared status/network mapping', (_name, path, call) => {
  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [429, 'rate_limited'],
    [500, 'server_error'],
  ] as const)('maps %d → %s', async (status, expectedKind) => {
    stubGet(path, { status });
    const result = await call(makeClient());
    expect(result.kind).toBe(expectedKind);
  });

  it('returns network_error when fetch throws', async () => {
    server.use(http.get(path, () => HttpResponse.error()));
    const result = await call(makeClient());
    expect(result.kind).toBe('network_error');
  });
});

// === Per-method specifics ===

describe('SonarClient.validateToken', () => {
  const PATH = PATHS.authValidate;

  it('returns ok true when SonarCloud reports valid', async () => {
    server.use(http.get(PATH, () => HttpResponse.json({ valid: true })));
    const result = await makeClient().validateToken();
    expect(result).toEqual({ kind: 'ok', value: true });
  });

  it('returns ok false when SonarCloud reports invalid (revoked token)', async () => {
    server.use(http.get(PATH, () => HttpResponse.json({ valid: false })));
    const result = await makeClient().validateToken();
    expect(result).toEqual({ kind: 'ok', value: false });
  });

  it('returns server_error when the response body is malformed', async () => {
    server.use(http.get(PATH, () => HttpResponse.json({ something: 'else' })));
    const result = await makeClient().validateToken();
    expect(result.kind).toBe('server_error');
  });
});

describe('SonarClient.listOrganizations', () => {
  const PATH = PATHS.organizations;

  it('returns ok with the parsed organizations on 200', async () => {
    const result = await makeClient().listOrganizations();
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.key).toBe('acme');
      expect(result.value[0]?.name).toBe('acme');
    }
  });

  it('sends Authorization: Basic base64(token:) — ADR-010', async () => {
    let received: string | null = null;
    server.use(
      http.get(PATH, ({ request }) => {
        received = request.headers.get('Authorization');
        return HttpResponse.json({
          paging: { pageIndex: 1, pageSize: 10, total: 0 },
          organizations: [],
        });
      }),
    );
    await makeClient('squ_token_xyz').listOrganizations();
    expect(received).toBe(`Basic ${btoa('squ_token_xyz:')}`);
  });

  it('extracts the upstream message on 403', async () => {
    server.use(
      http.get(PATH, () =>
        HttpResponse.json({ errors: [{ msg: 'Insufficient privileges' }] }, { status: 403 }),
      ),
    );
    const result = await makeClient().listOrganizations();
    if (result.kind === 'forbidden') {
      expect(result.message).toBe('Insufficient privileges');
    } else {
      expect.fail(`expected forbidden, got ${result.kind}`);
    }
  });

  it('exposes Retry-After seconds on 429', async () => {
    server.use(
      http.get(
        PATH,
        () => new HttpResponse(null, { status: 429, headers: { 'Retry-After': '17' } }),
      ),
    );
    const result = await makeClient().listOrganizations();
    if (result.kind === 'rate_limited') {
      expect(result.retryAfterSeconds).toBe(17);
    } else {
      expect.fail(`expected rate_limited, got ${result.kind}`);
    }
  });

  it('preserves the upstream status on server_error', async () => {
    stubGet(PATH, { status: 503 });
    const result = await makeClient().listOrganizations();
    if (result.kind === 'server_error') {
      expect(result.status).toBe(503);
    } else {
      expect.fail(`expected server_error, got ${result.kind}`);
    }
  });

  it('returns server_error when the response body is malformed', async () => {
    server.use(http.get(PATH, () => HttpResponse.json({ paging: 'not-an-object' })));
    const result = await makeClient().listOrganizations();
    expect(result.kind).toBe('server_error');
  });
});

describe('SonarClient.listProjects', () => {
  const PATH = PATHS.projects;

  it('returns ok with the parsed projects on 200', async () => {
    const result = await makeClient().listProjects('acme');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.value.items).toHaveLength(2);
      expect(result.value.items[0]?.key).toBe('acme_widget-service');
      expect(result.value.pageIndex).toBe(1);
      expect(result.value.total).toBe(2);
    }
  });

  it('encodes the organization key as a query param', async () => {
    const cap = captureUrl(PATH, emptyPage('components'));
    await makeClient().listProjects('acme');
    expect(new URL(cap.read()).searchParams.get('organization')).toBe('acme');
  });

  it('encodes pagination opts (p, ps) when provided', async () => {
    const cap = captureUrl(PATH, emptyPage('components'));
    await makeClient().listProjects('acme', { p: 2, ps: 100 });
    const params = new URL(cap.read()).searchParams;
    expect(params.get('p')).toBe('2');
    expect(params.get('ps')).toBe('100');
  });

  it('omits p and ps when opts is undefined', async () => {
    const cap = captureUrl(PATH, emptyPage('components'));
    await makeClient().listProjects('acme');
    const params = new URL(cap.read()).searchParams;
    expect(params.get('p')).toBeNull();
    expect(params.get('ps')).toBeNull();
  });
});

describe('SonarClient.listBranches', () => {
  const PATH = PATHS.branches;

  it('returns ok with the parsed branches on 200', async () => {
    const result = await makeClient().listBranches(projectKey);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.name).toBe('master');
      expect(result.value[0]?.isMain).toBe(true);
    }
  });

  it('encodes the project key as a query param', async () => {
    const cap = captureUrl(PATH, { branches: [] });
    await makeClient().listBranches(projectKey);
    expect(new URL(cap.read()).searchParams.get('project')).toBe(projectKey);
  });
});

describe('SonarClient.searchIssues', () => {
  const PATH = PATHS.issues;

  it('returns ok with the parsed issues on 200', async () => {
    const result = await makeClient().searchIssues({});
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.value.items.length).toBeGreaterThan(0);
      expect(result.value.total).toBe(115);
    }
  });

  it('encodes severities as a comma-joined query param', async () => {
    const cap = captureUrl(PATH, emptyPage('issues'));
    await makeClient().searchIssues({ severities: ['BLOCKER', 'CRITICAL'] });
    expect(new URL(cap.read()).searchParams.get('severities')).toBe('BLOCKER,CRITICAL');
  });

  it('encodes types as a comma-joined query param', async () => {
    const cap = captureUrl(PATH, emptyPage('issues'));
    await makeClient().searchIssues({ types: ['BUG', 'VULNERABILITY'] });
    expect(new URL(cap.read()).searchParams.get('types')).toBe('BUG,VULNERABILITY');
  });

  it('encodes statuses as a comma-joined query param', async () => {
    const cap = captureUrl(PATH, emptyPage('issues'));
    await makeClient().searchIssues({ statuses: ['OPEN', 'CONFIRMED'] });
    expect(new URL(cap.read()).searchParams.get('statuses')).toBe('OPEN,CONFIRMED');
  });

  it('encodes componentKeys, branch, tags, rules, assignees', async () => {
    const cap = captureUrl(PATH, emptyPage('issues'));
    await makeClient().searchIssues({
      componentKeys: ['acme_a' as never, 'acme_b' as never],
      branch: 'main',
      tags: ['security', 'todo'],
      rules: ['javascript:S123' as never, 'cpp:S456' as never],
      assignees: ['alice', 'bob'],
    });
    const params = new URL(cap.read()).searchParams;
    expect(params.get('componentKeys')).toBe('acme_a,acme_b');
    expect(params.get('branch')).toBe('main');
    expect(params.get('tags')).toBe('security,todo');
    expect(params.get('rules')).toBe('javascript:S123,cpp:S456');
    expect(params.get('assignees')).toBe('alice,bob');
  });

  it('drops null entries from resolutions', async () => {
    const cap = captureUrl(PATH, emptyPage('issues'));
    await makeClient().searchIssues({ resolutions: [null, 'FIXED', 'WONTFIX'] });
    expect(new URL(cap.read()).searchParams.get('resolutions')).toBe('FIXED,WONTFIX');
  });

  it('omits filters that are empty arrays or simply not provided', async () => {
    const cap = captureUrl(PATH, emptyPage('issues'));
    await makeClient().searchIssues({ severities: [] });
    const params = new URL(cap.read()).searchParams;
    expect(params.get('severities')).toBeNull();
    expect(params.get('tags')).toBeNull();
  });

  it('sends BUG,CODE_SMELL,VULNERABILITY by default when no types filter is given', async () => {
    const cap = captureUrl(PATH, emptyPage('issues'));
    await makeClient().searchIssues({});
    expect(new URL(cap.read()).searchParams.get('types')).toBe('BUG,CODE_SMELL,VULNERABILITY');
  });

  it('uses caller types and does not inject defaults when types filter is provided', async () => {
    const cap = captureUrl(PATH, emptyPage('issues'));
    await makeClient().searchIssues({ types: ['BUG'] });
    expect(new URL(cap.read()).searchParams.get('types')).toBe('BUG');
  });

  it('encodes pagination opts (p, ps)', async () => {
    const cap = captureUrl(PATH, emptyPage('issues'));
    await makeClient().searchIssues({}, { p: 2, ps: 100 });
    const params = new URL(cap.read()).searchParams;
    expect(params.get('p')).toBe('2');
    expect(params.get('ps')).toBe('100');
  });

  it('encodes createdAfter/createdBefore and hasComments', async () => {
    const cap = captureUrl(PATH, emptyPage('issues'));
    await makeClient().searchIssues({
      createdAfter: '2026-01-01',
      createdBefore: '2026-12-31',
      hasComments: true,
    });
    const params = new URL(cap.read()).searchParams;
    expect(params.get('createdAfter')).toBe('2026-01-01');
    expect(params.get('createdBefore')).toBe('2026-12-31');
    expect(params.get('hasComments')).toBe('true');
  });

  it('returns over_cap when paging.total > 10000 (ADR-007)', async () => {
    server.use(
      http.get(PATH, () =>
        HttpResponse.json({
          paging: { pageIndex: 1, pageSize: 50, total: 12_345 },
          issues: [],
        }),
      ),
    );
    const result = await makeClient().searchIssues({});
    if (result.kind === 'over_cap') {
      expect(result.total).toBe(12_345);
    } else {
      expect.fail(`expected over_cap, got ${result.kind}`);
    }
  });

  it('returns ok at the boundary (paging.total == 10000)', async () => {
    server.use(
      http.get(PATH, () =>
        HttpResponse.json({
          paging: { pageIndex: 1, pageSize: 50, total: 10_000 },
          issues: [],
        }),
      ),
    );
    const result = await makeClient().searchIssues({});
    expect(result.kind).toBe('ok');
  });
});

describe('SonarClient.searchHotspots', () => {
  const PATH = PATHS.hotspots;

  it('returns ok with the parsed hotspots on 200', async () => {
    const result = await makeClient().searchHotspots({ projectKey });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.value.items).toEqual([]);
      expect(result.value.total).toBe(0);
    }
  });

  it('encodes projectKey, branch, status, resolution', async () => {
    const cap = captureUrl(PATH, emptyPage('hotspots'));
    await makeClient().searchHotspots({
      projectKey,
      branch: 'main',
      status: 'TO_REVIEW',
      resolution: 'SAFE',
    });
    const params = new URL(cap.read()).searchParams;
    expect(params.get('projectKey')).toBe(projectKey);
    expect(params.get('branch')).toBe('main');
    expect(params.get('status')).toBe('TO_REVIEW');
    expect(params.get('resolution')).toBe('SAFE');
  });

  it('encodes pagination opts', async () => {
    const cap = captureUrl(PATH, emptyPage('hotspots'));
    await makeClient().searchHotspots({ projectKey }, { p: 3, ps: 200 });
    const params = new URL(cap.read()).searchParams;
    expect(params.get('p')).toBe('3');
    expect(params.get('ps')).toBe('200');
  });
});

describe('SonarClient.getQualityGate', () => {
  const PATH = PATHS.qualityGate;

  it('returns ok with the parsed quality gate on 200', async () => {
    const result = await makeClient().getQualityGate(projectKey, 'master');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.value.projectStatus.status).toBe('OK');
      expect(result.value.projectStatus.conditions.length).toBeGreaterThan(0);
    }
  });

  it('encodes projectKey and branch as query params', async () => {
    const cap = captureUrl(PATH, { projectStatus: { status: 'OK', conditions: [] } });
    await makeClient().getQualityGate(projectKey, 'feature/abc');
    const params = new URL(cap.read()).searchParams;
    expect(params.get('projectKey')).toBe(projectKey);
    expect(params.get('branch')).toBe('feature/abc');
  });
});

describe('SonarClient.getMeasures', () => {
  const PATH = PATHS.measures;

  it('returns ok with the parsed measures on 200', async () => {
    const result = await makeClient().getMeasures(projectKey, 'master', ['complexity']);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.value.length).toBeGreaterThan(0);
      expect(result.value[0]?.metric).toBeDefined();
    }
  });

  it('encodes component, branch, and comma-joined metricKeys', async () => {
    const cap = captureUrl(PATH, { component: { measures: [] } });
    await makeClient().getMeasures(projectKey, 'master', [
      'coverage',
      'duplicated_lines_density',
      'ncloc',
    ]);
    const params = new URL(cap.read()).searchParams;
    expect(params.get('component')).toBe(projectKey);
    expect(params.get('branch')).toBe('master');
    expect(params.get('metricKeys')).toBe('coverage,duplicated_lines_density,ncloc');
  });
});
