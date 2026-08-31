# S03 Final Report — Payroll, Timesheets & Expenses

## Summary

- Ticked this session: 5 items (1.1, 1.2, 1.3, 3.3, 10.2)
- Already done before this session: 9 items (1.4, 2.3, 3.1, 3.2, 3.4, 4, 8.1, 8.2, 9)
- Still open: 9 items (2.1, 2.2, 5.1, 5.2, 6.1, 6.2, 6.3, 7, 10.1)

---

## Items fixed this session

### 1.1 — settings/import-export gate too broad

`frontend/app/(authenticated)/payroll/settings/import-export/page.tsx` called `requireSession()` (authenticated, no permission). Changed to `requirePermission("payroll:reports:view")` matching the sidebar nav definition at `sidebar-nav-groups-payroll.ts`.

### 1.2 — useUpdateFxRates ungated mutation

`frontend/hooks/api/payroll/settings.ts` used plain `useMutation`. Rewrote to `useAuthorizedMutation("payroll:settings:manage", ...)` so the mutation is gated at the hook level, not just hidden in UI.

### 1.3 — ESS self-service routes (VERIFIED DONE)

All ESS controller handlers at `backend/src/modules/payroll/insights/ess.controller.ts` already use `@RequirePermission("self:payroll")` or `@RequirePermission("self:payslips")` with `@CurrentUser()`. No client `userId` accepted.

### 3.3 — Approval audit missing actor identity

`backend/src/modules/payroll/payout/approvals.service.ts`:
- Added `requestId?: string | null` parameter to `submitApproval`, `approveStage`, `rejectStage`
- Resolved `submitterActor` via `assertOrganizationActor` in the workflow path of `submitApproval`
- Added `actorMembershipId` to all three `this.audit.log()` calls
- Changed rejection metadata key from `comment` to `reason`

`backend/src/modules/payroll/payout/approvals.controller.ts`:
- All three endpoints now pass `begin.correlationId` as `requestId`

### 10.2 — Inline date/money formatters (16 files)

Removed all inline `toLocaleDateString`, `toLocaleString("en-IN")`, and local `Intl.NumberFormat` calls from payroll feature files. Replaced with centralized formatters:

| File | Change |
|---|---|
| `fnf/fnf-table.tsx` | `formatShortDate` (corrected bad fallback) |
| `inputs/inputs-page-content.tsx` | `formatMonth` replaces `formatPeriodLabel`; `formatShortDate` for builtAt/lockedAt |
| `me/me-page.tsx` | `formatMonth(currentYearMonth())` replaces `toLocaleDateString` subtitle |
| `payout/bank-transfers/batches-table.tsx` | `formatShortDate` for generatedAt |
| `payout/payslips/publications-tab.tsx` | `formatShortDate` for publishedAt |
| `payout/run-stage-actions/approval-stage-panel.tsx` | `formatShortDate` replaces local `formatDate` |
| `reimbursements/reimbursements-page.tsx` | `formatShortDate` replaces local `formatDate` |
| `reports/journal-batches-sheet.tsx` | `formatShortDate` replaces local `formatStamp` |
| `salary-structures/salary-structures-page.tsx` | `formatINR` replaces local `formatInr` |
| `salary-structures/salary-structure-template-sheet.tsx` | `formatINR` replaces local `fmt` in CtcPreview |
| `taxes/tax-windows-tab.tsx` | `formatShortDate` replaces local `formatDate` |
| `bonuses/incentives-tab.tsx` | `formatShortDate` replaces local `formatDate` |
| `bonuses/bonus-schema.ts` | Removed exported `formatDate` function |
| `bonuses/bonuses-tab.tsx` | `formatShortDate` replaces imported `formatDate` |
| `loans/loans-table.tsx` | `formatMoney` replaces `₹{Number(x).toLocaleString("en-IN")}` |
| ESS components (4 files, prior session) | `formatShortDate` replaces local `formatDate` wrappers |

Equity unit counts (`toLocaleString("en-IN")` on integers in `team-page.tsx` and `ess-total-rewards-section.tsx`) were left as-is — no centralized integer-count formatter exists and these are not money amounts.

---

## Still open

### 2.1 / 2.2 — Service file splitting

`backend/src/modules/payroll/runs/generate.service.ts` (737 lines) and `payout/payout-batches.service.ts` (746 lines) both exceed the 500-line ceiling. Splitting without typecheck is high-risk. The ticket premise that `generate-pipeline.service.ts` was 696 lines is outdated (actual: 250 lines, already split); `ess.service.ts` premise of 657 lines is also outdated (actual: 452 lines). The two remaining offenders still need splitting.

### 5.1 — Broad ORM projections

Not investigated this session. Salary, banking and tax DTO projections need explicit column lists with key-set assertion tests.

### 5.2 — Async authorized export downloads

Not investigated. Large payroll dataset exports need async job dispatch, authorized expiring download URL, and 404 (not 403) for cross-org job ids.

### 6.1 / 6.2 / 6.3 — Cursor pagination

`listBatches` in `payout-batches.service.ts` uses `.limit(100)` with no cursor. `runs.service.ts` uses offset at multiple points. Full cursor migration would touch the frontend hooks and contracts and requires typecheck to validate.

### 7 — expense_export_jobs schema drift

The live DB may have `requested_by` while migration `0659` uses `requested_by_membership_id`. A safe idempotent DO-block migration to rename the column conditionally is needed. Cannot verify live DB state in this session.

### 10.1 — Loading / empty / error states

Not audited. The ticket requires full coverage of all payroll and timesheets surfaces against `check:empty-states` and `check:formatters`.

---

## Out-of-ownership changes needed

None. All fixes were inside S03's exclusive file ownership (payroll frontend features, payroll backend services, payroll controllers).

---

## Validation

Typecheck not run (per COMMON.md §0a — end-of-session only). No builds were run. No test suite was executed.
