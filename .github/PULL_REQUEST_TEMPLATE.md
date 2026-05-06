<!--
Thanks for sending a PR. The checklist below is the bar for merge.
For larger work, please link a Discussion or Issue you aligned on first.
-->

## Summary

<!-- 1–3 sentences. The "why" matters more than the "what". -->

Closes #

## What changed

-
-
-

## Test plan

<!-- How did you verify this? Include unit tests written, manual steps tried, edge cases checked. -->

-
-

## Screenshots / recordings (UI changes only)

<!-- Drag in before/after screenshots. For interaction changes, a short screen capture beats words. -->

## Checklist

- [ ] Tests added or updated; the new tests fail without my change.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass locally.
- [ ] No new `console.*` calls outside `src/lib/logger.ts`.
- [ ] No new `any`, `as any`, or `// @ts-ignore`.
- [ ] If a module boundary or interface in `ARCHITECTURE.md` changed, an ADR is included or linked.
- [ ] If a UI element changed, the accessibility checklist below is satisfied.

### Accessibility (UI changes only)

- [ ] All interactive elements reachable by keyboard, with visible focus.
- [ ] No information conveyed by color alone (text labels accompany severity badges, etc.).
- [ ] Forms have labels associated with inputs.
- [ ] axe-core reports zero violations on the affected screen.

### Architectural changes

- [ ] N/A
- [ ] ADR drafted in `docs/adr/` and the change-log row added in `ARCHITECTURE.md` §9.
