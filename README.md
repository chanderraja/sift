# Sift

> A one-page browser dashboard for SonarCloud findings — issues, security hotspots, and quality-gate status — with Markdown / CSV export designed for LLM-assisted remediation planning.

**Status:** Phases 1–10 merged on `master`. **Live at [sift-red.vercel.app](https://sift-red.vercel.app).** See [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) for the full 12-phase plan. Phase 11 (Settings, Theme, Polish) is next.

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

### Build-time configuration (env vars)

Self-hosters can override the cold-start defaults at build time without forking the code. Set these in your hosting platform's environment-variable settings (e.g. `vercel env add VITE_DEFAULT_STORAGE_MODE production`). A persisted user choice always wins over these defaults; they only affect first-time visitors.

| Variable                    | Values                                    | Default | Effect                                                                                                                                                                                               |
| --------------------------- | ----------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_DEFAULT_STORAGE_MODE` | `local` / `session` / `cookie` / `memory` | `local` | Where the SPA holds the SonarCloud token by default. Pick `session` for shared-machine deployments where tokens shouldn't survive tab close. See [`SECURITY.md`](./SECURITY.md#token-storage-modes). |
| `VITE_DEFAULT_REGION`       | `eu` / `us`                               | `eu`    | SonarCloud region pre-selected for new users. Pick `us` for organisations on `sonarqube.us`.                                                                                                         |

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). In short: trunk-based, Conventional Commits, TDD, small PRs.

## License

MIT — see [`LICENSE`](./LICENSE). Inbound contributions are licensed under the same terms (see `CONTRIBUTING.md`). Project name and logo are not covered by the code license; see [`TRADEMARK.md`](./TRADEMARK.md).
