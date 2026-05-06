# Contributing to Sift

Thanks for your interest in contributing. Sift is a small, open-source project; this document covers the conventions we expect contributors to follow so reviews stay short and merges stay safe.

## Local setup

Requires [pnpm](https://pnpm.io) and Node 20 LTS (see [`.nvmrc`](./.nvmrc)).

```bash
pnpm install     # also installs the husky pre-commit hook
pnpm dev         # local dev server
pnpm test        # vitest unit + integration suite
pnpm e2e         # playwright (run pnpm e2e:install once)
pnpm lint        # eslint
pnpm typecheck   # tsc --noEmit
pnpm build       # production bundle
pnpm size        # bundle-size budget check
```

CI runs the same commands. If they pass locally, they should pass in CI.

## Working principles

These are the rules of engagement, codified in [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) and [`CLAUDE.md`](./CLAUDE.md):

- **Tests first.** Every behavior gets a failing test before any production code. The "we'll add tests later" path is closed.
- **Small commits, one purpose each.** Each commit lints, typechecks, and tests cleanly on its own. Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`).
- **Strict types.** No `any`, no `as any`, no `// @ts-ignore`. Use `unknown` and parse with Zod when types are genuinely unknown. Enforced by ESLint.
- **No tokens in logs, ever.** Only `src/lib/logger.ts` may call `console.*`. Authorization headers and any field named `token`, `secret`, `password`, `apiKey` are scrubbed before logging. CI grep enforces.
- **No live SonarCloud in tests.** All tests use MSW with fixtures in `tests/fixtures/`. CI does not have a SonarCloud token.
- **Architecture changes go through ADRs.** Module boundaries and interfaces in [`ARCHITECTURE.md`](./ARCHITECTURE.md) are the contract. Propose changes by drafting an ADR in `docs/adr/` first.

## Branch model and PRs

Trunk-based: feature branches off `main`, squash-merge via PR. Each PR should:

- Reference an issue (or a GitHub Discussion for design-heavy work).
- Contain a focused change. Two unrelated changes → two PRs.
- Pass CI.
- Include screenshots for any UI change.
- Tick the accessibility checklist in the PR template if UI changed.

For anything bigger than a small fix, open a GitHub Discussion or Issue first to align on approach. PRs that arrive without prior discussion may be closed in favor of a redesigned scope, even if the code is good.

## License (inbound = outbound)

By submitting a contribution to Sift you license your contribution under the [MIT License](./LICENSE) — the same license as the project itself. This is GitHub's default per their [Terms of Service §D.6](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#6-contributions-under-repository-license) and is restated here so contributors whose employers ask have a clear answer. No separate Contributor License Agreement is required.

## Trademark

The project name and logo are not covered by the code license. See [`TRADEMARK.md`](./TRADEMARK.md). In short: forks may use the code freely, but should rename for public distribution to avoid user confusion.

## Code of Conduct

By participating you agree to abide by the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md).

## Reporting security issues

Do **not** open a public issue for security vulnerabilities. See [`SECURITY.md`](./SECURITY.md) for the disclosure process.

## Commit message format

Conventional Commits with optional scope:

```
feat(api): add searchIssues filter encoding
fix(proxy): strip Set-Cookie on upstream 5xx
test(lib): add zod validator coverage for hotspots
docs: explain over-cap UX in IMPLEMENTATION
```

Subject under 72 characters, imperative mood, no trailing period.

## Questions

Open a GitHub Discussion. Bug reports go to Issues; questions go to Discussions.
