# 14 — `users` holds authentication identity only

**What to build:** The global account holds who you are to the platform — login, credentials, account state — and nothing about who you are to an organization. The contract step of the users-table split: the employment and payroll columns are dropped, and the structure now makes it impossible for one person's two employers to overwrite each other.

**Blocked by:** [11 — HR, directory and onboarding read the accessor](11-hr-directory-and-onboarding-read-the-accessor.md) · [12 — Payroll, finance and compensation read the accessor](12-payroll-and-finance-read-the-accessor.md) · [13 — The remaining readers migrate](13-the-last-readers-migrate.md)

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the columns to drop, all in `db/schema/common/auth.ts:109-163` — `joiningDate`, `taxId`, `bankDetails`, `orgDepartmentId`, `designation`, `monthlySalary`, `employeeId`, `reportingTo`, `branchId`, and the indexes and self-referencing foreign key that hang off them (`idx_users_reporting_to`, `idx_users_org_department`, `foreignKey({ columns: [reportingTo] })`). `onboardingDocStatus` / `onboardingCompletedAt` need a product ruling: the workspace gate that reads them is per-user today and per-membership in the target model.

## Acceptance criteria

- [ ] The employment and payroll columns are dropped from `users`, along with their indexes and the `reportingTo` self-referencing foreign key.
- [ ] The drop is evidenced by a `pg_catalog` diff against the live database, not by the migration reporting success — a migration recorded as applied with half its statements unrun has already happened once in this program.
- [ ] The migration is journalled; a `.sql` file absent from `meta/_journal.json` never applies and `db:migrate` reports success anyway.
- [ ] `VACUUM ANALYZE users` after the rewrite; a column drop invalidates the statistics and empties the visibility map, and the planner keeps assuming the old tuple width.
- [ ] The dual-write in `common/hr/sync-canonical-*.ts` is removed in the same change — with the source gone it is dead code, and dead code beside a security-adjacent path is a trap for the next reader.
- [ ] A cold `db:migrate` from empty produces a `users` table with no employment columns; the schema source and the migration chain agree.
- [ ] The onboarding-status columns are either kept with a written reason or moved to the membership, decided rather than left.

## Todo

- [ ] Confirm ticket 13's fallback counter reads zero over a real run before dropping anything. The counter is the gate.
- [ ] Drop dependent indexes and the foreign key before the columns, so the migration does not fail halfway and leave a partially contracted table.
- [ ] `SET lock_timeout` at the top; a drop that queues behind a long reader blocks every login.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
