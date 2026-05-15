# Changelog

All notable changes to Sift are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-05-14

First stable release. All 12 phases of the [implementation plan](./IMPLEMENTATION.md) are complete.

### Added

**Core app**

- Issues tab: paginated table with filter sidebar (severity, type, status, resolution, tags, assignee, date range, new-code period). Search-as-you-type project picker. Per-dimension issue counts.
- Security Hotspots tab: paginated table filtered by status (TO_REVIEW / REVIEWED) and resolution (FIXED / SAFE / ACKNOWLEDGED).
- Quality Gate tab: pass/fail badge, per-condition breakdown with metric values and thresholds, measures panel (lines of code, coverage, duplication).
- Export Modal: Markdown and CSV export for Issues, Hotspots, and a Quality Gate actionable report that fetches the issues/hotspots behind each failing condition and renders a structured remediation document.
- Settings drawer: theme toggle (light / dark / system), token storage mode (local / session / cookie / memory), region selector (EU / US), "Forget everything" affordance.
- App version and git commit SHA displayed in the Settings footer.

**Infrastructure**

- Stateless edge proxy (`proxy/core.ts`, ~60 lines) forwarded at `/api/sonar/v1/**` via a Vercel Serverless Function (`api/sonar/[...path].ts`). Cloudflare Workers adapter in `proxy/adapters/cloudflare.ts`.
- TanStack Query with per-query stale-time table (ADR-008a); SPA-side caching, no edge caching.
- Zustand stores for auth, selection, filters, preferences, and URL hash sync.
- URL hash sync: org / project / branch / active tab / filters round-trip through `window.location.hash`.
- ADR-009 graceful fallback: stale persisted selections (org, project, or branch deleted from SonarCloud) are detected on load and cleared with a toast.

**Quality**

- 939 unit + integration tests (Vitest + Testing Library + MSW fixtures — no live SonarCloud calls in CI).
- Playwright e2e smoke test + axe-core accessibility assertions.
- CI: lint, typecheck, test, build, license-check, no-stray-console, CodeQL, Playwright, Vercel preview.
- Bundle size budget enforced by size-limit (250 KB gzipped JS, 20 KB CSS).

### Fixed (post-Phase-10 hardening)

- Schema validation failures for SonarCloud responses with optional `flows[].locations` or missing `actualValue` on quality-gate conditions.
- `400` upstream errors when filtering hotspots by resolution without `status=REVIEWED`.
- `400` upstream errors from empty `?organization=` query parameter when no org is selected.
- React controlled/uncontrolled Select warning in org, project, and branch pickers.
- `execSync` security hotspot replaced with filesystem-only git commit reader in `build-info.ts`.

---

_Older development history is in `git log`._
