# Vercel Setup — Maintainer Checklist

> Audience: the maintainer (someone with `chanderraja/sift` admin and a Vercel account).
> Status: TODO — Vercel project not yet linked. This file describes the one-time setup that ends Phase 0.

The Phase 0 acceptance criterion "A push to a feature branch produces a green CI run and a Vercel preview URL" requires a Vercel project to exist. That requires GitHub permissions and a Vercel account that this repo's CI cannot create. This document is the runbook.

## What does and does not exist yet

- ✅ The repository builds a static SPA from `pnpm build` → `dist/`. Verified locally.
- ✅ GitHub Actions workflows are in `.github/workflows/`.
- ❌ No Vercel project is linked. There is no `.vercel/` directory checked in (and there should not be — `.vercel/` is gitignored).
- ❌ No production domain is claimed.
- ❌ The proxy in `proxy/api/sonar/[...path].ts` does not exist yet. It lands in Phase 2 along with `proxy/core.ts`. The Vercel project should be linked first so Phase 2's Edge Function preview deploys "just work."

## Step-by-step

### 1. Create the Vercel project

```bash
pnpm dlx vercel@latest login
pnpm dlx vercel@latest link
```

Answer the prompts:

- Set up and deploy? **No** (just link).
- Which scope? _Your personal account or a Vercel team._
- Existing project? **No.**
- Project name? `sift` (or whatever the maintainer prefers).
- Directory? `./` (the repo root).
- Override settings? **No.** Vercel auto-detects Vite.

The result: a Vercel project linked to this Git repo. The CLI will write a `.vercel/` directory locally; it stays gitignored. No secrets land in the repo.

### 2. Confirm framework + build settings

In the Vercel dashboard for the project:

- Framework preset: **Vite**.
- Build command: `pnpm build` (default).
- Output directory: `dist` (default).
- Install command: `pnpm install --frozen-lockfile`.
- Node version: 20.x (matches `.nvmrc`).

No environment variables are needed for v1.0. The proxy reads no secrets — it forwards whatever `Authorization` header the browser sends.

### 3. Connect the GitHub integration

If not done during `vercel link`: in the Vercel dashboard, connect the project to the `chanderraja/sift` repo. Enable:

- ✅ Production deploys from `main`.
- ✅ Preview deploys for every PR and every branch.
- ❌ Comments on commits / PRs (off, to keep PR noise down). The maintainer can opt back in.

### 4. Verify a preview deploy

Push a trivial change on a branch:

```bash
git checkout -b chore/verify-vercel
git commit --allow-empty -m "chore: smoke-test vercel preview"
git push origin chore/verify-vercel
```

Open the resulting PR. Within ~1 minute Vercel should comment with a preview URL. Open it; you should see the Phase 0 placeholder app (a single `<h1>Sift</h1>`).

If the preview fails to build, the most likely culprits are:

- pnpm version mismatch (Vercel auto-detects from `packageManager` field — we don't set one yet; rely on the default). If needed, add `"packageManager": "pnpm@10.33.0"` to `package.json`.
- Node version mismatch. The `.nvmrc` file should be honored; if not, set the Node version explicitly in the dashboard.

### 5. Domain (optional, can defer to Phase 12)

Production domain is not blocking for Phase 0. When ready:

- Decide on a production hostname (e.g. `sift.dev`, `sift.app`, `sift-app.vercel.app`).
- Run a trademark / npm name check first per `SPEC.md` §17.
- Add the domain in the Vercel dashboard, configure DNS.
- Update `proxy/adapters/vercel.ts` (which lands in Phase 2) to set `allowedOrigin` to the production hostname for the production deploy. Preview deploys can keep `allowedOrigin: '*'` since each PR has its own throwaway URL.

### 6. Mark Phase 0 complete

Once a preview URL has rendered successfully, this checklist is done. Update `CLAUDE.md` "Current phase" from "Phase 0 — Foundation" to "Phase 1 — Types, Validators, and Test Fixtures."

## What Claude Code cannot do

Claude Code does not (and should not) run `vercel link` or `vercel login` — those bind a Vercel account to this repository, which is the maintainer's call. Claude can edit files in `.vercel/` after the link, configure `vercel.json` if needed, and verify preview URLs from the GitHub PR Checks panel — but the initial link is a manual step.

## What gets committed

After a successful link, the only change in the repo from this setup should be (optionally) a `packageManager` field in `package.json` and a `vercel.json` if any redirects / rewrites become necessary later. Nothing else from `.vercel/` should be committed.

The proxy adapter (`proxy/adapters/vercel.ts`) and the Vercel-specific entry point (`api/sonar/[...path].ts`, per Vercel's catch-all convention) land in Phase 2.
