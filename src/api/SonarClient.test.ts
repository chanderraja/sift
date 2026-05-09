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
