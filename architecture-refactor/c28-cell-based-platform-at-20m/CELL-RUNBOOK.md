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

These are real gaps, not pending work items. Each names what would close it.

| Resource | State | What would close it |
|---|---|---|
| Cell database | **Provisioned.** `cell2` on the same Neon project, its own migration chain, its own RLS, reached by the `NOBYPASSRLS` application role. | — |
| Cell compute | **Shared.** `cell2` runs on the same Neon endpoint as `neondb`, so a capacity number measured here is not a per-cell number. | A separate Neon project or a separate compute endpoint, and `REGION_CELL_2_APP_DATABASE_URL` pointed at it. |
| Redis | **Shared.** One Upstash instance, no per-cell override. | A Redis instance per cell and a `RegionCacheConfig` beside `RegionStorageConfig` in `region.config.ts`. |
| Object storage | **Shared.** One R2 bucket. `RegionStorageConfig` already carries a per-region bucket and endpoint, so this is configuration, not code. | `REGION_CELL_2_R2_BUCKET_NAME` and `REGION_CELL_2_R2_ENDPOINT` pointed at a cell-owned bucket or prefix. |
| Search index | **Absent.** No search cluster is deployed for any cell; `searchCluster` is a declared string with nothing behind it. | A search cluster per cell, and the ACL-safe retrieval path pointed at the cell's own index. |
| Worker pools | **Shared.** Cron and the outbox relay run inside the control-plane process. | A worker deployment per cell, scheduled against the cell's own database. |
| Realtime broker | **Shared.** One Ably application; channel names carry the organization id but not the cell. | An Ably application per cell, or a cell segment in the channel namespace and per-cell capability tokens. |
| Monitoring | **Unproved.** No cell dimension is readable back from logs, spans or metrics. | A `cellId` label on every log line, span and metric, and a per-cell dashboard and alert destination. |
| Backup and PITR | **Logical only.** `cell:backup` is a logical dump, restore and read-back verification. Point-in-time recovery is a Neon control-plane operation. | A `NEON_API_KEY` and a scripted branch-restore exercise, timed against the PRD's 5-minute recovery point and 60-minute cell recovery time. |
| Cross-cell events | **Declared, not transported.** `common/region/cross-cell-events.ts` declares the allowlist and refuses everything else; no cross-cell transport exists to carry them. | A per-cell broker namespace and a relay that calls `assertMayCrossCells` before publishing. |

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
