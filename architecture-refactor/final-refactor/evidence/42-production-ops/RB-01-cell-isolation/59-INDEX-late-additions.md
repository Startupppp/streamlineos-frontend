# Three drills the first RB-01 pass missed

Added 2026-09-03 after an adversarial review of the RB-01/RB-08 evidence found three
locally-runnable proofs absent from it. All three need no cloud and run in seconds, and the
first is the repository's dedicated drill for the exact sentence PRD-C169 asks for —
"prove credentials, routing, jobs, namespaces and data cannot cross cells".

| File | Command | Result |
|---|---|---|
| `60-cell-relay-self-test.txt` | `npm run cell:relay:self-test` | exit 0, 5/5 |
| `61-cell-resource-isolation-spec.txt` | `jest --testPathPattern="degradation/cell-resource-isolation"` | exit 0, 9/9 |
| `62-region-namespacing-specs.txt` | `jest --testPathPattern="common/region/(region.config\|cell-admission\|cross-cell-events)"` | exit 0, 33/33 |

Environment for all three (the omission that made the first pass unreproducible — record every
variable actually in effect, not a fixed header):

    APP_DATABASE_URL=postgresql://streamline_app:<pw>@localhost:5432/scratch_head_1010
    DATABASE_URL=postgresql://<owner>@localhost:5432/scratch_head_1010
    PGSSLMODE=disable   TZ=Asia/Kolkata

`cell:relay:self-test` refuses to run at all without both database URLs; the first pass's
failure to set them is why it was recorded nowhere.

## What these do and do not establish

They prove the cross-cell **code path** refuses cell-local events and dead-letters them
(`assertMayCrossCells("build.ticket.created")` throws `CrossCellEventRefusedError`;
`relay("hr.employee.onboarded").status = "refused"`, `deadLettered = true`), that one cell's
resource outage does not consume another's budget, and that cache/region keys are namespaced
per cell.

They do NOT establish provisioning. PRD-C168's seven components — database, cache,
queue/workers, realtime/provider, search/vector, object storage, monitoring — still require
real accounts, and RB-08's six steps are console logins the runbook itself calls "a purchase,
not a code change". A `NAMESPACED` verdict remains a FAIL against RB-01's own threshold.
