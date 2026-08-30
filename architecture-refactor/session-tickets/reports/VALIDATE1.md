# VALIDATE1 — ZodValidationPipe → @Validate Migration Report

## Scope

Lane VALIDATE1 covered 16 HR controller files that were not assigned to any of the 9 parallel background agents.

## Handlers migrated

| File | Handlers migrated |
|---|---|
| `hr/time/work-logs.controller.ts` | 4 (list, create, updateStatus, exportCsv) |
| `hr/time/employee-attendance.controller.ts` | 7 (checkIn, checkOut, logs, history, monthly, heatmap, createRegularization) |
| `hr/time/attendance-summary.controller.ts` | 1 (getSummary) |
| `hr/automations/hr-webhooks.controller.ts` | 3 (create, update, listDeliveries) |
| `hr/recruitment/recruitment-talent-pools.controller.ts` | 4 (create, update, listMembers, addMember) |
| `hr/recruitment/recruitment-pipeline.controller.ts` | 1 (diversityReport) |
| `hr/recruitment/recruitment-offers-list.controller.ts` | 1 (listAll) |
| `hr/lifecycle/alumni.controller.ts` | 2 (list, create) |
| `hr/lifecycle/hr-analytics.controller.ts` | 1 (attendance) |
| `hr/interviews/hr-recruitment-reports.controller.ts` | 2 (generateReport, createScheduled) |
| `hr/enterprise-comp/workforce-costing.controller.ts` | 2 (byDepartment, forecasted) |
| `hr/enterprise-ops/simulator/simulator.controller.ts` | 6 (simulatePolicy, simulateLeaveBalance, simulateApprovalRouting, simulatePayrollImpact, compare, listHistory) |
| `hr/enterprise-ops/event-stream/event-stream.controller.ts` | 2 (listEvents, export) |
| `hr/forms/hr-forms-public.controller.ts` | 1 (submitPublicForm — body added to existing @Validate) |
| `hr/hub/hr-hub.controller.ts` | 1 (getSnapshot) |
| `hr/settings-hub/hr-settings-hub.controller.ts` | 2 (getEffectiveRules, getVersions) |

**Total: 40 handlers across 16 files.**

## Migration pattern applied

Every handler that used `@Body(new ZodValidationPipe(schema))` or `@Query(new ZodValidationPipe(schema))`:
1. Got `@Validate({ body/query: schema })` added at the handler level.
2. The pipe argument was removed, leaving bare `@Body()` / `@Query()`.
3. The `ZodValidationPipe` import was removed from the file.
4. Where a handler already had `@Validate({ params: … })`, the body/query schema was merged into the same decorator object.

Special case — `workforce-costing.controller.ts` `forecasted` handler used a fully anonymous inline schema. The schema was named `forecastedCostQuerySchema` and declared alongside `costByDeptSchema` at the top of the file.

No `@Idempotent` decorators were added.

## Inventory controllers (second pass — 34 files, 121 handlers)

All 34 inventory controllers were fully migrated. `ZodValidationPipe` import count in `src/modules/inventory/**/*.controller.ts` went from 28 to 0.

| File group | Files | Handlers |
|---|---|---|
| Products | inv-products | 10 |
| Warehouses | inv-warehouses | 6 |
| Purchase orders + GRN | inv-purchase-orders, grn | 6 |
| Vendors | inv-vendors | 3 |
| Stock + transfers + adjustments | inv-stock, inv-stock-transfers, inv-stock-adjustments | 12 |
| Sales orders | inv-sales-orders | 8 |
| Shipments + packages + carriers + loads | 4 files | 13 |
| Channels + TPL | channels, tpl | 6 |
| Replenishment + forecasting | inv-replenishment, inv-forecasting | 6 |
| Returns | customer-returns, vendor-returns | 6 |
| Quality (inspections + recalls + holds) | 3 files | 9 |
| Counts (audits + cycles) | inv-physical-audits, inv-cycle-counts | 6 |
| Import/export | import, export | 5 |
| Traceability | inv-traceability | 5 |
| Valuation | inv-valuation | 2 |
| Reports | inv-reports | 6 |
| AI + AI-explain | inv-ai, inv-ai-explain | 6 |
| Settings + barcode + webhooks | 3 files | 6 |

**Inventory subtotal: 121 handlers across 34 files.**

Special case — `inv-ai-explain.controller.ts` had two handlers using manual `.safeParse()` with inline schemas (`reorderProposalBodySchema`, `confirmProposalBodySchema`). Both were converted to `@Validate({ body: … })` + `@Body()`, eliminating the manual parse guards.

**Grand total this lane: 161 handlers across 50 files.**

## Verification

- `pnpm check:route-classification` → **0 UNDECLARED** (3,518 total handlers: 202 public, 3,175 permissioned, 94 universal, 47 in-service)
- `pnpm check:idempotent-commands` → **OK** (3 skips are pre-existing bespoke-mechanism exemptions)
- Tests: not run per lane instructions.
- Lint: not run per lane instructions.
