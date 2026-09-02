# 32 — Liveness, dependency-aware readiness, graceful shutdown and lease handoff

**What to build:** Health interfaces that tell the truth under partial failure, and a shutdown path that finishes or hands off in-flight work rather than dropping it.

**Blocked by:** None — can start immediately.

**Status:** done (code-level; deployed evidence deferred by design)

- [x] Liveness is shallow; readiness is dependency-aware and reports an explicit degraded or unready state when the database, cache, queue or a required provider fails.
  - Evidence: `nice -n 10 npx jest src/health --maxWorkers=2` → 7 suites, 62 tests passed. `HealthController.health()` asserted to answer while the db mock rejects and `execute` is never called; `/health/ready` returns a `ReadinessSnapshot` with per-dependency `database`/`cache`/`queue`/`providers` reports and `status: ready | degraded | unready` (503 on unready). Negative control: flipping `databaseCheck.required` to `false` failed 3 tests.
- [x] A health probe must not amplify the outage it is reporting — readiness checks are bounded and cached, not a fresh fanout per probe.
  - Evidence: `readiness.service.spec.ts` — "checks each dependency once across 50 sequential probes" and "…across 50 concurrent probes" both pass; `health.controller.spec.ts` — "probes the database once across 25 readiness calls" passes (`execute` called 1×). Negative control: replacing the cache hit with `if (false)` failed 5 tests (50 and 25 calls respectively). Each check is bounded by `READINESS_CHECK_TIMEOUT_MS`; a never-resolving check reports `down` on the deadline.
- [x] Graceful shutdown drains connections and stops accepting new work before exiting.
  - Evidence: `nice -n 10 npx jest src/health/shutdown-drain.spec.ts --maxWorkers=2` → 4/4 passed over real HTTP (express + supertest): a request in flight before the drain completes with 200 while a new one gets 503 + `Retry-After: 5`, `/health` keeps answering, and quiescence resolves only after the in-flight response finishes. Negative control: making `enter()` never refuse failed 6 tests. Ordering: `beginDrain` (readiness 503) → settling delay → `stopAccepting` → wait for quiescence, all inside `beforeApplicationShutdown`, which Nest completes before `DrizzleModule.onApplicationShutdown` closes the pool.
- [x] Worker leases hand off or expire safely so an interrupted batch is resumed rather than lost or duplicated.
  - Evidence: `nice -n 10 npx jest src/modules/cron/cron-lease --maxWorkers=2` → 2 suites, 11 tests passed. `CronLeaseService.withLease` now refuses to take a lease while the process is draining (`{ ran: false }`, Redis never consulted), so the sweep is never started-then-abandoned and the next tick picks it up whole; release is token-fenced by Lua so a slow run cannot delete a successor's lease, and an unreleased lease expires on its TTL. Durable leases already reclaim on expiry: `outbox_events` re-claims `IN_FLIGHT` rows whose `lease_expires_at` has passed, and `workflow_runs`' CLAIMABLE predicate does the same.
- [x] Background sweeps iterate tenant context explicitly and expose retry, DLQ and cancellation states.
  - Evidence: `nice -n 10 npx jest src/modules/cron/cron-group-a-tenant-isolation.spec.ts src/modules/cron/cron-group-b-tenant-isolation.spec.ts --maxWorkers=2` → 38 tests passed, asserting every cron sweep goes through `forEachOrg`. `GET /health/workflows` now reports `retrying`, `deadLettered`, `cancelled`, `leased`, `organizations` and `failedOrganizations` and is computed per tenant — `nice -n 10 npx jest src/health/workflow-backlog.spec.ts` → 4/4, including "issues one query per organisation instead of one cross-tenant count". Outbox retry/DLQ counts stay on `GET /cron/outbox-events-metrics` and `/cron/outbox-events-report`.
- [x] Deployed probe and alert-delivery evidence stays classified as deferred; this ticket delivers the code-level interfaces only.
  - Evidence: no probe was run against a deployed environment and no alert delivery was attempted or claimed. All proof above is `tsc`, `eslint` and `jest` on this machine.

## P1 found and fixed

`GET /health/workflows` could never report a stall. `drainBacklog(db)` ran a cross-tenant `count(*)` on `workflow_runs`, which carries `tenant_isolation` RLS (`migrations/0591`, line 1045) keyed on `app.current_org_id()`. Outside a tenant transaction the pooled `streamline_app` connection has no GUC set, so the predicate is NULL and the count is always 0 — `due: 0, oldestDueSeconds: null` forever, and the "nothing is calling /cron/workflow-tick" hint could never fire. Replaced with `src/health/workflow-backlog.ts`, which runs the aggregate inside `forEachOrg` so each organisation's GUC is set.

## Latent, not fixed

`ProviderCircuitBreaker.check()` guards with `if (!entry?.openedAt)`, so a circuit opened at epoch 0 reads as closed. Inert in production (`now` is always `Date.now()`), but it makes the breaker untestable at `t=0`. The new `openProviders()` uses `!== null`.
