# Sift — SonarCloud Findings Dashboard

> A one-page browser dashboard for SonarCloud that gives developers a fast, filterable, exportable view of issues, security hotspots, and quality-gate status across their projects and branches. Designed for offline triage and LLM-assisted remediation planning.

**Working title:** *Sift* (placeholder — see [§17 Naming](#17-naming))
**Status:** Pre-implementation spec, v0.4
**License:** MIT
**Architecture:** Static one-page SPA + thin proxy (Vercel Edge Function canonical, Cloudflare Workers alternative)
**Companion documents:**
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — modular architecture, interfaces, decision log (living)
- [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) — phased TDD plan for Claude Code

---

## Table of Contents

1. [Overview](#1-overview)
2. [Problem & Motivation](#2-problem--motivation)
3. [Users, Use Cases, Goals](#3-users-use-cases-goals)
4. [Scope & Non-Goals](#4-scope--non-goals)
5. [Architecture Summary](#5-architecture-summary)
6. [SonarCloud API Integration](#6-sonarcloud-api-integration)
7. [Feature Specification](#7-feature-specification)
8. [Data Model](#8-data-model)
9. [UX Flow](#9-ux-flow)
10. [Tech Stack](#10-tech-stack)
11. [Repository Structure](#11-repository-structure)
12. [OSS Scaffolding](#12-oss-scaffolding)
13. [Security Considerations](#13-security-considerations)
14. [Risks & Open Questions](#14-risks--open-questions)
15. [Roadmap](#15-roadmap)
16. [Design Brief for Claude](#16-design-brief-for-claude)
17. [Naming](#17-naming)
18. [Glossary](#18-glossary)

---

## 1. Overview

Sift is a **one-page web application**. The user lands on a single URL, pastes a SonarCloud user token, picks a project and branch, and immediately sees their findings — issues, hotspots, and quality-gate status — with one-click export to Markdown or CSV.

There are no multiple screens, no routes, no page transitions. Token entry, project selection, results, settings, and export all live on the same page. Settings and export are overlays (drawer and modal). State is reflected in the URL hash so a filtered view is shareable.

The application is a static SPA hosted on a CDN. The only server-side component is a thin stateless proxy (~50 lines of vendor-neutral code) that forwards browser requests to SonarCloud, since SonarCloud's API does not allow direct browser access (CORS-locked to SonarCloud's own UI).

The exports are designed to be pasted into LLM tools (Claude, ChatGPT, Cursor, Copilot Chat) so users can ask the model to produce remediation plans, group findings by root cause, or generate IDE-ready fix prompts.

---

## 2. Problem & Motivation

SonarCloud is excellent at *finding* issues but deliberately discourages *exporting* them. The product flow nudges users to fix issues in their IDE via SonarLint or pull-request decoration, which works well when the workflow is: see one issue → fix one issue.

That flow breaks down for several common workflows:

- **Backlog triage.** A tech lead inheriting a project with thousands of findings needs to slice, group, and prioritize before assigning work.
- **LLM-assisted remediation.** Modern developers ask LLMs to produce fix plans, group findings by root cause, or generate per-file remediation prompts. This requires a clean, structured export.
- **Reporting & compliance.** Sharing a snapshot of current findings with stakeholders, attaching it to a sprint plan, or archiving it for an audit all require an export format.
- **Cross-project analysis.** Comparing findings across branches or projects is awkward in the SonarCloud UI but trivial against a CSV.

A community tool that fills this gap — without ever persisting the user's token on a server — is genuinely useful and aligns with SonarCloud's open API surface.

---

## 3. Users, Use Cases, Goals

### Primary users

- **Individual developers** triaging their own findings or feeding them to an LLM for fix suggestions.
- **Tech leads / staff engineers** planning remediation work across a team or sprint.
- **Security engineers** reviewing hotspots and vulnerability findings as a batch.

### Primary use cases (v1)

1. *"Show me all blocker and critical issues on `main` of project X, sorted by file."*
2. *"Export the top 200 issues by severity as Markdown so I can paste them into Claude."*
3. *"Give me a CSV of every unresolved hotspot across the `release/2026.q2` branch."*
4. *"Show me the current quality-gate status and which conditions are failing."*

### Goals

- **Zero-trust by default.** Token never persists on a server; proxy is stateless.
- **Fast triage.** Sub-second filter / sort on a 5,000-row dataset on a typical laptop.
- **Export quality.** Markdown and CSV that work without post-processing for both humans and LLMs.
- **One-page simplicity.** No app to "navigate" — everything is in view, everything is one paste away.
- **Low contributor friction.** Standard React + TypeScript + Tailwind stack, hot-reload, deployable from a single command.

### Non-goals

- Editing or resolving findings (read-only).
- SonarQube Server (self-hosted) support — Cloud only in v1.
- Multi-user / team / RBAC features.
- Persistent server-side history or trend analysis.
- LLM API integration inside the app (export only).

---

## 4. Scope & Non-Goals

### In scope for v1

| Capability | Detail |
|---|---|
| Token-based authentication | User pastes a token; sanitized; stored locally per user choice |
| Region selection | EU (`sonarcloud.io`) or US (`sonarqube.us`) |
| Organization & project listing | Discover orgs the token can access; list projects per org |
| Branch selection | List branches per project; default to main |
| Issues view | All issues with filter, sort, pagination |
| Hotspots view | Security hotspots with status filter |
| Quality Gate view | Current QG status, conditions, key measures |
| Export to Markdown | Per-view; multiple template variants; respects current filter/sort |
| Export to CSV | Per-view; RFC 4180-compliant; spreadsheet-friendly |
| Token & state persistence | Optional, opt-in; user can clear at any time |
| Dark / light theme | System default with manual override |

### Explicit non-goals

- Writing data back to SonarCloud (resolving issues, adding comments).
- Calling LLM APIs from the app.
- Tracking findings over time (no diffing between snapshots).
- SonarQube Server support.
- User accounts, sharing, or collaboration features.

---

## 5. Architecture Summary

> **Authoritative reference: [`ARCHITECTURE.md`](./ARCHITECTURE.md).** The architecture document is the source of truth for module boundaries, interfaces, and decisions. This section is a high-level summary only.

### Shape

```
┌────────────────┐    ┌────────────────────┐    ┌─────────────────┐
│  Static host   │    │  User's browser    │    │  SonarCloud API │
│  (Vercel /     │ ─► │  (React SPA, one   │ ─► │  V1 endpoints   │
│  Cloudflare)   │    │   page)            │    │                 │
│                │    │                    │ ◄─ │                 │
└────────────────┘    └────────────────────┘    └─────────────────┘
        │                      │
        │  /api/sonar/*  ┌─────┴─────┐
        └─────────────► │ Edge proxy │
                        │ (stateless)│
                        └────────────┘
```

### Key decisions (each captured as an ADR in `ARCHITECTURE.md`)

- **ADR-001 — Static SPA + thin proxy.** Pure-static was killed by SonarCloud's CORS posture (V1: no CORS; V2: CORS allow-listed only to `sonarcloud.io` itself). A vendor-neutral proxy function is required. Validated by `cors-spike/`.
- **ADR-002 — Target Web API V1 exclusively for v1.** V1 has full coverage; V2 is incomplete (no issues/hotspots) and has reported auth quirks. The proxy supports both `/v1/` and `/v2/` paths for future migration.
- **ADR-003 — Vercel Edge Functions canonical, Cloudflare Workers documented.** Best contributor DX with one-command deploy; vendor-neutral proxy code so users can pick either platform.
- **ADR-004 — One-page UI.** No router, no multi-screen flows. Single page with tabs and overlays. Drops React Router from the stack.
- **ADR-005 — Token sanitization at input boundary.** Strip non-printable-ASCII characters from token input to prevent the `non ISO-8859-1` Fetch API error caused by zero-width characters in pasted tokens.
- **ADR-006 — Bearer auth only.** Drop the Basic Auth fallback (not in the official docs).

### Trust model

The user's token traverses the proxy on every request. The proxy is stateless (no logging, no caching, no persistence), open-source in the same repo, and forkable in five minutes for users who don't trust the canonical hosted instance. CI grep ensures the proxy code never logs request headers or bodies.

---

## 6. SonarCloud API Integration

> **Validate at build time.** Endpoint paths and response shapes have been confirmed against SonarSource's official documentation as of late 2025 / early 2026 and against live API responses captured during the CORS spike. Re-verify on first use.

### Hosts

| Region | V1 base | V2 base |
|---|---|---|
| EU (default) | `https://sonarcloud.io/api` | `https://api.sonarcloud.io` |
| US | `https://sonarqube.us/api` | `https://api.sonarqube.us` |

The proxy routes `/api/sonar/v1/{path}` and `/api/sonar/v2/{path}` to the corresponding upstream, with the active region selected by the user (default EU). Full endpoint mapping is in `ARCHITECTURE.md`.

### Authentication

`Authorization: Bearer <token>` only. The token is provided by the user; both legacy hex tokens and `squ_…` / `sqp_…` prefixed tokens are accepted by SonarCloud and will work transparently.

### Endpoints used (V1)

| Purpose | Endpoint | Notes |
|---|---|---|
| List orgs accessible to token | `GET /api/organizations/search?member=true` | Paginated |
| List projects in org | `GET /api/projects/search?organization={org}` | Paginated, page size up to 500 |
| List branches | `GET /api/project_branches/list?project={key}` | Returns branches + main flag |
| Search issues | `GET /api/issues/search` | **10,000-result hard cap** |
| Search hotspots | `GET /api/hotspots/search` | Separate endpoint, separate filters |
| Quality gate status | `GET /api/qualitygates/project_status?projectKey={key}&branch={br}` | Current snapshot |
| Component measures | `GET /api/measures/component?component={key}&branch={br}&metricKeys=...` | Bulk metrics |

### Pagination cap

SonarCloud's `/api/issues/search` enforces a hard ceiling of **10,000 total results** (`p * ps ≤ 10000`). When the user's filter would exceed this, the app surfaces a clear UI warning suggesting how to narrow the filter (severity, file path prefix, rule). Silent chunking is not attempted — it would produce inconsistent exports.

### Rate limits

SonarCloud applies per-token rate limits but doesn't publish exact thresholds. The client uses TanStack Query's deduplication and caching to minimize calls; 429 responses surface in the UI with a retry-after hint.

### Error handling

| Status | Meaning | UI behavior |
|---|---|---|
| 401 | Bad / expired token | Token row turns red; clear stored token |
| 403 | Token lacks permission | Inline error on the affected section |
| 404 | Resource not found | Inline error; offer to refresh |
| 429 | Rate limited | Toast with retry-after countdown |
| 5xx | SonarCloud outage | Banner with link to status page |
| Network / CORS | Proxy unreachable | Diagnostic banner |

---

## 7. Feature Specification

The entire app is one page, organized into **header**, **content area**, and **overlays**.

### Header (always visible at top)

A compact strip containing, left-to-right:

1. App name / logo
2. Region selector (EU / US dropdown)
3. Token field (password-masked) with live validation status badge
4. Organization picker (auto-selected if only one)
5. Project picker (search-as-you-type combobox)
6. Branch picker (defaults to main)
7. Settings gear icon (opens drawer)
8. Export button (opens modal)

Token, region, org, project, and branch selection state lives in the URL hash so a configured view is shareable.

### Content area (the body of the page)

Three tabs: **Issues** | **Hotspots** | **Quality Gate**. Default is Issues. The selected tab is reflected in the URL hash. Each tab is described below.

#### 7.1 Issues tab

Layout: collapsible filter sidebar (left, ~280px) + results table (right). Sidebar is collapsible to maximize table real estate.

**Filters** (each multi-select unless noted):

- Severity (Blocker / Critical / Major / Minor / Info)
- Type (Bug / Vulnerability / Code Smell)
- Status (Open / Confirmed / Resolved / Reopened / Closed)
- Resolution (Fixed / False-positive / Won't-fix / Removed)
- Tag (type-ahead)
- Rule (type-ahead)
- Assignee (type-ahead)
- File path prefix (text)
- Created date (range)
- Updated date (range)
- Has-comments (boolean)

Filter changes apply on selection (no Apply button); count next to each option updates from the current result set.

**Table columns** (default; all toggleable in column-chooser):

| Column | Source | Notes |
|---|---|---|
| Severity | `severity` | Colored badge |
| Type | `type` | Bug / Vuln / Smell |
| Status | `status` | Open / Confirmed / etc |
| Rule | `rule` | Hyperlinked to rule docs |
| Message | `message` | Truncated, hover-expand |
| File | `component` | Path relative to project |
| Line | `line` | Numeric |
| Effort | `effort` | e.g. `30min`, `2h` |
| Tags | `tags` | Chips |
| Created | `creationDate` | Relative time, hover-absolute |

Row interaction: click expands an inline drawer with rule description, code snippet (if `textRange`/`flows` present), and a "Copy as Markdown" affordance for that single finding.

Sort: any column header. Default sort: severity desc, then type, then file path. Multi-column sort via shift-click.

**Over-cap behavior.** When the active filter would yield more than 10,000 findings (SonarCloud's hard pagination ceiling), Sift surfaces a warning banner above the table containing:

1. The actual estimated total (e.g. "Your filter would return ~14,200 findings").
2. A statement of the cap and why Sift won't silently chunk: "SonarCloud caps results at 10,000. Sift won't silently chunk results because the export wouldn't be consistent. Narrow the filter to continue."
3. Three actionable narrowing chips computed from the current result distribution (e.g. `+ severity ≥ Major`, `+ file path: src/services/`, `+ created ≥ 90 days ago`). Clicking a chip applies the additional filter constraint to the existing filter set.

The first page of results renders below the banner so users can begin scanning while deciding how to narrow. Export is gated until the filter yields ≤ 10,000 (the export modal shows the same banner instead of the action buttons).

#### 7.2 Hotspots tab

Same skeleton as Issues, but with hotspot-specific columns: Security Category, Vulnerability Probability (High / Medium / Low), Status (To Review / Reviewed). Filters narrowed to hotspot-relevant ones.

#### 7.3 Quality Gate tab

A simple, scannable view:

- **Top:** large status pill (Passed / Failed / Warning).
- **Middle:** conditions list (metric, comparator, threshold, actual, pass/fail).
- **Bottom:** key measures grid (coverage, duplication, ncloc, technical debt, complexity, security rating, reliability rating).

Export here produces a Markdown snapshot of the QG.

### Overlays

#### 7.4 Export modal

Triggered by the Export button in the header. Modal contents:

1. **Header:** Title ("Export findings") plus a breadcrumb subtitle showing context — `{project key} · {branch} · {tab} · {filtered count} findings` — so users confirm they're exporting the right slice without having to close the modal.
2. **Format:** Markdown / CSV (segmented control).
3. **Template** (Markdown only) — radio cards (2×2 grid for Issues and Hotspots; single non-interactive label for Quality Gate). Each card contains the option name and a one-line description. Template list is determined by the active tab:

   ##### Issues templates

   - **Triage list** — flat numbered list, severity-prefixed. *Preview shows:* `1. BLOCKER · payment.ts:142 · S6571…`
   - **Grouped by file** — H2 per file, bullets per finding. *Preview shows:* `## src/services/payment.ts` followed by indented bullets.
   - **Grouped by rule** — H2 per rule with description, bullets per occurrence. *Preview shows:* `## typescript:S6571 / Cognitive Complexity…` with occurrences.
   - **LLM remediation prompt** — templated instruction prepended, structured findings list following. *Preview shows:* `You are a code-quality assistant…` followed by `### Findings`.

   ##### Hotspots templates

   - **Triage list** — flat numbered list, vulnerability-probability-prefixed. *Preview shows:* `1. HIGH · src/auth/legacy.java:47 · S2068…`
   - **Grouped by file** — H2 per file, bullets per hotspot.
   - **Grouped by security category** — H2 per category (Auth, SQL Injection, Weak Cryptography, etc.), bullets per occurrence. This is the hotspot analogue of "grouped by rule" because security category is the more useful grouping dimension for security review.
   - **LLM security review** — security-engineer persona; requests judgment-call recommendations (Change required / Acceptable as-is / Needs more context) per hotspot, distinct from the issues LLM remediation prompt.

   ##### Quality Gate template

   - **Snapshot** — single Markdown document: H1 with status (`# Quality Gate: PASSED`), a Conditions table (Metric, Comparator, Threshold, Actual, Status), and a Measures table (Metric, Value, Best value flag). For the Quality Gate tab the template selector collapses to a single non-interactive label rather than a radio grid.

   ##### CSV schemas per tab

   - **Issues** — unchanged: Key, Severity, Type, Rule, Status, Resolution, Component, Line, Message, Effort, Tags, Assignee, CreationDate, UpdateDate.
   - **Hotspots** — columns: Probability, Status, Category, Rule, Message, File, Line, Created.
   - **Quality Gate** — one combined CSV with a `Section` column (`"condition"` or `"measure"`) distinguishing row types. Columns: Section, Metric, Comparator, Threshold, Actual, Value, Best, Status. Comparator/Threshold/Actual/Status are populated for condition rows; Value/Best for measure rows.

4. **Field selector** — toggle chips for each available column (Severity, Type, Status, Rule, Message, File, Line, Effort, Tags, Created, Assignee). Defaults match the table column chooser.
5. **Scope:** radio group — Visible (current filter and sort, currently shown rows) / All in current filter / All in project (subject to 10k cap; same banner appears here as in §7.1 if exceeded).
6. **Limit:** default 200, hard max 1000 (LLM context-window-friendly).
7. **Footer left:** size estimate of the export in KB plus a one-line summary of what the header block will contain (e.g. "~12 KB · header includes filters, project, branch, timestamp"). The estimate tells users at a glance whether the result will fit in a typical LLM context window before they commit.
8. **Footer right:** Cancel / Download (secondary) / Copy to clipboard (primary).

Markdown header block at the top of every export contains: project key, branch, generation timestamp, total findings, applied filters.

CSV is RFC 4180-compliant with UTF-8 BOM (Excel-friendly), default filename `sift-{projectKey}-{branch}-{view}-{ISO-date}.csv`.

#### 7.5 Settings drawer

Slides in from the right when the gear icon is clicked. Contents:

- Token storage mode (localStorage / sessionStorage / cookie / memory)
- Theme (system / light / dark)
- Default page size
- Default Markdown export template
- "Forget everything" button — clears token and all persisted state

---

## 8. Data Model

> Full TypeScript type definitions live in `ARCHITECTURE.md` §3 and in `src/types/sonar.ts`.

Summary of the core entities (V1 shapes):

- **Organization** — `key`, `name`, `subscription`, ALM info, current-user `actions`
- **Project** — `key`, `name`, `qualifier`, `lastAnalysisDate`, `qualityGate`
- **Branch** — `name`, `isMain`, `type`, `analysisDate`, `status`
- **Issue** — `key`, `rule`, `severity`, `type`, `status`, `resolution`, `component`, `line`, `message`, `effort`, `tags`, dates
- **Hotspot** — `key`, `component`, `securityCategory`, `vulnerabilityProbability`, `status`, `resolution`, `line`, `message`
- **QualityGate** — `projectStatus.{status, conditions[]}` where each condition has `metricKey`, `comparator`, `errorThreshold`, `actualValue`, `status`
- **Measure** — `metric`, `value`, `bestValue?`, `period?`

---

## 9. UX Flow

The app has effectively one flow with several entry conditions.

### Cold start (no token)

1. User loads the app. Token field is empty and pulses subtly. Region, org, project, branch pickers are disabled with placeholder labels visible (REGION / ORG / PROJECT / BRANCH).
2. Tab area shows a structured "Paste a token to begin" empty state. The empty state is not generic; it actively helps a first-time user get connected:
   - Headline: "Paste a token to begin"
   - One-line context: explains that Sift uses a SonarCloud user token, that the token never leaves the browser except via the stateless proxy.
   - **Three-step guide** (numbered cards):
     1. Open `sonarcloud.io/account/security`
     2. Generate a User Token with no expiration
     3. Paste it into the token field above
   - Closing reassurance: "Sift never persists your token on a server." with a link to the threat model in `SECURITY.md`.
3. User pastes token; live status indicator confirms format (no invisible characters); validation request fires.
4. On success: org list populates, first org auto-selected, project list populates.
5. User picks project; branches populate, main auto-selected.
6. Issues tab fetches and renders.

### Returning user (token persisted)

1. App loads.
2. Hash-restored region/project/branch is applied; token is read from storage.
3. Silent validation call (`/api/organizations/search?member=true&ps=1`) runs.
4. On success: previous view is restored.
5. On 401: token field is **cleared** (security best practice — never display credentials known to be invalid), border turns red with a `rejected` badge in the field, placeholder changes to "paste a fresh token to reconnect…". A banner below the header explains the failure with the specific status code, reassures that filter and view state are preserved, and links to a fresh token-generation page. The cold-start three-step guide is shown in the tab area below the banner so the user has a single recovery path.

### Filter-and-export

1. User adjusts filter sidebar; result count updates live (debounced 200ms).
2. User clicks Export.
3. Modal pre-selects the current view's filters and sort.
4. User picks format and template, confirms.
5. Click "Copy" → toast: "Copied 247 findings to clipboard."

### Error flows

| Trigger | Behavior |
|---|---|
| Token rejected mid-session | Token row red; preserve hash for restore |
| Proxy unreachable | Banner with diagnostic guidance |
| > 10,000 findings | Inline warning above table with suggested filters |
| Empty result | Friendly empty state, not generic "no data" |

---

## 10. Tech Stack

> Full rationale in `ARCHITECTURE.md` §4.

| Concern | Choice |
|---|---|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite |
| Styling | Tailwind CSS v3 |
| Component primitives | Custom + Radix UI (unstyled) |
| Server state | TanStack Query v5 |
| UI state | Zustand |
| Routing | **None** (one-pager; URL hash for state) |
| Tables | TanStack Table v8 + TanStack Virtual |
| Date handling | date-fns |
| CSV | Papa Parse |
| Markdown | Hand-rolled template strings |
| Validation | Zod |
| Testing | Vitest + Testing Library + Playwright |
| Mocking | MSW (Mock Service Worker) |
| Linting | ESLint (typescript-eslint, react-hooks, jsx-a11y) |
| Formatting | Prettier |
| Pre-commit | Husky + lint-staged |
| Package manager | pnpm |
| Node | 20 LTS |
| Proxy host | Vercel Edge Functions (canonical) — Cloudflare Workers adapter documented |

---

## 11. Repository Structure

```
sift/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── e2e.yml
│   │   ├── release.yml
│   │   └── codeql.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml
├── api/                        # Vercel Edge Function (the proxy)
│   └── sonar/
│       └── [...path].ts
├── docs/
│   ├── ARCHITECTURE.md         # Modular architecture (LIVING)
│   ├── IMPLEMENTATION.md       # Phased TDD plan for Claude Code
│   ├── adr/                    # Architecture Decision Records
│   ├── api-integration.md
│   ├── design-system.md
│   ├── security.md
│   ├── deploy-cloudflare.md    # Adapter for the alternative host
│   └── screenshots/
├── proxy/
│   ├── core.ts                 # Vendor-neutral proxy logic
│   ├── core.test.ts
│   └── adapters/
│       ├── vercel.ts
│       └── cloudflare.ts
├── src/
│   ├── api/                    # SonarClient
│   ├── components/
│   │   └── primitives/         # Button, Badge, etc.
│   ├── features/               # Vertical slices: auth, picker, issues, hotspots, qg, export, settings
│   ├── lib/                    # csv, markdown, sanitize, formatters, logger
│   ├── stores/                 # Zustand stores
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/               # Recorded SonarCloud responses for tests
├── public/
├── .nvmrc
├── .editorconfig
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── package.json
├── pnpm-lock.yaml
├── LICENSE
├── README.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── CHANGELOG.md
└── SPEC.md                     # this document
```

---

## 12. OSS Scaffolding

### License

MIT.

### README

Tagline + animated demo, live demo link, privacy callout (token never persists; proxy is stateless), quick-start, self-host, feature list, screenshots, FAQ, contributing link, license. No marketing fluff.

### CONTRIBUTING

Local setup, test commands, conventions (link to ESLint config, don't duplicate prose), Conventional Commits, trunk-based + squash-merge, PR checklist, large-feature discussion-first.

### CODE_OF_CONDUCT

Contributor Covenant v2.1, unmodified.

### SECURITY

The most important non-code file in this project. Threat model; token handling (where it's stored, how it's cleared); no-telemetry guarantee; vulnerability reporting (email + GPG, 7-day triage); dependency policy.

### Issue & PR templates

Bug, Feature, Question (→ Discussions). PR template with linked issue, summary, screenshots, test plan, accessibility checklist.

### CI

- `ci.yml` — lint, typecheck, unit tests, build, bundle-size budget (250KB gzipped main)
- `e2e.yml` — Playwright against built app with MSW
- `release.yml` — tag → build → deploy → changelog
- `codeql.yml` — weekly static analysis

### Branch protection

PR-only, CI passing, linear history, 1 review (relax to 0 in solo phase), no force pushes.

### Releases

SemVer; Conventional Commits drive automated changelog. Pre-1.0 may break in minors with explicit notes.

### 12.1 Licensing Details

This subsection captures the licensing-adjacent decisions that "MIT" alone doesn't answer. None are blockers; all are easier to settle now than retrofit once the project has external contributors.

#### Copyright holder

The `LICENSE` file's copyright line reads:

```
Copyright (c) 2026 Sift Contributors
```

The collective form (`<Project> Contributors`) is conventional for projects expecting community contributions and avoids re-issuing the LICENSE every time a new committer joins. A solo maintainer using their own legal name is equally valid. Replace `Sift` with the final project name when chosen.

#### Inbound = outbound

Contributions to this project are licensed under MIT — the same license as the project itself. This is GitHub's default per their Terms of Service §D.6 and is restated explicitly in `CONTRIBUTING.md` so contributors whose employers ask have a clear answer. No separate Contributor License Agreement is required.

#### Sign-off and contributor agreements

For v1.0: neither DCO sign-off nor a CLA is required. Inbound = outbound is sufficient at this scale.

If the contributor base grows beyond a handful of maintainers, switching to DCO is a low-cost upgrade — add a CI check that rejects commits missing `Signed-off-by:` and update `CONTRIBUTING.md` to ask contributors to use `git commit -s`. Captured as a roadmap consideration in §15.

#### Dependency license policy

Every package in the **production** dependency tree must be licensed under one of:

- `MIT`, `MIT-0`
- `Apache-2.0`
- `BSD-2-Clause`, `BSD-3-Clause`, `0BSD`
- `ISC`
- `MPL-2.0`
- `Unlicense`, `CC0-1.0`

GPL- and AGPL-licensed packages are forbidden because they would impose copyleft on Sift itself, breaking the MIT promise to downstream consumers. Anything outside the allow-list (commercial-only, custom, ambiguous) requires a one-off review and an entry in `docs/adr/`.

CI runs a license check on production dependencies and fails on any disallowed identifier. Dev dependencies are not gated — they don't ship in the bundle. Recommended tool: `license-checker` (`pnpm dlx license-checker --production --onlyAllow="MIT;MIT-0;Apache-2.0;BSD-2-Clause;BSD-3-Clause;0BSD;ISC;MPL-2.0;Unlicense;CC0-1.0"`).

#### SPDX header in source files

Every `.ts` and `.tsx` file in `src/`, `proxy/`, and `tests/` begins with:

```
// SPDX-License-Identifier: MIT
```

This is the standard SPDX short-form identifier. It is parsed by automated license scanners (the kind enterprise consumers run before adopting OSS dependencies) and removes ambiguity at the file level. Enforced via an ESLint header-check rule.

#### Trademark posture

The MIT license covers source code; it does not cover the project name or any logo. A short `TRADEMARK.md` at the repo root states the position:

- Forks may use the source code freely, in line with MIT.
- Forks distributed publicly should rename so users aren't confused about which project they're getting.
- Use of the name or logo in a way that implies endorsement requires written permission.

This is intentionally lightweight — full corporate trademark policies (Mozilla, HashiCorp) are overkill for a small project. Revisit if the project gains traction beyond a small community.

#### Security disclosure scope

`SECURITY.md` (not the license) governs vulnerability reporting. The license disclaims warranty; `SECURITY.md` adds:

- Coordinated disclosure preferred: 7-day acknowledgement target, fix-or-mitigation plan before public disclosure.
- Reporters retain the right to publish after the disclosure window regardless of fix status.
- No bug bounty (this is an unfunded community project).

---

## 13. Security Considerations

### Threat model

**In scope:**

- Casual leakage of tokens via console logs, error reports, screenshots
- Malicious dependencies attempting to exfiltrate tokens
- XSS via injected issue messages or rule descriptions
- Clipboard sniffing
- Proxy abuse (rate limit / replay)

**Out of scope (acknowledged, not mitigated):**

- Compromised user device
- Browser extensions with broad permissions
- Network MITM (HTTPS-only assumed)

### Specific mitigations

1. **Token redaction in logs.** A `logger.ts` wrapper scrubs Authorization headers and any field named `token`. Unit-tested.
2. **Token sanitization at input.** Non-printable-ASCII characters (zero-width spaces, NBSP, smart quotes, BOMs) stripped before token is used in any header. Live UI feedback to the user.
3. **Proxy is stateless.** No logging of request bodies, no logging of headers beyond status, no caching of authenticated responses, no persistence. CI grep enforces this.
4. **CSP.** Strict Content Security Policy: `default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`. No third-party domains, no `unsafe-eval`.
5. **No HTML rendering of API strings.** Issue messages and rule descriptions rendered as text or sanitized via DOMPurify if rich rendering is required.
6. **No third-party scripts.** No analytics, no error reporting (Sentry, etc.). CI grep on the built bundle enforces this.
7. **HTTPS-only.** App refuses to send the token if `window.location.protocol !== 'https:'` (with a localhost dev exception).
8. **"Forget everything" UI affordance.** One click clears all storage and reloads.
9. **Token never in URL.** Never in query strings, never in browser history.
10. **Rate-limit canary.** The proxy returns 429 verbatim when SonarCloud returns 429; no auto-retry that could mask abuse.

---

## 14. Risks & Open Questions

| # | Risk | Severity | Status / Path |
|---|---|---|---|
| R1 | SonarCloud CORS blocks browser-origin requests | Critical | **Resolved.** V1 has no CORS; V2 is allow-listed only to `sonarcloud.io` itself. Stateless proxy is the answer. Validated by `cors-spike/`. |
| R2 | The 10,000-result pagination cap blocks legitimate exports | High | UI warning + suggested filters; documented in README |
| R3 | SonarCloud V2 endpoints have reported auth quirks (community Jan 2026) | Medium | Sift v1 targets V1 only. V2 migration is a v1.x roadmap item. |
| R4 | Trademark concerns around the placeholder name "Sift" | Low–Medium | npm name conflicts; trademark search before claiming a domain. Avoid "Sonar" prefix. |
| R5 | Tokens in cookies on shared machines | Medium | Default to localStorage; in-app warning when cookie/persisted modes selected |
| R6 | Bundle size creeping past 250KB hurts cold-load | Low | `size-limit` check in CI; dynamic imports for heavy deps |
| R7 | SonarQube Server (self-hosted) demand | Medium | API client behind interface; v1.1 adds base-URL config |

### Open questions for the maintainer

- **Hosting target for canonical instance.** Recommendation: Vercel (best DX, free tier sufficient). Document Cloudflare Workers as alternative.
- **Public demo data.** Use a public SonarCloud organization for screenshots? Pick one whose maintainers won't object.
- **Discussions vs Discord.** GitHub Discussions for v1; revisit if contributor community grows.

---

## 15. Roadmap

### v1.0 (initial release)

Everything in §4 Scope.

### v1.1

- SonarQube Server (self-hosted) support via base-URL config.
- Saved filter presets (named, persisted).
- Compare two branches side-by-side.
- Bulk "copy as Markdown" from row selection.

### v1.2

- Migrate orgs/projects/QG endpoints from V1 to V2 (once V2 auth quirks stabilize).
- Trend / history view using `/api/measures/search_history`.
- "What's new since" filter.

### v2.0 (speculative)

- Community-contributed LLM remediation prompt templates.
- CLI sibling for CI use cases (shares the API client lib).
- PWA support for offline viewing of cached findings.

---

## 16. Design Brief for Claude

> This section is written for a future Claude session that will generate visual mockups. Hand it this section (or the whole spec) along with the `frontend-design` skill loaded. The simplification from a multi-screen app to a one-pager dramatically reduces the deliverable — there's effectively **one main mockup with a handful of state variations**.

### 16.1 How to use this brief

The design Claude should:

1. Read this section, plus §7 (feature spec) and §9 (UX flow).
2. Use the `frontend-design` skill — its emphasis on intentional, distinctive aesthetics applies, with the constraint that the aesthetic is "refined data-density," not maximalist.
3. Produce a single-file React + TypeScript + Tailwind component per deliverable, with realistic sample data inline (sample data fixture below in §16.7).
4. Default to dark theme; light theme is a secondary deliverable when requested.
5. Render at desktop width (≥1280px) by default; note responsive behavior in comments but don't ship mobile-first.

### 16.2 Visual direction

**Conceptual anchor: "engineering instrument."** The app is a tool for serious work — like a mechanic's diagnostic screen or a flight-deck instrument cluster. It rewards regular use with speed and precision, not delight or whimsy. Influences: Linear, Vercel dashboard, Plausible Analytics, Datadog (for density, not chrome). Anti-references: Notion (too soft), Stripe Dashboard (too marketing), generic Material Design (too rounded, too colorful).

**Five principles, in priority order:**

1. **Data first.** A typical user wants to scan 200 rows and find the worst 10. The UI exists to get out of the way of that scan. Generous information density wins over generous whitespace.
2. **Hierarchy through restraint.** One accent color, used sparingly. Severity badges are the only places saturated color appears.
3. **Sharp edges, small radii.** 4px border radius maximum. No floating cards with heavy shadows. Borders, not shadows, define regions. (Exception: modals lift slightly with a subtle shadow.)
4. **Type does the heavy lifting.** A single typeface family, two or three weights, deliberate size hierarchy. No decorative type.
5. **Motion is a tell, not a feature.** Use motion only to signal state change (filter applied → row count ticks; row expands → 180ms ease-out). No page transitions, no animated entrances.

### 16.3 Color tokens

**Dark theme (default):**

| Token | Value | Use |
|---|---|---|
| `--bg-base` | `#0A0B0D` | Page background |
| `--bg-surface` | `#111317` | Header, sidebar, tab bar |
| `--bg-surface-hover` | `#16191F` | Hover state |
| `--bg-elevated` | `#1A1D23` | Modal, drawer, popover |
| `--border-subtle` | `#1F2229` | Default borders |
| `--border-default` | `#2A2E36` | Stronger borders |
| `--text-primary` | `#E6E8EC` | Primary content |
| `--text-secondary` | `#9BA1AA` | Labels, metadata |
| `--text-tertiary` | `#5F6670` | Timestamps, hints |
| `--accent` | `#7DD3FC` | Single accent (links, focused control) |
| `--accent-muted` | `#0E7490` | Accent on dark surfaces |
| `--severity-blocker` | `#F43F5E` | Blocker badge |
| `--severity-critical` | `#FB923C` | Critical badge |
| `--severity-major` | `#FACC15` | Major badge |
| `--severity-minor` | `#A3E635` | Minor badge |
| `--severity-info` | `#60A5FA` | Info badge |
| `--qg-pass` | `#10B981` | QG passing |
| `--qg-fail` | `#F43F5E` | QG failing |
| `--qg-warn` | `#FACC15` | QG warning |

**Light theme:** invert the bg/text scale, keep accent and severity unchanged with slightly higher contrast.

### 16.4 Typography

- **Display / UI:** distinctive sans-serif. Recommendations: Geist, Söhne, General Sans, Mona Sans. **Avoid Inter.** Pick one and commit.
- **Mono (file paths, code, rule keys):** JetBrains Mono, Berkeley Mono, IBM Plex Mono. Avoid Fira Code (ligatures fight in dense tables).
- Sizes: `12px / 13px / 14px / 16px / 20px / 28px`. Typical row: 13px. Header title: 20px. Floor: 12px.
- Line height: 1.4 body, 1.2 table rows, 1.6 prose blocks.
- Tabular numerals (`font-variant-numeric: tabular-nums`) for all numeric columns.

### 16.5 Component inventory

Each ships as a reusable primitive in `src/components/primitives/`.

- **Button** — primary, secondary, ghost, danger; sizes sm / md
- **Badge** — severity (5), type (3), status (5), generic
- **Pill** — like badge but for QG status, larger
- **Input** — text, password, search (with leading icon), number
- **Select / Combobox** — single, multi-select with type-ahead
- **Checkbox / Radio / Toggle**
- **Tabs** — horizontal, single underline accent for active
- **Table** — header (sortable), rows (hover, expand), pagination, empty, loading skeleton
- **Toast** — top-right, info / success / warn / error
- **Modal** — backdrop, escape, focus-trapped
- **Drawer** — slide-in from right
- **Tooltip** — hover, 200ms delay, top placement default
- **Skeleton** — subtle pulse, no shimmer
- **Empty state** — icon + heading + body + optional action
- **Filter group** — collapsible section with title, count, options

### 16.6 Mockups to produce

**One main mockup + variations.** All variations show the same one-page app in different states.

1. **Main page — populated state.** Token connected, project selected, Issues tab active, sidebar showing filters with non-zero counts, table showing 50 realistic rows spanning all severities and types. One row in expanded state revealing the rule description and code snippet drawer.
2. **Cold start — no token.** Same page skeleton. Token field empty and pulsing subtly. Pickers disabled. Tab area shows empty state with a paste-token prompt.
3. **Token rejected.** Token row in red error state. Pickers disabled. Friendly inline message.
4. **Empty filter result.** Filters applied, table shows "no findings match your filters" empty state. Filter sidebar still visible.
5. **Over-cap warning.** Filter would yield > 10,000. Inline yellow banner above table with suggested narrowing.
6. **Hotspots tab active.** Same skeleton, hotspots table with hotspot-specific columns.
7. **Quality Gate tab active.** Status pill, conditions list, measures grid.

**Two overlay mockups:**

8. **Export modal.** Open over the populated state. Format toggle, template selector, field toggles, scope, limit, action buttons.
9. **Settings drawer.** Slide-in from right. Token storage mode, theme, defaults, "Forget everything" button.

That's 9 deliverables total — substantially less than the multi-screen version because the one-pager keeps the same skeleton and only varies the content area.

### 16.7 Sample data fixture

```typescript
const SAMPLE_ORG = {
  key: 'acme',
  name: 'Acme Corp',
  subscription: 'FREE',
};

const SAMPLE_PROJECT = {
  key: 'acme_widget-service',
  name: 'widget-service',
  organization: 'acme',
  lastAnalysisDate: '2026-05-04T14:22:11Z',
  qualityGate: 'ERROR',
};

const SAMPLE_BRANCH = { name: 'main', isMain: true, type: 'LONG' };

const SAMPLE_ISSUES = [
  {
    key: 'AYx8K1pQ-2zR4Mv',
    rule: 'typescript:S6571',
    severity: 'BLOCKER',
    type: 'BUG',
    status: 'OPEN',
    component: 'acme_widget-service:src/services/payment.ts',
    line: 142,
    message: 'Refactor this function to reduce its Cognitive Complexity from 28 to the 15 allowed.',
    effort: '1h 30min',
    tags: ['brain-overload', 'maintainability'],
    creationDate: '2026-04-12T09:14:00Z',
  },
  {
    key: 'AYx8K1pR-3aS5Nw',
    rule: 'java:S2068',
    severity: 'CRITICAL',
    type: 'VULNERABILITY',
    status: 'OPEN',
    component: 'acme_widget-service:src/auth/legacy.java',
    line: 47,
    message: 'Hard-coded credentials are security-sensitive.',
    effort: '30min',
    tags: ['cwe', 'owasp-a2'],
    creationDate: '2026-04-15T11:02:00Z',
  },
  // ... generate ~50 rows total spanning all severity / type / status combinations
];

const SAMPLE_QG = {
  status: 'ERROR',
  conditions: [
    { metricKey: 'new_coverage', comparator: 'LT', errorThreshold: '80', actualValue: '64.2', status: 'ERROR' },
    { metricKey: 'new_duplicated_lines_density', comparator: 'GT', errorThreshold: '3', actualValue: '5.7', status: 'ERROR' },
    { metricKey: 'new_security_rating', comparator: 'GT', errorThreshold: '1', actualValue: '1', status: 'OK' },
    // ...
  ],
};
```

### 16.8 Interaction patterns

- **Sort:** click header to toggle asc/desc; shift-click adds secondary sort (subscript "2" indicator).
- **Filter:** all filter changes apply on selection (no Apply button); URL hash reflects filter set.
- **Row expand:** click anywhere on row except interactive elements; drawer slides down within the row (180ms ease-out).
- **Tab switch:** updates URL hash; preserves filters per tab.
- **Keyboard:** `j`/`k` move row focus; `enter` expand; `e` focus export; `/` focus search; `?` show shortcuts.
- **Focus indicators:** 2px accent outline on all focused interactive elements; never `outline: none`.

### 16.9 Accessibility

- WCAG 2.1 AA across both themes.
- All severity / status badges include text, not color alone.
- Tables expose row count, sort state, column headers via ARIA.
- Modals and drawers focus-trapped, dismissible by Escape.
- Color contrast checked in CI via Playwright + axe-core.
- `prefers-reduced-motion` disables all transitions.

---

## 17. Naming

Placeholder name **Sift** — short, evokes filtering, doesn't infringe on SonarSource's marks (`SonarQube`, `SonarCloud`, `SonarLint`). Avoid putting "Sonar" in the project name to stay clear.

Before claiming the name: search npm (the bare `sift` is taken by an unrelated MongoDB query lib — use a scope like `@sift-app/web` or pick an alternative); GitHub; .com/.io/.dev; USPTO TESS.

Other candidates: **Findings**, **Sieve**, **Tally**, **Lens**, **Triage**.

---

## 18. Glossary

- **SonarCloud (SC):** SonarSource's hosted SaaS code-quality service.
- **SonarQube Server (SQS):** the self-hosted variant; v1.1 roadmap.
- **Issue:** a bug, vulnerability, or code smell detected by a Sonar rule.
- **Hotspot:** a security-sensitive piece of code that needs human review (not necessarily a vulnerability).
- **Quality Gate (QG):** pass/fail conditions defining whether a project meets standards.
- **Measure:** a metric value (coverage, ncloc, duplication, etc.) for a component.
- **Component:** a file, directory, or project, identified by a key.
- **Token:** a SonarCloud user-scoped API token; permissions inherited from the user.
- **ADR:** Architecture Decision Record. Lives in `docs/adr/`.

---

*End of spec, v0.4. Companion documents: `ARCHITECTURE.md` (modular architecture, living) and `IMPLEMENTATION.md` (phased TDD plan for Claude Code). Open a Discussion to propose changes.*
