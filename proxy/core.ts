// SPDX-License-Identifier: MIT

// Vendor-neutral edge-proxy core.
//
// Forwards browser HTTP requests to SonarCloud (eu) or SonarQube.us (us),
// adds CORS, strips dangerous response headers, never logs request bodies
// or headers. See ARCHITECTURE.md §2 (Module 8a) and ADR-001, ADR-003,
// ADR-008. Pure function: takes a Web Standard `Request` and returns a
// Web Standard `Response`. No platform-specific imports.

export interface ProxyOptions {
  // Origin allowed via CORS. Defaults to '*' for the canonical open instance;
  // hardened forks can pass a specific origin.
  allowedOrigin?: string;
}

const ALLOWED_METHODS = ['GET', 'OPTIONS'] as const;

export function handleSonarRequest(req: Request): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'OPTIONS') {
    return Promise.resolve(
      new Response(null, {
        status: 405,
        headers: {
          Allow: ALLOWED_METHODS.join(', '),
          'Cache-Control': 'no-store',
        },
      }),
    );
  }

  // Subsequent commits in this phase implement the rest. Fail safe in the
  // meantime so any path that reaches here is loud, not silent.
  return Promise.resolve(new Response(null, { status: 501 }));
}
