# ADR-0008 — No proxy-side caching; SPA owns all caching

**Status:** Accepted
**Date:** 2026-05-08
**Closes:** Q-2

## Context

Open question Q-2 in `ARCHITECTURE.md` §8 asked where Sift should cache SonarCloud responses: at the edge proxy, or in the SPA via TanStack Query. The decision needs to be made before Phase 2 (Proxy) begins.

TanStack Query, already in the SPA stack, gives us per-user request deduplication, stale-while-revalidate, refetch-on-focus, and per-query stale times for free. It is well-suited to the access patterns Sift sees: one user, one tab, repeated reads of the same filter set as the user iterates.

Edge caching is not free. Two shapes were considered:

- **Cache by `(token, URL)` for a short TTL.** This puts the user's bearer token at the edge for the duration of the cache window — even 30 seconds of token-at-edge is a material weakening of the trust model promised in `SPEC.md` §13 ("the proxy is stateless; tokens are never stored server-side") and the stateless-proxy property recorded in ADR-001. A self-hosting fork that misconfigures its edge cache could persist tokens indefinitely without realizing it.
- **Cross-tenant cache without token in the key.** Two users issuing the same `GET /api/issues/search?...` would share a cache entry. Their token-scoped permissions are not the same; one user's authorized result becomes another user's unauthorized data exposure. This is unacceptable on its face.

Conditional GET via `If-Modified-Since` / `Last-Modified` was a third option, but SonarCloud V1 does not reliably emit `Last-Modified` on `/api/issues/search` — the most-fetched endpoint — so the gain is marginal and adds proxy complexity.

Neither cache shape survives the threat model documented in `SPEC.md` §13. The marginal latency win does not justify the trust-model regression.

## Decision

**No caching at the proxy layer.** The SPA owns all client-side caching via TanStack Query. The proxy stays maximally stateless: it forwards bytes and adds nothing.

This decision binds Phase 2 (Proxy) and Phase 3 (API Client). The implementation requirements below are not advisory — they are the contract the proxy and API client must satisfy.

## Consequences

These are implementation requirements:

### (a) TanStack Query stale times set explicitly per query type

`src/api/queries.ts` sets `staleTime` explicitly on every `useQuery` wrapper. Never left at zero (which would refetch on every component mount) and never left at the library default (which has changed across versions and is not appropriate for our access pattern).

| Query               | `staleTime` |
| ------------------- | ----------- |
| `searchIssues`      | 60_000 ms   |
| `searchHotspots`    | 60_000 ms   |
| `listOrganizations` | 300_000 ms  |
| `listProjects`      | 300_000 ms  |
| `listBranches`      | 300_000 ms  |
| `getQualityGate`    | 10_000 ms   |
| `getMeasures`       | 60_000 ms   |

These values are the Phase 3 defaults. The open question on default `staleTime` in the Phase 3 "When to ask the maintainer" list closes with this ADR — Phase 3 implements the table above.

The 10s window for `getQualityGate` is intentionally short because users frequently re-check QG status after pushing a commit. The 5-minute window on org/project/branch lists reflects how rarely those change relative to a Sift session.

### (b) Proxy emits `Cache-Control: no-store` on every response

Making the no-cache property explicit in the wire format defends against any HTTP cache that might sit between the proxy and the user — CDN edges, browser HTTP cache, reverse proxies a self-hosting fork might place in front, corporate forward proxies. `no-store` is the strongest directive and is correct here: there is nothing in the response that should be cached anywhere along the path.

### (c) Vercel and Cloudflare adapters explicitly disable platform caching

Both runtimes default to not caching responses to requests that carry an `Authorization` header, but the behavior must be explicit, not implicit. The Vercel adapter sets the function configuration to disable response caching; the Cloudflare adapter passes `cf: { cacheTtl: 0, cacheEverything: false }` (or equivalent) to its outbound `fetch`. This prevents a future platform default change from quietly enabling a cache.

### (d) Proxy logs zero request/response bodies and zero headers

Already required by `SECURITY.md`; restated here because confidentiality of the in-flight request is the property this decision defends. A CI grep on `proxy/` enforces that no logger call passes a request body, response body, or a header object. Status code and method may be logged.

### Performance posture

For a user iterating on filters, the SPA-side cache absorbs the common case: changing one filter dimension reuses cached responses for the unchanged ones, and TanStack Query deduplicates concurrent reads. Cold reads hit SonarCloud directly. This is the correct performance trade for a tool whose value depends on the trust model holding.

## Rejected alternatives

- **Edge cache keyed by `(token, URL)` with short TTL (e.g. 30s).** Token-at-edge is unacceptable even for short windows. Materially weakens the "proxy is stateless, no token persistence server-side" promise that is the proxy's reason for being.
- **Cross-tenant cache without token in the key.** Cross-user data exposure. A user with read access to project A and a user with read access only to project B would share cache entries; project A's data leaks to user B.
- **Conditional GET via `If-Modified-Since`.** SonarCloud V1's `/api/issues/search` does not reliably emit `Last-Modified`. Gain is marginal; complexity is real (the proxy would need to inspect responses and synthesize headers, breaking the "forwards bytes" property).
- **Cache only the unauthenticated endpoints.** SonarCloud's V1 does not have a meaningfully cacheable unauthenticated endpoint that Sift uses; everything we hit is token-scoped.

## Roadmap

Proxy-side caching may be revisited in v1.x **only if** one of the following becomes true, and **only with a new ADR that updates the threat model first**:

- Observed 429 rates from SonarCloud become a real problem for users of the canonical hosted instance.
- The canonical hosted instance grows enough that request pooling across users would meaningfully reduce upstream load — and a cache shape that does not weaken the trust model can be designed (e.g. per-token rate-limit smoothing without storing response bodies).

Until one of those triggers fires, the absence of proxy caching is a feature, not a TODO.
