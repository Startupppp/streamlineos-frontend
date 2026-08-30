# RB-02 PITR / Backup Frequency (5-minute RPO)

**Status: OPEN — operator-blocked**
Meeting a five-minute operational RPO requires continuous WAL archiving (or an equivalent point-in-time recovery mechanism) configured at the managed-database provider level. This cannot be proved by application code alone.

## Preconditions

- Production Neon database project is provisioned.
- Neon PITR is enabled on the production branch (Neon Pro plan or higher is required; PITR is not available on the Free plan).
- Operator has access to the Neon console and Neon API key.
- The `cell:backup` script and `cell:backup:self-test` pass (confirmed 2026-08-30).

## Step 1 — Confirm PITR is enabled and measure the retention window

```bash
# Using the Neon API (replace <project-id> and <branch-id>):
curl -s -H "Authorization: Bearer $NEON_API_KEY" \
  "https://console.neon.tech/api/v2/projects/<project-id>/branches/<branch-id>" \
  | jq '{history_retention_seconds, created_at}'

# Pass threshold: history_retention_seconds >= 86400 (24 hours minimum)
# For a 5-minute RPO, the WAL archival interval must be <= 5 minutes.
# Neon continuous branching achieves sub-minute granularity on Pro.
```

## Step 2 — Measure the actual RPO by simulating a restore

```bash
# 1. Insert a sentinel row in a test table with a known timestamp T1.
# 2. Wait 6 minutes (one RPO cycle past the target).
# 3. Restore to timestamp T1 using Neon branch restore:
#    neon branches restore <branch-id> --timestamp "<T1 ISO-8601>" \
#      --project-id <project-id>
# 4. Verify the sentinel row is present in the restored branch.
# 5. Record: restore_point = T1, actual_restore_latency = wall time for branch restore.

# RPO = T2 (first write after the restore point) - T1 (last safe restore point).
# Must be <= 5 minutes.
```

## Step 3 — Run the backup integrity script

```bash
cd backend
node --env-file=.env src/scripts/cell-backup.mjs
# Expected: reports backup status for each cell.
# Self-test (no DB needed):
node src/scripts/cell-backup.mjs --self-test
# Result (2026-08-30): SELF-TEST PASS: parents precede children and the cycle is reported, not silently ordered
```

## Expected output

```
Cell backup report — 2026-08-30T22:40:00Z
  cell-us-01  last_backup=2026-08-30T22:35:00Z  age=5m  status=OK
  cell-eu-01  last_backup=2026-08-30T22:35:00Z  age=5m  status=OK
RPO target: 5m — MET
```

## Pass threshold

- PITR enabled on all production cell branches.
- `history_retention_seconds >= 86400`.
- Restore drill confirms the last restorable point is never more than 5 minutes old.
- `cell:backup` script exits 0 for every cell.

## Evidence recording

Save the Neon API response and the drill output to `architecture-refactor/runbooks/evidence/RB-02-pitr-<date>.txt`.

## Rollback

A failed restore attempt creates a separate Neon branch and does not affect the production branch. Delete the restore branch after measuring.

## Self-test result (guard correctness)

`cell:backup:self-test` PASSED on 2026-08-30:
`SELF-TEST PASS: parents precede children and the cycle is reported, not silently ordered`
The guard structure is correct. PITR is not yet provisioned.
