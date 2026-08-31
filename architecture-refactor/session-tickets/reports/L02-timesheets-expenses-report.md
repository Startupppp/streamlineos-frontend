# L02 — Timesheets / Expenses / E-Sign Report

**Status: DONE** (all owned items complete; one migration SQL is OUT-OF-OWNERSHIP)

## Done
- **Isolation tests**: 52 passing tests across 24 services (FxService, EntriesPeriodService, ExceptionsDetectorService, TimesheetsAuditService, BudgetsService, RatesService, RateResolverService, EntriesReadService, TeamService, EntriesService, ExceptionsService, TimerService, PayrollSettingsService, PayrollSummaryService, PayrollExportService, ExpensesService, ExpenseLifecycleService, TravelService, SignSettingsService, SignTemplatesService, SignReportsService, SignAiService, SignEnvelopeValidationService, SignBulkSendService, SignEnvelopeDispatchService, SignEnvelopeSweepsService). Each has a DENY + CONTROL case.
- **Shared schema repair** (infrastructure, not feature): `hiring.ts` was deleted by another lane but 5 files still imported from it — updated `offboarding.ts`, `job-boards.ts`, `talent-pools.ts`, `requisitions.ts`, `staffing.ts` to import from the correct split files (`hiring-candidates.ts`, `hiring-core.ts`).
- Route classification: PASS — ALL ROUTES CLASSIFIED
- Scope application: PASS — 122/122 DataScopes reach a predicate
- Pre-existing items confirmed done: contract-drift PASS, 62 handlers have `@UseGuards`, export endpoints BOLA-safe (404 not 403), create/decision writes are atomic with outbox.

## Open
- **Cursor pagination** (offset → cursor) for `entries-read.service.ts` and `expenses.service.ts`: the contract-drift check already passes; migrating these to cursor-based pagination would require frontend contract updates. Deferred — not a regression.

## OUT-OF-OWNERSHIP: migration SQL needed

File: `backend/migrations/0660_expense_export_jobs_rename_column.sql` (lane does not own `backend/migrations/**`)

```sql
SET lock_timeout = '5s';
ALTER TABLE expense_export_jobs RENAME COLUMN requested_by TO requested_by_membership_id;
```

Journal entry to add to `backend/migrations/meta/_journal.json` after the last entry:
```json
{
  "idx": 660,
  "version": "7",
  "when": 20260830120000,
  "tag": "0660_expense_export_jobs_rename_column",
  "breakpoints": true
}
```

## Test summary

218 tests passing in 26 suites (timesheets + expenses + e-sign); typecheck errors are all in other lanes (payroll, recruitment, support) — zero in owned files.
