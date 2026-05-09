// SPDX-License-Identifier: MIT

// Cloudflare Workers adapter (Module Worker syntax).
//
// Per ADR-008(c) the platform must explicitly disable response caching.
// Cloudflare expresses this via the non-standard `cf` field on the
// `RequestInit` of an outbound `fetch`. The proxy core uses a Web
// Standard fetch signature; this adapter wraps fetch so the cf-options
// are added without leaking platform specifics into core.

import { handleSonarRequest } from '../core';

// `cf` is a Cloudflare-only RequestInit extension; the cast keeps types
// honest in the standards-only core while letting the adapter speak its
// platform's dialect.
const cloudflareFetch = (input: string, init: RequestInit): Promise<Response> => {
  return fetch(input, {
    ...init,
    cf: { cacheTtl: 0, cacheEverything: false },
  } as RequestInit);
};

export default {
  fetch(req: Request): Promise<Response> {
    return handleSonarRequest(req, { fetchImpl: cloudflareFetch });
  },
};
