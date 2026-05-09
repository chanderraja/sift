// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleSonarRequest } from './core';

const stubFetch = (response: Response): ReturnType<typeof vi.fn> => {
  const mock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', mock);
  return mock;
};

describe('handleSonarRequest — method allowlist', () => {
  it.each(['POST', 'PUT', 'DELETE', 'PATCH'])(
    'rejects %s with 405 and an Allow header',
    async (method) => {
      const req = new Request('https://sift.example.com/api/sonar/v1/issues/search', {
        method,
      });
      const res = await handleSonarRequest(req);
      expect(res.status).toBe(405);
      const allow = res.headers.get('Allow') ?? '';
      expect(allow).toContain('GET');
      expect(allow).toContain('OPTIONS');
    },
  );
});

describe('handleSonarRequest — OPTIONS preflight', () => {
  it('returns 204 with CORS headers and no body', async () => {
    const req = new Request('https://sift.example.com/api/sonar/v1/issues/search', {
      method: 'OPTIONS',
    });
    const res = await handleSonarRequest(req);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods') ?? '').toContain('GET');
    expect(res.headers.get('Access-Control-Allow-Methods') ?? '').toContain('OPTIONS');
    const allowHeaders = (res.headers.get('Access-Control-Allow-Headers') ?? '').toLowerCase();
    expect(allowHeaders).toContain('authorization');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    // Preflights don't carry a body.
    expect(await res.text()).toBe('');
  });

  it('honors a custom allowedOrigin', async () => {
    const req = new Request('https://sift.example.com/api/sonar/v1/issues/search', {
      method: 'OPTIONS',
    });
    const res = await handleSonarRequest(req, { allowedOrigin: 'https://sift.example.com' });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://sift.example.com');
  });
});

describe('handleSonarRequest — path validation and upstream routing', () => {
  beforeEach(() => {
    // Ensures stale stubs from earlier files don't leak into these tests.
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(['/api/sonar/v3/foo', '/api/sonar/v1/', '/api/sonar/', '/api/foo', '/foo', '/'])(
    'returns 404 for non-matching path %s',
    async (path) => {
      const req = new Request(`https://sift.example.com${path}`);
      const res = await handleSonarRequest(req);
      expect(res.status).toBe(404);
    },
  );

  it('forwards a v1 path to https://sonarcloud.io/api/...', async () => {
    const fetchMock = stubFetch(new Response('{}', { status: 200 }));
    const req = new Request('https://sift.example.com/api/sonar/v1/issues/search');
    await handleSonarRequest(req);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://sonarcloud.io/api/issues/search');
  });

  it('forwards a v2 path to https://api.sonarcloud.io/...', async () => {
    const fetchMock = stubFetch(new Response('{}', { status: 200 }));
    const req = new Request('https://sift.example.com/api/sonar/v2/projects');
    await handleSonarRequest(req);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.sonarcloud.io/projects');
  });

  it('preserves nested path segments and query strings', async () => {
    const fetchMock = stubFetch(new Response('{}', { status: 200 }));
    const req = new Request(
      'https://sift.example.com/api/sonar/v1/issues/search?severities=BLOCKER&p=2',
    );
    await handleSonarRequest(req);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://sonarcloud.io/api/issues/search?severities=BLOCKER&p=2',
    );
  });

  it('mirrors the upstream status code', async () => {
    stubFetch(new Response('{"errors":[{"msg":"Insufficient privileges"}]}', { status: 403 }));
    const req = new Request('https://sift.example.com/api/sonar/v1/issues/search');
    const res = await handleSonarRequest(req);
    expect(res.status).toBe(403);
  });
});

describe('handleSonarRequest — region selection', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('routes ?region=us to sonarqube.us', async () => {
    const fetchMock = stubFetch(new Response('{}', { status: 200 }));
    const req = new Request('https://sift.example.com/api/sonar/v1/issues/search?region=us');
    await handleSonarRequest(req);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://sonarqube.us/api/issues/search');
  });

  it('routes ?region=us on v2 to api.sonarqube.us', async () => {
    const fetchMock = stubFetch(new Response('{}', { status: 200 }));
    const req = new Request('https://sift.example.com/api/sonar/v2/projects?region=us');
    await handleSonarRequest(req);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.sonarqube.us/projects');
  });

  it('routes ?region=eu to sonarcloud.io', async () => {
    const fetchMock = stubFetch(new Response('{}', { status: 200 }));
    const req = new Request('https://sift.example.com/api/sonar/v1/issues/search?region=eu');
    await handleSonarRequest(req);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://sonarcloud.io/api/issues/search');
  });

  it('strips the region param from the forwarded query', async () => {
    const fetchMock = stubFetch(new Response('{}', { status: 200 }));
    const req = new Request(
      'https://sift.example.com/api/sonar/v1/issues/search?region=us&severities=BLOCKER&p=2',
    );
    await handleSonarRequest(req);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://sonarqube.us/api/issues/search?severities=BLOCKER&p=2',
    );
  });

  it('rejects an unknown region with 400', async () => {
    const req = new Request('https://sift.example.com/api/sonar/v1/issues/search?region=apac');
    const res = await handleSonarRequest(req);
    expect(res.status).toBe(400);
  });
});

describe('handleSonarRequest — header forwarding and response post-processing', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const upstreamHeadersFor = (mock: ReturnType<typeof vi.fn>): Headers => {
    const init = mock.mock.calls[0]?.[1] as RequestInit | undefined;
    return new Headers(init?.headers);
  };

  it('forwards the Authorization header to upstream', async () => {
    const fetchMock = stubFetch(new Response('{}', { status: 200 }));
    const req = new Request('https://sift.example.com/api/sonar/v1/issues/search', {
      headers: { Authorization: 'Bearer squ_abc123' },
    });
    await handleSonarRequest(req);
    expect(upstreamHeadersFor(fetchMock).get('Authorization')).toBe('Bearer squ_abc123');
  });

  it('drops every other request header (no Cookie, no custom headers)', async () => {
    const fetchMock = stubFetch(new Response('{}', { status: 200 }));
    const req = new Request('https://sift.example.com/api/sonar/v1/issues/search', {
      headers: {
        Authorization: 'Bearer squ_abc123',
        Cookie: 'session=leak',
        'X-Forwarded-For': '1.2.3.4',
        'X-Custom-Header': 'snoop',
      },
    });
    await handleSonarRequest(req);
    const sent = upstreamHeadersFor(fetchMock);
    expect(sent.get('Authorization')).toBe('Bearer squ_abc123');
    expect(sent.get('Cookie')).toBeNull();
    expect(sent.get('X-Forwarded-For')).toBeNull();
    expect(sent.get('X-Custom-Header')).toBeNull();
  });

  it('strips Set-Cookie from the upstream response', async () => {
    stubFetch(
      new Response('{}', {
        status: 200,
        headers: { 'Set-Cookie': 'JSESSIONID=abc; Path=/' },
      }),
    );
    const req = new Request('https://sift.example.com/api/sonar/v1/issues/search');
    const res = await handleSonarRequest(req);
    expect(res.headers.get('Set-Cookie')).toBeNull();
  });

  it('adds CORS, x-sift-upstream, and Cache-Control: no-store on a forwarded response', async () => {
    stubFetch(new Response('{}', { status: 200 }));
    const req = new Request('https://sift.example.com/api/sonar/v1/issues/search?region=us');
    const res = await handleSonarRequest(req);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('x-sift-upstream')).toBe('https://sonarqube.us/api/issues/search');
    // The CORS expose-headers list must include x-sift-upstream so the SPA
    // can read it (browsers hide non-safelisted headers without it).
    expect((res.headers.get('Access-Control-Expose-Headers') ?? '').toLowerCase()).toContain(
      'x-sift-upstream',
    );
  });

  it('honors a custom allowedOrigin on forwarded responses', async () => {
    stubFetch(new Response('{}', { status: 200 }));
    const req = new Request('https://sift.example.com/api/sonar/v1/issues/search');
    const res = await handleSonarRequest(req, { allowedOrigin: 'https://sift.example.com' });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://sift.example.com');
  });

  it('passes the response body through unchanged', async () => {
    const payload = '{"total":42,"issues":[]}';
    stubFetch(new Response(payload, { status: 200 }));
    const req = new Request('https://sift.example.com/api/sonar/v1/issues/search');
    const res = await handleSonarRequest(req);
    expect(await res.text()).toBe(payload);
  });
});
