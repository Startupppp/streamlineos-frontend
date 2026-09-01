# S04 — Migration and production operations

## Objective

Prove the current schema can be created, upgraded, recovered and operated under production-shaped failure and load. This ticket is independent of other code tickets and excludes CRM/Inventory workload claims.

## Repository and migration work

- [ ] Apply all pending journaled migrations to disposable staging, then record zero pending/orphan/duplicate/unreachable ledger entries.
- [ ] Cold-bootstrap an empty database through the current migration head and compare tables, columns, constraints, indexes, policies, functions, triggers and extensions with the expected catalog.
- [ ] Exercise upgrade from the supported previous watermark, migration retry after interruption, and rollback/forward-fix procedure using [RB-09](../runbooks/RB-09-migration-rollback.md).
- [x] Ensure CI performs cold bootstrap and catalog comparison so migration-chain drift cannot recur. The `migration-proof` job runs the cold and split-upgrade catalog proof, and its fail-closed probe-ledger self-test is enforced in [backend.yml](../../.github/workflows/backend.yml).
- [x] Record destructive migration decisions explicitly; no production/staging data currently needs preservation. [RB-09](../runbooks/RB-09-migration-rollback.md) records the expand/backfill/validate/cutover/drop policy and the one-way-door rule; live rollback evidence remains open.

## Infrastructure and operational evidence

- [ ] Provision independently isolated cell database, Redis/cache, queue, realtime/provider and object-storage resources; prove credentials and routing cannot cross cells using [RB-01](../runbooks/RB-01-cell-isolation.md) and [RB-08](../runbooks/RB-08-cell-resource-accounts.md).
- [ ] Provision a physical read replica, measure lag, and prove safe primary fallback with [RB-03](../runbooks/RB-03-read-replica.md).
- [ ] Configure five-minute-or-better PITR/RPO and run restore, regional disaster and organization relocation drills with [RB-02](../runbooks/RB-02-pitr-backup.md) and [RB-04](../runbooks/RB-04-recovery-drill.md).
- [ ] Run production-shaped load for authentication/RBAC, Home, HRMS, Payroll, Build, Billing, Accounting, Chat fanout/reconnect/unread, Calendar recurrence/free-busy/reminders, Notifications, Knowledge ingestion/search and Inbox.
- [ ] Prove declared SLOs, no tenant leakage, no dropped work, connection-pool safety, replica behavior and at least 40% headroom using [RB-05](../runbooks/RB-05-production-load.md).
- [ ] Measure and approve per-cell and per-active-tenant cost using [RB-07](../runbooks/RB-07-per-cell-cost.md).
- [ ] Configure production logs, traces, release metadata and live alert delivery. Test queue age, DLQ, provider failure, tenant-context errors, latency and cell recovery; record human acknowledgement with [RB-06](../runbooks/RB-06-live-alert-delivery.md).
- [ ] Redact secrets and personal data from every committed artifact; record commit, environment, timestamp, dataset shape and artifact hashes.

## Exit criteria

- [ ] Clean bootstrap and supported upgrade produce the same expected catalog at current head.
- [ ] Cell isolation, replica/PITR/recovery, load/headroom, unit cost and live alerts have reproducible deployed evidence.
- [ ] No mandatory operational gate is represented by a local mock or an unexplained waiver.

## Audit evidence — 2026-09-01

Repository evidence complete:

- [x] Current configured database migration ledger is 585/585: all journaled migrations are applied; pending, orphan, duplicate and unreachable counts are zero. Disposable-staging replay is still separately required by the main acceptance item above.
- [x] Migration chain, discipline, rollback and drop-column-safety gates pass for the checked migration set; current-head disposable proof remains open.
- [x] Fail-closed self-tests exist and pass for migration probe ledgers, production-evidence intake, cell isolation, replica predicates, PITR assertions, load/headroom guard, unit-cost anomaly guard, alert dispatch, retention classification and erasure FK ordering.

Environment evidence still required:

- [ ] Do not infer disposable-staging or clean-bootstrap completion from the now-current 585/585 ledger; run and retain those environment-specific proofs. The supported upgrade against `backend/.env` is applied and ledger-verified.
- [ ] Provision and verify independent cell resources, a physical replica, regional recovery/relocation, production-shaped load with at least 40% headroom, invoice-derived cost and live alert acknowledgement.
- [ ] Record environment, region, release SHA, topology hash, dataset shape, operator, UTC timestamp, command/exit code and artifact SHA-256 for every operational claim.

Fresh verification (2026-09-01 UTC, root `e58754d24`, backend working tree, environment `backend/.env`):

- `pnpm -C backend db:migrate` — exit 0; standard Drizzle migration runner applied the five pending migrations from `0927` through `0931` against the configured `backend/.env` database. A concurrent `0932` migration was subsequently present and is also applied.
- `pnpm -C backend check:migration-ledger` — exit 0; `585 applied row(s) against 585 journal entr(ies)`, `0 migration(s) pending`, zero orphan/duplicate/unreachable entries.
- `pnpm -C backend exec node scripts/apply-pending-migrations.mjs --dry-run` — exit 0; `pending=0`.
- `pnpm -C backend check:migration-chain` — exit 0; migration chain has no structural issues.
- `pnpm -C backend migration:proof --self-test` — exit 0; exact, incomplete and corrupt disposable probe ledgers are distinguished fail-closed.
- `pnpm -C backend ops:evidence:self-test` — exit 0; altered artifacts, self-test claims and invalid deployed evidence are rejected. The deployed evidence directory is intentionally empty, so no production gate is claimed.
- Full-chain disposable proof — not run locally: the configured `backend/.env` targets shared Neon databases, Docker/local PostgreSQL is unavailable, and no disposable staging target is configured. No current-head clean-bootstrap pass is claimed; the configured-database upgrade is now complete.
- Disposable proof attempt — the named probes were created and safely dropped after the cold replay stopped at 529 entries before reaching the current head. No clean-bootstrap or supported-upgrade pass is claimed from that attempt.
- Local self-tests remain implementation evidence only; they do not satisfy pending migration, deployed resource, replica, PITR, load, cost, live-alert or approval gates.

## Session completion status

S04 is **not complete**. The configured-database migration upgrade is complete, but the unchecked disposable bootstrap, rollback drill, isolated-cell, replica, PITR/recovery, production-load/headroom, cost, live-alert and evidence-attestation items remain mandatory. Do not mark the ticket or the PRD 10/10 gate complete until those environment-specific artifacts exist and pass the evidence gate in [42-production-ops](../final-refactor/evidence/42-production-ops/README.md).
