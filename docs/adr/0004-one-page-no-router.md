# ADR-0004 — One-page UI, no router

**Status:** Accepted
**Date:** 2026-05-06

## Context

An earlier draft of the spec described a multi-screen flow: a token-entry screen, then an org-picker screen, then a project list, then an issues view, etc. Routing libraries (React Router) were assumed.

Re-reading the use cases, none of them benefit from screen transitions. Every workflow returns to the same shape: pick a project + branch, look at findings, optionally export. The state that distinguishes "screens" is the same set of fields that already lives in the URL hash for shareability.

## Decision

Sift is a one-page app. No router library. The page layout is:

- Header at the top: token, region, org / project / branch pickers, settings + export buttons.
- Tabbed content area below: Issues / Hotspots / Quality Gate.
- Settings is a slide-in drawer.
- Export is a modal.

The URL hash carries selection (region, project, branch), filters, and active tab. There is no `<a href>` navigation between screens because there are no screens.

## Consequences

- React Router and its dependencies are out of the bundle. Smaller payload.
- State management is simpler: there is exactly one page, so there is exactly one set of components mounted.
- The page must render gracefully in degraded states (no token, token rejected, no project selected) instead of routing them to dedicated screens. This is a constraint on every feature: each must have a useful empty / error / loading state.
- Cold-start UX is "everything is here, but disabled until you paste a token" — captured in `SPEC.md` §9.

## Rejected alternatives

- **Multi-screen flow with React Router.** Adds a dependency, a state mode (route ≠ component state), and per-screen empty states. The spec's use cases don't need it.
- **Wizard-style cold start.** Walks the user through token → org → project as separate screens. Friendlier for first-timers, but every returning user is the worse for it. The structured cold-start empty state in `SPEC.md` §9 is a reasonable middle ground.
