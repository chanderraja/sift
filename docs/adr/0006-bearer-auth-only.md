# ADR-0006 — Bearer auth only

**Status:** Accepted
**Date:** 2026-05-06

## Context

Earlier drafts of the spec mentioned an HTTP Basic Auth fallback (`Authorization: Basic <base64(token:)>`, with the token as the username and an empty password). This pattern works on some SonarCloud installs because the gateway accepts both schemes, but it is **not** what SonarSource's official documentation prescribes — they specify `Authorization: Bearer <token>` only, and the documented behavior is the only behavior we can rely on across deployments and versions.

## Decision

Sift uses `Authorization: Bearer <token>` exclusively. No Basic Auth fallback, no probe-and-retry logic.

Tokens that SonarCloud accepts under any of its current schemes — legacy hex tokens, `squ_…` prefixed tokens, `sqp_…` prefixed tokens — all work transparently with Bearer. Our token field accepts whichever string the user pastes; the wire format is the same.

## Consequences

- One auth path in the API client. No retry-on-401-with-different-scheme dance, no scheme heuristic.
- If SonarCloud ever changes its required scheme, that is one ADR away. The handle is small.
- Documentation can state plainly: "Sift sends your token as a Bearer token, and only as a Bearer token."

## Rejected alternatives

- **Try Basic, fall back to Bearer (or vice-versa).** Doubles the request count on misconfigured tokens for marginal compatibility benefit. SonarSource has been unambiguous about Bearer being the supported scheme.
- **Let the user choose the auth scheme in Settings.** Pure busywork for the user. There is no scenario where a user knows their token but does not know which auth scheme it should use.
