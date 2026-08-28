# 11 — HR, directory and onboarding read the accessor

**What to build:** The employee record, the people directory, the org chart and the joiner flows all show employment facts from the organization that employs the person. A contractor in two organizations sees the right department, designation and manager in each.

First migrate batch of the users-table split. Sized by blast radius, not by layer: HR and directory own most of the call sites and share their fixtures, so they move together and CI stays green because the legacy columns still exist.

**Blocked by:** [10 — One accessor dual-reads employment, and shouts when the two disagree](10-one-accessor-dual-reads-employment.md)

**Status:** done (read budgets defined but unmeasurable on this dataset — see the criterion)

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the HR module already has the readers to point at the accessor — `modules/hr/core/hr-employments.service.ts`, `hr-people.service.ts`, `hr-employee-record-lists.service.ts`, `hr-timeline.service.ts`, `hr-effective-changes.service.ts`, `modules/directory/person-seam.ts`, `modules/users/user-ops.service.ts`. Root `CLAUDE.md` §8 constrains the onboarding form to real new-joiner data and forbids showing it to org owners or platform admins — that gate is unaffected and must stay.

## Acceptance criteria

- [x] Every HR, directory, org-chart and onboarding read of department, designation, employee number, joining date, location or manager goes through the accessor.

  Twenty files migrated across `hr/core`, `hr/directory`, `hr/onboarding`, `hr/lifecycle`, `hr/time`, `hr/policies`, `hr/templates`, `hr/workflows`, `hr/import`, `hr/performance`, `hr/hr-calendar-source.ts` and `modules/users`.

  Backend-wide scan, **taken while the legacy columns still existed** — the only files still naming one were the migration machinery itself, plus the schema definition and the parity script that read the legacy value deliberately as its "before". Ticket 14 has since dropped the columns and deleted four of these six, so the same scan today returns fewer:

  ```
  $ rg -l "users\.(designation|employeeId|joiningDate|orgDepartmentId|branchId|reportingTo|monthlySalary|bankDetails|taxId)\b" src --type ts | grep -v "\.spec\.ts"
  src/db/schema/common/auth.ts                              <- the column definitions
  src/modules/directory/employment-facts.service.ts         <- the accessor's own fallback arm
  src/modules/hr/core/person-employment-sync.service.ts     <- backfill source
  src/modules/hr/core/employment-backfill.service.ts        <- backfill source
  src/modules/hr/core/employment-reconciliation.service.ts  <- compares the two sides
  src/scripts/verify-payroll-payee-parity.ts                <- reads the legacy value as the "before"
  ```

  This took two passes. The first reported `hr/lifecycle/**` and `hr/policies/**` as "deferred per task spec — later batches"; both were in scope and there is no later batch, and the twenty remaining sites were raw SQL predicates the fallback counter cannot see. Left alone they would have made ticket 14's gate read zero while twenty live readers still depended on the dropped columns.

- [x] List surfaces use the accessor's batch form; a directory page does not become N+1 to gain correctness.

  ```
  $ rg -c "getFactsBatch|getSensitiveFactsBatch|getSensitiveFactsByPersonBatch" src/modules --type ts
  employment-facts.service.ts 5 · payroll-run-payee.ts 3 · hr/directory/org-structure.service.ts 3
  hr/directory/employees.service.ts 3 · hr/workflows/hr-workflow-instances.service.ts 2
  users/organization-users.reader.ts 1 · users/user-operations.reporter.ts 1
  payroll/runs/generate.service.ts 1 · hr/time/leave-approver.service.ts 1 · hr/lifecycle/exit.service.ts 1

  $ rg -n "\.map\(.*getFacts\(|for .*\{[^}]*getFacts\(" src/modules --type ts
  (no matches — no per-row resolution inside a loop)
  ```

- [x] The org chart is built from `hr_reporting_lines`, so a manager change is effective-dated rather than overwritten.

  `hr/directory/org-structure.service.ts` joins `hr_reporting_lines` directly (aliases `rl_vis`, `rl_child`) and resolves children through `getDirectReportUserIds(orgId, managerUserId)`, which reads the open primary line (`effective_to = 'infinity'`). `syncCanonicalReportingLine` closes the previous line at the day before the new one rather than updating it in place, so history survives a manager change.

- [x] A person with memberships in two organizations returns different employment facts in each, proved by a test rather than reasoned about.

  Proved by execution against the real database, not a mock. `pnpm verify:multi-org-employment` finds a user holding two active memberships, writes a distinct designation to each organization's employment, resolves through the accessor in both, asserts independence, and restores the originals.

  ```
  $ pnpm verify:multi-org-employment
  {
    "userId": "aee9ebab-bad6-4b2c-ae38-b7f6b7d26ea5",
    "orgA": { "orgId": "aa5627a2-…", "employmentId": 28, "designation": "Contractor in org A" },
    "orgB": { "orgId": "779bd695-…", "employmentId": 31, "designation": "Head of Engineering in org B" },
    "independent": true,
    "legacyFallbackPossible": false
  }
  ```

  Two separate `hr_employments` rows, two different answers for one `userId`. **This run is from after ticket 14 dropped the columns**, so it also demonstrates the accessor working end to end against the contracted schema. `legacyFallbackPossible: false` is a statement of structural fact — the columns no longer exist — not a measurement; the measured zero-fallback evidence is in ticket 13, taken while the columns were still there.

  The payroll equivalent is `src/modules/payroll/lib/payroll-multi-org.spec.ts`.

- [ ] Read budgets over the directory and employee-record lists are re-measured as `streamline_app` with the tenant GUC after the change.

  **Budgets written and wired, but honestly unmeasurable on this database.** Two new entries in `src/scripts/read-cost-budgets.mjs`: `employee-record-list-canonical` (the list that gained the `hr_people → hr_employments` joins) and `employee-reporting-line-lookup` (the org chart's manager edge, now an effective-dated row).

  The first run passed and that pass was worthless:

  ```
  FAIL  employee-record-list-canonical   blocks=22 (ceiling 8000)
          assertion: hr_employments resolved by Seq Scan
          assertion: hr_people resolved by Seq Scan
  PASS  employee-reporting-line-lookup   blocks=2 (ceiling 5000)
  ```

  `hr_employments` holds 33 rows and `hr_reporting_lines` is empty, so Postgres picks a sequential scan because that is *correct* at this size, and a budget that passes over an empty table proves nothing. `minRows` is now set above dev-seed scale so both declare themselves unmeasurable rather than passing vacuously:

  ```
  FAIL  employee-record-list-canonical   seed too small (4 < 5000)
  FAIL  employee-reporting-line-lookup   seed too small (4 < 1000)
  ```

  This box stays unticked. What would close it: a database seeded to scale, then `pnpm db:check-read-budgets` — which already connects as `streamline_app` and sets the tenant GUC. The measurement infrastructure is in place; the data is not.

- [x] No file in this batch writes to the legacy `users` columns; the dual-write from ticket 09 remains the only writer until ticket 14 removes it.

  Only readers were converted. The writers are unchanged: `sync-canonical-employment-fields.ts`, `sync-canonical-sensitive-fields.ts` and `sync-canonical-reporting-line.ts` remain the only path that writes the canonical side alongside the legacy one.

## Todo

- [x] Readers only. No write path changed in this batch.
- [x] The grep counts were upper bounds, as warned. `designation` alone matches 110 backend files; the real reader set — files naming `users.<column>` as a Drizzle column or selecting it through `db.query.users` — was ~50, and CRM's `designation` (a lead/contact field) was correctly left alone.
- [x] Re-ran them, and the first result was a vacuous pass. Recorded above rather than accepted.
- [x] Set **Status** and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
