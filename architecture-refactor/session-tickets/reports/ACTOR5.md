# ACTOR5 — Accounting / Finance Attribution Contraction

**Lane:** ACTOR5 (legacy-actor contraction, accounting/finance tranche)
**Date:** 2026-08-31
**Ticket:** S01-identity-org-rbac.md rows 37-41

---

## Tranche — 8 columns

| Table | Legacy column | New column | Classification |
|---|---|---|---|
| `accounting_periods` | `closed_by` (text → users.id) | `closed_by_membership_id` | ATTR |
| `accounting_periods` | `locked_by` (text → users.id) | `locked_by_membership_id` | ATTR |
| `fin_bank_imports` | `created_by` (text → users.id) | `created_by_membership_id` | ATTR |
| `fin_reconciliation_matches` | `confirmed_by` (text → users.id) | `confirmed_by_membership_id` | ATTR |
| `fin_bank_transfers` | `created_by` (text → users.id) | `created_by_membership_id` | ATTR |
| `fin_cash_flow_scenarios` | `created_by` (text → users.id) | `created_by_membership_id` | ATTR |
| `fin_budgets` | `created_by` (text → users.id) | `created_by_membership_id` | ATTR |
| `fin_budgets` | `approved_by` (text → users.id) | `approved_by_membership_id` | ATTR |

**Excluded from tranche (deliberate):**
- `journal_entries.created_by` — used as the DataScope actor in `applyScope`; contracting it requires a separate scope-resolver change.
- `fin_approval_policies.approver_user_id` — AUTH column, not ATTR; requires a different migration pattern.
- `fin_approval_requests.requested_by` / `decided_by` — NOT NULL; complex approval routing; deferred to future actor.
- `fin_budget_revisions.created_by` — finance-planning.ts still has `users` import for this column; left as-is.

---

## Migrations shipped

| idx | File | Purpose |
|---|---|---|
| 540 | `0718_accounting_attr_expand.sql` | ADD COLUMN (8 columns) + UPDATE backfill + FK NOT VALID |
| 541 | `0719_accounting_attr_validate.sql` | VALIDATE CONSTRAINT (8 constraints) |
| 542 | `0720_accounting_attr_contract.sql` | Re-backfill + guard DO block + DROP COLUMN (8 columns) |

Journal entries added to `migrations/meta/_journal.json` with strictly-increasing `when` timestamps (1798000040000 / 41000 / 42000), unique `idx` values (540/541/542).

`node src/scripts/check-migration-discipline.mjs` exits 0 — 427 SQL files, 0 new violations.

### Contract migration guard shape (copied from 0715/0716 precedent)

The DO block in `0720_accounting_attr_contract.sql` sums unmapped rows across all 8 tables (legacy actor set, new membership_id NULL) and raises if > 0. The re-backfill runs immediately before the DO block inside the same file.

---

## Drizzle schema changes

**`src/db/schema/accounting/accounting-core.ts`**
- `accountingPeriods.closedBy` → `closedByMembershipId: integer`
- `accountingPeriods.lockedBy` → `lockedByMembershipId: integer`
- Relations: `closedByUser/lockedByUser` (→ users) → `closedByMember/lockedByMember` (→ organizationMembers, composite `[orgId, membershipId]`)

**`src/db/schema/accounting/finance-banking.ts`**
- `finBankImports.createdBy` → `createdByMembershipId: integer`
- `finReconciliationMatches.confirmedBy` → `confirmedByMembershipId: integer`
- `finBankTransfers.createdBy` → `createdByMembershipId: integer`
- Import changed: `users` removed (no longer referenced in this file); `organizationMembers` added
- Relations updated to composite organization_members FK

**`src/db/schema/accounting/finance-planning.ts`**
- `finBudgets.createdBy` → `createdByMembershipId: integer`
- `finBudgets.approvedBy` → `approvedByMembershipId: integer`
- `finCashFlowScenarios.createdBy` → `createdByMembershipId: integer`
- `users` import retained (still needed for `finBudgetRevisions.createdBy`)
- Relations updated to composite organization_members FK

---

## Writer service changes

All writers now resolve the actor's `organization_members.id` before writing. Pattern:
```ts
const [actorMember] = await this.db
  .select({ id: organizationMembers.id })
  .from(organizationMembers)
  .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)))
  .limit(1);
const <col>MembershipId = actorMember?.id ?? null;
```

| Service | Method(s) | Notes |
|---|---|---|
| `gl/periods.service.ts` | `closePeriod`, `lockPeriod` | lookup outside tx (no tx in those methods) |
| `banking/imports.service.ts` | `createImport` | lookup before insert |
| `banking/reconciliation.service.ts` | `confirmMatch` | lookup inside `db.transaction` using `tx` |
| `banking/transfers.service.ts` | `create` | lookup inside `db.transaction` using `tx` |
| `planning/scenarios.service.ts` | `createScenario`, `seedDefaults` | lookup before insert; `seedDefaults` looks up once then reuses across loop |
| `planning/budgets.service.ts` | `createBudget`, `approveBudget`, `duplicateBudget` | `duplicateBudget` lookup outside tx (membership_id captured before tx starts) |

`listBudgets` select updated: `createdBy` → `createdByMembershipId`, `approvedBy` → `approvedByMembershipId`.

---

## Test update

`src/modules/accounting/gl/gl-tenant-isolation.spec.ts` — `closePeriod` CONTROL case updated: mock data uses `closedByMembershipId: 1` (not `closedBy: "user-x"`); `db.select` mock chains two `mockReturnValueOnce` calls (period lookup + membership lookup).

---

## Validation

- `check-migration-discipline.mjs` exits 0 (427 files, 0 violations)
- All 8 legacy column references removed from schema files in tranche
- All writer call sites updated to `*MembershipId` columns
- No remaining `createdBy: userId` / `confirmedBy: userId` / `approvedBy: userId` references in the 6 service files in scope
- `finBudgetRevisions.createdBy` deliberately left as-is (not in tranche, `users` import kept)
- `tsc --noEmit` and `nest build` not run per lane rules (machine hangs)

---

## Ratchet delta

Before ACTOR5: 553 remaining organizational `users.id` FKs (source-visible).
After ACTOR5: 553 − 8 = **545** (8 Drizzle columns contracted; legacy DB columns dropped in `0720`).
