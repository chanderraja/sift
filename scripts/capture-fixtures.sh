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
#   SONAR_PROJECT   — real project key in that org.
#
# Optional env vars:
#   SONAR_BRANCH    — default "main"
#   SONAR_REGION    — "eu" (default) or "us"
#
# Output:
#   tests/fixtures/raw/        real responses, gitignored, for diff review.
#   tests/fixtures/*.json      copies with org/project keys substituted to
#                              the fictitious values from SPEC §16.7. Ready
#                              for human review and commit.

set -euo pipefail

: "${SONAR_TOKEN:?Set SONAR_TOKEN to a SonarCloud user token from sonarcloud.io/account/security}"
: "${SONAR_ORG:?Set SONAR_ORG to your real organization key}"
: "${SONAR_PROJECT:?Set SONAR_PROJECT to a project key in that org}"
SONAR_BRANCH="${SONAR_BRANCH:-main}"
SONAR_REGION="${SONAR_REGION:-eu}"

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

RAW_DIR="tests/fixtures/raw"
FIX_DIR="tests/fixtures"
mkdir -p "$RAW_DIR"

echo "Capture target:"
echo "  region   = $SONAR_REGION ($BASE)"
echo "  org      = $SONAR_ORG     → fixtures will use '$FAKE_ORG'"
echo "  project  = $SONAR_PROJECT → fixtures will use '$FAKE_PROJECT'"
echo "  branch   = $SONAR_BRANCH"
echo ""
echo "Output:"
echo "  raw       → $RAW_DIR/        (gitignored, for diff review)"
echo "  redacted  → $FIX_DIR/*.json  (commit these after review)"
echo ""

capture() {
  local name="$1" path="$2"
  local raw="$RAW_DIR/${name}.json"
  local out="$FIX_DIR/${name}.json"

  # -f makes curl exit non-zero on 4xx/5xx; -sS keeps it quiet but still
  # surfaces errors; --max-time 30 caps a hung connection.
  if ! curl -fsS --max-time 30 \
       -H "Authorization: Bearer $SONAR_TOKEN" \
       -H "Accept: application/json" \
       -o "$raw" \
       "$BASE$path"; then
    echo "  ✗ $name failed (HTTP error or timeout)"
    return 1
  fi

  # Substring substitution. Project keys typically start with the org key
  # ("acme_widget-service" starts with "acme"), so substitute the longer
  # match first to avoid stomping on the org-substituted prefix.
  sed -e "s|$SONAR_PROJECT|$FAKE_PROJECT|g" \
      -e "s|$SONAR_ORG|$FAKE_ORG|g" \
      "$raw" > "$out"

  printf '  ✓ %-36s %6d bytes (raw) → %6d bytes (redacted)\n' \
    "$name" "$(wc -c < "$raw")" "$(wc -c < "$out")"
}

capture "organizations-search" \
        "/organizations/search?member=true&ps=10"

capture "projects-search" \
        "/projects/search?organization=$SONAR_ORG&ps=20"

capture "project-branches-list" \
        "/project_branches/list?project=$SONAR_PROJECT"

capture "issues-search" \
        "/issues/search?componentKeys=$SONAR_PROJECT&branch=$SONAR_BRANCH&ps=50"

capture "issues-search-blocker" \
        "/issues/search?componentKeys=$SONAR_PROJECT&branch=$SONAR_BRANCH&severities=BLOCKER&ps=50"

capture "hotspots-search" \
        "/hotspots/search?projectKey=$SONAR_PROJECT&branch=$SONAR_BRANCH&ps=50"

capture "qualitygates-project-status" \
        "/qualitygates/project_status?projectKey=$SONAR_PROJECT&branch=$SONAR_BRANCH"

capture "measures-component" \
        "/measures/component?component=$SONAR_PROJECT&branch=$SONAR_BRANCH&metricKeys=coverage,duplicated_lines_density,ncloc,complexity,security_rating,reliability_rating,sqale_rating"

echo ""
echo "Capture complete. Next steps:"
echo "  1. Review the manual redaction checklist in tests/fixtures/README.md."
echo "  2. Diff $RAW_DIR/ vs $FIX_DIR/ to confirm only org/project names changed,"
echo "     and that no emails, avatar URLs, branch names, or comment text"
echo "     leaked through unchanged."
echo "  3. Sanitize anything else by hand."
echo "  4. \`git add tests/fixtures/*.json\` (NOT raw/) and commit with"
echo "     \`chore: add sonarcloud fixtures\`."
