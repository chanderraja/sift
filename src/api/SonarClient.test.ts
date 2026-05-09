// SPDX-License-Identifier: MIT

import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../../tests/msw';
import { SonarClient } from './SonarClient';

const makeClient = (token = 'squ_test'): SonarClient =>
  new SonarClient({ region: 'eu', getToken: () => token });

// One-off MSW overlay for an error status. Body defaults to empty so the
// tests focus on the status→Result mapping.
const stubGet = (path: string, init: ResponseInit, body: BodyInit | null = null): void => {
  server.use(http.get(path, () => new HttpResponse(body, init)));
};

describe('SonarClient.listOrganizations', () => {
  it('returns ok with the parsed organizations on 200', async () => {
    const result = await makeClient().listOrganizations();
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.key).toBe('acme');
      expect(result.value[0]?.name).toBe('acme');
    }
  });

  it('sends Authorization: Bearer <token>', async () => {
    let received: string | null = null;
    server.use(
      http.get('/api/sonar/v1/organizations/search', ({ request }) => {
        received = request.headers.get('Authorization');
        return HttpResponse.json({
          paging: { pageIndex: 1, pageSize: 10, total: 0 },
          organizations: [],
        });
      }),
    );
    await makeClient('squ_token_xyz').listOrganizations();
    expect(received).toBe('Bearer squ_token_xyz');
  });

  it('returns unauthorized on 401', async () => {
    server.use(
      http.get('/api/sonar/v1/organizations/search', () => new HttpResponse(null, { status: 401 })),
    );
    const result = await makeClient().listOrganizations();
    expect(result.kind).toBe('unauthorized');
  });

  it('returns forbidden with the upstream message on 403', async () => {
    server.use(
      http.get('/api/sonar/v1/organizations/search', () =>
        HttpResponse.json({ errors: [{ msg: 'Insufficient privileges' }] }, { status: 403 }),
      ),
    );
    const result = await makeClient().listOrganizations();
    expect(result.kind).toBe('forbidden');
    if (result.kind === 'forbidden') {
      expect(result.message).toBe('Insufficient privileges');
    }
  });

  it('returns rate_limited (with Retry-After when present) on 429', async () => {
    server.use(
      http.get(
        '/api/sonar/v1/organizations/search',
        () => new HttpResponse(null, { status: 429, headers: { 'Retry-After': '17' } }),
      ),
    );
    const result = await makeClient().listOrganizations();
    expect(result.kind).toBe('rate_limited');
    if (result.kind === 'rate_limited') {
      expect(result.retryAfterSeconds).toBe(17);
    }
  });

  it('returns server_error preserving status on 5xx', async () => {
    server.use(
      http.get('/api/sonar/v1/organizations/search', () => new HttpResponse(null, { status: 503 })),
    );
    const result = await makeClient().listOrganizations();
    expect(result.kind).toBe('server_error');
    if (result.kind === 'server_error') {
      expect(result.status).toBe(503);
    }
  });

  it('returns network_error when fetch throws', async () => {
    server.use(
      http.get('/api/sonar/v1/organizations/search', () => {
        return HttpResponse.error();
      }),
    );
    const result = await makeClient().listOrganizations();
    expect(result.kind).toBe('network_error');
  });

  it('returns server_error when the response body is malformed', async () => {
    server.use(
      http.get('/api/sonar/v1/organizations/search', () =>
        HttpResponse.json({ paging: 'not-an-object' }),
      ),
    );
    const result = await makeClient().listOrganizations();
    expect(result.kind).toBe('server_error');
  });
});

describe('SonarClient.listProjects', () => {
  const PATH = '/api/sonar/v1/projects/search';

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
    let receivedUrl = '';
    server.use(
      http.get(PATH, ({ request }) => {
        receivedUrl = request.url;
        return HttpResponse.json({
          paging: { pageIndex: 1, pageSize: 20, total: 0 },
          components: [],
        });
      }),
    );
    await makeClient().listProjects('acme');
    expect(new URL(receivedUrl).searchParams.get('organization')).toBe('acme');
  });

  it('encodes pagination opts (p, ps) when provided', async () => {
    let receivedUrl = '';
    server.use(
      http.get(PATH, ({ request }) => {
        receivedUrl = request.url;
        return HttpResponse.json({
          paging: { pageIndex: 2, pageSize: 100, total: 215 },
          components: [],
        });
      }),
    );
    await makeClient().listProjects('acme', { p: 2, ps: 100 });
    const params = new URL(receivedUrl).searchParams;
    expect(params.get('p')).toBe('2');
    expect(params.get('ps')).toBe('100');
  });

  it('omits p and ps when opts is undefined', async () => {
    let receivedUrl = '';
    server.use(
      http.get(PATH, ({ request }) => {
        receivedUrl = request.url;
        return HttpResponse.json({
          paging: { pageIndex: 1, pageSize: 100, total: 0 },
          components: [],
        });
      }),
    );
    await makeClient().listProjects('acme');
    const params = new URL(receivedUrl).searchParams;
    expect(params.get('p')).toBeNull();
    expect(params.get('ps')).toBeNull();
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [429, 'rate_limited'],
    [500, 'server_error'],
    [503, 'server_error'],
  ] as const)('maps %d → %s', async (status, expectedKind) => {
    stubGet(PATH, { status });
    const result = await makeClient().listProjects('acme');
    expect(result.kind).toBe(expectedKind);
  });

  it('returns network_error when fetch throws', async () => {
    server.use(http.get(PATH, () => HttpResponse.error()));
    const result = await makeClient().listProjects('acme');
    expect(result.kind).toBe('network_error');
  });
});

describe('SonarClient.listBranches', () => {
  const PATH = '/api/sonar/v1/project_branches/list';

  it('returns ok with the parsed branches on 200', async () => {
    const result = await makeClient().listBranches('acme_widget-service');
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.name).toBe('master');
      expect(result.value[0]?.isMain).toBe(true);
    }
  });

  it('encodes the project key as a query param', async () => {
    let receivedUrl = '';
    server.use(
      http.get(PATH, ({ request }) => {
        receivedUrl = request.url;
        return HttpResponse.json({ branches: [] });
      }),
    );
    await makeClient().listBranches('acme_widget-service');
    expect(new URL(receivedUrl).searchParams.get('project')).toBe('acme_widget-service');
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [429, 'rate_limited'],
    [500, 'server_error'],
  ] as const)('maps %d → %s', async (status, expectedKind) => {
    stubGet(PATH, { status });
    const result = await makeClient().listBranches('acme_widget-service');
    expect(result.kind).toBe(expectedKind);
  });

  it('returns network_error when fetch throws', async () => {
    server.use(http.get(PATH, () => HttpResponse.error()));
    const result = await makeClient().listBranches('acme_widget-service');
    expect(result.kind).toBe('network_error');
  });
});

describe('SonarClient.searchIssues', () => {
  const PATH = '/api/sonar/v1/issues/search';

  // Helper: capture the URL the client built.
  const captureUrl = (
    response: Record<string, unknown> = {
      paging: { pageIndex: 1, pageSize: 50, total: 0 },
      issues: [],
    },
  ): { read: () => string } => {
    let url = '';
    server.use(
      http.get(PATH, ({ request }) => {
        url = request.url;
        return HttpResponse.json(response);
      }),
    );
    return { read: () => url };
  };

  it('returns ok with the parsed issues on 200', async () => {
    const result = await makeClient().searchIssues({});
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.value.items.length).toBeGreaterThan(0);
      expect(result.value.total).toBe(115);
    }
  });

  it('encodes severities as a comma-joined query param', async () => {
    const cap = captureUrl();
    await makeClient().searchIssues({ severities: ['BLOCKER', 'CRITICAL'] });
    expect(new URL(cap.read()).searchParams.get('severities')).toBe('BLOCKER,CRITICAL');
  });

  it('encodes types as a comma-joined query param', async () => {
    const cap = captureUrl();
    await makeClient().searchIssues({ types: ['BUG', 'VULNERABILITY'] });
    expect(new URL(cap.read()).searchParams.get('types')).toBe('BUG,VULNERABILITY');
  });

  it('encodes statuses as a comma-joined query param', async () => {
    const cap = captureUrl();
    await makeClient().searchIssues({ statuses: ['OPEN', 'CONFIRMED'] });
    expect(new URL(cap.read()).searchParams.get('statuses')).toBe('OPEN,CONFIRMED');
  });

  it('encodes componentKeys, branch, tags, rules, assignees', async () => {
    const cap = captureUrl();
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
    const cap = captureUrl();
    await makeClient().searchIssues({ resolutions: [null, 'FIXED', 'WONTFIX'] });
    expect(new URL(cap.read()).searchParams.get('resolutions')).toBe('FIXED,WONTFIX');
  });

  it('omits filters that are empty arrays or simply not provided', async () => {
    const cap = captureUrl();
    await makeClient().searchIssues({ severities: [] });
    const params = new URL(cap.read()).searchParams;
    expect(params.get('severities')).toBeNull();
    // Filters not present on the input object are similarly absent on the wire.
    expect(params.get('types')).toBeNull();
    expect(params.get('tags')).toBeNull();
  });

  it('encodes pagination opts (p, ps)', async () => {
    const cap = captureUrl();
    await makeClient().searchIssues({}, { p: 2, ps: 100 });
    const params = new URL(cap.read()).searchParams;
    expect(params.get('p')).toBe('2');
    expect(params.get('ps')).toBe('100');
  });

  it('encodes createdAfter/createdBefore and hasComments', async () => {
    const cap = captureUrl();
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
    expect(result.kind).toBe('over_cap');
    if (result.kind === 'over_cap') {
      expect(result.total).toBe(12_345);
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

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [429, 'rate_limited'],
    [500, 'server_error'],
  ] as const)('maps %d → %s', async (status, expectedKind) => {
    stubGet(PATH, { status });
    const result = await makeClient().searchIssues({});
    expect(result.kind).toBe(expectedKind);
  });

  it('returns network_error when fetch throws', async () => {
    server.use(http.get(PATH, () => HttpResponse.error()));
    const result = await makeClient().searchIssues({});
    expect(result.kind).toBe('network_error');
  });
});

describe('SonarClient.searchHotspots', () => {
  const PATH = '/api/sonar/v1/hotspots/search';
  const projectKey = 'acme_widget-service' as never;

  it('returns ok with the parsed hotspots on 200', async () => {
    const result = await makeClient().searchHotspots({ projectKey });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.value.items).toEqual([]);
      expect(result.value.total).toBe(0);
    }
  });

  it('encodes projectKey, branch, status, resolution', async () => {
    let receivedUrl = '';
    server.use(
      http.get(PATH, ({ request }) => {
        receivedUrl = request.url;
        return HttpResponse.json({
          paging: { pageIndex: 1, pageSize: 50, total: 0 },
          hotspots: [],
        });
      }),
    );
    await makeClient().searchHotspots({
      projectKey,
      branch: 'main',
      status: 'TO_REVIEW',
      resolution: 'SAFE',
    });
    const params = new URL(receivedUrl).searchParams;
    expect(params.get('projectKey')).toBe('acme_widget-service');
    expect(params.get('branch')).toBe('main');
    expect(params.get('status')).toBe('TO_REVIEW');
    expect(params.get('resolution')).toBe('SAFE');
  });

  it('encodes pagination opts', async () => {
    let receivedUrl = '';
    server.use(
      http.get(PATH, ({ request }) => {
        receivedUrl = request.url;
        return HttpResponse.json({
          paging: { pageIndex: 3, pageSize: 200, total: 0 },
          hotspots: [],
        });
      }),
    );
    await makeClient().searchHotspots({ projectKey }, { p: 3, ps: 200 });
    const params = new URL(receivedUrl).searchParams;
    expect(params.get('p')).toBe('3');
    expect(params.get('ps')).toBe('200');
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [429, 'rate_limited'],
    [500, 'server_error'],
  ] as const)('maps %d → %s', async (status, expectedKind) => {
    stubGet(PATH, { status });
    const result = await makeClient().searchHotspots({ projectKey });
    expect(result.kind).toBe(expectedKind);
  });

  it('returns network_error when fetch throws', async () => {
    server.use(http.get(PATH, () => HttpResponse.error()));
    const result = await makeClient().searchHotspots({ projectKey });
    expect(result.kind).toBe('network_error');
  });
});
