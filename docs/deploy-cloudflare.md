# Deploying the Sift proxy to Cloudflare Workers

The Sift proxy is vendor-neutral: the same `proxy/core.ts` runs behind a
Vercel Edge Function (the canonical canonical deploy, ADR-003) or a
Cloudflare Worker. This document walks through the Cloudflare path. The
end state is the same as the Vercel deploy: requests under
`/api/sonar/v1/**` and `/api/sonar/v2/**` are proxied to SonarCloud (or
SonarQube.us when `?region=us`), with CORS, `Cache-Control: no-store`,
and the documented header allow-list.

## Prerequisites

- A Cloudflare account.
- A static-site host for the SPA itself. The SPA is just the `dist/`
  output of `pnpm build`; any host (Cloudflare Pages, Vercel, Netlify,
  S3+CloudFront, plain S3, GitHub Pages) works. The proxy and the SPA
  do **not** have to live on the same vendor — they only need to share
  an origin from the browser's point of view, which we achieve below
  via a route on the SPA's hostname.
- [`wrangler`](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
  installed (`pnpm dlx wrangler@latest --version`).

## 1. Create a `wrangler.toml`

The repo does not commit a `wrangler.toml` because it contains
deploy-specific identifiers (account ID, route hostname). Create one at
the repo root with the following shape:

```toml
name = "sift-proxy"
main = "proxy/adapters/cloudflare.ts"
compatibility_date = "2024-11-01"

# Route the proxy onto the same origin as the SPA so the browser sees
# same-origin requests under /api/sonar/**.
routes = [
  { pattern = "sift.example.com/api/sonar/*", zone_name = "example.com" },
]
```

If the SPA is hosted on a non-Cloudflare zone, point its DNS for
`sift.example.com` at Cloudflare and proxy through Cloudflare; the
Worker route pattern then takes effect. Cloudflare's docs cover
[Workers routes](https://developers.cloudflare.com/workers/configuration/routing/routes/).

## 2. Authenticate

```sh
pnpm dlx wrangler login
```

## 3. Deploy

```sh
pnpm dlx wrangler deploy
```

Wrangler bundles `proxy/adapters/cloudflare.ts` and its imports
(`proxy/core.ts`) into a Worker and uploads it. The adapter is the
Module Worker entry point; it wraps `globalThis.fetch` with
`cf: { cacheTtl: 0, cacheEverything: false }` so platform caching is
explicitly disabled per [ADR-008(c)](./adr/008-no-proxy-caching.md).

## 4. Verify

With a real SonarCloud token (kept locally — never committed, never put
in a fixture):

```sh
curl -H "Authorization: Bearer $SONAR_TOKEN" \
  "https://sift.example.com/api/sonar/v1/organizations/search?member=true"
```

You should see a JSON array of organizations. Inspect the response
headers to confirm the proxy fingerprint:

- `Cache-Control: no-store`
- `Access-Control-Allow-Origin: *` (or your hardened origin)
- `x-sift-upstream: https://sonarcloud.io/api/organizations/search?...`

Switch regions with `?region=us` and confirm `x-sift-upstream` reports
`sonarqube.us`.

A preflight check:

```sh
curl -i -X OPTIONS "https://sift.example.com/api/sonar/v1/issues/search"
```

should return `204` with `Access-Control-Allow-Methods: GET, OPTIONS`,
`Access-Control-Allow-Headers: Authorization, Content-Type`, and
`Access-Control-Max-Age: 86400`.

## Hardened forks

The default adapter passes no explicit `allowedOrigin`, so CORS is
`*` — appropriate for the canonical open instance. To restrict to a
specific SPA origin, change `proxy/adapters/cloudflare.ts` to:

```ts
export default {
  fetch(req: Request): Promise<Response> {
    return handleSonarRequest(req, {
      fetchImpl: cloudflareFetch,
      allowedOrigin: 'https://sift.example.com',
    });
  },
};
```

## Why no Cloudflare KV / R2 / cache binding?

Per [ADR-008](./adr/008-no-proxy-caching.md), the proxy holds no state.
No KV namespace, no R2 bucket, no Cache API usage. The Worker is
stateless: bytes in, bytes out, with header normalization in between.
A fork that wants edge caching must first amend the threat model — see
ADR-008 §"Roadmap".
