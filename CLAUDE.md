# Sift — Claude Code Operating Manual

This file orients you at the start of every session. It is the index, not the content. The detailed source of truth lives in the three documents linked below.

## What this project is

Sift is a one-page web dashboard for SonarCloud findings (issues, security hotspots, quality gate status) with Markdown/CSV export designed for LLM-assisted remediation planning. Open-source under MIT, hosted as a static SPA fronted by a thin stateless edge proxy. Vendor-neutral proxy code, Vercel canonical, Cloudflare Workers documented.

## Source of truth, in order

Read in this order before writing any code in a session:

1. **[`SPEC.md`](./SPEC.md)** — product spec. What the app does, why, and for whom. Includes design brief and sample data fixtures.
2. **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** — modular architecture, module interfaces, ADRs. **This is a living document.** Every architectural decision is captured here as an ADR. Module boundaries and TypeScript interfaces in §3 are the contract.
3. **[`IMPLEMENTATION.md`](./IMPLEMENTATION.md)** — phased TDD plan tailored for you (Claude Code). Read the current phase's section in full before writing any code. Earlier phases for context if needed.

Visual references for design phases live in `docs/mocks/` (1440×900 PNGs of all 9 states in dark and light themes).

## Current phase

**Phase 0 — Foundation.** See `IMPLEMENTATION.md` §"Phase 0".

When this phase is complete (all acceptance criteria met, CI green on `master`, maintainer has merged the foundation PR), update this line to the next phase. Do not advance phases without maintainer sign-off on the current one.

## Working principles — non-negotiable

These are codified in `IMPLEMENTATION.md` "Working Principles." Summary:

- **TDD red-green-refactor.** Every behavior gets a failing test first. The failure message is the spec for the next step. No production code without a failing test driving it. The "we'll add tests later" path is closed.
- **Small Conventional Commits.** One logical purpose per commit. Lint, typecheck, and tests all pass on every commit. Use `feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`. If a commit gets big, split it.
- **Strict types.** TypeScript runs with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any`, no `as any`, no `// @ts-ignore`. Use `unknown` and parse with Zod when types are genuinely unknown.
- **Never log tokens.** Only `src/lib/logger.ts` may call `console.*`. CI grep enforces this everywhere else. Authorization headers and any field named `token`, `secret`, `password`, or `apiKey` are scrubbed before any logger call.
- **Never hit live SonarCloud in tests.** All tests use MSW with fixtures in `tests/fixtures/`. CI does not have a SonarCloud token.
- **No unguarded changes to `ARCHITECTURE.md`.** If a phase reveals a need to change a module boundary, an interface, or a stack choice, **stop and write an ADR draft before touching code**. The ADR is reviewed by the maintainer. Update the change log in `ARCHITECTURE.md` §9 with every accepted ADR.

## Escalation triggers — stop and ask the maintainer

Stop work and post a question (not a guess) when any of these happen:

- An open question in `ARCHITECTURE.md` §8 needs to be resolved to proceed with the current phase. Each phase's prerequisites list any blocking questions.
- A test you'd write would require changing a documented module interface in `ARCHITECTURE.md` §3.
- An external API (SonarCloud, Vercel, etc.) behaves differently from how the architecture describes it. Capture the deviation as an ADR draft for review.
- A dependency fails to install or a CI step fails for reasons that look environmental, not code-related.
- You are 30+ minutes into debugging without a falsifiable theory.
- A stack choice (router, state library, table library, etc.) feels wrong for the task. Do not silently substitute. Propose an ADR.

## Per-session protocol

1. Read this file.
2. Read the current-phase section of `IMPLEMENTATION.md` and the architectural references it points at.
3. Verify the prerequisite phases are merged on `master`.
4. Begin with the next failing test in the phase's "Tests first" list. Watch it fail. Then implement the minimum to make it pass. Refactor while green. Repeat.
5. Before every commit: run `pnpm lint && pnpm typecheck && pnpm test`. They must all pass. CI runs the same checks; local pass should mean CI pass.
6. End of session: every in-flight change is either committed or stashed. No half-done work in the working tree.

## What you do not do

- Do not invent module structure not described in `ARCHITECTURE.md`.
- Do not silently change library choices listed in `SPEC.md` §10 or `ARCHITECTURE.md` §4.
- Do not skip the test-first step "just for this small thing."
- Do not suppress lint or type errors; fix them.
- Do not commit `.env` files, real tokens, real customer data, or anything that looks like a credential.
- Do not push directly to `master`; everything goes through PRs.
- Do not call live SonarCloud from CI or tests. Manual verification by the maintainer only.
- Do not add third-party scripts (analytics, error reporters, telemetry) to the production bundle.

## Repository conventions

- **Package manager:** pnpm. Node 20 LTS (see `.nvmrc`).
- **Branch model:** trunk-based. Feature branches off `master`, squash-merge via PR.
- **PR template:** linked issue, summary, screenshots if UI changed, test plan, accessibility checklist.
- **Commit messages:** Conventional Commits. Scope in parens for clarity: `feat(api): add searchIssues filter encoding`.
- **File creation:** every `.ts`/`.tsx` file in `src/`, `proxy/`, and `tests/` begins with `// SPDX-License-Identifier: MIT`. Enforced by ESLint.

## Phase 0 reminders

A few items in Phase 0 require the maintainer specifically — flag rather than skip if any blocker:

- Vercel project creation and domain configuration (requires maintainer's GitHub/Vercel permissions).
- Real SonarCloud fixtures in `tests/fixtures/` need a one-time capture from a real account; `scripts/capture-fixtures.sh` is the planned helper. Without fixtures, Phase 1 cannot start.
- Decision on bundle-size tool (`size-limit` vs `bundlewatch`) and whether CodeQL ships in Phase 0 or Phase 12.

---

*If you are reading this and something here conflicts with the three source-of-truth documents, the source-of-truth documents win and this file should be updated. Flag the discrepancy.*
