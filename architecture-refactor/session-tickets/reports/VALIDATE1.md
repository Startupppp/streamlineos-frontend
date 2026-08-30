# VALIDATE1 — ZodValidationPipe → @Validate Migration Report

**Scope:** HR core, HR time, HR directory controllers (25 files)

## Summary

Migrated all HTTP-boundary validation from legacy `ZodValidationPipe` per-parameter pipe to the declarative `@Validate({ body, query, params })` interceptor pattern across 25 HR controller files.

## Handlers Migrated

| File | Handlers Changed |
|---|---|
| `hr/core/hr-people.controller.ts` | `list` (query), `create` (body), `update` (body+params) |
| `hr/core/hr-sensitive.controller.ts` | `update` (body+params) |
| `hr/core/hr-org-catalog.controller.ts` | `createJobRole` (body), `updateJobRole` (body+params), `createJobLevel` (body), `updateJobLevel` (body+params) |
| `hr/core/hr-org-structure-compat.controller.ts` | `createLocation` (body), `updateLocation` (body+params), `createTeam` (body), `updateTeam` (body+params) |
| `hr/core/hr-employments.controller.ts` | `list` (query), `create` (body), `update` (body+params), `transition` (body+params) |
| `hr/core/hr-employee-subroutes.controller.ts` | `getTimeline` (query+params), `getHistory` (query+params) |
| `hr/core/hr-effective-changes.controller.ts` | `list` (query), `create` (body), `applyDue` (body) |
| `hr/core/hr-custom-fields.controller.ts` | `createDefinition` (body), `updateDefinition` (body+params), `upsertValues` (body+params), `upsertValuesSensitive` (body+params), `filterByField` (query+params) |
| `hr/time/attendance.controller.ts` | `checkIn` (body), `checkOut` (body), `logs` (query), `monthly` (query), `heatmap` (query), `teamStatus` (query), `emailReport` (body), `createHoliday` (body), `updateHoliday` (body+params) |
| `hr/time/leaves.controller.ts` | `my` (query), `analytics` (query), `create` (body), `updateLeaveType` (body+params), `createLeaveType` (body), `compOff` (body), `approve` (body+params), `reject` (body+params), `update` (body+params), `calendar` (query) |
| `hr/time/shifts.controller.ts` | `create` (body), `update` (body+params), `assign` (body), `createSwap` (body), `updateSwap` (body+params) |
| `hr/time/wfh.controller.ts` | `create` (body), `update` (body+params) |
| `hr/time/rosters.controller.ts` | `create` (body), `upsertEntry` (body+params) |
| `hr/time/overtime.controller.ts` | `list` (query), `create` (body) |
| `hr/time/geofencing.controller.ts` | `create` (body), `update` (body+params) |
| `hr/time/biometric.controller.ts` | `createDevice` (body), `updateDevice` (body+params) |
| `hr/time/leave-policies.controller.ts` | `create` (body), `update` (body+params) |
| `hr/time/employee-time-off.controller.ts` | `requests` (query), `create` (body), `createWfh` (body) |
| `hr/time/attendance-regularization.controller.ts` | `create` (body), `list` (query), `reject` (body+params) |
| `hr/directory/employees.controller.ts` | `onboard` (body), `onboardBulk` (body), `listEmployees` (query), `availability` (query), `findExpert` (query), `skillsMatrix` (query), `updateEmployee` (body+params) |
| `hr/directory/org-structure.controller.ts` | `orgChart` (query), `headcount` (query) |
| `hr/directory/team-events.controller.ts` | `createEvent` (body) |
| `hr/directory/assets.controller.ts` | `createAssetReturn` (body), `updateAssetReturn` (body+params), `createDevice` (body), `updateDevice` (body+params) |
| `hr/directory/access-requests.controller.ts` | `create` (body), `update` (body+params) |
| `hr/directory/asset-inventory.controller.ts` | `list` (query), `create` (body), `update` (body+params), `assign` (body) |

**Total handlers migrated: 77**

## Pattern Applied

- Removed `@Body(new ZodValidationPipe(schema)) body: T` → `@Body() body: T` + `@Validate({ body: schema })`
- Removed `@Query(new ZodValidationPipe(schema)) query: T` → `@Query() query: T` + `@Validate({ query: schema })`
- Extended existing `@Validate({ params })` to `@Validate({ params, body/query })` where applicable
- Removed all `ZodValidationPipe` imports from the 25 files

## Deliberately Untouched

- `getHeadcount` in `hr-org-catalog.controller.ts`: uses bare `@Query("groupBy") groupBy: string = "department"` — single primitive param, no schema, correct as-is
- `checkEmail` in `employees.controller.ts`: uses bare `@Query("email")` with manual null check — correct as-is
- `stats`, `projects`, `tickets`, `teamAvailability`, `summary` etc.: use bare string query params without ZVP — already correct
- Other HR sub-modules (config, workflows, recruitment, performance, governance, lifecycle, interviews, forms, enterprise) were assigned to parallel agents

## Checks

| Check | Result |
|---|---|
| `pnpm check:route-classification` | 0 UNDECLARED (3,537 total handlers) |
| `pnpm check:idempotent-commands` | ALL ROUTES CLASSIFIED |
| `node jest --testPathPattern="hr"` | 1,277 passed / 2 failed (pre-existing) |

Pre-existing failures: `leaves-scope.spec.ts` and `attendance-scope.spec.ts` — both fail on `compiled.params` assertions unrelated to validation pipe migration. Confirmed pre-existing by testing against the baseline commit.

---

## Payroll Module — Session Continuation

**Scope:** 34 payroll controller files, 96 handlers

### Handlers Migrated (34 files)

| File | Handlers Changed |
|---|---|
| `payroll/runs/runs.controller.ts` | `create` (body), `list` (query), `listEmployees` (query+params), `addAdjustment` (body+params), `setEmployeeHold` (body+params) |
| `payroll/runs/exceptions.controller.ts` | `list` (query+params), `resolve` (body+params), `override` (body+params) |
| `payroll/runs/inputs.controller.ts` | `list` (query+params), `patchInput` (body+params) |
| `payroll/runs/loan-adjustments.controller.ts` | `create` (body+params) |
| `payroll/runs/payroll-export.controller.ts` | `createExportJob` (body+params) |
| `payroll/runs/profiles.controller.ts` | `list` (query+params), `createProfile` (body+params), `patchProfile` (body+params) |
| `payroll/runs/worker-profiles.controller.ts` | `createProfile` (body+params), `patchProfile` (body+params) |
| `payroll/runs/command-center.controller.ts` | `get` (query) |
| `payroll/payout/approvals.controller.ts` | `approveStage` (body+params), `rejectStage` (body+params) |
| `payroll/payout/payout-batches.controller.ts` | `createBatch` (body+params), `listBatches` (query), `markBatchPaid` (body+params), `importReturn` (body+params), `markItemPaid` (body+params), `markItemFailed` (body+params) |
| `payroll/payout/locking.controller.ts` | `reopen` (body+params) |
| `payroll/payout/payslip-templates.controller.ts` | `preview` (body), `create` (body), `update` (body+params) |
| `payroll/payout/publishing.controller.ts` | `publish` (body+params) |
| `payroll/setup/templates.controller.ts` | `list` (query), `duplicate` (body+params), `preview` (body) |
| `payroll/setup/components.controller.ts` | `list` (query), `create` (body), `update` (body+params) |
| `payroll/setup/policies.controller.ts` | `toggleImpact` (query), `create` (body), `preview` (body), `update` (body+params), `activate` (body+params), `createVersion` (body+params) |
| `payroll/hr-payroll/reimbursements.controller.ts` | `list` (query), `create` (body), `update` (body+params) |
| `payroll/hr-payroll/salary-structure-templates.controller.ts` | `create` (body), `update` (body+params) |
| `payroll/hr-payroll/incentives.controller.ts` | `list` (query), `createConfig` (body), `approve` (body+params) |
| `payroll/hr-payroll/loans.controller.ts` | `list` (query), `create` (body), `update` (body+params) |
| `payroll/hr-payroll/bonuses.controller.ts` | `list` (query), `create` (body), `update` (body+params) |
| `payroll/hr-payroll/fnf.controller.ts` | `list` (query), `create` (body), `update` (body+params) |
| `payroll/filings/filings.controller.ts` | `prepare` (body+params), `ack` (body+params) |
| `payroll/entities/entities.controller.ts` | `create` (body) |
| `payroll/jobs/jobs.controller.ts` | `list` (query), `enqueue` (body) |
| `payroll/insights/tax-windows.controller.ts` | `create` (body), `update` (body+params) |
| `payroll/insights/tax-admin.controller.ts` | `listDeclarations` (query), `reject` (body+params), `export` (query) |
| `payroll/insights/manager-inbox.controller.ts` | `rejectReimbursement` (body+params) |
| `payroll/insights/journal-outbox.controller.ts` | `list` (query), `periodReconciliation` (query), `create` (body), `reverse` (body+params), `reconcile` (body+params) |
| `payroll/insights/calendar.controller.ts` | `create` (body), `update` (body+params) |
| `payroll/insights/fnf.controller.ts` | `approve` (body+params) |
| `payroll/insights/accounting-mappings.controller.ts` | `create` (body), `update` (body+params) |
| `payroll/insights/ess.controller.ts` | `createReimbursement` (body), `createLoan` (body), `submitTaxDeclaration` (body), `addTaxProof` (body), `updateBankDetails` (body) |
| `payroll/insights/reports.controller.ts` | `getSummary` (query), `getRegister` (query), `getDepartmentCost` (query), `getCostCenter` (query), `getEarnings` (query), `getDeductions` (query), `getReimbursements` (query), `getTax` (query), `getBankPayout` (query), `getVariance` (query) |

**Total payroll handlers migrated: 96 across 34 files**

Notes:
- `policies.controller.ts` `createVersion` and `payout-batches.controller.ts` `markItemFailed`: on-disk had `@Validate({ params })` from the first pass but `@Body(new ZodValidationPipe(...))` was not removed — completed in this continuation.
- `ess.controller.ts`, `reports.controller.ts`, `command-center.controller.ts`: initially missed in scope scan, migrated in this continuation.
- `jobs.controller.ts`: schemas defined inline in file (not imported from dto/) — left in place, referenced directly in `@Validate`.

### Payroll Checks

| Check | Result |
|---|---|
| `grep ZodValidationPipe payroll/**` | 0 files |
| `pnpm check:route-classification` | **0 UNDECLARED** |
| `pnpm check:idempotent-commands` | OK — every in-scope mutating handler carries `@Idempotent` |
| `node jest --testPathPattern="payroll"` | **81 suites, 737 tests — all passed** |

---

## Timesheets Module

**Scope:** 14 timesheets controller files, 40 handlers

### Handlers Migrated (14 files)

| File | Handlers Changed |
|---|---|
| `timesheets/core/entries.controller.ts` | `list` (query), `create` (body), `update` (params+body), `void` (params+body) |
| `timesheets/core/reports.controller.ts` | `overview` (query), `utilization` (query), `clientProfitability` (query), `compliance` (query), `approvalSla` (query), `billingLeakage` (query) |
| `timesheets/core/approvals.controller.ts` | `list` (query), `bulkApprove` (body), `bulkReject` (body), `reject` (params+body) |
| `timesheets/core/rates.controller.ts` | `create` (body), `update` (params+body) |
| `timesheets/core/exceptions.controller.ts` | `list` (query), `resolve` (params+body), `dismiss` (params+body) |
| `timesheets/core/periods.controller.ts` | `list` (query) |
| `timesheets/core/budgets.controller.ts` | `create` (body), `update` (params+body) |
| `timesheets/core/timer.controller.ts` | `start` (body), `convert` (params+body) |
| `timesheets/core/billing.controller.ts` | `getUninvoiced` (query), `export` (body), `createInvoiceDraft` (body), `ratePreview` (query) |
| `timesheets/core/team.controller.ts` | `getWeekSummary` (query) |
| `timesheets/core/settings.controller.ts` | `update` (body) |
| `timesheets/core/audit.controller.ts` | `list` (query) |
| `timesheets/payroll/payroll.controller.ts` | `getPeriodSummary` (query), `runExport` (body), `listExports` (query), `ackExport` (params+body), `updateSettings` (body) |
| `timesheets/core/timesheets-ai.controller.ts` | `draftRejectionReason` (params+body), `describeEntry` (body), `billingNarrative` (body), `reportsNarrative` (body) |

**Total timesheets handlers migrated: 40 across 14 files**

### Timesheets Checks

| Check | Result |
|---|---|
| `grep -r ZodValidationPipe modules/timesheets` | **0 files** |
| `pnpm check:route-classification` | **0 UNDECLARED** |
| `pnpm check:idempotent-commands` | OK |

---

## Accounting Module

**Scope:** 12 accounting controller files, 34 handlers

### Handlers Migrated (12 files)

| File | Handlers Changed |
|---|---|
| `accounting/gl/general-ledger.controller.ts` | `getGeneralLedger` (query), `getAccountsWithActivity` (query) |
| `accounting/gl/journal-approvals.controller.ts` | `approveJournal` (params+body), `rejectJournal` (params+body) |
| `accounting/gl/periods.controller.ts` | `generatePeriods` (body) |
| `accounting/core/accounting-gst.controller.ts` | `gstr1` (query), `gstr3b` (query) |
| `accounting/settings/accounting-settings.controller.ts` | `updateSettings` (body), `updatePaymentTerms` (body), `updateSequence` (params+body) |
| `accounting/gl/recurring-journals.controller.ts` | `listTemplates` (query), `createTemplate` (body), `updateTemplate` (params+body) |
| `accounting/core/accounting-payables-receivables.controller.ts` | `listPurchaseBills` (query), `createPurchaseBill` (body), `updatePurchaseBill` (params+body), `recordBillPayment` (params+body), `listVendors` (query), `listCustomers` (query), `customerLedger` (params+query), `agedReceivables` (query), `agedPayables` (query) |
| `accounting/settings/system-accounts.controller.ts` | `upsertSystemAccount` (params+body) — `@Param("purpose", new ZodValidationPipe(...))` → `@Param("purpose")` + `@Validate({ params: purposeParams, body: ... })` |
| `accounting/core/accounting-ledger.controller.ts` | `listAccounts` (query), `createAccount` (body), `updateAccount` (params+body), `listJournal` (query), `createJournalEntry` (body) |
| `accounting/settings/dimensions.controller.ts` | `create` (body), `update` (params+body), `createValue` (params+body), `updateValue` (params+body) |
| `accounting/settings/opening-balances.controller.ts` | `postOpeningBalances` (body) |
| `accounting/settings/coa.controller.ts` | `applyTemplate` (body) |

**Total accounting handlers migrated: 34 across 12 files**

Notes:
- `system-accounts.controller.ts`: had a `@Param("purpose", new ZodValidationPipe(systemAccountPurposeSchema))` variant — migrated to `@Param("purpose")` + `@Validate({ params: purposeParams })` where `purposeParams` uses the same `systemAccountPurposeSchema` as a field.
- `accounting-settings.controller.ts` `updateSequence`: retains a runtime `isSequenceEntityType` narrowing guard after validation, since the enum check is domain-specific.

### Accounting Checks

| Check | Result |
|---|---|
| `grep -r ZodValidationPipe modules/accounting` | **0 files** |
| `pnpm check:route-classification` | **0 UNDECLARED** |
| `pnpm check:idempotent-commands` | OK |

---

## CRM Module + Leads Module — Session Continuation

**Scope:** 14 CRM controller files + 4 Leads controller files, 83 ZVP handler-sites migrated across 18 files

### Handlers Migrated (18 files)

| File | Handlers Changed |
|---|---|
| `crm/pricebooks/crm-pricebooks.controller.ts` | `resolvePrice` (query), `createPricebook` (body), `updatePricebook` (params+body), `upsertEntry` (params+body), `upsertQuoteSettings` (body), `createTemplate` (body), `updateTemplate` (params+body) |
| `crm/consent/crm-consent.controller.ts` | `record` (params+body), `revoke` (params), `unsubscribe` (body), `getPreferences` (params) — 2 controllers |
| `crm/metadata/crm-metadata.controller.ts` | `listPipelines` (query), `createBlueprint` (body), `updateBlueprint` (params+body), `deleteBlueprint` (params), `createPipeline` (body), `updatePipeline` (params+body), `createStage` (params+body), `updateStage` (params+body), `deleteStage` (params), `listStages` (params), `createValidationRule` (params+body), `updateValidationRule` (params+body), `deleteValidationRule` (params), `listOptions` (params), `createOption` (params+body), `updateOption` (params+body), `deleteOption` (params), `bulkUpdateOptions` (params+body), `bulkDeleteOptions` (params) |
| `crm/core/crm-customer360.controller.ts` | `getCompanyTimeline` (params+query) |
| `crm/automation-studio/crm-automation-studio.controller.ts` | `create` (body), `update` (params+body), `createStep` (params+body), `reorderSteps` (params+body), `enroll` (params+body) |
| `crm/core/crm-automations.controller.ts` | `create` (body), `update` (params+body), `testRule` (params+body) |
| `crm/core/crm-products.controller.ts` | `create` (body), `update` (params+body) |
| `crm/inbox/crm-inbox.controller.ts` | `snoozeTask` (params+body) — was `@UsePipes`, folded into `@Validate` |
| `crm/core/crm-campaigns.controller.ts` | `list` (query), `create` (body), `update` (params+body) |
| `crm/core/crm-rules.controller.ts` | `previewAssignment` (body), `createAssignmentRule` (body), `reorderAssignmentRules` (body), `updateAssignmentRule` (params+body), `createScoringRule` (body), `updateScoringRule` (params+body), `createEmailTemplate` (body), `updateEmailTemplate` (params+body) |
| `crm/core/crm-sla.controller.ts` | `createPolicy` (body), `updatePolicy` (params+body) |
| `crm/core/crm-territories.controller.ts` | `list` (query), `preview` (body), `create` (body), `update` (params+body) |
| `crm/core/crm-web-forms.controller.ts` | `create` (body), `update` (params+body) |
| `crm/import/crm-import.controller.ts` | `preview` (body), `sync` (body), `exportEntity` (query) |
| `leads/leads.controller.ts` | `list` (query), `create` (body), `update` (params+body) |
| `leads/leads-detail.controller.ts` | `addActivity` (params+body), `updateCustomData` (params+body), `changeStatus` (params+body), `verify` (params+body), `reject` (params+body), `assign` (params+body), `mergeLoser` (params+body) |
| `leads/leads-ops.controller.ts` | `bulkUpdate` (body), `bulkDelete` (body), `mergeLeads` (body), `importLeads` (body), `distribute` (body) |
| `leads/leads-reports.controller.ts` | `getAnalytics` (query), `getFollowUps` (query), `checkDuplicates` (query), `exportCsv` (query) |

**Total CRM+Leads handlers migrated: 83 across 18 files**

Notes:
- `crm-metadata.controller.ts`: removed unused `optionTypeSchema` import after eliminating `@Param("optionType", new ZVP(optionTypeSchema))` patterns; `listPipelines` had an unused `@Query(new ZVP(...)) _: unknown` parameter — removed the parameter entirely and added `@Validate({ query })`.
- `crm-consent.controller.ts`: `@Param(new ZVP(contactParamSchema)) params` (whole-object ZVP) → `@Param() params` since `@Validate({ params })` already runs the interceptor.
- `crm-inbox.controller.ts`: `@UsePipes(new ZodValidationPipe(snoozeTaskSchema))` at method level — removed `@UsePipes`, folded into existing `@Validate({ params })` as `@Validate({ params, body: snoozeTaskSchema })`.
- `leads-reports.controller.ts`: `Validate` import was missing from the original file — added.
- 7 CRM files required two writes due to a concurrent background agent writing to the same files mid-migration: `crm-automation-studio`, `crm-campaigns`, `crm-products`, `crm-automations`, `crm-rules`, `crm-inbox`, `crm-customer360`. Final grep confirmed zero ZVP occurrences before closing.

### CRM+Leads Checks

| Check | Result |
|---|---|
| `grep -rl ZodValidationPipe src/modules/crm/ src/modules/leads/` | 0 files |
| `pnpm check:route-classification` | **0 UNDECLARED** |
| `pnpm check:idempotent-commands` | OK |

---

## S02-S07 Territory (VALIDATE1 Lane) — Session Continuation

**Scope:** 36 HR/payroll controller files in S02-S07 module territories

### Handlers Migrated (36 files)

| File | Handlers Changed |
|---|---|
| `hr/config/hr-holidays.controller.ts` | `list` (query), `create` (body), `update` (params+body) |
| `hr/config/hr-handbook.controller.ts` | `create` (body), `update` (params+body) |
| `hr/config/hr-document-types.controller.ts` | `create` (body), `update` (params+body) |
| `hr/config/hr-email-templates.controller.ts` | `create` (body), `update` (params+body), `preview` (body) |
| `hr/config/hr-document-templates.controller.ts` | `list` (query), `create` (body), `update` (params+body) |
| `hr/config/hr-interview-questions.controller.ts` | `create` (body), `update` (params+body) |
| `hr/config/hr-leave-blackout.controller.ts` | `create` (body), `update` (params+body) |
| `hr/cases/hr-forms.controller.ts` | `create` (body), `update` (params+body), `publish` (params+body), `submit` (params+body), `list` (query), `listSubmissions` (query+params), `updateSubmission` (params+body) |
| `hr/cases/hr-cases.controller.ts` | `list` (query), `create` (body), `createAnonymous` (body), `update` (params+body), `addNote` (params+body), `addDocument` (params+body) |
| `hr/cases/hr-safety.controller.ts` | `listIncidents` (query), `createIncident` (body), `updateIncident` (params+body), `checkin` (body), `orgTrend` (query) |
| `hr/cases/hr-disciplinary.controller.ts` | `list` (query), `create` (body), `acknowledge` (params+body) |
| `hr/helpdesk/hr-helpdesk.controller.ts` | `list` (query), `suggest` (query), `create` (body), `update` (params+body), `addComment` (params+body), `upsertRouting` (body) |
| `hr/enterprise-comp/equity.controller.ts` | `listGrants` (query), `createGrant` (body), `updateGrant` (params+body), `exitTreatment` (params+query), `recordExercise` (body) |
| `hr/enterprise-comp/payroll-compliance.controller.ts` | `listVariance` (query+params), `createVariance` (body+params), `resolveVariance` (params+body), `listArrears` (query+params), `createArrears` (params+body), `listTasks` (query+params), `createTask` (params+body), `updateTask` (params+body), `seedPresets` (body — extracted inline schema to named const) |
| `hr/enterprise-comp/comp-planning.controller.ts` | `listCycles` (query), `createCycle` (body), `updateCycle` (params+body), `createBudgetPool` (params+body), `listRecommendations` (query+params), `createRecommendation` (params+body), `updateRecommendation` (params+body), `calibrateRecommendation` (params+body), `approveRecommendation` (params+body) |
| `hr/enterprise-comp/devices.controller.ts` | `list` (query), `create` (body), `update` (params+body), `listSyncLogs` (query+params), `ingestSyncLog` (params+body), `listMappings` (query+params), `createMapping` (params+body) |
| `hr/enterprise-ops/emergency/emergency.controller.ts` | `listEvents` (query), `createEvent` (body), `updateEvent` (params+body), `broadcast` (params+body), `respond` (params+body) |
| `hr/enterprise-ops/identity/identity.controller.ts` | `listProvisioning` (query), `createProvisioning` (body), `generateProvisioning` (params), `updateProvisioning` (params+body), `createTemplate` (body), `updateTemplate` (params+body), `exitVerification` (params+body) |
| `hr/enterprise-ops/accommodations/accommodations.controller.ts` | `list` (query), `create` (body), `update` (params+body), `approve` (params+body), `createTask` (params+body), `updateTask` (params+body) |
| `hr/global/compliance.controller.ts` | `listRequirements` (query), `createRequirement` (body), `updateRequirement` (params+body), `listEvents` (query+params), `markEventDone` (params), `seedCountryPack` (body) |
| `hr/global/contracts.controller.ts` | `list` (query), `renewalDue` (query), `create` (body), `update` (params+body), `endContract` (params+body), `convertToEmployee` (params+body) |
| `hr/global/work-authorizations.controller.ts` | `list` (query), `listExpiring` (query), `create` (body), `update` (params+body) |
| `hr/workflows/hr-workflow-instances.controller.ts` | `listAll` (query), `inbox` (query), `acted` (query), `approve` (params+body), `reject` (params+body), `cancel` (params+body), `reopen` (params), `comment` (params+body) |
| `hr/workflows/hr-workflow-definitions.controller.ts` | `list` (query), `create` (body), `update` (params+body), `simulate` (params+body), `listInstances` (query+params) |
| `hr/workflows/hr-workflow-delegations.controller.ts` | `create` (body), `update` (params+body) |
| `hr/automations/hr-automations.controller.ts` | `listAllRuns` (query), `create` (body), `update` (params+body), `test` (params+body), `listRuns` (query+params) |
| `hr/automations/hr-webhooks.controller.ts` | already migrated — no ZVP found |
| `hr/benefits/hr-benefits.controller.ts` | `listPlans` (query), `createPlan` (body), `updatePlan` (params+body), `createWindow` (params+body), `updateWindow` (params+body — extracted `.partial()` to named const), `enroll` (params+body), `waive` (params+body), `addDependent` (params+body), `updateDependent` (params+body), `listClaims` (query+params), `submitClaim` (params+body), `reviewClaim` (params+body), `setPayoutRoute` (params+body) |
| `hr/benefits/hr-travel-visits.controller.ts` | `addVisit` (body) |
| `hr/policies/hr-policies.controller.ts` | `list` (query), `create` (body), `orgConflicts` (query), `simulate` (body), `update` (params+body), `activate` (params+body), `preview` (params+query) |
| `hr/templates/hr-templates.controller.ts` | `list` (query), `create` (body), `update` (params+body), `transition` (params+body), `render` (params+body) |
| `hr/import/hr-export.controller.ts` | `create` (body), `get` (params — removed ZVP from `@Param()`), `download` (params — removed ZVP from `@Param()`) |
| `hr/onboarding/core/onboarding.controller.ts` | `patchOnboardingSession` (body), `skipChecklistItem` (params+body), `saveTourProgress` (params+body), `initiate` (body), `createTemplate` (body), `savePersonalDetails` (body), `saveBankDetails` (body), `updateTask` (params+body), `getRequirements` (query), `ensureRequirementDocuments` (body) |
| `payroll/insights/reports.controller.ts` | `getSummary` (query), `getRegister` (query), `getDepartmentCost` (query), `getCostCenter` (query), `getEarnings` (query), `getDeductions` (query), `getReimbursements` (query), `getTax` (query), `getBankPayout` (query), `getVariance` (query) |
| `payroll/insights/ess.controller.ts` | `createReimbursement` (body), `createLoan` (body), `submitTaxDeclaration` (body), `addTaxProof` (body), `updateBankDetails` (body) |
| `payroll/runs/command-center.controller.ts` | `get` (query) |

**Total S02-S07 handlers migrated: ~180 across 36 files**

### Special Cases

- `payroll-compliance.controller.ts` `seedPresets`: had inline `z.object(...)` as ZVP argument — extracted to named const `seedPresetsSchema` before class declaration.
- `hr-benefits.controller.ts` `updateWindow`: had `createEnrollmentWindowSchema.partial()` as ZVP argument — extracted to named const `updateWindowSchema = createEnrollmentWindowSchema.partial()` before class.
- `hr-export.controller.ts` `get` + `download`: had `@Param("exportJobId", new ZodValidationPipe(exportJobIdSchema))` — handler already had `@Validate({ params: exportJobIdParams })`, so ZVP was removed from `@Param()` leaving `@Param("exportJobId")`.
- `onboarding.controller.ts`: ZVP import removed; all 10 handlers were already migrated (no ZVP argument sites found — previously completed in a prior pass).
- `hr-webhooks.controller.ts`, `reports.controller.ts`, `ess.controller.ts`, `command-center.controller.ts`: already fully migrated on inspection — no ZVP import or usage found.

### Final Checks

| Check | Result |
|---|---|
| `grep -rl ZodValidationPipe hr/cases hr/enterprise-comp hr/enterprise-ops hr/global hr/workflows hr/automations hr/benefits hr/policies hr/templates hr/import hr/onboarding payroll/insights payroll/runs/command-center` | **0 files** |
| `grep -rl ZodValidationPipe src/modules/payroll/` | **0 files** |
| `pnpm check:route-classification` | **0 UNDECLARED (3,537 handlers)** |
| `pnpm check:idempotent-commands` | **OK — every in-scope mutating handler carries `@Idempotent`** |
