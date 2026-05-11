// SPDX-License-Identifier: MIT

// Vercel Edge Function adapter. The actual mount point is
// `api/sonar/[...path].ts`, which re-exports `default` and `config` from
// here. Keeping the body in proxy/ lets the adapter be unit-tested next
// to the core without involving Vercel's filesystem routing.
//
// Per ADR-008(c), platform response caching must be explicitly disabled.
// Vercel Edge Functions have no implicit response cache; the no-store
// Cache-Control header set by `handleSonarRequest` on every response is
// the explicit signal that no cache layer (CDN, browser, intermediary)
// should retain anything.

import { handleSonarRequest } from '../core.js';

export const config = { runtime: 'edge' as const };

export default function handler(req: Request): Promise<Response> {
  return handleSonarRequest(req);
}
