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
