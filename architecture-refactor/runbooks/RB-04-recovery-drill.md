# RB-04 Recovery Drill (Measured RPO / RTO)

**Status: OPEN — operator-blocked**
The recovery drill script structure and result shape are verified correct by self-test. Running the actual drill requires production-equivalent infrastructure (a cell with real backup/restore mechanisms and a worker tier).

## Preconditions

- RB-02 (PITR) is complete: a backup/restore path exists for every cell.
- RB-01 (Cell isolation) is complete: cells are independently resourced.
- `CELL_IDS` environment variable lists the cells to drill (e.g. `cell-us-01,cell-eu-01`).
- `DRILL_NOTIFICATION_EMAIL` is set so the drill report is delivered.
- Operator has IAM/console access to force-terminate and restore a cell.
- A maintenance window is scheduled; the drill will cause brief unavailability on the drilled cell.

## Step 1 — Dry-run the drill

```bash
cd backend
node --env-file=.env src/scripts/run-recovery-drill.mjs --dry-run
# Expected: "dry-run" output listing the steps that would run, no state changed.
# Exit 0.
```

## Step 2 — Execute the drill against a non-production cell first

```bash
# Execute against a staging/canary cell:
DRILL_CELL=cell-staging \
node --env-file=.env.staging src/scripts/run-recovery-drill.mjs

# The drill script:
#   1. Records the pre-drill timestamp T0.
#   2. Simulates a cell failure (terminates compute or routes traffic away).
#   3. Starts recovery (branch restore or failover).
#   4. Measures time to first successful health check = RTO.
#   5. Measures the last data point recoverable from the backup = RPO.
#   6. Writes a JSON result to stdout.
```

## Step 3 — Execute against production cell (with approval)

```bash
# Requires written approval from the operator logged in the evidence file.
# Schedule in low-traffic window.
DRILL_CELL=cell-us-01 \
DRILL_APPROVAL="approved by <name> at <timestamp>" \
node --env-file=.env src/scripts/run-recovery-drill.mjs

# Record the JSON result.
```

## Step 4 — Verify the self-test proves guard correctness

```bash
node src/scripts/run-recovery-drill.mjs --self-test
# Result (2026-08-30): SELF-TEST PASS: drill script structure and result shape are correct
```

## Expected output

```json
{
  "cell": "cell-us-01",
  "drillType": "database-cell-failure",
  "t0": "2026-08-30T03:00:00Z",
  "failureInjected": "2026-08-30T03:00:05Z",
  "firstHealthCheckPass": "2026-08-30T03:02:30Z",
  "lastRecoverablePoint": "2026-08-30T02:59:50Z",
  "rtoSeconds": 145,
  "rpoSeconds": 10,
  "verdict": "PASS"
}
```

## Pass threshold

- RTO <= 600 seconds (10 minutes) for database-cell-failure scenario.
- RPO <= 300 seconds (5 minutes) from last backup point — aligns with RB-02.
- `failure-drill:self-test` passes (confirmed 2026-08-30, all five drills verified).
- Drill JSON contains `"verdict": "PASS"`.

## Evidence recording

Save the full JSON output to `architecture-refactor/runbooks/evidence/RB-04-recovery-drill-<date>.json`.
Include the cell, drill type, RTO, RPO, and the operator approval note.

## Rollback

If the drill leaves a cell in a degraded state, restore from the most recent backup:
```bash
# Neon console → Branch → Restore to point-in-time (T0 - 10 minutes)
# Then route traffic back to the restored branch.
```

## Self-test result (guard correctness)

`failure-drill:self-test` PASSED on 2026-08-30:
`{"selfTest":true,"pass":true,"checks":{"allFiveDrillsPresent":true,"allDrillsReturnDryRunWithoutExecuteFlag":true,"cacheLossBlockedInExecuteMode":true,"badReleaseBlockedInExecuteMode":true,"badReleaseNotFakePass":true},"drills":["provider-outage","queue-backlog","cache-loss","database-cell-failure","bad-release"]}`
The guard correctly models all five drill scenarios. Live execution requires operator-provisioned infrastructure.
