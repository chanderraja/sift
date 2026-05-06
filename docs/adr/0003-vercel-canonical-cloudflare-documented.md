# ADR-0003 — Vercel Edge Functions canonical, Cloudflare Workers documented

**Status:** Accepted
**Date:** 2026-05-06

## Context

The proxy is a small pure function from `Request` to `Response`. Many platforms can host it: Vercel Edge Functions, Cloudflare Workers, Deno Deploy, Netlify Edge Functions, Bun runtime, plain Node behind a reverse proxy. Picking one as canonical reduces decision fatigue for new contributors; supporting alternatives keeps the project free of vendor lock-in.

## Decision

Vercel Edge Functions is the canonical deploy target. Cloudflare Workers is documented as an equally-supported alternative.

`proxy/core.ts` is vendor-neutral: it imports nothing from any platform's SDK, accepts a Web Standard `Request`, and returns a Web Standard `Response`. Adapters in `proxy/adapters/` are ~10 lines each:

- `proxy/adapters/vercel.ts` exports an Edge Function handler that calls `handleSonarRequest`.
- `proxy/adapters/cloudflare.ts` exports a Workers `fetch` handler that calls `handleSonarRequest`.

New platforms can be added with similar adapters without touching `core.ts`.

## Consequences

- Best contributor DX: one repository, `vercel deploy` works, every PR gets a preview URL.
- Cloudflare deploy is a documented path, not an afterthought; some users will prefer it for cold-start latency or free-tier limits.
- The proxy code cannot use platform-specific features (KV storage, environment variables via `process.env`). Must use Web Standards only. This is good — it keeps the proxy honest about its statelessness.

## Rejected alternatives

- **Cloudflare canonical.** Larger free tier, similar cold-start story. Lost on contributor DX: PR previews on Vercel are integrated, on Workers they require additional setup.
- **Run anywhere, document nothing.** Lazy and bad. New contributors deserve a working default.
- **Multiple canonical targets.** Means double the deploy CI, double the README maintenance, and the user choosing between identical-looking options. A single canonical with a documented alternative is clearer.
