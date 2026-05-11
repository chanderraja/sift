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

  // Outbound fetch implementation. Defaults to globalThis.fetch. Adapters
  // pass a wrapped fetch when a platform requires explicit cache-disable
  // options on outbound requests (e.g. Cloudflare's `cf: { cacheTtl: 0,
  // cacheEverything: false }` per ADR-008(c)). Keeping fetch overridable
  // also makes core unit-testable without stubbing globals.
  fetchImpl?: (input: string, init: RequestInit) => Promise<Response>;
}

const ALLOWED_METHODS = ['GET', 'OPTIONS'] as const;
const ALLOWED_REQUEST_HEADERS = 'Authorization, Content-Type';
const PREFLIGHT_MAX_AGE_SECONDS = 86_400;

// `/api/sonar/v1/...` and `/api/sonar/v2/...` are the only two prefixes we
// route. Anything else is a 404 — the proxy is not a generic forwarder.
const PATH_RE = /^\/api\/sonar\/(v1|v2)\/(.+)$/;

// Region routing. `?region=eu` (default) → sonarcloud.io; `?region=us` →
// sonarqube.us. Anything else is a 400 so misconfiguration is loud.
const REGION_HOSTS = {
  eu: 'sonarcloud.io',
  us: 'sonarqube.us',
} as const;

type Region = keyof typeof REGION_HOSTS;

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

  const regionParam = url.searchParams.get('region');
  if (regionParam !== null && regionParam !== 'eu' && regionParam !== 'us') {
    return new Response(JSON.stringify({ error: 'bad_region', given: regionParam }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
  const region: Region = regionParam === 'us' ? 'us' : 'eu';
  const host = REGION_HOSTS[region];

  // Strip the region param from the forwarded query — it's a proxy-routing
  // signal, not a SonarCloud parameter.
  const forwardedParams = new URLSearchParams(url.search);
  forwardedParams.delete('region');
  const forwardedQuery = forwardedParams.toString();
  const querySuffix = forwardedQuery.length > 0 ? `?${forwardedQuery}` : '';

  const upstreamUrl =
    version === 'v1'
      ? `https://${host}/api/${rest}${querySuffix}`
      : `https://api.${host}/${rest}${querySuffix}`;

  // Inbound-header allowlist: only Authorization is forwarded. Cookies,
  // X-Forwarded-* and any other client-supplied header is dropped on the
  // floor — the proxy is stateless and identity flows via Bearer only
  // (ADR-006).
  const upstreamHeaders = new Headers();
  const auth = req.headers.get('authorization');
  if (auth !== null) {
    upstreamHeaders.set('Authorization', auth);
  }

  const doFetch = opts.fetchImpl ?? fetch;
  let upstream: Response;
  try {
    upstream = await doFetch(upstreamUrl, {
      method: 'GET',
      headers: upstreamHeaders,
    });
  } catch (err) {
    // Network-level failure (DNS, TCP, TLS, abort, etc.). The proxy never
    // exposes the underlying error class to the caller — only a typed
    // JSON envelope with a short message. Upstream 5xx responses are not
    // routed through this branch; they're mirrored verbatim by the
    // success path below.
    const message = err instanceof Error ? err.message : 'unknown network error';
    return new Response(JSON.stringify({ error: 'upstream_unreachable', message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(allowedOrigin),
        'Cache-Control': 'no-store',
        'x-sift-upstream': upstreamUrl,
      },
    });
  }

  // Outbound-header processing: copy upstream headers, drop Set-Cookie
  // (defends against any upstream session quirk), add CORS, expose
  // x-sift-upstream for diagnostics, force Cache-Control: no-store
  // (ADR-008).
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('set-cookie');
  for (const [k, v] of Object.entries(corsHeaders(allowedOrigin))) {
    responseHeaders.set(k, v);
  }
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('x-sift-upstream', upstreamUrl);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

function corsHeaders(allowedOrigin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Expose-Headers': 'x-sift-upstream',
    Vary: 'Origin',
  };
}
