# ADR-009 — Graceful fallback when a persisted selection key is missing

**Status:** Accepted
**Date:** 2026-05-10
**Closes:** Q-4

## Context

Open question Q-4 in `ARCHITECTURE.md` §8 asks: what happens when the URL
hash references an org / project / branch that no longer appears in the
freshly-loaded list? Concrete cases:

- A shared URL like `#org=acme&project=acme_widget-service&branch=release/2024.q4`
  pasted by a colleague whose project access has since been revoked.
- A branch deleted on SonarCloud but still cached in someone's URL bar.
- A project archived or renamed.
- A reload after the user changes regions, where `acme` lives in `eu`
  but the user's hash-restored region is now `us`.

Without a deliberate behavior the app has three failure modes, all bad:

1. Render the picker showing the persisted value as if it were valid,
   then send an authenticated request that 404s and surfaces a confusing
   error far downstream.
2. Crash on a `toLowerCase()` of `undefined` or similar inside a render
   path that didn't expect a "selected key not in option list" state.
3. Silently drop the selection without telling the user, leaving them
   with the impression that the URL didn't restore correctly.

This ADR picks a fourth option.

## Decision

**Graceful fallback with cascade.** When any persisted selection key is
absent from the freshly-loaded SonarClient response for that level, the
header clears that level _and_ cascades downward, then fires a single
toast naming what was dropped:

| Missing key                                    | Result                                                                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `organizationKey` not in `listOrganizations()` | Clear org + project + branch. Toast: `Selected organization "{key}" is no longer available.`                                                           |
| `projectKey` not in `listProjects(orgKey)`     | Clear project + branch. Toast: `Selected project "{key}" is no longer available.`                                                                      |
| `branchName` not in `listBranches(projectKey)` | Clear branch, fall back to the project's `isMain: true` branch. Toast: `Selected branch "{name}" is no longer available — switched to "{mainBranch}".` |

Cleared selection levels are reset to `null` in `selectionStore`, which
propagates through the existing hash-sync wiring (`hashSyncIntegration`
removes the corresponding key from `window.location.hash`) and the
existing cascading disabled-state logic in the picker UI.

The validation must run **after** the relevant query resolves — checking
beforehand is impossible since we don't know the option list yet. The
implementation lives in a dedicated hook (`useEnsureSelectionLive`) that
subscribes to each of `useOrganizations` / `useProjects` / `useBranches`
and runs the validation in a `useEffect` on each result.

Filter selections (`filtersStore.issuesFilters`, etc.) are intentionally
**not** cleared on a missing-selection cascade. A user who configured a
detailed filter set and shared the URL deserves to keep that work even
if the project they pointed at vanished — they can pick a new project
and the filters apply against it.

## Consequences

- Stale URLs no longer corrupt the app state; the user always sees a
  consistent "valid pickers + toast explanation" state.
- `selectionStore` does not need to model a "stale" sub-state — every
  value in the store is always either `null` or guaranteed to exist in
  the latest known option list.
- The toast becomes load-bearing UX. Tests must assert it fires for
  each missing-level case so a future refactor doesn't quietly swallow
  the user's signal that something changed.
- Filters survive a missing-selection event by design. If we later
  decide that's wrong, that's a separate ADR.

## Rejected alternatives

- **Keep the stale value, surface the eventual 404 as a banner.**
  Pushes the failure deep into the render tree where it's surprising and
  hard to recover from. Users rarely connect a 404 to "the URL I pasted
  references something archived three months ago."
- **Hard-redirect to a clean URL on any missing key.** Wipes the user's
  filter selections too, which is a worse failure than the URL drift.
- **Silently drop the missing key without a toast.** User has no idea
  why their URL "didn't restore right."

## Roadmap

The toast layer in this ADR is short — single line, dismissable. If a
future UX iteration wants a richer "your URL referenced X which is now
gone — here's how to find it" panel, that's additive on top of the
clear-and-toast contract this ADR sets, not a replacement.
