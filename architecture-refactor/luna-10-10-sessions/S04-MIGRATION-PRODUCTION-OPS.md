# S04 — Migration and production operations

## Objective

Prove the current schema can be created, upgraded, recovered and operated under production-shaped failure and load. This ticket is independent of other code tickets and excludes CRM/Inventory workload claims.

## Repository and migration work

- [ ] Apply all pending journaled migrations to disposable staging, then record zero pending/orphan/duplicate/unreachable ledger entries.
- [ ] Cold-bootstrap an empty database through the current migration head and compare tables, columns, constraints, indexes, policies, functions, triggers and extensions with the expected catalog.
- [ ] Exercise upgrade from the supported previous watermark, migration retry after interruption, and rollback/forward-fix procedure using [RB-09](../runbooks/RB-09-migration-rollback.md).
- [ ] Ensure CI performs cold bootstrap and catalog comparison so migration-chain drift cannot recur.
- [ ] Record destructive migration decisions explicitly; no production/staging data currently needs preservation, but future migrations must regain expand/backfill/contract safety before live data exists.

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
