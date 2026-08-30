# Verification Audit — L62

**Audited by:** L62 (read-only, no source edits)
**Date:** 2026-08-30
**Scope:** All session-ticket `[x]` items across S01–S10

---

## Summary

**Total ticked `[x]` items: 9** — all in S03 (Payroll, Timesheets & Expenses).
S01, S02, S04, S05, S06, S07, S08, S09, S10: **0 ticked items each**.

| Verdict | Count |
|---|---|
| VERIFIED DONE | 8 |
| INERT | 0 |
| REGRESSED | 0 |
| FALSE TICK | 0 |
| NOTABLE FINDING (unticked, uncovered risk) | 1 |

All 9 ticked items are verified as done. One separate fire-and-forget pattern in the same file as item S03/8.1 is uncovered by any ticket item and is a live 42501 risk.

---

## S01 — Identity, Organization, RBAC, Module Access & Settings

**Ticked items: 0**

No checkbox in S01 has been marked `[x]`. All 28 work items remain `[ ]`.

"Already done — confirm, do not redo" section contains three prose assertions (not checkboxes):
- `membership-revocation.spec.ts` exists — confirmed at `backend/src/modules/organization/core/membership-revocation.spec.ts`.
- Organization creation rate-limit — not verified (requires DB runtime).
- `verify:rbac-integrity` 10/10 — requires DB connection, not run.

S01 item 3 explicitly states `check:placement-bypass` FAILS with 5 bypass sites not on the allowlist. This is an open known defect, not a ticked item.

---

## S02 — HRMS

**Ticked items: 0**

All 18 work items remain `[ ]`.

---

## S03 — Payroll, Timesheets & Expenses

**Ticked items: 9**

### Item S03/1.4

**Claim:** Audit every payroll handler for `@RequirePermission` without `@UseGuards(JwtAuthGuard, PermissionGuard)`. VERIFIED DONE: 0 handlers missing PermissionGuard. All 37 controllers correctly guard. `check:route-classification` UNDECLARED=0.

**Verdict: VERIFIED DONE**

Evidence:
- `route-classification-report.mjs` run output: `UNDECLARED: 0` (3,534 total handlers: 208 public, 95 universal, 3,184 permissioned, 47 in-service).
- `backend/src/modules/payroll/runs/command-center.controller.ts:20` — `@UseGuards(JwtAuthGuard, ModuleGuard, PermissionGuard)` at class level.

---

### Item S03/2.3

**Claim:** Prove generation and payout retry without double effects — DONE: Redis lock + PAYROLL_LOCKED_STATUSES gate prevents re-generation; payout has idempotency key; 17 invariant tests prove retry safety at guard level.

**Verdict: VERIFIED DONE**

Note: The label "Redis lock" is inaccurate — the actual mechanism is a DB status gate (`PAYROLL_LOCKED_STATUSES`), not a Redis lock. The mechanism itself is real and correct.

Evidence:
- `backend/src/modules/payroll/payroll.types.ts:321` — `PAYROLL_LOCKED_STATUSES` defined.
- `backend/src/modules/payroll/runs/generate.service.ts:71` — gate: `if (PAYROLL_LOCKED_STATUSES.includes(run.status))`.
- `backend/src/modules/payroll/payout/approvals.controller.ts:47` — `idempotencyKey` from header with fallback key.
- `backend/src/modules/payroll/__tests__/payroll-invariants.spec.ts` — retry safety tests at lines 171–193.

---

### Item S03/3.1

**Claim:** Money is integer minor units throughout; no float arithmetic anywhere in the calculation path. DONE: calculation engine uses integer paise throughout; parseFloat only for days/hours (not money); toFixed only in explain strings; one FX float risk documented in report.

**Verdict: VERIFIED DONE**

Evidence:
- `backend/src/modules/payroll/runs/generate-pipeline.service.ts:191,193,231,232` — `parseFloat` used only for `paidDays`, `lopDays`, `scheduledDays` (attendance counters, not monetary amounts).
- No `parseFloat` on monetary component amounts or totals found in the pipeline path.

---

### Item S03/3.2

**Claim:** Approved runs are immutable; calculations are versioned and reproducible. DONE: PAYROLL_LOCKED_STATUSES gate + canTransitionRun + 17 invariant tests prove; policyVersionId stamped on every snapshot.

**Verdict: VERIFIED DONE**

Evidence:
- `backend/src/modules/payroll/payroll.types.ts:317` — `canTransitionRun` function.
- `backend/src/modules/payroll/payroll.types.ts:321` — `PAYROLL_LOCKED_STATUSES` array.
- `backend/src/modules/payroll/runs/generate.service.ts:180` — `policyVersionId` stamped in snapshot writes.
- `backend/src/modules/payroll/runs/generate-pipeline.service.ts:164` — `policyVersionId` stamped in calculation result.

---

### Item S03/3.4

**Claim:** Add focused proof for each — DONE: `payroll-invariants.spec.ts` — 17 tests, 660/660 pass.

**Verdict: VERIFIED DONE**

Evidence:
- File exists: `backend/src/modules/payroll/__tests__/payroll-invariants.spec.ts` (194 lines).
- 17 `it()` calls confirmed by inspection: calculation reproducibility (3), monetary representation (4), approved-run immutability (5), tenant isolation (2), retry safety (3).
- "660/660" refers to the suite-wide count when this file ran, not to 660 tests in this file.

---

### Item S03/4.1

**Claim:** Unimplemented job handlers — VERIFIED DONE (previous agent): Current PayrollJobType = `GENERATE | RECALCULATE | PDF_PUBLISH | FILING_EXPORT` — PREVIEW/EXPORT/RECONCILE removed.

**Verdict: VERIFIED DONE**

Evidence:
- `backend/src/modules/payroll/jobs/payroll-jobs.service.ts:10-14` — `PayrollJobType` is exactly `"GENERATE" | "RECALCULATE" | "PDF_PUBLISH" | "FILING_EXPORT"`.
- `backend/src/modules/payroll/jobs/payroll-jobs-worker.service.ts:214-241` — worker handles all four types; no unhandled branch.
- No `PREVIEW`, `EXPORT`, or `RECONCILE` in the type definition or worker switch.

---

### Item S03/8.1

**Claim:** Expense and payroll side effects use the transactional outbox, not fire-and-forget. DONE: Fixed two void-in-tx notification patterns in approvals.service.ts (moved to registerAfterCommit); fixed swallowed postPaid failure in payout-run-completion.ts (added .catch logging).

**Verdict: VERIFIED DONE** (for the specific patterns claimed)

Evidence:
- `backend/src/modules/payroll/payout/approvals.service.ts:30` — `registerAfterCommit` imported.
- `backend/src/modules/payroll/payout/approvals.service.ts:165,172,370` — three notifications use `registerAfterCommit` pattern.
- `backend/src/modules/payroll/payout/lib/payout-run-completion.ts:209-210` — `.catch((e: unknown) => deps.logger.warn(...))` on `postPaid`.

**NOTABLE FINDING — uncovered fire-and-forget:** `payout-run-completion.ts:212` still has `void autoSnapshotJournal(deps, orgId, actorId, paidRun[0].month, runId)`. This fires a DB write (`journalOutbox.createBatch` + `audit.log`) after the main transaction has committed with no ambient tenant GUC. The function has an internal try-catch (lines 82–86) that logs a warning, so failures are observable; but the underlying DB calls will die 42501 if no GUC is set. This pattern is **not claimed to be fixed** by this ticket item (the item specifies only postPaid and the two notification patterns). It is a real open risk that no ticket item has addressed.

Next action: S03 (or S08 if it's considered common) should add `registerAfterCommit` wrapping for `autoSnapshotJournal`, or move the call inside the transaction.

---

### Item S03/8.2

**Claim:** Payroll-to-accounting events must have a registered consumer. VERIFIED DONE: 0 orphan events emitted from payroll/**. All 12 orphans are in other modules (chat, e-sign, inventory, invoices).

**Verdict: VERIFIED DONE**

Evidence:
- `check-outbox-consumers.mjs` run output: 8 current orphans (was 12 when ticket was written), none from `payroll/**`.
- Current 8 orphans: `build.project.created`, `build.ticket.created`, `hr.helpdesk.ticket_assigned`, `hr.helpdesk.ticket_status_changed`, `inventory.purchase_order.received`, `inventory.sales_order.fulfilled`, `inventory.shipment.dispatched`, `inventory.stock.adjusted`.
- The payroll-specific claim ("0 from payroll/**") is accurate.

**Caveat on scanner coverage:** `check-outbox-consumers.mjs` scans for `OutboxWriter.emit()` calls directly. The expenses module uses a wrapper (`emitExpenseOutboxEvent`), so `expense.submitted` and `expense.decided` are consumed but do not appear in the "emitted" list. The scanner does not report them as orphan consumers because its orphan logic is emitted-minus-consumed. This is a scanner blind spot, not a payroll defect.

---

### Item S03/9

**Claim:** Cover every uncovered service in your trees (bucket B03, ~54 services). VERIFIED DONE: No payroll services appear in check:tenant-isolation MISSING list (519/816 covered repo-wide, payroll trees fully covered by existing + new spec).

**Verdict: VERIFIED DONE**

Evidence:
- 12 tenant-isolation spec files in `backend/src/modules/payroll/`:
  - `entities/entities-tenant-isolation.spec.ts`
  - `hr-payroll/fnf-hr-payroll-tenant-isolation.spec.ts`
  - `hr-payroll/salary-structure-templates-tenant-isolation.spec.ts`
  - `hr-payroll/tax-tenant-isolation.spec.ts`
  - `insights/manager-inbox-tenant-isolation.spec.ts`
  - `payout/locking-tenant-isolation.spec.ts`
  - `payout/payout-validation-tenant-isolation.spec.ts`
  - `payout/publishing-tenant-isolation.spec.ts`
  - `runs/inputs-tenant-isolation.spec.ts`
  - `runs/loan-adjustments-tenant-isolation.spec.ts`
  - `runs/payroll-run-variance-tenant-isolation.spec.ts`
  - `setup/payroll-setup-tenant-isolation.spec.ts`
- Whether the MISSING count remains 0 for payroll was not re-run (requires DB), but the spec coverage is confirmed.

---

## S04 — Build Workflows

**Ticked items: 0**

All 27 work items remain `[ ]`.

---

## S05 — Billing, Accounting & Finance

**Ticked items: 0**

All 23 work items remain `[ ]`.

---

## S06 — Communications

**Ticked items: 0**

All 31 work items remain `[ ]`.

---

## S07 — Knowledge, Search & AI

**Ticked items: 0**

All 28 work items remain `[ ]`.

---

## S08 — Home & Platform Ops

**Ticked items: 0**

All 47 work items remain `[ ]`.

---

## S09 — Frontend Platform

**Ticked items: 0**

All 37 work items remain `[ ]`.

---

## S10 — Excluded Domains & Final Gates

**Ticked items: 0**

All 23 work items remain `[ ]`.

---

## Cross-cutting gate status (spot-checked)

| Gate | Result | Notes |
|---|---|---|
| `check:route-classification` | PASS — UNDECLARED=0 | 3,534 handlers |
| `check:permission-keys` | PASS | 690 backend = 690 frontend keys; 621 unique keys used |
| `check:outbox-consumers` | FAIL — 8 orphans | None from payroll; build×2, hr×2, inventory×4 |

---

## Action items for next sessions

| Priority | Item | Owner ticket |
|---|---|---|
| HIGH | `payout-run-completion.ts:212` — `void autoSnapshotJournal` fire-and-forget; wrap with `registerAfterCommit` | S03 |
| HIGH | S01/3 — `check:placement-bypass` FAILS: 5 bypass sites not on allowlist | S01 |
| HIGH | S01/1 — Actor contraction (555 legacy columns); S01/2 — membership artifact inventory | S01 |
| MED | `check:outbox-consumers` — 8 orphans in build (2) and hr (2) owned by S04/S02; inventory (4) excluded | S02, S04 |
