// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import handler from './vercel';

describe('vercel adapter', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('delegates a forwarded request to handleSonarRequest', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const req = new Request('https://sift.example.com/api/sonar/v1/issues/search');
    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://sonarcloud.io/api/issues/search');
  });

  it('returns 405 for disallowed methods (delegation works for error paths too)', async () => {
    const req = new Request('https://sift.example.com/api/sonar/v1/issues/search', {
      method: 'POST',
    });
    const res = await handler(req);
    expect(res.status).toBe(405);
  });
});
