# StreamlineOS API Load Tests

k6 load tests for **HR modules**, **Chat**, and **Recruitment hub** APIs.

## Prerequisites

1. **Install k6**

```bash
brew install k6
```

2. **Running app** (local or staging)

```bash
pnpm dev
```

3. **Demo data + credentials** (local)

```bash
pnpm seed:demo
```

4. **Load test secret** (recommended for local — bypasses rate limits)

Add to your root `.env`:

```bash
# Generate with: openssl rand -hex 32
LOAD_TEST_SECRET=your-local-secret-here
```

Ignored in production. k6 sends this as `X-Load-Test-Secret` automatically via `run.sh`.

## Quick start

```bash
# Pre-flight: verify every endpoint returns 2xx once
pnpm load-test:verify

# Smoke test (auth + 4 key endpoints)
pnpm load-test:smoke

# Individual suites
pnpm load-test:hr
pnpm load-test:recruitment
pnpm load-test:chat
pnpm load-test:all
```

All `load-test:*` scripts (except `session` and `verify`) auto-login via [`run.sh`](run.sh) and pass `SESSION_COOKIE` + `LOAD_TEST_SECRET` to k6.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `http://localhost:1000` | App origin (no `/api` suffix) |
| `LOAD_TEST_SECRET` | from `.env` | Bypasses rate limits in dev/staging |
| `LOAD_TEST_EMAIL` | demo owner email | Login email for session script |
| `LOAD_TEST_PASSWORD` | demo password | Login password for session script |
| `LOAD_PROFILE` | `smoke` | `baseline` \| `smoke` \| `load` \| `stress` |
| `REQUEST_PACE_MS` | auto | Override pacing sleep between requests |
| `WRITE_ENABLED` | `false` | Enable chat heartbeat/read POSTs |

### Profiles

| Profile | VUs | Duration | Use case |
|---|---|---|---|
| `baseline` | 1 | 45s | CI / single-endpoint verification |
| `smoke` | 1 → 2 | ~1 min | Quick sanity check |
| `load` | 10 → 25 | ~5 min | Normal capacity test |
| `stress` | 20 → 75 | ~7 min | Find breaking point |

```bash
LOAD_PROFILE=load pnpm load-test:recruitment
```

## What each suite covers

### HR modules (`hr-modules.js`)

One endpoint per iteration (46 endpoints rotated). Dashboard, employees, leaves, attendance, payroll, assets, analytics, etc.

### Recruitment hub (`recruitment-hub.js`)

One list + one detail endpoint per iteration. Stats, pipeline, jobs, candidates, interviews, SLA, scorecards, candidate detail tabs.

### Chat (`chat.js`)

Rotates channels, unread, presence, messages, poll, search. Skips channel-specific calls when user has no channels.

### All (`all.js`)

HR, recruitment, and chat scenarios. With `LOAD_TEST_SECRET` or `load`/`stress` profiles they run concurrently (staggered 0s / 20s / 40s). Otherwise they run **sequentially** (1 VU each) to respect rate limits.

## Auth

Session is obtained via fetch + NextAuth CSRF flow in [`get-session.ts`](get-session.ts) — no browser required.

Manual cookie (optional):

```bash
export SESSION_COOKIE="authjs.session-token=YOUR_VALUE"
```

## Safety

- **Read-only by default** — no candidates/jobs/messages created
- `WRITE_ENABLED=true` only enables chat heartbeat + mark-read
- **Never run `stress` against production** without approval
- `LOAD_TEST_SECRET` is **ignored in production** — rate limits still apply there

## Troubleshooting

| Issue | Fix |
|---|---|
| `SESSION_COOKIE is required` | Use `pnpm load-test:smoke` (uses `run.sh`) not raw `k6 run` |
| 401 on all requests | Cookie expired — re-run; check demo credentials |
| 403 on HR endpoints | User lacks permissions — use demo owner or HR admin |
| 429 failures | Set `LOAD_TEST_SECRET` in `.env` or use `LOAD_PROFILE=baseline` |
| `Server not reachable` | Start dev server: `pnpm dev` |
| k6 not found | `brew install k6` |

## Results

k6 summaries are saved to `scripts/load-tests/results/` when piped manually:

```bash
pnpm load-test:smoke 2>&1 | tee scripts/load-tests/results/smoke.txt
```
