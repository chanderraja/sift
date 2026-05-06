# ADR-0005 — Token sanitization at the input boundary

**Status:** Accepted
**Date:** 2026-05-06

## Context

During the CORS spike, pasting a SonarCloud user token from common sources — a web page, terminal output, a password manager — sometimes introduced invisible Unicode characters into the token string: zero-width space (`U+200B`), no-break space (`U+00A0`), smart quotes, byte-order marks (`U+FEFF`), right-to-left marks.

When the SPA put such a string into an `Authorization: Bearer ...` header and called `fetch()`, the browser threw:

```
TypeError: String contains non ISO-8859-1 code point.
```

The error fires before the request leaves the browser, so the user sees a confusing failure, the proxy never sees the request, and SonarCloud never sees anything. The error message does not reveal the cause; we diagnosed it by inspecting the raw paste byte-by-byte.

## Decision

Tokens are sanitized at the input boundary. `src/lib/sanitize.ts` exports `cleanToken(raw: string): string` which strips any character outside printable ASCII (`U+0021` to `U+007E`, plus a defined whitespace allow-list during typing). The cleaned value is what the store holds; the raw value never reaches storage or any header.

The header live status indicator below the token field reports the cleaned character count and explicitly flags any characters that were stripped, so users know if their paste was clean.

## Consequences

- Eliminates an obscure failure mode that affects real users.
- Side benefit: the indicator surfaces evidence of malformed pastes early, before users wonder why the request is failing.
- Guarantees that any token that makes it into a request header is byte-safe.
- `cleanToken` becomes 100%-coverage code in `src/lib/sanitize.ts`. It is one of the few places where a bug would be silently dangerous (a too-aggressive sanitizer would strip characters that are valid in legacy tokens), so the test suite covers known-good token formats explicitly.

## Rejected alternatives

- **Sanitize inside the API client.** Too late — errors that originate before the header is constructed (Fetch's IDL-level check) would still surface as confusing failures. Sanitize where the data enters the system, not where it leaves.
- **Surface the error and let the user retype.** Punishes the user for a paste source they cannot see and may not have control over.
- **Strip silently with no UI feedback.** Leaves the user wondering why their token-management tool says one thing and Sift another. The visible indicator is cheap and reduces support burden.
