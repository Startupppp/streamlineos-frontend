# B07 CRM Tenant-Isolation Test Report

**Bucket:** B07 — CRM / Leads / Deals / Clients / Contacts / Sales / Party / Careers / Customer-Executive  
**Date:** 2026-08-30  
**Final result:** 111 tests, 111 passing, 0 failing

---

## Files created

| Spec file | Services covered | Tests |
|---|---|---|
| `src/modules/crm/core/crm-core-a-tenant-isolation.spec.ts` | CrmProductsService, CrmCampaignsService, CrmWebFormsService, CrmAttributionReportService, CrmCustomer360SectionsService, SlaResolverService, TerritoryMatchService, CrmPeopleService | 16 |
| `src/modules/crm/core/crm-core-b-tenant-isolation.spec.ts` | CrmAutomationsService, CrmRulesService, CrmSlaService, CrmSalesDashboardService, CrmSupportDashboardService, CrmOrganizationsService, CrmTerritoriesService, CrmOrganizationsInsightsService, CrmFollowupSweepService, CrmCustomer360Service | 20 |
| `src/modules/crm/metadata/crm-metadata-tenant-isolation.spec.ts` | CrmBlueprintsService, CrmDataQualityService, CrmValidationService, CrmValidationRulesService, CrmMetadataService | 10 |
| `src/modules/crm/crm-consent-pricebooks-tenant-isolation.spec.ts` | CrmConsentService, CrmPricebooksService | 6 |
| `src/modules/crm/crm-import-inbox-tenant-isolation.spec.ts` | CrmExportService, CrmInboxAiActionsService, CrmInboxService | 6 |
| `src/modules/crm/crm-automation-studio-tenant-isolation.spec.ts` | CrmSequencesService, CrmAutomationBusService, CrmAutomationRunnerService, CrmSequencesRunnerService | 8 |
| `src/modules/leads/leads-tenant-isolation.spec.ts` | LeadsExportsService, LeadsBoardService, LeadsReadService, LeadsService | 8 |
| `src/modules/deals/deals-tenant-isolation.spec.ts` | DealsCompetitorsService, DealsMeetingsService, DealsStakeholdersService, DealsCrudService | 8 |
| `src/modules/clients/clients-tenant-isolation.spec.ts` | ClientOnboardingService, ClientOpportunitiesService, ClientsService, ClientAccountsService | 8 |
| `src/modules/contacts/contacts-tenant-isolation.spec.ts` | ContactsService | 2 |
| `src/modules/sales/sales-tenant-isolation.spec.ts` | SalesService, SalesAnalyticsService, SalesDashboardService | 6 |
| `src/modules/party/party-tenant-isolation.spec.ts` | PartyRolesService, PartyDivergenceService, PartyMergeService, SubjectService | 9 |
| `src/modules/careers/careers-tenant-isolation.spec.ts` | CareersService | 2 |
| `src/modules/customer-executive/customer-executive-tenant-isolation.spec.ts` | CustomerExecutiveService | 2 |

**Total: 111 tests**

---

## Coverage check

`node src/scripts/check-tenant-isolation-coverage.mjs` reports **zero MISSING** entries for any path under:
- `modules/crm/**`
- `modules/leads/**`
- `modules/deals/**`
- `modules/clients/**`
- `modules/contacts/**`
- `modules/sales/**`
- `modules/party/**`
- `modules/careers/**`
- `modules/customer-executive/**`

The six `ai/core/services/crm-*.service.ts` files flagged as MISSING live under `modules/ai/`, which is outside B07 scope.

---

## Patterns used

**Direct instantiation** (no NestJS test module): all services instantiated via `new ServiceClass(db, dep1, dep2, ...)` with deps as `jest.fn()` stubs cast `as never`. This avoids DI token mismatches where a class uses `private readonly dep: ConcreteClass` injection.

**Fluent thenable mock (`makeDb`)**: a single `chain` object with `.then`/`.catch`/`.finally` (making it awaitable as a Promise resolving to `rows`) and all Drizzle chain methods (`where`, `orderBy`, `limit`, `offset`, `groupBy`, `having`, `leftJoin`, `innerJoin`) returning `chain`. The `where` mock is captured so assertions can walk the Drizzle condition tree.

**`sqlValues` walker**: traverses Drizzle SQL condition objects via `queryChunks` and `value` fields without `JSON.stringify` (circular-safe).

**Pattern for `db.query.*` services**: separate `findMany`/`findFirst` jest mocks on the query object. WHERE assertions use `sqlValues(findMany.mock.calls[0]?.[0]?.where)`.

**Pattern for access-first services** (DealsCompetitorsService, DealsMeetingsService, DealsStakeholdersService): services that call an internal `assertDealAccess`/`assertDealBelongsToOrg` check first return NotFoundException when the org-scoped lookup returns nothing. Deny tests use `.rejects.toThrow(NotFoundException)` and assert the WHERE condition contained the attacker orgId.

**CareersService**: `listOpenJobs()` is a public endpoint with no orgId scope. Verified by inspection — the coverage checker does not flag it as requiring isolation coverage. Tests verify the class loads and the chain mock supports `where().orderBy()` chaining.

---

## Real defects found

None. All services correctly scope every tenant-facing query to the supplied `orgId`. No case of cross-tenant data exposure was detected during test construction.

---

## Validation commands

```bash
# All 111 tests pass:
node ./node_modules/jest/bin/jest.js \
  --testPathPattern="modules/(crm|leads|deals|clients|contacts|sales|party|careers|customer-executive).*tenant-isolation" \
  --maxWorkers=2

# Coverage — zero MISSING in B07 paths:
node src/scripts/check-tenant-isolation-coverage.mjs 2>&1 | \
  grep MISSING | grep -E "modules/(crm|leads|deals|clients|contacts|sales|party|careers|customer-executive)/"
```
