# Architecture Decision Records

This directory holds the accepted ADRs for Sift. Each ADR is a short, dated, immutable record of one architectural decision and the alternatives considered.

## Conventions

- **One file per decision.** Filename: `NNNN-kebab-case-title.md`, where `NNNN` is a zero-padded sequential number.
- **Immutable once accepted.** Do not edit a merged ADR's substance. To change a decision, write a new ADR that supersedes the old one and update the old one's status header to `Superseded by ADR-XYZ`.
- **Brief.** A typical ADR is one screen. If you find yourself writing more than two screens, consider splitting it.

## Anatomy

```
# ADR-NNNN — <decision title>

**Status:** Accepted | Proposed | Superseded by ADR-XYZ
**Date:** YYYY-MM-DD
**Closes:** Q-N (if it resolves an open question in ARCHITECTURE.md §8)

## Context

What is the situation that requires a decision? What forces are in play?
Cite empirical evidence (spike results, benchmarks, upstream docs) where applicable.

## Decision

What did we decide? State it plainly.

## Consequences

What does this make easier? Harder? What new constraints does it impose?
Be honest about trade-offs.

## Rejected alternatives

For each alternative seriously considered: what was it, why was it rejected.
This is where future readers will look first when re-evaluating the decision.
```

## When to write an ADR

Write one when:

- You are about to change a module boundary or interface in `ARCHITECTURE.md` §3.
- You are choosing between two non-trivial approaches and the choice is not obvious.
- You are resolving an open question in `ARCHITECTURE.md` §8.
- The decision constrains how future contributors should solve a class of problem.

You do **not** need an ADR for routine implementation choices, function-internal design, or UI polish.

## When to skip

If the answer is in the spec or in an existing ADR, just point at it. Don't write a redundant ADR. The cost of an ADR is the cost of writing it plus the cost of every future reader having to skim it; both are non-zero.

## Process

1. Write a draft as a PR. The status header reads `Proposed`.
2. Discussion happens in the PR.
3. On merge, change the status header to `Accepted` and append a row to `ARCHITECTURE.md` §9 Change Log.
4. If a later ADR overrides this one, update the old ADR's status header to `Superseded by ADR-XYZ`.

## Index

Keep `ARCHITECTURE.md` §7 in sync with the files in this directory. The `ARCHITECTURE.md` summaries are the canonical short form; these files are the canonical long form.
