# RB-03 Physical Read Replica

**Status: OPEN — operator-blocked**
A read replica requires provisioning at the managed-database provider level. This runbook covers provisioning, lag measurement, and proving replica-safe versus primary-required workload behaviour.

**Scripts are code-complete.** `verify-replica-routing.mjs` now measures replication lag (`pg_last_xact_replay_timestamp`) and WAL receive distance (`pg_last_wal_receive_lsn` vs `pg_current_wal_lsn`) in addition to the existing connectivity, GUC, and RLS checks. When `DB_REPLICA_URL` is absent the script exits **2** (prerequisite missing) rather than 0 or 1, so a missing replica is never confused with a passed check. The `streamline_app` role is failing `28P01 password authentication failed` on the dev branch — set the correct password in the Neon console (not with `ALTER ROLE`, which Neon's control plane overwrites on suspend) before running live checks.

## Self-test (logic only, no DB required)

```bash
cd backend
node src/scripts/verify-replica-routing.mjs --self-test
# 16 cases pass: prereq detection, endpoint distinction, RLS error classification,
# watermark alignment, lag classification, LSN distance classification.
# Exits 0 regardless of DB_REPLICA_URL — self-test proves the LOGIC, not the infrastructure.
```

## Preconditions

- Production Neon project with at least one compute endpoint on the primary branch.
- Neon allows read-only compute endpoints on any branch, including the primary. Each compute endpoint is a separate Postgres server. The read-only endpoint honours Neon's read replica semantics.
- Operator has console access and a `DATABASE_REPLICA_URL` variable for the read-only endpoint.
- `streamline_app` password must be set in the **Neon console** — `ALTER ROLE` does not persist past a compute suspend. `APP_DATABASE_URL` uses this role; connections fail `28P01` if it regressed.

## Step 1 — Provision the read replica

```
Neon console → Project → Compute → Add compute endpoint
  Type: read replica
  Branch: main (production)
  Autoscaling: configure per cell sizing
  Save → copy the connection string to DATABASE_REPLICA_URL in .env
```

## Step 2 — Run the script against the provisioned replica

```bash
cd backend
# Basic routing + lag + RLS check (exits 2 if DB_REPLICA_URL unset, exits 1 if any check fails):
DB_REPLICA_URL="<replica-connection-string>" \
APP_DATABASE_URL="$APP_DATABASE_URL" \
  node src/scripts/verify-replica-routing.mjs

# With isolation checks (phantom org + migration watermark alignment):
DB_REPLICA_URL="<replica-connection-string>" \
APP_DATABASE_URL="$APP_DATABASE_URL" \
  node src/scripts/verify-replica-routing.mjs --isolation
```

The script measures and reports:
- Replica reachable (`SELECT 1`)
- Replica endpoint host is distinct from primary (prevents routing to self)
- GUC round-trip inside `BEGIN READ ONLY` transaction
- RLS table count on replica (must be > 0)
- RLS fails closed without GUC (`42501`)
- **Replication lag** (`pg_last_xact_replay_timestamp`) — must be ≤10s and non-NULL (NULL means primary endpoint)
- **WAL receive distance** (`pg_last_wal_receive_lsn` vs primary `pg_current_wal_lsn`) — must be ≤64MB
- (--isolation) Phantom org returns 0 rows — no cross-tenant leak
- (--isolation) Replica migration watermark matches primary

## Step 3 — Measure replication lag manually

```bash
# On the replica:
psql "$DATABASE_REPLICA_URL" -c \
  "SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;"

# Run 10 times over 5 minutes and record the max.
# Pass threshold: max observed lag < 5 seconds under normal write load.

# Under write load (run seed or a load test in parallel):
cd backend
node --env-file=.env src/scripts/run-load-driver.mjs \
  --duration=300 --workers=4 --scenario=write-mix
# Then re-measure lag on replica.
```

## Step 3 — Categorize workload by replica-safe vs primary-required

### Replica-safe (read from replica)
- `GET /tickets` list and `GET /tickets/:ticketId` — read-after-write is acceptable (stale up to lag)
- `GET /build/projects` — list queries with eventual consistency
- `GET /billing/entitlements` — short-TTL cached, stale acceptable
- `GET /me/access` — cached in Redis; replica read is baseline only

### Primary-required (always primary)
- All `POST`/`PUT`/`PATCH`/`DELETE` requests — writes go to primary
- `POST /auth/login`, `/auth/refresh` — authentication must be consistent
- `GET /me/access` when cache is cold — RBAC resolution must be authoritative
- Any read-after-write path where the response is used to gate a subsequent write
- `GET /billing/seats` when checking quota before insert
- All RBAC guard queries (guards run before interceptors, use explicit connection)

### Enforcement check

```bash
# Verify that the application correctly routes reads by checking the
# DatabaseService routing logic:
grep -r "DATABASE_REPLICA_URL\|readReplica\|replica" backend/src/common/ backend/src/db/
# Document which paths resolve to the replica connection vs the primary.
```

## Step 4 — Prove lag under measured write load

```bash
# 1. Start the load driver (write workload):
cd backend
node --env-file=.env src/scripts/run-load-driver.mjs \
  --duration=120 --workers=8 --scenario=write-mix > /tmp/load-output.txt 2>&1 &

# 2. Every 10 seconds, capture replication lag:
for i in $(seq 1 12); do
  psql "$DATABASE_REPLICA_URL" -c \
    "SELECT now() - pg_last_xact_replay_timestamp() AS lag;" -t
  sleep 10
done

# Record peak lag and steady-state lag.
# Pass threshold: peak lag < 10 seconds; steady-state < 2 seconds.
```

## Expected output

```
Replication lag measurements (12 samples under write load):
  min=0.3s  p50=0.8s  p95=1.4s  max=2.1s
Pass: all samples below 10-second peak threshold.
Pass: steady-state (p50) below 2-second threshold.
```

## Pass threshold

- Read replica endpoint is provisioned and reachable.
- Peak replication lag < 10 seconds under the write-mix load profile.
- Steady-state (p50) lag < 2 seconds.
- Primary-required paths are explicitly documented and routed to the primary connection.
- Replica-safe paths are explicitly using `DATABASE_REPLICA_URL`.

## Evidence recording

Save lag measurements to `architecture-refactor/runbooks/evidence/RB-03-replica-lag-<date>.txt`.
Save the routing classification to `architecture-refactor/runbooks/evidence/RB-03-routing-classification.md`.

## Rollback

The read replica is read-only; deleting it does not affect the primary or any data.
