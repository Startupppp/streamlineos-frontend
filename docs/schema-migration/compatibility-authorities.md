---
wave: 0
type: dual-write and compatibility authorities
status: DRAFT
date: 2026-08-04
---

# Compatibility authorities — live dual-write / read-fallback paths

Do **not** stop legacy writes or drop columns until the safe-stop condition and telemetry below are clean for ≥30 days in production.

| Authority | Legacy source | Target / canonical | Write owner today | Read path today | Safe stop condition | Telemetry / audit signals |
|-----------|---------------|-------------------|-------------------|-----------------|---------------------|---------------------------|
| Role assignments | `user_roles` (user-scoped) | `role_assignments` (membership-scoped) | Dual-write Wave 5-C | `AccessService` still resolves from both | Backfill checksum = 0 orphans; read cutover on `role_assignments` only | Count `user_roles` rows with no matching `role_assignments`; `bumpPermissionsVersion` after grant mutations |
| Module enablement | `organizations.enabled_modules` text[] | `org_modules` rows | Dual-write in `setModuleEnabled` | `ModuleGuard` / `EntitlementsService.isModuleEnabled` reads `org_modules` | Zero writes to array for ≥30 days + 2 releases (Wave 2.6) | Log when array and `org_modules` disagree (shadow compare query in ops runbook) |
| Portal project access | `projects.client_id` | `project_client_grants` | Grants on create; legacy column display-only | Portal reads grants; internal may still show `client_id` label | Portal reads grants-only in prod | Audit `project_client_grants` create/delete; zero new non-null `client_id` writes |
| Payroll payee subject | `user_id` on salary profiles, run rows, payslips, batches, TDS | `worker_id` (Workforce spine) | New writes prefer `worker_id` (`0392`/`0393`) | Shared resolver: worker first, `user_id` fallback | All new rows have `worker_id`; legacy `user_id`-only reads = 0 | Pre-flight SQL in `forward-repair-runbook.md`; audit payroll publish/payout actions with `worker_id` populated |
| Inventory vendor party | `inv_vendors.client_id` → `clients` | `business_parties` (VENDOR type) | Inventory vendor CRUD independent of CRM | Vendor list/detail from `inv_vendors`; optional client link | Party FK backfill complete; CRM module not required for vendor ops | Count vendors with `client_id` set vs party map (Wave 6) |
| CRM customer party | `clients` / `crm_contacts` | `business_parties` + `party_contacts` | CRM still owns legacy tables | Mixed — Party module is parallel spine | Client→party map 100% for active customers | Party create/update audit actions |
| PM workspace naming | `project_workspace_*` symbols | `pm_workspaces` / `pm_workspace_memberships` | New code uses PM workspace IDs | FE routes `/build/workspaces/[pmWorkspaceId]/…`; `/product-management` redirects | Physical table rename deferred (Wave 7+) | No new references to `project_workspace_*` in migrations |
| Billing tenant key | integer `org_id` (legacy) | text `org_id` + FK | `0370` repair shipped | Schema + Drizzle use text | All envs confirm `pg_catalog` type text + FK | Migration journal tag `0370_tenant_column_integrity` applied |

## Payroll worker dual-write detail (`0392` + `0393`)

| Table | CHECK constraint | Partial uniques | Forward repair |
|-------|------------------|-------------------|----------------|
| `employee_salary_profiles` | `user_id IS NOT NULL OR worker_id IS NOT NULL` | Per user / per worker active profile | Backfill worker from `organization_people.user_id` join |
| `payroll_run_employees` | same | Per run+user / per run+worker | Backfill from salary profile |
| `payslip_publications` | same | Per run employee | Backfill from run employee |
| `payroll_bank_batch_items` | same | Per batch line | Backfill from run employee |
| `payroll_tds_ytd_ledger` | same | Per FY+period+user/worker | Backfill from run employee |

**Rollback posture:** additive nullable columns — stop writing `worker_id`, keep reads on `user_id`. Do not drop `user_id` until telemetry clean.

## Offer fulfillment bridge

`offer_fulfillment_components` intentionally has **no FK** into CRM or Inventory schemas. Tenant safety is enforced by:

- `org_id` FK → `organizations`
- Service-layer `assertOfferExists` + `assertSkuExists` (tenant-scoped 404)
- API `@RequireModule(["crm", "inventory"])` + `ModuleGuard`

## Operator shadow queries (run weekly pre-cutover)

```sql
-- Payroll: rows missing both subjects (must stay 0)
SELECT 'payroll_run_employees' AS src, count(*) FROM payroll_run_employees
WHERE worker_id IS NULL AND user_id IS NULL
UNION ALL
SELECT 'payslip_publications', count(*) FROM payslip_publications
WHERE worker_id IS NULL AND user_id IS NULL;

-- Role dual-write orphan check (Wave 5-D)
SELECT count(*) FROM user_roles ur
LEFT JOIN organization_members om ON om.user_id = ur.user_id AND om.org_id = ur.org_id
WHERE om.id IS NULL;

-- Module array drift (Wave 2.6 pre-stop)
SELECT o.id FROM organizations o
WHERE o.enabled_modules IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM org_modules m
    WHERE m.org_id = o.id AND m.enabled <> (m.module_key = ANY(o.enabled_modules))
  );
```

Related: `forward-repair-runbook.md`, `wave-5-execution-plan.md`, `wave-2-6-execution-plan.md`.
