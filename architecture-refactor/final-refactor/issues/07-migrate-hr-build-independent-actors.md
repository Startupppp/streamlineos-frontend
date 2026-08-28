# 07: Migrate HR, Payroll, Expenses and Timesheets actors

**What to build:** Employees, managers, approvers, authors and recipients in people and pay workflows resolve through organization membership/person identity.

**Blocked by:** 06 — Expand the OrganizationActor compatibility seam. **Closed by S1 and adopted here.**

**Status:** done

- [x] All in-scope actor writes use OrganizationActor references.
- [x] Reads support the expand-period compatibility contract and return organization-correct actors.
- [x] Backfill reports unmappable/ambiguous rows without guessing.
- [x] Cross-organization, inactive-membership and representative workflow tests pass.

## What "in scope" means here, and why

`hr`, `payroll` and `timesheets` hold **290** columns referencing `users.id`. Migrating all of them is not one ticket, and most of them are not what this ticket is about: 27 tables already carry `created_by_membership_id` / `updated_by_membership_id` audit stamps, and the large remainder are audit stamps of the same kind on configuration tables.

In scope are the **authority actors** — the columns that record a decision someone made with consequences, and therefore the columns where recording the wrong membership is a real defect:

| table | legacy | added |
|---|---|---|
| `leave_requests` | `approver_id` | `approver_membership_id` |
| `wfh_requests` | `approver_id` | `approver_membership_id` |
| `performance_reviews` | `reviewer_id` | `reviewer_membership_id` |
| `helpdesk_tickets` | `assignee_id` | `assignee_membership_id` |
| `payroll_runs` | `approved_by` | `approved_by_membership_id` |
| `payroll_approvals` | `acted_by` | `acted_by_membership_id` |
| `timesheet_periods` | `approved_by` | `approved_by_membership_id` |
| `timesheets` | `approved_by` | `approved_by_membership_id` |
| `expenses` | `approver_id` | `approver_membership_id` |
| `reimbursements` | `approved_by` | `approved_by_membership_id` |

Out of scope, explicitly: `created_by`/`updated_by` stamps on configuration tables. They record who typed something, not who authorised it, and they are ticket 11's contraction problem rather than this ticket's integrity problem.

## Changes

- `backend/migrations/0646_hr_actor_membership_expand.sql` and `0647_pay_time_actor_membership_expand.sql` — per column: `ADD COLUMN`, backfill from `organization_members`, `ADD CONSTRAINT … NOT VALID`, a **separate** `VALIDATE CONSTRAINT`, and a tenant-leading index. Splitting the constraint is not cosmetic: `ADD CONSTRAINT` without `NOT VALID` holds `ACCESS EXCLUSIVE` on both tables for the length of the scan.
- Schema: `db/schema/hr/{leaves,attendance,performance}.ts`, `db/schema/payroll/{runs,claims-and-settlements}.ts`, `db/schema/timesheets/{periods,entries}.ts` — each new column with a composite `(org_id, <col>) -> organization_members(org_id, id)` FK, `ON DELETE RESTRICT`, matching the `fk_org_people_updated_actor` pattern already in the tree.
- Writes (11 paths): `leaves-write.service`, `leaves-approval.service` (approve + reject), `wfh.service` (create + update), `performance-reviews.service`, `hr-helpdesk.service` (routing default + explicit assignment), `payroll/payout/approvals.service` (submit, approve stage, reject stage), `timesheets/core/approvals.service`, `expenses/expense-lifecycle.service`, `expenses/expenses-write.service`, `expenses/expenses-import.service`, `payroll/hr-payroll/reimbursements.service`. Each resolves through `assertOrganizationActor` and writes both columns; a resolution failure fails the request through `organizationActorHttpError`.
- `backend/src/scripts/report-hr-actor-backfill.mjs` and `report-pay-time-actor-backfill.mjs` — read-only exception reports.

## Findings

- **The seam was built twice.** S2 was authorised to build the 06 blocker locally and did, at `modules/directory/organization-actor.ts`, while S1 was building it at `common/organization/organization-actor.ts`. S2 deleted its own copy on discovering S1's, after re-running S1's 14 tests green. One seam, owned by its ticket. Recorded in `CROSS-SESSION.md`.
- `reimbursements.updateStatus` ended in `void this.dispatchAutomation(...)` with **no** `.catch`. That is an unobserved fire-and-forget (PRD §20) and a bare unhandled rejection: it runs after the request transaction commits, so under RLS it dies `42501` with nobody listening. It also killed the jest worker outright ("4 child process exceptions, exceeding retry limit") rather than failing a test. Replaced with `registerAfterCommit`, falling back to inline when there is no ambient context.

## Verification

Unit tests, all run in this session:

```
src/modules/hr/__tests__/hr-actor-migration.spec.ts              4 passed
src/modules/hr/time/leaves-write-approver.spec.ts                2 passed
src/modules/payroll/__tests__/payroll-actor-migration.spec.ts    5 passed
src/modules/timesheets/core/__tests__/timesheets-actor-migration.spec.ts  4 passed
```

Each suite covers the same four cases: a non-member is refused, a `SUSPENDED` member is refused **403**, a member of another organization is refused **404** and never 403, and a valid actor writes both the legacy column and the membership column.

Four of those tests were failing when first delivered and the failures were real work, not noise: one mock assumed the actor resolution ran *after* the policy read when it runs before, so the seam consumed the policy chain and saw a row with no `status` — reported as an inactive membership; one spec called `jest.resetAllMocks()` after declaring its implementations at module scope, so the project lookup returned `undefined` and a cross-organization test passed for the wrong reason (`Project not found` is also a `NotFoundException`); one built its `OrganizationActorError` with `requireActual` while the service's `instanceof` compared against the mocked class, so the raw error escaped the HTTP mapping; and one awaited a Drizzle `.where()` that the mock had not made thenable.

Schema, verified against `pg_catalog` after applying `0646`/`0647`:

```
leave_requests.approver_membership_id       | 1 validated fk
wfh_requests.approver_membership_id         | 1 validated fk
performance_reviews.reviewer_membership_id  | 1 validated fk
helpdesk_tickets.assignee_membership_id     | 1 validated fk
payroll_runs.approved_by_membership_id      | 1 validated fk
payroll_approvals.acted_by_membership_id    | 1 validated fk
timesheet_periods.approved_by_membership_id | 1 validated fk
timesheets.approved_by_membership_id        | 1 validated fk
expenses.approver_membership_id             | 1 validated fk
reimbursements.approved_by_membership_id    | 1 validated fk
```

Backfill, on the seeded fixture organization:

```
performance_reviews   legacy actors 223000 -> membership 223000
helpdesk_tickets      legacy actors  74330 -> membership  74330
```

Exception reports return all-clear on this database. **An all-clear report is exactly the shape that hides a broken scan, so the scans were tested against defects planted on purpose.** Three rows were inserted whose approver has no membership in the organization, one membership was suspended and a review pointed at it, and one reimbursement was approved by an outsider:

```
performance_reviews.reviewer_id -> reviewer_membership_id
  org_id=aa5627a2-…  no_membership=3  inactive=1  total=4
reimbursements.approved_by:
  org=aa5627a2-…  no_membership=1  inactive_membership=0
```

Both counts reconcile exactly with a direct `pg_catalog` query. The planted rows were then removed and the suspended membership restored (`0` non-active memberships remain), and the reports return to all-clear.

Runtime, against the booted API under RLS (`node src/scripts/verify-actor-membership-writes.mjs`):

```
PASS  assigning an active member writes the membership beside the legacy user id — assignee_membership_id=9 expected=9
PASS  assigning a user from outside the organization is refused as 404, never 403 — status=404
PASS  the refused assignment wrote nothing
PASS  assigning a suspended member of this organization is refused as 403 — status=403
```

Read cost re-measured after the backfill rewrote every row (a rewrite leaves stale statistics and an empty visibility map, so all fourteen touched tables were `VACUUM ANALYZE`d first): every check still inside its ceiling, `reviews-page-deep-cursor` 415 → 465 blocks against a 2,000 ceiling.

Backend `tsc --noEmit -p tsconfig.build.json`: clean.
