# Cell runbook

How to build, prove, back up, restore and relocate a cell — and, explicitly, what this repository
cannot provision, so nobody reads a green script as an operating second cell.

Companion to [`RUNBOOKS.md`](RUNBOOKS.md), which covers alerts rather than cells.

---

## What a cell is here

A cell is a region key in `backend/src/common/region/region.config.ts` bound to its own database,
object storage, search cluster and secrets. The **control plane** is the primary region's database:
it owns `organization_placement` and nothing else that a tenant reads. Everything a tenant reads or
writes lives in its own cell.

`legacy-1` is the existing production deployment. `cell-2` is the second cell.

## Build a cell from nothing

```bash
pnpm -C backend cell:bootstrap --region=cell-2 --cell=cell-2 --database=cell2
```

Every step is scripted; there is no manual step. In order it creates the database, applies the whole
migration chain from `migrations/meta/_journal.json`, grants the `NOBYPASSRLS` application role, and
verifies row-level security. It prints `RESULT: CELL READY cell=… tables=… migrations=n/n rls=…`.

To prove it really is cold rather than incremental:

```bash
pnpm -C backend cell:bootstrap --region=cell-2 --database=cell2 --drop --i-mean-it
```

`--drop` without `--i-mean-it` refuses. So does any run against `NODE_ENV=production`, and any run
whose target database is the control plane's own.

Print the configuration the application needs, then paste it into `.env`:

```bash
pnpm -C backend cell:bootstrap --region=cell-2 --print-env
```

## Place an organization in a cell

```bash
pnpm -C backend cell:place-org --region=cell-2 --kind=internal
pnpm -C backend cell:place-org --region=cell-2 --list
```

The organization's rows are written in the cell's database; only the routing record is written in the
control plane. The script reads the organization back **as `streamline_app` with the tenant GUC set**
and refuses to report success unless the cell served it and the control plane does not hold the row.

Internal and test organizations go first. No customer organization is placed in a cell that has not
passed every check below.

## Prove isolation

```bash
pnpm -C backend cell:isolation --region=cell-2
pnpm -C backend cell:isolation:self-test
```

Each resource ticket 26 names is reported as `ISOLATED`, `SHARED` or `UNPROVED`, and a non-isolated
verdict names what would isolate it. The database-level verdicts are hard failures; the shared
infrastructure verdicts are reported without failing, because they are declared rather than accidental.

`--self-test` proves the check bites: a shared database is reported as a failure, not as a note.

## Exercise the degraded control plane

```bash
pnpm -C backend cell:place-org --region=cell-2 --kind=test          # prints the org id
pnpm -C backend cell:degraded --region=cell-2 --org=<that id>
pnpm -C backend cell:degraded:self-test
```

This uses the real `RegionRegistry`, the real signed-placement keyring and real connections to both
databases. It resolves the organization, queries its cell, signs the placement, then makes the
control-plane lookup throw and asserts that the placed organization keeps working from the signed
cache, that the cell still answers, that an unknown organization is refused rather than guessed, and
that a tampered token is rejected.

## Back up and restore

```bash
pnpm -C backend cell:backup --region=cell-2 --backup
pnpm -C backend cell:bootstrap --region=cell-2 --database=cell2 --drop --i-mean-it
pnpm -C backend cell:backup --region=cell-2 --restore
pnpm -C backend cell:backup --region=cell-2 --verify
```

`--verify` recomputes every table's digest **inside the database** and compares it with the digest
recorded at backup time. A restore that reports success but reads back different rows fails here.
That is the point: the job reporting success is not the evidence.

Tables are ordered by their foreign-key graph, derived from `pg_constraint`. Tables in a dependency
cycle are reported as cyclic rather than silently ordered — `cell:backup:self-test` proves both.

**Pass criterion.** The drill must report `recovered_cell_healthy: true`. The 2026-08-29 drill
reported `false` because `chat_message_reactions` and `communication_backfill_issues` had no RLS
policy. Migration `0656_communication_tenant_rls` adds both policies and is now in the journal.
Run a fresh drill before quoting the cell as healthy post-restore.

**RPO: the drill's `rpo_seconds` is the best case, not the operational figure.** The backup
precedes the disaster by seconds in the drill, so `rpo_seconds` of 0 proves the restore is lossless
— every committed row came back. What an operator actually loses is the age of the most recent
backup: `rpo_operational_seconds` (currently ~6 hours, the scheduled backup interval). To meet the
PRD's 5-minute target, Neon PITR is required.

## PITR restore (Neon branch-restore)

Logical dumps cannot be taken every 5 minutes — they read every table. Neon's continuous WAL
streaming achieves a restore point of under 1 second. To exercise the 5-minute RPO target:

**Prerequisites:** `NEON_API_KEY` with branch-restore rights for the cell project,
`NEON_PROJECT_ID` for the cell.

```bash
# 1. Record the restore target LSN before the simulated disaster
export RESTORE_LSN=$(curl -s -H "Authorization: Bearer $NEON_API_KEY" \
  "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches/main" \
  | jq -r '.branch.current_state.lsn')

# 2. Write a known row (record its id)
#    (use psql or your migration tooling)

# 3. Declare the disaster — record wall-clock time
export DISASTER_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# 4. Create a branch at the restore point via Neon API
curl -s -X POST "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"endpoints\":[{\"type\":\"read_write\"}],\"branch\":{\"parent_lsn\":\"$RESTORE_LSN\",\"name\":\"pitr-restore-$(date +%s)\"}}" \
  | jq '{id: .branch.id, endpoint: .endpoints[0].host}'

# 5. Connect to the branch endpoint and verify the known row is absent
#    (it was written after the LSN)

# 6. Run db:verify-rls against the branch endpoint to confirm RLS policies apply
DATABASE_URL="<branch-endpoint-url>" pnpm -C backend db:verify-rls

# 7. Record elapsed time from $DISASTER_AT to verified-healthy cell
export RESTORE_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
```

**Pass criterion.** The branch endpoint serves tenant queries with RLS enforced, the row written
after the LSN is absent, and the elapsed time from disaster declaration to verified-healthy cell
is under 5 minutes. Record in `.recovery-drill-results.json` under `failure_class: REGIONAL_DISASTER`.

**Do not regenerate the Neon baseline migration** during or after a PITR restore. `db-bootstrap.mjs`
applies by hash, not timestamp; the baseline must never be regenerated (Neon DB state 2026-07-28 note
in MEMORY.md). A PITR restore returns the database to a previous state; the application schema is
already there — no migration run is needed unless the restore point predates a schema change.

## Relocate an organization between cells

```bash
node backend/src/scripts/relocate-org.mjs --org=<id> --to=cell-2 --status
node backend/src/scripts/relocate-org.mjs --org=<id> --to=cell-2 --advance
node backend/src/scripts/relocate-org.mjs --org=<id> --rollback
node backend/src/scripts/relocate-org.mjs --self-test
```

One state transition per invocation, so an interrupted relocation resumes from the state it stopped
in. Rollback is available up to and including `VERIFY_TARGET`. After `FLIP_PLACEMENT` there is no
rollback — moving back is a fresh relocation in the other direction, and the script refuses to
pretend otherwise.

Exercise the rollback before the forward path, and exercise it against an organization that is
actively writing. `CATCH_UP` is the state an idle test never enters.

## What this repository cannot provision

Verdicts are what `cell:isolation` would report with the current source and a
correctly-populated `.env`. The "what would close it" column names the next
concrete step, whether code or purchase.

**NAMESPACED is not ISOLATED.** A NAMESPACED resource uses key/prefix
separation within a shared instance. An attacker holding the master credential
of that instance (the Upstash token, the R2 access key, the Ably root key) can
still read all cells' data. Every NAMESPACED row below carries this caveat.

| Resource | Verdict (env configured) | What would close it to ISOLATED |
|---|---|---|
| Cell database | **ISOLATED.** `cell2` has its own logical DB, migration chain and RLS on the `NOBYPASSRLS` application role. | — |
| Cell compute | **SHARED (unavoidable today).** `cell2` runs on the same Neon compute endpoint as `neondb`, so capacity measured here is not a per-cell number. | A separate Neon project or compute endpoint; point `REGION_CELL_2_APP_DATABASE_URL` at it. |
| Redis (cache) | **NAMESPACED** when `REGION_CELL_2_CACHE_KEY_PREFIX=cell-2` is set. Every key for an org in cell-2 carries the prefix; accidental cross-cell collisions in the shared Upstash instance are prevented. When both per-cell Redis credentials are configured, tenant-aware cache operations select that cell's Redis instance. See `.env.example`. | A second Upstash instance; set `REGION_CELL_2_UPSTASH_REDIS_REST_URL` and `REGION_CELL_2_UPSTASH_REDIS_REST_TOKEN`. `CacheService` selects the configured client; the remaining step is operator provisioning and live verification. |
| Object storage | **NAMESPACED** when `REGION_CELL_2_R2_KEY_PREFIX=cell-2` is set. Every object key for an org in cell-2 is prefixed. See `.env.example`. | A dedicated R2 bucket; set `REGION_CELL_2_R2_BUCKET_NAME`, `REGION_CELL_2_R2_ENDPOINT`, and matching credentials. `RegionStorageConfig` already carries these fields; it is configuration, not code. |
| Search index | **SHARED (no cluster deployed).** `searchCluster` is a declared string with nothing behind it. | A search cluster per cell; set `REGION_CELL_2_SEARCH_CLUSTER` and `REGION_CELL_2_SEARCH_API_KEY`. |
| Worker pools | **NAMESPACED** when `REGION_CELL_2_CELL_ID=cell-2` is set on the worker process. Cron lease keys are `cron:lease:cell-2:<job>`; `forEachOrg` now also selects organizations from cell-2's database rather than the primary's. (**Code fix landed 2026-08-29.**) | A worker deployment per cell so the process boundary enforces isolation. The lease-store (Redis) is still shared; a per-cell Redis instance would close that. |
| Realtime broker | **NAMESPACED.** Every Ably channel and token capability is cell-prefixed (`cell:cell-2:*`). A token minted for cell-2 cannot subscribe to cell-1's namespace. | An Ably application per cell; set `REGION_CELL_2_ABLY_API_KEY`. `RegionDefinition.ablyApiKey` already reads it. |
| Monitoring | **NAMESPACED** when `CELL_ID=cell-2` is set on the process. Every log line carries `cellId="cell-2"`; `read-cell-logs.mjs` reads it back. | A per-cell log stream routed to a dedicated dashboard in the log collector. |
| Backup and PITR | **Logical only.** `cell:backup` is a logical dump, restore and read-back verification. Point-in-time recovery is a Neon control-plane operation. | A `NEON_API_KEY` and a scripted branch-restore exercise, timed against the PRD's 5-minute RPO and 60-minute cell RTO. |
| Cross-cell events | **Namespaced transport.** `CrossCellRelay` calls `assertMayCrossCells` before publishing; refusals are dead-lettered to the cell's own `cell_relay_dead_letters` table. The relay uses cell-prefixed Ably channels. | A separate Ably application per cell so the master key scope is cell-local. |

## Provisioning runbook for ISOLATED resources

Each step below closes one resource from NAMESPACED to ISOLATED. Steps are
independent; they may be applied in any order.

### Redis — second Upstash instance

1. Create a new Upstash Redis instance in the Upstash console.
2. Copy the REST URL and token.
3. Add to the cell-2 deployment environment:
   ```
   REGION_CELL_2_UPSTASH_REDIS_REST_URL=https://<instance-id>.upstash.io
   REGION_CELL_2_UPSTASH_REDIS_REST_TOKEN=<token>
   ```
4. Run `pnpm -C backend cell:isolation --region=cell-2` and confirm Redis moves
   from NAMESPACED to ISOLATED.

### Object storage — dedicated R2 bucket

1. Create a new R2 bucket and access key in the Cloudflare dashboard.
2. Add to the cell-2 deployment environment:
   ```
   REGION_CELL_2_R2_BUCKET_NAME=<bucket-name>
   REGION_CELL_2_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   REGION_CELL_2_R2_ACCESS_KEY_ID=<key-id>
   REGION_CELL_2_R2_SECRET_ACCESS_KEY=<secret>
   ```
   No code change needed; `RegionStorageConfig` already carries these fields.
3. Run `pnpm -C backend cell:isolation --region=cell-2` and confirm storage moves
   to ISOLATED.

### Realtime — second Ably application

1. Create a new Ably application in the Ably dashboard.
2. Copy the root API key.
3. Add to the cell-2 deployment environment:
   ```
   REGION_CELL_2_ABLY_API_KEY=<root-key>
   ```
   No code change needed; `RegionDefinition.ablyApiKey` reads it.
4. Run `pnpm -C backend cell:relay` and confirm capability globs are cell-scoped.

### Compute — separate Neon project

1. Create a new Neon project in the Neon console.
2. Create the application role: `pnpm -C backend db:bootstrap-role` against the
   new project.
3. Bootstrap the cell's schema:
   ```
   pnpm -C backend cell:bootstrap --region=cell-2 --database=cell2
   ```
   (Override `REGION_CELL_2_DATABASE_URL` and `REGION_CELL_2_APP_DATABASE_URL` to
   point at the new project first.)
4. Update those two vars in the cell-2 deployment environment.
5. Run `pnpm -C backend cell:isolation --region=cell-2`; `cell compute` will
   move from SHARED to an untested state until a capacity benchmark is run.

## Traps that have already cost time here

- **Measure as `streamline_app` with the tenant GUC, never as the owner.** The owner has `BYPASSRLS`
  and its plans are not the ones production gets.
- **`VACUUM ANALYZE` after any bulk load.** A rewrite kills the statistics *and* empties the
  visibility map — measured here as 53 → 201,875 blocks, and a `COUNT` of 37 → 3,340 that only
  `VACUUM` fixed. An Index Only Scan will not appear without it.
- **`streamline_app`'s password must be set in the Neon console.** `ALTER ROLE … WITH PASSWORD` does
  not stick: the control plane restores the previous one when the branch suspends. Roles are
  cluster-wide, so a new cell database needs grants, not a new password.
- **A journalled migration can still be skipped.** Drizzle applies by timestamp, not by hash, so an
  entry whose `when` is below `max(created_at)` in `drizzle.__drizzle_migrations` never runs and
  `db:migrate` prints success anyway. `cell:bootstrap` avoids this entirely by applying **by hash**
  through `db-bootstrap.mjs`, which is why a cold cell reaches head where `db:migrate` would not.
- **Prove a migration landed with a `pg_catalog` diff, not with the runner's exit code.**
