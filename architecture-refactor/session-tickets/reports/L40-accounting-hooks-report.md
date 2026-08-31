# L40 — Accounting Hook Authorization Report

**Status:** COMPLETE

## Hooks Gated (75 total across 14 files)

| File | Hook | Permission Key |
|---|---|---|
| `ap-payment-runs.ts` | `usePaymentRuns` | `accounting:payment-runs:read` |
| `ap-payment-runs.ts` | `usePaymentRun` | `accounting:payment-runs:read` |
| `ap-vendors.ts` | `useVendorCredits` | `accounting:vendor-credits:read` |
| `ap-vendors.ts` | `useVendorCredit` | `accounting:vendor-credits:read` |
| `ap-vendors.ts` | `useRecurringBills` | `accounting:recurring:read` |
| `ar.ts` | `useCreditNotes` | `accounting:credit-notes:read` |
| `ar.ts` | `useRecurringTemplates` | `accounting:recurring:read` |
| `ar.ts` | `useArPayments` | `accounting:receivables:read` |
| `ar-collections.ts` | `useReminderPolicies` | `accounting:reminders:read` |
| `ar-collections.ts` | `useReminderLog` | `accounting:reminders:read` |
| `ar-collections.ts` | `useCollectionsSummary` | `accounting:collections:read` |
| `assets.ts` | `useAssetCategories` | `accounting:assets:read` |
| `assets.ts` | `useAssets` | `accounting:assets:read` |
| `assets.ts` | `useAsset` | `accounting:assets:read` |
| `assets.ts` | `useDepreciationRuns` | `accounting:assets:read` |
| `banking.ts` | `useBankAccounts` | `accounting:banking:read` |
| `banking.ts` | `useBankAccount` | `accounting:banking:read` |
| `banking.ts` | `useBankTransactions` | `accounting:banking:read` |
| `banking.ts` | `useReconciliationWorkspace` | `accounting:banking:reconcile` |
| `banking.ts` | `useReconciliationRules` | `accounting:banking:reconcile` |
| `banking.ts` | `useTransfers` | `accounting:banking:read` |
| `core.ts` | `useCoaTree` | `accounting:accounts:read` |
| `core.ts` | `useCoaTemplates` | `accounting:accounts:read` |
| `core.ts` | `useSetupStatus` | `accounting:settings:read` |
| `core.ts` | `useGeneralLedger` | `accounting:general-ledger:read` |
| `core.ts` | `useGlAccounts` | `accounting:general-ledger:read` |
| `core.ts` | `usePeriods` | `accounting:periods:read` |
| `core.ts` | `usePeriodChecklist` | `accounting:periods:manage` |
| `core.ts` | `useOpeningBalance` | `accounting:accounts:read` |
| `core.ts` | `useRecurringJournals` | `accounting:recurring:read` |
| `dimensions.ts` | `useDimensions` | `accounting:dimensions:read` |
| `dimensions.ts` | `useDimensionValues` | `accounting:dimensions:read` |
| `expenses.ts` | `useTeamExpenses` | `accounting:reimbursements:read` |
| `expenses.ts` | `useReceiptInbox` | `accounting:reimbursements:read` |
| `expenses.ts` | `useReimbursementBatches` | `accounting:reimbursements:read` |
| `expenses.ts` | `useReimbursementBatch` | `accounting:reimbursements:read` |
| `expenses.ts` | `usePendingForBatch` | `accounting:reimbursements:manage` |
| `expenses.ts` | `useExpensePolicies` | `accounting:reimbursements:manage` |
| `expenses.ts` | `useFinBankAccounts` | `accounting:banking:read` |
| `fin-settings.ts` | `useAccountingSettings` | `accounting:settings:read` |
| `fin-settings.ts` | `useSetupStatus` | `accounting:settings:read` |
| `fin-settings.ts` | `useNumberSequences` | `accounting:settings:read` |
| `fin-settings.ts` | `useSystemAccounts` | `accounting:settings:manage` |
| `insights.ts` | `useAnomalies` | `accounting:reports:read` |
| `insights.ts` | `useInsightsDigest` | `accounting:reports:read` |
| `overview.ts` | `useAccountingOverview` | `accounting:read` |
| `planning.ts` | `useBudgets` | `accounting:budgets:read` |
| `planning.ts` | `useBudget` | `accounting:budgets:read` |
| `planning.ts` | `useBudgetRevisions` | `accounting:budgets:read` |
| `planning.ts` | `useBudgetVsActual` | `accounting:budgets:read` |
| `planning.ts` | `useForecast` | `accounting:forecast:read` |
| `planning.ts` | `useForecastCompare` | `accounting:forecast:read` |
| `planning.ts` | `useScenarios` | `accounting:forecast:read` |
| `reports.ts` | `useReportsCatalog` | `accounting:reports:read` |
| `reports.ts` | `useCustomerStatement` | `accounting:reports:read` |
| `reports.ts` | `useVendorStatement` | `accounting:reports:read` |
| `reports.ts` | `useSalesByCustomer` | `accounting:reports:read` |
| `reports.ts` | `useSalesByItem` | `accounting:reports:read` |
| `reports.ts` | `useExpenseByCategory` | `accounting:reports:read` |
| `reports.ts` | `useTaxSummary` | `accounting:reports:read` |
| `reports.ts` | `useProjectProfitability` | `accounting:reports:read` |
| `reports.ts` | `useDepartmentProfitability` | `accounting:reports:read` |
| `reports.ts` | `useWorkingCapital` | `accounting:reports:read` |
| `reports.ts` | `useBurnRate` | `accounting:reports:read` |
| `reports.ts` | `useCashRunway` | `accounting:reports:read` |
| `settings.ts` | `useApprovalPolicies` | `accounting:approvals:read` |
| `settings.ts` | `useApprovals` | `accounting:approvals:read` |
| `settings.ts` | `useApprovalCounts` | `accounting:approvals:read` |
| `settings.ts` | `useExchangeRates` | `accounting:settings:read` |
| `taxes.ts` | `useListTaxCodes` | `accounting:taxes:read` |
| `taxes.ts` | `useTaxDashboard` | `accounting:taxes:read` |
| `taxes.ts` | `useTaxReportOutput` | `accounting:taxes:read` |
| `taxes.ts` | `useTaxReportInput` | `accounting:taxes:read` |
| `taxes.ts` | `useTaxLiabilitySummary` | `accounting:taxes:read` |
| `taxes.ts` | `useTaxPayments` | `accounting:taxes:read` |

## Hooks Left Universal (not gated)

- `ap.ts` — only `useMutation` hooks; no `useQuery`. Not auto-firing.
- `accounting-ai.ts` — only `useMutation` hooks (`useAiJournalEntry`, `useAiQueryLedger`, `useAiCashFlowForecast`). Not auto-firing.

## Missing Catalog Keys

None. All keys verified verbatim in both `frontend/lib/rbac/permissions/accounting.ts` and `backend/src/modules/rbac/permissions/accounting.ts`. `accounting:ai:use` (mutations only, not gated here) confirmed in `frontend/lib/rbac/permissions/permission-key-extended.ts`.

## Files Split

None required; all files remain under 300 lines.

## Validation

- Jest (`--testPathPattern="accounting|finance|invoice|quote"`): 0 test files matched, `--passWithNoTests` exits 0.
- `pnpm type-check`: clean (no errors).
- `pnpm check:query-scope`: no violations.
- `pnpm check:formatters`: no violations.
- `pnpm check:dead-code`: within baseline.
