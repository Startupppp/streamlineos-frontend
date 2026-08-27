# 09 — Employment truth is backfilled into the organization-owned tables

**What to build:** Every person who has employment facts on their global account also has them on the organization-owned records that are supposed to hold them, and the two agree. This is the expand step of the users-table split: nothing is deleted, nothing changes what it reads, and after it every organization fact is available from the place it belongs.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the destination tables already exist and are wired.

| Fact on `users` (`db/schema/common/auth.ts:109-163`) | Destination |
|---|---|
| `orgDepartmentId` | `hr_employments.departmentId` |
| `designation` | `hr_employments.designation` |
| `joiningDate` | `hr_employments.joiningDate` |
| `employeeId` | `hr_employments.employeeNumber` |
| `branchId` | `hr_employments.locationId` |
| `reportingTo` | `hr_reporting_lines` (effective-dated) |
| `monthlySalary` | `hr_employee_sensitive_fields.salaryAmountCents` / `employee_salary_profiles` |
| `bankDetails`, `taxId` | `hr_employee_sensitive_fields` |

`common/hr/sync-canonical-employment-fields.ts` already dual-**writes** three of them — `designation`, `departmentId`, `joiningDate` — but only *"when a canonical primary employment already exists"*, which is precisely the population this backfill has to create. `common/hr/sync-canonical-sensitive-fields.ts` does the same for the sensitive set. `organization_people` (`db/schema/directory/organization-people.ts`) already links `(organizationId, userId, organizationMembershipId)`, and `hr_people.organizationPersonId` already has a composite FK to it.

## Acceptance criteria

- [ ] Every active membership with any employment fact on `users` has an `organization_people` row, an `hr_people` row and a primary `hr_employments` row.
- [ ] Each field in the table above is copied to its destination; a value that cannot be mapped — a `branchId` naming no live org unit, an `employeeId` colliding with `uniq_hr_employments_org_emp_num` — is **reported**, not dropped and not silently defaulted.
- [ ] `reportingTo` becomes an effective-dated `hr_reporting_lines` row rather than a flat column, and a manager who is not a member of the same organization is reported rather than written.
- [ ] The backfill is resumable — it records progress and can be re-run after a failure without duplicating rows or advancing a sequence past a gap.
- [ ] The dual-write conditions in both `sync-canonical-*` files are widened to the full field set, so nothing written after the backfill diverges.
- [ ] A reconciliation query reports zero rows where `users` and the canonical tables disagree, and it is runnable on demand rather than being a one-off script output pasted into this ticket.

## Todo

- [ ] Count the population before writing the backfill; the number of memberships with a non-null `employeeId` decides whether this is one statement or a batched job.
- [ ] Do not seed synthetic rows to make the reconciliation pass — a zero-row agreement is a tautology, and the program has caught that pattern twice already.
- [ ] Journal every migration file and `VACUUM ANALYZE` anything rewritten.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
