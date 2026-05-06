# Architecture — Sift

> **This is a living document.** It is updated as architectural decisions are made or revised. Changes are recorded in the [Change Log](#change-log) at the end of this document and, for non-trivial decisions, captured as Architecture Decision Records (ADRs) in `docs/adr/`.
>
> **This document is the gate.** No implementation phase from `IMPLEMENTATION.md` may begin until the relevant section here is in place. If you (the implementer) are about to make a structural decision and don't see it covered here, **stop and escalate to the maintainer** so a new ADR can be written.

**Document version:** 0.2
**Spec version:** 0.4 (`SPEC.md`)
**Status:** Pre-implementation

---

## Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Module Map](#2-module-map)
3. [Module Interfaces](#3-module-interfaces)
4. [Data Flow](#4-data-flow)
5. [Key Patterns & Conventions](#5-key-patterns--conventions)
6. [Test Strategy](#6-test-strategy)
7. [Architecture Decision Records](#7-architecture-decision-records)
8. [Open Architectural Questions](#8-open-architectural-questions)
9. [Change Log](#9-change-log)

---

## 1. Architectural Overview

### Three layers, two boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                     STATIC SPA (browser)                    │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  features/  │  │  components/ │  │  features depend on │ │
│  │  (auth,     │  │  (primitives)│  │  components, lib,   │ │
│  │   issues,   │  │              │  │  api, stores        │ │
│  │   export…)  │  │              │  │                     │ │
│  └──────┬──────┘  └──────────────┘  └─────────────────────┘ │
│         │                                                   │
│  ┌──────▼──────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   stores/   │  │     api/     │  │     lib/     │        │
│  │   (Zustand) │  │ (SonarClient)│  │ (csv, md,    │        │
│  │             │  │              │  │  sanitize…)  │        │
│  └─────────────┘  └──────┬───────┘  └──────────────┘        │
└────────────────────────────┼────────────────────────────────┘
                              │  HTTP (same-origin)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  EDGE PROXY (Vercel / CF)                   │
│                                                             │
│  ┌────────────────────┐    ┌────────────────────────────┐   │
│  │  proxy/core.ts     │    │  proxy/adapters/           │   │
│  │  (vendor-neutral   │ ◄─ │  vercel.ts | cloudflare.ts │   │
│  │   pure function)   │    │  (thin adapters)           │   │
│  └─────────┬──────────┘    └────────────────────────────┘   │
└────────────┼────────────────────────────────────────────────┘
             │  HTTPS
             ▼
┌─────────────────────────────────────────────────────────────┐
│             SonarCloud Web API V1 (sonarcloud.io)           │
└─────────────────────────────────────────────────────────────┘
```

### Boundaries

- **SPA ↔ Proxy.** Same-origin HTTP. The SPA calls relative URLs (`/api/sonar/v1/...`); the static host routes those to the edge function. Auth header is forwarded; nothing else.
- **Proxy ↔ SonarCloud.** Outbound HTTPS to `sonarcloud.io` or `sonarqube.us` (region-dependent). The proxy adds nothing to the request beyond what the browser sent; it only filters the response (strip `Set-Cookie`, add CORS headers, surface upstream URL for diagnostics).

---

## 2. Module Map

The codebase is organized into eight top-level modules. Each has a single responsibility and a defined contract with its peers.

```
src/
├── api/             ← Module 1: SonarClient (HTTP → typed data)
├── stores/          ← Module 2: Application state (Zustand)
├── lib/             ← Module 3: Pure utilities (csv, md, sanitize, format, log)
├── components/      ← Module 4: Reusable primitives
├── features/        ← Module 5: Feature-scoped UI (the page's sections)
├── types/           ← Module 6: TypeScript domain types
├── App.tsx          ← Module 7: Top-level page composition
└── main.tsx         ← entry

proxy/
├── core.ts          ← Module 8a: Vendor-neutral proxy logic
└── adapters/        ← Module 8b: Platform-specific entry points

tests/
└── fixtures/        ← Recorded SonarCloud responses, used by MSW handlers
```

### Module 1 — `src/api/` (SonarClient)

**Responsibility:** Convert "I want issues for project X branch Y filtered by severity" into a typed promise. Owns request construction, pagination, error mapping, and client-side caching coordination (via TanStack Query).

**Boundaries:**
- Talks to `/api/sonar/v1/...` (same-origin proxy paths) only.
- Returns typed domain objects from `src/types/`.
- Surfaces errors as a discriminated union (`{ kind: 'unauthorized' } | { kind: 'forbidden' } | …`); never throws inside its public methods.
- Knows nothing about React, stores, or UI.

**Public API (sketch):**

```typescript
class SonarClient {
  constructor(opts: { region: 'eu' | 'us'; getToken: () => string });

  listOrganizations(): Promise<Result<Organization[]>>;
  listProjects(orgKey: string, opts?: PageOpts): Promise<Result<Page<Project>>>;
  listBranches(projectKey: string): Promise<Result<Branch[]>>;
  searchIssues(filters: IssueFilters, opts?: PageOpts): Promise<Result<Page<Issue>>>;
  searchHotspots(filters: HotspotFilters, opts?: PageOpts): Promise<Result<Page<Hotspot>>>;
  getQualityGate(projectKey: string, branch: string): Promise<Result<QualityGate>>;
  getMeasures(projectKey: string, branch: string, metricKeys: string[]): Promise<Result<Measure[]>>;
}

type Result<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'unauthorized' }
  | { kind: 'forbidden'; message: string }
  | { kind: 'not_found' }
  | { kind: 'rate_limited'; retryAfterSeconds?: number }
  | { kind: 'server_error'; status: number }
  | { kind: 'network_error'; message: string }
  | { kind: 'over_cap'; total: number };       // > 10,000 cap on issues

type Page<T> = { items: T[]; pageIndex: number; pageSize: number; total: number };
```

### Module 2 — `src/stores/` (State)

**Responsibility:** All client-side state, persisted or transient. Zustand-based, divided into small focused stores.

**Stores:**

- `authStore` — token (in-memory copy), region, storage mode, validation status.
- `selectionStore` — current org, project, branch.
- `filtersStore` — current filter set, sort, page index. Per-tab.
- `prefsStore` — theme, default page size, default Markdown template, last-tab.

Each store exposes typed selectors and actions; subscribes via `useStore`.

**Persistence:** governed by the `storage` adapter from `src/lib/storage.ts` based on the user's choice (localStorage / sessionStorage / cookie / memory).

**URL hash sync:** `selectionStore` and `filtersStore` write to / read from `window.location.hash` so a configured view is shareable.

### Module 3 — `src/lib/` (Pure utilities)

**Responsibility:** Functions with no React, no stores, no DOM dependencies. Pure inputs → outputs.

| File | Purpose |
|---|---|
| `csv.ts` | Issues / hotspots → RFC 4180-compliant CSV string |
| `markdown.ts` | Issues / hotspots → Markdown string per template |
| `sanitize.ts` | Token sanitization (strip non-printable-ASCII); message escaping |
| `format.ts` | Date / duration / severity formatters |
| `storage.ts` | Storage adapter (localStorage / sessionStorage / cookie / memory) |
| `logger.ts` | `console.*` wrapper with token redaction |
| `hashSync.ts` | URL hash ⇄ store state serialization |
| `validators.ts` | Zod schemas for SonarCloud responses |

All testable without a DOM. Unit-tested with Vitest, no testing library or jsdom required.

### Module 4 — `src/components/` (Primitives)

**Responsibility:** Stateless or near-stateless UI primitives — Button, Badge, Modal, Drawer, Table, etc. No domain knowledge. Reusable across features.

**Convention:** every primitive has an accompanying `.test.tsx` and an entry in the dev-mode "kitchen sink" route.

### Module 5 — `src/features/` (Vertical slices)

**Responsibility:** Domain-specific UI that composes primitives, talks to stores and the API client. Each feature is a folder containing its components, hooks, and tests.

```
features/
├── header/           ← Header strip with token, region, pickers, settings/export buttons
├── issues/           ← Issues tab: filter sidebar + table + drawer
├── hotspots/         ← Hotspots tab
├── quality-gate/     ← QG tab
├── export-modal/     ← Export overlay
└── settings-drawer/  ← Settings overlay
```

**Boundaries:**
- A feature owns its UI, its filter UI, its row rendering, its empty/error states.
- Features may use the API client, stores, primitives, lib utilities.
- Features must NOT directly read from `localStorage` or call `fetch` — those go through `lib/storage.ts` and `api/SonarClient`.
- Features must NOT import from each other. Cross-feature concerns live in stores or shared types.

### Module 6 — `src/types/` (Domain types)

**Responsibility:** TypeScript types for the SonarCloud V1 domain — `Organization`, `Project`, `Branch`, `Issue`, `Hotspot`, `QualityGate`, `Measure`, plus shared types like `Severity`, `IssueType`, `Status`.

These are *the* contract that flows through the codebase. The Zod schemas in `lib/validators.ts` parse raw responses into these types.

### Module 7 — `App.tsx` (Composition)

**Responsibility:** Compose the page. Provides the QueryClientProvider, theme provider, error boundary, and the root layout (header + tab content + overlays). Effectively the only file that knows the full set of features.

### Module 8 — `proxy/` (Edge proxy)

**Responsibility:** Forward browser HTTP requests to SonarCloud, attach CORS headers on the way back, strip dangerous response headers, no logging of bodies or headers.

#### 8a — `proxy/core.ts` (vendor-neutral)

Pure function:

```typescript
async function handleSonarRequest(req: Request, opts: { allowedOrigin: string }): Promise<Response>;
```

No platform-specific imports. No `process.env`. Takes a Web Standard `Request`, returns a Web Standard `Response`. Easily portable.

Logic:
1. Reject any method except `GET`, `OPTIONS`.
2. Reject any path not matching `^/api/sonar/(v1|v2)/.+`.
3. Map path: `/api/sonar/v1/foo` → `https://{regionHost}/api/foo` (or `api.{regionHost}/foo` for v2).
4. Forward request with `Authorization` header passed through; all other request headers dropped.
5. Receive upstream response; mirror status; drop `Set-Cookie`; add CORS; surface `x-sift-upstream` for debugging.
6. Stream response body through unchanged.

Region is read from a query parameter (`?region=eu|us`, default `eu`) — keeps the URL shape simple.

#### 8b — `proxy/adapters/` (platform-specific)

Tiny wrappers that call `handleSonarRequest`:

```typescript
// vercel.ts
export const config = { runtime: 'edge' };
export default function (req: Request) {
  return handleSonarRequest(req, { allowedOrigin: 'https://sift.example.com' });
}

// cloudflare.ts
export default {
  async fetch(req: Request) {
    return handleSonarRequest(req, { allowedOrigin: 'https://sift.example.com' });
  }
};
```

That's the entire vendor-coupling surface — about 10 lines each. New platforms can be added with similar adapters without touching `core.ts`.

---

## 3. Module Interfaces

### TypeScript domain types (Module 6)

```typescript
// Branded primitive types prevent mixing identifier types
type ProjectKey = string & { readonly __brand: 'ProjectKey' };
type IssueKey   = string & { readonly __brand: 'IssueKey' };
type RuleKey    = string & { readonly __brand: 'RuleKey' };
type OrgKey     = string & { readonly __brand: 'OrgKey' };

type Severity   = 'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
type IssueType  = 'BUG' | 'VULNERABILITY' | 'CODE_SMELL';
type Status     = 'OPEN' | 'CONFIRMED' | 'REOPENED' | 'RESOLVED' | 'CLOSED';
type Resolution = 'FALSE-POSITIVE' | 'WONTFIX' | 'FIXED' | 'REMOVED' | null;

interface Organization {
  key: OrgKey;
  name: string;
  description?: string;
  subscription: 'FREE' | 'PAID' | string;
  alm?: { key: string; url: string; personal: boolean };
  actions?: { admin: boolean; delete: boolean; provision: boolean };
  avatar?: string;
}

interface Project {
  key: ProjectKey;
  name: string;
  organization: OrgKey;
  qualifier: 'TRK';
  visibility: 'public' | 'private';
  lastAnalysisDate?: string;
  qualityGate?: 'OK' | 'WARN' | 'ERROR' | 'NONE';
}

interface Branch {
  name: string;
  isMain: boolean;
  type: 'LONG' | 'SHORT' | 'PULL_REQUEST';
  status?: { qualityGateStatus: 'OK' | 'WARN' | 'ERROR' | 'NONE' };
  analysisDate?: string;
}

interface Issue {
  key: IssueKey;
  rule: RuleKey;
  severity: Severity;
  type: IssueType;
  status: Status;
  resolution: Resolution;
  component: string;
  project: ProjectKey;
  line?: number;
  hash?: string;
  textRange?: { startLine: number; endLine: number; startOffset: number; endOffset: number };
  flows: Array<{ locations: Array<{ component: string; textRange: TextRange; msg: string }> }>;
  message: string;
  effort?: string;
  debt?: string;
  author?: string;
  tags: string[];
  creationDate: string;
  updateDate: string;
  closeDate?: string;
  assignee?: string;
  comments?: Array<{ key: string; htmlText: string; createdAt: string }>;
}

interface Hotspot {
  key: string;
  component: string;
  project: ProjectKey;
  securityCategory: string;
  vulnerabilityProbability: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'TO_REVIEW' | 'REVIEWED';
  resolution?: 'FIXED' | 'SAFE' | 'ACKNOWLEDGED';
  line: number;
  message: string;
  creationDate: string;
  updateDate: string;
  ruleKey: RuleKey;
}

interface QualityGate {
  projectStatus: {
    status: 'OK' | 'WARN' | 'ERROR' | 'NONE';
    conditions: Array<{
      status: 'OK' | 'WARN' | 'ERROR';
      metricKey: string;
      comparator: 'GT' | 'LT' | 'EQ' | 'NE';
      errorThreshold: string;
      actualValue: string;
    }>;
  };
}

interface Measure {
  metric: string;
  value?: string;
  bestValue?: boolean;
  period?: { index: number; value: string };
}

interface IssueFilters {
  componentKeys?: ProjectKey[];
  branch?: string;
  severities?: Severity[];
  types?: IssueType[];
  statuses?: Status[];
  resolutions?: Resolution[];
  tags?: string[];
  rules?: RuleKey[];
  assignees?: string[];
  filePathPrefix?: string;
  createdAfter?: string;
  createdBefore?: string;
  hasComments?: boolean;
}

interface HotspotFilters {
  projectKey: ProjectKey;
  branch?: string;
  status?: 'TO_REVIEW' | 'REVIEWED';
  resolution?: 'FIXED' | 'SAFE' | 'ACKNOWLEDGED';
}

interface PageOpts { p?: number; ps?: number }
```

### Store contracts (Module 2)

```typescript
interface AuthStore {
  // State
  token: string;                        // never sent to logger
  region: 'eu' | 'us';
  storageMode: 'local' | 'session' | 'cookie' | 'memory';
  validation: 'idle' | 'pending' | 'valid' | 'invalid';

  // Actions
  setToken(raw: string): void;          // calls sanitize() internally
  setRegion(region: 'eu' | 'us'): void;
  setStorageMode(mode: AuthStore['storageMode']): void;
  validate(): Promise<void>;            // hits proxy with current token
  clear(): void;                        // wipes token + storage
}

interface SelectionStore {
  organizationKey?: OrgKey;
  projectKey?: ProjectKey;
  branchName?: string;
  setOrganization(key: OrgKey): void;
  setProject(key: ProjectKey): void;
  setBranch(name: string): void;
  reset(): void;
}

interface FiltersStore {
  tab: 'issues' | 'hotspots' | 'quality-gate';
  issuesFilters: IssueFilters;
  hotspotsFilters: HotspotFilters;
  sort: { column: string; direction: 'asc' | 'desc' }[];
  page: number;
  pageSize: number;
  setTab(tab: FiltersStore['tab']): void;
  patchIssues(patch: Partial<IssueFilters>): void;
  patchHotspots(patch: Partial<HotspotFilters>): void;
  setSort(sort: FiltersStore['sort']): void;
  setPage(p: number): void;
  reset(): void;
}

interface PrefsStore {
  theme: 'system' | 'light' | 'dark';
  defaultPageSize: number;
  defaultMarkdownTemplate: 'triage' | 'by-file' | 'by-rule' | 'llm-remediation';
  setTheme(theme: PrefsStore['theme']): void;
  // ...
}
```

### Storage adapter (Module 3)

```typescript
interface Storage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  delete(key: string): void;
  clear(): void;
}

function createStorage(mode: 'local' | 'session' | 'cookie' | 'memory'): Storage;
```

The store layer never touches `localStorage` or `document.cookie` directly — only this abstraction.

### Proxy core (Module 8a)

```typescript
interface ProxyOptions {
  // Origin allowed via CORS. Use '*' for free-for-all (default for the canonical
  // open instance) or a specific origin for hardened deploys.
  allowedOrigin?: string;
}

async function handleSonarRequest(
  req: Request,
  opts?: ProxyOptions
): Promise<Response>;
```

---

## 4. Data Flow

### Read flow: "User clicks Issues tab"

```
User clicks tab
   ↓
features/header dispatches filtersStore.setTab('issues')
   ↓
filtersStore.tab updates → URL hash updates via hashSync
   ↓
features/issues mounts (or re-renders), calls useQuery({
  queryKey: ['issues', selection, filters, page, pageSize],
  queryFn: () => sonarClient.searchIssues(filters, { p, ps })
})
   ↓
TanStack Query checks cache → cache miss → invokes queryFn
   ↓
SonarClient.searchIssues constructs URL '/api/sonar/v1/issues/search?...'
   ↓
Browser sends fetch with Authorization: Bearer <token>
   ↓
Vercel routes /api/* to Edge Function → handleSonarRequest()
   ↓
Proxy forwards to https://sonarcloud.io/api/issues/search?...
   ↓
SonarCloud responds with JSON
   ↓
Proxy strips Set-Cookie, adds CORS, returns to browser
   ↓
SonarClient parses JSON via Zod validator → Result<Page<Issue>>
   ↓
TanStack Query caches result, returns to feature component
   ↓
features/issues renders the table from result.value.items
```

### Write flow: "User changes a filter"

```
User clicks severity filter
   ↓
features/issues' filter sidebar calls filtersStore.patchIssues({severities: ['BLOCKER']})
   ↓
filtersStore updates → URL hash syncs
   ↓
TanStack Query sees queryKey changed → refetches
   ↓
[same as read flow from here]
```

### Token-validation flow (cold start)

```
User pastes token in header
   ↓
sanitize.cleanToken() strips non-printable-ASCII; status indicator updates
   ↓
authStore.setToken(cleaned) → optionally persists per storageMode
   ↓
authStore.validate() → SonarClient.listOrganizations() under the hood
   ↓
On Result.kind === 'ok': validation = 'valid', orgs populated
On Result.kind === 'unauthorized': validation = 'invalid', token row red
```

---

## 5. Key Patterns & Conventions

### Errors as values, not exceptions

The API client never throws. Every public method returns `Result<T>`. UI code must handle every variant; TypeScript exhaustiveness checks ensure this.

### One source of truth per concern

- Token: `authStore.token` (never `localStorage` directly).
- Selection: `selectionStore` (never URL hash directly — `hashSync` mediates).
- Filters: `filtersStore` per-tab.

### URL hash schema

```
#region=eu&project=acme_widget-service&branch=main&tab=issues&sev=BLOCKER,CRITICAL&type=BUG,VULNERABILITY
```

`hashSync` serializes selection + filters + tab into the hash and parses it back on load.

### Branded types

`ProjectKey`, `IssueKey`, `RuleKey`, `OrgKey` are branded strings. Prevents passing a project key where an issue key is expected.

### Strictness

- TypeScript `strict: true`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- ESLint blocks `any`, `as any`, and `// @ts-ignore`.
- Zod parses every API response — no implicit trust of upstream shapes.

### Logging

The `logger.ts` module is the only place that may call `console.*`. It scrubs:
- `Authorization: Bearer ...` headers
- Any field literally named `token`, `apiKey`, `secret`, `password`
- Any string > 32 chars matching a token-like pattern

CI grep blocks any direct `console.*` calls in `src/` outside `lib/logger.ts`.

### No third-party scripts

The built bundle is grep'd in CI for any `<script src="http`, `<link href="http`, or external import URL. Build fails if any are found.

---

## 6. Test Strategy

### Pyramid

```
            ┌───────────┐
            │  e2e      │  ~10 tests, Playwright + MSW
            │  (slow)   │
            ├───────────┤
            │ integration│ ~30 tests, Testing Library + MSW
            │           │
            ├───────────┤
            │   unit    │  Hundreds, Vitest, no DOM unless needed
            │   (fast)  │
            └───────────┘
```

### Unit tests

- Every `lib/` function: pure-function tests with golden inputs/outputs.
- Every store: state-transition tests.
- Every primitive: render + interaction tests.
- API client: each method against MSW; happy path + every error variant.
- Proxy core: pure-function test with mocked `fetch`.

### Integration tests

- Each feature folder: render the feature, drive it with user events, assert against MSW responses.
- Token sanitization: paste a string with zero-width chars; verify request is sent with cleaned header.
- URL hash sync: mutate state; assert hash; reload; assert state restored.

### E2E tests

- Cold start → token entry → org/project selection → see issues → filter → export to clipboard.
- Token rejected flow.
- Theme switch persists across reload.
- Settings drawer "Forget everything" clears state.

### MSW handlers

`tests/fixtures/` holds JSON files captured from real SonarCloud responses (with sensitive data scrubbed). MSW handlers in `tests/msw.ts` match request URLs and respond with these fixtures, varying by query params (e.g. different filter combinations return different subsets).

### Coverage targets

- Lines / branches: ≥ 85% for `lib/`, `api/`, `stores/`, `proxy/`.
- Lines: ≥ 70% for `features/`.
- 100% required: `lib/sanitize.ts`, `lib/logger.ts`, `proxy/core.ts`.

---

## 7. Architecture Decision Records

Each ADR is a short, dated, immutable record of a decision and its alternatives. Once accepted, an ADR is not edited — it is superseded by a later ADR if the decision changes.

ADRs live in `docs/adr/NNNN-title.md`. Summaries below.

### ADR-001 — Static SPA + thin proxy

**Status:** Accepted • **Date:** 2026-05-06

**Context.** SonarCloud's V1 web API does not support browser CORS by design. V2 does support CORS but is hardcoded to allow only `https://sonarcloud.io`. A pure-static SPA cannot call SonarCloud directly. Validated empirically by `cors-spike/`.

**Decision.** Ship Sift as a static SPA fronted by a stateless edge function proxy. The proxy is in the same repo, open-source, vendor-neutral, and forkable.

**Consequences.** Adds a runtime component, but it is small, stateless, and easy to host. Trust model shifts from "no server" to "stateless server, source-visible." Token still never persists server-side.

**Rejected alternatives.**

- *Browser extension.* Bypasses CORS but adds per-browser packaging and install friction.
- *Local desktop app (Tauri/Electron).* Heavyweight; deviates from "open it in a browser" UX.
- *Proxy via a public CORS proxy service.* Insecure — would route tokens through a third party.

### ADR-002 — Target SonarCloud Web API V1 exclusively for v1

**Status:** Accepted • **Date:** 2026-05-06

**Context.** SonarCloud has two APIs in active use: V1 (`sonarcloud.io/api/*`) and V2 (`api.sonarcloud.io/*`). V2 is a redesign with cleaner REST semantics but is incomplete (no issues, no hotspots) and has community-reported auth quirks as recent as January 2026.

**Decision.** Sift v1.0 uses V1 exclusively. The proxy supports both `/v1/` and `/v2/` paths so future migration is a code change, not an infra change.

**Consequences.** Codebase has one schema to deal with. V2 migration is a v1.x roadmap item, endpoint by endpoint, as V2 stabilizes and reaches feature parity.

### ADR-003 — Vercel Edge Functions canonical, Cloudflare Workers documented

**Status:** Accepted • **Date:** 2026-05-06

**Context.** The proxy can run on multiple platforms. Choosing one as canonical reduces decision fatigue for new contributors; supporting alternatives reduces lock-in.

**Decision.** Vercel Edge Functions is the canonical deploy target — best DX (one repo, one deploy command, automatic preview deploys per PR). Cloudflare Workers is documented as an equally-supported alternative via `proxy/adapters/cloudflare.ts`.

The proxy core is vendor-neutral: it imports nothing from any platform's SDK, accepts a Web Standard `Request`, and returns a Web Standard `Response`. The adapters are ~10 lines each.

**Consequences.** Some users will prefer Cloudflare for its larger free tier and faster cold starts. Both paths are first-class.

### ADR-004 — One-page UI, no router

**Status:** Accepted • **Date:** 2026-05-06

**Context.** The original spec had a multi-screen flow (token entry → org picker → project list → issues view, etc.). A simpler one-page layout with everything visible reduces both implementation complexity and user cognitive load.

**Decision.** Sift is a one-page app. No router library. Header (token + region + pickers + actions) at the top; tabbed content area below; Settings is a drawer; Export is a modal. URL hash carries selection, filters, and active tab.

**Consequences.** Drops React Router from the stack. Drops the cold-start "wizard" feel. Simpler state, simpler tests, smaller bundle. The page must gracefully render in degraded states (no token, token rejected, etc.) instead of routing them to dedicated screens.

### ADR-005 — Token sanitization at the input boundary

**Status:** Accepted • **Date:** 2026-05-06

**Context.** During the CORS spike, pasting a token from common sources (web pages, terminal output) introduced invisible Unicode characters (zero-width space, NBSP, smart quotes, BOM) that caused the Fetch API to throw `TypeError: String contains non ISO-8859-1 code point` *before* the request even left the browser. The error message did not reveal this; we diagnosed it by inspection.

**Decision.** Tokens are sanitized at the input boundary — `sanitize.cleanToken(raw)` strips any character outside printable ASCII (`U+0021` to `U+007E`). The UI shows a live indicator below the token field that reports character count and flags any chars that would be stripped, so users know if their paste was clean.

**Consequences.** Prevents an obscure failure mode that affects real users. Side benefit: surfaces evidence of malformed pastes early. Guarantees that any token that makes it into a request header is byte-safe.

### ADR-006 — Bearer auth only

**Status:** Accepted • **Date:** 2026-05-06

**Context.** Earlier drafts of the spec mentioned an HTTP Basic Auth fallback (token-as-username). SonarSource's official documentation specifies Bearer auth as the recommended scheme; Basic is not in the official docs.

**Decision.** Sift uses `Authorization: Bearer <token>` exclusively. Tokens that are validly accepted by SonarCloud (legacy hex, `squ_…`, `sqp_…`) all work transparently with Bearer.

**Consequences.** Simpler client code; one auth path. If a future SonarCloud change required a different scheme, that's a single ADR away.

### ADR-007 — Over-cap handling: surface in client, not proxy

**Status:** Accepted • **Date:** 2026-05-06 • **Closes:** Q-1

**Context.** SonarCloud's `/api/issues/search` enforces a hard ceiling of 10,000 total results (`p * ps ≤ 10000`). Sift needs to handle filters that would exceed this. Two paths considered:

- *Proxy-side detection.* The proxy inspects the response and synthesizes a richer error variant when the cap is hit.
- *Client-side detection.* The proxy passes the response through unchanged. The API client compares `paging.total` to the cap and emits a `Result.kind === 'over_cap'` variant. The UI handles presentation.

**Decision.** Client-side detection. The proxy stays vendor-neutral and stateless (no business logic about SonarCloud's quirks). The API client owns the over-cap detection because it owns the result-type schema. The UI presentation — banner + actionable narrowing chips computed from the current result distribution + first page of results still rendered below — lives in the Issues feature.

**Consequences.**

- Proxy code stays minimal (no SonarCloud-specific knowledge beyond URL routing).
- The `over_cap` variant in `Result<Page<Issue>>` is the single integration point — UI, tests, and the export modal all check the same variant.
- The narrowing-chip suggestions are computed client-side from the visible page's distribution (most common file path prefix, oldest creation date, lowest severity present); this is a heuristic, not a SonarCloud feature.
- The export modal must check this variant before enabling the action buttons. Captured in the export feature's tests in Phase 10.

---

## 8. Open Architectural Questions

Decisions that are *not yet* made and must be resolved before the affected implementation phase begins.

> **Recently resolved:** Q-1 (over-cap handling) — see ADR-007.

### Q-2: Caching strategy for the proxy

Currently planned: no caching. Every request hits SonarCloud. For projects with thousands of issues this means refetching on every filter change. Options:

- Cache by (token, URL) for 30 seconds at the proxy edge.
- Defer caching entirely to TanStack Query in the SPA.
- Conditional GET via `If-Modified-Since` if SonarCloud returns `Last-Modified`.

**Resolution required by:** Phase 2 (Proxy).

### Q-3: Bundle splitting threshold

The 250KB gzipped main-bundle budget is an aspiration. If features push over that, split candidates: Markdown templates, the QG measures grid, the column chooser. Need a triggered review when bundle hits 200KB.

**Resolution required by:** Phase 11 (Polish).

### Q-4: Whether to support tabs other than `main` for branches that were re-created

Edge case: a branch named `release/2024.q4` may have a stale entry. Behavior on selection of a deleted branch is undefined.

**Resolution required by:** Phase 7 (Pickers).

---

## 9. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1 | 2026-05-06 | initial | Created from SPEC.md v0.2; ADRs 001–006 captured |
| 0.2 | 2026-05-06 | design-feedback | ADR-007 added (closes Q-1, over-cap handling); design-mock review lifted decisions on cold-start guide, export modal previews, and over-cap UX into SPEC.md §7.1, §7.4, §9 |

When this document is updated, append a row here. Major restructures should also bump the version number visible at the top.

---

*End of architecture, v0.1. Decisions: see §7. Open questions: see §8. Companion documents: `SPEC.md` (product spec) and `IMPLEMENTATION.md` (phased TDD plan).*
