#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# Captures real SonarCloud V1 responses into tests/fixtures/ for use by the
# MSW handlers in the test suite. Run once by the maintainer; output is
# committed to the repo. See tests/fixtures/README.md for the full procedure.
#
# Required env vars:
#   SONAR_TOKEN     — SonarCloud user token (sonarcloud.io/account/security).
#                     NEVER commit this. NEVER paste this anywhere public.
#   SONAR_ORG       — real organization key whose data to capture.
#   SONAR_PROJECT   — real project key in that org (typically <org>_<repo>).
#
# Optional env vars:
#   SONAR_BRANCH       — default: auto-detected (main branch from project_branches/list).
#   SONAR_PROJECT_NAME — default: auto-detected (display name from projects/search).
#                        Substituted to "widget-service" in fixtures so the bare
#                        project name doesn't leak through file paths.
#   SONAR_REGION       — "eu" (default) or "us".
#
# Output:
#   tests/fixtures/raw/        real responses, gitignored, for diff review.
#   tests/fixtures/*.json      copies with org / project / PII fields scrubbed
#                              to fictitious values from SPEC §16.7. Ready for
#                              human review and commit.
#
# Behavior on per-endpoint failure: log and continue. The summary at the end
# lists what succeeded and what failed so re-runs aren't needed for known
# missing endpoints (e.g. a project without security analysis won't have
# hotspots data; that's a "skip", not a "fix me").
#
# Dependencies: bash, curl, jq.

set -uo pipefail

: "${SONAR_TOKEN:?Set SONAR_TOKEN to a SonarCloud user token from sonarcloud.io/account/security}"
: "${SONAR_ORG:?Set SONAR_ORG to your real organization key}"
: "${SONAR_PROJECT:?Set SONAR_PROJECT to a project key in that org}"
SONAR_REGION="${SONAR_REGION:-eu}"

if ! command -v jq >/dev/null 2>&1; then
  echo "Required: jq (sudo dnf install jq / apt-get install jq / brew install jq)" >&2
  exit 2
fi

case "$SONAR_REGION" in
  eu) BASE="https://sonarcloud.io/api" ;;
  us) BASE="https://sonarqube.us/api" ;;
  *)
    echo "SONAR_REGION must be 'eu' or 'us' (got: $SONAR_REGION)" >&2
    exit 2
    ;;
esac

# Fictitious values that committed fixtures use (per SPEC §16.7).
FAKE_ORG="acme"
FAKE_PROJECT="acme_widget-service"
FAKE_PROJECT_NAME="widget-service"
FAKE_AUTHOR_NAME="Octo Cat"
FAKE_AUTHOR_LOGIN="octocat@github"
FAKE_AUTHOR_EMAIL="octocat@example.com"
FAKE_AVATAR="00000000000000000000000000000000"
FAKE_SHA="0000000000000000000000000000000000000000"
FAKE_UUID="00000000-0000-0000-0000-000000000000"
FAKE_BRANCH_UUID_V1="AAAAAAAAAAAAAAAAAAAA"

RAW_DIR="tests/fixtures/raw"
FIX_DIR="tests/fixtures"
mkdir -p "$RAW_DIR"

# Scratch file for the substring substitution; we then run jq for the
# field-targeted scrubs on top.
SED_TMP="$(mktemp)"
trap 'rm -f "$SED_TMP"' EXIT

declare -a OK_FIXTURES=()
declare -a FAILED_FIXTURES=()

curl_get() {
  local url="$1" out="$2"
  curl -fsS --max-time 30 \
    -H "Authorization: Bearer $SONAR_TOKEN" \
    -H "Accept: application/json" \
    -o "$out" "$url"
  return $?
}

# Auto-detect default branch unless caller pinned one.
if [[ -z "${SONAR_BRANCH:-}" ]]; then
  branches_probe="$(mktemp)"
  if curl_get "$BASE/project_branches/list?project=$SONAR_PROJECT" "$branches_probe" 2>/dev/null; then
    SONAR_BRANCH="$(jq -r '.branches[] | select(.isMain==true) | .name' "$branches_probe" | head -n1)"
  fi
  rm -f "$branches_probe"
  SONAR_BRANCH="${SONAR_BRANCH:-main}"
  branch_source="auto-detected"
else
  branch_source="from SONAR_BRANCH"
fi

# Auto-detect the project's display name (distinct from the project key).
# Substring-substituted in the captured fixtures so the bare project name
# doesn't leak through file paths, projectName fields, etc.
if [[ -z "${SONAR_PROJECT_NAME:-}" ]]; then
  projects_probe="$(mktemp)"
  if curl_get "$BASE/projects/search?organization=$SONAR_ORG&ps=500" "$projects_probe" 2>/dev/null; then
    SONAR_PROJECT_NAME="$(jq -r --arg key "$SONAR_PROJECT" '.components[] | select(.key==$key) | .name' "$projects_probe" | head -n1)"
  fi
  rm -f "$projects_probe"
  project_name_source="auto-detected"
else
  project_name_source="from SONAR_PROJECT_NAME"
fi

echo "Capture target:"
echo "  region        = $SONAR_REGION ($BASE)"
echo "  org           = $SONAR_ORG → '$FAKE_ORG'"
echo "  project key   = $SONAR_PROJECT → '$FAKE_PROJECT'"
if [[ -n "$SONAR_PROJECT_NAME" && "$SONAR_PROJECT_NAME" != "$SONAR_PROJECT" ]]; then
  echo "  project name  = $SONAR_PROJECT_NAME → '$FAKE_PROJECT_NAME' ($project_name_source)"
else
  echo "  project name  = (none distinct from key)"
fi
echo "  branch        = $SONAR_BRANCH ($branch_source)"
echo ""
echo "Output:"
echo "  raw       → $RAW_DIR/        (gitignored, for diff review)"
echo "  redacted  → $FIX_DIR/*.json  (commit these after review)"
echo ""

# Field-targeted PII scrub. Walks the JSON tree and rewrites any matching
# key's value, regardless of where it appears. Keep this list synced with
# tests/fixtures/README.md "Manual redaction checklist".
jq_scrub() {
  # Walks the JSON tree and rewrites known-sensitive structured fields
  # (people identifiers, gravatar hashes, git SHAs, internal UUIDs).
  #
  # Intentionally NOT scrubbed automatically:
  #   - free-text strings (issue messages, comment htmlText, commit
  #     messages, project descriptions). These can carry context that
  #     needs human judgement; the README's manual checklist covers
  #     them. False positives here would corrupt fixture realism
  #     (e.g. rewriting `issue.message` "Refactor this function..."
  #     would defeat the point of having a real fixture).
  jq --arg name "$FAKE_AUTHOR_NAME" \
     --arg login "$FAKE_AUTHOR_LOGIN" \
     --arg email "$FAKE_AUTHOR_EMAIL" \
     --arg avatar "$FAKE_AVATAR" \
     --arg sha "$FAKE_SHA" \
     --arg uuid "$FAKE_UUID" \
     --arg branchUuidV1 "$FAKE_BRANCH_UUID_V1" \
     '
     def scrub:
       walk(
         if type == "object" then
           with_entries(
             # Commit-style author object: nested fields handled inline.
             if   .key == "author"        and (.value | type) == "object"
               then .value |= (
                 (if has("name")   then .name   = $name   else . end)
                 | (if has("login")  then .login  = $login  else . end)
                 | (if has("avatar") then .avatar = $avatar else . end)
               )
             # Issue-style author: a flat string (typically an email).
             elif .key == "author"            and (.value | type) == "string" then .value = $email
             elif .key == "assignee"          then .value = $login
             elif .key == "authorLogin"       then .value = $login
             elif .key == "avatar"            then .value = $avatar
             elif .key == "sha"               then .value = $sha
             elif .key == "revision"          then .value = $sha
             elif .key == "branchId"          then .value = $uuid
             elif .key == "branchUuidV1"      then .value = $branchUuidV1
             # Catch-all for *Uuid-suffixed and bare uuid fields. Handled
             # last so the more specific branch* rules above win.
             elif (.key | tostring) | test("[Uu]uid$") then .value = $uuid
             else .
             end
           )
         else .
         end
       );
     scrub
     '
  return $?
}

capture() {
  local name="$1" path="$2"
  local raw="$RAW_DIR/${name}.json"
  local out="$FIX_DIR/${name}.json"

  if ! curl_get "$BASE$path" "$raw"; then
    echo "  ✗ $name failed (HTTP error or timeout)" >&2
    FAILED_FIXTURES+=("$name")
    return 1
  fi

  # 1. Substring substitution: real org / project key / project display
  #    name → fictitious. Order matters:
  #      a) project key first (longest, typically contains the org key)
  #      b) bare project name next (catches projectName, file paths)
  #      c) org last (shortest)
  #    The project-name pass only runs if the API gave us a name distinct
  #    from the key, otherwise it would be a no-op or could over-match.
  local -a sed_args=(-e "s|$SONAR_PROJECT|$FAKE_PROJECT|g")
  if [[ -n "$SONAR_PROJECT_NAME" && "$SONAR_PROJECT_NAME" != "$SONAR_PROJECT" ]]; then
    sed_args+=(-e "s|$SONAR_PROJECT_NAME|$FAKE_PROJECT_NAME|g")
  fi
  sed_args+=(-e "s|$SONAR_ORG|$FAKE_ORG|g")
  sed "${sed_args[@]}" "$raw" > "$SED_TMP"

  # 2. jq scrub: known-sensitive fields by name (author, sha, uuids, …).
  if ! jq_scrub < "$SED_TMP" > "$out"; then
    echo "  ✗ $name failed (jq scrub error)" >&2
    FAILED_FIXTURES+=("$name")
    return 1
  fi

  printf '  ✓ %-36s %6d bytes (raw) → %6d bytes (redacted)\n' \
    "$name" "$(wc -c < "$raw")" "$(wc -c < "$out")"
  OK_FIXTURES+=("$name")
}

capture "organizations-search" \
        "/organizations/search?member=true&ps=10" || true

capture "projects-search" \
        "/projects/search?organization=$SONAR_ORG&ps=20" || true

capture "project-branches-list" \
        "/project_branches/list?project=$SONAR_PROJECT" || true

capture "issues-search" \
        "/issues/search?componentKeys=$SONAR_PROJECT&branch=$SONAR_BRANCH&ps=50" || true

capture "issues-search-blocker" \
        "/issues/search?componentKeys=$SONAR_PROJECT&branch=$SONAR_BRANCH&severities=BLOCKER&ps=50" || true

capture "hotspots-search" \
        "/hotspots/search?projectKey=$SONAR_PROJECT&branch=$SONAR_BRANCH&ps=50" || true

capture "qualitygates-project-status" \
        "/qualitygates/project_status?projectKey=$SONAR_PROJECT&branch=$SONAR_BRANCH" || true

capture "measures-component" \
        "/measures/component?component=$SONAR_PROJECT&branch=$SONAR_BRANCH&metricKeys=coverage,duplicated_lines_density,ncloc,complexity,security_rating,reliability_rating,sqale_rating" || true

echo ""
echo "Summary: ${#OK_FIXTURES[@]} captured, ${#FAILED_FIXTURES[@]} failed."
if (( ${#FAILED_FIXTURES[@]} > 0 )); then
  echo "Failed: ${FAILED_FIXTURES[*]}" >&2
  echo "Common causes: project has no data for that endpoint (e.g. no security" >&2
  echo "analysis → no hotspots), branch name mismatch, or a stale endpoint." >&2
fi
echo ""
echo "Next steps:"
echo "  1. Review the manual redaction checklist in tests/fixtures/README.md."
echo "  2. Diff $RAW_DIR/ vs $FIX_DIR/ to confirm only the expected fields"
echo "     changed and that no emails, comment text, or descriptions leaked"
echo "     through unchanged."
echo "  3. Sanitize anything else by hand."
echo "  4. \`git add tests/fixtures/*.json\` (NOT raw/) and commit with"
echo "     \`chore: add sonarcloud fixtures\`."
