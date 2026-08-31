# Session 2 — The users-table split

**This is the heaviest session in the program.** It is the one genuine wide refactor: `designation`
appears in 90 backend and 64 frontend files, `employeeId` in 78 and 52, `joiningDate` in 53. No single
edit lands green, so it is sequenced expand → three migrate batches → contract, and every batch stays
green because the old columns still exist until the last one.

**Read in this order, then act.**

1. [`PROTOCOL.md`](PROTOCOL.md) — binding. Especially §1 (ask everything now) and §2 (a checkbox is evidence).
2. Root `CLAUDE.md`, then `backend/CLAUDE.md`, then `frontend/CLAUDE.md`.
3. Your six tickets in full: [`../issues/`](../issues/) files `09` through `14`.
4. [`../README.md`](../README.md), and the PRD's *Organization and identity model* section.

## Your tickets

Six, all edges internal.

| # | Ticket | Blocked by |
|---|---|---|
| 09 | Employment truth is backfilled into the organization-owned tables | — |
| 10 | One accessor dual-reads employment, and shouts when the two disagree | 09 |
| 11 | HR, directory and onboarding read the accessor | 10 |
| 12 | Payroll, finance and compensation read the accessor | 10 |
| 13 | The remaining readers migrate | 10 |
| 14 | `users` holds authentication identity only | 11, 12, 13 |

`11`, `12` and `13` are independent of each other — that is deliberate, they are batches sized by blast
radius. `14` is the contract and its gate is ticket `10`'s fallback counter reading zero over a real run.

## Start here — the destination already exists

Do not design new tables. These are declared and wired today:

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

`common/hr/sync-canonical-employment-fields.ts` already dual-**writes** three of them, but only *"when a
canonical primary employment already exists"* — which is exactly the population ticket `09` creates.
`modules/directory/person-seam.ts` may already be most of ticket `10`'s accessor; read it before writing
a second one.

## Ask these first — plus anything else you find

1. **`bankDetails` and `taxId` are not encrypted today.** `hr_employee_sensitive_fields.bankDetails` is
   plain `jsonb`, `taxId` plain `text`. Ticket `12` requires envelope encryption with an auditable key
   reference, failing closed. Search the repo for an existing helper first, then ask: which key provider,
   and is there an existing KMS/envelope primitive to reuse? *This is a real blocker for `12`.*
2. **`onboardingDocStatus` / `onboardingCompletedAt`** — keep on `users`, or move to the membership?
   *Recommend: move* — the wizard gate is per-organization in the target model. But it changes the
   workspace-gate behaviour root `CLAUDE.md` §8 pins, so it is a product call.
3. **Unmappable backfill rows** — a `branchId` naming no live org unit, an `employeeId` colliding with
   `uniq_hr_employments_org_emp_num`. Fail the whole backfill, or report and continue?
   *Recommend: report and continue*, and block ticket `14` until the report is empty.
4. **Scope check:** does this program also move `firstName` / `lastName` / `phone` / `dateOfBirth` /
   `gender` to `organization_people`, or is scope strictly the employment and payroll set?
   *Recommend: strictly employment and payroll.* The PRD names those; profile is a separate decision.

## Territory

**Yours, exclusively:**

- `backend/src/db/schema/hr/**` — *except* `hiring.ts`, which S4 owns for the `vault_access_logs` work
- `backend/src/db/schema/directory/**`, `backend/src/db/schema/payroll/**`
- `backend/src/common/hr/**`
- `backend/src/modules/hr/**` — *except* `recruitment/recruitment-candidate-vault.service.ts` (S4)
- `backend/src/modules/directory/**`, `backend/src/modules/users/**`
- `backend/src/modules/payroll/**` — *except* `payout/payout-run-completion.ts` and
  `payout/locking.service.ts`, which S1 owns for the `isOrgOwner` fix
- `frontend/features/hr/**`, `frontend/features/directory/**`, `frontend/hooks/api/hr/**`,
  `frontend/hooks/api/payroll/**`, and the user/employee types

**Shared file — `backend/src/db/schema/common/auth.ts`.** You own the `users` block and its index array,
**only**. S1 owns `organizationMembers` / `userDelegations`; S3 owns `organizations`. Re-read before
editing, edit only your block, never reformat, commit it immediately.

**Not yours:** `modules/access`, `common/rbac`, `common/region`, `common/tenant`,
`frontend/lib/query-keys` (S5 is changing the key base — your hooks *use* keys, they do not edit the
factories). Report, do not edit.

## Traps in this territory

- **Find live readers with ticket 10's fallback counter, not with grep.** The counter names the ones that
  actually execute; a text search over 90 files cannot tell a live reader from a dead one, and the field
  names are not unique to `users` — `designation` and `joiningDate` also exist on `hr_employments`.
- **`pgTable(` has a capital T, and the table name usually sits on the line *after* the call.** A
  single-line pattern finds none, and a pattern that misses `pgTable(` maps nothing and reports *every*
  table unreferenced. If a scan says everything is dead, the scan is broken.
- **Emptiness is not deadness.** All 95 empty `hr_*` tables are referenced by live services.
- **`db/schema/hrms-phase1-sql-managed.ts` is a deliberate holding barrel.** knip reports all 11 of its
  files as unused *by design*, and `migration-integrity.spec.ts` asserts the arrangement. Never delete a
  schema file on a knip report — grep its **path**, not just its symbols, to find specs asserting it.
- **A JS `Date` inside a `` sql`` `` template dies at runtime.** It broke notification delivery for every
  org while cron kept returning 200.
- **Do not force types.** Raw `db.execute(sql\`…\`)` rows are `Record<string, unknown>` — convert at the
  use site. If a cast feels necessary, the projection is wrong.
- **`import type` on an injected Nest service erases the DI token** and removes no cycle.
- **Verify by running the app.** This territory is where a fully mocked green suite has been most
  misleading — boot the API and read a real employee record.
- **Ticket 12 is the money path.** Diff a real payroll run before and after; a difference is a defect,
  not a rounding note.
- **Do not shrink scope to pass a rule, and do not invent scope for a false premise.** Both have happened
  in this repo — a deletion of two user-visible options, and a filter built solely so it could be hidden.

## Definition of done for this session

- All six tickets' criteria ticked with pasted evidence, or open with a written reason.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C backend exec tsc --noEmit` clean; `pnpm -C frontend exec tsc --noEmit` clean.
- HR, directory, users and payroll suites pass; `pnpm -C backend test:e2e` for the affected controllers.
- A cold `db:migrate` from empty produces a `users` table with no employment columns (ticket 14).
- `pg_catalog` diff pasted as the evidence for the drop — not the migration runner's exit code.
- `VACUUM ANALYZE users` run after the drop, and the directory/employee-record read budgets re-measured
  as `streamline_app` with the tenant GUC.
- `pnpm exec madge --circular` still zero in both repos.
- A commit per closed ticket, pathspec-scoped.
