# ADR-0012 — Switch Vercel adapter from Edge Runtime to Fluid Compute

**Status:** Accepted (supersedes ADR-003 in part)
**Date:** 2026-05-31

## Context

ADR-003 (2026-05-06) chose Vercel Edge Functions as the canonical proxy runtime.
The Vercel platform has since deprecated Edge Functions in favour of Fluid Compute
(the new default Node.js runtime). Per Vercel's 2026-02-27 guidance:

> "Edge functions have compatibility issues. Instead use Fluid Compute (default)
> which runs in the same regions and has the same price, but allows for regular
> Node.js."

The proxy core (`proxy/core.ts`) uses only Web Standard APIs (`Request`,
`Response`, `fetch`, `btoa`). All of these are available in Node.js 18+, which
Fluid Compute provides. No code changes to the core are required.

The `runtime: 'edge'` export in `proxy/adapters/vercel.ts` and
`api/sonar/[...path].ts` is the only thing that forces the Edge runtime.
Removing it lets Vercel pick Fluid Compute automatically.

## Decision

Remove `runtime: 'edge'` from the Vercel adapter and its API entry point.
The `config` export is dropped entirely from both files because:

- Fluid Compute is now the default — no declaration is needed.
- The note in `api/sonar/[...path].ts` about the build scanner needing a
  top-level `config` for edge detection no longer applies.

ADR-003's core decision (Vercel canonical, Cloudflare documented) is unchanged.
Only the runtime variant within Vercel changes.

## Consequences

- Proxy runs under Node.js / Fluid Compute instead of the V8 edge sandbox.
- Same regions, same per-request pricing as Edge Functions.
- Full Node.js standard library available if ever needed by the proxy.
- Eliminates the compatibility-issue risk flagged by Vercel for Edge Functions.
- No behaviour change: caching policy (ADR-008) and auth scheme (ADR-010) are
  unaffected — the `no-store` Cache-Control header and Basic auth encoding work
  identically under both runtimes.

## Rejected alternatives

- **Keep Edge runtime.** Vercel explicitly recommends against it; sticking with
  a deprecated path is unnecessary risk for zero benefit in this proxy.
- **Switch to Cloudflare Workers as canonical.** That is a bigger change than
  warranted; ADR-003's rationale for Vercel as canonical (PR previews, DX) still
  holds.
