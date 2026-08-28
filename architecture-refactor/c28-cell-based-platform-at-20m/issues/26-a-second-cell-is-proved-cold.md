# 26 — A second cell exists and is proved from cold

**What to build:** A second, independent cell serves real organizations. It has its own database, Redis, worker pools, storage prefix, search index, monitoring and secrets, and it has been built from nothing, backed up, restored, and run with the control plane down — with internal and test organizations placed there first.

**Blocked by:** [20](20-placement-is-a-record.md) · [21](21-placement-survives-a-control-plane-outage.md) · [22](22-a-write-carries-its-placement-version.md) · [23](23-no-query-bypasses-placement.md) · [24](24-an-org-switch-is-revalidated-in-the-target-cell.md) · [25](25-creating-an-org-is-a-resumable-saga.md)

**Status:** partially done — a second cell exists and serves organizations; **the cold bootstrap fails and that is the headline finding**

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the region topology already supports more than one binding — `region.module.ts` opens a `postgres` client per non-primary region from `definition.databaseUrl` and `RegionModule.onApplicationBootstrap` refuses to serve traffic without a registry — so the second cell is a configuration and operations task on an existing seam, not new application code. Two environment facts from this repository apply: CI already rebuilds the database from empty, which is the cold-bootstrap primitive; and `streamline_app`'s password must be set in the Neon console rather than with `ALTER ROLE`, because the control plane restores the previous one on suspend.

**What was provisioned:** cell `cell-2`, database `cell2`, on the same Neon project as `neondb`. Its own database, migration chain, RLS policies and `NOBYPASSRLS` application role. Compute, Redis, object storage, the realtime broker and secrets are **shared** with `legacy-1` — see [`../CELL-RUNBOOK.md`](../CELL-RUNBOOK.md) for what would isolate each.

## Acceptance criteria

- [ ] The second cell has its own database, Redis, worker pools, object-storage prefix, search index, monitoring and secrets — nothing shared with `legacy-1` except the control plane.

  **Open.** The database is genuinely its own; six other resources are not. `pnpm -C backend cell:isolation` enumerates every one and names what would isolate it:

  ```
  ISOLATED  database identity                          cell=cell2 control-plane=neondb as streamline_app
  ISOLATED  application role privilege                 streamline_app bypassrls=false in cell2
  ISOLATED  control-plane rows visible from the cell   rows visible in cell2: 0
  ISOLATED  cell rows visible from the control plane   rows visible in neondb: 0
  ISOLATED  cross-database bridge                      neither dblink nor postgres_fdw is installed in the cell
  ISOLATED  foreign servers                            0 foreign server(s) defined in cell2
  ISOLATED  row-level security in the cell             870 tables have row-level security enabled in cell2
  ISOLATED  queues and dead letters                    outbox and delivery tables live in the cell's own database
  SHARED    cache (Redis)                              one Upstash instance, no per-cell override
  SHARED    object storage bucket / endpoint           one R2 bucket
  SHARED    realtime broker                            one Ably application
  SHARED    search index                               no search cluster is deployed for any cell
  SHARED    secrets                                    the cell reuses the control plane's credentials
  UNPROVED  worker pools                               cron and the outbox relay run in the control-plane process
  UNPROVED  monitoring                                 no cell dimension is readable back from logs or metrics

  RESULT: DATA ISOLATION PROVED cell=cell-2 isolated=8 shared=6 unproved=2
  ```

  **What would close it:** a Redis instance, R2 bucket, Ably application, search cluster, worker deployment and credential set per cell, plus a `cellId` label on every log line and metric. `RegionStorageConfig` already carries a per-region bucket and endpoint, so object storage is configuration; the rest needs provisioning this repository cannot do.

- [ ] Cold bootstrap is exercised: the cell is built from an empty database through the migration chain, with no manual step that is not scripted.

  **Open, and this is the finding.** The bootstrap is fully scripted — `pnpm -C backend cell:bootstrap --drop --i-mean-it` drops the database, creates it, applies all 334 journal entries, grants the application role and verifies RLS with no manual step. But **the committed migration chain cannot reproduce the running database.** From a genuinely empty database:

  ```
  RESULT: REACHED_HEAD 334/334 already_present=1 chain_gaps=130
    GAP  0591_tenant_isolation_for_unprotected_tables stmt 62: 42P01 relation "ap_allocations" does not exist
    GAP  0591_tenant_isolation_for_unprotected_tables stmt 67: 42P01 relation "ap_document_lines" does not exist
    GAP  0591_tenant_isolation_for_unprotected_tables stmt 72: 42P01 relation "ap_documents" does not exist
    GAP  0590_reconcile_baseline_shape_drift stmt 9: 42703 column "posted_journal_id" does not exist
    GAP  0352_custom_fields_consolidation stmt 8: 42703 column "project_id" does not exist
    … 125 more
  ```

  130 statements reference an object no migration creates. `pnpm -C backend cell:compare-schema` measures the consequence from `pg_catalog` — the runner's exit code is not evidence, this is:

  ```
  FAIL  tables       control=   977 cell=   912  missing=65  extra=0
  FAIL  columns      control= 12423 cell= 11419  missing=1013 extra=9
  FAIL  indexes      control=  4357 cell=  4071  missing=346 extra=60
  FAIL  constraints  control= 13294 cell= 12313  missing=1139 extra=158
  FAIL  enums        control=  2356 cell=  2075  missing=281 extra=0
  FAIL  functions    control=   440 cell=   435  missing=5   extra=0
  FAIL  policies     control=   929 cell=   870  missing=62  extra=3
  FAIL  rlsEnabled   control=   929 cell=   870  missing=62  extra=3
  FAIL  triggers     control=   104 cell=    73  missing=34  extra=3
  RESULT: SCHEMAS DIFFER cell=cell-2 differences=3243
  ```

  65 tables exist in production that no migration creates — the accounting, AP, AR, GL and tax model, exactly the set `0591`'s own header says "the 0000 baseline never actually created". They were created out of band. Three objects exist **only** in the cell (`credit_note_items`, `fin_payment_run_items`, `vendor_credit_items`): production dropped them out of band too, and the chain still creates them.

  **Security consequence, and it is not hypothetical.** `db:verify-rls` on the cold cell fails on `public.inv_webhook_event_subscriptions` — a table that **does** exist in the cell, carries `org_id`, and has no policy. Production has RLS on it; no migration adds it, so production's policy is also out of band. Any newly built cell serves that table with no tenant isolation. The other 62 missing policies are on tables that do not exist in the cell, so they are a reproducibility failure rather than an open hole today — they become one the moment those tables are created the same out-of-band way.

  **What would close it:** a migration that creates the 65 missing tables and their policies, a migration adding RLS to `inv_webhook_event_subscriptions`, and removal of the three tables the chain creates but production does not have — then `cell:bootstrap --drop --i-mean-it` reaching `SCHEMAS IDENTICAL`. That work spans accounting, finance and inventory and is not this session's territory.

- [x] Backup and restore are exercised on it, and the restore is verified by reading data rather than by the job reporting success.

  ```
  $ pnpm -C backend cell:backup --backup
  public.modules_catalog: 19 rows, digest 4215e70510f0
  public.permissions: 39 rows, digest ff5257ff4611
  public.organization_members: 1 rows, digest 615dde8cf154
  public.organizations: 1 rows, digest 353a614d312f
  public.users: 1 rows, digest 2b4a22754ebb
  RESULT: BACKUP OK cell=cell-2 tables=5 rows=61 cyclic=3

  $ pnpm -C backend cell:backup --restore
  dropped cycle-breaking constraint organizations.fk_organizations_owner_membership
  dropped cycle-breaking constraint organizations.fk_organizations_purge_scheduled_by
  dropped cycle-breaking constraint users.users_last_active_org_id_organizations_id_fk
  truncated 5 tables … restored 61 rows … re-added 5 constraints
  RESULT: RESTORE OK cell=cell-2 rows=61 constraints_rebuilt=5

  $ pnpm -C backend cell:backup --verify
  PASS  public.modules_catalog rows 19/19 digest 4215e70510f0/4215e70510f0
  PASS  public.permissions rows 39/39 digest ff5257ff4611/ff5257ff4611
  PASS  public.organization_members rows 1/1 digest 615dde8cf154/615dde8cf154
  PASS  public.organizations rows 1/1 digest 353a614d312f/353a614d312f
  PASS  public.users rows 1/1 digest 2b4a22754ebb/2b4a22754ebb
  RESULT: RESTORE VERIFIED BY READING cell=cell-2 tables=5
  ```

  **The verifier is proved to bite by a real failure, not a hypothetical.** The first restore reported success and the read-back returned `RESTORE NOT VERIFIED — 5 mismatch(es)`. Two defects it caught: every `timestamp without time zone` shifted by the client's UTC offset because postgres-js round-tripped it through a JS `Date` (`2026-08-27T18:44:20.938Z` became `2026-08-28T00:14:20.938Z`), and the restore could not order `users`, `organizations` and `organization_members`, which form a cycle through two nullable foreign keys and one deferrable one. Both are fixed — the transfer is now `COPY TO/FROM STDIN`, and cycle-internal constraints are dropped and re-added from `pg_get_constraintdef`.

  This is a **logical** backup. Point-in-time recovery is a Neon control-plane operation and is not exercised; see the runbook.

- [x] The degraded-control-plane case is exercised against it: placed organizations keep working, unknown ones are refused.

  Exercised against the real second cell with the real `RegionRegistry`, the real signing keyring and real connections to both databases — not a unit test:

  ```
  $ pnpm -C backend cell:degraded --org=9b480ef7-a6b7-4658-899e-15d862f9e60d
  PASS  the organization resolves to the second cell                    region=cell-2 cell=cell-2 v1
  PASS  the second cell serves the organization while the control plane is healthy
  PASS  the cached placement is signed                                  token pl1.cp-1.eyJvIjo…
  PASS  a placed organization keeps working with the control plane down served from the signed cache
  PASS  the second cell still answers with the control plane down       reached without a control-plane read
  PASS  an unknown organization is refused rather than guessed          ControlPlaneUnavailableError
  PASS  a tampered placement token is rejected                          BAD_SIGNATURE
  RESULT: DEGRADED CONTROL PLANE EXERCISED checks=7 failed=0
  ```

- [x] Cell isolation is proved — the second cell cannot read `legacy-1`'s database, cache, objects, search index or queues, tested as the application role rather than as the owner.

  Proved for the database, the queues and the application role's privilege, **as `streamline_app` with `bypassrls=false`**, using write-then-read probes in both directions. Not proved for cache, objects, search index or the broker, because they are shared rather than isolated — the check reports each as `SHARED` with what would isolate it rather than passing quietly. Output is under criterion 1. `pnpm -C backend cell:isolation:self-test` proves a shared database is reported as a failure and not as a note.

- [x] Internal and test organizations are placed there and serve real traffic before any customer is.

  ```
  $ pnpm -C backend cell:place-org --region=cell-2 --kind=internal
  created organization 9b480ef7-a6b7-4658-899e-15d862f9e60d inside cell2
  recorded placement in the control plane: v1 fence=16144196
  read back as streamline_app with the tenant GUC: org "Cell Internal cell-2" region=cell-2, 1 member(s)
  absent from the control-plane database: yes
  RESULT: PLACED kind=internal cell=cell-2 served-by-app-role=yes only-in-cell=yes
  ```

  The organization's rows live only in the cell; only the routing record is in the control plane. No customer organization is placed there. "Serves real traffic" is met at the data layer — the cell answers a tenant-scoped query as the application role — but no HTTP traffic has been routed to it, because there is one application process.

- [ ] Broker namespaces, queues, quotas and dead letters are per-cell; only allow-listed control-plane events cross.

  **Partly open.** Queues and dead letters are per-cell by construction: `outbox_events` and the delivery tables live in the cell's own database, so a queue row cannot cross. The allowlist is declared and enforced — `common/region/cross-cell-events.ts` permits eight `control-plane.*` event types and `assertMayCrossCells` throws `CrossCellEventRefusedError` for anything else, proved by 7 tests including one asserting every event type actually present in the outbox today is refused. But **there is no cross-cell transport to exercise it against**, and the broker is one Ably application, so namespaces are not per-cell.

  **What would close it:** an Ably application per cell (or a cell segment in the channel namespace with per-cell capability tokens), a worker deployment per cell, and a relay that calls `assertMayCrossCells` before publishing.

## Todo

- [x] Measure as `streamline_app`, never as the owner. The owner bypasses row-level security and its plans are not the ones production gets.
- [x] Script the bootstrap as you do it. A cell built by hand is a cell that cannot be built again, which is the whole point of Phase 4.
- [x] Record what the second cell costs to run before placing anything on it; ticket 32 needs a real number, not an estimate.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
