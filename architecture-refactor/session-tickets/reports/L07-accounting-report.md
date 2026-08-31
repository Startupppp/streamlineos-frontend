# L07 Accounting Report

**Status:** COMPLETE

## Items Done

1. **Posted-journal immutability test** — `journal-immutability.spec.ts` (107 lines): DENY for POSTED, ALLOW for DRAFT/PENDING_APPROVAL, cross-tenant orgId in WHERE predicate.
2. **`finance-posting.service.ts` split** — 591 → 464 lines; extracted `FinancePostingAccountsService` (154 lines) for system-account resolution (`resolveSystemAccount`, `resolveLineAccountIds`).
3. **Orphaned outbox consumer closed** — removed `OutboxWriter.emit("accounting.period.closed")` from `periods.service.ts`; `dispatch.emit` notification still fires.
4. **Explicit projections** — `reverseJournal()` in both `finance-posting.service.ts` and `accounting-ledger.service.ts` use explicit column projection instead of broad `select()`.
5. **Guard audit** — all 14 accounting controllers verified correct: `@UseGuards(JwtAuthGuard, PermissionGuard)` or class-level `JwtAuthGuard` + per-handler `PermissionGuard`. 0 missing.
6. **Isolation coverage** — 9 previously uncovered services now covered:
   - `gl-tenant-isolation.spec.ts` (146 lines): `JournalApprovalsService`, `PeriodsService`
   - `accounting-gl-tenant-isolation.spec.ts` (119 lines): `GeneralLedgerService`, `RecurringJournalsService`
   - `accounting-core-tenant-isolation.spec.ts` (220 lines): `AccountingGstService`, `AccountingStatementsService`, `AccountingLedgerService`, `AccountingPayablesService`
   - `accounting-settings-services-tenant-isolation.spec.ts` (184 lines): `AccountingSettingsService`, `OpeningBalancesService`, `SystemAccountsService`

## Validation

- `pnpm check:route-classification`: 0 undeclared
- `pnpm check:tenant-isolation`: 0 accounting services MISSING
- `pnpm check:outbox-consumers`: `accounting.period.closed` orphan removed; remaining 3 `accounting.*` events emitted from `modules/invoices/` (outside L07 ownership)
- `pnpm typecheck`: 0 errors in accounting; pre-existing payroll errors in L01 territory
- Tests: **134/134 pass** across 16 accounting test suites

## Items Open

- Cursor pagination for `listJournal` / `listAccounts` (offset still used) — not addressed
- Remaining broad `select()` calls in `periods.service.ts`, `journal-approvals.service.ts`, `recurring-journals.service.ts`, `dimensions.service.ts`
