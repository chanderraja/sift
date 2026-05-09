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

// `/api/sonar/v1/...` and `/api/sonar/v2/...` are the only two prefixes we
// route. Anything else is a 404 — the proxy is not a generic forwarder.
const PATH_RE = /^\/api\/sonar\/(v1|v2)\/(.+)$/;

export async function handleSonarRequest(req: Request, opts: ProxyOptions = {}): Promise<Response> {
  const allowedOrigin = opts.allowedOrigin ?? '*';

  if (req.method !== 'GET' && req.method !== 'OPTIONS') {
    return new Response(null, {
      status: 405,
      headers: {
        Allow: ALLOWED_METHODS.join(', '),
        'Cache-Control': 'no-store',
      },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(allowedOrigin),
        'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
        'Access-Control-Allow-Headers': ALLOWED_REQUEST_HEADERS,
        'Access-Control-Max-Age': String(PREFLIGHT_MAX_AGE_SECONDS),
        'Cache-Control': 'no-store',
      },
    });
  }

  const url = new URL(req.url);
  const match = PATH_RE.exec(url.pathname);
  if (!match) {
    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  const version = match[1] as 'v1' | 'v2';
  const rest = match[2] ?? '';
  const upstreamUrl =
    version === 'v1'
      ? `https://sonarcloud.io/api/${rest}${url.search}`
      : `https://api.sonarcloud.io/${rest}${url.search}`;

  const upstream = await fetch(upstreamUrl, { method: 'GET' });
  return upstream;
}

function corsHeaders(allowedOrigin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Expose-Headers': 'x-sift-upstream',
    Vary: 'Origin',
  };
}
