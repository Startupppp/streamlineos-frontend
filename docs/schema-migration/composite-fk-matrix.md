---
wave: 0
type: composite-fk matrix (key spine)
status: DRAFT
date: 2026-08-04
full_inventory: wave-7-composite-fk-matrix.md
---

# Composite FK matrix — tenant spine (key tables)

Candidate key pattern: parent carries `UNIQUE(org_id, id)` (or module-specific PK); child FK is `(org_id, parent_id) → parent(org_id, id)`.

| Table | Schema file | `org_id` type | Candidate key | Composite FK to parent | Notes |
|-------|-------------|---------------|-----------------|------------------------|-------|
| `organizations` | `common/auth.ts` | — (root) | `id` PK | — | Tenant anchor; not composite-FK child |
| `organization_members` | `common/auth.ts` | `text` + FK | `UNIQUE(org_id, id)` | → `organizations(id)` single-col | Membership spine |
| `role_assignments` | `common/access.ts` | `text` + FK | — | `(org_id, organization_membership_id)` → `organization_members` | **Compliant** |
| `org_modules` | `common/access.ts` | `text` + FK | `UNIQUE(org_id, module_key)` | → `organizations` single-col | Module install gate |
| `invitations` | `common/auth.ts` | `text` + FK | `id` PK | → `organizations` single-col | Pending membership; events in `invitation_events` |
| `invitation_events` | `common/invitations-events.ts` | `text` + FK | `id` PK | → `organizations`, `invitations` | FK repair `0117` |
| `pm_workspaces` | `build/pm-workspaces.ts` | `text` + FK | `UNIQUE(org_id, pm_workspace_id)` | → `organizations` single-col | Default workspace partial unique on `(org_id) WHERE is_default` |
| `projects` | `build/core.ts` | `text` + FK | `UNIQUE(org_id, id)` | → `organizations`; optional `(org_id, pm_workspace_id)` → `pm_workspaces` | `pm_workspace_id` nullable until backfill |
| `billing_profiles` | `billing/billing.ts` | `text` + FK | `UNIQUE(org_id, id)` | → `organizations` | Repaired `0370` (was integer) |
| `app_installations` | `billing/billing.ts` | `text` + FK | `UNIQUE(org_id, id)` | → `organizations` | Repaired `0370` |
| `affiliates` | `billing/billing.ts` | `text` + FK | `UNIQUE(org_id, id)` | → `organizations` | Repaired `0370` |
| `revenue_events` | `billing/billing.ts` | `text` + FK | `UNIQUE(org_id, id)` | → `organizations` | Repaired `0370` |
| `organization_people` | `directory/organization-people.ts` | `text` + FK | `UNIQUE(org_id, organization_person_id)` | → `organizations` single-col | Directory spine; optional `user_id` / `organization_membership_id` links |
| `workers` | `directory/workers.ts` | `text` + FK | `UNIQUE(org_id, worker_id)` | `(org_id, organization_person_id)` → `organization_people` | Workforce overlay; no login required |
| `worker_engagements` | `directory/worker-engagements.ts` | `text` + FK | `UNIQUE(org_id, worker_engagement_id)` | `(org_id, worker_id)` → `workers` | Effective-dated employment; exclusion constraint on overlaps |
| `employee_salary_profiles` | `hr/payroll-workforce.ts` | `text` + FK | `UNIQUE(org_id, id)` | `(org_id, worker_id)` → `workers` (nullable); `(org_id, user_id)` legacy | Wave 0392: dual subject `user_id` OR `worker_id`; CHECK + partial uniques |
| `payroll_run_employees` | `hr/payroll-runs.ts` | `text` + FK | `UNIQUE(org_id, id)` | `(org_id, worker_id)` → `workers` (nullable); run+user/run+worker uniques | Wave 0392: login-less payee run rows |
| `payslip_publications` | `payroll/payslip-publications.ts` | `text` + FK | `UNIQUE(org_id, id)` | `(org_id, worker_id)` → `workers` (nullable); `run_employee_id` unique | Wave 0393: dual subject for publish |
| `payroll_bank_batch_items` | `hr/payroll-payout.ts` | `text` + FK | `UNIQUE(org_id, id)` | `(org_id, worker_id)` → `workers` (nullable); `run_employee_id` → run employees | Wave 0393: worker-only payout rows |
| `payroll_tds_ytd_ledger` | `payroll/entities-periods.ts` | `text` + FK | `UNIQUE(org_id, id)` | `(org_id, worker_id)` → `workers` (nullable); partial uniques per user/worker+FY+period | Wave 0393: worker TDS ledger |
| `portal_memberships` | `portal-access/portal-memberships.ts` | `text` + FK | `UNIQUE(org_id, portal_membership_id)` | → `organizations`; `(org_id, party_contact_id)` → `party_contacts` | Portal audience; session epoch |
| `project_client_grants` | `portal-access/project-client-grants.ts` | `text` + FK | `UNIQUE(org_id, grant_id)` | `(org_id, portal_membership_id, party_contact_id)` → `portal_memberships`; `(org_id, project_id)` → `projects` | Grant create validates project workspace + ACTIVE membership |
| `pm_workspace_memberships` | `build/pm-workspace-memberships.ts` | `text` + FK | `UNIQUE(org_id, pm_workspace_membership_id)` | `(org_id, pm_workspace_id)` → `pm_workspaces`; `(org_id, organization_membership_id)` → `organization_members` | Internal PM ReBAC spine |
| `business_parties` | `party/business-parties.ts` | `text` + FK (`organization_id`) | `UNIQUE(org_id, party_id)` | → `organizations` single-col | **Compliant**; module-independent Party spine |
| `party_contacts` | `party/party-contacts.ts` | `text` + FK (`organization_id`) | `UNIQUE(org_id, party_contact_id)` | `(org_id, party_id)` → `business_parties` | Child of parties; portal bridge |
| `crm_products` | `crm/products.ts` | `text` + FK | `UNIQUE(org_id, id)` | → `organizations` single-col | CRM offers; Inventory-independent |
| `inv_products` | `inventory/core.ts` | `text` + FK | `UNIQUE(org_id, id)` | → `organizations` single-col | Stock catalog root |
| `inv_product_variants` | `inventory/core.ts` | `text` + FK | `UNIQUE(org_id, id)` | `(org_id, product_id)` → `inv_products` | SKU spine; offer-fulfillment target |
| `inv_vendors` | `inventory/purchase-orders.ts` | `text` + FK | `UNIQUE(org_id, id)` | → `organizations`; optional `client_id` → `clients` (legacy) | **CRM not required**; `client_id` nullable bridge (Wave 6 party cutover) |
| `offer_fulfillment_components` | `billing/offer-fulfillment.ts` | `text` + FK | `UNIQUE(org_id, offer_id, sku_id)` | → `organizations` only (no cross-module FK) | Integration bridge; explicit `crm_offer_org_id` + `inv_sku_org_id`; service asserts both sides |

## Module spine summary (by folder — tenant-scoped table counts)

Generated from `backend/src/db/schema/**` via `scripts/schema-table-inventory.mjs` (2026-08-04). Full per-table rows remain in `wave-7-composite-fk-matrix.md`.

| Module folder | ~Tenant tables | Composite-FK wave |
|---------------|----------------|---------------------|
| `common` | 70 | W7-A |
| `build` | 80 | W7-D |
| `crm` | 83 | W7-C |
| `hr` | 222 | W7-E |
| `inventory` | 52 | W7-F |
| `payroll` | 14 | W7-F |
| `party` | 2 | Compliant (spine) |
| `portal-access` | 3 | Compliant (spine) |
| `directory` | 3 | Compliant (spine) |
| `accounting` | 43 | W7-H |
| `support` | 34 | W7-G |
| `kb` | 24 | W7-G |
| `billing` | 20 | W7-H (+ `0370` hotfix done) |
| `timesheets` | 11 | W7-G |
| `surveys` | 14 | W7-G |
| `e-sign` | 12 | W7-G |
| `ai` | 6 | W7-H |
| `automation` | 2 | W7-H |
| `chat` | 7 | W7-H |
| **Total tenant-scoped** | **~703** | See wave-7 for rollout |

## Human approval gate (Wave 0 exit)

- [ ] Operator sign-off on every row in `wave-7-composite-fk-matrix.md` (~214 prioritized tenant tables)
- [ ] Operator sign-off on every row in `wave-0-rls-matrix.md`
- [ ] Baseline squash / forbid push-only drift (`wave-0-baseline-migration-runbook.md`)
- [x] Billing `org_id` text + FK documented and migrated (`0370`)
- [x] Key spine rows in this document + `rls-matrix.md`

## Rollout order (spine)

1. `organizations` + `organization_members` invariants (owner pointer — Wave 1, done)
2. Access spine: `role_assignments`, `role_permission_grants`, `org_modules`
3. Billing platform tables (type repair done — enforce composite keys on new children only)
4. PM: `pm_workspaces` → backfill `pm_workspace_id` on projects/teams/managed products → NOT NULL + composite FK

See `wave-7-composite-fk-matrix.md` for module-group waves W7-A…W7-H.
