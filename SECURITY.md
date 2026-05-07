# Security Policy

This is the most important non-code document in the repository. It describes the threat model, what the project promises about your token, and how to report a vulnerability.

If you find a security issue, please report it privately. Do **not** open a public GitHub issue.

---

## Reporting a vulnerability

Email **chander.raja@gmail.com** with:

- A description of the issue and its impact.
- Reproduction steps or a proof of concept.
- Affected version(s) or commit(s).
- Whether you have already disclosed it elsewhere.

A GPG public key for encrypted reports will be linked here once Sift has a maintained instance — until then, plain email is acceptable; please mark sensitive reproduction details accordingly.

**Disclosure timeline.** Acknowledgement target: 7 days. Coordinated disclosure preferred. The maintainer will work with the reporter on a fix-or-mitigation plan before public disclosure. Reporters retain the right to publish after the disclosure window regardless of fix status. There is no bug bounty — Sift is an unfunded community project.

## What Sift promises about your token

- Your SonarCloud user token never persists on a server.
- The proxy in [`proxy/`](./proxy) is **stateless**: no logging of tokens, request bodies, or headers; no caching of authenticated responses; no persistence of any kind. Verified by CI grep.
- The only thing the browser sends to the proxy is what is needed to forward the request to SonarCloud, plus your `Authorization: Bearer <token>` header. The proxy does not add to it; it only filters dangerous response headers (e.g. drops `Set-Cookie`) and adds a CORS header.
- Inside the SPA, only `src/lib/logger.ts` may call `console.*`. That logger scrubs `Authorization` headers and any field whose name contains `token`, `secret`, `password`, or `apiKey` before any output. Verified by CI grep on `src/`.
- The build ships zero third-party scripts: no analytics, no error reporters. Verified by CI on the production bundle.
- The token is never placed in a URL — never in query strings, never in the browser history.

A "Forget everything" affordance in Settings clears the token, all storage, and all in-memory state, then reloads.

## Threat model

### In scope

- Casual leakage of tokens via console logs, error reports, or screenshots.
- Malicious dependencies attempting to exfiltrate tokens.
- XSS via injected SonarCloud strings (issue messages, rule descriptions).
- Clipboard sniffing of generated exports.
- Proxy abuse (rate-limit replay, request flooding).

### Out of scope (acknowledged, not mitigated)

- Compromised user device or browser.
- Browser extensions with broad host permissions.
- Network MITM (HTTPS-only is assumed).
- A user who voluntarily pastes their token into a tool other than Sift.

### Specific mitigations

| #   | Mitigation                                                                                                                                              | Surface                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | `logger.ts` redacts `Authorization` headers and `token` / `secret` / `password` / `apiKey` fields before output.                                        | All client-side logging.                                                                   |
| 2   | Token sanitization at the input boundary strips non-printable-ASCII characters (zero-width space, NBSP, smart quotes, BOMs).                            | Token paste UX; prevents `non ISO-8859-1` Fetch failures and any obscure header smuggling. |
| 3   | Stateless edge proxy: no logging of bodies / headers, no caching, no persistence.                                                                       | Server-side trust surface.                                                                 |
| 4   | Strict Content Security Policy: `default-src 'self'; connect-src 'self'; script-src 'self'`. No third-party domains, no `unsafe-eval`.                  | Bundle integrity.                                                                          |
| 5   | No raw-HTML rendering of API strings. Issue messages and rule descriptions render as text or are sanitized via DOMPurify when rich rendering is needed. | XSS via SonarCloud strings.                                                                |
| 6   | No analytics, no error reporters, no telemetry SDKs. CI greps the production bundle.                                                                    | Bundle exfiltration.                                                                       |
| 7   | App refuses to send the token if `window.location.protocol !== 'https:'` (with a localhost dev exception).                                              | Plaintext leakage.                                                                         |
| 8   | "Forget everything" UI affordance: one click clears all storage + reloads.                                                                              | Recovery from accidental persistence.                                                      |
| 9   | Token is never placed in a URL.                                                                                                                         | Browser history, referrer leaks, server access logs.                                       |
| 10  | The proxy returns upstream `429`s verbatim; no automatic retries that could mask abuse patterns.                                                        | Rate-limit canary.                                                                         |

## Dependency policy

- Production dependencies must be licensed under the SPEC §12.1 allow-list (MIT / Apache-2.0 / BSD / ISC / MPL-2.0 / Unlicense / CC0-1.0). Enforced by CI.
- Dependabot is configured for weekly updates on `master`.
- Lockfile diffs in PRs are reviewed for unexpected transitive additions, especially anything resembling analytics or telemetry.
- Major-version bumps are evaluated for new permissions or new network calls before being accepted.

## Token storage modes

The user can choose how the token is held in the browser:

- `local` — `localStorage`. Survives reload and tab close. Default.
- `session` — `sessionStorage`. Cleared when the tab closes.
- `cookie` — non-HttpOnly cookie (the SPA must read it). Surface clearly larger; recommended only for users who understand the trade-off.
- `memory` — kept only in JS memory; lost on reload.

The choice lives in the Settings drawer. Switching modes migrates and re-encrypts as needed; "Forget everything" clears all four locations regardless of current mode.

## Reporting issues you are not sure about

When in doubt, email rather than file a public issue. The maintainer will route low-impact reports to public Issues with the reporter's permission.
