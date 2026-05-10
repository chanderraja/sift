# Implementation Plan — Sift

> **Audience:** Claude Code, executing this project.
> **Read first:** [`SPEC.md`](./SPEC.md), then [`ARCHITECTURE.md`](./ARCHITECTURE.md). Do not start any phase below until both have been read in full and any open questions in `ARCHITECTURE.md` §8 that affect the current phase are resolved.

This document describes **how** to build Sift, in 12 phases, each completable as a focused work session. Every phase is test-driven: tests are written before implementation, watched fail, then implementation is added until they pass. Architectural decisions that arise during a phase are recorded as new ADRs in `docs/adr/` and the `ARCHITECTURE.md` change log is updated.

---

## Table of Contents

1. [Working Principles](#working-principles)
2. [How to Read a Phase](#how-to-read-a-phase)
3. [Escalation Triggers](#escalation-triggers)
4. [Phase 0 — Foundation](#phase-0--foundation)
5. [Phase 1 — Types, Validators, and Test Fixtures](#phase-1--types-validators-and-test-fixtures)
6. [Phase 2 — Proxy](#phase-2--proxy)
7. [Phase 3 — API Client](#phase-3--api-client)
8. [Phase 4 — State and Storage](#phase-4--state-and-storage)
9. [Phase 5 — UI Primitives](#phase-5--ui-primitives)
10. [Phase 6 — Header, Auth, and Region](#phase-6--header-auth-and-region)
11. [Phase 7 — Org, Project, and Branch Pickers](#phase-7--org-project-and-branch-pickers)
12. [Phase 8 — Issues Tab](#phase-8--issues-tab)
13. [Phase 9 — Hotspots and Quality Gate Tabs](#phase-9--hotspots-and-quality-gate-tabs)
14. [Phase 10 — Export Modal](#phase-10--export-modal)
15. [Phase 11 — Settings, Theme, Polish](#phase-11--settings-theme-polish)
16. [Phase 12 — Deploy and Release](#phase-12--deploy-and-release)

---

## Working Principles

### TDD discipline (non-negotiable)

For every behavior introduced:

1. **Red.** Write the test. Run it. Watch it fail. The failure message is the spec for the next step.
2. **Green.** Write the minimum code that makes the test pass. No clever extras.
3. **Refactor.** With tests passing, clean up. Tests still pass after refactor.

Never write production code without a failing test. Never write more production code than is needed to pass the current failing test. The "we'll add tests later" path is closed.

### Small commits, one purpose each

Every commit:

- Has a single logical purpose.
- Compiles, passes lint, passes existing tests.
- Has a Conventional Commits message (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`).
- Reads cleanly in `git log` without context.

If a commit is getting big, split it. If two changes are unrelated, two commits.

### No unguarded changes to ARCHITECTURE.md

Module boundaries, interfaces, and stack choices in `ARCHITECTURE.md` are the contract. If a phase reveals a need to change them:

1. Stop. Do not work around it.
2. Write or amend an ADR proposing the change.
3. Update the ARCHITECTURE.md change log.
4. Escalate to the maintainer for approval before proceeding.

This sounds heavyweight; it isn't. Most ADRs fit in one screen. The discipline preserves coherence across many sessions.

### Strict types, always

`tsconfig.json` runs with `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`. ESLint forbids `any`, `as any`, and `// @ts-ignore`. If a type is genuinely unknown, model it with `unknown` and parse with Zod.

### Never log tokens

The only place that may call `console.*` is `src/lib/logger.ts`. CI grep enforces. Tokens, Authorization headers, and any field containing `token`/`secret`/`password` are scrubbed before any logger call goes out.

### Never hit live SonarCloud in tests

All tests use MSW with fixtures in `tests/fixtures/`. CI does not have a SonarCloud token. Live API contact is reserved for manual verification by the maintainer.

### Verify before declaring done

A phase is done when:

- All tests for the phase pass.
- The full test suite passes (no regressions).
- Lint is clean. Typecheck is clean.
- `pnpm build` succeeds.
- Bundle size is within budget (Phase 11+).
- The phase's acceptance criteria are demonstrably met (open the app, click the buttons).
- Commits are pushed and CI is green.

---

## How to Read a Phase

Each phase has the same structure:

- **Goal.** One-sentence description of what this phase delivers.
- **Prerequisites.** Which phases must be complete first.
- **Architectural references.** Sections of `SPEC.md` and `ARCHITECTURE.md` to re-read before starting.
- **Tests first.** What to write before any implementation. Listed in the order they should be written.
- **Implementation order.** Implementation steps, each preceded by the failing test that drives it.
- **Acceptance criteria.** Concrete observables that mean the phase is done.
- **Commits and structure.** What the commit history should look like.
- **Notes / gotchas.** Foreseen pitfalls.
- **When to ask the maintainer.** Specific triggers to escalate.

---

## Escalation Triggers

Stop and ask the maintainer when any of these happen:

- An open question in `ARCHITECTURE.md` §8 needs to be resolved to proceed.
- A test you'd write would require changing a documented module interface.
- An external API behaves differently from how `ARCHITECTURE.md` describes it (capture the deviation as an ADR draft).
- A dependency fails to install or a CI step fails for reasons that look like an environment issue, not a code issue.
- You're more than 30 minutes into debugging without a falsifiable theory.
- A stack choice (router, state library, etc.) feels wrong for the task; do not silently substitute.

---

## Phase 0 — Foundation

**Goal.** A repository that builds, lints, types, tests (smoke), and deploys to Vercel preview, with no application code yet.

**Prerequisites.** None. This is the first phase.

**Architectural references.** `SPEC.md` §10 (tech stack), §11 (repo structure), §12 (OSS scaffolding). `ARCHITECTURE.md` §2 (module map skeleton).

**Tests first.**

1. `tests/unit/smoke.test.ts` — `expect(true).toBe(true)`. Establishes that Vitest runs.
2. `tests/e2e/smoke.spec.ts` — Playwright loads `index.html` and asserts the document title. Establishes that the e2e harness runs.

**Implementation order.**

1. `pnpm create vite . --template react-ts`. Smoke-test the generated app.
2. Add Tailwind CSS v3 per its install guide; replace the generated CSS.
3. Add `tsconfig.json` strictness flags (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
4. Install: ESLint + typescript-eslint + react-hooks + jsx-a11y + Prettier. Configure an ESLint header rule (`eslint-plugin-license-header` or equivalent) requiring `// SPDX-License-Identifier: MIT` at the top of every `.ts`/`.tsx` file in `src/`, `proxy/`, and `tests/`. See `SPEC.md` §12.1.
5. Install: Vitest, Testing Library, jsdom. Add `pnpm test`.
6. Install: Playwright. Add `pnpm e2e`.
7. Install: Husky, lint-staged. Pre-commit hook runs `lint-staged`.
8. Add `.github/workflows/ci.yml` (lint, typecheck, test, build, license-check) and `.github/workflows/e2e.yml`. The license-check job runs `license-checker --production --onlyAllow=...` per the allow-list in `SPEC.md` §12.1 and fails on any disallowed identifier in the production dependency tree.
9. Add `LICENSE` (MIT, with copyright line per `SPEC.md` §12.1), `README.md` (skeleton), `CONTRIBUTING.md` (with inbound = outbound statement), `CODE_OF_CONDUCT.md`, `SECURITY.md`, `TRADEMARK.md`.
10. Add `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/dependabot.yml`.
11. Copy `SPEC.md`, `ARCHITECTURE.md`, `IMPLEMENTATION.md` into `docs/`. (Or root + symlinks; maintainer's call.)
12. Create empty `docs/adr/` with a README explaining ADR conventions.
13. Add bundle-size check via `size-limit` (250KB gzipped, will be hit later).
14. Connect to Vercel; verify preview deploy works on a PR.

**Acceptance criteria.**

- `pnpm install` succeeds clean.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.
- A push to a feature branch produces a green CI run and a Vercel preview URL.
- Pre-commit hook runs lint-staged on staged files.
- ADR-001 through ADR-006 are present in `docs/adr/` (copied from `ARCHITECTURE.md` §7).
- License-check CI job is configured and green; SPDX header is present in every committed `.ts`/`.tsx` file under `src/`, `proxy/`, and `tests/`.

**Commits and structure.** ~10–15 commits. One per logical step above. Examples:
- `chore: scaffold vite + react + ts`
- `chore: configure tailwind`
- `chore: add eslint + prettier`
- `chore: add vitest + testing-library + jsdom`
- `test: add unit smoke test`
- `chore: add playwright`
- `test: add e2e smoke test`
- `chore: add husky + lint-staged`
- `ci: add lint/typecheck/test/build workflow`
- `docs: add LICENSE, README skeleton, CONTRIBUTING, CoC, SECURITY`
- `docs: copy spec/architecture/implementation; seed ADRs`

**Notes / gotchas.**

- Default Vite + React + TS template ships an `App.tsx` with demo content. Replace with a near-empty placeholder; do not build features here.
- jsdom is needed for Vitest tests that touch React; node is fine for pure-function tests. Configure both via Vitest's `environmentMatchGlobs`.
- Husky hooks must be installed via `prepare` script so contributors get them automatically.

**When to ask the maintainer.**

- Choice of bundle-size tool (`size-limit` vs `bundlewatch`).
- Whether to enable a CodeQL workflow now or in Phase 12.
- Vercel project setup (someone with the GitHub permissions has to connect it).

---

## Phase 1 — Types, Validators, and Test Fixtures

**Goal.** Domain types, Zod validators, and recorded SonarCloud fixtures available to every later phase. No app code yet.

**Prerequisites.** Phase 0.

**Architectural references.** `SPEC.md` §6 (endpoints), §8 (data model). `ARCHITECTURE.md` §3 (interfaces).

**Tests first.**

1. `src/types/sonar.test-d.ts` — type-only tests using `expectTypeOf` from `expect-type` library, asserting branded types prevent cross-assignment (e.g. `IssueKey` cannot be passed where `ProjectKey` is expected).
2. For each Zod schema, a test in `src/lib/validators.test.ts`:
   - Parses a valid fixture → returns `success`.
   - Parses a fixture with a missing required field → returns `failure` with a useful error.
   - Parses a fixture with an unexpected extra field → succeeds (we don't reject extras).

**Implementation order.**

1. Place fixtures from real SonarCloud responses (one per endpoint type) into `tests/fixtures/`. The maintainer can capture these with curl + redaction; Phase 0 ships a script in `scripts/capture-fixtures.sh` for future use.
2. Define branded primitive types and the union types in `src/types/sonar.ts` exactly as `ARCHITECTURE.md` §3 specifies.
3. Define interface types: `Organization`, `Project`, `Branch`, `Issue`, `Hotspot`, `QualityGate`, `Measure`.
4. Define filter types: `IssueFilters`, `HotspotFilters`, `PageOpts`.
5. Define `Result<T>` discriminated union and `Page<T>`.
6. In `src/lib/validators.ts`, write Zod schemas matching each type. Schemas pass-through unknown extra keys (use `.passthrough()`).
7. Each schema has a corresponding `parseX(raw: unknown): Result<X>` exposed.

**Acceptance criteria.**

- `pnpm typecheck` passes with the new types.
- `pnpm test src/lib/validators.test.ts` passes.
- Importing a type from `src/types/sonar.ts` in a smoke component compiles cleanly.
- Branded type tests prove cross-assignment is rejected.

**Commits and structure.**

- `chore: add sonarcloud fixtures`
- `feat(types): add branded primitive types`
- `feat(types): add domain interfaces`
- `feat(types): add filter and result types`
- `feat(lib): add zod validators`
- `test(lib): validator unit tests`

**Notes / gotchas.**

- Fixtures should be checked-in JSON, not generated on the fly. Predictable inputs = predictable tests.
- Do not put real tokens, real org names that aren't already public, or any user PII in fixtures. Run a redaction pass.
- Branded types use a phantom property convention (`__brand: 'IssueKey'`); ensure the fixture-to-type cast happens only inside validators, never in feature code.

**When to ask the maintainer.**

- Whether to redact organization keys in fixtures or use a fictitious `acme` org throughout (recommended: fictitious).
- If a SonarCloud response has a field whose type isn't documented (e.g. `subscription` values beyond `FREE`/`PAID`), how to model it.

---

## Phase 2 — Proxy

**Goal.** A working, tested edge proxy at `proxy/core.ts` with Vercel and Cloudflare adapters, deployable to Vercel.

**Prerequisites.** Phase 0.

**Architectural references.** `SPEC.md` §6, §13 (security). `ARCHITECTURE.md` §2 (Module 8), §4 (data flow). ADR-001, ADR-003. **Resolve `ARCHITECTURE.md` Q-2 (caching) before starting.**

**Tests first.**

1. `proxy/core.test.ts` — for each branch of `handleSonarRequest`:
   - OPTIONS preflight returns 204 with correct CORS headers.
   - GET `/api/sonar/v1/foo` forwards to `https://sonarcloud.io/api/foo` (use a mocked `fetch`).
   - GET `/api/sonar/v2/foo` forwards to `https://api.sonarcloud.io/foo`.
   - Region `?region=us` routes to `sonarqube.us`.
   - Disallowed methods (POST, PUT, DELETE) return 405.
   - Disallowed paths return 404.
   - `Authorization` header is forwarded; other request headers are dropped.
   - Response: `Set-Cookie` is stripped; CORS header is added; `x-sift-upstream` is added.
   - Upstream 5xx is mirrored verbatim.
   - Network error returns 502 with a typed JSON body.
2. `proxy/adapters/vercel.test.ts`, `proxy/adapters/cloudflare.test.ts` — each adapter calls `handleSonarRequest` and returns its result.

**Implementation order.**

1. Skeleton `handleSonarRequest`. Return 501 for everything. Watch tests fail uniformly.
2. Implement OPTIONS preflight. First test goes green.
3. Implement method allow-list. 405 tests go green.
4. Implement path parsing and validation. 404 tests go green.
5. Implement region resolution.
6. Implement upstream URL construction for v1 and v2.
7. Implement upstream fetch with header forwarding.
8. Implement response post-processing (strip / add headers).
9. Implement error mapping for network failures.
10. Implement adapters: Vercel (`api/sonar/[...path].ts` + `proxy/adapters/vercel.ts`) and Cloudflare (`proxy/adapters/cloudflare.ts`).
11. Document Cloudflare deploy steps in `docs/deploy-cloudflare.md`.

**Acceptance criteria.**

- Unit tests for proxy core all pass.
- Adapter tests pass.
- Proxy is deployed to Vercel preview and a manual `curl` (with a real token, by the maintainer) returns valid SonarCloud data.
- CI grep ensures no `console.*` calls in `proxy/` except via `logger`.
- The `cors-spike/` directory is deleted; its purpose is now served by the production proxy.

**Commits and structure.**

- `feat(proxy): scaffold handleSonarRequest with method allowlist`
- `feat(proxy): handle OPTIONS preflight`
- `feat(proxy): route v1 and v2 paths to upstream`
- `feat(proxy): support eu and us regions`
- `feat(proxy): forward authorization, drop set-cookie, add cors`
- `feat(proxy): map network errors to typed responses`
- `feat(proxy): vercel adapter`
- `feat(proxy): cloudflare adapter`
- `docs: cloudflare deploy guide`
- `chore: remove cors-spike now that the production proxy is in place`

**Notes / gotchas.**

- Edge runtimes have a subset of Node APIs. Don't import `crypto`, `buffer`, etc. Stick to Web Standard `fetch`, `Request`, `Response`.
- The Vercel `[...path].ts` catch-all is a Next.js convention; for plain Vercel projects use the `api/` directory and `export const config = { runtime: 'edge' }`.
- The proxy must not log request bodies or headers beyond status (per SECURITY.md). Add a CI grep that fails on any non-logger `console.*` in `proxy/`.

**When to ask the maintainer.**

- Caching policy (open question Q-2 in `ARCHITECTURE.md`).
- Allowed-origin policy: `*` for the open canonical instance vs a specific origin for hardened forks.
- Vercel project name and domain.

---

## Phase 3 — API Client

**Goal.** A typed `SonarClient` that returns `Result<T>` for every method, fully tested against MSW.

**Prerequisites.** Phases 0, 1, 2.

**Architectural references.** `ARCHITECTURE.md` §2 (Module 1), §3 (interfaces).

**Tests first.**

`src/api/SonarClient.test.ts` — for each public method:

1. Happy path: returns `{ kind: 'ok', value: ... }` with parsed types.
2. 401: returns `{ kind: 'unauthorized' }`.
3. 403: returns `{ kind: 'forbidden', message }`.
4. 404: returns `{ kind: 'not_found' }`.
5. 429: returns `{ kind: 'rate_limited', retryAfterSeconds? }`.
6. 5xx: returns `{ kind: 'server_error', status }`.
7. Network failure: returns `{ kind: 'network_error', message }`.
8. For `searchIssues` only: a fixture indicating > 10,000 total returns `{ kind: 'over_cap', total }`.
9. Pagination: passing `{ p: 2, ps: 100 }` produces a request with the right query params.
10. Filters: each filter dimension translates to the correct query param.

**Implementation order.**

1. Set up MSW. Add `tests/msw.ts` with handlers for `/api/sonar/v1/*` returning fixtures. The handlers vary the response based on query params (e.g. severities filter).
2. Implement `SonarClient` constructor: stores region, token-getter.
3. Implement `listOrganizations()` first; covers happy path, 401, 403.
4. Implement `listProjects()`; adds pagination.
5. Implement `listBranches()`.
6. Implement `searchIssues()`; adds filter encoding and over-cap detection.
7. Implement `searchHotspots()`.
8. Implement `getQualityGate()`.
9. Implement `getMeasures()`.
10. Build a thin TanStack Query layer in `src/api/queries.ts`: `useOrganizations()`, `useProjects(orgKey)`, etc., wrapping `SonarClient` methods with appropriate `queryKey`s and the per-query `staleTime` values codified by ADR-008 (`searchIssues`/`searchHotspots` 60_000 ms; `listOrganizations`/`listProjects`/`listBranches` 300_000 ms; `getQualityGate` 10_000 ms; `getMeasures` 60_000 ms). `staleTime` is set explicitly on every query — never left at zero or the library default.

**Acceptance criteria.**

- Every public method has tests for at least: happy path + every error variant relevant to that endpoint.
- `searchIssues` has a dedicated test for the >10k cap.
- Coverage on `src/api/` ≥ 90% lines.
- `useOrganizations()` etc. import cleanly into a smoke component.

**Commits and structure.**

- `chore: add msw and base handlers`
- `feat(api): SonarClient skeleton`
- `feat(api): listOrganizations` + tests
- `feat(api): listProjects with pagination` + tests
- `feat(api): listBranches` + tests
- `feat(api): searchIssues with filters and over-cap detection` + tests
- `feat(api): searchHotspots` + tests
- `feat(api): getQualityGate` + tests
- `feat(api): getMeasures` + tests
- `feat(api): tanstack-query wrappers`

**Notes / gotchas.**

- Don't expose the raw `Response` outside the client. All errors are mapped to `Result` variants. Tests should never check `.status`.
- `over_cap` is detected by parsing the `paging.total` field; the API itself returns 200 OK with a partial result — the cap is a UI concern.
- Filter encoding: SonarCloud V1 uses comma-separated values for many filters (e.g. `severities=BLOCKER,CRITICAL`). Test this explicitly.

**When to ask the maintainer.**

- Default `staleTime` for TanStack Query is fixed by ADR-008 — see step 10 above. No maintainer input needed; deviations require a new ADR.
- Whether to surface upstream `paging.total` even on `ok` results so the UI can show "showing 100 of 1,247."

---

## Phase 4 — State and Storage

**Goal.** Zustand stores wired to a storage adapter, with URL-hash sync. Pure logic, no UI yet.

**Prerequisites.** Phases 0, 1, 3.

**Architectural references.** `ARCHITECTURE.md` §2 (Module 2), §3 (store contracts), §5 (URL hash schema). ADR-005 (sanitization).

**Tests first.**

1. `src/lib/sanitize.test.ts` — `cleanToken('abc\u200B123 ')` returns `'abc123'`. Cover NBSP, BOM, smart quotes, RTL marks. Empty stays empty. Only-whitespace becomes empty.
2. `src/lib/storage.test.ts` — for each mode (local / session / cookie / memory): set + get round-trips a value; delete removes it; clear empties; isolation between keys.
3. `src/lib/hashSync.test.ts` — serialize a state object to a hash string; parse the hash back; round-trip equals input. Edge: empty hash, malformed hash, unknown keys.
4. `src/stores/authStore.test.ts` — `setToken('   abc\u200Bdef   ')` persists `'abcdef'`; `validation` transitions on `validate()`; `clear()` wipes state and storage.
5. `src/stores/selectionStore.test.ts`, `filtersStore.test.ts`, `prefsStore.test.ts` — state transitions.

**Implementation order.**

1. `src/lib/sanitize.ts` — implement `cleanToken` and a separate `escapeForDisplay` for issue messages (HTML-safe text).
2. `src/lib/storage.ts` — implement the adapter, one mode at a time.
3. `src/lib/hashSync.ts` — implement serialize/parse with versioning (so future hash schema changes are detectable).
4. `src/lib/logger.ts` — wrap `console.*` with a token-redaction filter.
5. `src/stores/authStore.ts` — depends on storage, sanitize, logger.
6. `src/stores/selectionStore.ts`.
7. `src/stores/filtersStore.ts`.
8. `src/stores/prefsStore.ts`.
9. Wire `hashSync` to `selectionStore` + `filtersStore` (subscribe; write hash on change; on load, parse hash and dispatch).

**Acceptance criteria.**

- All store and lib tests pass.
- 100% line coverage on `sanitize.ts` and `logger.ts`.
- Manually open the dev server, type in a token field that's not yet in any UI (a Vite dev-route smoke test), reload, see token persisted (or not) per storage mode.

**Commits and structure.**

- `feat(lib): cleanToken and escapeForDisplay` + tests
- `feat(lib): storage adapter (local, session, cookie, memory)` + tests
- `feat(lib): hashSync with version` + tests
- `feat(lib): logger with token redaction` + tests
- `feat(stores): authStore` + tests
- `feat(stores): selectionStore` + tests
- `feat(stores): filtersStore` + tests
- `feat(stores): prefsStore` + tests
- `feat(stores): hash-sync integration`

**Notes / gotchas.**

- Cookies are not HttpOnly here (JS must read them). Document this in the SECURITY.md alongside the storage-mode tradeoffs.
- The hash schema must be versioned (`v=1&...`) so it can evolve without breaking shared URLs.
- Subscribing to multiple stores from a single hash-sync module must use stable function references to avoid unsubscription thrash.

**When to ask the maintainer.**

- Whether to default `storageMode` to `local` or `session` for safety on shared machines.
- Whether to expire `cookie` storage after N days; default `Session`.

---

## Phase 5 — UI Primitives

**Goal.** A library of reusable, accessible primitives matching `SPEC.md` §16.5. No domain knowledge inside primitives.

**Prerequisites.** Phase 0.

**Architectural references.** `SPEC.md` §16 (full design brief). `ARCHITECTURE.md` §2 (Module 4).

**Tests first.**

For each primitive, in its `.test.tsx`:

1. Renders with default props.
2. Renders each variant.
3. Keyboard navigation works (where applicable).
4. axe-core finds zero accessibility violations.
5. Forwards refs and `className` correctly.

**Implementation order.**

Build in dependency order: leaf primitives first.

1. Tokens (Tailwind config) — implement the color tokens from `SPEC.md` §16.3.
2. Typography setup (font import, base styles).
3. Button.
4. Badge (severity, type, status, generic).
5. Pill (QG status).
6. Input (text, password, search with leading icon, number).
7. Checkbox / Radio / Toggle.
8. Select / Combobox (use Radix `@radix-ui/react-select` and `react-popover` for type-ahead).
9. Tabs (Radix).
10. Tooltip (Radix).
11. Modal (Radix `Dialog`).
12. Drawer (Radix `Dialog` with side variant).
13. Toast (`sonner`).
14. Skeleton.
15. Empty state.
16. Filter group (collapsible).
17. Table primitives (header cell with sort, body row with hover, expandable row).
18. Add a dev-only `/__kitchen-sink` route that renders all primitives in all states for visual spot-checks. Not shipped in production builds.

**Acceptance criteria.**

- Every primitive has a test file with axe-core assertions.
- The kitchen-sink route renders without errors in dev.
- Coverage on `src/components/primitives/` ≥ 80%.

**Commits and structure.**

- One commit per primitive. ~17 commits.

**Notes / gotchas.**

- Radix primitives are unstyled — every primitive needs Tailwind classes following the design brief.
- The `frontend-design` skill applies here. Read `/mnt/skills/public/frontend-design/SKILL.md` before writing the kitchen-sink route or any aesthetic decision.
- Don't ship the kitchen-sink route in production: gate it behind `import.meta.env.DEV`.
- Use `react-aria` patterns where Radix doesn't cover (none expected, but note it).

**Resolved decisions** (closed by maintainer 2026-05-10):

- Toast library: `sonner` (lighter than `@radix-ui/react-toast`, sufficient for our UX needs).
- Icon set: `lucide-react` used throughout. No mixed icon families.

**When to ask the maintainer.**

- (None outstanding — see "Resolved decisions" above.)

---

## Phase 6 — Header, Auth, and Region

**Goal.** The page renders. The header is functional. Pasting a valid token validates against the proxy and shows "connected."

**Prerequisites.** Phases 0–5.

**Architectural references.** `SPEC.md` §7 (header), §9 (UX flows). `ARCHITECTURE.md` §2 (Module 5), §3 (`AuthStore`).

**Tests first.**

`src/features/header/Header.test.tsx`:

1. Cold start: token field is empty, region defaults to EU, all other pickers are disabled.
2. Pasting a valid token (MSW returns orgs): triggers validation → status indicator turns green.
3. Pasting an invalid token (MSW returns 401): status indicator turns red.
4. Pasting a token with zero-width chars: live status under the field shows "1 invisible char detected"; the request, when fired, contains the cleaned token.
5. Region change re-validates against the new region.
6. Settings and Export buttons are wired to dispatch UI events (overlays open).

**Implementation order.**

1. `src/App.tsx`: top-level layout — header at top, tab area below, overlay slots.
2. `src/features/header/Header.tsx`: scaffold structure.
3. Token field with live status indicator (uses `cleanToken`).
4. Region selector (dropdown bound to `authStore.setRegion`).
5. Validation effect: on token change, debounce 250ms, call `useOrganizations()`. Store the result kind into `authStore.validation`.
6. Status indicator badge driven by `validation`.
7. Settings and Export button affordances (open state held in a UI store).
8. Empty state in the tab area: "Paste a token above to begin."

**Acceptance criteria.**

- Open the app fresh: see the header, see the empty state below.
- Paste a valid token: orgs populate (visible in DevTools state); status indicator goes green.
- Paste an invalid token: status indicator goes red, friendly inline message visible.
- Reload: token (per storage mode) is restored; validation re-runs silently.

**Commits and structure.**

- `feat(app): top-level layout shell`
- `feat(header): scaffold`
- `feat(header): token field with live sanitization status`
- `feat(header): region selector`
- `feat(header): validation effect with debounce`
- `feat(header): connection status indicator`
- `feat(header): settings and export button affordances`
- `feat(app): empty state when no token`

**Notes / gotchas.**

- Debounce the validation effect; don't fire on every keystroke.
- Clear validation status to `idle` when token is emptied, not `invalid`.
- Don't show the "Forget" affordance in the header; that lives in the Settings drawer.

**Resolved decisions** (closed by maintainer 2026-05-10 in PR #25):

- Auto-focus the token field on cold start: **yes**. Implemented in `TokenField` — fires only on first mount when the field is empty so a reload-with-restored-token doesn't steal focus.
- Paste-from-clipboard button: **yes**. Clipboard-icon ghost button next to the input; routes through `cleanToken` like keyboard input, with a friendly hint if the API is unavailable or the user denies the permission prompt.

**When to ask the maintainer.**

- (None outstanding — see "Resolved decisions" above.)

---

## Phase 7 — Org, Project, and Branch Pickers

**Goal.** With a connected token, the user can pick org → project → branch. Selection is reflected in URL hash.

**Prerequisites.** Phase 6.

**Architectural references.** `SPEC.md` §7 (header). `ARCHITECTURE.md` §3 (`SelectionStore`). **Resolve `ARCHITECTURE.md` Q-4 (deleted-branch behavior) before starting.**

**Tests first.**

`src/features/header/Pickers.test.tsx`:

1. After valid token, org picker is enabled and lists orgs from MSW.
2. Single-org case: picker auto-selects and remains enabled but compact.
3. Multi-org: changing org clears project + branch selection.
4. Project picker shows search-as-you-type filtering.
5. Branch picker defaults to the project's main branch.
6. URL hash updates on each selection.
7. Reload with a hash present restores the selection (token already loaded).

**Implementation order.**

1. Org picker bound to `useOrganizations()` and `selectionStore.setOrganization()`.
2. Project picker (Combobox primitive) bound to `useProjects(orgKey)` and `setProject`. Adds search filtering.
3. Branch picker bound to `useBranches(projectKey)` and `setBranch`. Default to `isMain: true`.
4. Hash sync wiring: `selectionStore` writes to hash; on initial load, hash is parsed before queries fire.
5. Disabled-state cascading: project picker disabled until org chosen, branch picker disabled until project chosen.

**Acceptance criteria.**

- With a valid token, all three pickers work end-to-end.
- Hash like `#project=acme_widget-service&branch=main` restores cleanly on reload.
- Search-as-you-type in project picker is responsive (no perceivable lag with 100+ projects).

**Commits and structure.**

- `feat(header): organization picker`
- `feat(header): project picker with type-ahead`
- `feat(header): branch picker`
- `feat(header): cascading disabled state`
- `feat(stores): hash-sync for selection`

**Notes / gotchas.**

- Type-ahead filtering: client-side over the full list when ≤ 500 projects; server-side via SonarCloud's `q=` parameter when more.
- Branch list can include short-lived branches; surface only `LONG` and the current PR branches by default; offer a "show all" toggle if needed.

**When to ask the maintainer.**

- Behavior on a hash referencing a deleted project (open Q-4).

---

## Phase 8 — Issues Tab

**Goal.** The Issues tab renders, filters, sorts, paginates. Row expansion shows details.

**Prerequisites.** Phase 7.

**Architectural references.** `SPEC.md` §7.1, §16.6 (mockup #1). Q-1 (over-cap behavior) is resolved by ADR-007 — implement the client-side detection and the banner-with-narrowing-chips pattern as specified there.

**Tests first.**

`src/features/issues/Issues.test.tsx`:

1. With selection set, table renders rows from MSW.
2. Severity filter narrows results (count badge updates).
3. Sort by severity, file, etc., reorders rows.
4. Pagination: clicking next fetches page 2.
5. Row click expands a drawer with rule, snippet, message; click again collapses.
6. Empty state when filters yield no results.
7. Over-cap warning when MSW returns `paging.total > 10000`.
8. Loading skeleton shows while query is pending.
9. Error banner on `kind: 'forbidden'`.
10. URL hash reflects filter and sort changes.

**Implementation order.**

1. `IssuesTab.tsx` skeleton: layout (sidebar + table area).
2. `IssuesTable.tsx` using TanStack Table: columns from `ARCHITECTURE.md`, sortable, virtualized via TanStack Virtual when > 500 rows.
3. `IssuesFilterSidebar.tsx`: severity, type, status, then the rest. Each filter group reads from `filtersStore.issuesFilters` and writes via `patchIssues`.
4. Result count badge above table.
5. Pagination controls (or virtualized infinite scroll — pick one based on UX feel; recommend pagination).
6. Row expand drawer with rule description (lazy-load via `getRule()` if not present in issue).
7. States: loading skeleton, empty, error, over-cap warning.
8. Hash sync for filters and sort.

**Acceptance criteria.**

- 200-row dataset filters under 100ms.
- Filtering, sorting, paginating, and expanding all functional.
- Over-cap warning appears above the table when applicable.
- Bundle size still under 250KB gzipped.

**Commits and structure.**

- `feat(issues): tab scaffold`
- `feat(issues): table columns`
- `feat(issues): filter sidebar`
- `feat(issues): result count badge`
- `feat(issues): pagination`
- `feat(issues): row expand drawer`
- `feat(issues): loading and empty states`
- `feat(issues): over-cap warning`
- `feat(issues): error states`
- `feat(stores): hash-sync for filters and sort`

**Notes / gotchas.**

- TanStack Virtual works inside TanStack Table; do not roll your own virtualization.
- Rule description lookups should be cached aggressively (rules don't change between requests).
- Filter-count badges are computed client-side from the current page; they won't be exact for the unpaginated set without a separate facet API call. Decision: client-side is acceptable for v1; document the limitation.

**Resolved decisions** (closed by maintainer 2026-05-10 in PR #27):

- Pagination size default: **100**, with a selector for 50 / 100 / 200 / 500. Aligns with SonarCloud V1's default `ps=100`. Persists via `prefsStore.defaultPageSize`.
- File path as clickable link to SonarCloud's UI: **no** for v1. Sift's pitch is offline triage; an external `<a>` to sonarcloud.io feels off-brand and silently rots when SonarCloud changes URL paths. Phase 11 polish can add an opt-in via Settings if useful.

**When to ask the maintainer.**

- (None outstanding — see "Resolved decisions" above.)

---

## Phase 9 — Hotspots and Quality Gate Tabs

**Goal.** The remaining two tabs render with their respective data.

**Prerequisites.** Phase 8.

**Architectural references.** `SPEC.md` §7.2, §7.3, §16.6 (mockups #6, #7).

**Tests first.**

Hotspots: parallel tests to Issues, simplified for the smaller filter set.

QG:

1. With selection, status pill renders correctly per `projectStatus.status`.
2. Conditions list shows each condition with metric, threshold, actual, pass/fail.
3. Measures grid shows fetched values with formatters (percentages, ratings as letters).
4. Loading and error states.

**Implementation order.**

1. `HotspotsTab.tsx` — much of `IssuesTab` is reusable; refactor common bits into shared components if duplication is heavy.
2. `QualityGateTab.tsx` — three sections (status pill, conditions, measures grid).
3. Measure formatters in `src/lib/format.ts` for ratings (1→A, 2→B, …), percentages, NCLOC (with `k`/`M` suffixes), durations.

**Acceptance criteria.**

- All three tabs functional and switchable via tab control + URL hash.
- Tab switch preserves filters per tab (Issues filters persist when you go to QG and back).

**Commits and structure.**

- `refactor: extract findings-table primitive`
- `feat(hotspots): tab`
- `feat(hotspots): hotspot-specific filters`
- `feat(quality-gate): status pill`
- `feat(quality-gate): conditions list`
- `feat(quality-gate): measures grid`
- `feat(lib): metric formatters`

**Notes / gotchas.**

- Ratings (`new_security_rating` etc.) come back as `"1.0"` etc.; convert to A–E letters.
- The QG view fits on one screen; resist the urge to add charts here. They belong in v1.2 trend view.

**When to ask the maintainer.**

- Which measures to include by default in the QG view (suggestion: coverage, duplication, ncloc, technical_debt, complexity, security_rating, reliability_rating, maintainability_rating).

---

## Phase 10 — Export Modal

**Goal.** Users can export the current view to Markdown or CSV via the modal in the header.

**Prerequisites.** Phase 9.

**Architectural references.** `SPEC.md` §7.4. `ARCHITECTURE.md` §2 (Module 3, lib/csv.ts and lib/markdown.ts).

**Tests first.**

`src/lib/csv.test.ts`:

1. Empty list → header row only.
2. Issues list → RFC 4180 CSV; quotes are doubled inside fields; newlines preserved in quoted fields.
3. UTF-8 BOM is prepended.

`src/lib/markdown.test.ts`:

1. Triage template: numbered list, severity prefix, file:line in code, rule key linked.
2. Grouped-by-file template: H2 per file.
3. Grouped-by-rule template: H2 per rule with description block.
4. LLM-remediation template: prepended instruction; structured findings.
5. Header block always present at top.

`src/features/export-modal/ExportModal.test.tsx`:

1. Opens when Export button clicked.
2. Pre-selects current tab's filter and scope.
3. Switching format shows / hides template selector.
4. Limit defaults to 200; hard cap at 1000.
5. "Copy to clipboard" calls `navigator.clipboard.writeText` with the generated content.
6. "Download" triggers a file download.

**Implementation order.**

1. `src/lib/csv.ts` (use Papa Parse). Test golden files.
2. `src/lib/markdown.ts` (hand-rolled template strings). Test golden files for each template.
3. `ExportModal.tsx` UI: format toggle, template selector, field toggles, scope, limit, action buttons.
4. Wire up: read current filtered/sorted data from `filtersStore` + cache; generate per chosen format; copy or download.

**Acceptance criteria.**

- Click Export with the Issues tab populated → modal pre-fills correctly.
- Each Markdown template produces a valid Markdown that renders correctly when pasted into a renderer.
- CSV opens cleanly in Excel and Google Sheets.

**Commits and structure.**

- `feat(lib): csv exporter` + golden tests
- `feat(lib): markdown exporter — triage` + golden test
- `feat(lib): markdown exporter — grouped by file` + golden test
- `feat(lib): markdown exporter — grouped by rule` + golden test
- `feat(lib): markdown exporter — llm-remediation` + golden test
- `feat(export): modal UI`
- `feat(export): wire up data flow`

**Notes / gotchas.**

- Clipboard API requires a user gesture; the click handler is the gesture, but async work after `await` is borderline. Pre-generate the content synchronously, then call `writeText`.
- For very large exports, downloading is preferable to clipboard. Default to clipboard if ≤ 50KB, download otherwise.

**When to ask the maintainer.**

- Default LLM-remediation prompt wording (the template's prepended instruction). Suggest a default; ask for sign-off.

---

## Phase 11 — Settings, Theme, Polish

**Goal.** Settings drawer functional. Theme switch works. Keyboard shortcuts implemented. Bundle size verified.

**Prerequisites.** Phase 10.

**Architectural references.** `SPEC.md` §7.5, §16.8, §16.9. **Resolve `ARCHITECTURE.md` Q-3 (bundle splitting) before starting.**

**Tests first.**

1. Settings drawer opens, all controls bound to `prefsStore` and `authStore`.
2. Theme toggle: dark / light / system rendering verified via Playwright with `prefers-color-scheme` emulation.
3. Keyboard shortcuts: `j`/`k` move row focus, `enter` expands, `e` focuses export button, `/` focuses search, `?` shows shortcuts modal.
4. axe-core: zero violations on the populated page in both themes.
5. Bundle size check: ≤ 250KB gzipped main; otherwise CI fails.

**Implementation order.**

1. `SettingsDrawer.tsx` UI.
2. Theme provider: applies `data-theme` attribute on root; CSS variables already defined; `prefers-color-scheme` media query as the default.
3. Keyboard shortcut hook: global key handler with focus management.
4. Shortcuts help modal triggered by `?`.
5. "Forget everything" wired to `authStore.clear()` + `prefsStore.reset()` + `selectionStore.reset()` + `filtersStore.reset()` + `window.location.reload()`.
6. Bundle splitting where needed (ADR if a module is split).
7. Final accessibility pass with axe-core CI integration.
8. Dependabot tested.

**Acceptance criteria.**

- All keyboard shortcuts work as documented.
- Theme switch persists, instantly applies.
- "Forget everything" wipes all state visibly.
- axe-core in Playwright runs against the populated page and reports zero violations.
- Bundle size CI check is green.

**Commits and structure.**

- `feat(settings): drawer ui`
- `feat(theme): provider with system/light/dark`
- `feat(keyboard): global shortcuts`
- `feat(keyboard): shortcuts help modal`
- `feat(settings): forget everything`
- `chore: split heavy markdown templates into a dynamic import` (if needed)
- `ci: integrate axe-core in playwright`
- `ci: enforce bundle-size budget`

**Notes / gotchas.**

- `j`/`k` shortcuts must not interfere with text input fields. Check `event.target` and `composedPath()`.
- The shortcuts modal itself needs keyboard support.

**When to ask the maintainer.**

- Whether to add a "compact mode" toggle that increases row density further (recommendation: defer to v1.1).

---

## Phase 12 — Deploy and Release

**Goal.** v1.0 ships to a public URL with a tag, changelog, and screenshots in the README.

**Prerequisites.** Phases 0–11.

**Architectural references.** `SPEC.md` §12 (release process).

**Tests first.**

There's no test for "the app is on the internet"; instead, this phase is gated by:

1. All previous phases' tests pass on `master`.
2. `pnpm build && pnpm preview` works locally end-to-end with a real token.
3. CI is green on `master`.

**Implementation order.**

1. Production Vercel project: connect repo, configure environment, set the canonical domain.
2. README finalized: screenshot or animated GIF, live-demo link, privacy callout, quick-start, self-host, FAQ.
3. SECURITY.md finalized with the deployed proxy details.
4. CHANGELOG.md updated with v1.0 notes (semantic-release or `git-cliff` driven).
5. `release.yml` workflow: on tag push, build, deploy, generate release notes.
6. Tag `v1.0.0`. Push.
7. Verify the live site works against a real SonarCloud account.
8. Announce: GitHub Discussions post; optional: HN, Lobsters, dev.to, internal channels.

**Acceptance criteria.**

- The live URL responds and the app works end-to-end with a real token.
- The README has at least one screenshot showing the populated state.
- A user who reads only the README can self-host in under 10 minutes.
- v1.0 is tagged on GitHub with auto-generated release notes.

**Commits and structure.**

- `docs: README populated with screenshots and demo link`
- `docs: SECURITY.md finalized`
- `chore: release.yml workflow`
- `chore: release v1.0.0` (tagged commit)

**Notes / gotchas.**

- Don't put a token in any screenshot or fixture, even if it looks redacted.
- Vercel preview environments inherit the canonical proxy URL; ensure each PR's preview can talk to its own proxy or to a stable shared one (typically: each PR gets its own preview proxy, no shared state since the proxy is stateless).

**When to ask the maintainer.**

- Final domain choice.
- Whether to enable Vercel Analytics (recommendation: no — keeps the no-telemetry promise).

---

## After v1.0

The roadmap in `SPEC.md` §15 outlines v1.1 and beyond. Each future feature gets its own phase, structured the same way: prerequisites, tests first, implementation order, acceptance criteria. Add new phases here in numerical order. Update `ARCHITECTURE.md` ADRs whenever a new structural decision lands.

Future phases that might come up:

- v1.1 — SonarQube Server support (config flag for base URL; new ADR for the dual-host strategy).
- v1.1 — Saved filter presets (new store; persistence; UI).
- v1.2 — V2 endpoint migration (org / project / QG endpoints first).
- v1.2 — Trend / history view (new SonarClient method, new tab).
- v2.0 — CLI sibling (extract `src/lib/` and `src/api/` into a shared package).

---

*End of implementation plan, v0.1. Companion documents: `SPEC.md` (product spec) and `ARCHITECTURE.md` (modular architecture, living).*
