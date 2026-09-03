# Deploy safety — PRD-C176 / PRD-C177 evidence index

Ticket 34 (`.scratch/code-release-10-10-v2/issues/34-production-ops-alerts-cost.md`).
Branch `release/code-10-10-v2` in both repos. Captured 2026-09-03 on a developer laptop.

**This directory is not deployed evidence and must never be captured as such.**
`ops:evidence:capture` refuses `--self-test`, `--dry-run`, local endpoints and non-zero
exits, and `production-ops-evidence.mjs:155` rejects any artifact whose text contains
self-test / dry-run / mock / fixture / simulation wording. Everything below is local
laptop evidence: it establishes what the *code* does under induced failure. It says nothing
about a cloud account, and the RB-01..RB-08 manifests under the parent directory remain the
only accepted deployed proof (`ops:evidence:check` currently reports 0/8 — `raw/ops_evidence_check.txt`).

No `.json` files are written here. `production-ops-evidence.mjs:165` treats every
non-`*.input.json` `.json` file anywhere under `evidence/42-production-ops/` as an evidence
manifest and reports it as a gate failure; JSON output is therefore stored as `.txt`.

---

## Drills written for this ticket

| File | What it induces | Result |
|---|---|---|
| `lease-recovery-drill.mjs` | A worker takes a lease and is killed mid-lease, leaving no terminal write. Outbox and workflow runs, real elapsed lease expiry, non-owner app role under RLS. | `raw/lease-recovery-drill.txt` — 8/9, one confirmed defect |
| `drain-probe-live.mjs` | Real SIGTERM to a booted API, with one request held in flight across the whole drain. | `raw/drain-probe-live.txt` — 10/10 |
| `kill-switch-readpath-drill.ts` | Platform and per-org kill switches, resolved by the production resolver over rows read from the real table under RLS. | `raw/kill-switch-readpath-drill.txt` — 7/7 |
| `queue-backlog-local-repro.mjs` | The shipped `failure-drill` queue-backlog step, with a tenant seeded inside the same rolled-back transaction. | `raw/queue-backlog_local-repro.txt` — pass |

All four seed and tear down their own data and assert nothing is left behind.
They run against `scratch_head_1010` (local, 677/677 migrations). Nothing was run against
the shared remote Neon branch.

Reproduce:

```bash
EV=architecture-refactor/final-refactor/evidence/42-production-ops/deploy-safety
OWNER=postgresql://tarunchintakunta@localhost:5432/scratch_head_1010
APP=postgresql://streamline_app:gatepw1010@localhost:5432/scratch_head_1010

OWNER_DATABASE_URL=$OWNER APP_DATABASE_URL=$APP node $EV/lease-recovery-drill.mjs
OWNER_DATABASE_URL=$OWNER APP_DATABASE_URL=$APP node $EV/kill-switch-readpath-drill.ts
DATABASE_URL=$OWNER                            node $EV/queue-backlog-local-repro.mjs
PROBE_DATABASE_URL=$APP SAMPLE_OUT=$EV/raw/drain-probe-samples.txt node $EV/drain-probe-live.mjs
```

`drain-probe-live.mjs` boots `streamlineos-backend/dist/main.js` on port 4310 with no `.env`,
no Redis and throwaway secrets that only satisfy the length floors in `config/env.validation.ts`.

## Repository scripts run

| Command | Exit | Headline |
|---|---|---|
| `failure-drill:self-test` | 0 | 5 drills present, all dry-run by default, both unsafe drills blocked in execute mode |
| `node src/scripts/failure-drill.mjs --execute` | 1 | provider-outage pass, database-cell-failure pass (SQLSTATE 28000 + pool alert), cache-loss and bad-release blocked by design, queue-backlog fails for want of a tenant — see repro above |
| `cell:rollout:self-test` | 0 | healthy canary p99 22.0ms → DEPLOY; regressed canary p99 2469.6ms → ROLLBACK |
| `cell:rollout:regressed-canary` | 0 | ROLLBACK fired on a measured +8450.2% p99 regression against a 20% threshold |
| `cell:degraded:self-test` | 0 | a registry that falls back instead of refusing is reported as a failure |
| `check:idempotent-commands` (+ self-test) | 0 | 546 controllers, 11 in-scope handlers all fenced, 11 named exclusions |
| `check:outbox-consumers` (+ self-test) | 0 | 3647 files, 216 modules; 24 emitted event types, 29 registered — no orphan emitter |
| `check:migration-rollback` (+ self-test) | 0 | 677 migrations; rollback or `@irreversible`/`@data-loss` required above prefix 839 |
| `check:migration-discipline` (+ self-test) | 0 | 677 SQL files, 0 new violations; expand/contract discipline baselined |
| `check:contract-breaking-change` (+ self-test) | 0 | 102 published operations, 23 published webhook event names, no narrowing |
| `check:feature-flag-governance` (+ self-test) | 0 | schema carries `owner` and `expires_at`, both non-null — see the caveat below |
| `ops:evidence:check` | 1 | 0/8 runbooks have deployed evidence. Expected, and unchanged by this directory |

## Jest suites run

| Pattern | Suites | Tests |
|---|---|---|
| health / shutdown-gate / shutdown-state / shutdown-drain / readiness / dependency-checks / workflow-backlog / cron-lease-shutdown | 8 | 67 |
| canary-rollout / kill-switch / external-effect-ledger / command + billing + chat + payroll + accounting + hr + lead idempotency / retry-policy / workflow-runner | 11 | 111 |
| placement-degraded-control-plane / region-registry / placement-lease / cell-admission / call-provider | 5 | 57 |
| workflow-runtime-rls / drain-backlog / workflow-outbox-relay | 3 | 26 |

`raw/jest_*.txt`.

## Live SIGTERM timeline

From `raw/drain-probe-samples.txt`, settling delay 3000ms:

```
t=    0  /health=200  /health/ready=503  /v1/*=404
t= 2908  /health=200  /health/ready=503  /v1/*=404
t= 3113  /health=200  /health/ready=503  /v1/*=503 Retry-After=5  Connection=close
```

Readiness fails first; ordinary traffic keeps being served for the full settling window;
only then is new work refused. Liveness answered 200 throughout. The request held in flight
across the drain was answered (404), not dropped. The process terminated at t=3650ms, after
`Shutdown drain complete — no requests in flight`, by SIGTERM re-raised by Nest's own
shutdown hook — never by SIGKILL.

## What this evidence does not cover

- Rolling deploy of two application versions against one database, canary abort of a real
  deployment, and rollback or forward-fix of a real release: needs two deployed replicas
  behind a load balancer.
- `cell:degraded` (non-self-test) and `cell:rollout` (full): need a second provisioned cell
  database and an organization placed in it.
- Autoscaling behaviour: needs an orchestrator.
- Live alert delivery and human acknowledgement (RB-06), per-cell cost (RB-07): out of scope
  here and blocked on a deployed environment regardless.

`decision-record-C176-C177-UNSIGNED.md` in this directory records the residual risk that
needs a named human signature. It is unsigned by design.
