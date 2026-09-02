# S8 / ticket 32 — health, readiness, shutdown, lease handoff

## Audit: what existed

`src/health/health.controller.ts` had four routes. `/health` was already shallow. `/health/ready`
ran `select 1` **on every probe** — no cache, no timeout, no dependency other than the database, and
a bare `{status:"ready"}`/503. `beforeApplicationShutdown` set an `isShuttingDown` flag and slept
5s; nothing refused new requests and nothing waited for in-flight ones. `/health/workflows` and
`/health/db` were internal-secret-gated diagnostics. Leases already existed and were sound:
`CronLeaseService` (Redis `SET NX EX` + Lua token-fenced release + heartbeat/last-error keys),
`outbox_events` (`IN_FLIGHT` + `lease_expires_at` reclaim), `workflow_runs` (CLAIMABLE reclaims an
expired lease). `forEachOrg` already gives every cron sweep explicit per-tenant context.

## Boxes closed (all 6), with proof

| Box | Proof |
|---|---|
| Liveness shallow / readiness dependency-aware, degraded + unready | `npx jest src/health --maxWorkers=2` → **7 suites, 62 tests passed**. Negative control: `databaseCheck.required = false` → **3 failed** |
| Probe must not amplify the outage | `readiness.service.spec.ts` 50 sequential + 50 concurrent probes → dependency checked **once**; `health.controller.spec.ts` 25 `ready()` calls → `execute` called **1×**. Negative control: cache hit replaced with `if (false)` → **5 failed** |
| Graceful shutdown drains, stops accepting first | `npx jest src/health/shutdown-drain.spec.ts` → **4/4** over real HTTP (express + supertest). Negative control: `enter()` never refuses → **6 failed** |
| Worker leases hand off or expire safely | `npx jest src/modules/cron/cron-lease --maxWorkers=2` → **2 suites, 11 tests passed** |
| Sweeps iterate tenant context; retry/DLQ/cancellation exposed | `cron-group-a/b-tenant-isolation.spec.ts` → **38 passed**; `workflow-backlog.spec.ts` → **4/4** |
| Deployed probe / alert evidence deferred | Not attempted, not claimed |

Gates: `tsc --noEmit -p tsconfig.json` → **exit 0, 0 errors** on my files (see "not mine" below).
`eslint` on every file I touched → **clean**. `pnpm check:cycles` (madge) → **no circular dependency**.
`pnpm check:over-300` → none of my files exceed 300 lines.

## What I built

- **`ReadinessService`** — one evaluation per `READINESS_CACHE_TTL_MS` (default 5000) plus
  single-flight, so N concurrent probes cost one fanout; each check bounded by
  `READINESS_CHECK_TIMEOUT_MS` (default 2000) and reported `down` on the deadline.
- **Four checks.** `database` (required → unready), `cache` (Redis ping + `droppedInvalidationCount`
  → degraded, because a miss still falls through to the database), `queue` (reads the cron
  dead-man heartbeat `cron:heartbeat:outbox-events-worker` — no database round trip, no RLS
  problem), `providers` (reads `sharedProviderBreaker` **without half-opening it**, so a probe
  never spends a provider's recovery attempt; declared via `READINESS_REQUIRED_PROVIDERS`).
- **`shutdownState` + `shutdownGate`.** `beginDrain` (readiness 503, workers stop claiming) →
  `SHUTDOWN_SETTLING_DELAY_MS` so the LB deregisters → `stopAccepting` (503 + `Retry-After` +
  `Connection: close`, `/health*` still open) → wait for quiescence bounded by
  `SHUTDOWN_DRAIN_TIMEOUT_MS`. This all sits in `beforeApplicationShutdown`, which Nest completes
  before `DrizzleModule.onApplicationShutdown` closes the pool.
- **Lease handoff.** `CronLeaseService.withLease` returns `{ ran: false }` while draining, before
  Redis is consulted — the lease is never taken, so the work stays claimable and the next tick
  resumes it whole rather than a half-batch being abandoned.

## P1 found and fixed — `/health/workflows` was a dead stall detector

`drainBacklog(db)` ran a cross-tenant `count(*)` on `workflow_runs`. That table carries
`tenant_isolation` RLS (`migrations/0591_tenant_isolation_for_unprotected_tables.sql:1045`,
`organization_id = app.current_org_id()`), and `createTenantAwareDb` falls through to the pool when
there is no tenant context, so the predicate is NULL and the count is **always 0**. `due: 0`,
`oldestDueSeconds: null`, and the "nothing is calling /cron/workflow-tick" hint could never fire.
Replaced by `src/health/workflow-backlog.ts`, which aggregates inside `forEachOrg` and also
surfaces `retrying`, `deadLettered`, `cancelled` and `leased`.

## Files changed (all absolute paths under BE = `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend`)

Created: `BE/src/health/readiness.types.ts`, `readiness.config.ts`, `readiness.service.ts`,
`dependency-checks.ts`, `shutdown-state.ts`, `shutdown-gate.ts`, `workflow-backlog.ts`, and specs
`readiness.service.spec.ts`, `dependency-checks.spec.ts`, `shutdown-state.spec.ts`,
`shutdown-gate.spec.ts`, `shutdown-drain.spec.ts`, `workflow-backlog.spec.ts`; plus
`BE/src/modules/cron/cron-lease-shutdown.spec.ts`.

Modified: `BE/src/health/health.controller.ts`, `BE/src/health/health.controller.spec.ts`,
`BE/src/modules/cron/cron-lease.service.ts` (one import + a draining guard at the top of
`withLease`), `BE/src/common/outbound/provider-circuit-breaker.ts` (additive, read-only
`openProviders(now)`), `BE/README.md` (health endpoints + env table),
`FEROOT/.scratch/code-release-10-10/issues/32-health-readiness-and-shutdown.md`.

**`main.ts` — exactly two lines**, both away from the CORS block ticket 17 owns:
`import { shutdownGate } from "./health/shutdown-gate";` beside the other imports, and
`app.use(shutdownGate);` immediately after the existing `app.enableShutdownHooks();`.
`app.module.ts` was **not** touched — `DrizzleModule`, `CacheModule` and `AdmissionModule` are all
`@Global`, so the controller's new `REDIS` and `CacheService` dependencies resolve as-is.

## Not mine — for the orchestrator

- **Backend `tsc` is red with 3 errors, none in my territory:**
  `src/common/auth/jwt-keyring.service.ts(34,9)` TS2741 `kty` missing on `JWK`, and (43,47) TS7053
  twice. Baseline at session start was 0, so this is a concurrent agent's regression.
- `pnpm check:over-300` → **397 files, 3 above the 394 baseline**; none are mine.
- `pnpm check:unbounded-reads` → **FAIL, 1 unclassified path**:
  `src/modules/gdpr/gdpr-rectification.service.ts:281` — gdpr is off-limits to me.
- `pnpm check:tenant-isolation` → **FAIL, 1 uncovered service**:
  `src/modules/calendar/calendar-provider-webhook.service.ts` has no cross-tenant negative test.
- `src/common/outbox/outbox-publisher.service.ts` and `src/common/tenant/for-each-org.ts` were
  being edited by another agent (observability imports) while I worked; I left both alone. The
  outbox flush is still covered by the drain guard because it runs under `CronLeaseService`.
- **Newly orphaned:** `drainBacklog` / `DrainBacklog` in `src/common/workflow/workflow-store.ts`
  now has no production caller (only `src/common/workflow/drain-backlog.spec.ts`). Not in the
  `common/workflow` barrel. I did not delete it — that needs knip plus a real build, and the file
  is in ticket 31's working area.
- **Latent, not fixed:** `ProviderCircuitBreaker.check()` guards with `if (!entry?.openedAt)`, so a
  breaker opened at epoch 0 reads as closed. Inert in production; my `openProviders()` uses
  `!== null`.

## Honest limits

Everything above is `tsc` / `eslint` / `jest` on this laptop. No deployed probe, no SIGTERM against
a live server, no alert delivery — deferred by the ticket's own last checkbox. The HTTP drain proof
is a real express server through supertest, not the full Nest app (booting it needs the shared
remote `DATABASE_URL`, which is off-limits).
