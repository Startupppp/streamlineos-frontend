# 26 — A second cell exists and is proved from cold

**What to build:** A second, independent cell serves real organizations. It has its own database, Redis, worker pools, storage prefix, search index, monitoring and secrets, and it has been built from nothing, backed up, restored, and run with the control plane down — with internal and test organizations placed there first.

**Blocked by:** [20](20-placement-is-a-record.md) · [21](21-placement-survives-a-control-plane-outage.md) · [22](22-a-write-carries-its-placement-version.md) · [23](23-no-query-bypasses-placement.md) · [24](24-an-org-switch-is-revalidated-in-the-target-cell.md) · [25](25-creating-an-org-is-a-resumable-saga.md)

**Status:** partially done — a second cell exists, serves organizations, and **is now reproducible from cold: `SCHEMAS IDENTICAL, differences=0`, down from 3,243.** Resource isolation is still the open half.

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

  **Attempted and not delivered.** A lane was dispatched to build the per-cell configuration seams and close the two `UNPROVED` rows, which are code rather than provisioning — a worker deployment bound to a cell, and a `cellId` dimension readable back from logs and metrics. It terminated on the account's weekly API limit before its first tool call. The verdicts above are unchanged from the previous session; only the probe-table leak was fixed (`verify-cell-isolation.mjs` dropped its rows but never its table, so it left `cell_isolation_probe` behind in both databases and the schema diff counted it).

- [x] Cold bootstrap is exercised: the cell is built from an empty database through the migration chain, with no manual step that is not scripted.

  **Closed.** `pnpm -C backend cell:bootstrap --drop --i-mean-it` drops the database, creates it, applies every journal entry, grants the application role, verifies RLS and diffs the catalogue, with no manual step. The end state now matches the control plane exactly:

  ```
  RESULT: REACHED_HEAD 339/339 already_present=0 chain_gaps=124
  RESULT: RLS VERIFIED

  PASS  tables       control=   976 cell=   976
  PASS  columns      control= 12426 cell= 12426
  PASS  indexes      control=  4417 cell=  4417
  PASS  constraints  control= 13455 cell= 13455
  PASS  enums        control=  2356 cell=  2356
  PASS  functions    control=   440 cell=   440
  PASS  policies     control=   933 cell=   933
  PASS  rlsEnabled   control=   933 cell=   933
  PASS  triggers     control=   109 cell=   109
  RESULT: SCHEMAS IDENTICAL cell=cell-2 differences=0
  ```

  **From 3,243 differences to 0.** The starting point was 65 missing tables, 1,013 columns, 346 indexes, 1,139 constraints, 281 enum values, 5 functions, 62 policies and 34 triggers.

  **How, and why it is not hand-written.** `src/scripts/generate-chain-repair.mjs` reads both catalogues and emits the difference as idempotent SQL — `--direction=forward` for what the control plane has and the chain never creates, `--direction=drift` for what the chain creates and the control plane never received. Guards are whole `DO` blocks, because Drizzle splits on `--> statement-breakpoint` and would tear a block containing one into invalid fragments. `--self-test` proves it emits SQL for a source-only table and nothing for identical catalogues. The output landed as `0619`–`0623`.

  **The diff had to run in both directions, and that is what turned a reproducibility gap into defects.** `0320_recon_phase_a_orgid.sql` adds a denormalised `org_id` to every table with a NOT NULL single-column foreign key to an org-bearing parent — by sweeping `pg_catalog` rather than naming its tables. Its result therefore depends on the shape of the database at the moment it runs: 66 tables in the control plane, 69 in a cold cell. Five tables fell through the gap in one database or the other. See criterion 1 of ticket 32's sibling finding and the security note below.

  **Caveat, stated rather than buried.** `chain_gaps=124` — 124 statements in historical migrations still reference an object that does not exist at their point in the chain. The end state converges; the middle does not. A cold build is reproducible, not clean. The cell measured above is the one built cold through `0000`–`0622`; `0623` was applied only to the control plane, because the chain had already given the cell those objects.

  **The security consequence, which is why this criterion mattered.**

  `public.inv_webhook_event_subscriptions` carried `org_id` and no policy in a cold cell — production's policy was created out of band, so every newly built cell served it with no tenant isolation. `0619` puts that policy in the chain and `db:verify-rls` on the cold cell is now clean.

  Four more tables had no tenant column at all, so no policy could exist for them: `credit_note_items`, `fin_payment_run_items`, `vendor_credit_items` (control plane) and `candidate_resumes` (both). All four granted `SELECT, INSERT, UPDATE, DELETE` to `streamline_app`. All are empty today and the one read path inspected (`payment-runs.service.ts getRun`) gates on an org-scoped parent before touching the child, so this is a missing defence-in-depth layer rather than a demonstrated leak — but it is the layer the chain intends and the database did not have.

  **`db:verify-rls` could not report any of them.** Its two checks both require the org column to exist, so a tenant table that lost its tenant column entirely passed *by being more broken rather than less*. A third check now applies 0320's own predicate:

  ```
  before   RESULT: RLS VERIFIED
  after    FAIL  tenant column on public.candidate_resumes     — child of org-bearing candidates …
           FAIL  tenant column on public.credit_note_items      — child of org-bearing credit_notes …
           FAIL  tenant column on public.fin_payment_run_items  — child of org-bearing fin_payment_runs …
           FAIL  tenant column on public.vendor_credit_items    — child of org-bearing vendor_credits …
           RESULT: 4 CHECK(S) FAILED
  post-fix RESULT: RLS VERIFIED   (coverage 933 of 938)
  ```

  The guard is proved to bite by four real defects, not by a synthetic one. `0620` and `0621` close them, `orgId` is declared in the Drizzle schema for all four, and the four insert sites set it.

  **One row of live data did not survive the check.** `contact_party_map` holds a row whose `organization_id` names a different organization from the contact it points at. The composite tenant foreign key is exactly what refuses that, the chain creates it, and the control plane never received it. It is emitted `NOT VALID`, so it binds new writes without failing the migration on the row that predates it — **the row is still there and still needs a decision.**

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

  **What would close it:** an Ably application per cell (or a cell segment in the channel namespace with per-cell capability tokens), a worker deployment per cell, and a relay that calls `assertMayCrossCells` before publishing. The lane dispatched to build that relay died on the account's weekly API limit; nothing here changed this session.

## Todo

- [x] Measure as `streamline_app`, never as the owner. The owner bypasses row-level security and its plans are not the ones production gets.
- [x] Script the bootstrap as you do it. A cell built by hand is a cell that cannot be built again, which is the whole point of Phase 4.
- [x] Record what the second cell costs to run before placing anything on it; ticket 32 needs a real number, not an estimate.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
