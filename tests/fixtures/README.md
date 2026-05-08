# Test fixtures

These JSON files are redacted SonarCloud V1 responses, used by the MSW handlers in `tests/msw.ts` to drive unit and integration tests offline. They are captured **once** by the maintainer using `scripts/capture-fixtures.sh` and committed to the repo.

The committed fixtures use the fictitious organization key `acme` and project key `acme_widget-service` from `SPEC.md` §16.7 throughout, so test code can refer to them as stable identifiers.

## Why fixtures, not live calls

- CI does not have a SonarCloud token (per `CLAUDE.md` working principles).
- Tests must be deterministic and runnable offline.
- A schema-correct recorded fixture is a sturdier contract than a hand-mocked stub — it catches schema drift the moment a recorded fixture diverges from a hand-written type.

## One-time capture procedure (maintainer)

1. **Pick a real organization and project you control.** Use ones whose data you are comfortable having a redacted snapshot of in a public repository. The committed fixtures will look like they came from `acme/acme_widget-service`, but the redaction is substring-based — anything that is not your literal org or project key passes through and may need manual sanitization (see checklist below).

2. **Generate a SonarCloud user token** at `sonarcloud.io/account/security`. Keep it in your shell environment only. **Never commit it. Never paste it into an issue, PR, or chat.**

3. **Install `jq`** if you don't have it (`dnf install jq` / `apt-get install jq` / `brew install jq`). The script uses it for field-targeted PII scrubs that string substitution can't reach.

4. **Run the capture script:**

   ```bash
   export SONAR_TOKEN=...                    # from step 2 — keep secret
   export SONAR_ORG=your-real-org-key
   export SONAR_PROJECT=your-real-project-key  # typically <org>_<repo>
   # optional:
   export SONAR_BRANCH=...                   # default: auto-detected from /project_branches/list
   export SONAR_REGION=eu                    # eu (default) or us

   ./scripts/capture-fixtures.sh
   ```

   Two things happen:
   - Raw responses land in `tests/fixtures/raw/` (gitignored — for your eyes only).
   - Scrubbed copies land in `tests/fixtures/*.json` ready for review. The script does two passes: a substring rename of `$SONAR_ORG → acme` and `$SONAR_PROJECT → acme_widget-service`, then a `jq`-based walk that rewrites known-sensitive structured fields by name (`author.{name,login,avatar}`, `assignee`, `authorLogin`, `avatar`, `sha`, `branchId`, `branchUuidV1`, generic `uuid`). Free-text fields (issue / comment / commit messages, descriptions) are intentionally **not** auto-scrubbed; the manual checklist below covers them, since false positives there would corrupt fixture realism.
   - Per-endpoint failures are logged but don't abort the run; a summary at the end lists what succeeded and what failed.

5. **Review** `tests/fixtures/raw/` and `tests/fixtures/` side-by-side. The script's automated scrubs cover the common cases. The checklist below catches the rest.

6. **Commit only the redacted copies:**

   ```bash
   git add tests/fixtures/*.json     # not raw/
   git commit -m "chore: add sonarcloud fixtures"
   ```

7. Open a PR. Reviewers should be able to confirm at a glance that no real PII or secrets leaked through.

## Manual redaction checklist

Run this checklist on every fixture before committing — and again after any re-capture.

- [ ] **Author / assignee usernames and emails.** In `issues-search.json`, fields like `assignee`, `author`, `comments[].author`. Replace with fictitious values (`octocat`, `dev@acme.test`).
- [ ] **Avatar URLs.** Often encode user IDs. In `organizations-search.json` the `avatar` field, possibly elsewhere. Replace the host or remove the field entirely.
- [ ] **Issue comment text.** `comments[].htmlText` may contain user-written prose, including incident references, customer names, or personal context. Read every comment string before committing.
- [ ] **Branch names.** A branch name like `release/2026.q2-customer-acme` reveals more than just the branch convention. Generalize to `release/2026.q2` or similar.
- [ ] **File paths.** Usually fine, but a path like `src/internal-only/proprietary-billing/` reveals proprietary structure. Generalize folder names.
- [ ] **Token-like strings.** Quick grep:

  ```bash
  grep -E 'squ_|sqp_|[a-f0-9]{40}\b' tests/fixtures/*.json
  ```

  No hits is the only acceptable answer. If anything matches, find out why (echo of an error response? a field you didn't expect?) and remove.

- [ ] **Project descriptions or `description` fields** — sometimes carry copy-pasted READMEs. Truncate or replace.
- [ ] **`alm` / `subscription` fields** in `organizations-search.json` — verify the values are the public-doc ones (`FREE` / `PAID`), not anything customer-specific.

If you find yourself thinking "this is probably fine," err the other way and sanitize. The cost of an over-cautious fixture is zero; the cost of leaking one piece of PII into a public OSS repo is higher.

## Re-capture

If SonarCloud's V1 schema evolves or we add a new endpoint:

1. Re-run the script. Existing redacted fixtures are overwritten.
2. Re-run the redaction checklist.
3. The PR diff makes schema drift visible — that is the entire point. Reviewers can spot a new field, a renamed field, or a removed field at a glance.

## File index

| Fixture                            | Endpoint                                              | Used by (planned)                      |
| ---------------------------------- | ----------------------------------------------------- | -------------------------------------- |
| `organizations-search.json`        | `GET /api/organizations/search?member=true`           | `SonarClient.listOrganizations`        |
| `projects-search.json`             | `GET /api/projects/search?organization=...`           | `SonarClient.listProjects`             |
| `project-branches-list.json`       | `GET /api/project_branches/list?project=...`          | `SonarClient.listBranches`             |
| `issues-search.json`               | `GET /api/issues/search?componentKeys=...&branch=...` | `SonarClient.searchIssues` happy path  |
| `issues-search-blocker.json`       | same with `severities=BLOCKER`                        | `SonarClient.searchIssues` filter test |
| `hotspots-search.json`             | `GET /api/hotspots/search?projectKey=...`             | `SonarClient.searchHotspots`           |
| `qualitygates-project-status.json` | `GET /api/qualitygates/project_status?...`            | `SonarClient.getQualityGate`           |
| `measures-component.json`          | `GET /api/measures/component?...`                     | `SonarClient.getMeasures`              |

Phase-specific fixtures (over-cap response, error variants, etc.) are added as the corresponding test files arrive in later phases.
