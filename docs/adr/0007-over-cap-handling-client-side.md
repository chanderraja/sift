# ADR-0007 — Over-cap handling: detect in client, not proxy

**Status:** Accepted
**Date:** 2026-05-06
**Closes:** Q-1

## Context

SonarCloud's `/api/issues/search` enforces a hard ceiling of 10,000 total results: `p * ps` cannot exceed 10,000. When the user's filter would yield more than that, the upstream returns the first 10,000 with `paging.total` set to the actual unbounded total. The API itself does not error.

Sift needs to detect this and surface it in a useful way. There are two reasonable places to do that:

- **Proxy-side.** The proxy parses upstream JSON, detects the cap, and synthesizes a richer error response (e.g. a 4xx with a typed body) so the SPA's API client surfaces it as an error variant.
- **Client-side.** The proxy passes the response through unchanged. The API client compares `paging.total` against the cap and emits a `Result.kind === 'over_cap'` variant. The UI handles presentation.

## Decision

Client-side detection. Specifically:

- The proxy stays vendor-neutral and stateless — no SonarCloud-specific business logic beyond URL routing. Statelessness is the proxy's whole reason for being; baking response inspection in would cost more than it saves.
- `SonarClient.searchIssues()` adds an `over_cap` variant to its `Result<Page<Issue>>` discriminated union. The variant carries the actual upstream `paging.total` so the UI can show "Your filter would return ~14,200 findings."
- The Issues feature renders a banner above the table containing: the total, a one-line statement of the cap and why Sift will not silently chunk, and three actionable narrowing chips computed client-side from the visible page's distribution.
- The first page of results renders below the banner so users can begin scanning while deciding how to narrow.
- The export modal checks the same variant and gates its action buttons until the filter yields ≤ 10,000.

The narrowing-chip suggestions ("+ severity ≥ Major", "+ file path: src/services/", "+ created ≥ 90 days ago") are heuristics, not facets returned by SonarCloud — they are derived from the most-common file path prefix, oldest creation date, and lowest severity present in the visible page.

## Consequences

- Proxy code stays minimal and predictable. Reasoning about the proxy stays simple: "it forwards bytes."
- The `over_cap` variant becomes a single integration point — UI, tests, and the export modal all check the same field.
- A future SonarCloud change to the cap (e.g. raising it to 100k) is a single constant change in the API client.
- The narrowing-chip heuristics live in the Issues feature; they are tested but not promised to be optimal — clearly documented as "best-effort suggestions."

## Rejected alternatives

- **Proxy-side detection.** Bakes SonarCloud quirks into infrastructure code. The proxy then has a schema dependency on the upstream — exactly the coupling the proxy is designed to avoid.
- **Silent chunking (multiple paginated calls behind one user request).** Tempting, but exports would be inconsistent: the result set could shift between page fetches as new analyses land. The product promise is "what you see is what you export."
- **Hard-fail at 10,000.** Doesn't help the user narrow. The banner-with-chips approach lets the user make progress without staring at an inert error.
