// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleSonarRequest } from './core';

const ORIGIN = 'https://sift.example.com';
const SPA_V1 = `${ORIGIN}/api/sonar/v1/issues/search`;
const SPA_V2 = `${ORIGIN}/api/sonar/v2/projects`;

// All test helpers below collapse the repeated boilerplate of building a
// `Request` for the SPA-side path, swapping in a fake `fetch`, and pulling
// the upstream URL/init out of the mock for assertions.

const req = (url = SPA_V1, init?: RequestInit): Request => new Request(url, init);

const stubFetch = (
  response: Response = new Response('{}', { status: 200 }),
): ReturnType<typeof vi.fn> => {
  const mock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', mock);
  return mock;
};

const stubFetchReject = (err: Error): ReturnType<typeof vi.fn> => {
  const mock = vi.fn().mockRejectedValue(err);
  vi.stubGlobal('fetch', mock);
  return mock;
};

const callUrl = (m: ReturnType<typeof vi.fn>): string => String(m.mock.calls[0]?.[0]);
const callInit = (m: ReturnType<typeof vi.fn>): RequestInit | undefined =>
  m.mock.calls[0]?.[1] as RequestInit | undefined;

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('handleSonarRequest — method allowlist', () => {
  it.each(['POST', 'PUT', 'DELETE', 'PATCH'])(
    'rejects %s with 405 and an Allow header',
    async (method) => {
      const res = await handleSonarRequest(req(SPA_V1, { method }));
      expect(res.status).toBe(405);
      const allow = res.headers.get('Allow') ?? '';
      expect(allow).toContain('GET');
      expect(allow).toContain('OPTIONS');
    },
  );
});

describe('handleSonarRequest — OPTIONS preflight', () => {
  it('returns 204 with CORS headers and no body', async () => {
    const res = await handleSonarRequest(req(SPA_V1, { method: 'OPTIONS' }));
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods') ?? '').toContain('GET');
    expect(res.headers.get('Access-Control-Allow-Methods') ?? '').toContain('OPTIONS');
    expect((res.headers.get('Access-Control-Allow-Headers') ?? '').toLowerCase()).toContain(
      'authorization',
    );
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    // Preflights don't carry a body.
    expect(await res.text()).toBe('');
  });

  it('honors a custom allowedOrigin', async () => {
    const res = await handleSonarRequest(req(SPA_V1, { method: 'OPTIONS' }), {
      allowedOrigin: 'https://sift.example.com',
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://sift.example.com');
  });
});

describe('handleSonarRequest — path validation and upstream routing', () => {
  it.each(['/api/sonar/v3/foo', '/api/sonar/v1/', '/api/sonar/', '/api/foo', '/foo', '/'])(
    'returns 404 for non-matching path %s',
    async (path) => {
      const res = await handleSonarRequest(req(`${ORIGIN}${path}`));
      expect(res.status).toBe(404);
    },
  );

  it('forwards a v1 path to https://sonarcloud.io/api/...', async () => {
    const m = stubFetch();
    await handleSonarRequest(req(SPA_V1));
    expect(m).toHaveBeenCalledOnce();
    expect(callUrl(m)).toBe('https://sonarcloud.io/api/issues/search');
  });

  it('forwards a v2 path to https://api.sonarcloud.io/...', async () => {
    const m = stubFetch();
    await handleSonarRequest(req(SPA_V2));
    expect(callUrl(m)).toBe('https://api.sonarcloud.io/projects');
  });

  it('preserves nested path segments and query strings', async () => {
    const m = stubFetch();
    await handleSonarRequest(req(`${SPA_V1}?severities=BLOCKER&p=2`));
    expect(callUrl(m)).toBe('https://sonarcloud.io/api/issues/search?severities=BLOCKER&p=2');
  });

  it('mirrors the upstream status code', async () => {
    stubFetch(new Response('{"errors":[{"msg":"Insufficient privileges"}]}', { status: 403 }));
    const res = await handleSonarRequest(req(SPA_V1));
    expect(res.status).toBe(403);
  });
});

describe('handleSonarRequest — region selection', () => {
  it('routes ?region=us to sonarqube.us', async () => {
    const m = stubFetch();
    await handleSonarRequest(req(`${SPA_V1}?region=us`));
    expect(callUrl(m)).toBe('https://sonarqube.us/api/issues/search');
  });

  it('routes ?region=us on v2 to api.sonarqube.us', async () => {
    const m = stubFetch();
    await handleSonarRequest(req(`${SPA_V2}?region=us`));
    expect(callUrl(m)).toBe('https://api.sonarqube.us/projects');
  });

  it('routes ?region=eu to sonarcloud.io', async () => {
    const m = stubFetch();
    await handleSonarRequest(req(`${SPA_V1}?region=eu`));
    expect(callUrl(m)).toBe('https://sonarcloud.io/api/issues/search');
  });

  it('strips the region param from the forwarded query', async () => {
    const m = stubFetch();
    await handleSonarRequest(req(`${SPA_V1}?region=us&severities=BLOCKER&p=2`));
    expect(callUrl(m)).toBe('https://sonarqube.us/api/issues/search?severities=BLOCKER&p=2');
  });

  it('rejects an unknown region with 400', async () => {
    const res = await handleSonarRequest(req(`${SPA_V1}?region=apac`));
    expect(res.status).toBe(400);
  });
});

describe('handleSonarRequest — header forwarding and response post-processing', () => {
  const upstreamHeaders = (m: ReturnType<typeof vi.fn>): Headers =>
    new Headers(callInit(m)?.headers);

  it('forwards the Authorization header to upstream', async () => {
    const m = stubFetch();
    await handleSonarRequest(req(SPA_V1, { headers: { Authorization: 'Bearer squ_abc123' } }));
    expect(upstreamHeaders(m).get('Authorization')).toBe('Bearer squ_abc123');
  });

  it('drops every other request header (no Cookie, no custom headers)', async () => {
    const m = stubFetch();
    await handleSonarRequest(
      req(SPA_V1, {
        headers: {
          Authorization: 'Bearer squ_abc123',
          Cookie: 'session=leak',
          'X-Forwarded-For': '1.2.3.4',
          'X-Custom-Header': 'snoop',
        },
      }),
    );
    const sent = upstreamHeaders(m);
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
    const res = await handleSonarRequest(req(SPA_V1));
    expect(res.headers.get('Set-Cookie')).toBeNull();
  });

  it('adds CORS, x-sift-upstream, and Cache-Control: no-store on a forwarded response', async () => {
    stubFetch();
    const res = await handleSonarRequest(req(`${SPA_V1}?region=us`));
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
    stubFetch();
    const res = await handleSonarRequest(req(SPA_V1), {
      allowedOrigin: 'https://sift.example.com',
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://sift.example.com');
  });

  it('passes the response body through unchanged', async () => {
    const payload = '{"total":42,"issues":[]}';
    stubFetch(new Response(payload, { status: 200 }));
    const res = await handleSonarRequest(req(SPA_V1));
    expect(await res.text()).toBe(payload);
  });
});

describe('handleSonarRequest — error mapping', () => {
  it.each([500, 502, 503, 504])('mirrors upstream %d verbatim', async (status) => {
    const body = `{"upstream":${String(status)}}`;
    stubFetch(new Response(body, { status }));
    const res = await handleSonarRequest(req(SPA_V1));
    expect(res.status).toBe(status);
    expect(await res.text()).toBe(body);
  });

  it('returns 502 with a typed JSON body when fetch throws', async () => {
    stubFetchReject(new TypeError('fetch failed: ECONNREFUSED'));
    const res = await handleSonarRequest(req(SPA_V1));
    expect(res.status).toBe(502);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('upstream_unreachable');
    expect(body.message).toContain('ECONNREFUSED');
  });

  it('keeps CORS and no-store on a 502 from a fetch failure', async () => {
    stubFetchReject(new TypeError('boom'));
    const res = await handleSonarRequest(req(SPA_V1));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('handleSonarRequest — injectable fetchImpl', () => {
  it('uses opts.fetchImpl when provided and never touches global fetch', async () => {
    // Globally stub fetch to a rejector so any leak-through is loud.
    const globalFetch = vi.fn().mockRejectedValue(new Error('global fetch should not be called'));
    vi.stubGlobal('fetch', globalFetch);

    const customFetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    const res = await handleSonarRequest(req(SPA_V1), { fetchImpl: customFetch });

    expect(globalFetch).not.toHaveBeenCalled();
    expect(customFetch).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
  });
});
