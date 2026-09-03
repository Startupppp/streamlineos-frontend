# Ticket 33 — Cell isolation, replicas and recovery — audit at head

**Ticket:** `.scratch/code-release-10-10-v2/issues/33-cell-recovery.md`
**Criteria:** PRD-C168, C169, C170, C171, C179 (all five live in the PRD's
*Deferred production-readiness evidence → Cloud, recovery and operations* block,
`architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md:629-640`)
**Prior report:** none. Evidence reconstructed from scratch.
**Audited:** 2026-09-03
**Frontend SHA:** `26df21488854b5ca72b938802295965783f8b948` (`release/code-10-10-v2`, working tree dirty — 26 concurrent agents)
**Backend SHA:** `66f09164f7056b377331bcc1fff5f128ada06b95` (`release/code-10-10-v2`)
**Databases used:** `scratch_head_1010` (owner + `streamline_app`), `scratch_cold_1010` (owner + `streamline_app`) — both local, both pre-built for this wave.
**Nothing was edited.** This file is the only write. Two probe scripts were created in the session scratchpad, outside both repos.

---

## 1. What I read, with numbers

### Backend runtime surface (the thing the criteria are about)

| Area | Files | Lines |
|---|---:|---:|
| `src/common/region/` — topology, registry, placement, admission, signature, lookup, module | 9 non-spec | 1,619 |
| `src/common/cell-transport/` — channel namespace, cross-cell relay | 2 | 130 |
| `src/common/cell-resources/` — process cell id | 1 | 3 |
| `src/common/placement/` — cell capacity, SLO rollup | 2 | 131 |
| `src/db/replica-router.ts` | 1 | 97 |
| `src/common/cache/cache-region-router.ts` | 1 | 59 |
| **Total runtime cell/region/replica code** | **16** | **2,137** |
| Specs over that surface (`region/`, `cell-transport/`, `placement/`, `degradation/`) | 25 | — |

Read in full, not sampled: `region.config.ts` (260), `region-registry.ts` (325),
`region.module.ts` (127), `placement-lookup.ts` (233), `with-tenant.ts` (156),
`for-each-org.ts` (225), `run-in-tenant-transaction.ts` (76), `tenant-db.ts` (24),
`cache-region-router.ts` (59), `replica-router.ts` (97), `drizzle.module.ts` (168),
`cross-cell-events.ts` (61), `cross-cell-relay.ts` (119), `cell-admission.ts` (230),
`storage-placement.ts` (152), plus targeted reads of `ably.service.ts`,
`cron-lease.service.ts`, `outbox-publisher.service.ts`, `pool.config.ts`.

### Operator scripts

12 scripts read (5,351 lines): `verify-cell-isolation.mjs` (447), `verify-replica-routing.mjs` (340),
`cell-backup.mjs` (333), `run-recovery-drill.mjs` (404), `failure-drill.mjs` (302),
`drill-pitr-restore.mjs` (329), `relocate-org.mjs` (269), `relocate-org-data.ts` (767),
`bootstrap-cell.mjs` (190), `compare-cell-schema.mjs` (307), `check-placement-bypass.mjs` (1,391),
`verify-cross-cell-relay.ts` (272). Plus `cell-topology.mjs`, `place-cell-org.mjs`,
`alert-cell-recovery.mjs`, `production-ops-evidence.mjs`.
`package.json` declares **54** `cell:` / `drill:` / `failure-drill` / `ops:evidence` scripts.
`src/scripts/` holds 252 files; 31 match cell/replica/recovery/drill/backup/relocation.

### Runbooks and evidence

- 5 in-scope runbooks read in full: RB-01 (70 lines), RB-02 (80), RB-03 (146), RB-04 (99), RB-08 (337) = **732 lines**.
- Existing local evidence read: **94 files** across
  `final-refactor/evidence/42-production-ops/{RB-01:45, RB-02:11, RB-03:5, RB-04:6, RB-08:27}`,
  including `RB-02/local-pitr-restore-proof.md` (a genuinely excellent prior artefact) and
  `RB-01/35-cell-isolation-guard-is-credulous-bogus-urls-read-as-ISOLATED.txt`.

### Frontend surface

3 files carry the cell dimension: `frontend/lib/ably-channels.ts` (the single channel-name
factory), `frontend/lib/ably-safe-subscribe.ts`, `frontend/.env.example:34`. Two tests assert
the contract (`lib/__tests__/ably-channel-names.test.ts`, `hooks/api/__tests__/chat-realtime-channel.test.tsx`).
No frontend surface exists for replicas, backups, PITR or recovery — correctly, they are server concerns.

### Commands actually run (all exit codes recorded below in §6)

`verify-cell-isolation --self-test` (×2), `cell-backup --self-test` (×2),
`verify-replica-routing --self-test`, `run-recovery-drill --self-test`,
`failure-drill --self-test`, `relocate-org --self-test`, `compare-cell-schema --self-test`,
`verify-cell-admission --self-test`, `verify-cell-degraded-control-plane --self-test`,
`verify-cross-cell-relay --self-test`, `drill-pitr-restore --self-test`,
`production-ops-evidence --self-test`, `production-ops-evidence verify`,
`check-placement-bypass`, plus 8 `psql` catalog/row queries against both scratch databases
and a purpose-built `withTenant` fence probe (with its negative control).

---

## 2. The headline result

**C168 and C169 cannot both be satisfied at head.** The moment a second cell is genuinely
provisioned — its own database, which is the *one* thing RB-01 calls a hard requirement —
every write to an organisation placed in it returns `503 PLACEMENT_FENCE_LOST`, forever.

`withTenant` opens the transaction on the **cell's** database and, inside it, probes the write
fence against `organization_placement`. That table is control-plane-only by design: it is
excluded from the RLS policy set for that reason (`db-verify-rls.mjs:83-97`), it is written
only via `placeOrganization(this.db, …)` against the primary
(`auth.service.ts:83`, `org-setup-resolver.service.ts:219`, `org-profile.service.ts:260`),
`place-cell-org.mjs` says so in its own help text ("only the routing record lives in the
control plane"), and `relocate-org-data.ts` deliberately **excludes** it from the relocation
copy plan (self-test asserts "control-plane routing state was not excluded from the plan" is
a failure). Nothing writes it into a cell. So the probe always counts 0 rows.

I measured it in both directions.

```
$ psql scratch_head_1010 -c "SELECT organization_id, region, cell_id, status, placement_version FROM organization_placement"
 a8de1de3-98f1-47a8-a587-f753ebe88e68 | cell-2 | cell-2 | ACTIVE | 1
 d3049d54-8e04-42ea-b83f-0d0040f9ee9e | cell-2 | cell-2 | ACTIVE | 1
 f0d1ff60-309a-47ee-8962-7813e3cb6bea | cell-2 | cell-2 | ACTIVE | 1
$ psql scratch_cold_1010 -c "SELECT count(*) FROM organization_placement"   # the cell
 0
$ psql scratch_cold_1010 -c "SELECT id, region FROM organizations"          # same orgs live here
 a8de1de3… | cell-2      d3049d54… | cell-2      f0d1ff60… | cell-2
```

The exact fence predicate from `with-tenant.ts:82-87`, run by hand:

```
control plane (scratch_head_1010) : placement_fence_held = 1
the cell     (scratch_cold_1010)  : placement_fence_held = 0
```

And then through the real code path (`withTenant`, real `RegionRegistry`, real
`orgPlacementLookup`, real signing keyring, two real postgres pools):

```
# cell-2 bound to its OWN database — i.e. actually isolated
intent=read  RESULT: BODY RAN
intent=write THREW: WriteFenceLostError — This cell no longer holds the write fence for
             organisation a8de1de3-… at placement version 1.
             response: {"code":"PLACEMENT_FENCE_LOST","details":{"retryable":true,
                        "retryAfterMs":5000,"cellId":"cell-2","placementVersion":1}}

# ANTI-VACUITY CONTROL — same org, same placement row, same code,
# cell-2 re-bound to the control plane's own database (i.e. no isolation at all)
intent=read  RESULT: BODY RAN
intent=write RESULT: BODY RAN
```

The control is what makes the first run mean something: the probe harness can produce a PASS,
and the only variable changed is whether the cell has its own database.

The error is marked `retryable: true, retryAfterMs: 5000`, so a client retries forever and
never succeeds. And the path is reachable from ordinary signup, not just an operator script:
`auth.service.ts:82-85` calls `chooseRegionForNewOrg` → `placeOrganization` → `withTenant`
with the default `intent: "write"`. `chooseRegionForNewOrg` selects any configured region that
has a fresh `cell_capacity_measurements` row and spare capacity — which `pnpm cell:capacity:record`
writes as part of standing a cell up. So provisioning cell-2 and measuring it is sufficient to
start routing new registrations into a cell where registration 503s and leaves an orphan
placement row behind.

Nothing catches this today because **no verification script exercises `withTenant` against a
secondary cell**: `withTenant` appears in only 4 of 252 scripts
(`backfill-system-roles.ts`, `check-envelope-consistency.mjs`, `check-placement-bypass.mjs`,
`run-workload-envelope.mjs`) and none of them is cell-aware. `verify-cell-isolation`,
`verify-cell-admission` and `verify-cell-degraded-control-plane` all stop at the registry.

---

## 3. Per-criterion assessment

### PRD-C168 — "Provision isolated per-cell database, cache, queue/workers, realtime/provider, search/vector, object storage and monitoring." → **not-met**

Provisioning itself is operator-blocked and cannot be done from here. What *is* assessable is
whether the code can express and honour a per-cell resource for each of the seven categories.
Walked in the order the criterion names them:

| # | Resource | Config expressible? | Honoured at runtime? | Verdict |
|---|---|---|---|---|
| 1 | Database | `REGION_<K>_APP_DATABASE_URL` / `_DATABASE_URL` (`region.config.ts:198-208`), secondary never inherits flat vars (`:196`) | Yes — `region.module.ts:47-52` opens a pool per region; `withTenant:118-120` routes there | **Expressible and honoured — but writes 503 (F-01)** |
| 2 | Cache | `RegionCacheConfig{upstashUrl,upstashToken,keyPrefix}` (`region.config.ts:47-59,139-156`) | Partly — `CacheRegionRouter:35-53` uses it, but fails **soft** to the primary Redis and an unprefixed key on any error (F-08) | **Namespaced at best; fails open** |
| 3 | Queue / workers | No per-cell queue DSN exists. Isolation is "the outbox tables live in the cell's own database" (`verify-cell-isolation.mjs:285-290`, hard-coded `ISOLATED`) plus `cron:lease:<PROCESS_CELL_ID>:<job>` (`cron-lease.service.ts:46`) | Enumeration is cell-scoped only when `CELL_ID` is set and matches a region; otherwise it silently sweeps the primary (F-10) | **Namespaced, and silently wrong when misconfigured** |
| 4 | Realtime / provider | `RegionDefinition.ablyApiKey` parsed at `region.config.ts:213` | **No consumer.** `AblyService` reads the flat `config.ABLY_API_KEY` and the flat `config.CELL_ID` (`ably.service.ts:22-25`), never the org's placement (F-11) | **Declared, dead** |
| 5 | Search / vector | `searchCluster` + `searchApiKey` parsed (`region.config.ts:219-230`) and signed into placement tokens | **No consumer.** Grep for `searchApiKey`/`searchCluster` outside region/placement/signature/script code returns nothing | **Declared, dead; nothing deployed** |
| 6 | Object storage | Full `RegionStorageConfig` incl. `bucket`, `kbBucket`, `endpoint`, credentials, `keyPrefix` (`region.config.ts:233-251`) | Main bucket: yes, via `storageForOrg` → `StoragePlacementResolver.forOrg` (`storage-placement.ts:85-100`), fails **hard** (good). KB bucket: no — 7 call sites pass the flat `R2_KB_BUCKET_NAME` as a bucket override and `RegionStorageConfig.kbBucket` has no reader (F-09) | **Half isolated** |
| 7 | Monitoring | `cellId` stamped on every log line from `PROCESS_CELL_ID` (`correlation-id.middleware.ts:76`, `async-hop.ts:73`, `for-each-org.ts:127`) | Yes, but it is the process's id, not the org's | **Namespaced by label** |

Two of the seven (realtime credential, search) are configuration with no reader at all. One
(queue) has no per-cell resource concept beyond "it is in the cell's database". Object storage
is isolated for uploads and KB-blind. The cache honours the config but degrades into the wrong
cell on error.

Evidence for the "provisioned" half: **none exists and none can.** `ops:evidence:check`
(`production-ops-evidence.mjs verify`) exits 1 with `missing passing deployed evidence for RB-01`
through `RB-08`. That is the correct state.

### PRD-C169 — "Prove credentials, routing, jobs, namespaces and data cannot cross cells using RB-01 and RB-08." → **not-met**

Walked dimension by dimension.

**Credentials.** Per-cell env-key pattern exists for DB, cache, R2, search and Ably. Two of
those keys are never read (Ably, search), so a per-cell credential for them changes nothing.
`verify-cell-isolation.mjs` reports "secrets ISOLATED" purely because `REGION_<K>_*` entries
are *present* (`:337-346`) — it never checks that they differ from the control plane's or that
they work.

**Routing.** This is the strongest part of the system and it is genuinely good:
`RegionRegistry.resolvePlacement` (`region-registry.ts:257-287`) refuses an unplaced org,
refuses a region this deployment does not serve, and refuses a placement whose `cellId`
disagrees with the region's configured cell — "serving it would mean two cells owning one
organisation". `ControlPlaneUnavailableError` refuses rather than guessing.
`check:placement-bypass` now **exits 0** over 147 detected bypass sites, every one allowlisted
with a reason. Routing is the one dimension I would call proved at code level.

**Jobs.** Cell-scoped by lease key only. Two concrete holes (F-10): an unmatched `CELL_ID`
warns and sweeps the *primary* while holding the *cell's* lease (the same org gets swept by two
cells); and an unset `CELL_ID` in a multi-region deployment means every sweep, outbox flush and
purge worker skips every org in a secondary cell entirely, silently. `OutboxPublisherService`
(`outbox-publisher.service.ts:137`) and `WorkflowOutboxRelayService` (`:117`) both go through
`forEachOrg`, so that is the durable-effect path.

**Namespaces.** Cache keys are cell-prefixed *unless* the placement lookup hiccups, in which
case they are written unprefixed into the primary's Redis and never invalidated again (F-08).
Realtime channels are prefixed with the process's cell id on the server and a build-time
constant on the client (F-11). Object keys are prefixed via `objectKey` (`storage-placement.ts:150`),
correctly, on all three upload paths.

**Data.** `cross-cell-events.ts` defines an 8-entry allowlist of control-plane facts and
`assertMayCrossCells` refuses everything else — a good seam, and its self-test passes. But
`CrossCellRelay`, the only implementation of that seam, has **zero importers anywhere in `src/`**
(F-19). So no data crosses because nothing crosses at all — including the
`control-plane.placement.created` fact whose absence is the direct cause of F-01.

**The instrument RB-01 names does not enforce RB-01's threshold (F-06).** RB-01 says "All seven
resource categories report `ISOLATED` … Zero `NAMESPACED` or `SHARED` verdicts" and "A
`NAMESPACED` verdict is a FAIL for this gate". `verify-cell-isolation.mjs:351-359` puts only the
seven *database* checks in `MUST_BE_ISOLATED`; everything else can be `NAMESPACED` or `SHARED`
and the script prints `RESULT: DATA ISOLATION PROVED` and exits 0. Committed evidence proves it:

```
34-cell-isolation-prefix-only-…txt : RESULT: DATA ISOLATION PROVED  isolated=10 namespaced=6 shared=1   EXIT 0
33-cell-isolation-no-cell-id-…txt  : RESULT: DATA ISOLATION PROVED  isolated=10 namespaced=0 shared=6 unproved=1  EXIT 0
32-…negative-control-same-database : RESULT: DATA ISOLATION FAILED                                     EXIT 1
```

The negative control confirms the database half is load-bearing. Everything outside the database
is decorative to the exit code.

**And the non-database verdicts are credulous (F-07).** `probeSharedInfrastructure`
(`:148-283`) decides cache, storage, realtime and search by string-comparing environment
variables. No network call is made. A prior run in this repo's own evidence
(`RB-01/35-…-bogus-urls-read-as-ISOLATED.txt`, same backend SHA) flipped four resources to
`ISOLATED` using `.invalid` hostnames that resolve to nothing.

RB-08's own acceptance block expects a `cell-2 compute ISOLATED` line. The script emits no
`compute` resource at all, and its resource labels (`cache (Redis)`, `object storage bucket`,
`worker pools`, `search index`, `realtime broker`) do not match RB-01's expected-output block
(`compute`, `cache`, `object_storage`, `search`, `realtime`, `worker`, `monitoring`). RB-08 as
written can never be literally satisfied.

### PRD-C170 — "Provision a physical replica and prove lag/fallback using RB-03." → **not-met (provisioning), and the fallback half is unwired**

Provisioning: **NOT MEASURED — no replica exists.** `verify-replica-routing.mjs --self-test`
passes 16/16 cases and correctly reports `Live checks not run: DB_REPLICA_URL is absent`, and
the live path exits **2** (prerequisite missing) rather than 0 or 1. That is exactly right and
is the single best-behaved guard in this ticket.

What *is* measurable is whether any read would ever reach a replica. Three seams exist and none
is reachable (F-17):

- `ReplicaRouter` + `routingStrategyFor` (`replica-router.ts`) — 18 passing unit tests, and its
  only importers are `drizzle.module.ts` and its own spec.
- `DRIZZLE_REPLICA` and `REPLICA_ROUTER` are provided in `drizzle.module.ts:46,64` but the
  module's `exports:` is `[DRIZZLE, DB_POOL_CONFIG]` (`:75`). Neither is injectable anywhere
  else; `DRIZZLE_REPLICA` is injected only into `DrizzleModule` itself, and used only to
  `end()` the pool at shutdown (`:167`).
- `runInReplicaTenantRead` (`run-in-tenant-transaction.ts:57-76`) has zero production callers.

So RB-03 Step 3's classification table ("`GET /tickets` … reads from the replica") describes
behaviour that does not exist: **zero read paths resolve to the replica.** Two further notes:
the replica handle is *not* wrapped in `createTenantAwareDb` (`:57-58` vs `:41`), so the first
consumer to inject it would query outside the ambient tenant transaction; and with
`DB_REPLICA_URL` unset the module still opens 2 pooled connections to the primary solely to
close them at shutdown. There is also no per-cell replica concept at all — `RegionDefinition`
has no replica field (F-18) — so a provisioned replica could only ever serve the primary cell,
which contradicts RB-03's "Autoscaling: configure per cell sizing".

Lag: **NOT MEASURED.** To measure it you need a Neon read-replica compute endpoint,
`DB_REPLICA_URL` set to it, and `node src/scripts/verify-replica-routing.mjs --isolation`
plus RB-03 Step 4's 12-sample loop under `run-load-driver.mjs --scenario=write-mix`.
The script already measures `pg_last_xact_replay_timestamp` and the
`pg_last_wal_receive_lsn` / `pg_current_wal_lsn` distance, so no code is missing for the
measurement — only the endpoint.

### PRD-C171 — "Configure five-minute-or-better PITR/RPO and run recovery/relocation drills using RB-02 and RB-04." → **not-met, and measurably so**

**RPO is 21,600 s against a 300 s target — 72× over.** This is a property of the schedule, not
of a machine. `run-recovery-drill.mjs:95-112` reads the cadence out of
`.github/workflows/cell-backup.yml` rather than hard-coding it (a good decision), the workflow's
cron is `0 */6 * * *` (`:14`), and the committed dry-run artefact records
`"rpo_operational_seconds": 21600, "rpo_target_seconds": 300, "rpo_met": false`.
The workflow's own header says a logical dump cannot reach 5 minutes and that Neon PITR is the
mechanism that can. `drill-pitr-restore.mjs` is the script that would exercise it; its self-test
passes 9/9 fixtures including all five failure detections, and the live path blocks correctly on
`NEON_API_KEY` / `NEON_PROJECT_ID`.

**But `rpo_met: false` does not fail the drill (F-15).** The exit is governed only by
`integrity.ok` and `disturbed` (`:380-388`). The recorded dry run prints `RESULT: DRILL PASSED`
alongside `RPO: MISSED` and exits 0.

**RB-04 Step 1 is dangerous as written (F-03).** It documents
`run-recovery-drill.mjs --dry-run` as "no state changed". `--dry-run` skips only phase 2
(drop + bootstrap) at `:236-241`. Phase 1 (`--backup`, `:217-222`) and phase 3
(`--restore`, `:275-281`) and phase 4 (`--verify`) all still run, and `--restore`
(`cell-backup.mjs:198-252`) drops FK constraints and issues `TRUNCATE … CASCADE` against every
populated table before copying rows back. The repo's own evidence file
(`RB-04/recovery-drill-dry-run.txt`) shows 18 constraints dropped and 11 tables truncated under
`--dry-run`. None of it is in one transaction, so a failure mid-restore leaves the cell
truncated with FK constraints missing.

**RB-04's environment contract does not exist (F-13).** `CELL_IDS`, `DRILL_CELL`,
`DRILL_APPROVAL` and `DRILL_NOTIFICATION_EMAIL` are read by **no code in `src/`**. An operator
running RB-04 Step 2's `DRILL_CELL=cell-staging node …run-recovery-drill.mjs` drills the default
`--region=cell-2`. RB-04's pass threshold — `Drill JSON contains "verdict": "PASS"` — is
unsatisfiable: the result object has no `verdict`, `cell`, `drillType`, `t0`,
`failureInjected`, `firstHealthCheckPass`, `lastRecoverablePoint`, `rtoSeconds` or `rpoSeconds`
key. Its entire "Expected output" block is fictional.

**The drill artefact asserts facts it did not measure (F-12).** `:351-359` emits
`control_plane_during_recovery: { placement_cache_served_known_org: true,
unknown_org_refused_503: true, … note: "Exercised during actual cell-2 outage window.
Control-plane DB (neondb) was never touched…" }` as literals on every run. The committed
dry-run JSON carries that note verbatim for a local run against `scratch_drill_1010` in which
no cell-2 outage occurred and no Neon database was involved.

**Relocation.** The machinery is present and well-shaped: `relocate-org.mjs` (state machine,
self-test passes: "illegal transition rejected, post-flip rollback rejected"),
`relocate-org-data.ts` (767 lines, plan coverage, checksums, `uniq_org_relocation_active`
preventing concurrent moves), `organization_relocations` and
`organization_relocation_checksums` in the control plane, and
`with-tenant.ts:150-151` recording target-cell traffic during a move. **No relocation drill has
been run**, and by F-01 a completed relocation into a real second cell would land the org in a
cell that cannot accept writes.

**What IS proven (locally, and honestly labelled as such):** `RB-02/local-pitr-restore-proof.md`
documents two `pg_dump`/`pg_restore` round trips with a 20-dimension catalog census
(1028 tables, 13,539 columns, 4,765 indexes, 14,040 constraints, 983 RLS policies, 1 FORCE-RLS
table, 677/677 migrations — all identical), a before/after marker cut landing exactly where
aimed, and an anti-vacuity control run. That file explicitly states it proves 1 of C179's 5
claims. It is the best evidence artefact in this ticket and its self-assessment is accurate.

### PRD-C179 — "Prove backups are encrypted, controlled, restorable and periodically tested with documented key ownership." → **not-met (1 of 5 sub-claims, locally)**

| Sub-claim | Verdict | Evidence |
|---|---|---|
| restorable | **met, locally only** | `RB-02/local-pitr-restore-proof.md`; catalog + row + marker fidelity, with an anti-vacuity control. Row fidelity proven over 760 rows in 12 tables — tiny. |
| encrypted | **not-met** | `cell-backup.mjs:144-145` writes a plaintext NDJSON of base64 `COPY` output for every populated table. No encryption anywhere in the path. `backups/` is correctly gitignored with an explicit warning (`.gitignore:9-12`) — good — but the CI workflow then uploads the same file as an artefact (F-02). |
| controlled | **not-met** | `.github/workflows/cell-backup.yml:75-80` publishes it as a GitHub Actions artefact, 14-day retention, readable by every repo collaborator. That is the opposite of controlled. |
| periodically tested | **not-met** | The only scheduled mechanism is `cell-backup.yml`, and it **cannot succeed**: the `Take backup` step (`:60-66`) passes `DATABASE_URL` and `DIRECT_DATABASE_URL` but not `APP_DATABASE_URL`, which `cell-topology.mjs:51-52` requires unconditionally (F-05, reproduced below). It has also never run — it fails at `Require credentials` without `CI_DATABASE_URL`. Nothing monitors backup or drill staleness: `alert-cell-recovery.mjs` fires when a recovery happened *recently*, which is a recovery notification, not a staleness alarm. |
| documented key ownership | **not-met** | There is no key, and no document. `OPERATOR-EVIDENCE.md`, `CELL-RUNBOOK.md` and the `SCORECARD` that RB-01/RB-04/RB-08 tell the operator to update **do not exist in either repo**, and neither does `architecture-refactor/runbooks/evidence/` (F-16). |

Also for this criterion: `cell-backup.mjs --restore` has no confirmation gate at all (F-04),
while its sibling `bootstrap-cell.mjs` requires `--drop --i-mean-it`. And RB-02 Step 3's
command (`node src/scripts/cell-backup.mjs` with no mode flag) prints `--help` and exits 0
(`:11-25`), which satisfies RB-02's stated pass threshold "`cell:backup` script exits 0 for
every cell" **vacuously** (F-14).

---

## 4. Findings

| # | Sev | Location | Summary |
|---|---|---|---|
| F-01 | **P0** | `backend/src/common/tenant/with-tenant.ts:82` (and `:118-120,144-149`) | Write fence is probed on the cell's connection against a control-plane-only table; every write to an org in a secondary cell 503s |
| F-02 | **P0** | `backend/.github/workflows/cell-backup.yml:75` | Scheduled job uploads a plaintext full-tenant-data dump as a CI artefact, unencrypted, 14-day retention |
| F-03 | **P0** | `backend/src/scripts/run-recovery-drill.mjs:275` | `--dry-run` still TRUNCATEs and restores every populated table, while RB-04 documents it as "no state changed" |
| F-04 | P1 | `backend/src/scripts/cell-backup.mjs:198` | `--restore` truncates with no confirmation flag, no production guard, and no transaction |
| F-05 | P1 | `backend/.github/workflows/cell-backup.yml:60` | Backup step omits `APP_DATABASE_URL`; `parseCellArgs` throws before any work — the periodic backup can never succeed |
| F-06 | P1 | `backend/src/scripts/verify-cell-isolation.mjs:351` | NAMESPACED/SHARED on cache, storage, realtime, search, workers, monitoring do not affect the exit code; prints "DATA ISOLATION PROVED" anyway |
| F-07 | P1 | `backend/src/scripts/verify-cell-isolation.mjs:148` | Non-database verdicts are env-var string comparisons; unreachable `.invalid` URLs read as ISOLATED |
| F-08 | P1 | `backend/src/common/cache/cache-region-router.ts:26` (and `:35`) | Placement failure silently downgrades a cell-2 org to the primary Redis and an unprefixed key; the unprefixed key is never invalidated |
| F-09 | P1 | `backend/src/modules/kb/wiki/kb-media.service.ts:129` (+6 sites) | KB bucket override is always the flat `R2_KB_BUCKET_NAME`; `RegionStorageConfig.kbBucket` has no reader, so every cell's KB objects land in the primary's bucket |
| F-10 | P1 | `backend/src/common/tenant/for-each-org.ts:86` (and `:155`) | Unmatched `CELL_ID` sweeps the primary under the cell's lease (double execution); unset `CELL_ID` skips every secondary-cell org in every sweep, silently |
| F-11 | P1 | `backend/src/modules/realtime/ably.service.ts:25` + `frontend/lib/ably-channels.ts:27` | Realtime cell prefix comes from process env / build-time constant, never from placement; one frontend build addresses one cell, and the 403 is swallowed |
| F-12 | P1 | `backend/src/scripts/run-recovery-drill.mjs:351` | Drill JSON emits hard-coded control-plane assertions and a fixed "actual cell-2 outage window" note on every run, including local dry runs |
| F-13 | P1 | `backend/src/scripts/run-recovery-drill.mjs:52` (flags) | RB-04's `DRILL_CELL`/`DRILL_APPROVAL`/`CELL_IDS`/`DRILL_NOTIFICATION_EMAIL` are read by no code, and its `"verdict":"PASS"` threshold is unsatisfiable |
| F-14 | P1 | `backend/src/scripts/cell-backup.mjs:11` | No-mode invocation prints help and exits 0, satisfying RB-02's "exits 0 for every cell" threshold vacuously |
| F-15 | P1 | `backend/src/scripts/run-recovery-drill.mjs:380` | `rpo_met:false` does not affect the exit code; the drill prints "DRILL PASSED / RPO MISSED" and exits 0 |
| F-16 | P1 | `frontend/architecture-refactor/runbooks/RB-01-cell-isolation.md:63` (+ RB-02/03/04/08) | Every runbook directs evidence to `runbooks/evidence/` and to `OPERATOR-EVIDENCE.md` / `CELL-RUNBOOK.md` / `SCORECARD`, none of which exists; the gate that decides C175 reads a different tree |
| F-17 | P2 | `backend/src/db/drizzle.module.ts:75` | `DRIZZLE_REPLICA`/`REPLICA_ROUTER` are not exported and `runInReplicaTenantRead` has no callers; no read path can reach a replica, and the replica handle skips the tenant-aware proxy |
| F-18 | P2 | `backend/src/common/region/region.config.ts:77` | `RegionDefinition` has no replica field, so a provisioned replica can only ever serve the primary cell |
| F-19 | P2 | `backend/src/common/cell-transport/cross-cell-relay.ts:32` | Zero importers; `ensureDeadLetterTable()` would create `cell_relay_dead_letters` outside the migration chain (absent from `pg_tables` in both scratch DBs) |
| F-20 | P2 | `backend/src/common/tenant/for-each-org.ts:157` | Unbounded org enumeration — no LIMIT, no cursor, serial per-tenant transactions; grows with tenant count |
| F-21 | P2 | `backend/.env.example:306` | `REGION_KEYS=primary,cell-2` and cell-2 DSN placeholders are uncommented, so a copied example declares a live second region pointed at a fake host |
| F-22 | P2 | `backend/src/scripts/verify-cell-isolation.mjs:30` and `cell-backup.mjs:27` | `parseCellArgs` runs before `--self-test`, so both self-tests exit 1 without DB env — contradicting RB-01/RB-02, whose recorded "PASSED" lines also no longer match the emitted text |
| F-23 | P2 | `backend/src/scripts/alert-cell-recovery.mjs:66` | `cellId: "cell-2"` hard-coded in the alert payload regardless of the region drilled |
| F-24 | P2 | `frontend/architecture-refactor/final-refactor/evidence/42-production-ops/edge-security/commands/frontend-pnpm-audit-prod.json:1` | Non-`.input.json` files from another ticket are parsed as evidence manifests and rejected with 18 errors each, adding noise a future waiver could hide behind |

### Failure scenarios and fixes

**F-01 (P0)** — Provision cell-2 per RB-08 Step 1, run `pnpm cell:place-org --region=cell-2`,
then have that org's user save anything. `withTenant` opens the transaction on cell-2's database,
`SELECT count(*) FROM organization_placement WHERE organization_id=… AND write_fence_token=…`
returns 0 because the row only exists in the control plane, `fenceIsHeld` is false and
`WriteFenceLostError` → HTTP 503 `PLACEMENT_FENCE_LOST` with `retryable:true`, so the client
retries forever. Reads succeed, which makes it look like a partial outage rather than a
configuration fault. Measured above with a matched negative control.
*Fix:* pick one of two. (a) Probe the fence on the control-plane binding —
`getRegionRegistry().bindingFor(primary).db` — before opening the cell transaction, accepting one
extra round trip and losing same-transaction atomicity of the check; or (b) make the fence a real
per-cell lease: have `placeOrganization` / `transitionPlacementStatus` / `place-cell-org.mjs`
write the `(organization_id, placement_version, write_fence_token, status, lease_expires_at)`
tuple into the target cell as well, and wire `CrossCellRelay` (F-19) to carry
`control-plane.placement.created` / `.moved` / `.fence-rotated` so the copy stays current. (b) is
the design the code clearly intends and it fixes F-19 at the same time. Either way, add a gate that
opens a real `withTenant` write against a second local cell — that is the check nothing performs today.

**F-02 (P0)** — Set `CI_DATABASE_URL` (which C179 asks the operator to do) and fix F-05. Every
six hours the job writes `backups/cell-2.ndjson` containing base64 `COPY` output of `users`,
`organizations`, `organization_members`, `audit_logs`, `hr_data_requests`, `hr_legal_holds`,
`hr_retention_policies`, `payroll_statutory_rule_sets` and everything else populated, and uploads
it unencrypted to Actions artefact storage where any repo collaborator can download it for 14 days.
*Fix:* encrypt before upload with a key whose owner is named in a committed document (`age`/`gpg`,
key in the org secret store), push to a private object store with IAM rather than an Actions
artefact, and delete the `upload-artifact` step entirely for production cells.

**F-03 (P0)** — An operator runs RB-04 Step 1 verbatim against a production cell believing "no
state changed". `run-recovery-drill.mjs` takes a backup, then executes `cell-backup --restore`,
which drops the FK constraints in the cycle set and issues `TRUNCATE … CASCADE` on every table in
the manifest, then copies rows back one statement at a time outside any transaction. If the
process dies between the truncate loop and the last `copyIn`, or if any constraint fails to
re-add, the cell is left partially empty with FK constraints missing and the script reports
`RESTORE INCOMPLETE`.
*Fix:* make `--dry-run` print the phase plan and return before phase 1; gate the destructive path
behind an explicit `--execute`; wrap the truncate + copy + constraint rebuild in one transaction;
correct RB-04 Step 1's claim.

**F-05 (P1)** — Reproduced: `node src/scripts/cell-backup.mjs --self-test` with `DATABASE_URL`
set but `APP_DATABASE_URL` unset exits 1 with
`Error: APP_DATABASE_URL (the non-BYPASSRLS app role) is required.` thrown from
`cell-topology.mjs:52`, before any argument handling. The workflow supplies only `DATABASE_URL`
and `DIRECT_DATABASE_URL`. *Fix:* add `APP_DATABASE_URL: ${{ secrets.CI_APP_DATABASE_URL }}` to
both steps, or stop requiring the app role in `parseCellArgs` when the caller only needs the owner
URL (which `cell-backup` does — it uses `topology.cell.ownerDirect` exclusively).

**F-06 (P1)** — Cell-2 is stood up with `REGION_CELL_2_CACHE_KEY_PREFIX` and
`REGION_CELL_2_R2_KEY_PREFIX` but no dedicated Upstash instance or bucket. `pnpm cell:isolation
--region=cell-2` prints `RESULT: DATA ISOLATION PROVED … namespaced=6 shared=1` and exits 0. RB-01
says exit 0 is the pass. The operator records a PASS for a cell whose cache, buckets, realtime and
search all sit behind the control plane's master credentials.
*Fix:* add the seven RB-01 categories to a `MUST_BE_ISOLATED_STRICT` set behind a
`--require-isolated` flag that RB-01 mandates, set a non-zero exit for any NAMESPACED or SHARED
among them, and change the summary line so `DATA ISOLATION PROVED` cannot be misread as covering
resources it does not gate.

**F-07 (P1)** — Set `REGION_CELL_2_UPSTASH_REDIS_REST_URL=https://nothing.invalid` and
`REGION_CELL_2_R2_BUCKET_NAME=does-not-exist`; four resources flip from SHARED to ISOLATED with no
network call. *Fix:* probe each declared endpoint (Redis `/ping`, R2 `HeadBucket`, Ably
`/time`, search health) and add an `UNREACHABLE` verdict that fails.

**F-08 (P1)** — Cell-2 has its own Upstash instance. A transient control-plane blip makes
`cacheConfigForOrg` throw `ControlPlaneUnavailableError`; `redisForOrg` catches it and returns the
**primary's** Redis, and `scopedKey` catches it and returns `${orgId}:${localKey}` with no cell
prefix. Cell-2's session, permission snapshot and AI context are written into cell-1's Redis — a
residency violation for a compliance-zoned cell. Separately, once such an unprefixed key exists,
`invalidateForOrg` (which computes the *prefixed* key once the control plane recovers) never
deletes it, so a later degraded read serves a stale entitlement or permission snapshot for up to
its full TTL. *Fix:* fail closed — let the error propagate and have `CacheService` treat a
placement failure as an unconditional miss with no write. Under no circumstance write to a Redis
or a key that placement did not choose.

**F-09 (P1)** — Provision cell-2's own R2 bucket per RB-08 Step 3. A cell-2 user uploads a wiki
attachment: `kb-media.service.ts:129` passes the flat `R2_KB_BUCKET_NAME` as `bucketOverride`,
`requireBucket` prefers the override (`storage-placement.ts:147`), so the object is addressed with
cell-2's client and credentials but the *primary's* bucket name. Shared endpoint → the object
lands in cell-1's bucket; separate endpoint → `NoSuchBucket` and every KB upload in cell-2 500s.
*Fix:* resolve the KB bucket from `storageForOrg(orgId).kbBucket` and keep the flat value only as
the primary's default; update all 7 call sites plus `cron-org-purge-worker.service.ts:184` together
so upload and purge stay symmetric.

**F-10 (P1)** — (a) A cell-2 worker starts with `CELL_ID=cell-2` while `REGION_KEYS` omits
`cell-2`. `resolveEnumerationDb` finds no binding, logs
`"This sweep may iterate the wrong cell's organizations"`, and enumerates the *primary's* orgs while
holding `cron:lease:cell-2:<job>` — so the legacy-1 worker, holding its own lease, runs the same
sweep over the same tenants: duplicate notifications, duplicate accruals, duplicate outbox
dispatch. (b) A single API+worker process runs `REGION_KEYS=primary,cell-2` with `CELL_ID` unset —
the exact configuration the RB-08 evidence runs used. `resolveEnumerationDb` returns the caller's
db, so `forEachOrg` never enumerates cell-2's `organizations` table: retention sweeps never expire
cell-2 PII, the purge worker never completes a GDPR erasure for a cell-2 tenant, and the outbox
publisher never flushes a cell-2 event. All silent.
*Fix:* throw rather than warn when `CELL_ID` is set and matches no region; and when the registry
holds more than one binding, iterate every binding's organizations (or require `CELL_ID`).

**F-11 (P1)** — Two cells, one Next.js deployment. `NEXT_PUBLIC_ABLY_CELL_ID` is a build-time
constant, so the browser composes `cell:legacy-1:chat:<orgB>:<id>` while the cell-2 API process
minted a capability for `cell:cell-2:chat:…`. Ably refuses the attach with 403;
`safeSubscribe` retries once via `reauthorizeAblyClients` and then returns `false`; every caller
(e.g. `hooks/api/support/realtime.ts:73-85`) discards the boolean. Chat, huddles, notifications and
support updates are dead for that tenant with no error anywhere in the UI. The module's own header
comment says the failure is "silent by construction".
*Fix:* return the org's `cellId` from `/me` (or embed it in the Ably token response) and have
`lib/ably-channels.ts` compose from that value; on the backend, mint capability from
`placementForOrg(orgId).cellId` instead of `config.CELL_ID`; surface a `safeSubscribe` failure as a
degraded-realtime state rather than dropping it.

**F-12 (P1)** — Any future drill JSON committed as C171/C175 evidence contains
`"note": "Exercised during actual cell-2 outage window. Control-plane DB (neondb) was never
touched…"` and two `true` assertions about control-plane behaviour, none of which the run
measured. A reviewer reading the artefact would credit a control-plane availability claim that
nothing tested. *Fix:* measure them during the drill (resolve a known org and an unknown org
through the registry inside the outage window and record the actual outcomes) or delete the block
and cite `placement-degraded-control-plane.spec.ts` as unit evidence instead.

**F-16 (P1)** — An operator completes RB-01 and saves output to
`architecture-refactor/runbooks/evidence/RB-01-cell-isolation-<date>.txt` as instructed. That
directory does not exist; `ops:evidence:check` reads
`final-refactor/evidence/42-production-ops/` and continues to report
`missing passing deployed evidence for RB-01`. C169 looks done and C175 stays red, with no line
connecting the two. *Fix:* rewrite the "Evidence recording" section of RB-01/02/03/04/08 to the
`ops:evidence:capture --metadata=…` protocol in `42-production-ops/README.md`, and delete the
references to `OPERATOR-EVIDENCE.md`, `CELL-RUNBOOK.md` and `SCORECARD row 24`.

---

## 5. What head already gets right

Worth stating plainly, because a lot of this is genuinely well built.

- **Placement resolution fails closed in every direction** (`region-registry.ts:257-287`): an
  unplaced org, an org placed in an unserved region, and an org whose recorded `cellId`
  disagrees with the region's configured cell all raise rather than defaulting to the primary.
  The comment names the exact failure it exists to prevent, and the code matches it.
- **Secondary regions never inherit flat environment variables** (`region.config.ts:196`) — the
  single most likely way to point two cells at one database is closed by construction.
- **Placement is resolved inside `withTenant`, not at its call sites**, so a caller added later
  cannot reach the wrong database (`with-tenant.ts:59-72`). Same reasoning for the fence — which
  is why the fence bug (F-01) is a database-targeting error rather than a design error.
- **Placement tokens are signed and version-checked** (`placement-signature.ts`,
  `region-registry.ts:215-244`): a stale cached placement is rejected, and a presented token
  below the cached version is refused as `EXPIRED`.
- **`check:placement-bypass` exits 0** over 147 detected bypass sites, each with a written
  reason. The `organization_placement` RLS exemption is documented with its rationale in
  `db-verify-rls.mjs:83-97`.
- **`verify-replica-routing.mjs` exits 2 on a missing prerequisite**, never 0. Its 16-case
  self-test genuinely proves the classification logic (lag NULL vs within vs exceeding, LSN
  distance, RLS 42501 vs other SQLSTATE vs no-error-is-a-leak, endpoint distinction). This is the
  model the other guards should follow.
- **`ops:evidence:check` correctly reports RB-01…RB-08 as missing** and its own self-test proves
  it blocks altered artefacts and self-test claims.
- **`cross-cell-events.ts` is a real allowlist with a real refusal**, and its self-test
  demonstrates the throw, the dead-letter and the reason string.
- **Relocation is state-machine-guarded**, with `uniq_org_relocation_active` making two
  concurrent moves impossible by construction and post-flip rollback refused.
- **`backups/` is gitignored with an explicit warning** naming the tables at risk.
- **`RB-02/local-pitr-restore-proof.md`** is exemplary: it proves one of five sub-claims, says so
  in a table at the top, runs an anti-vacuity control, and lists four honest limits including
  "the dataset is tiny" and "a logical dump is not PITR".
- **All 11 self-tests I ran pass** (see §6), and `drill-pitr-restore` proves all five of its
  failure detections, not just its happy path.
- **`for-each-org` isolates a failing tenant and reports partial failure durably**
  (`registerSweepFailureSink`), rather than returning 200 over a silent multi-tenant failure.

---

## 6. Commands run, verbatim results

```
node src/scripts/verify-replica-routing.mjs --self-test          EXIT 0  SELF-TEST PASSED — 16 cases
                                                                          "Live checks not run: DB_REPLICA_URL is absent"
node src/scripts/verify-cell-isolation.mjs --self-test            EXIT 1  Error: APP_DATABASE_URL … is required   [F-22]
node src/scripts/cell-backup.mjs --self-test                      EXIT 1  Error: APP_DATABASE_URL … is required   [F-22, F-05]
  (same two, with DATABASE_URL + APP_DATABASE_URL set)            EXIT 0  both SELF-TEST PASS
node src/scripts/run-recovery-drill.mjs --self-test               EXIT 0  structure and result shape are correct
node src/scripts/failure-drill.mjs --self-test                    EXIT 0  all 5 drills, 5/5 checks true
node src/scripts/relocate-org.mjs --self-test                     EXIT 0  illegal transition + post-flip rollback rejected
node src/scripts/compare-cell-schema.mjs --self-test              EXIT 0
node src/scripts/drill-pitr-restore.mjs --self-test               EXIT 0  9/9 fixtures, 5 failure detections
ts-node src/scripts/verify-cell-admission.ts --self-test          EXIT 0
ts-node src/scripts/verify-cell-degraded-control-plane.ts --self-test  EXIT 0
ts-node src/scripts/verify-cross-cell-relay.ts --self-test        EXIT 0  refusal + dead-letter proven
node src/scripts/production-ops-evidence.mjs --self-test          EXIT 0  {"pass":true, altered artefact blocked, self-test claim blocked}
node src/scripts/production-ops-evidence.mjs verify               EXIT 1  missing passing deployed evidence for RB-01…RB-08  [correct]
node src/scripts/check-placement-bypass.mjs                       EXIT 0  147 bypass sites, all allowlisted
```

Database probes (both local, read-only):

```
psql scratch_head_1010 \d organization_placement       PK btree(organization_id) + 3 indexes; relrowsecurity=f (documented exemption)
psql scratch_head_1010 organization_placement          3 rows, all region=cell-2 cell_id=cell-2 ACTIVE v1
psql scratch_cold_1010 organization_placement          0 rows
psql scratch_cold_1010 organizations                   the same 3 orgs
fence predicate on scratch_head_1010                   placement_fence_held = 1
fence predicate on scratch_cold_1010                   placement_fence_held = 0
psql scratch_head_1010 cell_capacity_measurements      2 rows, both cell_id=local-scratch-1010 (no cell-2 measurement locally)
psql scratch_head_1010 placement_decisions             0 rows
psql both  pg_tables 'cell_relay_dead_letters'         absent from both
```

`withTenant` probe (scratchpad harness, real registry / lookup / keyring / two pools):

```
cell-2 → scratch_cold_1010 (isolated)   read: BODY RAN   write: WriteFenceLostError / 503 PLACEMENT_FENCE_LOST
cell-2 → scratch_head_1010 (control)    read: BODY RAN   write: BODY RAN          [anti-vacuity control]
```

---

## 7. What is blocked on infrastructure, and exactly what would measure it

None of the five criteria can be *closed* here; all five are PRD-deferred. Precisely:

- **C168 provisioning** — needs a second Neon project, a second Upstash database, a dedicated R2
  bucket + scoped key, a search cluster, a second Ably application, and a separate worker
  deployment (RB-08 Steps 1-6). Measured by `pnpm cell:isolation --region=cell-2` **after F-06
  and F-07 are fixed** — before those fixes a green run proves nothing about five of the seven
  resources.
- **C169 credential/namespace crossing** — needs two provisioned cells with distinct credentials,
  then RB-01 plus a cross-credential attempt (cell-1's Upstash token against cell-2's keyspace,
  cell-1's R2 key against cell-2's bucket). No such negative probe exists in any script today; it
  would have to be written. The *routing* half of C169 is measurable locally and mostly holds —
  except F-01, which is measurable locally and does not.
- **C170 replica lag** — needs a Neon read-replica compute endpoint and `DB_REPLICA_URL`.
  `verify-replica-routing.mjs --isolation` already measures lag, WAL receive distance, RLS
  fail-closed, watermark alignment and phantom-org isolation; RB-03 Step 4's 12-sample loop under
  `run-load-driver.mjs --duration=120 --workers=8 --scenario=write-mix` measures the profile.
  Nothing else is missing for the measurement — but the *fallback* half (F-17) is a code gap that
  can and should be closed before the endpoint exists.
- **C171 5-minute RPO** — needs Neon Pro PITR and `NEON_API_KEY` + `NEON_PROJECT_ID`;
  `drill-pitr-restore.mjs` blocks correctly on both. The 21,600 s figure is not blocked on
  anything: it is the committed cron, and it is 72× the target today.
- **C171 recovery / relocation drills** — the drill *scripts* run locally (proven), but a real
  drill needs a cell that can be force-terminated and a maintenance window. F-03, F-13 and F-15
  must be fixed first or the drill is unsafe and its verdict is unreadable.
- **C179 encrypted / controlled / key ownership** — needs an encrypted backup destination with
  IAM, and a named human. The key-ownership document is a decision record, not a script output.
- **`ops:evidence:check` (C175)** — will keep failing until a deployed, operator-attested,
  hashed bundle exists for each of RB-01…RB-08. That failure is the correct current state and
  must not be waived.

**Explicitly NOT MEASURED by me:** replication lag (no replica), provider RPO (no Neon API key),
live cross-cell credential attempts (no second provisioned account), any deployed-environment
behaviour, `npm run build` / typecheck / full jest (laptop budget), and `check:alert-ack`
(needs a real webhook and a human).
