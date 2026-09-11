#!/usr/bin/env bash
# .web-vitals-run.sh — full Core Web Vitals capture for PRD-C006 / PRD-C149.
#
# Usage (orchestrator sets all env vars before calling this):
#   DATABASE_URL=<scratch-url> \
#   APP_DATABASE_URL=<scratch-app-role-url> \
#   SEED_USER_ID=<uuid-of-seeded-owner> \
#   SEED_USER_EMAIL=<email-of-seeded-owner> \
#   bash frontend/.web-vitals-run.sh
#
# Required env by caller:
#   DATABASE_URL         Neon scratch branch (postgres owner URL); must contain "scratch" in hostname.
#   APP_DATABASE_URL     Neon scratch branch (app-role URL, RLS-enforced); same hostname rule.
#   SEED_USER_ID         UUID of a seeded org owner in the scratch DB.
#   SEED_USER_EMAIL      Email of that owner.
#   NEXTAUTH_SECRET      NextAuth signing secret (matches backend JWT secret).
#                        Falls back to the value in frontend/.env if not set here.
#
# Optional overrides:
#   BACKEND_PORT         Default: 1500
#   FRONTEND_PORT        Default: 1000
#   NEXT_PUBLIC_API_URL  Default: http://localhost:<BACKEND_PORT>
#   VITALS_ROUTES        Comma-separated route list. Default: all budgeted routes from the manifest.
#   VITALS_REPEAT        Number of samples per route/profile. Default: 5 (full run: 10).
#   BROWSER_PATH         Explicit browser binary. Default: auto-detected from BROWSER_CANDIDATES.
#
# NEVER prints DATABASE_URL, APP_DATABASE_URL, NEXTAUTH_SECRET, or the cookie value.

set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR"
BACKEND_DIR="$(cd "$FRONTEND_DIR/../backend" && pwd)"
RESULTS="$FRONTEND_DIR/.browser-driver-results.json"
COOKIE_FILE="$FRONTEND_DIR/.capture-cookie"

# ──────────────────────────────────────────────────────────────────────────────
# Tunable parameters
# ──────────────────────────────────────────────────────────────────────────────
BACKEND_PORT="${BACKEND_PORT:-1500}"
FRONTEND_PORT="${FRONTEND_PORT:-1000}"
BACKEND_URL="http://localhost:$BACKEND_PORT"
FRONTEND_URL="http://localhost:$FRONTEND_PORT"
API_URL="${NEXT_PUBLIC_API_URL:-$BACKEND_URL}"

# All routes with budgets in contracts/route-bundle-manifest.json (file:line 791, default overridable).
# This is the C149 in-scope set — every route in the manifest, not just the script default three.
VITALS_ROUTES="${VITALS_ROUTES:-/mail,/inbox,/build/inbox,/crm/inbox,/support/inbox,/dashboard,/chat,/calendar,/notifications,/settings,/build/my-work,/crm/leads,/parties}"
VITALS_REPEAT="${VITALS_REPEAT:-5}"
BROWSER_PATH="${BROWSER_PATH:-}"

# ──────────────────────────────────────────────────────────────────────────────
# Loud-failure helpers
# ──────────────────────────────────────────────────────────────────────────────
die() {
  echo ""
  echo "PREREQ FAIL: $*" >&2
  exit 1
}

step() {
  echo ""
  echo "=== $* ==="
}

# ──────────────────────────────────────────────────────────────────────────────
# Prerequisite: check required env vars (without printing secrets)
# ──────────────────────────────────────────────────────────────────────────────
step "Checking required environment variables"

[[ -n "${DATABASE_URL:-}" ]]     || die "DATABASE_URL is not set — orchestrator must supply a scratch Neon URL"
[[ -n "${APP_DATABASE_URL:-}" ]] || die "APP_DATABASE_URL is not set — orchestrator must supply a scratch app-role Neon URL"
[[ -n "${SEED_USER_ID:-}" ]]     || die "SEED_USER_ID is not set — UUID of the seeded org owner in the scratch DB"
[[ -n "${SEED_USER_EMAIL:-}" ]]  || die "SEED_USER_EMAIL is not set — email of the seeded org owner"

# Resolve NEXTAUTH_SECRET: caller may set it, or it lives in frontend/.env.
# The minter (mint-session-cookie.mjs) reads process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET.
# If neither is in env here, run with --env-file=.env so Node loads the file itself.
if [[ -z "${NEXTAUTH_SECRET:-}" ]] && [[ -z "${AUTH_SECRET:-}" ]]; then
  if [[ ! -f "$FRONTEND_DIR/.env" ]]; then
    die "NEXTAUTH_SECRET (or AUTH_SECRET) is not set and frontend/.env does not exist — the cookie minter cannot sign a token"
  fi
  echo "NEXTAUTH_SECRET not in env — the minter will read it from frontend/.env via --env-file"
  MINT_ENV_FILE_FLAG="--env-file=$FRONTEND_DIR/.env"
else
  MINT_ENV_FILE_FLAG=""
fi

# ──────────────────────────────────────────────────────────────────────────────
# Prerequisite: validate that both DB URLs reference a scratch database.
# Neon scratch branches embed the branch name in the endpoint hostname, e.g.
#   ep-<branch-name>-<hash>.<region>.aws.neon.tech
# The orchestrator is required to use a branch whose name contains "scratch".
# We parse only the hostname (never the full URL) to keep the password out of logs.
# ──────────────────────────────────────────────────────────────────────────────
step "Validating scratch database names"

extract_hostname() {
  node -e "
    try {
      const raw = process.argv[1];
      // postgresql:// URLs need the scheme normalised for URL parsing.
      const url = new URL(raw.replace(/^postgres(ql)?:\/\//, 'https://'));
      process.stdout.write(url.hostname);
    } catch {
      process.stderr.write('cannot parse URL');
      process.exit(1);
    }
  " "$1"
}

DB_HOST=$(extract_hostname "$DATABASE_URL")     || die "DATABASE_URL is not a valid URL"
APP_DB_HOST=$(extract_hostname "$APP_DATABASE_URL") || die "APP_DATABASE_URL is not a valid URL"

if [[ "$DB_HOST" != *scratch* ]] && [[ "$DB_HOST" != *SCRATCH* ]]; then
  die "DATABASE_URL hostname '$DB_HOST' does not contain 'scratch' — refusing to run against a non-scratch database. Supply a Neon scratch branch URL."
fi
if [[ "$APP_DB_HOST" != *scratch* ]] && [[ "$APP_DB_HOST" != *SCRATCH* ]]; then
  die "APP_DATABASE_URL hostname '$APP_DB_HOST' does not contain 'scratch' — refusing to run against a non-scratch database."
fi
echo "DATABASE_URL    -> $DB_HOST  [scratch OK]"
echo "APP_DATABASE_URL -> $APP_DB_HOST  [scratch OK]"

# ──────────────────────────────────────────────────────────────────────────────
# Prerequisite: check Node and pnpm are available
# ──────────────────────────────────────────────────────────────────────────────
step "Checking toolchain"

command -v node  >/dev/null 2>&1 || die "node is not on PATH"
command -v pnpm  >/dev/null 2>&1 || die "pnpm is not on PATH"
command -v curl  >/dev/null 2>&1 || die "curl is not on PATH (needed for health-check polling)"

NODE_MAJOR=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
if (( NODE_MAJOR < 20 )); then
  die "Node.js >= 20 is required (--env-file flag, Intl, etc). Found: $(node --version)"
fi
echo "node $(node --version), pnpm $(pnpm --version)"

# ──────────────────────────────────────────────────────────────────────────────
# Prerequisite: verify browser
# ──────────────────────────────────────────────────────────────────────────────
step "Locating browser"

BROWSER_CANDIDATES=(
  "C:/Program Files/Google/Chrome/Application/chrome.exe"
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "/usr/bin/google-chrome"
  "/usr/bin/chromium"
)

if [[ -n "$BROWSER_PATH" ]]; then
  [[ -f "$BROWSER_PATH" ]] || die "Explicit --browser path '$BROWSER_PATH' does not exist"
  RESOLVED_BROWSER="$BROWSER_PATH"
else
  RESOLVED_BROWSER=""
  for candidate in "${BROWSER_CANDIDATES[@]}"; do
    if [[ -f "$candidate" ]]; then
      RESOLVED_BROWSER="$candidate"
      break
    fi
  done
  [[ -n "$RESOLVED_BROWSER" ]] || die "No browser found. Set BROWSER_PATH to one of: ${BROWSER_CANDIDATES[*]}"
fi
echo "browser: $RESOLVED_BROWSER"

# ──────────────────────────────────────────────────────────────────────────────
# Signal guard — tear down both servers on any exit including failure
# ──────────────────────────────────────────────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  local code=$?
  echo ""
  echo "--- teardown ---"
  if [[ -n "$FRONTEND_PID" ]]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
    echo "frontend stopped (pid $FRONTEND_PID)"
  fi
  if [[ -n "$BACKEND_PID" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    echo "backend stopped (pid $BACKEND_PID)"
  fi
  # Remove the cookie file so it is not accidentally re-used in a future run
  # against a different database with a different token secret.
  rm -f "$COOKIE_FILE"
  echo "cookie file removed"
  exit "$code"
}
trap cleanup EXIT INT TERM

# ──────────────────────────────────────────────────────────────────────────────
# Health-check poller — polls until the URL responds 2xx or timeout expires.
# Never sleeps blindly: it retries every 2s so the total wait is bounded.
# ──────────────────────────────────────────────────────────────────────────────
wait_for_url() {
  local url="$1" label="$2" timeout="${3:-120}"
  local deadline=$(( SECONDS + timeout ))
  echo "waiting for $label at $url (up to ${timeout}s) …"
  while [[ $SECONDS -lt $deadline ]]; do
    if curl -sf --max-time 3 "$url" >/dev/null 2>&1; then
      echo "$label is ready"
      return 0
    fi
    sleep 2
  done
  die "$label did not respond within ${timeout}s — check that $url is reachable and the process did not crash"
}

# ──────────────────────────────────────────────────────────────────────────────
# 1. Start backend
#    The backend reads PORT from env (default 1500) and DATABASE_URL / APP_DATABASE_URL.
#    Health endpoints: GET /health, GET /health/ready, GET /health/db
#    (hand-rolled in src/health/health.controller.ts — @nestjs/terminus is NOT installed).
# ──────────────────────────────────────────────────────────────────────────────
step "Starting backend"

(
  cd "$BACKEND_DIR"
  export DATABASE_URL APP_DATABASE_URL
  export PORT="$BACKEND_PORT"
  # Pass through any additional backend secrets the orchestrator set in env
  pnpm start 2>&1
) &
BACKEND_PID=$!

wait_for_url "$BACKEND_URL/health/ready" "backend" 180

# ──────────────────────────────────────────────────────────────────────────────
# 2. Build frontend (production)
#    NEXT_PUBLIC_API_URL is inlined into the JS bundle at BUILD TIME.
#    It must be set here to the URL the backend will actually be reached at —
#    it cannot be changed at next-start time. The value baked here determines
#    what the browser calls "first party" for resource classification.
# ──────────────────────────────────────────────────────────────────────────────
step "Building frontend (production)"

(
  cd "$FRONTEND_DIR"
  # BUILD-TIME: NEXT_PUBLIC_API_URL is inlined here. Must match the running backend.
  export NEXT_PUBLIC_API_URL="$API_URL"
  export NEXTAUTH_URL="$FRONTEND_URL"
  # next build reads .env automatically; exporting here ensures the scratch API
  # URL overrides any stale value in .env.
  pnpm build 2>&1
)
echo "frontend build complete"

# ──────────────────────────────────────────────────────────────────────────────
# 3. Start frontend (production)
#    next start is the ONLY mode that produces serverMode="production" in the
#    capture. next dev compiles on demand and skips RSC/bundle optimisations —
#    check-web-vitals-budget.mjs hard-fails on serverMode != "production".
#    PORT must be set here; next start has no -p default for this package.
# ──────────────────────────────────────────────────────────────────────────────
step "Starting frontend (production server)"

(
  cd "$FRONTEND_DIR"
  export PORT="$FRONTEND_PORT"
  # RUN-TIME: NEXT_PUBLIC_* vars are already compiled in — re-exporting is
  # harmless but does NOT change what the browser bundle sees.
  export NEXTAUTH_URL="$FRONTEND_URL"
  pnpm start 2>&1
) &
FRONTEND_PID=$!

# Poll the root path; any 2xx means the server is up and serving.
wait_for_url "$FRONTEND_URL" "frontend" 90

# ──────────────────────────────────────────────────────────────────────────────
# 4. Mint session cookie
#    mint-session-cookie.mjs encodes a NextAuth JWT without touching the DB.
#    The running app's session callback re-fetches role/org/plan on every
#    request by token.id, so the minted identity MUST exist in the scratch DB.
#    Required: SEED_USER_ID (UUID), SEED_USER_EMAIL, NEXTAUTH_SECRET or AUTH_SECRET.
#    Output: .capture-cookie — the raw authjs.session-token value (not printed here).
# ──────────────────────────────────────────────────────────────────────────────
step "Minting session cookie"

(
  cd "$FRONTEND_DIR"
  # shellcheck disable=SC2086
  node $MINT_ENV_FILE_FLAG scripts/mint-session-cookie.mjs \
    --user-id="$SEED_USER_ID" \
    --email="$SEED_USER_EMAIL" \
    --out="$COOKIE_FILE"
)

[[ -s "$COOKIE_FILE" ]] || die "Cookie minter ran but wrote an empty file — check NEXTAUTH_SECRET and try again"
echo "session cookie minted and written to .capture-cookie"
# Deliberately do NOT print the cookie value.

# ──────────────────────────────────────────────────────────────────────────────
# 5. Measure web vitals
#    Launches a headless Chrome via CDP. Measures both desktop and mobile profiles.
#    Writes .browser-driver-results.json in the frontend directory.
#    Exits 1 if any sample is unusable, off-route or unauthorized.
# ──────────────────────────────────────────────────────────────────────────────
step "Measuring Core Web Vitals (this takes several minutes)"

(
  cd "$FRONTEND_DIR"
  node scripts/measure-web-vitals.mjs \
    --base-url="$FRONTEND_URL" \
    --routes="$VITALS_ROUTES" \
    --cookie-file="$COOKIE_FILE" \
    --first-party-origins="$API_URL" \
    --repeat="$VITALS_REPEAT" \
    --browser="$RESOLVED_BROWSER" \
    --out="$RESULTS"
)
echo "measurement written to $RESULTS"

# ──────────────────────────────────────────────────────────────────────────────
# 6. Run budget gate
#    Reads .browser-driver-results.json, checks all five budgets per route and
#    profile, checks evidence signals, checks provenance against .next/BUILD_ID.
#    Exit 0 = all budgets met.  Exit 1 = FAIL.  Exit 2 = INCONCLUSIVE.
# ──────────────────────────────────────────────────────────────────────────────
step "Checking web vitals budget"

(
  cd "$FRONTEND_DIR"
  node scripts/check-web-vitals-budget.mjs --results="$RESULTS"
)

echo ""
echo "=== WEB VITALS CAPTURE COMPLETE ==="
