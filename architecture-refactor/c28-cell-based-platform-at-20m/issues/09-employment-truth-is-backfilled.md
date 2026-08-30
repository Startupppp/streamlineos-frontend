# 09 — Employment truth is backfilled into the organization-owned tables

**What to build:** Every person who has employment facts on their global account also has them on the organization-owned records that are supposed to hold them, and the two agree. This is the expand step of the users-table split: nothing is deleted, nothing changes what it reads, and after it every organization fact is available from the place it belongs.

**Blocked by:** None — can start immediately

**Status:** done

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

- [x] Every active membership with any employment fact on `users` has an `organization_people` row, an `hr_people` row and a primary `hr_employments` row.

  `PersonEmploymentSyncService` already created the person/employment shell, so the backfill reuses it rather than writing a second one; `EmploymentBackfillService` (`modules/hr/core/employment-backfill.service.ts`) wraps it and carries the remaining fields. Run across every organization:

  ```
  $ pnpm backfill:employment --all
  {"orgId":"fd8b9f14-...","scanned":2,"createdPeople":2,"createdEmployments":2,...,"unmappable":[],"errors":[],"drift":[]}
  {"summary":true,"organizations":49,"unmappable":0,"drift":0}
  ```

  A person in two organizations gets one employment per organization — user `aee9ebab-…` holds two active memberships and resolves to two separate `hr_employments` rows.

- [x] Each field in the table above is copied to its destination; a value that cannot be mapped is **reported**, not dropped and not silently defaulted.

  `departmentId` and `locationId` are resolved against live `org_units` (`ACTIVE`, not soft-deleted) before being written; an id naming no live unit is reported. An `employeeId` that collides with `uniq_hr_employments_org_emp_num` is detected by comparing the number that actually landed against the one wanted, and reported with the stored value — the pre-existing `-SUFFIX` fallback is no longer silent. Every report is written durably to `hr_audit_logs` under `employment_backfill.unmappable` as well as returned.

  Live run: **0 unmappable across 49 organizations.**

  The bank/tax values genuinely moved — `hr_employee_sensitive_fields.bank_details` now holds envelope ciphertext, not the old plaintext `jsonb`:

  ```
  $ node scripts/db-query.mjs "select left(s.bank_details,8) as prefix, s.encryption_key_ref from hr_employee_sensitive_fields s ..."
  { "canon_bank_prefix": "enc:v2:v", "encryption_key_ref": "kek:v1" }   (x3)
  ```

- [x] `reportingTo` becomes an effective-dated `hr_reporting_lines` row rather than a flat column, and a manager who is not a member of the same organization is reported rather than written.

  `common/hr/sync-canonical-reporting-line.ts`. It closes the open line (`effective_to = 'infinity'`) at the day before the new line's `effective_from` and inserts the new one, so a manager change is dated rather than overwritten. Four outcomes are reported and never written: `manager-not-in-organization`, `manager-has-no-employment`, `self-reference`, `employment-missing`.

  No organization in the live database has a non-null `users.reporting_to` (`select count(*) … where reporting_to is not null` → `0`), so this path wrote zero rows in the live run. The branching is covered by the code path above rather than by live data — stated plainly rather than claimed as exercised.

- [x] The backfill is resumable — it records progress and can be re-run after a failure without duplicating rows or advancing a sequence past a gap.

  Progress is a durable `hr_audit_logs` checkpoint (`employment_backfill.checkpoint`, carrying `afterMembershipId`), read back on start. Batches ascend by membership id under a high watermark taken at start, each row is its own tenant transaction, and every write is an update or an `onConflictDoUpdate` — so a re-run neither duplicates nor skips.

  Proven by an actual failure and recovery: the first run aborted mid-way on `hr_audit_logs_actor_id_users_id_fk` (the system actor is not a `users` row — actor is now nullable for system-initiated runs). The re-run completed with `errors: []` and produced no duplicate people or employments.

- [x] The dual-write conditions in both `sync-canonical-*` files are widened to the full field set, so nothing written after the backfill diverges.

  `sync-canonical-employment-fields.ts` gains `locationId` and `employeeNumber` beside `designation`/`departmentId`/`joiningDate`; `sync-canonical-sensitive-fields.ts` gains `bankDetails` beside `monthlySalary`/`taxId`, seals both through the envelope scheme and records `encryptionKeyRef`. Their existing specs still pass unchanged:

  ```
  $ node ./node_modules/jest/bin/jest.js src/common/security src/common/hr src/modules/directory
  Test Suites: 15 passed, 15 total
  Tests:       197 passed, 197 total
  ```

- [x] A reconciliation query reports zero rows where `users` and the canonical tables disagree, and it is runnable on demand.

  `EmploymentReconciliationService` + `pnpm report:employment-drift`, exit code 1 when anything disagrees.

  ```
  $ pnpm report:employment-drift --all
  {"orphanedEmploymentFacts":{"userId":"411c65cb-…","email":"repro.salary.1787378791604@example.com","fields":["employeeId","designation","joiningDate","monthlySalary"]}}
  … 3 more repro.salary.* rows …
  {"summary":true,"organizations":49,"disagreements":0,"orphanedUsers":4,"fallbacks":{"total":0,"byField":{}}}
  ```

  **Zero is not a tautology here.** Three users carry real `bankDetails`/`taxId`; the reconciliation decrypts both sides and compares by content, so `disagreements: 0` is the evidence the envelope ciphertext round-trips to the same value the legacy column holds.

  **Four users hold employment facts and no membership at all** — `repro.salary.*` leftovers from an earlier e2e run. They belong to no organization, so there is no organization-owned row to move them to; the report names them so ticket 14 cannot drop those columns without a decision on them. They are reported, not silently skipped.

  The first version of this orphan check was wrong and is worth recording: it read `organization_members` with no tenant context, RLS returned zero rows, and it reported all seven fact-bearing users as orphans — three of which demonstrably had active memberships. Fixed by collecting active member ids per organization inside `runInNewTenantTransaction`.

> **Note for a later reader.** Everything this ticket built to *perform* the migration was retired by
> ticket 14 once the legacy columns were dropped and it could no longer run: `EmploymentBackfillService`,
> `EmploymentReconciliationService`, and the `backfill:employment` / `report:employment-drift` scripts.
> The command output below is what they produced while the legacy columns still existed — do not expect
> to find those files or scripts on disk. `person-employment-sync.service.ts` and the `sync-canonical-*`
> writers were deliberately kept, because they create and maintain live records rather than migrating them.

## Todo

- [x] Counted first: 77 users, 71 memberships, 49 organizations; 4 users with a non-null `employeeId`, 3 with `bankDetails`/`taxId`. Small enough for one pass, but written batched (100 per fetch, checkpointed) because the shape has to survive production volume.
- [x] No synthetic rows were seeded. The agreement is proved against the three users that actually carry sensitive data.
- [x] Migration `0609_employment_sensitive_fields_envelope_encryption.sql` journalled as idx 330 and verified in `pg_catalog`, not by the runner's exit code. No table was rewritten by it (`hr_employee_sensitive_fields` held 0 rows), so no `VACUUM ANALYZE` was required; ticket 14's column drop does rewrite `users` and vacuums there.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
