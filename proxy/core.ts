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
const ALLOWED_REQUEST_HEADERS = 'Authorization, Content-Type';
const PREFLIGHT_MAX_AGE_SECONDS = 86_400;

export function handleSonarRequest(req: Request, opts: ProxyOptions = {}): Promise<Response> {
  const allowedOrigin = opts.allowedOrigin ?? '*';

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

  if (req.method === 'OPTIONS') {
    return Promise.resolve(
      new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders(allowedOrigin),
          'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
          'Access-Control-Allow-Headers': ALLOWED_REQUEST_HEADERS,
          'Access-Control-Max-Age': String(PREFLIGHT_MAX_AGE_SECONDS),
          'Cache-Control': 'no-store',
        },
      }),
    );
  }

  // GET branch — implemented in subsequent commits.
  return Promise.resolve(new Response(null, { status: 501 }));
}

function corsHeaders(allowedOrigin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Expose-Headers': 'x-sift-upstream',
    Vary: 'Origin',
  };
}
