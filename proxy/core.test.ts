// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';

import { handleSonarRequest } from './core';

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
