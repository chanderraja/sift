# Sift — Roadmap / v1.1 Candidates

Items below appeared in design mocks or came up during Phase 11 review but were
explicitly deferred because they are not in SPEC.md §7.1 and do not belong in
the v1.0 release scope.

## Filter-sidebar omnibox (search across rules, tags, and files)

The Phase 11 Claude Design mock shows a "Filter rules, tags, files…" free-text
input above the severity/type/status filter groups. It was not included in
SPEC.md §7.1 and was consciously left out of Phase 11.

**What it would do:**

- Single text field that simultaneously filters the visible issue list by rule
  ID, tag name, or file path substring.
- Complements the existing per-dimension checkboxes rather than replacing them.
- The `/ ` keyboard shortcut (Phase 11 stub) is already wired to focus
  `[data-testid="issues-filter-sidebar"] input`; adding the omnibox would
  activate that shortcut automatically.

**Open questions before implementing:**

- Fuzzy vs. exact substring match? Which fields are searched (rule, tags,
  component path, message)?
- Does it filter client-side against the current page, or does it append a
  query param to the SonarCloud API call?
- Interaction with the checkbox filters: AND or OR semantics when both are set?
- Should the same field appear in the Hotspots sidebar too?

**Tracking:** open a GitHub issue and link it here once the v1.0 PR is merged.
