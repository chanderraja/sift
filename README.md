# Sift

> A one-page browser dashboard for SonarCloud findings — issues, security hotspots, and quality-gate status — with Markdown / CSV export designed for LLM-assisted remediation planning.

**Status:** Pre-implementation (Phase 0 — foundation). The README will gain a screenshot, a live demo link, and a feature tour as the v1.0 release lands.

## Why

SonarCloud is excellent at finding issues but deliberately discourages exporting them. That is fine when you are fixing one issue at a time in your IDE; it is not fine when you are triaging a backlog, briefing a team, or asking an LLM to draft a remediation plan. Sift fills the gap without ever persisting your token on a server.

See [`SPEC.md`](./SPEC.md) for the full product specification and [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the modular architecture.

## Privacy callout

- Your SonarCloud token never persists on a server.
- The proxy that fronts the SonarCloud API is **stateless**: no logging of tokens, request bodies, or headers; no caching; no persistence. Code lives in [`proxy/`](./proxy) and is ~50 lines of vendor-neutral logic plus thin platform adapters.
- The app ships zero third-party scripts: no analytics, no error reporters. Verified by CI.
- The full threat model lives in [`SECURITY.md`](./SECURITY.md).

## Status & roadmap

Sift is being built in 12 phases per [`IMPLEMENTATION.md`](./IMPLEMENTATION.md). v1.0 ships when Phase 12 lands. Roadmap items beyond v1.0 (SonarQube Server support, saved filter presets, trend view) are tracked in [`SPEC.md`](./SPEC.md) §15.

## Quick start (developers)

Requires [pnpm](https://pnpm.io) and Node 20 LTS.

```bash
pnpm install
pnpm dev          # local dev server
pnpm test         # vitest, watch with pnpm test:watch
pnpm e2e          # playwright against the built app
pnpm lint         # eslint
pnpm typecheck    # tsc --noEmit
pnpm build        # production bundle
```

## Self-host

The canonical instance runs on Vercel. The proxy adapter for Cloudflare Workers is documented separately. Detailed self-host instructions land alongside the v1.0 release.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). In short: trunk-based, Conventional Commits, TDD, small PRs.

## License

MIT — see [`LICENSE`](./LICENSE). Inbound contributions are licensed under the same terms (see `CONTRIBUTING.md`). Project name and logo are not covered by the code license; see [`TRADEMARK.md`](./TRADEMARK.md).
