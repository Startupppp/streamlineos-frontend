# Offset Pagination Sunset Plan

> Produced 2026-09-01. Covers PRD §3 item: "Remove or sunset offset compatibility endpoints with documented deadlines."
>
> Baseline at time of writing: **128 offset call sites across 95 service files** in 18 modules.
> Two unordered-paging inventory fixes were applied first; see Findings below.

---

## Summary

| Module | Files | Instances | Status |
|---|---|---|---|
| hr | 26 | 64 | PENDING — active frontend callers; needs dedicated HR lane |
| inventory | 14 | 20 | IN_SCOPE — active frontend callers; migrate with clients |
| payroll | 12 | 19 | BLOCKED — export-cancellation lane owns this territory |
| kb | 3 | 3 | BLOCKED — KB lane owns this territory |
| portal | 1 | 2 | BLOCKED — actor-cutover lane owns portal-access |
| rbac | 3 | 3 | IN_SCOPE — admin routes, has frontend callers |
| accounting | 2 | 2 | IN_SCOPE — active frontend callers |
| api-tokens | 2 | 2 | IN_SCOPE — active frontend callers |
| billing | 2 | 2 | IN_SCOPE — active frontend callers |
| organization | 2 | 2 | IN_SCOPE — active frontend callers |
| users | 2 | 2 | IN_SCOPE — active frontend callers |
| build | 1 | 1 | IN_SCOPE — active frontend callers |
| delegations | 1 | 1 | IN_SCOPE — active frontend callers (confirmed) |
| offer-fulfillment | 1 | 1 | IN_SCOPE — check for frontend callers before migration |
| ownership | 1 | 1 | IN_SCOPE — active frontend callers (confirmed) |
| public | 1 | 1 | IN_SCOPE — public KB route; no auth caller |
| settings | 1 | 1 | IN_SCOPE — active frontend callers |
| webhooks | 1 | 1 | IN_SCOPE — active frontend callers (confirmed) |

---

## 1. BLOCKED — Other Lanes Own the Territory

These files are NOT to be edited in this lane. They are recorded here for completeness and must be picked up by the owning lane.

### 1a. KB lane (`kb/`)

| File | Instances | Method(s) |
|---|---|---|
| `kb/help-centre/kb-article-query.service.ts` | 1 | article list |
| `kb/help-centre/kb-verification.service.ts` | 1 | verifications list |
| `kb/retrieval/kb-search.service.ts` | 1 | search results |

**Sunset target**: when KB lane completes its refactor. Assign to KB lane owner.

### 1b. Portal lane (`portal/`)

| File | Instances |
|---|---|
| `portal/access/portal-access.service.ts` | 2 |

**Sunset target**: when actor-cutover lane completes. Assign to that lane owner.

### 1c. Export-cancellation lane (`payroll/`)

All payroll offset pagination is in scope for the export-cancellation lane:

| File | Instances |
|---|---|
| `payroll/filings/filings.service.ts` | 1 |
| `payroll/hr-payroll/bonuses.service.ts` | 1 |
| `payroll/hr-payroll/incentives.service.ts` | 1 |
| `payroll/hr-payroll/salary-structure-templates.service.ts` | 1 |
| `payroll/insights/journal-outbox.service.ts` | 1 |
| `payroll/insights/lib/report-builders.ts` | 1 |
| `payroll/insights/reports.service.ts` | 4 |
| `payroll/insights/tax-admin.service.ts` | 1 |
| `payroll/jobs/payroll-jobs.service.ts` | 2 |
| `payroll/payout/payslip-templates.service.ts` | 1 |
| `payroll/runs/exceptions.service.ts` | 1 |
| `payroll/runs/inputs.service.ts` | 1 |
| `payroll/runs/salary-profiles.repository.ts` | 1 |
| `payroll/setup/components.service.ts` | 1 |
| `payroll/setup/templates.service.ts` | 1 |

**Unordered paging in payroll (correctness bug class — must be picked up by export-cancellation lane):**

| File | Line | Bug | Fix |
|---|---|---|---|
| `payroll/insights/reports.service.ts` | `getDepartmentCost` (~L222) | `.groupBy(orgUnits.name).limit(limit).offset(offset)` — no ORDER BY | Add `.orderBy(asc(orgUnits.name))` |
| `payroll/insights/reports.service.ts` | `getCostCenter` (~L259) | `.groupBy(employeeSalaryProfiles.costCenter).limit(limit).offset(offset)` — no ORDER BY | Add `.orderBy(asc(employeeSalaryProfiles.costCenter))` |
| `payroll/insights/tax-admin.service.ts` | `listDeclarations` (~L46) | `.limit(cap).offset(...)` — no ORDER BY | Add `.orderBy(desc(taxDeclarations.createdAt), asc(taxDeclarations.id))` |
| `payroll/jobs/payroll-jobs.service.ts` | `listFailed` (~L180) | `.limit(cap).offset(...)` — no ORDER BY | Add `.orderBy(desc(payrollJobs.createdAt), asc(payrollJobs.id))` |
| `payroll/setup/templates.service.ts` | `list` (~L120) | `.limit(input.pageSize).offset(offset)` — no ORDER BY | Add `.orderBy(asc(payrollTemplates.name), asc(payrollTemplates.id))` |

---

## 2. PENDING — HR Module (Dedicated HR Lane Required)

HR has 64 offset instances across 26 files. Almost all have active frontend callers. Migrating without the client side would reproduce the "43 endpoints stuck on page 1" regression. This requires a dedicated HR pagination lane that migrates service + controller + frontend hook together per method.

**Sunset deadline**: 2026-12-31  
**Owner**: HR lane lead  
**Action**: Create a dedicated HR offset-to-cursor migration task. Prioritize: `hr-employee-record-lists.service.ts` (2), `hr-workflows/hr-workflow-instances.service.ts` (3), `hr-import.service.ts` (5) as highest-traffic first.

| File | Instances |
|---|---|
| `hr/benefits/hr-benefits-claims.service.ts` | 1 |
| `hr/benefits/hr-benefits-plans.service.ts` | 1 |
| `hr/cases/hr-cases.service.ts` | 1 |
| `hr/cases/hr-disciplinary.service.ts` | 1 |
| `hr/cases/hr-safety.service.ts` | 1 |
| `hr/core/hr-effective-changes.service.ts` | 1 |
| `hr/core/hr-employee-record-lists.service.ts` | 2 |
| `hr/core/hr-timeline.service.ts` | 1 |
| `hr/enterprise-comp/comp-planning.service.ts` | 2 |
| `hr/enterprise-comp/devices.service.ts` | 3 |
| `hr/enterprise-comp/equity.service.ts` | 1 |
| `hr/enterprise-comp/payroll-compliance.service.ts` | 3 |
| `hr/enterprise-ops/accommodations/accommodations.service.ts` | 1 |
| `hr/enterprise-ops/emergency/emergency.service.ts` | 1 |
| `hr/enterprise-ops/event-stream/event-stream.service.ts` | 2 |
| `hr/enterprise-ops/identity/identity.service.ts` | 1 |
| `hr/enterprise-ops/simulator/simulator.service.ts` | 1 |
| `hr/forms/hr-forms-submissions.service.ts` | 1 |
| `hr/forms/hr-forms.service.ts` | 1 |
| `hr/global/compliance-requirements.service.ts` | 2 |
| `hr/global/contracts.service.ts` | 1 |
| `hr/global/work-authorizations.service.ts` | 1 |
| `hr/governance/delegations/delegations.service.ts` | 2 |
| `hr/governance/labor/labor.service.ts` | 3 |
| `hr/governance/legal-holds/legal-holds.service.ts` | 1 |
| `hr/governance/positions/positions.service.ts` | 2 |
| `hr/governance/retention/retention.service.ts` | 2 |
| `hr/import/hr-import.service.ts` | 5 |
| `hr/lifecycle/onboarding-views.service.ts` | 2 |
| `hr/lifecycle/termination-read.service.ts` | 1 |
| `hr/payroll-inputs/payroll-input-snapshots.service.ts` | 1 |
| `hr/payroll-inputs/payroll-inputs.service.ts` | 2 |
| `hr/performance/rich-documents.service.ts` | 1 |
| `hr/recruitment/recruitment-offers.service.ts` | 1 |
| `hr/recruitment/recruitment-sourcing.service.ts` | 1 |
| `hr/recruitment/recruitment-talent-pools.service.ts` | 1 |
| `hr/templates/hr-templates.service.ts` | 2 |
| `hr/time/attendance-summary.service.ts` | 1 |
| `hr/time/attendance.service.ts` | 1 |
| `hr/time/overtime.service.ts` | 1 |
| `hr/workflows/hr-workflow-definitions.service.ts` | 1 |
| `hr/workflows/hr-workflow-instances.service.ts` | 3 |

---

## 3. IN_SCOPE — Inventory Module (Active Frontend Callers)

**Unordered paging bugs FIXED this session** (correctness class — ORDER BY now present):
- `inventory/replenishment/inv-replenishment.service.ts` — `getForecasting()` now has `orderBy(sku, productVariantId)` before offset.
- `inventory/reports/inv-reports-extended.service.ts` — `getReorderReportUpgraded()` now has `orderBy(sku, productVariantId, locationId)` before offset.

**Remaining inventory offset files** — each needs the service method AND the frontend caller migrated together:

| File | Instances | Method(s) to migrate |
|---|---|---|
| `inventory/replenishment/inv-replenishment.service.ts` | 1 | `listRules` — `page/limit` param; replace with cursor on `(updatedAt, id)` |
| `inventory/reports/inv-reports-extended.service.ts` | 4 | `getValuationReport`, `getSlowMovingReport`, `getExpiryReport`, `getReorderReportUpgraded` — already have ORDER BY; wrap cursor on natural sort column |
| `inventory/channels/channels.service.ts` | 1 | channel list |
| `inventory/import-export/export.service.ts` | 1 | export jobs list |
| `inventory/import-export/import.service.ts` | 1 | import jobs list |
| `inventory/products/inv-product-catalog.service.ts` | 1 | product catalog list |
| `inventory/shipments/carriers.service.ts` | 1 | carriers list |
| `inventory/shipments/loads.service.ts` | 1 | loads list |
| `inventory/shipments/packages.service.ts` | 1 | packages list |
| `inventory/shipments/shipments.service.ts` | 1 | shipments list |
| `inventory/traceability/inv-traceability.service.ts` | 3 | lot trace, batch trace, FEFO |
| `inventory/valuation/inv-valuation.service.ts` | 1 | valuation ledger |
| `inventory/warehouses/inv-warehouses.service.ts` | 2 | warehouse list, location list |
| `inventory/webhooks/webhooks.service.ts` | 1 | delivery log |

**Sunset deadline**: 2026-12-01  
**Migration protocol**: For each method — (1) add `cursor` param to `pageSizeField` schema, (2) replace `.limit(n).offset(o)` with keyset predicate using `keysetAfterId` / `keysetAfter`, (3) update the controller to accept cursor param, (4) update the frontend hook to thread `nextCursor` forward. Never cut over the backend without the client — a cutover without the client leaves the frontend stuck on page 1.

---

## 4. IN_SCOPE — Other Modules (Active Frontend Callers)

**Sunset deadline**: 2026-11-30  
**Owner**: Assigning to pagination lane.

| File | Instances | Frontend caller evidence |
|---|---|---|
| `accounting/core/accounting-receivables.service.ts` | 1 | `accounting/customers/page.tsx` uses pageSize |
| `accounting/gl/general-ledger.service.ts` | 1 | `accounting/general-ledger/page.tsx` uses pageSize |
| `api-tokens/core/api-tokens.service.ts` | 1 | settings/api-tokens has page param |
| `api-tokens/user/user-api-tokens.service.ts` | 1 | same |
| `billing/core/ai-credits-packs.service.ts` | 1 | billing AI credits page |
| `billing/core/enterprise-quotes.service.ts` | 1 | billing enterprise page |
| `build/core/projects-tickets-read.service.ts` | 1 | project ticket list |
| `delegations/delegations.service.ts` | 1 | confirmed — has frontend callers |
| `offer-fulfillment/offer-fulfillment.service.ts` | 1 | check for frontend callers before migrating |
| `organization/core/invitations-read.service.ts` | 1 | member invitations list |
| `organization/core/org-membership-read.service.ts` | 1 | member list |
| `ownership/ownership-transfers.service.ts` | 1 | confirmed — has frontend callers |
| `public/kb.service.ts` | 1 | public KB endpoint — no auth; client-accessible |
| `rbac/principal-groups.service.ts` | 1 | RBAC group member list |
| `rbac/roles-query.service.ts` | 1 | roles list |
| `rbac/roles.service.ts` | 1 | roles list |
| `settings/settings-automations.service.ts` | 1 | settings automations list |
| `users/organization-users.reader.ts` | 1 | user list (shared utility) |
| `users/user-profile.service.ts` | 1 | user profile list |
| `webhooks/webhooks.service.ts` | 1 | confirmed — delivery log has frontend caller |

---

## 5. Cursor Ordering Audit

The platform cursor contract (`cursor.ts`) encodes a `(sortValue, id)` tuple. For an endpoint to be safe, its `ORDER BY` must be exactly `(sortColumn, idColumn)` — or `idColumn` alone for `buildIdCursorPage` callers.

**Audited and correct:**
- `buildCursorPage` callers that use a `(timestamp, id)` or `(lexrank, id)` sort are correct. The keyset helper `keysetAfter` / `keysetBefore` binds through `sql.param` to avoid the bare-Date driver serialization bug.
- `buildIdCursorPage` callers (9 files: chat, payroll/payout, finance-ar, module-access, notifications, crm, finance-tax, payroll-runs) all sort by monotonic id and encode only the id — correct.
- `decodeCursor` returns `null` on missing/malformed cursor — first page served, no 500.
- `buildCursorPage.pagination.nextCursor` is always `null` (never `undefined`) — serializes correctly in JSON.

**No new cursor ordering bugs found** in in-scope files. The 7 `buildIdCursorPage` callers outside test files use `orderBy(asc(entity.id))` or `desc(entity.id)` — id-only sort matches id-only cursor.

---

## 6. Hard Cap Audit

Platform cap: 100 rows/page. Every list schema should use `pageSizeField()` or `optionalPageSizeField()` which clamp to 100.

**Gate verified:** `list-query.schema.ts` exports `PAGE_SIZE_CAP = 100` and `pageSizeField` applies `Math.min(v, ceiling)` on transform — clamp behavior, not rejection. `optionalPageSizeField` does the same.

**Sampling of schemas** (all use `pageSizeField` / `optionalPageSizeField` — confirmed by 447-match grep across 170 schema files):
- `inventory/replenishment/dto/replenishment.schemas.ts` — `pageSizeField(50, 100)` ✓
- `payroll/insights/dto/insights.schemas.ts` — `pageSizeField` ✓  
- `payroll/runs/dto/runs.schemas.ts` — `pageSizeField` ✓

**Manual clamps** (services that cap without Zod schema):
- `payroll/insights/reports.service.ts` — `Math.min(pagination.limit ?? 100, 100)` ✓
- `payroll/insights/tax-admin.service.ts` — `const cap = Math.min(limit, 100)` ✓
- `payroll/jobs/payroll-jobs.service.ts` — `const cap = Math.min(limit, 100)` ✓

No uncapped list endpoints found in sampled files. `MAX_BULK` and `MAX_PAGE` in data-quality/issues are bulk operation bounds, not page sizes — left alone.

---

## 7. Cache Key Open Items (from L14 audit)

The `cache-key-inventory.md` audit identified one correctness bug relevant to this lane:

**`stats-attendance` date key uses UTC, not org timezone** (`src/modules/dashboard/dashboard-stats.service.ts:49`): `getTodayString()` uses UTC wall-clock. An org in UTC+14 crosses its local midnight 14 hours before the UTC key changes, serving the wrong day's attendance count for up to 30 seconds. Fix: pass org timezone from the cached `org:settings` key into `buildOrgDashboardCacheKey` as the `dimension` arg.

This is in `src/modules/dashboard/` which is not listed as off-limits territory, but the fix is a low-risk, targeted change that can be picked up separately.

---

## 8. Migration Protocol (for all IN_SCOPE items)

1. **Verify the cursor column**: choose `(createdAt, id)` for time-ordered lists, `(name, id)` for name-sorted lists. The id column is always the UNIQUE tiebreaker last.
2. **Update the schema**: replace `page` + `limit`/`pageSize` with `cursor` (optional string) + `limit` using `pageSizeField`.
3. **Update the service**: replace `.offset((page-1)*limit)` with `cursor ? keysetAfter(...) : undefined` where clause; pass `limit + 1` and use `buildCursorPage` to trim the sentinel and produce `nextCursor`.
4. **Update the controller**: pipe `cursor` query param through the schema.
5. **Update the frontend hook**: thread `nextCursor` through `useInfiniteQuery` or carry `cursor` in query params. Never cut over backend without the client — see memory note `pagination-cutover-without-the-client-is-a-regression.md`.
6. **Test with disagreeing ids**: use two rows with the same sort value but different ids. An id-only cursor on a non-id sort produces duplicates on this case — prove the keyset is exhaustive.
