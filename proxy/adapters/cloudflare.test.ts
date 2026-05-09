// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import worker from './cloudflare';

describe('cloudflare adapter', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exposes a fetch handler in Module Worker shape', () => {
    expect(typeof worker.fetch).toBe('function');
  });

  it('delegates a forwarded request to handleSonarRequest', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const req = new Request('https://sift.example.com/api/sonar/v1/issues/search');
    const res = await worker.fetch(req);
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://sonarcloud.io/api/issues/search');
  });

  it('sets cf cache-disable options on outbound fetch (ADR-008(c))', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const req = new Request('https://sift.example.com/api/sonar/v1/issues/search');
    await worker.fetch(req);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit & {
      cf?: { cacheTtl?: number; cacheEverything?: boolean };
    };
    expect(init.cf).toEqual({ cacheTtl: 0, cacheEverything: false });
  });

  it('returns 405 for disallowed methods (delegation works for error paths too)', async () => {
    const req = new Request('https://sift.example.com/api/sonar/v1/issues/search', {
      method: 'POST',
    });
    const res = await worker.fetch(req);
    expect(res.status).toBe(405);
  });
});
