# ADR-0001 — Static SPA + thin proxy

**Status:** Accepted
**Date:** 2026-05-06

## Context

SonarCloud's Web API V1 does not support browser CORS by design — its responses do not carry `Access-Control-Allow-Origin`, so a browser fetch from any origin other than SonarCloud's own UI is rejected by the user agent before the response reaches the SPA. V2 does send CORS headers, but only with `Access-Control-Allow-Origin: https://sonarcloud.io`; any other origin is still rejected.

A pure static SPA therefore cannot call SonarCloud directly. This was validated empirically by the `cors-spike/` directory before this ADR was written.

The realistic alternatives are: ship a server-side component (proxy / function), package the app as a browser extension, or package it as a desktop app.

## Decision

Sift ships as a static SPA fronted by a stateless edge-function proxy. The proxy lives in this repository, is open-source under MIT, is vendor-neutral (a pure function over Web Standard `Request` / `Response`), and is forkable in five minutes.

The trust model becomes: "the source-visible proxy never persists tokens, never logs request bodies or headers, and never caches authenticated responses." CI grep enforces these properties.

## Consequences

- One small runtime component to host. Vercel Edge Functions and Cloudflare Workers are both documented; either is fine.
- The token still never persists server-side, so the cold "no-server" promise is replaced with a stronger but more nuanced "stateless server, source-visible" promise.
- Every PR's preview deploy automatically gets its own proxy instance — no shared state to coordinate.
- SECURITY.md must explain the proxy clearly so users understand what is and is not promised.

## Rejected alternatives

- **Browser extension.** Bypasses CORS by default, but adds per-browser packaging, store review cycles, and install friction. Most users do not want to install an extension to read a CSV.
- **Local desktop app (Tauri / Electron).** Heavy. Defeats the "open it in a browser" UX and adds platform-specific build / signing work for marginal benefit.
- **Public CORS-proxy services.** Routes the user's token through a third party we do not control. Categorically incompatible with the security posture this project promises.
