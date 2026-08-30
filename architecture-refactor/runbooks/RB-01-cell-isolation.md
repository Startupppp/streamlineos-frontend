# RB-01 Cell Isolation

**Status: OPEN — operator-blocked**
Namespace-only separation does not pass. Independent cell isolation requires separate provisioned resources per cell, not shared infrastructure with prefixed namespaces.

## What "independent" means

| Resource | PASS | FAIL (namespace-only) |
|---|---|---|
| Compute | Separate process/container group per cell, separate CPU/memory quotas | Single process, environment-var-switched cell ID |
| Cache (Redis/Upstash) | Separate Redis instance or separate Upstash database per cell | Shared instance with key prefixes `cell:<id>:` |
| Object storage (R2/S3) | Separate bucket per cell | Shared bucket with path prefix `/cell/<id>/` |
| Search | Separate index namespace with dedicated query allocation | Shared index with filter clause |
| Realtime (Ably) | Separate app or separate namespace allocation | Shared app with channel prefix `cell.<id>.` |
| Worker queue | Separate queue DSN or separate BullMQ connection | Shared queue with job metadata tag |
| Monitoring | Separate metrics namespace or separate workspace | Shared Grafana/Prometheus with label filter |

## Preconditions

- At least two cell environments (e.g. `cell-us-01` and `cell-eu-01`) are provisioned.
- Each cell has its own DATABASE_URL, UPSTASH_REDIS_URL (or equivalent), R2 bucket name, Ably app credential, and worker queue connection.
- You have operator access to the infrastructure console for each resource.
- `backend/.env.cell-us-01` and `backend/.env.cell-eu-01` exist with the per-cell values.

## Verification commands

```bash
# Step 1 — run the isolation check against each cell
cd backend
CELL_ID=cell-us-01 node --env-file=.env.cell-us-01 src/scripts/verify-cell-isolation.mjs
CELL_ID=cell-eu-01 node --env-file=.env.cell-eu-01 src/scripts/verify-cell-isolation.mjs

# Step 2 — verify the check can report NAMESPACED (shared) vs ISOLATED
# The self-test confirms this distinction:
node src/scripts/verify-cell-isolation.mjs --self-test
# Expected: SELF-TEST PASS: a shared database is reported as a failure; NAMESPACED is a recognised verdict
```

## Expected output

Each cell must produce `ISOLATED` for every resource category. A `NAMESPACED` verdict is a FAIL for this gate. A `SHARED` verdict is a hard FAIL.

```
cell-us-01  compute       ISOLATED
cell-us-01  cache         ISOLATED
cell-us-01  object_storage ISOLATED
cell-us-01  search        ISOLATED
cell-us-01  realtime      ISOLATED
cell-us-01  worker        ISOLATED
cell-us-01  monitoring    ISOLATED
```

## Pass threshold

All seven resource categories report `ISOLATED` for every provisioned cell. Zero `NAMESPACED` or `SHARED` verdicts.

## Evidence recording

Pipe full output to `architecture-refactor/runbooks/evidence/RB-01-cell-isolation-<date>.txt`.
Commit the evidence file. The OPERATOR-EVIDENCE.md row moves from OPEN to PASS only after this file exists.

## Rollback

No state is changed by this check — it is read-only. If any category shows `NAMESPACED`, provision a separate resource for that category before proceeding.

## Self-test result (guard correctness)

`cell:isolation:self-test` PASSED on 2026-08-30:
`SELF-TEST PASS: a shared database is reported as a failure; NAMESPACED is a recognised verdict`
The guard can detect the violation. The infrastructure does not yet exist.
