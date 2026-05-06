# ADR-0002 — Target SonarCloud Web API V1 exclusively for v1.0

**Status:** Accepted
**Date:** 2026-05-06

## Context

SonarCloud has two APIs in active use: V1 at `sonarcloud.io/api/*` and V2 at `api.sonarcloud.io/*`. V2 is a redesign with cleaner REST semantics but is incomplete:

- V1 has full coverage for issues, hotspots, projects, branches, quality gates, and measures.
- V2 covers organizations, projects, and quality gates but does **not** yet have issues or hotspots — the two highest-value endpoints for Sift.
- Community reports as recent as January 2026 mention auth quirks on V2 endpoints that V1 does not exhibit.

Building on V1 today means one schema, one auth path, and full feature coverage. Building on V2 today would require mixing V1 (issues, hotspots) with V2 (everything else), doubling the integration surface for no immediate user benefit.

## Decision

Sift v1.0 targets SonarCloud Web API V1 exclusively. The proxy in `proxy/core.ts` supports both `/api/sonar/v1/...` and `/api/sonar/v2/...` paths, so V2 migration is a future code change rather than an infra change.

V2 migration is a v1.x roadmap item, taken endpoint by endpoint as V2 reaches feature parity and the auth quirks stabilize.

## Consequences

- One API schema to validate, one set of fixtures to maintain, one set of error-mapping rules.
- The proxy is forward-compatible with V2 by routing path; no changes needed there to migrate.
- The Zod validators in `src/lib/validators.ts` will need V2 schemas added when individual endpoints are migrated; types in `src/types/sonar.ts` may need to be re-jigged if V2 shapes differ materially.

## Rejected alternatives

- **Mixed V1 + V2 from day one.** Doubles the schema surface and integration risk for no v1.0 user-facing benefit. Better to migrate per endpoint when each is ready.
- **V2 only, deferring features that V2 cannot serve.** Dropping issues and hotspots is not viable — they are the product.
