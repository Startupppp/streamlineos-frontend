# 39-security: Compliance Workflow Evidence

Date: 2026-08-29  
Lane: D (ticket 39)

## Workflows exercised

The compliance drill (`backend/src/scripts/compliance-drill.mjs`) exercises the following workflows in order against a disposable synthetic organisation. All steps run in a transaction that is rolled back in dry-run mode.

### Dry-run output (verified in this session)

```
DRY RUN — the drill will execute inside a transaction and then roll back.
All SQL runs, all audit rows are inserted, all assertions are checked.
No data survives after the rollback.

Drill org  drill-d571f211
Drill user drill-user-d571f211
Dry run    true

Step 0 — create synthetic user and organisation
  synthetic org ready  membershipId=908267

Step 1 — data export request
  export request id=3

Step 2 — legal hold placed on subject
  hold id=2

Step 3 — erasure refused while hold is active
  subject is under 1 active hold(s) — delete request correctly blocked
  delete request correctly rejected while hold active (request id=4)

Step 4 — legal hold released
  hold 2 released

Step 5 — retention policy applied
  retention policy id=1

Step 6 — deletion/erasure request (hold released)
  erasure request id=5

Step 7 — org purge path
  org drill-d571f211 marked PURGE_SCHEDULED

─── Audit evidence ───────────────────────────────────────
  7 audit row(s) for org drill-d571f211:
    [197]  hr_data_request.created  2026-08-28T13:13:11.001Z
    [198]  hr_legal_hold.placed  2026-08-28T13:13:11.001Z
    [199]  hr_data_request.rejected_legal_hold  2026-08-28T13:13:11.001Z
    [200]  hr_legal_hold.released  2026-08-28T13:13:11.001Z
    [201]  hr_retention_policy.created  2026-08-28T13:13:11.001Z
    [202]  hr_data_request.created  2026-08-28T13:13:11.001Z
    [203]  org.purge_scheduled  2026-08-28T13:13:11.001Z
  All required audit actions present.

─── Known gaps (honest report) ────────────────────────────
  INCOMPLETE: Export pipeline — hr_data_requests tracks requests; no export worker produces an actual data file.
  INCOMPLETE: object_storage purge adapter — returns FAILED ('not yet implemented, manual cleanup required').
  INCOMPLETE: database_rows adapter — marks statusV2=PURGED but does NOT physically delete tenant data rows.
```

### Known gaps (incomplete workflows)

| Gap | Location | Severity | Status |
|-----|----------|----------|--------|
| Export pipeline end-to-end | `hr_data_requests` table + no export worker | MEDIUM | PRODUCT-BLOCKED — tracking table exists, execution worker unimplemented |
| Object-storage purge | `organization-purge-adapters.ts` `object_storage` adapter | HIGH | OPERATOR-BLOCKED — requires per-table file_key audit; manual process |
| Database rows physical delete | `database_rows` adapter marks `statusV2=PURGED`, does not cascade-delete | HIGH | PRODUCT-BLOCKED — physical cascade deletion not implemented |

## Execute command (for orchestrator)

Run from `backend/`:
```
node src/scripts/compliance-drill.mjs --execute
```

The script creates a disposable org, exercises all 7 steps, verifies 7 audit rows, and cleans up. No real tenant data is touched.
